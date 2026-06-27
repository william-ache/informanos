import type { RowDataPacket } from "mysql2";
import type mysql from "mysql2/promise";
import pool from "@/lib/db";
import { publicarEnChat, obtenerNombreCentro } from "@/lib/chat-actividad";
import {
  HORAS_VOTACION_FINALIZAR,
  HORAS_HISTORIAL,
  MIN_VOTOS_FINALIZAR,
  MIN_VOTOS_REACTIVAR,
  textoReglasFinalizar,
  textoReglasReactivar,
} from "@/lib/centro-operativo";
import {
  MINUTOS_PROPUESTA,
  MIN_VOTOS_PROPUESTA,
} from "@/lib/propuesta-tipo";
import type { PropuestaOperativoCentro } from "@/types/database";

export interface PropuestaOperativoRow extends RowDataPacket {
  id: string;
  centro_id: string;
  estado: "activa" | "aprobada" | "rechazada";
  expira_en: string;
  creado_en: string;
  votos_si: number;
  votos_no: number;
  votantes: number;
}

function selectPropuesta(tabla: "finalizar" | "reactivar"): string {
  const v = tabla === "finalizar" ? "votos_propuesta_finalizar" : "votos_propuesta_reactivar";
  const p = tabla === "finalizar" ? "propuestas_finalizar" : "propuestas_reactivar";
  return `
    p.id, p.centro_id, p.estado, p.expira_en, p.creado_en,
    COALESCE(SUM(CASE WHEN v.voto = 'si' THEN v.peso ELSE 0 END), 0) AS votos_si,
    COALESCE(SUM(CASE WHEN v.voto = 'no' THEN v.peso ELSE 0 END), 0) AS votos_no,
    COUNT(DISTINCT v.ip_hash) AS votantes
    FROM ${p} p
    LEFT JOIN ${v} v ON v.propuesta_id = p.id
  `;
}

const GROUP = `
  GROUP BY p.id, p.centro_id, p.estado, p.expira_en, p.creado_en
`;

export function mapPropuestaOperativo(row: PropuestaOperativoRow): PropuestaOperativoCentro {
  return {
    id: row.id,
    centro_id: row.centro_id,
    estado: row.estado,
    expira_en: row.expira_en,
    creado_en: row.creado_en,
    votos_si: Number(row.votos_si),
    votos_no: Number(row.votos_no),
    votantes: Number(row.votantes),
  };
}

function intervaloFinalizarSql(): string {
  return `DATE_ADD(NOW(), INTERVAL ${HORAS_VOTACION_FINALIZAR} HOUR)`;
}

function intervaloReactivarSql(): string {
  return `DATE_ADD(NOW(), INTERVAL ${MINUTOS_PROPUESTA} MINUTE)`;
}

async function resolverFinalizar(
  db: mysql.Pool | mysql.PoolConnection,
  prop: PropuestaOperativoRow,
): Promise<void> {
  const si = Number(prop.votos_si);
  const no = Number(prop.votos_no);
  const votantes = Number(prop.votantes);
  const aprobada = votantes >= MIN_VOTOS_FINALIZAR && si > no;

  if (aprobada) {
    await db.execute(
      `UPDATE centros_acopio SET estado_operativo = 'finalizado', finalizado_en = NOW() WHERE id = ?`,
      [prop.centro_id],
    );
    const nombre = (await obtenerNombreCentro(prop.centro_id)) ?? "un lugar";
    await publicarEnChat(
      `🗳️ Lugar finalizado: «${nombre}» ya no aparece en el mapa (${si} sí · ${no} no · ${votantes} votantes). Historial ${HORAS_HISTORIAL} h.`,
      prop.centro_id,
    );
  }

  await db.execute(`UPDATE propuestas_finalizar SET estado = ? WHERE id = ?`, [
    aprobada ? "aprobada" : "rechazada",
    prop.id,
  ]);
}

async function resolverReactivar(
  db: mysql.Pool | mysql.PoolConnection,
  prop: PropuestaOperativoRow,
): Promise<void> {
  const si = Number(prop.votos_si);
  const no = Number(prop.votos_no);
  const votantes = Number(prop.votantes);
  const aprobada = votantes >= MIN_VOTOS_REACTIVAR && si > no;

  if (aprobada) {
    await db.execute(
      `UPDATE centros_acopio SET estado_operativo = 'activo', finalizado_en = NULL WHERE id = ?`,
      [prop.centro_id],
    );
    const nombre = (await obtenerNombreCentro(prop.centro_id)) ?? "un lugar";
    await publicarEnChat(
      `🗳️ Lugar reactivado: «${nombre}» vuelve al mapa (${si} sí · ${no} no · ${votantes} votantes)`,
      prop.centro_id,
    );
  }

  await db.execute(`UPDATE propuestas_reactivar SET estado = ? WHERE id = ?`, [
    aprobada ? "aprobada" : "rechazada",
    prop.id,
  ]);
}

export async function resolverPropuestasFinalizarExpiradas(
  connection?: mysql.PoolConnection,
): Promise<number> {
  const db = connection ?? pool;
  const [pendientes] = await db.query<PropuestaOperativoRow[]>(
    `SELECT ${selectPropuesta("finalizar")}
     WHERE p.estado = 'activa'
     ${GROUP}
     HAVING p.expira_en <= NOW() OR votantes >= ?`,
    [MIN_VOTOS_FINALIZAR],
  );

  let n = 0;
  for (const prop of pendientes) {
    await resolverFinalizar(db, prop);
    n += 1;
  }
  return n;
}

export async function resolverPropuestasReactivarExpiradas(
  connection?: mysql.PoolConnection,
): Promise<number> {
  const db = connection ?? pool;
  const [pendientes] = await db.query<PropuestaOperativoRow[]>(
    `SELECT ${selectPropuesta("reactivar")}
     WHERE p.estado = 'activa'
     ${GROUP}
     HAVING p.expira_en <= NOW() OR votantes >= ?`,
    [MIN_VOTOS_REACTIVAR],
  );

  let n = 0;
  for (const prop of pendientes) {
    await resolverReactivar(db, prop);
    n += 1;
  }
  return n;
}

export async function cargarPropuestasFinalizarActivas(): Promise<
  Map<string, PropuestaOperativoCentro>
> {
  await resolverPropuestasFinalizarExpiradas();

  const [rows] = await pool.query<PropuestaOperativoRow[]>(
    `SELECT ${selectPropuesta("finalizar")}
     WHERE p.estado = 'activa' AND p.expira_en > NOW()
     ${GROUP}`,
  );

  const map = new Map<string, PropuestaOperativoCentro>();
  for (const row of rows) {
    if (Number(row.votantes) >= MIN_VOTOS_FINALIZAR) continue;
    map.set(row.centro_id, mapPropuestaOperativo(row));
  }
  return map;
}

export async function cargarPropuestasReactivarActivas(): Promise<
  Map<string, PropuestaOperativoCentro>
> {
  await resolverPropuestasReactivarExpiradas();

  const [rows] = await pool.query<PropuestaOperativoRow[]>(
    `SELECT ${selectPropuesta("reactivar")}
     WHERE p.estado = 'activa' AND p.expira_en > NOW()
     ${GROUP}`,
  );

  const map = new Map<string, PropuestaOperativoCentro>();
  for (const row of rows) {
    if (Number(row.votantes) >= MIN_VOTOS_REACTIVAR) continue;
    map.set(row.centro_id, mapPropuestaOperativo(row));
  }
  return map;
}

export { intervaloFinalizarSql, intervaloReactivarSql };

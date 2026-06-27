import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import type mysql from "mysql2/promise";
import pool from "@/lib/db";
import { publicarEnChat, obtenerNombreCentro } from "@/lib/chat-actividad";
import { MIN_VOTOS_PROPUESTA, MINUTOS_PROPUESTA } from "@/lib/propuesta-tipo";
import type {
  AccionPropuestaNecesidad,
  PropuestaNecesidad,
  UrgenciaNivel,
} from "@/types/database";

export interface PropuestaNecesidadRow extends RowDataPacket {
  id: string;
  centro_id: string;
  necesidad_id: string | null;
  accion: AccionPropuestaNecesidad;
  elemento: string;
  cantidad_solicitada: string;
  urgencia: UrgenciaNivel;
  estado: "activa" | "aprobada" | "rechazada";
  expira_en: string;
  creado_en: string;
  votos_si: number;
  votos_no: number;
  votantes: number;
}

const SELECT_PROPUESTA = `
  p.id, p.centro_id, p.necesidad_id, p.accion, p.elemento, p.cantidad_solicitada,
  p.urgencia, p.estado, p.expira_en, p.creado_en,
  COALESCE(SUM(CASE WHEN v.voto = 'si' THEN v.peso ELSE 0 END), 0) AS votos_si,
  COALESCE(SUM(CASE WHEN v.voto = 'no' THEN v.peso ELSE 0 END), 0) AS votos_no,
  COUNT(DISTINCT v.ip_hash) AS votantes
`;

const GROUP_PROPUESTA = `
  GROUP BY p.id, p.centro_id, p.necesidad_id, p.accion, p.elemento,
           p.cantidad_solicitada, p.urgencia, p.estado, p.expira_en, p.creado_en
`;

export function mapPropuestaNecesidad(row: PropuestaNecesidadRow): PropuestaNecesidad {
  return {
    id: row.id,
    centro_id: row.centro_id,
    necesidad_id: row.necesidad_id,
    accion: row.accion,
    elemento: row.elemento,
    cantidad_solicitada: row.cantidad_solicitada,
    urgencia: row.urgencia,
    estado: row.estado,
    expira_en: row.expira_en,
    creado_en: row.creado_en,
    votos_si: Number(row.votos_si),
    votos_no: Number(row.votos_no),
    votantes: Number(row.votantes),
  };
}

export function intervaloPropuestaNecesidadSql(): string {
  return `DATE_ADD(NOW(), INTERVAL ${MINUTOS_PROPUESTA} MINUTE)`;
}

async function finalizarPropuesta(
  db: mysql.Pool | mysql.PoolConnection,
  prop: PropuestaNecesidadRow,
): Promise<void> {
  const si = Number(prop.votos_si);
  const no = Number(prop.votos_no);
  const votantes = Number(prop.votantes);
  const aprobada = votantes >= MIN_VOTOS_PROPUESTA && si > no;

  if (aprobada) {
    if (prop.accion === "eliminar" && prop.necesidad_id) {
      await db.execute(`DELETE FROM necesidades WHERE id = ?`, [prop.necesidad_id]);
    } else if (prop.accion === "agregar") {
      const id = randomUUID();
      await db.execute(
        `INSERT INTO necesidades (id, centro_id, elemento, cantidad_solicitada, urgencia)
         VALUES (?, ?, ?, ?, ?)`,
        [
          id,
          prop.centro_id,
          prop.elemento,
          prop.cantidad_solicitada,
          prop.urgencia,
        ],
      );
    } else if (prop.accion === "editar" && prop.necesidad_id) {
      await db.execute(
        `UPDATE necesidades
         SET elemento = ?, cantidad_solicitada = ?, urgencia = ?
         WHERE id = ?`,
        [prop.elemento, prop.cantidad_solicitada, prop.urgencia, prop.necesidad_id],
      );
    }

    const nombreCentro =
      (await obtenerNombreCentro(prop.centro_id)) ?? "un lugar";
    const accionTexto =
      prop.accion === "eliminar"
        ? `eliminar «${prop.elemento}»`
        : prop.accion === "agregar"
          ? `agregar «${prop.elemento} (${prop.cantidad_solicitada})»`
          : `cambiar «${prop.elemento} (${prop.cantidad_solicitada})»`;
    await publicarEnChat(
      `🗳️ Insumo aprobado en «${nombreCentro}»: ${accionTexto} (${si} sí · ${no} no · ${votantes} votantes)`,
      prop.centro_id,
    );
  }

  await db.execute(`UPDATE propuestas_necesidad SET estado = ? WHERE id = ?`, [
    aprobada ? "aprobada" : "rechazada",
    prop.id,
  ]);
}

export async function resolverPropuestasNecesidadExpiradas(
  connection?: mysql.PoolConnection,
): Promise<number> {
  const db = connection ?? pool;

  const [pendientes] = await db.query<PropuestaNecesidadRow[]>(
    `SELECT ${SELECT_PROPUESTA}
     FROM propuestas_necesidad p
     LEFT JOIN votos_propuesta_necesidad v ON v.propuesta_id = p.id
     WHERE p.estado = 'activa'
     ${GROUP_PROPUESTA}
     HAVING p.expira_en <= NOW() OR votantes >= ?`,
    [MIN_VOTOS_PROPUESTA],
  );

  let resueltas = 0;
  for (const prop of pendientes) {
    await finalizarPropuesta(db, prop);
    resueltas += 1;
  }
  return resueltas;
}

export async function cargarPropuestasNecesidadActivas(): Promise<{
  porNecesidad: Map<string, PropuestaNecesidad>;
  nuevas: PropuestaNecesidad[];
}> {
  await resolverPropuestasNecesidadExpiradas();

  const [rows] = await pool.query<PropuestaNecesidadRow[]>(
    `SELECT ${SELECT_PROPUESTA}
     FROM propuestas_necesidad p
     LEFT JOIN votos_propuesta_necesidad v ON v.propuesta_id = p.id
     WHERE p.estado = 'activa' AND p.expira_en > NOW()
     ${GROUP_PROPUESTA}`,
  );

  const porNecesidad = new Map<string, PropuestaNecesidad>();
  const nuevas: PropuestaNecesidad[] = [];

  for (const row of rows) {
    if (Number(row.votantes) >= MIN_VOTOS_PROPUESTA) continue;
    const prop = mapPropuestaNecesidad(row);
    if (row.necesidad_id) {
      porNecesidad.set(row.necesidad_id, prop);
    } else {
      nuevas.push(prop);
    }
  }

  return { porNecesidad, nuevas };
}

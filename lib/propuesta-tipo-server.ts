import type { RowDataPacket } from "mysql2";
import type mysql from "mysql2/promise";
import pool from "@/lib/db";
import { publicarEnChat } from "@/lib/chat-actividad";
import { etiquetaTipoLugar } from "@/lib/tipo-lugar";
import type { PropuestaTipoLugar, TipoLugarVotable } from "@/types/database";

export interface PropuestaRow extends RowDataPacket {
  id: string;
  centro_id: string;
  tipo_propuesto: TipoLugarVotable;
  estado: "activa" | "aprobada" | "rechazada";
  expira_en: string;
  creado_en: string;
  votos_si: number;
  votos_no: number;
}

export function mapPropuesta(row: PropuestaRow): PropuestaTipoLugar {
  return {
    id: row.id,
    centro_id: row.centro_id,
    tipo_propuesto: row.tipo_propuesto,
    estado: row.estado,
    expira_en: row.expira_en,
    creado_en: row.creado_en,
    votos_si: Number(row.votos_si),
    votos_no: Number(row.votos_no),
  };
}

export async function resolverPropuestasExpiradas(
  connection?: mysql.PoolConnection,
): Promise<number> {
  const db = connection ?? pool;

  const [expiradas] = await db.query<PropuestaRow[]>(
    `SELECT p.id, p.centro_id, p.tipo_propuesto, p.estado, p.expira_en, p.creado_en,
            COALESCE(SUM(CASE WHEN v.voto = 'si' THEN v.peso ELSE 0 END), 0) AS votos_si,
            COALESCE(SUM(CASE WHEN v.voto = 'no' THEN v.peso ELSE 0 END), 0) AS votos_no
     FROM propuestas_tipo_lugar p
     LEFT JOIN votos_propuesta_tipo v ON v.propuesta_id = p.id
     WHERE p.estado = 'activa' AND p.expira_en <= NOW()
     GROUP BY p.id, p.centro_id, p.tipo_propuesto, p.estado, p.expira_en, p.creado_en`,
  );

  let resueltas = 0;

  for (const prop of expiradas) {
    const si = Number(prop.votos_si);
    const no = Number(prop.votos_no);
    const aprobada = si > no;

    if (aprobada) {
      await db.execute(
        `UPDATE centros_acopio SET tipo_lugar = ? WHERE id = ?`,
        [prop.tipo_propuesto, prop.centro_id],
      );

      const [centros] = await db.query<RowDataPacket[]>(
        `SELECT nombre FROM centros_acopio WHERE id = ? LIMIT 1`,
        [prop.centro_id],
      );
      const nombre = centros[0]?.nombre ?? "un lugar";
      await publicarEnChat(
        `🗳️ Votación aprobada: «${nombre}» ahora es ${etiquetaTipoLugar(prop.tipo_propuesto).toLowerCase()} (${si} sí · ${no} no)`,
        prop.centro_id,
      );
    }

    await db.execute(
      `UPDATE propuestas_tipo_lugar SET estado = ? WHERE id = ?`,
      [aprobada ? "aprobada" : "rechazada", prop.id],
    );
    resueltas += 1;
  }

  return resueltas;
}

export async function cargarPropuestasActivas(): Promise<Map<string, PropuestaTipoLugar>> {
  await resolverPropuestasExpiradas();

  const [rows] = await pool.query<PropuestaRow[]>(
    `SELECT p.id, p.centro_id, p.tipo_propuesto, p.estado, p.expira_en, p.creado_en,
            COALESCE(SUM(CASE WHEN v.voto = 'si' THEN v.peso ELSE 0 END), 0) AS votos_si,
            COALESCE(SUM(CASE WHEN v.voto = 'no' THEN v.peso ELSE 0 END), 0) AS votos_no
     FROM propuestas_tipo_lugar p
     LEFT JOIN votos_propuesta_tipo v ON v.propuesta_id = p.id
     WHERE p.estado = 'activa' AND p.expira_en > NOW()
     GROUP BY p.id, p.centro_id, p.tipo_propuesto, p.estado, p.expira_en, p.creado_en`,
  );

  const map = new Map<string, PropuestaTipoLugar>();
  for (const row of rows) {
    map.set(row.centro_id, mapPropuesta(row));
  }
  return map;
}

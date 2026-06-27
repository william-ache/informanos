import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { handleDbError, parseJsonBody, requireDb } from "@/lib/api";
import { publicarEnChat } from "@/lib/chat-actividad";
import { centroEnHistorial, textoReglasReactivar } from "@/lib/centro-operativo";
import pool, { ensureSchema } from "@/lib/db";
import {
  intervaloReactivarSql,
  mapPropuestaOperativo,
  resolverPropuestasReactivarExpiradas,
  type PropuestaOperativoRow,
} from "@/lib/propuesta-operativo-server";
import { hashIp, obtenerIp } from "@/lib/presence";
import type { CentroAcopio } from "@/types/database";

interface CentroBasico extends RowDataPacket {
  id: string;
  nombre: string;
  estado_operativo: string;
  finalizado_en: string | null;
}

export async function POST(request: Request) {
  const configError = requireDb();
  if (configError) return configError;

  try {
    await ensureSchema();
    await resolverPropuestasReactivarExpiradas();

    const body = parseJsonBody<Record<string, unknown>>(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
    }

    const centroId =
      typeof body.centro_id === "string" ? body.centro_id.trim() : "";
    const esTestigo = body.es_testigo_presencial === true;

    if (!centroId) {
      return NextResponse.json({ error: "Indica centro_id." }, { status: 400 });
    }

    const [centros] = await pool.query<CentroBasico[]>(
      `SELECT id, nombre, estado_operativo, finalizado_en FROM centros_acopio WHERE id = ? LIMIT 1`,
      [centroId],
    );
    const centro = centros[0];
    if (!centro) {
      return NextResponse.json({ error: "Lugar no encontrado." }, { status: 404 });
    }

    const centroLike = {
      estado_operativo: centro.estado_operativo,
      finalizado_en: centro.finalizado_en,
    } as CentroAcopio;

    if (centro.estado_operativo !== "finalizado" || !centroEnHistorial(centroLike)) {
      return NextResponse.json(
        { error: "Solo se puede reactivar un lugar en historial (24 h)." },
        { status: 400 },
      );
    }

    const [activas] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM propuestas_reactivar
       WHERE centro_id = ? AND estado = 'activa' AND expira_en > NOW()
       LIMIT 1`,
      [centroId],
    );
    if (activas[0]) {
      return NextResponse.json(
        { error: "Ya hay una votación activa para reactivar este lugar." },
        { status: 409 },
      );
    }

    const propuestaId = randomUUID();
    const votoId = randomUUID();
    const ipHash = hashIp(obtenerIp(request));
    const peso = esTestigo ? 2 : 1;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO propuestas_reactivar (id, centro_id, expira_en)
         VALUES (?, ?, ${intervaloReactivarSql()})`,
        [propuestaId, centroId],
      );
      await connection.execute(
        `INSERT INTO votos_propuesta_reactivar (id, propuesta_id, voto, ip_hash, peso)
         VALUES (?, ?, 'si', ?, ?)`,
        [votoId, propuestaId, ipHash, peso],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const [rows] = await pool.query<PropuestaOperativoRow[]>(
      `SELECT p.id, p.centro_id, p.estado, p.expira_en, p.creado_en,
              COALESCE(SUM(CASE WHEN v.voto = 'si' THEN v.peso ELSE 0 END), 0) AS votos_si,
              COALESCE(SUM(CASE WHEN v.voto = 'no' THEN v.peso ELSE 0 END), 0) AS votos_no,
              COUNT(DISTINCT v.ip_hash) AS votantes
       FROM propuestas_reactivar p
       LEFT JOIN votos_propuesta_reactivar v ON v.propuesta_id = p.id
       WHERE p.id = ?
       GROUP BY p.id, p.centro_id, p.estado, p.expira_en, p.creado_en`,
      [propuestaId],
    );

    const propuesta = rows[0];
    if (!propuesta) {
      return NextResponse.json(
        { error: "Propuesta creada pero no se pudo recuperar." },
        { status: 500 },
      );
    }

    await publicarEnChat(
      `🗳️ Votación reactivar (${textoReglasReactivar()}): ¿volver a activar «${centro.nombre}»?`,
      centroId,
    );

    return NextResponse.json(
      { propuesta: mapPropuestaOperativo(propuesta) },
      { status: 201 },
    );
  } catch (error) {
    return handleDbError(error);
  }
}

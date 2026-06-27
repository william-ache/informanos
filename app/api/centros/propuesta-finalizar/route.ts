import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { handleDbError, parseJsonBody, requireDb } from "@/lib/api";
import { publicarEnChat } from "@/lib/chat-actividad";
import { textoReglasFinalizar } from "@/lib/centro-operativo";
import pool, { ensureSchema } from "@/lib/db";
import {
  intervaloFinalizarSql,
  mapPropuestaOperativo,
  resolverPropuestasFinalizarExpiradas,
  type PropuestaOperativoRow,
} from "@/lib/propuesta-operativo-server";
import { hashIp, obtenerIp } from "@/lib/presence";

interface CentroBasico extends RowDataPacket {
  id: string;
  nombre: string;
  estado_operativo: string;
}

export async function POST(request: Request) {
  const configError = requireDb();
  if (configError) return configError;

  try {
    await ensureSchema();
    await resolverPropuestasFinalizarExpiradas();

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
      `SELECT id, nombre, estado_operativo FROM centros_acopio WHERE id = ? LIMIT 1`,
      [centroId],
    );
    const centro = centros[0];
    if (!centro) {
      return NextResponse.json({ error: "Lugar no encontrado." }, { status: 404 });
    }

    if (centro.estado_operativo === "finalizado") {
      return NextResponse.json(
        { error: "Este lugar ya está finalizado." },
        { status: 400 },
      );
    }

    const [activas] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM propuestas_finalizar
       WHERE centro_id = ? AND estado = 'activa' AND expira_en > NOW()
       LIMIT 1`,
      [centroId],
    );
    if (activas[0]) {
      return NextResponse.json(
        { error: "Ya hay una votación activa para finalizar este lugar." },
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
        `INSERT INTO propuestas_finalizar (id, centro_id, expira_en)
         VALUES (?, ?, ${intervaloFinalizarSql()})`,
        [propuestaId, centroId],
      );
      await connection.execute(
        `INSERT INTO votos_propuesta_finalizar (id, propuesta_id, voto, ip_hash, peso)
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
       FROM propuestas_finalizar p
       LEFT JOIN votos_propuesta_finalizar v ON v.propuesta_id = p.id
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
      `🗳️ Votación finalizar (${textoReglasFinalizar()}): ¿«${centro.nombre}» ya no está disponible?`,
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

import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { handleDbError, parseJsonBody, requireDb } from "@/lib/api";
import { publicarEnChat } from "@/lib/chat-actividad";
import pool, { ensureSchema } from "@/lib/db";
import {
  intervaloPropuestaSql,
  mapPropuesta,
  resolverPropuestasExpiradas,
  type PropuestaRow,
} from "@/lib/propuesta-tipo-server";
import { parseTipoVotable, textoReglasVotacion } from "@/lib/propuesta-tipo";
import { hashIp, obtenerIp } from "@/lib/presence";
import { etiquetaTipoLugar } from "@/lib/tipo-lugar";

interface CentroBasico extends RowDataPacket {
  id: string;
  nombre: string;
  tipo_lugar: string;
}

export async function POST(request: Request) {
  const configError = requireDb();
  if (configError) return configError;

  try {
    await ensureSchema();
    await resolverPropuestasExpiradas();

    const body = parseJsonBody<Record<string, unknown>>(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
    }

    const centroId =
      typeof body.centro_id === "string" ? body.centro_id.trim() : "";
    const tipoPropuesto = parseTipoVotable(body.tipo_propuesto);
    const esTestigo = body.es_testigo_presencial === true;

    if (!centroId || !tipoPropuesto) {
      return NextResponse.json(
        { error: "Indica centro_id y un tipo de lugar válido." },
        { status: 400 },
      );
    }

    const [centros] = await pool.query<CentroBasico[]>(
      `SELECT id, nombre, tipo_lugar FROM centros_acopio WHERE id = ? LIMIT 1`,
      [centroId],
    );
    const centro = centros[0];
    if (!centro) {
      return NextResponse.json({ error: "Lugar no encontrado." }, { status: 404 });
    }

    if (centro.tipo_lugar === tipoPropuesto) {
      return NextResponse.json(
        { error: "Este lugar ya tiene ese tipo." },
        { status: 400 },
      );
    }

    const [activas] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM propuestas_tipo_lugar
       WHERE centro_id = ? AND estado = 'activa' AND expira_en > NOW()
       LIMIT 1`,
      [centroId],
    );
    if (activas[0]) {
      return NextResponse.json(
        { error: "Ya hay una votación activa en este lugar." },
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
        `INSERT INTO propuestas_tipo_lugar
          (id, centro_id, tipo_propuesto, expira_en)
         VALUES (?, ?, ?, ${intervaloPropuestaSql()})`,
        [propuestaId, centroId, tipoPropuesto],
      );

      await connection.execute(
        `INSERT INTO votos_propuesta_tipo (id, propuesta_id, voto, ip_hash, peso)
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

    const [rows] = await pool.query<PropuestaRow[]>(
      `SELECT p.id, p.centro_id, p.tipo_propuesto, p.estado, p.expira_en, p.creado_en,
              COALESCE(SUM(CASE WHEN v.voto = 'si' THEN v.peso ELSE 0 END), 0) AS votos_si,
              COALESCE(SUM(CASE WHEN v.voto = 'no' THEN v.peso ELSE 0 END), 0) AS votos_no,
              COUNT(DISTINCT v.ip_hash) AS votantes
       FROM propuestas_tipo_lugar p
       LEFT JOIN votos_propuesta_tipo v ON v.propuesta_id = p.id
       WHERE p.id = ?
       GROUP BY p.id, p.centro_id, p.tipo_propuesto, p.estado, p.expira_en, p.creado_en`,
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
      `🗳️ Votación (${textoReglasVotacion()}): ¿«${centro.nombre}» es ${etiquetaTipoLugar(tipoPropuesto).toLowerCase()}?`,
      centroId,
    );

    return NextResponse.json(
      { propuesta: mapPropuesta(propuesta) },
      { status: 201 },
    );
  } catch (error) {
    return handleDbError(error);
  }
}

import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { handleDbError, parseJsonBody, requireDb } from "@/lib/api";
import pool, { ensureSchema } from "@/lib/db";
import {
  mapPropuestaOperativo,
  resolverPropuestasReactivarExpiradas,
  type PropuestaOperativoRow,
} from "@/lib/propuesta-operativo-server";
import { hashIp, obtenerIp } from "@/lib/presence";
import type { VotoPropuestaTipo } from "@/types/database";

const VOTOS: VotoPropuestaTipo[] = ["si", "no"];

export async function POST(request: Request) {
  const configError = requireDb();
  if (configError) return configError;

  try {
    await ensureSchema();

    const body = parseJsonBody<Record<string, unknown>>(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
    }

    const propuestaId =
      typeof body.propuesta_id === "string" ? body.propuesta_id.trim() : "";
    const voto = body.voto as VotoPropuestaTipo;
    const esTestigo = body.es_testigo_presencial === true;

    if (!propuestaId || !VOTOS.includes(voto)) {
      return NextResponse.json(
        { error: "Indica propuesta_id y voto: si o no." },
        { status: 400 },
      );
    }

    const [propuestas] = await pool.query<PropuestaOperativoRow[]>(
      `SELECT id, centro_id, estado, expira_en, creado_en, 0 AS votos_si, 0 AS votos_no, 0 AS votantes
       FROM propuestas_reactivar
       WHERE id = ? AND estado = 'activa' AND expira_en > NOW()
       LIMIT 1`,
      [propuestaId],
    );

    if (!propuestas[0]) {
      await resolverPropuestasReactivarExpiradas();
      return NextResponse.json(
        { error: "La votación ya terminó o no existe." },
        { status: 404 },
      );
    }

    const ipHash = hashIp(obtenerIp(request));
    const peso = esTestigo ? 2 : 1;

    try {
      await pool.execute(
        `INSERT INTO votos_propuesta_reactivar (id, propuesta_id, voto, ip_hash, peso)
         VALUES (?, ?, ?, ?, ?)`,
        [randomUUID(), propuestaId, voto, ipHash, peso],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("Duplicate entry")) {
        return NextResponse.json(
          { error: "Ya votaste en esta votación." },
          { status: 409 },
        );
      }
      throw error;
    }

    await resolverPropuestasReactivarExpiradas();

    const [actualizadas] = await pool.query<PropuestaOperativoRow[]>(
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

    const final = actualizadas[0];
    if (!final) {
      return NextResponse.json(
        { error: "Voto registrado pero no se pudo recuperar la propuesta." },
        { status: 500 },
      );
    }

    return NextResponse.json({ propuesta: mapPropuestaOperativo(final) });
  } catch (error) {
    return handleDbError(error);
  }
}

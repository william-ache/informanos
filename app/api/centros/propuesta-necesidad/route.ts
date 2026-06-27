import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { handleDbError, parseJsonBody, requireDb } from "@/lib/api";
import { publicarEnChat } from "@/lib/chat-actividad";
import pool, { ensureSchema } from "@/lib/db";
import {
  intervaloPropuestaNecesidadSql,
  mapPropuestaNecesidad,
  resolverPropuestasNecesidadExpiradas,
  type PropuestaNecesidadRow,
} from "@/lib/propuesta-necesidad-server";
import { textoReglasVotacion } from "@/lib/propuesta-tipo";
import { hashIp, obtenerIp } from "@/lib/presence";
import type { AccionPropuestaNecesidad, PropuestaNecesidad, UrgenciaNivel } from "@/types/database";

interface CentroBasico extends RowDataPacket {
  id: string;
  nombre: string;
}

interface PropuestaInput {
  necesidad_id: string | null;
  accion: AccionPropuestaNecesidad;
  elemento: string;
  cantidad_solicitada: string;
  urgencia: UrgenciaNivel;
}

const ACCIONES: AccionPropuestaNecesidad[] = ["editar", "agregar", "eliminar"];
const URGENCIAS: UrgenciaNivel[] = ["alta", "media", "baja"];

function parsePropuestaInput(value: unknown): PropuestaInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const accion = row.accion as AccionPropuestaNecesidad;
  const urgencia = row.urgencia as UrgenciaNivel;
  const necesidadId =
    typeof row.necesidad_id === "string" ? row.necesidad_id.trim() || null : null;
  const elemento = typeof row.elemento === "string" ? row.elemento.trim() : "";
  const cantidad =
    typeof row.cantidad_solicitada === "string" ? row.cantidad_solicitada.trim() : "";

  if (!ACCIONES.includes(accion) || !URGENCIAS.includes(urgencia)) return null;
  if (accion !== "eliminar" && (!elemento || !cantidad)) return null;
  if ((accion === "editar" || accion === "eliminar") && !necesidadId) return null;

  return {
    necesidad_id: necesidadId,
    accion,
    elemento: elemento || "Insumo",
    cantidad_solicitada: cantidad,
    urgencia,
  };
}

export async function POST(request: Request) {
  const configError = requireDb();
  if (configError) return configError;

  try {
    await ensureSchema();
    await resolverPropuestasNecesidadExpiradas();

    const body = parseJsonBody<Record<string, unknown>>(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
    }

    const centroId =
      typeof body.centro_id === "string" ? body.centro_id.trim() : "";
    const esTestigo = body.es_testigo_presencial === true;
    const rawPropuestas = Array.isArray(body.propuestas) ? body.propuestas : [];

    if (!centroId || rawPropuestas.length === 0) {
      return NextResponse.json(
        { error: "Indica centro_id y al menos una propuesta de insumo." },
        { status: 400 },
      );
    }

    const propuestas = rawPropuestas
      .map(parsePropuestaInput)
      .filter((p): p is PropuestaInput => p !== null);

    if (propuestas.length === 0) {
      return NextResponse.json({ error: "Propuestas de insumo inválidas." }, { status: 400 });
    }

    const [centros] = await pool.query<CentroBasico[]>(
      `SELECT id, nombre FROM centros_acopio WHERE id = ? LIMIT 1`,
      [centroId],
    );
    const centro = centros[0];
    if (!centro) {
      return NextResponse.json({ error: "Lugar no encontrado." }, { status: 404 });
    }

    const ipHash = hashIp(obtenerIp(request));
    const peso = esTestigo ? 2 : 1;
    const creadas: PropuestaNecesidad[] = [];

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const prop of propuestas) {
        if (prop.necesidad_id) {
          const [activas] = await connection.query<RowDataPacket[]>(
            `SELECT id FROM propuestas_necesidad
             WHERE necesidad_id = ? AND estado = 'activa' AND expira_en > NOW()
             LIMIT 1`,
            [prop.necesidad_id],
          );
          if (activas[0]) {
            await connection.rollback();
            return NextResponse.json(
              { error: "Ya hay una votación activa para uno de los insumos." },
              { status: 409 },
            );
          }
        }

        const propuestaId = randomUUID();
        const votoId = randomUUID();

        await connection.execute(
          `INSERT INTO propuestas_necesidad
            (id, centro_id, necesidad_id, accion, elemento, cantidad_solicitada, urgencia, expira_en)
           VALUES (?, ?, ?, ?, ?, ?, ?, ${intervaloPropuestaNecesidadSql()})`,
          [
            propuestaId,
            centroId,
            prop.necesidad_id,
            prop.accion,
            prop.elemento,
            prop.cantidad_solicitada,
            prop.urgencia,
          ],
        );

        await connection.execute(
          `INSERT INTO votos_propuesta_necesidad (id, propuesta_id, voto, ip_hash, peso)
           VALUES (?, ?, 'si', ?, ?)`,
          [votoId, propuestaId, ipHash, peso],
        );

        const [rows] = await connection.query<PropuestaNecesidadRow[]>(
          `SELECT p.id, p.centro_id, p.necesidad_id, p.accion, p.elemento, p.cantidad_solicitada,
                  p.urgencia, p.estado, p.expira_en, p.creado_en,
                  COALESCE(SUM(CASE WHEN v.voto = 'si' THEN v.peso ELSE 0 END), 0) AS votos_si,
                  COALESCE(SUM(CASE WHEN v.voto = 'no' THEN v.peso ELSE 0 END), 0) AS votos_no,
                  COUNT(DISTINCT v.ip_hash) AS votantes
           FROM propuestas_necesidad p
           LEFT JOIN votos_propuesta_necesidad v ON v.propuesta_id = p.id
           WHERE p.id = ?
           GROUP BY p.id, p.centro_id, p.necesidad_id, p.accion, p.elemento,
                    p.cantidad_solicitada, p.urgencia, p.estado, p.expira_en, p.creado_en`,
          [propuestaId],
        );

        if (rows[0]) creadas.push(mapPropuestaNecesidad(rows[0]));
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    await publicarEnChat(
      `🗳️ Votación insumos (${textoReglasVotacion()}): ${propuestas.length} cambio(s) en «${centro.nombre}»`,
      centroId,
    );

    return NextResponse.json({ propuestas: creadas }, { status: 201 });
  } catch (error) {
    return handleDbError(error);
  }
}

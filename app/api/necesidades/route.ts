import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import pool, { ensureSchema } from "@/lib/db";
import { handleDbError, parseJsonBody, requireDb } from "@/lib/api";
import {
  obtenerNombreCentro,
  publicarEnChat,
} from "@/lib/chat-actividad";
import { aplicarUrgenciaCentroPorNecesidad } from "@/lib/centro-urgencia-auto";
import { mapNecesidad, NECESIDAD_SELECT, type NecesidadRow } from "@/lib/necesidad-map";
import type { UrgenciaNivel } from "@/types/database";

export async function POST(request: Request) {
  const configError = requireDb();
  if (configError) return configError;

  try {
    await ensureSchema();
    const body = parseJsonBody<Record<string, unknown>>(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
    }

    const centroId =
      typeof body.centro_id === "string" ? body.centro_id.trim() : "";
    const elemento = typeof body.elemento === "string" ? body.elemento.trim() : "";
    const cantidad =
      typeof body.cantidad_solicitada === "string"
        ? body.cantidad_solicitada.trim()
        : "";
    const urgencia =
      body.urgencia === "alta" || body.urgencia === "media" || body.urgencia === "baja"
        ? body.urgencia
        : null;

    if (!centroId || !elemento || !cantidad || !urgencia) {
      return NextResponse.json(
        {
          error:
            "Campos requeridos: centro_id, elemento, cantidad_solicitada y urgencia.",
        },
        { status: 400 },
      );
    }

    const id = randomUUID();

    await pool.execute(
      `INSERT INTO necesidades (id, centro_id, elemento, cantidad_solicitada, urgencia)
       VALUES (?, ?, ?, ?, ?)`,
      [id, centroId, elemento, cantidad, urgencia],
    );

    const [rows] = await pool.query<NecesidadRow[]>(
      `SELECT ${NECESIDAD_SELECT}
       FROM necesidades
       WHERE id = ?`,
      [id],
    );

    const created = rows[0];
    if (!created) {
      return NextResponse.json(
        { error: "Necesidad creada pero no se pudo recuperar." },
        { status: 500 },
      );
    }

    const nombreCentro = (await obtenerNombreCentro(centroId)) ?? "un centro";
    await publicarEnChat(
      `📦 Nueva necesidad en «${nombreCentro}»: ${elemento} (${cantidad}) · urgencia ${urgencia}`,
      centroId,
    );

    await aplicarUrgenciaCentroPorNecesidad(centroId, urgencia);

    return NextResponse.json({ necesidad: mapNecesidad(created) }, { status: 201 });
  } catch (error) {
    return handleDbError(error);
  }
}

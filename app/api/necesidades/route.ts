import type { RowDataPacket } from "mysql2";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { handleDbError, parseJsonBody, requireDb } from "@/lib/api";
import type { Necesidad, UrgenciaNivel } from "@/types/database";

interface NecesidadRow extends RowDataPacket {
  id: string;
  centro_id: string;
  elemento: string;
  cantidad_solicitada: string;
  urgencia: UrgenciaNivel;
  actualizado_en: string;
}

export async function POST(request: Request) {
  const configError = requireDb();
  if (configError) return configError;

  try {
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
      `SELECT id, centro_id, elemento, cantidad_solicitada, urgencia, actualizado_en
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

    const necesidad: Necesidad = {
      id: created.id,
      centro_id: created.centro_id,
      elemento: created.elemento,
      cantidad_solicitada: created.cantidad_solicitada,
      urgencia: created.urgencia,
      actualizado_en: created.actualizado_en,
    };

    return NextResponse.json({ necesidad }, { status: 201 });
  } catch (error) {
    return handleDbError(error);
  }
}

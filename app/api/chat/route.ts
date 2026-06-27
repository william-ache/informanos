import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import pool, { ensureSchema } from "@/lib/db";
import { handleDbError, parseJsonBody, requireDb, toNumber } from "@/lib/api";
import type { ChatMensaje } from "@/types/database";

interface ChatRow extends RowDataPacket {
  id: string;
  centro_id: string | null;
  centro_ref: string | null;
  centro_activo: number | null;
  autor: string;
  mensaje: string;
  latitud: string | number | null;
  longitud: string | number | null;
  creado_en: string;
}

function mapChat(row: ChatRow): ChatMensaje {
  const ref = row.centro_ref ?? row.centro_id;
  return {
    id: row.id,
    centro_id: row.centro_id,
    centro_ref: row.centro_ref ?? row.centro_id,
    centro_activo: ref ? row.centro_activo === 1 : null,
    autor: row.autor,
    mensaje: row.mensaje,
    latitud: row.latitud === null ? null : Number(row.latitud),
    longitud: row.longitud === null ? null : Number(row.longitud),
    creado_en: row.creado_en,
  };
}

export async function GET() {
  const configError = requireDb();
  if (configError) return configError;

  try {
    await ensureSchema();

    const [rows] = await pool.query<ChatRow[]>(
      `SELECT m.id, m.centro_id, m.centro_ref, m.autor, m.mensaje, m.latitud, m.longitud, m.creado_en,
              CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END AS centro_activo
       FROM (
         SELECT id, centro_id, centro_ref, autor, mensaje, latitud, longitud, creado_en
         FROM chat_mensajes
         ORDER BY creado_en DESC
         LIMIT 50
       ) AS m
       LEFT JOIN centros_acopio c
         ON c.id = COALESCE(m.centro_ref, m.centro_id)
       ORDER BY m.creado_en ASC`,
    );

    return NextResponse.json({ mensajes: rows.map(mapChat) });
  } catch (error) {
    return handleDbError(error);
  }
}

export async function POST(request: Request) {
  const configError = requireDb();
  if (configError) return configError;

  try {
    await ensureSchema();

    const body = parseJsonBody<Record<string, unknown>>(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
    }

    const autor = typeof body.autor === "string" ? body.autor.trim() : "";
    const mensaje = typeof body.mensaje === "string" ? body.mensaje.trim() : "";

    if (!autor || !mensaje) {
      return NextResponse.json(
        { error: "Campos requeridos: autor y mensaje." },
        { status: 400 },
      );
    }

    const centroId =
      typeof body.centro_id === "string" && body.centro_id.trim()
        ? body.centro_id.trim()
        : null;
    const latitud = toNumber(body.latitud);
    const longitud = toNumber(body.longitud);

    const id = randomUUID();

    await pool.execute(
      `INSERT INTO chat_mensajes (id, centro_id, centro_ref, autor, mensaje, latitud, longitud)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, centroId, centroId, autor, mensaje, latitud, longitud],
    );

    const [rows] = await pool.query<ChatRow[]>(
      `SELECT m.id, m.centro_id, m.centro_ref, m.autor, m.mensaje, m.latitud, m.longitud, m.creado_en,
              CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END AS centro_activo
       FROM chat_mensajes m
       LEFT JOIN centros_acopio c
         ON c.id = COALESCE(m.centro_ref, m.centro_id)
       WHERE m.id = ?`,
      [id],
    );

    const created = rows[0];
    if (!created) {
      return NextResponse.json(
        { error: "Mensaje creado pero no se pudo recuperar." },
        { status: 500 },
      );
    }

    return NextResponse.json({ mensaje: mapChat(created) }, { status: 201 });
  } catch (error) {
    return handleDbError(error);
  }
}

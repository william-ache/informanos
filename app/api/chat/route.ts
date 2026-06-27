import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { handleDbError, parseJsonBody, requireDb, toNumber } from "@/lib/api";
import type { ChatMensaje } from "@/types/database";

interface ChatRow extends RowDataPacket {
  id: string;
  centro_id: string | null;
  autor: string;
  mensaje: string;
  latitud: string | number | null;
  longitud: string | number | null;
  creado_en: string;
}

function mapChat(row: ChatRow): ChatMensaje {
  return {
    id: row.id,
    centro_id: row.centro_id,
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
    const [rows] = await pool.query<ChatRow[]>(
      `SELECT id, centro_id, autor, mensaje, latitud, longitud, creado_en
       FROM (
         SELECT id, centro_id, autor, mensaje, latitud, longitud, creado_en
         FROM chat_mensajes
         ORDER BY creado_en DESC
         LIMIT 50
       ) AS recientes
       ORDER BY creado_en ASC`,
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
      `INSERT INTO chat_mensajes (id, centro_id, autor, mensaje, latitud, longitud)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, centroId, autor, mensaje, latitud, longitud],
    );

    const [rows] = await pool.query<ChatRow[]>(
      `SELECT id, centro_id, autor, mensaje, latitud, longitud, creado_en
       FROM chat_mensajes
       WHERE id = ?`,
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

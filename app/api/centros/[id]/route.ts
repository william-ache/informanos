import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import pool, { ensureSchema } from "@/lib/db";
import { handleDbError, parseJsonBody, requireDb } from "@/lib/api";
import { publicarEnChat } from "@/lib/chat-actividad";

interface Params {
  params: Promise<{ id: string }>;
}

function parsePoblacion(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.floor(num);
}

export async function PATCH(request: Request, { params }: Params) {
  const configError = requireDb();
  if (configError) return configError;

  try {
    await ensureSchema();
    const { id } = await params;
    const body = parseJsonBody<Record<string, unknown>>(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
    }

    const [existentes] = await pool.query<RowDataPacket[]>(
      "SELECT id, nombre FROM centros_acopio WHERE id = ? LIMIT 1",
      [id],
    );
    if (!existentes[0]) {
      return NextResponse.json({ error: "Lugar no encontrado." }, { status: 404 });
    }

    const contacto =
      typeof body.contacto === "string" ? body.contacto.trim() || null : null;

    if (contacto !== null && contacto.length > 500) {
      return NextResponse.json({ error: "Demasiados números de contacto." }, { status: 400 });
    }

    await pool.execute(
      `UPDATE centros_acopio
       SET contacto = ?,
           aprox_ninos = ?,
           aprox_personas = ?,
           aprox_ancianos = ?,
           aprox_animales = ?
       WHERE id = ?`,
      [
        contacto,
        parsePoblacion(body.aprox_ninos),
        parsePoblacion(body.aprox_personas),
        parsePoblacion(body.aprox_ancianos),
        parsePoblacion(body.aprox_animales),
        id,
      ],
    );

    const nombre = String(existentes[0].nombre);
    await publicarEnChat(`✏️ Datos actualizados en «${nombre}» por la comunidad`, id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleDbError(error);
  }
}

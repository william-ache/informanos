import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import pool, { ensureSchema } from "@/lib/db";
import { handleDbError, parseJsonBody, requireDb } from "@/lib/api";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const configError = requireDb();
  if (configError) return configError;

  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    await ensureSchema();
    const { id } = await params;
    const body = parseJsonBody<Record<string, unknown>>(await request.json());
    const mensaje = typeof body?.mensaje === "string" ? body.mensaje.trim() : "";

    if (!mensaje) {
      return NextResponse.json({ error: "Mensaje vacío." }, { status: 400 });
    }

    const [result] = await pool.execute(
      "UPDATE chat_mensajes SET mensaje = ? WHERE id = ?",
      [mensaje.slice(0, 500), id],
    );

    const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
    if (affected === 0) {
      return NextResponse.json({ error: "Mensaje no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleDbError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const configError = requireDb();
  if (configError) return configError;

  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    await ensureSchema();
    const { id } = await params;

    const [result] = await pool.execute("DELETE FROM chat_mensajes WHERE id = ?", [id]);
    const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
    if (affected === 0) {
      return NextResponse.json({ error: "Mensaje no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleDbError(error);
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import pool, { ensureSchema } from "@/lib/db";
import { handleDbError, requireDb } from "@/lib/api";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, { params }: Params) {
  const configError = requireDb();
  if (configError) return configError;

  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    await ensureSchema();
    const { id } = await params;

    const [result] = await pool.execute("DELETE FROM reportes_errores WHERE id = ?", [id]);
    const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
    if (affected === 0) {
      return NextResponse.json({ error: "Reporte no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleDbError(error);
  }
}

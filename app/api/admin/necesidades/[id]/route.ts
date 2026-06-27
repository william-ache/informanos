import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import pool, { ensureSchema } from "@/lib/db";
import { handleDbError, parseJsonBody, requireDb } from "@/lib/api";
import { aplicarUrgenciaCentroPorNecesidad } from "@/lib/centro-urgencia-auto";
import type { NecesidadEstado, UrgenciaNivel } from "@/types/database";

interface Params {
  params: Promise<{ id: string }>;
}

const URGENCIAS = new Set<UrgenciaNivel>(["alta", "media", "baja"]);
const ESTADOS = new Set<NecesidadEstado>(["disponible", "agotado"]);

export async function PATCH(request: Request, { params }: Params) {
  const configError = requireDb();
  if (configError) return configError;

  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    await ensureSchema();
    const { id } = await params;
    const body = parseJsonBody<Record<string, unknown>>(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
    }

    const [existentes] = await pool.query<RowDataPacket[]>(
      "SELECT id, centro_id, urgencia FROM necesidades WHERE id = ? LIMIT 1",
      [id],
    );
    if (!existentes[0]) {
      return NextResponse.json({ error: "Necesidad no encontrada." }, { status: 404 });
    }

    const campos: string[] = [];
    const valores: (string | number)[] = [];

    if (typeof body.elemento === "string" && body.elemento.trim()) {
      campos.push("elemento = ?");
      valores.push(body.elemento.trim());
    }
    if (typeof body.cantidad_solicitada === "string" && body.cantidad_solicitada.trim()) {
      campos.push("cantidad_solicitada = ?");
      valores.push(body.cantidad_solicitada.trim());
    }
    if (typeof body.urgencia === "string" && URGENCIAS.has(body.urgencia as UrgenciaNivel)) {
      campos.push("urgencia = ?");
      valores.push(body.urgencia);
    }
    if (typeof body.estado === "string" && ESTADOS.has(body.estado as NecesidadEstado)) {
      campos.push("estado = ?");
      valores.push(body.estado);
    }

    if (campos.length === 0) {
      return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
    }

    valores.push(id);
    await pool.execute(
      `UPDATE necesidades SET ${campos.join(", ")} WHERE id = ?`,
      valores,
    );

    const centroId = String(existentes[0].centro_id);
    const urgenciaFinal =
      typeof body.urgencia === "string" && URGENCIAS.has(body.urgencia as UrgenciaNivel)
        ? (body.urgencia as UrgenciaNivel)
        : (existentes[0].urgencia as UrgenciaNivel);

    await aplicarUrgenciaCentroPorNecesidad(centroId, urgenciaFinal);

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

    const [result] = await pool.execute("DELETE FROM necesidades WHERE id = ?", [id]);
    const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
    if (affected === 0) {
      return NextResponse.json({ error: "Necesidad no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleDbError(error);
  }
}

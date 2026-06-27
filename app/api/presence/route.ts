import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db";
import { handleDbError, parseJsonBody, requireDb } from "@/lib/api";
import {
  hashIp,
  obtenerEstadisticasPresencia,
  obtenerIp,
  registrarPresencia,
} from "@/lib/presence";

export const dynamic = "force-dynamic";

export async function GET() {
  const configError = requireDb();
  if (configError) return configError;

  try {
    await ensureSchema();
    const stats = await obtenerEstadisticasPresencia();
    return NextResponse.json(stats);
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
    const sessionId =
      typeof body?.sessionId === "string" ? body.sessionId.trim() : "";

    if (!sessionId || sessionId.length > 36) {
      return NextResponse.json({ error: "sessionId inválido." }, { status: 400 });
    }

    const ipHash = hashIp(obtenerIp(request));
    await registrarPresencia(sessionId, ipHash);

    const stats = await obtenerEstadisticasPresencia();
    return NextResponse.json(stats);
  } catch (error) {
    return handleDbError(error);
  }
}

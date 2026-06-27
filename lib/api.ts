import { NextResponse } from "next/server";
import { dbConfigurado } from "@/lib/db";

export const dynamic = "force-dynamic";

export function requireDb() {
  if (!dbConfigurado) {
    return NextResponse.json(
      {
        error:
          "Base de datos no configurada. Define DB_HOST, DB_USER, DB_PASSWORD y DB_NAME.",
      },
      { status: 503 },
    );
  }
  return null;
}

export function handleDbError(error: unknown) {
  console.error("[db]", error);
  const message =
    error instanceof Error ? error.message : "Error de conexión a la base de datos";
  return NextResponse.json({ error: message }, { status: 500 });
}

export function parseJsonBody<T extends Record<string, unknown>>(body: unknown): T | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as T;
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

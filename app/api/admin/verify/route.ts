import { NextResponse } from "next/server";
import { adminConfigurado, tokenAdminValido } from "@/lib/admin-auth";
import { parseJsonBody } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!adminConfigurado()) {
    return NextResponse.json({ error: "Admin no configurado." }, { status: 503 });
  }

  const body = parseJsonBody<Record<string, unknown>>(await request.json());
  const token = typeof body?.token === "string" ? body.token.trim() : "";

  if (!tokenAdminValido(token)) {
    return NextResponse.json({ error: "Clave incorrecta." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

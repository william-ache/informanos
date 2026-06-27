import { NextResponse } from "next/server";

export function adminConfigurado(): boolean {
  return !!process.env.ADMIN_SECRET?.trim();
}

export function extraerTokenAdmin(request: Request): string {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  return request.headers.get("x-admin-token")?.trim() ?? "";
}

export function tokenAdminValido(token: string): boolean {
  const secreto = process.env.ADMIN_SECRET?.trim();
  if (!secreto || !token) return false;
  return token === secreto;
}

export function requireAdmin(request: Request): NextResponse | null {
  if (!adminConfigurado()) {
    return NextResponse.json({ error: "Admin no configurado en el servidor." }, { status: 503 });
  }
  if (!tokenAdminValido(extraerTokenAdmin(request))) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  return null;
}

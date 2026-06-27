const KEY = "informa_admin_token";

export function obtenerAdminToken(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(KEY)?.trim() ?? "";
}

export function guardarAdminToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, token.trim());
}

export function limpiarAdminToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

export async function adminFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = obtenerAdminToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(input, { ...init, headers });
}

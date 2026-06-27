const KEY = "informa_chat_autor";

export function obtenerChatAutor(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY)?.trim() ?? "";
}

export function guardarChatAutor(nombre: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, nombre.trim());
}

export function limpiarChatAutor(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

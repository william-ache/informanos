import type { ZonaId } from "@/types/database";

export function centrosKey(zona: ZonaId): string {
  return `/api/centros?zona=${zona}`;
}

export function chatKey(zona: ZonaId): string {
  return `/api/chat?zona=${zona}`;
}

export function isCentrosKey(key: unknown): boolean {
  return typeof key === "string" && key.startsWith("/api/centros");
}

export function isChatKey(key: unknown): boolean {
  return typeof key === "string" && key.startsWith("/api/chat");
}

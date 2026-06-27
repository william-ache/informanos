import type { ZonaId } from "@/types/database";
import { parseZona } from "@/lib/zones";

const KEY = "informa_zona";

export function obtenerZonaGuardada(): ZonaId | null {
  if (typeof window === "undefined") return null;
  return parseZona(localStorage.getItem(KEY));
}

export function guardarZona(zona: ZonaId): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, zona);
}

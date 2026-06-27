import type { CentroAcopio } from "@/types/database";

export interface FiltroPoblacion {
  minNinos: string;
  minPersonas: string;
  minAncianos: string;
}

export const filtroPoblacionVacio = (): FiltroPoblacion => ({
  minNinos: "",
  minPersonas: "",
  minAncianos: "",
});

function parseMin(valor: string): number {
  const n = parseInt(valor, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function filtroPoblacionActivo(filtro: FiltroPoblacion): boolean {
  return (
    parseMin(filtro.minNinos) > 0 ||
    parseMin(filtro.minPersonas) > 0 ||
    parseMin(filtro.minAncianos) > 0
  );
}

export function cumpleFiltroPoblacion(
  centro: CentroAcopio,
  filtro: FiltroPoblacion,
): boolean {
  const minN = parseMin(filtro.minNinos);
  const minP = parseMin(filtro.minPersonas);
  const minA = parseMin(filtro.minAncianos);

  if (minN === 0 && minP === 0 && minA === 0) return true;

  const n = centro.aprox_ninos ?? 0;
  const p = centro.aprox_personas ?? 0;
  const a = centro.aprox_ancianos ?? 0;

  if (minN > 0 && n < minN) return false;
  if (minP > 0 && p < minP) return false;
  if (minA > 0 && a < minA) return false;
  return true;
}

export function tienePoblacion(centro: CentroAcopio): boolean {
  return (
    (centro.aprox_ninos ?? 0) > 0 ||
    (centro.aprox_personas ?? 0) > 0 ||
    (centro.aprox_ancianos ?? 0) > 0
  );
}

export function resumenPoblacion(centro: CentroAcopio): string {
  const partes: string[] = [];
  const n = centro.aprox_ninos ?? 0;
  const p = centro.aprox_personas ?? 0;
  const a = centro.aprox_ancianos ?? 0;
  if (n > 0) partes.push(`${n} niños`);
  if (p > 0) partes.push(`${p} personas`);
  if (a > 0) partes.push(`${a} ancianos`);
  return partes.join(" · ");
}

export function parsePoblacionInput(valor: string): number | null {
  const limpio = valor.trim();
  if (!limpio) return null;
  const n = parseInt(limpio, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

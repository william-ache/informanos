import {
  MINUTOS_PROPUESTA,
  MIN_VOTOS_PROPUESTA,
} from "@/lib/propuesta-tipo";
import type { CentroAcopio } from "@/types/database";

export const MIN_VOTOS_FINALIZAR = 100;
export const HORAS_VOTACION_FINALIZAR = 24;
export const HORAS_HISTORIAL = 24;

export type VistaCentros = "activos" | "historial";

export const MIN_VOTOS_REACTIVAR = MIN_VOTOS_PROPUESTA;
export const MINUTOS_REACTIVAR = MINUTOS_PROPUESTA;

export function parseFechaCentro(fecha: string): number {
  return new Date(fecha.replace(" ", "T") + "-04:00").getTime();
}

export function centroEsActivo(c: CentroAcopio): boolean {
  return (c.estado_operativo ?? "activo") === "activo";
}

export function centroEnHistorial(c: CentroAcopio): boolean {
  if (!centroEsActivo(c) && c.finalizado_en) {
    const limite = parseFechaCentro(c.finalizado_en) + HORAS_HISTORIAL * 3600 * 1000;
    return Date.now() < limite;
  }
  return false;
}

export function centroVisibleEnMapa(c: CentroAcopio): boolean {
  return centroEsActivo(c);
}

export function segundosRestantesHistorial(finalizadoEn: string): number {
  const limite =
    parseFechaCentro(finalizadoEn) + HORAS_HISTORIAL * 3600 * 1000;
  return Math.max(0, Math.ceil((limite - Date.now()) / 1000));
}

export function textoReglasFinalizar(): string {
  return `${HORAS_VOTACION_FINALIZAR} h · mín. ${MIN_VOTOS_FINALIZAR} votos · gana mayoría`;
}

export function textoReglasReactivar(): string {
  return `${MINUTOS_REACTIVAR} min · mín. ${MIN_VOTOS_REACTIVAR} votos · gana mayoría`;
}

export function formatoCuentaRegresivaLarga(segundos: number): string {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

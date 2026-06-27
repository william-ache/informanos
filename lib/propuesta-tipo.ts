import type { PropuestaTipoLugar, TipoLugar } from "@/types/database";
import { TIPOS_LUGAR, parseTipoLugar } from "@/lib/tipo-lugar";

export const MIN_VOTOS_PROPUESTA = 5;
export const MINUTOS_PROPUESTA = 5;
export const DURACION_PROPUESTA_MS = MINUTOS_PROPUESTA * 60 * 1000;

export const TIPOS_VOTABLES: TipoLugar[] = TIPOS_LUGAR;

export function parseTipoVotable(value: unknown): TipoLugar | null {
  if (typeof value !== "string") return null;
  const tipo = parseTipoLugar(value);
  return TIPOS_LUGAR.includes(tipo) ? tipo : null;
}

export function propuestaActiva(
  propuesta: PropuestaTipoLugar | null | undefined,
): propuesta is PropuestaTipoLugar {
  if (!propuesta || propuesta.estado !== "activa") return false;
  const expira = new Date(propuesta.expira_en.replace(" ", "T") + "-04:00");
  return expira.getTime() > Date.now();
}

export function segundosRestantes(expiraEn: string): number {
  const expira = new Date(expiraEn.replace(" ", "T") + "-04:00");
  return Math.max(0, Math.ceil((expira.getTime() - Date.now()) / 1000));
}

export function formatoCuentaRegresiva(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function textoReglasVotacion(): string {
  return `${MINUTOS_PROPUESTA} min · mín. ${MIN_VOTOS_PROPUESTA} votos · gana mayoría`;
}

import type { PropuestaTipoLugar, TipoLugarVotable } from "@/types/database";

export const TIPOS_VOTABLES: TipoLugarVotable[] = [
  "donacion",
  "urgencia",
  "peligro",
];

export const DURACION_PROPUESTA_MS = 3 * 60 * 1000;

export function parseTipoVotable(value: unknown): TipoLugarVotable | null {
  if (
    typeof value === "string" &&
    TIPOS_VOTABLES.includes(value as TipoLugarVotable)
  ) {
    return value as TipoLugarVotable;
  }
  return null;
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

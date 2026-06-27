import type { CentroAcopio, TipoLugar } from "@/types/database";

export const TIPOS_LUGAR: TipoLugar[] = [
  "acopio",
  "urgencia",
  "donacion",
  "peligro",
];

export const TIPO_LUGAR_OPCIONES: {
  value: TipoLugar;
  label: string;
  short: string;
  color: string;
}[] = [
  {
    value: "acopio",
    label: "Centro de ayuda / acopio",
    short: "Acopio",
    color: "#2563eb",
  },
  {
    value: "urgencia",
    label: "Zona de urgencia / emergencia",
    short: "Urgencia",
    color: "#dc2626",
  },
  {
    value: "donacion",
    label: "Zona de donación",
    short: "Donación",
    color: "#16a34a",
  },
  {
    value: "peligro",
    label: "Zona de peligro (derrumbe, etc.)",
    short: "Peligro",
    color: "#ea580c",
  },
];

export function parseTipoLugar(value: unknown): TipoLugar {
  if (typeof value === "string" && TIPOS_LUGAR.includes(value as TipoLugar)) {
    return value as TipoLugar;
  }
  return "acopio";
}

export function etiquetaTipoLugar(tipo: TipoLugar): string {
  return TIPO_LUGAR_OPCIONES.find((o) => o.value === tipo)?.label ?? tipo;
}

export function colorTipoLugar(tipo: TipoLugar): string {
  return TIPO_LUGAR_OPCIONES.find((o) => o.value === tipo)?.color ?? "#2563eb";
}

export function mensajeChatNuevoLugar(
  tipo: TipoLugar,
  nombre: string,
  municipio: string,
): string {
  switch (tipo) {
    case "urgencia":
      return `🚨 Zona de urgencia: ${nombre} · ${municipio}`;
    case "donacion":
      return `💚 Punto de donación: ${nombre} · ${municipio}`;
    case "peligro":
      return `⚠️ Zona de peligro: ${nombre} · ${municipio}`;
    default:
      return `📍 Nuevo lugar: ${nombre} · ${municipio}`;
  }
}

export interface FiltroTipoLugar {
  acopio: boolean;
  urgencia: boolean;
  donacion: boolean;
  peligro: boolean;
}

export const filtroTipoLugarInicial: FiltroTipoLugar = {
  acopio: true,
  urgencia: true,
  donacion: true,
  peligro: true,
};

export function filtroTipoLugarActivo(filtro: FiltroTipoLugar): boolean {
  return TIPOS_LUGAR.some((t) => !filtro[t]);
}

export function cumpleFiltroTipoLugar(
  centro: CentroAcopio,
  filtro: FiltroTipoLugar,
): boolean {
  const tipo = centro.tipo_lugar ?? "acopio";
  return filtro[tipo];
}

export function parseDonacionLimite(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed.replace("T", " ")}:00`;
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    return trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  }
  return null;
}

export function donacionLimiteParaInput(value: string | null): string {
  if (!value) return "";
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (!match) return "";
  return `${match[1]}T${match[2]}`;
}

export function donacionVigente(centro: CentroAcopio): boolean {
  if (centro.tipo_lugar !== "donacion" || !centro.donacion_limite) return true;
  const limite = new Date(centro.donacion_limite.replace(" ", "T") + "-04:00");
  return limite.getTime() >= Date.now();
}

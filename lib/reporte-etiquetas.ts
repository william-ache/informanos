import type { TipoReporteError } from "@/types/database";

export const ETIQUETA_TIPO_REPORTE: Record<TipoReporteError, string> = {
  ubicacion_incorrecta: "Ubicación incorrecta",
  info_falsa: "Información falsa",
  info_erronea: "Información errónea",
  error_sistema: "Error del sistema",
  otro: "Otro",
};

export function etiquetaTipoReporte(tipo: TipoReporteError | string): string {
  return ETIQUETA_TIPO_REPORTE[tipo as TipoReporteError] ?? tipo;
}

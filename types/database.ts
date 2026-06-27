export type TipoReporteError =
  | "error_sistema"
  | "info_erronea"
  | "info_falsa"
  | "otro";

export interface ReporteError {
  id: string;
  tipo: TipoReporteError;
  descripcion: string;
  centro_id: string | null;
  contacto: string | null;
  pagina: string | null;
  creado_en: string;
}

export type UrgenciaNivel = "alta" | "media" | "baja";
export type NecesidadEstado = "disponible" | "agotado";
export type VerificarAccion = "confirmar_disponible" | "reportar_agotado";

export interface Necesidad {
  id: string;
  centro_id: string;
  elemento: string;
  cantidad_solicitada: string;
  urgencia: UrgenciaNivel;
  estado: NecesidadEstado;
  reportes_agotado: number;
  reportes_confirmados: number;
  actualizado_en: string;
}

export interface CentroAcopio {
  id: string;
  nombre: string;
  municipio: string;
  direccion: string | null;
  latitud: number;
  longitud: number;
  contacto: string | null;
  aprox_ninos: number | null;
  aprox_personas: number | null;
  aprox_ancianos: number | null;
  creado_en: string;
  necesidades?: Necesidad[];
}

export type NuevoCentroAcopio = Pick<
  CentroAcopio,
  | "nombre"
  | "municipio"
  | "direccion"
  | "contacto"
  | "latitud"
  | "longitud"
  | "aprox_ninos"
  | "aprox_personas"
  | "aprox_ancianos"
>;

export interface ChatMensaje {
  id: string;
  centro_id: string | null;
  autor: string;
  mensaje: string;
  latitud: number | null;
  longitud: number | null;
  creado_en: string;
}

export type NuevoChatMensaje = Pick<ChatMensaje, "autor" | "mensaje" | "centro_id"> & {
  latitud?: number | null;
  longitud?: number | null;
};

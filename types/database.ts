export type UrgenciaNivel = "alta" | "media" | "baja";

export interface Necesidad {
  id: string;
  centro_id: string;
  elemento: string;
  cantidad_solicitada: string;
  urgencia: UrgenciaNivel;
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
  creado_en: string;
  necesidades?: Necesidad[];
}

export type NuevoCentroAcopio = Pick<
  CentroAcopio,
  "nombre" | "municipio" | "direccion" | "contacto" | "latitud" | "longitud"
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

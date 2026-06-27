export type TipoReporteError =
  | "error_sistema"
  | "info_erronea"
  | "info_falsa"
  | "ubicacion_incorrecta"
  | "otro";

export type TipoReporteCentro = Exclude<TipoReporteError, "error_sistema">;

export interface ReporteError {
  id: string;
  tipo: TipoReporteError;
  descripcion: string;
  centro_id: string | null;
  centro_nombre: string | null;
  centro_municipio: string | null;
  contacto: string | null;
  pagina: string | null;
  creado_en: string;
}

export type UrgenciaNivel = "alta" | "media" | "baja";
export type NecesidadEstado = "disponible" | "agotado";
export type VerificarAccion = "confirmar_disponible" | "reportar_agotado";
export type TipoLugar = "acopio" | "urgencia" | "donacion" | "peligro";
export type TipoLugarVotable = TipoLugar;
export type VotoPropuestaTipo = "si" | "no";
export type EstadoOperativoCentro = "activo" | "finalizado";
export type AccionPropuestaNecesidad = "editar" | "agregar" | "eliminar";

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
  propuesta_edit?: PropuestaNecesidad | null;
}

export interface PropuestaNecesidad {
  id: string;
  centro_id: string;
  necesidad_id: string | null;
  accion: AccionPropuestaNecesidad;
  elemento: string;
  cantidad_solicitada: string;
  urgencia: UrgenciaNivel;
  estado: "activa" | "aprobada" | "rechazada";
  expira_en: string;
  creado_en: string;
  votos_si: number;
  votos_no: number;
  votantes: number;
}

export interface CentroAcopio {
  id: string;
  nombre: string;
  municipio: string;
  direccion: string | null;
  descripcion: string | null;
  latitud: number;
  longitud: number;
  contacto: string | null;
  aprox_ninos: number | null;
  aprox_personas: number | null;
  aprox_ancianos: number | null;
  aprox_animales: number | null;
  tipo_lugar: TipoLugar;
  donacion_limite: string | null;
  donacion_necesita: string | null;
  donacion_destino: string | null;
  donacion_transporte: boolean | null;
  solicita_transporte: boolean;
  solicita_medico: boolean;
  solicita_voluntarios: boolean;
  solicita_psicologo: boolean;
  solicita_veterinario: boolean;
  creado_en: string;
  estado_operativo: EstadoOperativoCentro;
  finalizado_en: string | null;
  necesidades?: Necesidad[];
  propuesta_tipo?: PropuestaTipoLugar | null;
  propuestas_necesidad_nuevas?: PropuestaNecesidad[];
  propuesta_finalizar?: PropuestaOperativoCentro | null;
  propuesta_reactivar?: PropuestaOperativoCentro | null;
}

export interface PropuestaOperativoCentro {
  id: string;
  centro_id: string;
  estado: "activa" | "aprobada" | "rechazada";
  expira_en: string;
  creado_en: string;
  votos_si: number;
  votos_no: number;
  votantes: number;
}

export interface PropuestaTipoLugar {
  id: string;
  centro_id: string;
  tipo_propuesto: TipoLugar;
  estado: "activa" | "aprobada" | "rechazada";
  expira_en: string;
  creado_en: string;
  votos_si: number;
  votos_no: number;
  votantes: number;
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
  | "aprox_animales"
  | "tipo_lugar"
  | "donacion_limite"
  | "donacion_necesita"
  | "donacion_destino"
  | "donacion_transporte"
>;

export interface ChatMensaje {
  id: string;
  centro_id: string | null;
  centro_ref: string | null;
  centro_activo: boolean | null;
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

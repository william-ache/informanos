import type { RowDataPacket } from "mysql2";
import { parseTipoLugar } from "@/lib/tipo-lugar";
import { parseZona } from "@/lib/zones";
import type {
  CentroAcopio,
  EstadoOperativoCentro,
  Necesidad,
  PropuestaNecesidad,
  PropuestaOperativoCentro,
  PropuestaTipoLugar,
} from "@/types/database";

export interface CentroRow extends RowDataPacket {
  id: string;
  zona: string | null;
  nombre: string;
  municipio: string;
  direccion: string | null;
  descripcion: string | null;
  latitud: string | number;
  longitud: string | number;
  contacto: string | null;
  aprox_ninos: number | null;
  aprox_personas: number | null;
  aprox_ancianos: number | null;
  aprox_animales: number | null;
  tipo_lugar: string | null;
  donacion_limite: string | null;
  donacion_necesita: string | null;
  donacion_destino: string | null;
  donacion_transporte: number | null;
  estado_operativo: string | null;
  finalizado_en: string | null;
  solicita_transporte: number | null;
  solicita_medico: number | null;
  solicita_voluntarios: number | null;
  solicita_psicologo: number | null;
  solicita_veterinario: number | null;
  creado_en: string;
}

export const CENTRO_SELECT = `id, zona, nombre, municipio, direccion, descripcion, latitud, longitud, contacto,
  aprox_ninos, aprox_personas, aprox_ancianos, aprox_animales,
  tipo_lugar, donacion_limite, donacion_necesita, donacion_destino, donacion_transporte,
  estado_operativo, finalizado_en,
  solicita_transporte, solicita_medico, solicita_voluntarios, solicita_psicologo, solicita_veterinario,
  creado_en`;

export function mapCentro(
  row: CentroRow,
  necesidades: Necesidad[] = [],
  propuesta_tipo: PropuestaTipoLugar | null = null,
  propuestas_necesidad_nuevas: PropuestaNecesidad[] = [],
  propuesta_finalizar: PropuestaOperativoCentro | null = null,
  propuesta_reactivar: PropuestaOperativoCentro | null = null,
): CentroAcopio {
  return {
    id: row.id,
    zona: parseZona(row.zona) ?? "aragua",
    nombre: row.nombre,
    municipio: row.municipio,
    direccion: row.direccion,
    descripcion: row.descripcion,
    latitud: Number(row.latitud),
    longitud: Number(row.longitud),
    contacto: row.contacto,
    aprox_ninos: row.aprox_ninos === null ? null : Number(row.aprox_ninos),
    aprox_personas:
      row.aprox_personas === null ? null : Number(row.aprox_personas),
    aprox_ancianos:
      row.aprox_ancianos === null ? null : Number(row.aprox_ancianos),
    aprox_animales:
      row.aprox_animales === null ? null : Number(row.aprox_animales),
    tipo_lugar: parseTipoLugar(row.tipo_lugar),
    donacion_limite: row.donacion_limite,
    donacion_necesita: row.donacion_necesita,
    donacion_destino: row.donacion_destino,
    donacion_transporte:
      row.donacion_transporte === null ? null : Boolean(row.donacion_transporte),
    estado_operativo: (row.estado_operativo === "finalizado"
      ? "finalizado"
      : "activo") as EstadoOperativoCentro,
    finalizado_en: row.finalizado_en,
    solicita_transporte: Boolean(row.solicita_transporte),
    solicita_medico: Boolean(row.solicita_medico),
    solicita_voluntarios: Boolean(row.solicita_voluntarios),
    solicita_psicologo: Boolean(row.solicita_psicologo),
    solicita_veterinario: Boolean(row.solicita_veterinario),
    creado_en: row.creado_en,
    necesidades,
    propuesta_tipo,
    propuestas_necesidad_nuevas,
    propuesta_finalizar,
    propuesta_reactivar,
  };
}

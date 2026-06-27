import type { RowDataPacket } from "mysql2";
import { parseTipoLugar } from "@/lib/tipo-lugar";
import type { CentroAcopio, Necesidad, PropuestaTipoLugar } from "@/types/database";

export interface CentroRow extends RowDataPacket {
  id: string;
  nombre: string;
  municipio: string;
  direccion: string | null;
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
  creado_en: string;
}

export const CENTRO_SELECT = `id, nombre, municipio, direccion, latitud, longitud, contacto,
  aprox_ninos, aprox_personas, aprox_ancianos, aprox_animales,
  tipo_lugar, donacion_limite, donacion_necesita, donacion_destino, donacion_transporte,
  creado_en`;

export function mapCentro(
  row: CentroRow,
  necesidades: Necesidad[] = [],
  propuesta_tipo: PropuestaTipoLugar | null = null,
): CentroAcopio {
  return {
    id: row.id,
    nombre: row.nombre,
    municipio: row.municipio,
    direccion: row.direccion,
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
    creado_en: row.creado_en,
    necesidades,
    propuesta_tipo,
  };
}

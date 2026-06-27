import type { RowDataPacket } from "mysql2";
import type { Necesidad, NecesidadEstado, UrgenciaNivel } from "@/types/database";

export interface NecesidadRow extends RowDataPacket {
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

export const NECESIDAD_SELECT = `
  id, centro_id, elemento, cantidad_solicitada, urgencia,
  estado, reportes_agotado, reportes_confirmados, actualizado_en
`;

export function mapNecesidad(row: NecesidadRow): Necesidad {
  return {
    id: row.id,
    centro_id: row.centro_id,
    elemento: row.elemento,
    cantidad_solicitada: row.cantidad_solicitada,
    urgencia: row.urgencia,
    estado: row.estado,
    reportes_agotado: Number(row.reportes_agotado),
    reportes_confirmados: Number(row.reportes_confirmados),
    actualizado_en: row.actualizado_en,
  };
}

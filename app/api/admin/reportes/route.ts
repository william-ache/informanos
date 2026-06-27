import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import pool, { ensureSchema } from "@/lib/db";
import { handleDbError, requireDb } from "@/lib/api";
import type { ReporteError, TipoReporteError } from "@/types/database";

interface ReporteRow extends RowDataPacket {
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

export async function GET(request: Request) {
  const configError = requireDb();
  if (configError) return configError;

  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    await ensureSchema();

    const [rows] = await pool.query<ReporteRow[]>(
      `SELECT r.id, r.tipo, r.descripcion, r.centro_id, r.contacto, r.pagina, r.creado_en,
              c.nombre AS centro_nombre, c.municipio AS centro_municipio
       FROM reportes_errores r
       LEFT JOIN centros_acopio c ON c.id = r.centro_id
       ORDER BY r.creado_en DESC
       LIMIT 100`,
    );

    const reportes: ReporteError[] = rows.map((row) => ({
      id: row.id,
      tipo: row.tipo,
      descripcion: row.descripcion,
      centro_id: row.centro_id,
      centro_nombre: row.centro_nombre,
      centro_municipio: row.centro_municipio,
      contacto: row.contacto,
      pagina: row.pagina,
      creado_en: row.creado_en,
    }));

    return NextResponse.json({ reportes });
  } catch (error) {
    return handleDbError(error);
  }
}

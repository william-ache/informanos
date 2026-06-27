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
      `SELECT id, tipo, descripcion, centro_id, contacto, pagina, creado_en
       FROM reportes_errores
       ORDER BY creado_en DESC
       LIMIT 100`,
    );

    const reportes: ReporteError[] = rows.map((row) => ({
      id: row.id,
      tipo: row.tipo,
      descripcion: row.descripcion,
      centro_id: row.centro_id,
      contacto: row.contacto,
      pagina: row.pagina,
      creado_en: row.creado_en,
    }));

    return NextResponse.json({ reportes });
  } catch (error) {
    return handleDbError(error);
  }
}

import { NextResponse } from "next/server";
import pool, { ensureSchema } from "@/lib/db";
import { handleDbError, parseJsonBody, requireDb } from "@/lib/api";
import {
  mapNecesidad,
  NECESIDAD_SELECT,
  type NecesidadRow,
} from "@/lib/necesidad-map";
import type { VerificarAccion } from "@/types/database";

const ACCIONES: VerificarAccion[] = ["confirmar_disponible", "reportar_agotado"];

export async function POST(request: Request) {
  const configError = requireDb();
  if (configError) return configError;

  try {
    await ensureSchema();

    const body = parseJsonBody<Record<string, unknown>>(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
    }

    const id = typeof body.id === "string" ? body.id.trim() : "";
    const accion = body.accion as VerificarAccion;
    const esTestigo = body.es_testigo_presencial === true;

    if (!id) {
      return NextResponse.json({ error: "Campo requerido: id." }, { status: 400 });
    }

    if (!ACCIONES.includes(accion)) {
      return NextResponse.json(
        {
          error:
            "Campo accion inválido. Usa confirmar_disponible o reportar_agotado.",
        },
        { status: 400 },
      );
    }

    const peso = esTestigo ? 2 : 1;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [existentes] = await connection.query<NecesidadRow[]>(
        `SELECT ${NECESIDAD_SELECT} FROM necesidades WHERE id = ? FOR UPDATE`,
        [id],
      );

      if (!existentes[0]) {
        await connection.rollback();
        return NextResponse.json(
          { error: "Necesidad no encontrada." },
          { status: 404 },
        );
      }

      if (accion === "reportar_agotado") {
        await connection.execute(
          `UPDATE necesidades
           SET reportes_agotado = reportes_agotado + ?,
               estado = IF(reportes_agotado + ? >= 3, 'agotado', estado)
           WHERE id = ?`,
          [peso, peso, id],
        );
      } else {
        await connection.execute(
          `UPDATE necesidades
           SET reportes_confirmados = reportes_confirmados + ?
           WHERE id = ?`,
          [peso, id],
        );
      }

      await connection.commit();

      const [rows] = await pool.query<NecesidadRow[]>(
        `SELECT ${NECESIDAD_SELECT} FROM necesidades WHERE id = ?`,
        [id],
      );

      const actualizada = rows[0];
      if (!actualizada) {
        return NextResponse.json(
          { error: "Voto registrado pero no se pudo recuperar la necesidad." },
          { status: 500 },
        );
      }

      return NextResponse.json({ necesidad: mapNecesidad(actualizada) });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    return handleDbError(error);
  }
}

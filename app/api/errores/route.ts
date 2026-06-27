import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import pool, { ensureSchema } from "@/lib/db";
import { handleDbError, parseJsonBody, requireDb } from "@/lib/api";
import {
  ETIQUETA_TIPO_REPORTE,
  obtenerNombreCentro,
  publicarEnChat,
} from "@/lib/chat-actividad";
import { hashIp, obtenerIp } from "@/lib/presence";
import type { TipoReporteError } from "@/types/database";

const TIPOS: TipoReporteError[] = [
  "error_sistema",
  "info_erronea",
  "info_falsa",
  "ubicacion_incorrecta",
  "otro",
];

export async function POST(request: Request) {
  const configError = requireDb();
  if (configError) return configError;

  try {
    await ensureSchema();
    const body = parseJsonBody<Record<string, unknown>>(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
    }

    const tipo = TIPOS.includes(body.tipo as TipoReporteError)
      ? (body.tipo as TipoReporteError)
      : null;
    const descripcion =
      typeof body.descripcion === "string" ? body.descripcion.trim() : "";
    const centroId =
      typeof body.centro_id === "string" && body.centro_id.trim()
        ? body.centro_id.trim()
        : null;
    const contacto =
      typeof body.contacto === "string" && body.contacto.trim()
        ? body.contacto.trim().slice(0, 200)
        : null;
    const pagina =
      typeof body.pagina === "string" && body.pagina.trim()
        ? body.pagina.trim().slice(0, 500)
        : null;
    const userAgent =
      request.headers.get("user-agent")?.slice(0, 500) ?? null;

    if (!tipo || descripcion.length < (centroId ? 5 : 10)) {
      return NextResponse.json(
        {
          error: centroId
            ? "Indica el tipo y una descripción de al menos 5 caracteres."
            : "Indica el tipo de reporte y una descripción de al menos 10 caracteres.",
        },
        { status: 400 },
      );
    }

    if (centroId) {
      const [centros] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM centros_acopio WHERE id = ? LIMIT 1",
        [centroId],
      );
      if (!centros[0]) {
        return NextResponse.json(
          { error: "El centro indicado no existe." },
          { status: 400 },
        );
      }
    }

    const id = randomUUID();
    const ipHash = hashIp(obtenerIp(request));

    await pool.execute(
      `INSERT INTO reportes_errores
        (id, tipo, descripcion, centro_id, contacto, pagina, user_agent, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, tipo, descripcion, centroId, contacto, pagina, userAgent, ipHash],
    );

    const etiqueta = ETIQUETA_TIPO_REPORTE[tipo] ?? tipo;
    if (centroId) {
      const nombre = (await obtenerNombreCentro(centroId)) ?? "un centro";
      await publicarEnChat(
        `⚠️ Reporte en «${nombre}»: ${etiqueta} — ${descripcion.slice(0, 140)}`,
        centroId,
      );
    } else {
      await publicarEnChat(`⚠️ ${etiqueta}: ${descripcion.slice(0, 160)}`);
    }

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    return handleDbError(error);
  }
}

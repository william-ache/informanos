import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import pool, { ensureSchema } from "@/lib/db";
import { handleDbError, parseJsonBody, requireDb } from "@/lib/api";
import { publicarEnChat } from "@/lib/chat-actividad";
import {
  ayudaDesdeCentro,
  cambiosAyudaTexto,
  cambiosPoblacionTexto,
  mensajeChatEdicionCentro,
  parseAyudaBody,
  type AyudaSolicitada,
} from "@/lib/ayuda-solicitada";
import { CENTRO_SELECT, mapCentro, type CentroRow } from "@/lib/centro-map";

interface Params {
  params: Promise<{ id: string }>;
}

function parsePoblacion(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.floor(num);
}

function parseBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

export async function PATCH(request: Request, { params }: Params) {
  const configError = requireDb();
  if (configError) return configError;

  try {
    await ensureSchema();
    const { id } = await params;
    const body = parseJsonBody<Record<string, unknown>>(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
    }

    const [existentes] = await pool.query<CentroRow[]>(
      `SELECT ${CENTRO_SELECT} FROM centros_acopio WHERE id = ? LIMIT 1`,
      [id],
    );
    const antes = existentes[0];
    if (!antes) {
      return NextResponse.json({ error: "Lugar no encontrado." }, { status: 404 });
    }

    const centroAntes = mapCentro(antes);
    const ayudaAntes = ayudaDesdeCentro(centroAntes);

    const contacto =
      typeof body.contacto === "string" ? body.contacto.trim() || null : centroAntes.contacto;

    if (contacto !== null && contacto.length > 500) {
      return NextResponse.json({ error: "Demasiados números de contacto." }, { status: 400 });
    }

    const ayudaParcial = parseAyudaBody(body);
    const ayudaNueva: AyudaSolicitada = {
      solicita_transporte: parseBool(
        ayudaParcial.solicita_transporte,
        ayudaAntes.solicita_transporte,
      ),
      solicita_medico: parseBool(ayudaParcial.solicita_medico, ayudaAntes.solicita_medico),
      solicita_voluntarios: parseBool(
        ayudaParcial.solicita_voluntarios,
        ayudaAntes.solicita_voluntarios,
      ),
      solicita_psicologo: parseBool(
        ayudaParcial.solicita_psicologo,
        ayudaAntes.solicita_psicologo,
      ),
      solicita_veterinario: parseBool(
        ayudaParcial.solicita_veterinario,
        ayudaAntes.solicita_veterinario,
      ),
    };

    const poblacion = {
      aprox_ninos:
        "aprox_ninos" in body
          ? parsePoblacion(body.aprox_ninos)
          : centroAntes.aprox_ninos,
      aprox_personas:
        "aprox_personas" in body
          ? parsePoblacion(body.aprox_personas)
          : centroAntes.aprox_personas,
      aprox_ancianos:
        "aprox_ancianos" in body
          ? parsePoblacion(body.aprox_ancianos)
          : centroAntes.aprox_ancianos,
      aprox_animales:
        "aprox_animales" in body
          ? parsePoblacion(body.aprox_animales)
          : centroAntes.aprox_animales,
    };

    const descripcion =
      "descripcion" in body
        ? typeof body.descripcion === "string"
          ? body.descripcion.trim().slice(0, 1000) || null
          : null
        : centroAntes.descripcion;

    await pool.execute(
      `UPDATE centros_acopio
       SET contacto = ?,
           descripcion = ?,
           aprox_ninos = ?,
           aprox_personas = ?,
           aprox_ancianos = ?,
           aprox_animales = ?,
           solicita_transporte = ?,
           solicita_medico = ?,
           solicita_voluntarios = ?,
           solicita_psicologo = ?,
           solicita_veterinario = ?
       WHERE id = ?`,
      [
        contacto,
        descripcion,
        poblacion.aprox_ninos,
        poblacion.aprox_personas,
        poblacion.aprox_ancianos,
        poblacion.aprox_animales,
        ayudaNueva.solicita_transporte ? 1 : 0,
        ayudaNueva.solicita_medico ? 1 : 0,
        ayudaNueva.solicita_voluntarios ? 1 : 0,
        ayudaNueva.solicita_psicologo ? 1 : 0,
        ayudaNueva.solicita_veterinario ? 1 : 0,
        id,
      ],
    );

    const lineas: string[] = [];
    if (contacto !== centroAntes.contacto) {
      lineas.push(contacto ? `Tel: ${contacto}` : "Teléfonos quitados");
    }
    if (descripcion !== centroAntes.descripcion) {
      lineas.push(descripcion ? `Descripción: ${descripcion}` : "Descripción quitada");
    }
    lineas.push(...cambiosPoblacionTexto(centroAntes, poblacion));
    lineas.push(...cambiosAyudaTexto(ayudaAntes, ayudaNueva));

    if (lineas.length > 0) {
      await publicarEnChat(mensajeChatEdicionCentro(centroAntes.nombre, lineas), id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleDbError(error);
  }
}

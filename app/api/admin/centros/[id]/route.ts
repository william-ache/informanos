import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import {
  detectarZona,
  mensajeFueraTodasZonas,
  mensajeFueraZona,
  parseZona,
  puntoEnZona,
} from "@/lib/zones";
import { requireAdmin } from "@/lib/admin-auth";
import pool, { ensureSchema } from "@/lib/db";
import { handleDbError, parseJsonBody, requireDb, toNumber } from "@/lib/api";
import { publicarEnChat, obtenerNombreCentro } from "@/lib/chat-actividad";
import { parseDonacionLimite, parseTipoLugar } from "@/lib/tipo-lugar";

interface Params {
  params: Promise<{ id: string }>;
}

function parsePoblacion(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.floor(num);
}

export async function PATCH(request: Request, { params }: Params) {
  const configError = requireDb();
  if (configError) return configError;

  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    await ensureSchema();
    const { id } = await params;
    const body = parseJsonBody<Record<string, unknown>>(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
    }

    const [existentes] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM centros_acopio WHERE id = ? LIMIT 1",
      [id],
    );
    if (!existentes[0]) {
      return NextResponse.json({ error: "Lugar no encontrado." }, { status: 404 });
    }

    const campos: string[] = [];
    const valores: (string | number | null)[] = [];

    if (typeof body.nombre === "string" && body.nombre.trim()) {
      campos.push("nombre = ?");
      valores.push(body.nombre.trim());
    }
    if (typeof body.municipio === "string" && body.municipio.trim()) {
      campos.push("municipio = ?");
      valores.push(body.municipio.trim());
    }
    if ("direccion" in body) {
      campos.push("direccion = ?");
      valores.push(
        typeof body.direccion === "string" ? body.direccion.trim() || null : null,
      );
    }
    if ("contacto" in body) {
      campos.push("contacto = ?");
      valores.push(
        typeof body.contacto === "string" ? body.contacto.trim() || null : null,
      );
    }
    if (body.latitud !== undefined || body.longitud !== undefined) {
      const lat = toNumber(body.latitud);
      const lng = toNumber(body.longitud);
      if (lat === null || lng === null) {
        return NextResponse.json({ error: "Latitud/longitud inválidas." }, { status: 400 });
      }
      const zonaCoords = detectarZona(lat, lng);
      if (!zonaCoords || !puntoEnZona(zonaCoords, lat, lng)) {
        return NextResponse.json({ error: mensajeFueraTodasZonas() }, { status: 400 });
      }
      campos.push("latitud = ?", "longitud = ?", "zona = ?");
      valores.push(lat, lng, zonaCoords);
    }
    if ("aprox_ninos" in body) {
      campos.push("aprox_ninos = ?");
      valores.push(parsePoblacion(body.aprox_ninos));
    }
    if ("aprox_personas" in body) {
      campos.push("aprox_personas = ?");
      valores.push(parsePoblacion(body.aprox_personas));
    }
    if ("aprox_ancianos" in body) {
      campos.push("aprox_ancianos = ?");
      valores.push(parsePoblacion(body.aprox_ancianos));
    }
    if ("aprox_animales" in body) {
      campos.push("aprox_animales = ?");
      valores.push(parsePoblacion(body.aprox_animales));
    }
    if ("tipo_lugar" in body) {
      campos.push("tipo_lugar = ?");
      valores.push(parseTipoLugar(body.tipo_lugar));
    }
    if ("donacion_limite" in body) {
      campos.push("donacion_limite = ?");
      valores.push(parseDonacionLimite(body.donacion_limite));
    }
    if ("donacion_necesita" in body) {
      campos.push("donacion_necesita = ?");
      valores.push(
        typeof body.donacion_necesita === "string"
          ? body.donacion_necesita.trim() || null
          : null,
      );
    }
    if ("donacion_destino" in body) {
      campos.push("donacion_destino = ?");
      valores.push(
        typeof body.donacion_destino === "string"
          ? body.donacion_destino.trim() || null
          : null,
      );
    }
    if ("donacion_transporte" in body) {
      campos.push("donacion_transporte = ?");
      valores.push(
        body.donacion_transporte === true
          ? 1
          : body.donacion_transporte === false
            ? 0
            : null,
      );
    }

    if (campos.length === 0) {
      return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
    }

    valores.push(id);
    await pool.execute(
      `UPDATE centros_acopio SET ${campos.join(", ")} WHERE id = ?`,
      valores,
    );

    const nombre = (await obtenerNombreCentro(id)) ?? "un lugar";
    await publicarEnChat(`✏️ Lugar actualizado: «${nombre}»`, id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleDbError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const configError = requireDb();
  if (configError) return configError;

  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    await ensureSchema();
    const { id } = await params;

    const nombre = (await obtenerNombreCentro(id)) ?? "un lugar";

    await publicarEnChat(`🗑️ Lugar eliminado: «${nombre}»`, null);

    const [result] = await pool.execute(
      "DELETE FROM centros_acopio WHERE id = ?",
      [id],
    );

    const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
    if (affected === 0) {
      return NextResponse.json({ error: "Lugar no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleDbError(error);
  }
}

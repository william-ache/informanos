import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { MENSAJE_FUERA_ARAGUA, puntoEnAragua } from "@/lib/aragua-boundary";
import pool, { ensureSchema } from "@/lib/db";
import { handleDbError, parseJsonBody, requireDb, toNumber } from "@/lib/api";
import { mapNecesidad, NECESIDAD_SELECT, type NecesidadRow } from "@/lib/necesidad-map";
import type { CentroAcopio, Necesidad, NuevoCentroAcopio } from "@/types/database";

interface CentroRow extends RowDataPacket {
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
  creado_en: string;
}

function mapCentro(row: CentroRow, necesidades: Necesidad[]): CentroAcopio {
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
    creado_en: row.creado_en,
    necesidades,
  };
}

export async function GET() {
  const configError = requireDb();
  if (configError) return configError;

  try {
    await ensureSchema();

    const [centrosRows] = await pool.query<CentroRow[]>(
      `SELECT id, nombre, municipio, direccion, latitud, longitud, contacto,
              aprox_ninos, aprox_personas, aprox_ancianos, aprox_animales, creado_en
       FROM centros_acopio
       ORDER BY nombre ASC`,
    );

    const [necesidadesRows] = await pool.query<NecesidadRow[]>(
      `SELECT ${NECESIDAD_SELECT}
       FROM necesidades
       ORDER BY actualizado_en DESC`,
    );

    const necesidadesPorCentro = new Map<string, Necesidad[]>();
    for (const row of necesidadesRows) {
      const lista = necesidadesPorCentro.get(row.centro_id) ?? [];
      lista.push(mapNecesidad(row));
      necesidadesPorCentro.set(row.centro_id, lista);
    }

    const centros = centrosRows.map((row) =>
      mapCentro(row, necesidadesPorCentro.get(row.id) ?? []),
    );

    return NextResponse.json({ centros });
  } catch (error) {
    return handleDbError(error);
  }
}

export async function POST(request: Request) {
  const configError = requireDb();
  if (configError) return configError;

  try {
    const body = parseJsonBody<Record<string, unknown>>(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
    }

    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const municipio = typeof body.municipio === "string" ? body.municipio.trim() : "";
    const latitud = toNumber(body.latitud);
    const longitud = toNumber(body.longitud);

    if (!nombre || !municipio || latitud === null || longitud === null) {
      return NextResponse.json(
        {
          error:
            "Campos requeridos: nombre, municipio, latitud y longitud.",
        },
        { status: 400 },
      );
    }

    if (!puntoEnAragua(latitud, longitud)) {
      return NextResponse.json({ error: MENSAJE_FUERA_ARAGUA }, { status: 400 });
    }

    const centro: NuevoCentroAcopio = {
      nombre,
      municipio,
      direccion:
        typeof body.direccion === "string" ? body.direccion.trim() || null : null,
      contacto:
        typeof body.contacto === "string" ? body.contacto.trim() || null : null,
      latitud,
      longitud,
      aprox_ninos: parsePoblacion(body.aprox_ninos),
      aprox_personas: parsePoblacion(body.aprox_personas),
      aprox_ancianos: parsePoblacion(body.aprox_ancianos),
      aprox_animales: parsePoblacion(body.aprox_animales),
    };

    const id = randomUUID();

    await pool.execute(
      `INSERT INTO centros_acopio
        (id, nombre, municipio, direccion, latitud, longitud, contacto,
         aprox_ninos, aprox_personas, aprox_ancianos, aprox_animales)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        centro.nombre,
        centro.municipio,
        centro.direccion,
        centro.latitud,
        centro.longitud,
        centro.contacto,
        centro.aprox_ninos,
        centro.aprox_personas,
        centro.aprox_ancianos,
        centro.aprox_animales,
      ],
    );

    const [rows] = await pool.query<CentroRow[]>(
      `SELECT id, nombre, municipio, direccion, latitud, longitud, contacto,
              aprox_ninos, aprox_personas, aprox_ancianos, aprox_animales, creado_en
       FROM centros_acopio
       WHERE id = ?`,
      [id],
    );

    const created = rows[0];
    if (!created) {
      return NextResponse.json(
        { error: "Centro creado pero no se pudo recuperar." },
        { status: 500 },
      );
    }

    return NextResponse.json({ centro: mapCentro(created, []) }, { status: 201 });
  } catch (error) {
    return handleDbError(error);
  }
}

function parsePoblacion(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.floor(num);
}

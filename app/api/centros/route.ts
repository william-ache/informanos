import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { handleDbError, parseJsonBody, requireDb, toNumber } from "@/lib/api";
import type { CentroAcopio, Necesidad, NuevoCentroAcopio } from "@/types/database";

interface CentroRow extends RowDataPacket {
  id: string;
  nombre: string;
  municipio: string;
  direccion: string | null;
  latitud: string | number;
  longitud: string | number;
  contacto: string | null;
  creado_en: string;
}

interface NecesidadRow extends RowDataPacket {
  id: string;
  centro_id: string;
  elemento: string;
  cantidad_solicitada: string;
  urgencia: Necesidad["urgencia"];
  actualizado_en: string;
}

function mapNecesidad(row: NecesidadRow): Necesidad {
  return {
    id: row.id,
    centro_id: row.centro_id,
    elemento: row.elemento,
    cantidad_solicitada: row.cantidad_solicitada,
    urgencia: row.urgencia,
    actualizado_en: row.actualizado_en,
  };
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
    creado_en: row.creado_en,
    necesidades,
  };
}

export async function GET() {
  const configError = requireDb();
  if (configError) return configError;

  try {
    const [centrosRows] = await pool.query<CentroRow[]>(
      `SELECT id, nombre, municipio, direccion, latitud, longitud, contacto, creado_en
       FROM centros_acopio
       ORDER BY nombre ASC`,
    );

    const [necesidadesRows] = await pool.query<NecesidadRow[]>(
      `SELECT id, centro_id, elemento, cantidad_solicitada, urgencia, actualizado_en
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

    const centro: NuevoCentroAcopio = {
      nombre,
      municipio,
      direccion:
        typeof body.direccion === "string" ? body.direccion.trim() || null : null,
      contacto:
        typeof body.contacto === "string" ? body.contacto.trim() || null : null,
      latitud,
      longitud,
    };

    const id = randomUUID();

    await pool.execute(
      `INSERT INTO centros_acopio (id, nombre, municipio, direccion, latitud, longitud, contacto)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        centro.nombre,
        centro.municipio,
        centro.direccion,
        centro.latitud,
        centro.longitud,
        centro.contacto,
      ],
    );

    const [rows] = await pool.query<CentroRow[]>(
      `SELECT id, nombre, municipio, direccion, latitud, longitud, contacto, creado_en
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

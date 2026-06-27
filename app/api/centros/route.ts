import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { MENSAJE_FUERA_ARAGUA, puntoEnAragua } from "@/lib/aragua-boundary";
import pool, { ensureSchema } from "@/lib/db";
import { handleDbError, parseJsonBody, requireDb, toNumber } from "@/lib/api";
import { publicarEnChat } from "@/lib/chat-actividad";
import {
  CENTRO_SELECT,
  mapCentro,
  type CentroRow,
} from "@/lib/centro-map";
import { mapNecesidad, NECESIDAD_SELECT, type NecesidadRow } from "@/lib/necesidad-map";
import { cargarPropuestasActivas } from "@/lib/propuesta-tipo-server";
import { cargarPropuestasNecesidadActivas } from "@/lib/propuesta-necesidad-server";
import {
  cargarPropuestasFinalizarActivas,
  cargarPropuestasReactivarActivas,
} from "@/lib/propuesta-operativo-server";
import {
  mensajeChatNuevoLugar,
  parseDonacionLimite,
  parseTipoLugar,
} from "@/lib/tipo-lugar";
import type { CentroAcopio, Necesidad, NuevoCentroAcopio } from "@/types/database";

export async function GET() {
  const configError = requireDb();
  if (configError) return configError;

  try {
    await ensureSchema();

    const [centrosRows] = await pool.query<CentroRow[]>(
      `SELECT ${CENTRO_SELECT}
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

    const propuestasPorCentro = await cargarPropuestasActivas();
    const propuestasFinalizar = await cargarPropuestasFinalizarActivas();
    const propuestasReactivar = await cargarPropuestasReactivarActivas();
    const { porNecesidad, nuevas: propuestasNuevas } =
      await cargarPropuestasNecesidadActivas();

    const propuestasNuevasPorCentro = new Map<string, typeof propuestasNuevas>();
    for (const prop of propuestasNuevas) {
      const lista = propuestasNuevasPorCentro.get(prop.centro_id) ?? [];
      lista.push(prop);
      propuestasNuevasPorCentro.set(prop.centro_id, lista);
    }

    const centros = centrosRows.map((row) => {
      const necesidades = (necesidadesPorCentro.get(row.id) ?? []).map((nec) => ({
        ...nec,
        propuesta_edit: porNecesidad.get(nec.id) ?? null,
      }));

      return mapCentro(
        row,
        necesidades,
        propuestasPorCentro.get(row.id) ?? null,
        propuestasNuevasPorCentro.get(row.id) ?? [],
        propuestasFinalizar.get(row.id) ?? null,
        propuestasReactivar.get(row.id) ?? null,
      );
    });

    return NextResponse.json({ centros });
  } catch (error) {
    return handleDbError(error);
  }
}

export async function POST(request: Request) {
  const configError = requireDb();
  if (configError) return configError;

  try {
    await ensureSchema();
    const body = parseJsonBody<Record<string, unknown>>(await request.json());
    if (!body) {
      return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
    }

    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const municipio = typeof body.municipio === "string" ? body.municipio.trim() : "";
    const latitud = toNumber(body.latitud);
    const longitud = toNumber(body.longitud);
    const tipoLugar = parseTipoLugar(body.tipo_lugar);

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

    const donacionNecesita =
      typeof body.donacion_necesita === "string"
        ? body.donacion_necesita.trim() || null
        : null;
    const donacionDestino =
      typeof body.donacion_destino === "string"
        ? body.donacion_destino.trim() || null
        : null;
    const donacionLimite = parseDonacionLimite(body.donacion_limite);
    const donacionTransporte =
      body.donacion_transporte === true
        ? true
        : body.donacion_transporte === false
          ? false
          : null;

    if (tipoLugar === "donacion" && !donacionNecesita) {
      return NextResponse.json(
        { error: "Indica qué se recoge o qué se necesita en la zona de donación." },
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
      aprox_ninos: parsePoblacion(body.aprox_ninos),
      aprox_personas: parsePoblacion(body.aprox_personas),
      aprox_ancianos: parsePoblacion(body.aprox_ancianos),
      aprox_animales: parsePoblacion(body.aprox_animales),
      tipo_lugar: tipoLugar,
      donacion_limite: tipoLugar === "donacion" ? donacionLimite : null,
      donacion_necesita: tipoLugar === "donacion" ? donacionNecesita : null,
      donacion_destino: tipoLugar === "donacion" ? donacionDestino : null,
      donacion_transporte: tipoLugar === "donacion" ? donacionTransporte : null,
    };

    const id = randomUUID();

    await pool.execute(
      `INSERT INTO centros_acopio
        (id, nombre, municipio, direccion, latitud, longitud, contacto,
         aprox_ninos, aprox_personas, aprox_ancianos, aprox_animales,
         tipo_lugar, donacion_limite, donacion_necesita, donacion_destino, donacion_transporte)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        centro.tipo_lugar,
        centro.donacion_limite,
        centro.donacion_necesita,
        centro.donacion_destino,
        centro.donacion_transporte === null ? null : centro.donacion_transporte ? 1 : 0,
      ],
    );

    const [rows] = await pool.query<CentroRow[]>(
      `SELECT ${CENTRO_SELECT}
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

    await publicarEnChat(
      mensajeChatNuevoLugar(centro.tipo_lugar, centro.nombre, centro.municipio),
      id,
    );

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

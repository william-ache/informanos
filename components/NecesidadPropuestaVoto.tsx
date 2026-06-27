"use client";

import { useEffect, useState } from "react";
import { mutate } from "swr";
import {
  formatoCuentaRegresiva,
  MIN_VOTOS_PROPUESTA,
  propuestaActiva,
  segundosRestantes,
} from "@/lib/propuesta-tipo";
import { resolverVotoPresencial } from "@/lib/voto-presencial";
import { useZonaContext } from "@/lib/zona-context";
import type { CentroAcopio, PropuestaNecesidad } from "@/types/database";

interface CentrosResponse {
  centros: CentroAcopio[];
}

function etiquetaAccion(prop: PropuestaNecesidad): string {
  if (prop.accion === "eliminar") return `Eliminar «${prop.elemento}»`;
  if (prop.accion === "agregar") {
    return `Agregar «${prop.elemento} (${prop.cantidad_solicitada})»`;
  }
  return `Cambiar a «${prop.elemento} (${prop.cantidad_solicitada})» · ${prop.urgencia}`;
}

function actualizarPropuesta(
  data: CentrosResponse | undefined,
  propuesta: PropuestaNecesidad,
): CentrosResponse | undefined {
  if (!data) return data;

  return {
    centros: data.centros.map((centro) => {
      if (centro.id !== propuesta.centro_id) return centro;

      if (!propuesta.necesidad_id) {
        const nuevas = (centro.propuestas_necesidad_nuevas ?? []).map((p) =>
          p.id === propuesta.id ? propuesta : p,
        );
        return { ...centro, propuestas_necesidad_nuevas: nuevas };
      }

      return {
        ...centro,
        necesidades: (centro.necesidades ?? []).map((nec) =>
          nec.id === propuesta.necesidad_id
            ? { ...nec, propuesta_edit: propuesta }
            : nec,
        ),
      };
    }),
  };
}

interface NecesidadPropuestaVotoProps {
  centro: CentroAcopio;
  propuesta: PropuestaNecesidad;
  compact?: boolean;
}

export default function NecesidadPropuestaVoto({
  centro,
  propuesta,
  compact = false,
}: NecesidadPropuestaVotoProps) {
  const { centrosKey, revalidateCentros } = useZonaContext();
  const [procesando, setProcesando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const activa = propuestaActiva(propuesta) ? propuesta : null;

  useEffect(() => {
    if (!activa) {
      setSegundos(0);
      return;
    }
    const tick = () => setSegundos(segundosRestantes(activa.expira_en));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [activa]);

  useEffect(() => {
    if (!activa || segundos > 0) return;
    void mutate(centrosKey);
  }, [activa, segundos]);

  if (!activa || segundos <= 0) return null;

  async function votar(voto: "si" | "no") {
    if (procesando || !activa) return;
    const { continuar, esTestigo } = await resolverVotoPresencial(centro);
    if (!continuar) return;

    setProcesando(true);
    try {
      const res = await fetch("/api/centros/propuesta-necesidad/votar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propuesta_id: activa.id,
          voto,
          es_testigo_presencial: esTestigo,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo registrar el voto.");
      }

      const body = (await res.json()) as { propuesta: PropuestaNecesidad };
      await mutate(
        centrosKey,
        (actual: CentrosResponse | undefined) =>
          actualizarPropuesta(actual, body.propuesta),
        { revalidate: true },
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Error al votar.");
    } finally {
      setProcesando(false);
    }
  }

  const btnClass = compact
    ? "rounded-md px-2 py-1.5 text-[10px] font-bold disabled:opacity-50"
    : "rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50";

  return (
    <div
      className={`mt-2 rounded-lg border border-blue-300 bg-blue-50 p-2 ${compact ? "text-[10px]" : "text-xs"}`}
    >
      <p className="font-bold text-blue-900">Votación: {etiquetaAccion(activa)}</p>
      <p className="mt-0.5 font-mono text-blue-700">
        ⏱ {formatoCuentaRegresiva(segundos)}
      </p>
      <p className="mt-0.5 text-blue-800">
        Sí {activa.votos_si} · No {activa.votos_no} · {activa.votantes}/{MIN_VOTOS_PROPUESTA}{" "}
        votantes
      </p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={procesando}
          onClick={() => void votar("si")}
          className={`${btnClass} bg-emerald-600 text-white`}
        >
          👍 Sí
        </button>
        <button
          type="button"
          disabled={procesando}
          onClick={() => void votar("no")}
          className={`${btnClass} bg-slate-600 text-white`}
        >
          👎 No
        </button>
      </div>
    </div>
  );
}

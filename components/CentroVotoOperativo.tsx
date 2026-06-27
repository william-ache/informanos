"use client";

import { useEffect, useState } from "react";
import { mutate } from "swr";
import {
  formatoCuentaRegresivaLarga,
  MIN_VOTOS_FINALIZAR,
  MIN_VOTOS_REACTIVAR,
  textoReglasFinalizar,
  textoReglasReactivar,
} from "@/lib/centro-operativo";
import {
  formatoCuentaRegresiva,
  propuestaActiva,
  segundosRestantes,
} from "@/lib/propuesta-tipo";
import { resolverVotoPresencial } from "@/lib/voto-presencial";
import { useZonaContext } from "@/lib/zona-context";
import type { CentroAcopio, PropuestaOperativoCentro } from "@/types/database";

interface CentrosResponse {
  centros: CentroAcopio[];
}

type ModoOperativo = "finalizar" | "reactivar";

interface CentroVotoOperativoProps {
  centro: CentroAcopio;
  modo: ModoOperativo;
  compact?: boolean;
}

function actualizarPropuesta(
  data: CentrosResponse | undefined,
  centroId: string,
  propuesta: PropuestaOperativoCentro | null,
  modo: ModoOperativo,
): CentrosResponse | undefined {
  if (!data) return data;
  const key = modo === "finalizar" ? "propuesta_finalizar" : "propuesta_reactivar";
  return {
    centros: data.centros.map((c) =>
      c.id === centroId ? { ...c, [key]: propuesta } : c,
    ),
  };
}

export default function CentroVotoOperativo({
  centro,
  modo,
  compact = false,
}: CentroVotoOperativoProps) {
  const { centrosKey, revalidateCentros } = useZonaContext();
  const [procesando, setProcesando] = useState(false);
  const [segundos, setSegundos] = useState(0);

  const propuestaRaw =
    modo === "finalizar" ? centro.propuesta_finalizar : centro.propuesta_reactivar;
  const propuesta = propuestaActiva(propuestaRaw) ? propuestaRaw! : null;

  const minVotos = modo === "finalizar" ? MIN_VOTOS_FINALIZAR : MIN_VOTOS_REACTIVAR;
  const apiBase =
    modo === "finalizar"
      ? "/api/centros/propuesta-finalizar"
      : "/api/centros/propuesta-reactivar";

  useEffect(() => {
    if (!propuesta) {
      setSegundos(0);
      return;
    }
    const tick = () => setSegundos(segundosRestantes(propuesta.expira_en));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [propuesta]);

  useEffect(() => {
    if (!propuesta || segundos > 0) return;
    void mutate(centrosKey);
  }, [propuesta, segundos]);

  async function iniciar() {
    if (procesando) return;
    const msg =
      modo === "finalizar"
        ? "¿Proponer que este lugar quede finalizado / no disponible? Saldrá a votación comunitaria (24 h, mín. 100 votos)."
        : "¿Proponer reactivar este lugar? Votación 5 min, mín. 5 votos.";
    if (!window.confirm(msg)) return;

    const { continuar, esTestigo } = await resolverVotoPresencial(centro);
    if (!continuar) return;

    setProcesando(true);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centro_id: centro.id,
          es_testigo_presencial: esTestigo,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo iniciar la votación.");
      }

      const body = (await res.json()) as { propuesta: PropuestaOperativoCentro };
      await mutate(
        centrosKey,
        (actual: CentrosResponse | undefined) =>
          actualizarPropuesta(actual, centro.id, body.propuesta, modo),
        { revalidate: true },
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Error al proponer.");
    } finally {
      setProcesando(false);
    }
  }

  async function votar(voto: "si" | "no") {
    if (procesando || !propuesta || segundos <= 0) return;

    const { continuar, esTestigo } = await resolverVotoPresencial(centro);
    if (!continuar) return;

    setProcesando(true);
    try {
      const res = await fetch(`${apiBase}/votar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propuesta_id: propuesta.id,
          voto,
          es_testigo_presencial: esTestigo,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo registrar el voto.");
      }

      const body = (await res.json()) as { propuesta: PropuestaOperativoCentro };
      await mutate(
        centrosKey,
        (actual: CentrosResponse | undefined) =>
          actualizarPropuesta(actual, centro.id, body.propuesta, modo),
        { revalidate: true },
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Error al votar.");
    } finally {
      setProcesando(false);
    }
  }

  const btnClass = compact
    ? "centro-popup-btn rounded-md px-2 py-1.5 text-[10px] font-bold disabled:opacity-50"
    : "rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50";

  const cuenta =
    modo === "finalizar"
      ? formatoCuentaRegresivaLarga(segundos)
      : formatoCuentaRegresiva(segundos);

  if (propuesta && segundos > 0) {
    const titulo =
      modo === "finalizar"
        ? "¿Finalizar / no disponible?"
        : "¿Reactivar lugar?";
    const color =
      modo === "finalizar"
        ? "border-slate-400 bg-slate-100 text-slate-900"
        : "border-emerald-300 bg-emerald-50 text-emerald-900";

    return (
      <div className={`rounded-lg border p-2 ${compact ? "text-[10px]" : "text-xs"} ${color}`}>
        <p className="font-bold">{titulo}</p>
        <p className="mt-0.5 font-mono">⏱ {cuenta}</p>
        <p className="mt-0.5">
          Sí {propuesta.votos_si} · No {propuesta.votos_no} · {propuesta.votantes}/{minVotos}{" "}
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

  const label =
    modo === "finalizar"
      ? "Marcar finalizado / no disponible"
      : "Reactivar lugar";
  const hint =
    modo === "finalizar" ? textoReglasFinalizar() : textoReglasReactivar();
  const btnStyle =
    modo === "finalizar"
      ? compact
        ? "border-slate-400 bg-slate-100 text-slate-800"
        : "border-slate-500 bg-slate-100 text-slate-800"
      : compact
        ? "border-emerald-400 bg-emerald-950/30 text-emerald-200"
        : "border-emerald-600 bg-emerald-950/40 text-emerald-200";

  return (
    <button
      type="button"
      disabled={procesando}
      onClick={() => void iniciar()}
      title={hint}
      className={
        compact
          ? `centro-popup-btn w-full rounded-md border px-2.5 py-2 text-[10px] font-bold ${btnStyle}`
          : `w-full rounded-lg border px-3 py-2 text-xs font-semibold ${btnStyle}`
      }
    >
      {label}
    </button>
  );
}

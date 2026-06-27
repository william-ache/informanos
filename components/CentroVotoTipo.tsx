"use client";

import { useEffect, useState } from "react";
import { mutate } from "swr";
import { calcularDistanciaMetros } from "@/lib/geo";
import { datosExtendidosPermitidos } from "@/lib/privacidad";
import {
  formatoCuentaRegresiva,
  propuestaActiva,
  segundosRestantes,
} from "@/lib/propuesta-tipo";
import { colorTipoLugar, etiquetaTipoLugar } from "@/lib/tipo-lugar";
import type {
  CentroAcopio,
  PropuestaTipoLugar,
  TipoLugarVotable,
} from "@/types/database";

const GEOCERCA_METROS = 500;
const CENTROS_KEY = "/api/centros";

interface CentrosResponse {
  centros: CentroAcopio[];
}

const TIPOS: { value: TipoLugarVotable; label: string }[] = [
  { value: "donacion", label: "Donación" },
  { value: "urgencia", label: "Urgencia" },
  { value: "peligro", label: "Peligro" },
];

function obtenerUbicacion(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Tu navegador no soporta geolocalización."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

async function resolverVoto(
  centro: CentroAcopio,
): Promise<{ continuar: boolean; esTestigo: boolean }> {
  if (datosExtendidosPermitidos()) {
    try {
      const pos = await obtenerUbicacion();
      const distancia = calcularDistanciaMetros(
        pos.coords.latitude,
        pos.coords.longitude,
        centro.latitud,
        centro.longitud,
      );

      if (distancia !== null && distancia <= GEOCERCA_METROS) {
        return { continuar: true, esTestigo: true };
      }

      if (distancia !== null && distancia > GEOCERCA_METROS) {
        const continuar = window.confirm(
          `Estás a ~${distancia} m. ¿Confirmas información verídica de primera mano?`,
        );
        return { continuar, esTestigo: false };
      }

      const continuar = window.confirm(
        "No pudimos calcular tu distancia. ¿Confirmas que tu información es verídica?",
      );
      return { continuar, esTestigo: false };
    } catch {
      const continuar = window.confirm(
        "¿Confirmas que tu información es verídica? (Sin ubicación, voto normal.)",
      );
      return { continuar, esTestigo: false };
    }
  }

  const continuar = window.confirm("¿Confirmas que tu información es verídica?");
  return { continuar, esTestigo: false };
}

function actualizarPropuestaEnCentros(
  data: CentrosResponse | undefined,
  centroId: string,
  propuesta: PropuestaTipoLugar | null,
): CentrosResponse | undefined {
  if (!data) return data;

  return {
    centros: data.centros.map((c) =>
      c.id === centroId ? { ...c, propuesta_tipo: propuesta } : c,
    ),
  };
}

interface CentroVotoTipoProps {
  centro: CentroAcopio;
  compact?: boolean;
}

export default function CentroVotoTipo({ centro, compact = false }: CentroVotoTipoProps) {
  const [procesando, setProcesando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const propuesta = propuestaActiva(centro.propuesta_tipo)
    ? centro.propuesta_tipo!
    : null;

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
    void mutate(CENTROS_KEY);
  }, [propuesta, segundos]);

  async function proponer(tipo: TipoLugarVotable) {
    if (procesando || centro.tipo_lugar === tipo) return;

    const { continuar, esTestigo } = await resolverVoto(centro);
    if (!continuar) return;

    setProcesando(true);
    try {
      const res = await fetch("/api/centros/propuesta-tipo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centro_id: centro.id,
          tipo_propuesto: tipo,
          es_testigo_presencial: esTestigo,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo iniciar la votación.");
      }

      const body = (await res.json()) as { propuesta: PropuestaTipoLugar };
      await mutate(
        CENTROS_KEY,
        (actual: CentrosResponse | undefined) =>
          actualizarPropuestaEnCentros(actual, centro.id, body.propuesta),
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

    const { continuar, esTestigo } = await resolverVoto(centro);
    if (!continuar) return;

    setProcesando(true);
    try {
      const res = await fetch("/api/centros/propuesta-tipo/votar", {
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

      const body = (await res.json()) as { propuesta: PropuestaTipoLugar };
      await mutate(
        CENTROS_KEY,
        (actual: CentrosResponse | undefined) =>
          actualizarPropuestaEnCentros(actual, centro.id, body.propuesta),
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

  if (propuesta && segundos > 0) {
    return (
      <div
        className={`rounded-lg border border-violet-300 bg-violet-50 p-2 ${compact ? "text-[10px]" : "text-xs"}`}
      >
        <p className="font-bold text-violet-900">
          ¿Es {etiquetaTipoLugar(propuesta.tipo_propuesto).toLowerCase()}?
        </p>
        <p className="mt-0.5 font-mono text-violet-700">
          ⏱ {formatoCuentaRegresiva(segundos)}
        </p>
        <p className="mt-0.5 text-violet-800">
          Sí {propuesta.votos_si} · No {propuesta.votos_no}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={procesando}
            onClick={() => votar("si")}
            className={`${btnClass} bg-emerald-600 text-white`}
          >
            👍 Sí
          </button>
          <button
            type="button"
            disabled={procesando}
            onClick={() => votar("no")}
            className={`${btnClass} bg-slate-600 text-white`}
          >
            👎 No
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "text-[10px]" : "text-xs"}>
      <p className={`font-semibold ${compact ? "text-slate-700" : "text-slate-300"}`}>
        Marcar como…
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {TIPOS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            disabled={procesando || centro.tipo_lugar === value}
            onClick={() => proponer(value)}
            className={`${btnClass} text-white`}
            style={{
              backgroundColor:
                centro.tipo_lugar === value
                  ? "#94a3b8"
                  : colorTipoLugar(value),
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-1 text-slate-500">Votación 3 min · gana mayoría</p>
    </div>
  );
}

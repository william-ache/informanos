"use client";

import { useEffect, useState } from "react";
import { mutate } from "swr";
import ModalPortal from "@/components/ModalPortal";
import { calcularDistanciaMetros } from "@/lib/geo";
import { datosExtendidosPermitidos } from "@/lib/privacidad";
import {
  formatoCuentaRegresiva,
  MIN_VOTOS_PROPUESTA,
  propuestaActiva,
  segundosRestantes,
  textoReglasVotacion,
} from "@/lib/propuesta-tipo";
import { colorTipoLugar, etiquetaTipoLugar, TIPO_LUGAR_OPCIONES } from "@/lib/tipo-lugar";
import { useZonaContext } from "@/lib/zona-context";
import type {
  CentroAcopio,
  PropuestaTipoLugar,
  TipoLugar,
} from "@/types/database";

const GEOCERCA_METROS = 500;

interface CentrosResponse {
  centros: CentroAcopio[];
}

const TIPOS = TIPO_LUGAR_OPCIONES.map(({ value, label }) => ({ value, label }));

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
  const { centrosKey, revalidateCentros } = useZonaContext();
  const [procesando, setProcesando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [modalAbierto, setModalAbierto] = useState(false);
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
    void mutate(centrosKey);
  }, [propuesta, segundos]);

  async function proponer(tipo: TipoLugar) {
    if (procesando || centro.tipo_lugar === tipo) return;

    const { continuar, esTestigo } = await resolverVoto(centro);
    if (!continuar) return;

    setProcesando(true);
    setModalAbierto(false);
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
        centrosKey,
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
        centrosKey,
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

  const modalOpciones = (
    <ModalPortal open={modalAbierto}>
      <div
        className="fixed inset-0 z-[10000] flex items-end bg-black/60 sm:items-center sm:justify-center sm:p-4"
        onClick={() => setModalAbierto(false)}
      >
        <div
          className="w-full max-w-sm rounded-t-2xl bg-white p-5 pb-safe text-slate-900 shadow-2xl sm:rounded-2xl sm:pb-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 sm:hidden" />
          <h3 className="text-base font-bold">Marcar lugar como…</h3>
          <p className="mt-1 text-sm text-slate-500">
            {centro.nombre} · {textoReglasVotacion()}
          </p>
          <div className="mt-4 space-y-2">
            {TIPOS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                disabled={procesando || centro.tipo_lugar === value}
                onClick={() => void proponer(value)}
                className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-white disabled:opacity-40"
                style={{
                  backgroundColor:
                    centro.tipo_lugar === value
                      ? "#94a3b8"
                      : colorTipoLugar(value),
                }}
              >
                {label}
                {centro.tipo_lugar === value && (
                  <span className="ml-2 text-xs font-normal opacity-90">
                    (tipo actual)
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setModalAbierto(false)}
            className="mt-4 w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700"
          >
            Cancelar
          </button>
        </div>
      </div>
    </ModalPortal>
  );

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
          Sí {propuesta.votos_si} · No {propuesta.votos_no} · {propuesta.votantes}/
          {MIN_VOTOS_PROPUESTA} votantes
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
    <>
      <button
        type="button"
        disabled={procesando}
        onClick={() => setModalAbierto(true)}
        className={
          compact
            ? "centro-popup-btn w-full rounded-md border border-violet-300 bg-violet-50 px-2.5 py-2 text-[10px] font-bold text-violet-900"
            : "w-full rounded-lg border border-violet-800/50 bg-violet-950/30 px-3 py-2 text-xs font-semibold text-violet-200"
        }
      >
        Marcar lugar como…
      </button>
      {modalOpciones}
    </>
  );
}

"use client";

import { useState } from "react";
import { mutate } from "swr";
import { datosExtendidosPermitidos } from "@/lib/privacidad";
import { calcularDistanciaMetros } from "@/lib/geo";
import { formatFechaHumana } from "@/lib/formatFecha";
import type { CentroAcopio, Necesidad, VerificarAccion } from "@/types/database";

const GEOCERCA_METROS = 500;

interface CentrosResponse {
  centros: CentroAcopio[];
}

interface NecesidadVotosProps {
  centro: CentroAcopio;
  necesidad: Necesidad;
}

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

function aplicarVotoOptimista(
  data: CentrosResponse | undefined,
  centroId: string,
  necesidadId: string,
  accion: VerificarAccion,
  peso: number,
): CentrosResponse | undefined {
  if (!data) return data;

  return {
    centros: data.centros.map((centro) => {
      if (centro.id !== centroId) return centro;

      return {
        ...centro,
        necesidades: (centro.necesidades ?? []).map((nec) => {
          if (nec.id !== necesidadId) return nec;

          if (accion === "reportar_agotado") {
            const reportes = nec.reportes_agotado + peso;
            return {
              ...nec,
              reportes_agotado: reportes,
              estado: reportes >= 3 ? "agotado" : nec.estado,
            };
          }

          return {
            ...nec,
            reportes_confirmados: nec.reportes_confirmados + peso,
          };
        }),
      };
    }),
  };
}

function reemplazarNecesidad(
  data: CentrosResponse | undefined,
  centroId: string,
  actualizada: Necesidad,
): CentrosResponse | undefined {
  if (!data) return data;

  return {
    centros: data.centros.map((centro) => {
      if (centro.id !== centroId) return centro;

      return {
        ...centro,
        necesidades: (centro.necesidades ?? []).map((nec) =>
          nec.id === actualizada.id ? actualizada : nec,
        ),
      };
    }),
  };
}

export default function NecesidadVotos({ centro, necesidad }: NecesidadVotosProps) {
  const [votando, setVotando] = useState(false);

  async function verificar(accion: VerificarAccion) {
    if (votando) return;

    setVotando(true);

    try {
      let esTestigo = false;

      if (datosExtendidosPermitidos()) {
        const pos = await obtenerUbicacion();
        const distancia = calcularDistanciaMetros(
          pos.coords.latitude,
          pos.coords.longitude,
          centro.latitud,
          centro.longitud,
        );

        esTestigo = distancia !== null && distancia <= GEOCERCA_METROS;

        if (distancia !== null && distancia > GEOCERCA_METROS) {
          const acepta = window.confirm(
            `Parece que estás a ${distancia} metros de este centro. Para evitar desinformación, ¿confirmas que tienes información verídica y de primera mano sobre este lugar?`,
          );
          if (!acepta) return;
          esTestigo = false;
        } else if (distancia === null) {
          const acepta = window.confirm(
            "No pudimos calcular tu distancia al centro. ¿Confirmas que tu información es verídica y de primera mano?",
          );
          if (!acepta) return;
          esTestigo = false;
        }
      } else {
        const acepta = window.confirm(
          "¿Confirmas que tu información es verídica? (Sin ubicación, tu voto cuenta con peso normal.)",
        );
        if (!acepta) return;
      }

      const peso = esTestigo ? 2 : 1;

      await mutate(
        "/api/centros",
        async (actual: CentrosResponse | undefined) => {
          const res = await fetch("/api/necesidades/verificar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: necesidad.id,
              accion,
              es_testigo_presencial: esTestigo,
            }),
          });

          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as { error?: string } | null;
            throw new Error(body?.error ?? "No se pudo registrar el voto.");
          }

          const body = (await res.json()) as { necesidad: Necesidad };
          return reemplazarNecesidad(actual, centro.id, body.necesidad);
        },
        {
          optimisticData: (actual) =>
            aplicarVotoOptimista(actual, centro.id, necesidad.id, accion, peso),
          rollbackOnError: true,
          revalidate: false,
        },
      );
    } catch (err) {
      const msg =
        err instanceof GeolocationPositionError
          ? "Activa la ubicación del dispositivo para verificar insumos."
          : err instanceof Error
            ? err.message
            : "Error al verificar.";
      window.alert(msg);
    } finally {
      setVotando(false);
    }
  }

  const agotado = necesidad.estado === "agotado";

  return (
    <li className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-2.5 text-sm text-slate-300">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
        <span
          className={
            necesidad.urgencia === "alta"
              ? "font-bold text-red-400"
              : necesidad.urgencia === "media"
                ? "text-amber-400"
                : "text-emerald-400"
          }
        >
          {necesidad.urgencia.toUpperCase()}
        </span>
        {agotado && (
          <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-300">
            Agotado
          </span>
        )}
        <span>
          · {necesidad.elemento} ({necesidad.cantidad_solicitada})
        </span>
      </div>

      <span className="mt-1 block text-xs text-slate-500">
        {formatFechaHumana(necesidad.actualizado_en)}
        {(necesidad.reportes_confirmados > 0 || necesidad.reportes_agotado > 0) && (
          <span className="ml-2 text-slate-600">
            ✓{necesidad.reportes_confirmados} · ⚠{necesidad.reportes_agotado}
          </span>
        )}
      </span>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={votando}
          onClick={() => verificar("confirmar_disponible")}
          className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-2.5 py-1.5 text-xs font-medium text-emerald-300 active:bg-emerald-900/50 disabled:opacity-50"
        >
          👍 Confirmar que hay
        </button>
        <button
          type="button"
          disabled={votando || agotado}
          onClick={() => verificar("reportar_agotado")}
          className="rounded-lg border border-amber-800/60 bg-amber-950/40 px-2.5 py-1.5 text-xs font-medium text-amber-300 active:bg-amber-900/50 disabled:opacity-50"
        >
          ⚠️ Reportar Agotado
        </button>
      </div>
    </li>
  );
}

"use client";

import { abrirEnGoogleMaps } from "@/lib/google-maps-url";
import { formatFechaHumana } from "@/lib/formatFecha";
import {
  colorTipoLugar,
  donacionVigente,
  etiquetaTipoLugar,
} from "@/lib/tipo-lugar";
import type { CentroAcopio } from "@/types/database";

interface DonacionesTabProps {
  centros: CentroAcopio[];
  onAgregarDonacion: () => void;
  onVerEnMapa: (centroId: string) => void;
}

export default function DonacionesTab({
  centros,
  onAgregarDonacion,
  onVerEnMapa,
}: DonacionesTabProps) {
  const donaciones = centros
    .filter((c) => c.tipo_lugar === "donacion")
    .sort((a, b) => {
      if (!a.donacion_limite && !b.donacion_limite) return 0;
      if (!a.donacion_limite) return 1;
      if (!b.donacion_limite) return -1;
      return a.donacion_limite.localeCompare(b.donacion_limite);
    });

  const vigentes = donaciones.filter(donacionVigente);

  return (
    <div className="flex h-full flex-col bg-slate-900">
      <div className="shrink-0 border-b border-slate-800 p-4 pt-3">
        <p className="text-sm text-slate-400">
          Puntos de recolección en el mapa{" "}
          <span className="font-semibold text-emerald-400">verde</span>.
        </p>
        <button
          type="button"
          onClick={onAgregarDonacion}
          className="mt-4 w-full rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white active:bg-emerald-500"
        >
          + Registrar zona de donación
        </button>
        <p className="mt-2 text-center text-xs text-slate-500">
          {vigentes.length} activa{vigentes.length === 1 ? "" : "s"} ·{" "}
          {donaciones.length} total
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 pt-3">
        {donaciones.length === 0 ? (
          <p className="text-center text-sm text-slate-500">
            Aún no hay zonas de donación registradas.
          </p>
        ) : (
          <ul className="space-y-3">
            {donaciones.map((centro) => {
              const vigente = donacionVigente(centro);
              return (
                <li
                  key={centro.id}
                  className={`rounded-xl border p-4 ${
                    vigente
                      ? "border-emerald-900/60 bg-emerald-950/20"
                      : "border-slate-800 bg-slate-950/40 opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold leading-snug">{centro.nombre}</p>
                      <p className="text-xs text-slate-400">{centro.municipio}</p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: colorTipoLugar("donacion") }}
                    >
                      {etiquetaTipoLugar("donacion").split(" ")[2]}
                    </span>
                  </div>

                  {centro.donacion_necesita && (
                    <p className="mt-2 text-sm">
                      <span className="font-semibold text-emerald-300">
                        Recogen / necesitan:{" "}
                      </span>
                      {centro.donacion_necesita}
                    </p>
                  )}

                  {centro.donacion_destino && (
                    <p className="mt-1.5 text-sm text-slate-300">
                      <span className="font-semibold">Destino: </span>
                      {centro.donacion_destino}
                    </p>
                  )}

                  {centro.donacion_limite && (
                    <p
                      className={`mt-1.5 text-xs ${
                        vigente ? "text-amber-300" : "text-slate-500 line-through"
                      }`}
                    >
                      Límite: {formatFechaHumana(centro.donacion_limite)}
                    </p>
                  )}

                  {centro.donacion_transporte && (
                    <p className="mt-1.5 text-xs font-semibold text-orange-300">
                      Solicita transporte
                    </p>
                  )}

                  {centro.contacto && (
                    <p className="mt-2 text-xs">
                      {centro.contacto.split(",").map((tel, i) => {
                        const limpio = tel.trim();
                        if (!limpio) return null;
                        return (
                          <a
                            key={i}
                            href={`tel:${limpio.replace(/\s/g, "")}`}
                            className="mr-2 text-blue-400 underline"
                          >
                            {limpio}
                          </a>
                        );
                      })}
                    </p>
                  )}

                  {centro.direccion && (
                    <p className="mt-1 text-xs text-slate-500">{centro.direccion}</p>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onVerEnMapa(centro.id)}
                      className="rounded-lg border border-slate-700 py-2 text-xs font-semibold text-slate-200"
                    >
                      Ver en mapa
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        abrirEnGoogleMaps(centro.latitud, centro.longitud)
                      }
                      className="rounded-lg bg-blue-600 py-2 text-xs font-bold text-white"
                    >
                      Como llegar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

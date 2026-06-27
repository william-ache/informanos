"use client";

import dynamic from "next/dynamic";
import type { CentroAcopio } from "@/types/database";
import type { FiltroPoblacion as FiltroPoblacionState } from "@/lib/poblacion";
import { resumenPoblacion, tienePoblacion } from "@/lib/poblacion";
import type { FiltroTipoLugar } from "@/lib/tipo-lugar";
import { colorTipoLugar, etiquetaTipoLugar } from "@/lib/tipo-lugar";

const CentroBuscador = dynamic(() => import("@/components/CentroBuscador"), {
  ssr: false,
});

const FiltroPoblacion = dynamic(() => import("@/components/FiltroPoblacion"), {
  ssr: false,
});

const FiltroTipoLugar = dynamic(() => import("@/components/FiltroTipoLugar"), {
  ssr: false,
});

const NecesidadVotos = dynamic(() => import("@/components/NecesidadVotos"), {
  ssr: false,
});

const NecesidadPropuestaVoto = dynamic(
  () => import("@/components/NecesidadPropuestaVoto"),
  { ssr: false },
);

const CentroVotoTipo = dynamic(() => import("@/components/CentroVotoTipo"), {
  ssr: false,
});

interface CentrosListProps {
  compact?: boolean;
  fillHeight?: boolean;
  centros: CentroAcopio[];
  centrosFiltrados: CentroAcopio[];
  centroActivoId: string | null;
  onSeleccionarCentro: (id: string | null) => void;
  onQueryChange: (query: string) => void;
  filtroPoblacion: FiltroPoblacionState;
  onFiltroPoblacionChange: (value: FiltroPoblacionState) => void;
  filtroTipoLugar: FiltroTipoLugar;
  onFiltroTipoLugarChange: (value: FiltroTipoLugar) => void;
  isLoading: boolean;
  errorMsg: string | null;
  onReportarCentro: (centro: CentroAcopio) => void;
}

export default function CentrosList({
  compact = false,
  fillHeight = false,
  centros,
  centrosFiltrados,
  centroActivoId,
  onSeleccionarCentro,
  onQueryChange,
  filtroPoblacion,
  onFiltroPoblacionChange,
  filtroTipoLugar,
  onFiltroTipoLugarChange,
  isLoading,
  errorMsg,
  onReportarCentro,
}: CentrosListProps) {
  const filtersWrap = compact
    ? "space-y-3 px-4 pt-3"
    : fillHeight
      ? "shrink-0 space-y-3 border-b border-slate-800 p-4 pb-3"
      : "space-y-3 border-b border-slate-800 p-4";

  const listWrap = fillHeight
    ? "min-h-0 flex-1 overflow-y-auto p-4 pt-2"
    : compact
      ? "flex-1 overflow-y-auto px-4 py-3"
      : "min-h-0 flex-1 overflow-y-auto p-4";

  const content = (
    <>
      <div className={filtersWrap}>
        <CentroBuscador
          centros={centros}
          activoId={centroActivoId}
          onSeleccionar={onSeleccionarCentro}
          onQueryChange={onQueryChange}
          placeholder="Buscar por nombre o municipio…"
        />
        <FiltroPoblacion value={filtroPoblacion} onChange={onFiltroPoblacionChange} />
        <FiltroTipoLugar value={filtroTipoLugar} onChange={onFiltroTipoLugarChange} />
      </div>

      <div className={listWrap}>
        {isLoading && <p className="text-sm text-slate-400">Cargando centros…</p>}
        {errorMsg && (
          <p className="mb-3 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
            {errorMsg}
          </p>
        )}
        {!isLoading && centrosFiltrados.length === 0 && (
          <p className="text-sm text-slate-400">No hay centros en este filtro.</p>
        )}

        <ul className="space-y-3 pb-4">
          {centrosFiltrados.map((centro) => {
            const urgenciaAlta = (centro.necesidades ?? []).some(
              (n) => n.urgencia === "alta",
            );

            return (
              <li
                key={centro.id}
                onClick={() => onSeleccionarCentro(centro.id)}
                className={`cursor-pointer rounded-xl border p-3.5 active:bg-slate-900 ${
                  centroActivoId === centro.id
                    ? "border-red-500 bg-red-950/20"
                    : "border-slate-800 bg-slate-950/60"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {urgenciaAlta && (
                    <span className="mt-1.5 h-3 w-3 shrink-0 animate-pulse rounded-full bg-red-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <span
                      className="mb-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
                      style={{
                        backgroundColor: colorTipoLugar(centro.tipo_lugar ?? "acopio"),
                      }}
                    >
                      {etiquetaTipoLugar(centro.tipo_lugar ?? "acopio").split(" ")[0]}
                    </span>
                    <p className="font-semibold leading-snug">{centro.nombre}</p>
                    <p className="text-sm text-slate-400">{centro.municipio}</p>
                    {tienePoblacion(centro) && (
                      <p className="mt-1 text-xs text-slate-500">
                        👥 {resumenPoblacion(centro)}
                      </p>
                    )}
                    {centro.contacto && (
                      <a
                        href={`tel:${centro.contacto.replace(/\s/g, "")}`}
                        className="mt-1 inline-block text-sm text-blue-400 underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {centro.contacto}
                      </a>
                    )}
                    {(centro.necesidades ?? []).length > 0 && (
                      <ul
                        className="mt-2 space-y-2 border-t border-slate-800 pt-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {(centro.necesidades ?? []).map((nec) => (
                          <NecesidadVotos
                            key={nec.id}
                            centro={centro}
                            necesidad={nec}
                          />
                        ))}
                      </ul>
                    )}
                    {(centro.propuestas_necesidad_nuevas ?? []).length > 0 && (
                      <ul
                        className="mt-2 space-y-2 border-t border-slate-800 pt-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {(centro.propuestas_necesidad_nuevas ?? []).map((prop) => (
                          <li
                            key={prop.id}
                            className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-2.5"
                          >
                            <NecesidadPropuestaVoto
                              centro={centro}
                              propuesta={prop}
                              compact
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                    {(centro.tipo_lugar === "acopio" ||
                      centro.tipo_lugar === "urgencia" ||
                      !centro.tipo_lugar) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReportarCentro(centro);
                      }}
                      className="mt-3 w-full rounded-lg border border-red-800/60 py-2 text-xs font-semibold text-red-300 active:bg-red-950/40"
                    >
                      + Reportar necesidad
                    </button>
                    )}
                    <div
                      className="mt-3 border-t border-slate-800 pt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CentroVotoTipo centro={centro} />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );

  if (fillHeight) {
    return <div className="flex min-h-0 flex-1 flex-col">{content}</div>;
  }

  return content;
}

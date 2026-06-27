"use client";

import { memo, useEffect, useRef } from "react";
import { Marker, Popup } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import { abrirEnGoogleMaps } from "@/lib/google-maps-url";
import { resumenPoblacion, tienePoblacion } from "@/lib/poblacion";
import type { CentroAcopio } from "@/types/database";

function urgenciaClass(urgencia: string) {
  if (urgencia === "alta") return "font-semibold text-red-600";
  if (urgencia === "media") return "text-amber-600";
  return "text-emerald-600";
}

interface CentroMarkersProps {
  centros: CentroAcopio[];
  centroActivoId?: string | null;
  onReportar?: (centro: CentroAcopio) => void;
  onReportarLugar?: (centro: CentroAcopio) => void;
  onVerLista?: (centro: CentroAcopio) => void;
}

function CentroMarkerItem({
  centro,
  activo,
  abrirPopup,
  onReportar,
  onReportarLugar,
  onVerLista,
}: {
  centro: CentroAcopio;
  activo: boolean;
  abrirPopup?: boolean;
  onReportar?: (centro: CentroAcopio) => void;
  onReportarLugar?: (centro: CentroAcopio) => void;
  onVerLista?: (centro: CentroAcopio) => void;
}) {
  const markerRef = useRef<LeafletMarker>(null);

  useEffect(() => {
    if (!abrirPopup) return;
    const id = window.setTimeout(() => {
      markerRef.current?.openPopup();
    }, 750);
    return () => window.clearTimeout(id);
  }, [abrirPopup]);

  return (
    <Marker
      ref={markerRef}
      position={[centro.latitud, centro.longitud]}
      eventHandlers={{
        click: () => markerRef.current?.openPopup(),
      }}
      opacity={activo ? 1 : 0.45}
    >
      <Popup
        maxWidth={240}
        offset={[0, -6]}
        autoPan={false}
        closeOnClick={false}
        autoClose={false}
        className="centro-popup"
      >
        <div className="centro-popup-inner w-[min(230px,calc(100vw-3rem))] px-0.5 pb-0.5 text-slate-900">
          <div className="pr-6">
            <p className="line-clamp-2 text-[13px] font-bold leading-snug">
              {centro.nombre}
            </p>
            <p className="text-[11px] text-slate-500">{centro.municipio}</p>
          </div>

          {tienePoblacion(centro) && (
            <p className="mt-0.5 truncate text-[10px] text-slate-500">
              👥 {resumenPoblacion(centro)}
            </p>
          )}

          {centro.contacto && (
            <p className="mt-0.5 truncate text-[10px]">
              {centro.contacto.split(",")[0]?.trim() && (
                <a
                  href={`tel:${centro.contacto.split(",")[0].trim().replace(/\s/g, "")}`}
                  className="centro-popup-link text-blue-600 underline"
                >
                  {centro.contacto.split(",")[0].trim()}
                </a>
              )}
            </p>
          )}

          <div className="centro-popup-scroll mt-2 border-t border-slate-200 pt-2">
            {centro.necesidades && centro.necesidades.length > 0 ? (
              <ul className="space-y-1 text-[10px] leading-snug">
                {centro.necesidades.map((nec) => (
                  <li key={nec.id} className="truncate">
                    <span className={urgenciaClass(nec.urgencia)}>
                      {nec.urgencia.slice(0, 1).toUpperCase()}
                    </span>
                    {" · "}
                    {nec.elemento} ({nec.cantidad_solicitada})
                    {nec.estado === "agotado" && (
                      <span className="text-slate-400"> · agotado</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[10px] text-slate-500">Sin necesidades.</p>
            )}
          </div>

          <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => abrirEnGoogleMaps(centro.latitud, centro.longitud)}
                className="centro-popup-btn rounded-md bg-blue-600 px-2.5 py-2 text-[10px] font-bold text-white"
              >
                Como llegar
              </button>
              {onReportar && (
                <button
                  type="button"
                  onClick={() => onReportar(centro)}
                  className="centro-popup-btn rounded-md bg-red-600 px-2.5 py-2 text-[10px] font-bold text-white"
                >
                  Necesidad
                </button>
              )}
            </div>
            {onReportarLugar && (
              <button
                type="button"
                onClick={() => onReportarLugar(centro)}
                className="centro-popup-btn w-full rounded-md border border-amber-400 bg-amber-50 px-2.5 py-2 text-[10px] font-bold text-amber-900"
              >
                Reportar
              </button>
            )}
            {onVerLista && (
              <button
                type="button"
                onClick={() => onVerLista(centro)}
                className="centro-popup-btn w-full rounded-md border border-slate-300 bg-slate-50 px-2.5 py-2 text-[10px] font-semibold text-slate-700"
              >
                Ver detalle y votos
              </button>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

function CentroMarkersInner({
  centros,
  centroActivoId,
  onReportar,
  onReportarLugar,
  onVerLista,
}: CentroMarkersProps) {
  return (
    <>
      {centros.map((centro) => (
        <CentroMarkerItem
          key={centro.id}
          centro={centro}
          activo={!centroActivoId || centro.id === centroActivoId}
          abrirPopup={centroActivoId === centro.id}
          onReportar={onReportar}
          onReportarLugar={onReportarLugar}
          onVerLista={onVerLista}
        />
      ))}
    </>
  );
}

const CentroMarkers = memo(CentroMarkersInner);
export default CentroMarkers;

"use client";

import { memo, useEffect, useRef } from "react";
import { Marker, Popup } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import { formatFechaHumana } from "@/lib/formatFecha";
import { abrirEnGoogleMaps } from "@/lib/google-maps-url";
import { resumenPoblacion, tienePoblacion } from "@/lib/poblacion";
import type { CentroAcopio } from "@/types/database";

function urgenciaClass(urgencia: string) {
  if (urgencia === "alta") return "font-bold text-red-600";
  if (urgencia === "media") return "text-amber-600";
  return "text-emerald-600";
}

interface CentroMarkersProps {
  centros: CentroAcopio[];
  centroActivoId?: string | null;
  onReportar?: (centro: CentroAcopio) => void;
  onVerLista?: (centro: CentroAcopio) => void;
}

function CentroMarkerItem({
  centro,
  activo,
  abrirPopup,
  onReportar,
  onVerLista,
}: {
  centro: CentroAcopio;
  activo: boolean;
  abrirPopup?: boolean;
  onReportar?: (centro: CentroAcopio) => void;
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
      <Popup>
        <div className="min-w-[220px] max-w-[280px] text-slate-900">
          <p className="font-bold leading-tight">{centro.nombre}</p>
          <p className="mt-1 text-sm text-slate-600">{centro.municipio}</p>

          {tienePoblacion(centro) && (
            <p className="mt-1 text-xs text-slate-500">
              👥 {resumenPoblacion(centro)}
            </p>
          )}

          {centro.contacto && (
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
              {centro.contacto.split(",").map((tel) => {
                const limpio = tel.trim();
                if (!limpio) return null;
                return (
                  <a
                    key={limpio}
                    href={`tel:${limpio.replace(/\s/g, "")}`}
                    className="text-blue-600 underline"
                  >
                    {limpio}
                  </a>
                );
              })}
            </div>
          )}

          {centro.necesidades && centro.necesidades.length > 0 ? (
            <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto border-t border-slate-200 pt-2 text-xs">
              {centro.necesidades.map((nec) => (
                <li key={nec.id}>
                  <span className={urgenciaClass(nec.urgencia)}>
                    {nec.urgencia.toUpperCase()}
                  </span>
                  {nec.estado === "agotado" && (
                    <span className="ml-1 text-slate-500">· AGOTADO</span>
                  )}
                  {" · "}
                  {nec.elemento} ({nec.cantidad_solicitada})
                  <span className="mt-0.5 block text-slate-500">
                    {formatFechaHumana(nec.actualizado_en)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              Sin necesidades registradas.
            </p>
          )}

          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={() => abrirEnGoogleMaps(centro.latitud, centro.longitud)}
              className="w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"
            >
              Ver en Google Maps
            </button>
            {onReportar && (
              <button
                type="button"
                onClick={() => onReportar(centro)}
                className="w-full rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white"
              >
                Reportar necesidad aquí
              </button>
            )}
            {onVerLista && (
              <button
                type="button"
                onClick={() => onVerLista(centro)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
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
          onVerLista={onVerLista}
        />
      ))}
    </>
  );
}

const CentroMarkers = memo(CentroMarkersInner);
export default CentroMarkers;

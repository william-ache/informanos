"use client";

import { memo } from "react";
import { Marker, Popup } from "react-leaflet";
import { formatFechaHumana } from "@/lib/formatFecha";
import { abrirEnGoogleMaps } from "@/lib/google-maps-url";
import type { CentroAcopio } from "@/types/database";

function urgenciaClass(urgencia: string) {
  if (urgencia === "alta") return "font-bold text-red-600";
  if (urgencia === "media") return "text-amber-600";
  return "text-emerald-600";
}

interface CentroMarkersProps {
  centros: CentroAcopio[];
  centroActivoId?: string | null;
  onCentroClick?: (centro: CentroAcopio) => void;
}

function CentroMarkersInner({
  centros,
  centroActivoId,
  onCentroClick,
}: CentroMarkersProps) {
  return (
    <>
      {centros.map((centro) => {
        const activo = centro.id === centroActivoId;

        return (
          <Marker
            key={centro.id}
            position={[centro.latitud, centro.longitud]}
            eventHandlers={{
              click: () => onCentroClick?.(centro),
            }}
            opacity={centroActivoId && !activo ? 0.45 : 1}
          >
            <Popup>
              <div className="min-w-[200px] max-w-[260px] text-slate-900">
                <p className="font-bold leading-tight">{centro.nombre}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {centro.municipio}
                  {centro.contacto ? ` · ${centro.contacto}` : ""}
                </p>

                {centro.necesidades && centro.necesidades.length > 0 ? (
                  <ul className="mt-2 space-y-2 border-t border-slate-200 pt-2 text-xs">
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

                <button
                  type="button"
                  onClick={() =>
                    abrirEnGoogleMaps(centro.latitud, centro.longitud)
                  }
                  className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"
                >
                  Ver en Google Maps
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

const CentroMarkers = memo(CentroMarkersInner);
export default CentroMarkers;

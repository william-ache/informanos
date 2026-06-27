"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import { abrirEnGoogleMaps } from "@/lib/google-maps-url";
import { iconoCentro } from "@/lib/leaflet-icons";
import { formatFechaHumana } from "@/lib/formatFecha";
import { resumenPoblacion, tienePoblacion } from "@/lib/poblacion";
import {
  colorTipoLugar,
  etiquetaTipoLugar,
} from "@/lib/tipo-lugar";
import type { CentroAcopio } from "@/types/database";
import CentroVotoTipo from "@/components/CentroVotoTipo";
import CentroEditarModal from "@/components/CentroEditarModal";

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
  onEditarModalChange?: (open: boolean) => void;
}

function CentroMarkerItem({
  centro,
  activo,
  abrirPopup,
  onReportar,
  onReportarLugar,
  onVerLista,
  onEditarModalChange,
}: {
  centro: CentroAcopio;
  activo: boolean;
  abrirPopup?: boolean;
  onReportar?: (centro: CentroAcopio) => void;
  onReportarLugar?: (centro: CentroAcopio) => void;
  onVerLista?: (centro: CentroAcopio) => void;
  onEditarModalChange?: (open: boolean) => void;
}) {
  const markerRef = useRef<LeafletMarker>(null);
  const [editarOpen, setEditarOpen] = useState(false);

  useEffect(() => {
    onEditarModalChange?.(editarOpen);
  }, [editarOpen, onEditarModalChange]);

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
      icon={iconoCentro(centro.tipo_lugar ?? "acopio")}
      eventHandlers={{
        click: () => markerRef.current?.openPopup(),
      }}
      opacity={activo ? 1 : 0.45}
    >
      <Popup
        maxWidth={268}
        offset={[0, -6]}
        autoPan={false}
        closeOnClick={false}
        autoClose
        className="centro-popup"
      >
        <div className="centro-popup-inner w-[min(240px,calc(100vw-3.5rem))] text-slate-900">
          <div className="relative pr-16">
            <button
              type="button"
              onClick={() => setEditarOpen(true)}
              className="centro-popup-edit-btn absolute right-0 top-0 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700"
            >
              Editar
            </button>
            <span
              className="mb-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
              style={{
                backgroundColor: colorTipoLugar(centro.tipo_lugar ?? "acopio"),
              }}
            >
              {etiquetaTipoLugar(centro.tipo_lugar ?? "acopio").split(" ")[0]}
            </span>
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

          {centro.tipo_lugar === "donacion" ? (
            <div className="centro-popup-scroll mt-2 border-t border-slate-200 pt-2 text-[10px] leading-snug">
              {centro.donacion_necesita && (
                <p>
                  <span className="font-semibold text-emerald-700">Recogen: </span>
                  {centro.donacion_necesita}
                </p>
              )}
              {centro.donacion_destino && (
                <p className="mt-1">
                  <span className="font-semibold">Destino: </span>
                  {centro.donacion_destino}
                </p>
              )}
              {centro.donacion_limite && (
                <p className="mt-1 text-amber-700">
                  Hasta: {formatFechaHumana(centro.donacion_limite)}
                </p>
              )}
              {centro.donacion_transporte && (
                <p className="mt-1 font-semibold text-orange-700">
                  Solicita transporte
                </p>
              )}
            </div>
          ) : (
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
          )}

          <div className="centro-popup-scroll mt-2 border-t border-slate-200 pt-2">
            <CentroVotoTipo centro={centro} compact />
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
              {onReportar &&
                (centro.tipo_lugar === "acopio" ||
                  centro.tipo_lugar === "urgencia" ||
                  !centro.tipo_lugar) && (
                <button
                  type="button"
                  onClick={() => onReportar(centro)}
                  className="centro-popup-btn rounded-md bg-red-600 px-2.5 py-2 text-[10px] font-bold text-white"
                >
                  Necesidad
                </button>
              )}
            </div>
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
      <CentroEditarModal
        open={editarOpen}
        centro={centro}
        onClose={() => setEditarOpen(false)}
      />
    </Marker>
  );
}

function CentroMarkersInner({
  centros,
  centroActivoId,
  onReportar,
  onReportarLugar,
  onVerLista,
  onEditarModalChange,
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
          onEditarModalChange={onEditarModalChange}
        />
      ))}
    </>
  );
}

const CentroMarkers = memo(CentroMarkersInner);
export default CentroMarkers;

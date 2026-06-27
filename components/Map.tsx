"use client";

import { memo, useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import CentroMarkers from "@/components/CentroMarkers";
import AraguaBoundary from "@/components/AraguaBoundary";
import type { CentroAcopio, NuevoCentroAcopio } from "@/types/database";
import { MENSAJE_FUERA_ARAGUA, puntoEnAragua } from "@/lib/aragua-boundary";
import { configureLeafletIcons } from "@/lib/leaflet-icons";
import "leaflet/dist/leaflet.css";

const ARAGUA_CENTER: [number, number] = [10.25, -67.45];
const INITIAL_ZOOM = 10;

const emptyForm = {
  nombre: "",
  municipio: "",
  direccion: "",
  contacto: "",
};

interface MapProps {
  centros: CentroAcopio[];
  onRegistrarCentro?: (centro: NuevoCentroAcopio) => void | Promise<void>;
  className?: string;
  active?: boolean;
}

function MapClickHandler({
  active,
  onMapClick,
}: {
  active: boolean;
  onMapClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      if (active) onMapClick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function MapResize({ active }: { active: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!active) return;
    const id = window.requestAnimationFrame(() => {
      map.invalidateSize({ animate: false });
    });
    return () => window.cancelAnimationFrame(id);
  }, [active, map]);

  return null;
}

function MapView({
  centros,
  onRegistrarCentro,
  className = "",
  active = true,
}: MapProps) {
  const [registrarActivo, setRegistrarActivo] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [form, setForm] = useState(emptyForm);
  const [enviando, setEnviando] = useState(false);
  const [alertaZona, setAlertaZona] = useState<string | null>(null);

  useEffect(() => {
    configureLeafletIcons();
  }, []);

  useEffect(() => {
    if (!alertaZona) return;
    const id = window.setTimeout(() => setAlertaZona(null), 5000);
    return () => window.clearTimeout(id);
  }, [alertaZona]);

  function handleMapClick(lat: number, lng: number) {
    if (!puntoEnAragua(lat, lng)) {
      setAlertaZona(MENSAJE_FUERA_ARAGUA);
      return;
    }

    setAlertaZona(null);
    setCoords({ lat, lng });
    setForm(emptyForm);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setCoords(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!coords || !onRegistrarCentro) return;

    if (!puntoEnAragua(coords.lat, coords.lng)) {
      setAlertaZona(MENSAJE_FUERA_ARAGUA);
      cerrarModal();
      return;
    }

    setEnviando(true);
    try {
      await onRegistrarCentro({
        ...form,
        direccion: form.direccion || null,
        contacto: form.contacto || null,
        latitud: coords.lat,
        longitud: coords.lng,
      });
      cerrarModal();
      setRegistrarActivo(false);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={`relative h-full w-full ${className}`}>
      <MapContainer
        center={ARAGUA_CENTER}
        zoom={INITIAL_ZOOM}
        preferCanvas
        className="h-full w-full"
        style={{ minHeight: 0, cursor: registrarActivo ? "crosshair" : "grab" }}
      >
        <TileLayer
          attribution='&copy; OSM'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          updateWhenIdle
          updateWhenZooming={false}
          keepBuffer={4}
        />

        <MapResize active={active} />
        <AraguaBoundary />
        <MapClickHandler active={registrarActivo} onMapClick={handleMapClick} />
        <CentroMarkers centros={centros} />

        {coords && modalAbierto && (
          <Marker position={[coords.lat, coords.lng]} />
        )}
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-14 z-[1000] rounded-lg border border-red-500/50 bg-red-950/85 px-3 py-1.5 text-xs font-semibold text-red-200 shadow lg:top-16">
        Zona activa: Estado Aragua
      </div>

      {alertaZona && (
        <div className="absolute left-3 right-3 top-[4.5rem] z-[1001] rounded-xl border border-amber-500 bg-amber-950/95 px-4 py-3 text-sm font-medium text-amber-100 shadow-lg lg:top-[4.75rem] lg:max-w-md">
          {alertaZona}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setRegistrarActivo((prev) => !prev);
          if (modalAbierto) cerrarModal();
        }}
        className={`absolute right-3 top-3 z-[1000] rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg active:scale-95 lg:top-4 lg:right-4 ${
          registrarActivo ? "bg-red-600" : "bg-blue-700"
        }`}
      >
        {registrarActivo ? "Cancelar" : "+ Centro"}
      </button>

      {registrarActivo && !modalAbierto && (
        <div className="pointer-events-none absolute bottom-4 left-3 right-3 z-[1000] mx-auto max-w-sm rounded-xl bg-black/80 px-4 py-2.5 text-center text-sm text-white lg:bottom-6">
          Toca el mapa dentro de la zona roja (Estado Aragua)
        </div>
      )}

      {modalAbierto && coords && (
        <div
          className="fixed inset-0 z-[1100] flex items-end bg-black/60 lg:items-center lg:justify-center lg:p-4"
          onClick={cerrarModal}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 text-slate-900 shadow-2xl lg:max-w-md lg:rounded-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 lg:hidden" />
            <h2 className="text-lg font-bold">Nuevo centro de acopio</h2>
            <p className="mt-1 text-sm text-slate-500">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </p>

            {(
              [
                ["nombre", "Nombre *", "text"],
                ["municipio", "Municipio *", "text"],
                ["direccion", "Dirección", "text"],
                ["contacto", "Contacto", "tel"],
              ] as const
            ).map(([key, label, type]) => (
              <label key={key} className="mt-3 block text-sm font-medium">
                {label}
                <input
                  type={type}
                  required={key === "nombre" || key === "municipio"}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            ))}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={cerrarModal}
                className="flex-1 rounded-xl border border-slate-300 py-3 text-base font-semibold active:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando || !onRegistrarCentro}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white active:bg-emerald-500 disabled:opacity-50"
              >
                {enviando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default memo(MapView);

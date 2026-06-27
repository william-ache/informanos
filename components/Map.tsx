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
import AgregarLugarSheet from "@/components/AgregarLugarSheet";
import ModalPortal from "@/components/ModalPortal";
import type { CentroAcopio, NuevoCentroAcopio } from "@/types/database";
import { detectarLugar } from "@/lib/geocoding";
import { MENSAJE_FUERA_ARAGUA, puntoEnAragua } from "@/lib/aragua-boundary";
import { parsePoblacionInput } from "@/lib/poblacion";
import { configureLeafletIcons } from "@/lib/leaflet-icons";
import "leaflet/dist/leaflet.css";

const ARAGUA_CENTER: [number, number] = [10.25, -67.45];
const INITIAL_ZOOM = 10;

interface FormState {
  nombre: string;
  municipio: string;
  direccion: string;
  telefonos: string[];
  aproxNinos: string;
  aproxPersonas: string;
  aproxAncianos: string;
  aproxAnimales: string;
}

const emptyForm = (): FormState => ({
  nombre: "",
  municipio: "",
  direccion: "",
  telefonos: [""],
  aproxNinos: "",
  aproxPersonas: "",
  aproxAncianos: "",
  aproxAnimales: "",
});

interface MapProps {
  centros: CentroAcopio[];
  centroActivoId?: string | null;
  onReportarCentro?: (centro: CentroAcopio) => void;
  onVerCentroLista?: (centro: CentroAcopio) => void;
  onRegistrarCentro?: (centro: NuevoCentroAcopio) => void | Promise<void>;
  className?: string;
  active?: boolean;
  hideAgregarButton?: boolean;
  agregarMenuOpen?: boolean;
  onAgregarMenuChange?: (open: boolean) => void;
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

function MapFlyTo({
  lat,
  lng,
  zoom = 14,
}: {
  lat: number;
  lng: number;
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 0.7 });
  }, [lat, lng, zoom, map]);

  return null;
}

function MapView({
  centros,
  centroActivoId,
  onReportarCentro,
  onVerCentroLista,
  onRegistrarCentro,
  className = "",
  active = true,
  hideAgregarButton = false,
  agregarMenuOpen,
  onAgregarMenuChange,
}: MapProps) {
  const [menuInterno, setMenuInterno] = useState(false);
  const menuAgregar = agregarMenuOpen ?? menuInterno;
  const setMenuAgregar = onAgregarMenuChange ?? setMenuInterno;

  const [seleccionMapa, setSeleccionMapa] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [enviando, setEnviando] = useState(false);
  const [cargandoLugar, setCargandoLugar] = useState(false);
  const [alertaZona, setAlertaZona] = useState<string | null>(null);

  useEffect(() => {
    configureLeafletIcons();
  }, []);

  useEffect(() => {
    if (!alertaZona) return;
    const id = window.setTimeout(() => setAlertaZona(null), 5000);
    return () => window.clearTimeout(id);
  }, [alertaZona]);

  async function abrirFormulario(lat: number, lng: number) {
    if (!puntoEnAragua(lat, lng)) {
      setAlertaZona(MENSAJE_FUERA_ARAGUA);
      return;
    }

    setAlertaZona(null);
    setCoords({ lat, lng });
    setForm(emptyForm());
    setModalAbierto(true);
    setSeleccionMapa(false);
    setCargandoLugar(true);

    const detectado = await detectarLugar(lat, lng);
    if (detectado) {
      setForm((prev) => ({
        ...prev,
        nombre: detectado.nombre,
        municipio: detectado.municipio,
        direccion: detectado.direccion,
      }));
    }
    setCargandoLugar(false);
  }

  function handleMapClick(lat: number, lng: number) {
    void abrirFormulario(lat, lng);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setCoords(null);
    setForm(emptyForm());
  }

  function cancelarSeleccionMapa() {
    setSeleccionMapa(false);
  }

  function actualizarTelefono(index: number, valor: string) {
    setForm((prev) => {
      const telefonos = [...prev.telefonos];
      telefonos[index] = valor;
      return { ...prev, telefonos };
    });
  }

  function agregarTelefono() {
    setForm((prev) => ({ ...prev, telefonos: [...prev.telefonos, ""] }));
  }

  function quitarTelefono(index: number) {
    setForm((prev) => ({
      ...prev,
      telefonos: prev.telefonos.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!coords || !onRegistrarCentro) return;

    if (!puntoEnAragua(coords.lat, coords.lng)) {
      setAlertaZona(MENSAJE_FUERA_ARAGUA);
      cerrarModal();
      return;
    }

    const contacto =
      form.telefonos.map((t) => t.trim()).filter(Boolean).join(", ") || null;

    setEnviando(true);
    try {
      await onRegistrarCentro({
        nombre: form.nombre,
        municipio: form.municipio,
        direccion: form.direccion || null,
        contacto,
        latitud: coords.lat,
        longitud: coords.lng,
        aprox_ninos: parsePoblacionInput(form.aproxNinos),
        aprox_personas: parsePoblacionInput(form.aproxPersonas),
        aprox_ancianos: parsePoblacionInput(form.aproxAncianos),
        aprox_animales: parsePoblacionInput(form.aproxAnimales),
      });
      cerrarModal();
      setSeleccionMapa(false);
    } finally {
      setEnviando(false);
    }
  }

  const centroActivo = centros.find((c) => c.id === centroActivoId);
  const flyTarget =
    coords ??
    (centroActivo
      ? { lat: centroActivo.latitud, lng: centroActivo.longitud }
      : null);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <MapContainer
        center={ARAGUA_CENTER}
        zoom={INITIAL_ZOOM}
        preferCanvas
        className="h-full w-full"
        style={{
          minHeight: 0,
          cursor: seleccionMapa ? "crosshair" : "grab",
        }}
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
        {flyTarget && modalAbierto && (
          <MapFlyTo lat={flyTarget.lat} lng={flyTarget.lng} />
        )}
        {centroActivo && !modalAbierto && (
          <MapFlyTo lat={centroActivo.latitud} lng={centroActivo.longitud} />
        )}
        <MapClickHandler active={seleccionMapa} onMapClick={handleMapClick} />
        <CentroMarkers
          centros={centros}
          centroActivoId={centroActivoId}
          onReportar={onReportarCentro}
          onVerLista={onVerCentroLista}
        />

        {coords && modalAbierto && (
          <Marker position={[coords.lat, coords.lng]} />
        )}
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-lg border border-red-500/50 bg-red-950/85 px-3 py-1.5 text-xs font-semibold text-red-200 shadow lg:top-4">
        Zona activa: Estado Aragua
      </div>

      {alertaZona && (
        <div className="absolute left-3 right-3 top-12 z-[1001] rounded-xl border border-amber-500 bg-amber-950/95 px-4 py-3 text-sm font-medium text-amber-100 shadow-lg lg:top-14 lg:max-w-md">
          {alertaZona}
        </div>
      )}

      {!hideAgregarButton && (
        <button
          type="button"
          onClick={() => {
            if (seleccionMapa) {
              cancelarSeleccionMapa();
              return;
            }
            if (modalAbierto) cerrarModal();
            setMenuAgregar(true);
          }}
          className={`absolute bottom-4 right-3 z-[1000] rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg active:scale-95 lg:bottom-6 lg:right-4 ${
            seleccionMapa ? "bg-red-600" : "bg-blue-700"
          }`}
        >
          {seleccionMapa ? "Cancelar" : "+ Agregar lugar"}
        </button>
      )}

      {seleccionMapa && !modalAbierto && (
        <div className="pointer-events-none absolute bottom-16 left-3 right-3 z-[1000] mx-auto max-w-sm rounded-xl bg-black/80 px-4 py-2.5 text-center text-sm text-white lg:bottom-20">
          Toca el mapa dentro de la zona roja (Estado Aragua)
        </div>
      )}

      <AgregarLugarSheet
        open={menuAgregar}
        onClose={() => setMenuAgregar(false)}
        onSeleccionarMapa={() => {
          setMenuAgregar(false);
          setSeleccionMapa(true);
        }}
        onCoordsListas={({ lat, lng }) => {
          setMenuAgregar(false);
          void abrirFormulario(lat, lng);
        }}
      />

      {modalAbierto && coords && (
        <ModalPortal open>
          <div
            className="fixed inset-0 z-[9999] flex items-end bg-black/60 lg:items-center lg:justify-center lg:p-4"
            onClick={cerrarModal}
          >
            <form
              onSubmit={handleSubmit}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-safe text-slate-900 shadow-2xl lg:max-w-md lg:rounded-2xl lg:pb-5"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 lg:hidden" />
              <h2 className="text-lg font-bold">Nuevo lugar de ayuda</h2>
              <p className="mt-1 text-sm text-slate-500">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </p>
              {cargandoLugar && (
                <p className="mt-2 text-xs text-blue-600">
                  Detectando nombre y dirección…
                </p>
              )}

              <label className="mt-3 block text-sm font-medium">
                Nombre del lugar *
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="mt-3 block text-sm font-medium">
                Municipio *
                <input
                  type="text"
                  required
                  value={form.municipio}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, municipio: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="mt-3 block text-sm font-medium">
                Dirección
                <input
                  type="text"
                  value={form.direccion}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, direccion: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <div className="mt-3">
                <p className="text-sm font-medium">Personas en el lugar (aprox.)</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Niños, personas, ancianos y animales — estimado a ojo.
                </p>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {(
                    [
                      ["aproxNinos", "Niños"],
                      ["aproxPersonas", "Personas"],
                      ["aproxAncianos", "Ancianos"],
                      ["aproxAnimales", "Animales"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="block text-center">
                      <span className="mb-1 block text-[11px] text-slate-600">
                        {label}
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="0"
                        value={form[key]}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            [key]: e.target.value.replace(/\D/g, "").slice(0, 5),
                          }))
                        }
                        className="w-full rounded-xl border border-slate-300 px-2 py-2.5 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <p className="text-sm font-medium">Teléfonos de contacto</p>
                {form.telefonos.map((tel, index) => (
                  <div key={index} className="mt-2 flex gap-2">
                    <input
                      type="tel"
                      placeholder="+58 414-0000000"
                      value={tel}
                      onChange={(e) => actualizarTelefono(index, e.target.value)}
                      className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    />
                    {form.telefonos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => quitarTelefono(index)}
                        className="shrink-0 rounded-xl border border-slate-300 px-3 text-sm text-red-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={agregarTelefono}
                  className="mt-2 text-sm font-medium text-blue-600"
                >
                  + Agregar otro número
                </button>
              </div>

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
                  disabled={enviando || !onRegistrarCentro || cargandoLugar}
                  className="flex-1 rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white active:bg-emerald-500 disabled:opacity-50"
                >
                  {enviando ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

export default memo(MapView);

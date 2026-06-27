"use client";

import { useState } from "react";
import ModalPortal from "@/components/ModalPortal";
import {
  parseCoordenadasManuales,
  parseGoogleMapsUrl,
} from "@/lib/google-maps-url";

type Paso = "menu" | "manual" | "google";

interface AgregarLugarSheetProps {
  open: boolean;
  onClose: () => void;
  onSeleccionarMapa: () => void;
  onCoordsListas: (coords: { lat: number; lng: number }) => void;
}

export default function AgregarLugarSheet({
  open,
  onClose,
  onSeleccionarMapa,
  onCoordsListas,
}: AgregarLugarSheetProps) {
  const [paso, setPaso] = useState<Paso>("menu");
  const [latTexto, setLatTexto] = useState("");
  const [lngTexto, setLngTexto] = useState("");
  const [enlaceGoogle, setEnlaceGoogle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mostrarTutorial, setMostrarTutorial] = useState(false);
  const [obteniendoGps, setObteniendoGps] = useState(false);
  const [resolviendoEnlace, setResolviendoEnlace] = useState(false);

  function resetear() {
    setPaso("menu");
    setLatTexto("");
    setLngTexto("");
    setEnlaceGoogle("");
    setError(null);
    setMostrarTutorial(false);
    setResolviendoEnlace(false);
  }

  function cerrar() {
    resetear();
    onClose();
  }

  function confirmarCoords(lat: number, lng: number) {
    resetear();
    onCoordsListas({ lat, lng });
  }

  function usarUbicacionActual() {
    if (!navigator.geolocation) {
      setError("Tu navegador no puede obtener la ubicación.");
      return;
    }

    setObteniendoGps(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setObteniendoGps(false);
        confirmarCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setObteniendoGps(false);
        setError("No se pudo obtener tu ubicación. Activa el GPS.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function confirmarManual() {
    const coords = parseCoordenadasManuales(latTexto, lngTexto);
    if (!coords) {
      setError("Latitud y longitud inválidas. Ejemplo: 10.24690, -67.59580");
      return;
    }
    confirmarCoords(coords.lat, coords.lng);
  }

  async function confirmarGoogle() {
    const texto = enlaceGoogle.trim();
    if (!texto) {
      setError("Pega el enlace que copiaste de Google Maps.");
      return;
    }

    const local = parseGoogleMapsUrl(texto);
    if (local) {
      confirmarCoords(local.lat, local.lng);
      return;
    }

    setResolviendoEnlace(true);
    setError(null);

    try {
      const res = await fetch("/api/google-maps/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: texto }),
      });
      const body = (await res.json()) as {
        lat?: number;
        lng?: number;
        error?: string;
      };

      if (!res.ok || body.lat == null || body.lng == null) {
        setError(
          body.error ??
            "No detectamos coordenadas en ese enlace. Revisa el tutorial o escribe lat/lng manualmente.",
        );
        return;
      }

      confirmarCoords(body.lat, body.lng);
    } catch {
      setError("No pudimos resolver el enlace. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setResolviendoEnlace(false);
    }
  }

  if (!open) return null;

  return (
    <ModalPortal open>
      <div
        className="fixed inset-0 z-[9999] flex items-end bg-black/60 lg:items-center lg:justify-center lg:p-4"
        onClick={cerrar}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-slate-900 p-5 pb-safe shadow-2xl lg:max-w-md lg:rounded-2xl lg:pb-5"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-700 lg:hidden" />

          {paso === "menu" && (
            <>
              <h2 className="text-lg font-bold text-white">Agregar lugar de ayuda</h2>
              <p className="mt-1 text-sm text-slate-400">
                ¿Cómo quieres indicar la ubicación?
              </p>

              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    cerrar();
                    onSeleccionarMapa();
                  }}
                  className="w-full rounded-xl border border-blue-800/60 bg-blue-950/40 px-4 py-3.5 text-left text-sm font-semibold text-blue-200 active:bg-blue-900/50"
                >
                  📍 Seleccionar en el mapa
                  <span className="mt-0.5 block text-xs font-normal text-slate-400">
                    Toca el punto exacto dentro de Aragua
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaso("manual");
                    setError(null);
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-left text-sm font-semibold text-slate-200 active:bg-slate-800"
                >
                  ✏️ Escribir coordenadas
                  <span className="mt-0.5 block text-xs font-normal text-slate-400">
                    Latitud y longitud manualmente
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaso("google");
                    setError(null);
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-left text-sm font-semibold text-slate-200 active:bg-slate-800"
                >
                  🔗 Pegar enlace de Google Maps
                  <span className="mt-0.5 block text-xs font-normal text-slate-400">
                    Copia el link desde la app de Maps
                  </span>
                </button>

                <button
                  type="button"
                  disabled={obteniendoGps}
                  onClick={usarUbicacionActual}
                  className="w-full rounded-xl border border-emerald-800/60 bg-emerald-950/30 px-4 py-3 text-sm font-semibold text-emerald-300 disabled:opacity-50"
                >
                  {obteniendoGps ? "Obteniendo GPS…" : "📡 Usar mi ubicación actual"}
                </button>
              </div>
            </>
          )}

          {paso === "manual" && (
            <>
              <button
                type="button"
                onClick={() => setPaso("menu")}
                className="mb-3 text-sm text-slate-400"
              >
                ← Volver
              </button>
              <h2 className="text-lg font-bold text-white">Coordenadas manuales</h2>
              <p className="mt-1 text-sm text-slate-400">
                Usa punto decimal. Ejemplo: 10.24690 y -67.59580
              </p>

              <label className="mt-4 block text-sm text-slate-300">
                Latitud
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="10.24690"
                  value={latTexto}
                  onChange={(e) => setLatTexto(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none focus:border-blue-500"
                />
              </label>

              <label className="mt-3 block text-sm text-slate-300">
                Longitud
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="-67.59580"
                  value={lngTexto}
                  onChange={(e) => setLngTexto(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none focus:border-blue-500"
                />
              </label>

              {error && (
                <p className="mt-3 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={confirmarManual}
                className="mt-4 w-full rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white"
              >
                Continuar
              </button>
            </>
          )}

          {paso === "google" && (
            <>
              <button
                type="button"
                onClick={() => setPaso("menu")}
                className="mb-3 text-sm text-slate-400"
              >
                ← Volver
              </button>
              <h2 className="text-lg font-bold text-white">Enlace de Google Maps</h2>
              <p className="mt-1 text-sm text-slate-400">
                Pega el enlace completo que copiaste al compartir el lugar.
              </p>

              <textarea
                rows={3}
                placeholder="https://maps.app.goo.gl/… o https://www.google.com/maps/…"
                value={enlaceGoogle}
                onChange={(e) => {
                  setEnlaceGoogle(e.target.value);
                  setError(null);
                }}
                disabled={resolviendoEnlace}
                className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-60"
              />

              {resolviendoEnlace && (
                <p className="mt-2 text-sm text-emerald-400">Resolviendo enlace de Google Maps…</p>
              )}

              {enlaceGoogle.trim() && parseGoogleMapsUrl(enlaceGoogle) && !resolviendoEnlace && (
                <p className="mt-2 text-xs text-emerald-400">
                  ✓ Coordenadas detectadas:{" "}
                  {parseGoogleMapsUrl(enlaceGoogle)!.lat.toFixed(5)},{" "}
                  {parseGoogleMapsUrl(enlaceGoogle)!.lng.toFixed(5)}
                </p>
              )}

              {error && (
                <p className="mt-3 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={() => setMostrarTutorial((v) => !v)}
                className="mt-4 text-sm font-medium text-amber-400 underline"
              >
                {mostrarTutorial ? "Ocultar tutorial" : "¿Cómo copiar el enlace en Google Maps?"}
              </button>

              {mostrarTutorial && (
                <ol className="mt-3 space-y-2 rounded-xl border border-amber-800/40 bg-amber-950/20 p-3 text-sm text-amber-100/90">
                  <li>1. Abre la app o web de Google Maps.</li>
                  <li>2. Busca el lugar o mantén presionado en el mapa.</li>
                  <li>3. Toca <strong>Compartir</strong> o el icono de compartir.</li>
                  <li>4. Elige <strong>Copiar enlace</strong>.</li>
                  <li>5. Pégalo aquí arriba y pulsa Continuar (el enlace corto también funciona).</li>
                  <li className="text-xs text-amber-200/70">
                    Tip: si falla, abre el enlace en el navegador y copia la URL larga de la barra.
                  </li>
                </ol>
              )}

              <button
                type="button"
                onClick={() => void confirmarGoogle()}
                disabled={resolviendoEnlace}
                className="mt-4 w-full rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white disabled:opacity-60"
              >
                {resolviendoEnlace ? "Resolviendo…" : "Continuar"}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={cerrar}
            className="mt-4 w-full py-2 text-sm text-slate-500"
          >
            Cancelar
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

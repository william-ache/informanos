"use client";

import { useEffect, useState } from "react";
import { mutate } from "swr";
import ModalPortal from "@/components/ModalPortal";
import { calcularDistanciaMetros } from "@/lib/geo";
import { datosExtendidosPermitidos } from "@/lib/privacidad";
import { parsePoblacionInput } from "@/lib/poblacion";
import {
  MIN_VOTOS_PROPUESTA,
  MINUTOS_PROPUESTA,
  textoReglasVotacion,
} from "@/lib/propuesta-tipo";
import { TIPO_LUGAR_OPCIONES } from "@/lib/tipo-lugar";
import type { CentroAcopio, PropuestaTipoLugar, TipoLugar } from "@/types/database";

const CENTROS_KEY = "/api/centros";
const GEOCERCA_METROS = 500;

interface CentroEditarModalProps {
  open: boolean;
  centro: CentroAcopio | null;
  onClose: () => void;
}

interface FormState {
  aproxNinos: string;
  aproxPersonas: string;
  aproxAncianos: string;
  aproxAnimales: string;
  telefonos: string[];
  tipoLugar: TipoLugar;
}

function telefonosDesdeCentro(contacto: string | null): string[] {
  if (!contacto?.trim()) return [""];
  const lista = contacto.split(",").map((t) => t.trim()).filter(Boolean);
  return lista.length ? lista : [""];
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

async function resolverTestigo(centro: CentroAcopio): Promise<boolean> {
  if (!datosExtendidosPermitidos()) return false;
  try {
    const pos = await obtenerUbicacion();
    const distancia = calcularDistanciaMetros(
      pos.coords.latitude,
      pos.coords.longitude,
      centro.latitud,
      centro.longitud,
    );
    return distancia !== null && distancia <= GEOCERCA_METROS;
  } catch {
    return false;
  }
}

export default function CentroEditarModal({
  open,
  centro,
  onClose,
}: CentroEditarModalProps) {
  const [form, setForm] = useState<FormState | null>(null);
  const [tipoOriginal, setTipoOriginal] = useState<TipoLugar>("acopio");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasoVotacion, setPasoVotacion] = useState(false);
  const [tipoPendiente, setTipoPendiente] = useState<TipoLugar | null>(null);

  useEffect(() => {
    if (!open || !centro) return;
    setTipoOriginal(centro.tipo_lugar ?? "acopio");
    setForm({
      aproxNinos: centro.aprox_ninos == null ? "" : String(centro.aprox_ninos),
      aproxPersonas:
        centro.aprox_personas == null ? "" : String(centro.aprox_personas),
      aproxAncianos:
        centro.aprox_ancianos == null ? "" : String(centro.aprox_ancianos),
      aproxAnimales:
        centro.aprox_animales == null ? "" : String(centro.aprox_animales),
      telefonos: telefonosDesdeCentro(centro.contacto),
      tipoLugar: centro.tipo_lugar ?? "acopio",
    });
    setError(null);
    setPasoVotacion(false);
    setTipoPendiente(null);
  }, [open, centro]);

  function cerrar() {
    if (guardando) return;
    onClose();
  }

  async function iniciarPropuestaTipo(tipo: TipoLugar) {
    if (!centro) return;

    const esTestigo = await resolverTestigo(centro);
    const res = await fetch("/api/centros/propuesta-tipo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        centro_id: centro.id,
        tipo_propuesto: tipo,
        es_testigo_presencial: esTestigo,
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "No se pudo iniciar la votación.");
    }

    const body = (await res.json()) as { propuesta: PropuestaTipoLugar };
    await mutate(
      CENTROS_KEY,
      (actual: { centros: CentroAcopio[] } | undefined) => {
        if (!actual) return actual;
        return {
          centros: actual.centros.map((c) =>
            c.id === centro.id ? { ...c, propuesta_tipo: body.propuesta } : c,
          ),
        };
      },
      { revalidate: true },
    );
  }

  async function guardar(event: React.FormEvent) {
    event.preventDefault();
    if (!centro || !form) return;

    const aviso = window.confirm(
      "Si editas algún dato erróneo puede ser perjudicial para quienes buscan ayuda. Solo modifica información que conozcas con certeza.\n\n¿Continuar?",
    );
    if (!aviso) return;

    setGuardando(true);
    setError(null);

    try {
      const contacto =
        form.telefonos.map((t) => t.trim()).filter(Boolean).join(", ") || null;

      const res = await fetch(`/api/centros/${centro.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacto,
          aprox_ninos: parsePoblacionInput(form.aproxNinos),
          aprox_personas: parsePoblacionInput(form.aproxPersonas),
          aprox_ancianos: parsePoblacionInput(form.aproxAncianos),
          aprox_animales: parsePoblacionInput(form.aproxAnimales),
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo guardar.");
      }

      await mutate(CENTROS_KEY);

      if (form.tipoLugar !== tipoOriginal) {
        setTipoPendiente(form.tipoLugar);
        setPasoVotacion(true);
        return;
      }

      cerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarVotacionTipo() {
    if (!tipoPendiente) return;
    setGuardando(true);
    setError(null);
    try {
      await iniciarPropuestaTipo(tipoPendiente);
      cerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar votación.");
    } finally {
      setGuardando(false);
    }
  }

  if (!open || !centro || !form) return null;

  return (
    <ModalPortal open={open}>
      <div
        className="fixed inset-0 z-[10001] flex items-end bg-black/60 lg:items-center lg:justify-center lg:p-4"
        onClick={cerrar}
      >
        {pasoVotacion ? (
          <div
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-safe text-slate-900 shadow-2xl lg:max-w-md lg:rounded-2xl lg:pb-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 lg:hidden" />
            <h2 className="text-lg font-bold text-violet-900">Votación de tipo</h2>
            <p className="mt-2 text-sm text-slate-600">
              Los demás datos ya se guardaron. El cambio de tipo saldrá a votación
              comunitaria.
            </p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              {textoReglasVotacion()}
            </p>
            <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm text-violet-900">
              Propuesta:{" "}
              <strong>
                {TIPO_LUGAR_OPCIONES.find((o) => o.value === tipoPendiente)?.label}
              </strong>
            </p>
            {error && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={guardando}
                onClick={cerrar}
                className="flex-1 rounded-xl border border-slate-300 py-3 text-base font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={guardando}
                onClick={() => void confirmarVotacionTipo()}
                className="flex-1 rounded-xl bg-violet-600 py-3 text-base font-semibold text-white disabled:opacity-50"
              >
                {guardando ? "Iniciando…" : "Iniciar votación"}
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={guardar}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-safe text-slate-900 shadow-2xl lg:max-w-md lg:rounded-2xl lg:pb-5"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 lg:hidden" />
            <h2 className="text-lg font-bold">Editar lugar</h2>
            <p className="mt-1 text-sm text-slate-500">{centro.nombre}</p>
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
              Solo edita personas, teléfonos y tipo. Datos falsos perjudican a la
              comunidad.
            </p>

            <fieldset className="mt-4">
              <legend className="text-sm font-medium">Personas y animales (aprox.)</legend>
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
                    <span className="mb-1 block text-[10px] text-slate-600">{label}</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={form[key]}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                [key]: e.target.value.replace(/\D/g, "").slice(0, 5),
                              }
                            : prev,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-2 py-2 text-base outline-none focus:border-blue-600"
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-4">
              <p className="text-sm font-medium">Teléfonos</p>
              {form.telefonos.map((tel, index) => (
                <div key={index} className="mt-2 flex gap-2">
                  <input
                    type="tel"
                    placeholder="+58 414-0000000"
                    value={tel}
                    onChange={(e) =>
                      setForm((prev) => {
                        if (!prev) return prev;
                        const telefonos = [...prev.telefonos];
                        telefonos[index] = e.target.value;
                        return { ...prev, telefonos };
                      })
                    }
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-blue-600"
                  />
                  {form.telefonos.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                telefonos: prev.telefonos.filter((_, i) => i !== index),
                              }
                            : prev,
                        )
                      }
                      className="shrink-0 rounded-xl border border-slate-300 px-3 text-sm text-red-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setForm((prev) =>
                    prev ? { ...prev, telefonos: [...prev.telefonos, ""] } : prev,
                  )
                }
                className="mt-2 text-sm font-medium text-blue-600"
              >
                + Agregar número
              </button>
            </div>

            <fieldset className="mt-4">
              <legend className="text-sm font-medium">Tipo de lugar</legend>
              <p className="mt-0.5 text-xs text-slate-500">
                Si lo cambias, luego saldrá a votación ({MINUTOS_PROPUESTA} min, mín.{" "}
                {MIN_VOTOS_PROPUESTA} votos).
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {TIPO_LUGAR_OPCIONES.map(({ value, label, color }) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2 text-[11px] leading-snug ${
                      form.tipoLugar === value
                        ? "border-slate-900 ring-2 ring-offset-1"
                        : "border-slate-300"
                    }`}
                    style={
                      form.tipoLugar === value
                        ? ({ ringColor: color } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <input
                      type="radio"
                      name="tipoLugarEdit"
                      checked={form.tipoLugar === value}
                      onChange={() =>
                        setForm((prev) => (prev ? { ...prev, tipoLugar: value } : prev))
                      }
                      className="mt-0.5"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {error && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={cerrar}
                className="flex-1 rounded-xl border border-slate-300 py-3 text-base font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-base font-semibold text-white disabled:opacity-50"
              >
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalPortal>
  );
}

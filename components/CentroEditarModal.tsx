"use client";

import { useEffect, useState } from "react";
import { mutate } from "swr";
import ModalPortal from "@/components/ModalPortal";
import { parsePoblacionInput } from "@/lib/poblacion";
import {
  MIN_VOTOS_PROPUESTA,
  MINUTOS_PROPUESTA,
  textoReglasVotacion,
} from "@/lib/propuesta-tipo";
import { TIPO_LUGAR_OPCIONES } from "@/lib/tipo-lugar";
import { AYUDAS_SOLICITADAS, ayudaDesdeCentro, type AyudaSolicitada } from "@/lib/ayuda-solicitada";
import { resolverVotoPresencial } from "@/lib/voto-presencial";
import type {
  AccionPropuestaNecesidad,
  CentroAcopio,
  PropuestaTipoLugar,
  TipoLugar,
  UrgenciaNivel,
} from "@/types/database";

const CENTROS_KEY = "/api/centros";

interface CentroEditarModalProps {
  open: boolean;
  centro: CentroAcopio | null;
  onClose: () => void;
}

interface InsumoForm {
  id: string;
  elemento: string;
  cantidad: string;
  urgencia: UrgenciaNivel;
  eliminar: boolean;
}

interface PropuestaInsumoInput {
  necesidad_id: string | null;
  accion: AccionPropuestaNecesidad;
  elemento: string;
  cantidad_solicitada: string;
  urgencia: UrgenciaNivel;
}

interface FormState {
  aproxNinos: string;
  aproxPersonas: string;
  aproxAncianos: string;
  aproxAnimales: string;
  telefonos: string[];
  tipoLugar: TipoLugar;
  insumos: InsumoForm[];
  ayuda: AyudaSolicitada;
}

type PasoVotacion = "tipo" | "insumos" | null;

function insumosDesdeCentro(centro: CentroAcopio): InsumoForm[] {
  return (centro.necesidades ?? []).map((n) => ({
    id: n.id,
    elemento: n.elemento,
    cantidad: n.cantidad_solicitada,
    urgencia: n.urgencia,
    eliminar: false,
  }));
}

function calcularCambiosInsumos(
  original: InsumoForm[],
  actual: InsumoForm[],
): PropuestaInsumoInput[] {
  const cambios: PropuestaInsumoInput[] = [];

  for (const orig of original) {
    const curr = actual.find((i) => i.id === orig.id);
    if (!curr || curr.eliminar) {
      cambios.push({
        necesidad_id: orig.id,
        accion: "eliminar",
        elemento: orig.elemento,
        cantidad_solicitada: orig.cantidad,
        urgencia: orig.urgencia,
      });
      continue;
    }

    if (
      curr.elemento.trim() !== orig.elemento ||
      curr.cantidad.trim() !== orig.cantidad ||
      curr.urgencia !== orig.urgencia
    ) {
      cambios.push({
        necesidad_id: orig.id,
        accion: "editar",
        elemento: curr.elemento.trim(),
        cantidad_solicitada: curr.cantidad.trim(),
        urgencia: curr.urgencia,
      });
    }
  }

  for (const ins of actual) {
    if (!ins.id.startsWith("new-") || ins.eliminar) continue;
    const elemento = ins.elemento.trim();
    const cantidad = ins.cantidad.trim();
    if (!elemento || !cantidad) continue;
    cambios.push({
      necesidad_id: null,
      accion: "agregar",
      elemento,
      cantidad_solicitada: cantidad,
      urgencia: ins.urgencia,
    });
  }

  return cambios;
}

function etiquetaCambioInsumo(c: PropuestaInsumoInput): string {
  if (c.accion === "eliminar") return `Eliminar «${c.elemento}»`;
  if (c.accion === "agregar") {
    return `Agregar «${c.elemento} (${c.cantidad_solicitada})»`;
  }
  return `Editar «${c.elemento} (${c.cantidad_solicitada})» · ${c.urgencia}`;
}

function mostrarInsumosEnCentro(centro: CentroAcopio): boolean {
  const tipo = centro.tipo_lugar ?? "acopio";
  return tipo === "acopio" || tipo === "urgencia";
}

function telefonosDesdeCentro(contacto: string | null): string[] {
  if (!contacto?.trim()) return [""];
  const lista = contacto.split(",").map((t) => t.trim()).filter(Boolean);
  return lista.length ? lista : [""];
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
  const [pasoVotacion, setPasoVotacion] = useState<PasoVotacion>(null);
  const [tipoPendiente, setTipoPendiente] = useState<TipoLugar | null>(null);
  const [insumosOriginal, setInsumosOriginal] = useState<InsumoForm[]>([]);
  const [insumosPendientes, setInsumosPendientes] = useState<PropuestaInsumoInput[]>(
    [],
  );

  useEffect(() => {
    if (!open || !centro) return;
    const insumos = insumosDesdeCentro(centro);
    setTipoOriginal(centro.tipo_lugar ?? "acopio");
    setInsumosOriginal(insumos);
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
      insumos,
      ayuda: ayudaDesdeCentro(centro),
    });
    setError(null);
    setPasoVotacion(null);
    setTipoPendiente(null);
    setInsumosPendientes([]);
  }, [open, centro]);

  function cerrar() {
    if (guardando) return;
    onClose();
  }

  async function iniciarPropuestaTipo(tipo: TipoLugar) {
    if (!centro) return;

    const { continuar, esTestigo } = await resolverVotoPresencial(centro);
    if (!continuar) return;
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

  async function iniciarPropuestasInsumos(propuestas: PropuestaInsumoInput[]) {
    if (!centro || propuestas.length === 0) return;

    const { continuar, esTestigo } = await resolverVotoPresencial(centro);
    if (!continuar) return;

    const res = await fetch("/api/centros/propuesta-necesidad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        centro_id: centro.id,
        propuestas,
        es_testigo_presencial: esTestigo,
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "No se pudo iniciar la votación de insumos.");
    }

    await mutate(CENTROS_KEY, undefined, { revalidate: true });
  }

  function irSiguienteVotacion(
    tipoCambio: boolean,
    insumosCambio: PropuestaInsumoInput[],
  ) {
    if (tipoCambio) {
      setInsumosPendientes(insumosCambio);
      setPasoVotacion("tipo");
      return;
    }
    if (insumosCambio.length > 0) {
      setInsumosPendientes(insumosCambio);
      setPasoVotacion("insumos");
      return;
    }
    cerrar();
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
          ...form.ayuda,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo guardar.");
      }

      await mutate(CENTROS_KEY);

      const tipoCambio = form.tipoLugar !== tipoOriginal;
      const insumosCambio = mostrarInsumosEnCentro(centro)
        ? calcularCambiosInsumos(insumosOriginal, form.insumos)
        : [];

      if (tipoCambio) setTipoPendiente(form.tipoLugar);
      irSiguienteVotacion(tipoCambio, insumosCambio);
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
      if (insumosPendientes.length > 0) {
        setPasoVotacion("insumos");
        return;
      }
      cerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar votación.");
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarVotacionInsumos() {
    if (insumosPendientes.length === 0) return;
    setGuardando(true);
    setError(null);
    try {
      await iniciarPropuestasInsumos(insumosPendientes);
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
        {pasoVotacion === "tipo" ? (
          <div
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-safe text-slate-900 shadow-2xl lg:max-w-md lg:rounded-2xl lg:pb-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 lg:hidden" />
            <h2 className="text-lg font-bold text-violet-900">Votación de tipo</h2>
            <p className="mt-2 text-sm text-slate-600">
              Los demás datos ya se guardaron. El cambio de tipo saldrá a votación.
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
        ) : pasoVotacion === "insumos" ? (
          <div
            className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-safe text-slate-900 shadow-2xl lg:max-w-md lg:rounded-2xl lg:pb-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 lg:hidden" />
            <h2 className="text-lg font-bold text-blue-900">Votación de insumos</h2>
            <p className="mt-2 text-sm text-slate-600">
              Los demás datos ya se guardaron. Estos cambios saldrán a votación.
            </p>
            <p className="mt-2 text-sm font-medium text-slate-800">
              {textoReglasVotacion()}
            </p>
            <ul className="mt-3 space-y-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
              {insumosPendientes.map((c, i) => (
                <li key={i}>• {etiquetaCambioInsumo(c)}</li>
              ))}
            </ul>
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
                onClick={() => void confirmarVotacionInsumos()}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-base font-semibold text-white disabled:opacity-50"
              >
                {guardando ? "Iniciando…" : "Iniciar votaciones"}
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
              Personas y teléfonos se guardan al instante. Tipo e insumos van a
              votación ({MINUTOS_PROPUESTA} min, mín. {MIN_VOTOS_PROPUESTA} votos).
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
              <legend className="text-sm font-medium">Ayuda solicitada</legend>
              <p className="mt-0.5 text-xs text-slate-500">
                Marca lo que necesita el lugar. Se guarda al instante y avisa en el chat.
              </p>
              <div className="mt-2 space-y-2">
                {AYUDAS_SOLICITADAS.map(({ key, label, emoji }) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={form.ayuda[key]}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev
                            ? {
                                ...prev,
                                ayuda: { ...prev.ayuda, [key]: e.target.checked },
                              }
                            : prev,
                        )
                      }
                      className="h-4 w-4"
                    />
                    <span>
                      {emoji} {label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {mostrarInsumosEnCentro(centro) && (
              <fieldset className="mt-4">
                <legend className="text-sm font-medium">Insumos / necesidades</legend>
                <p className="mt-0.5 text-xs text-slate-500">
                  Cambios de insumos salen a votación comunitaria.
                </p>
                <div className="mt-2 space-y-3">
                  {form.insumos.map((ins, index) => (
                    <div
                      key={ins.id}
                      className={`rounded-xl border p-3 ${ins.eliminar ? "border-red-200 bg-red-50 opacity-60" : "border-slate-200"}`}
                    >
                      <input
                        type="text"
                        placeholder="Elemento (ej. Agua potable)"
                        value={ins.elemento}
                        disabled={ins.eliminar}
                        onChange={(e) =>
                          setForm((prev) => {
                            if (!prev) return prev;
                            const insumos = [...prev.insumos];
                            insumos[index] = { ...insumos[index], elemento: e.target.value };
                            return { ...prev, insumos };
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100"
                      />
                      <div className="mt-2 flex gap-2">
                        <input
                          type="text"
                          placeholder="Cantidad"
                          value={ins.cantidad}
                          disabled={ins.eliminar}
                          onChange={(e) =>
                            setForm((prev) => {
                              if (!prev) return prev;
                              const insumos = [...prev.insumos];
                              insumos[index] = { ...insumos[index], cantidad: e.target.value };
                              return { ...prev, insumos };
                            })
                          }
                          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 disabled:bg-slate-100"
                        />
                        <select
                          value={ins.urgencia}
                          disabled={ins.eliminar}
                          onChange={(e) =>
                            setForm((prev) => {
                              if (!prev) return prev;
                              const insumos = [...prev.insumos];
                              insumos[index] = {
                                ...insumos[index],
                                urgencia: e.target.value as UrgenciaNivel,
                              };
                              return { ...prev, insumos };
                            })
                          }
                          className="rounded-lg border border-slate-300 px-2 py-2 text-sm disabled:bg-slate-100"
                        >
                          <option value="alta">Alta</option>
                          <option value="media">Media</option>
                          <option value="baja">Baja</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => {
                              if (!prev) return prev;
                              const insumos = [...prev.insumos];
                              insumos[index] = {
                                ...insumos[index],
                                eliminar: !insumos[index].eliminar,
                              };
                              return { ...prev, insumos };
                            })
                          }
                          className="shrink-0 rounded-lg border border-slate-300 px-2 text-xs text-red-600"
                        >
                          {ins.eliminar ? "↩" : "✕"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            insumos: [
                              ...prev.insumos,
                              {
                                id: `new-${Date.now()}`,
                                elemento: "",
                                cantidad: "",
                                urgencia: "media" as UrgenciaNivel,
                                eliminar: false,
                              },
                            ],
                          }
                        : prev,
                    )
                  }
                  className="mt-2 text-sm font-medium text-blue-600"
                >
                  + Agregar insumo
                </button>
              </fieldset>
            )}

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

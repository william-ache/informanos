"use client";

import { useState } from "react";
import ModalPortal from "@/components/ModalPortal";
import SearchableSelect from "@/components/SearchableSelect";
import type { CentroAcopio, TipoReporteError } from "@/types/database";

const emptyForm = {
  tipo: "" as "" | TipoReporteError,
  centro_id: "",
  descripcion: "",
  contacto: "",
};

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 outline-none focus:border-red-500";

interface ReportarErrorModalProps {
  open: boolean;
  onClose: () => void;
  centros: CentroAcopio[];
}

export default function ReportarErrorModal({
  open,
  onClose,
  centros,
}: ReportarErrorModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  function cerrar() {
    setForm(emptyForm);
    setError(null);
    setExito(false);
    onClose();
  }

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    if (!form.tipo || !form.descripcion.trim()) return;

    setEnviando(true);
    setError(null);

    try {
      const res = await fetch("/api/errores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: form.tipo,
          descripcion: form.descripcion.trim(),
          centro_id: form.centro_id || null,
          contacto: form.contacto.trim() || null,
          pagina:
            typeof window !== "undefined" ? window.location.pathname : null,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo enviar el reporte.");
      }

      setExito(true);
      setForm(emptyForm);
      window.setTimeout(cerrar, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ModalPortal open={open}>
      <div
        className="fixed inset-0 z-[9998] flex items-end bg-black/60 lg:items-center lg:justify-center lg:p-4"
        onClick={cerrar}
      >
        <form
          onSubmit={enviar}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-slate-900 p-5 pb-safe text-slate-100 shadow-2xl lg:max-w-md lg:rounded-2xl lg:pb-5"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-600 lg:hidden" />
          <h2 className="text-lg font-bold text-amber-300">Reportar error</h2>
          <p className="mt-1 text-sm text-slate-400">
            Fallos del sistema, datos incorrectos o información falsa para
            corregir lo antes posible.
          </p>

          {exito ? (
            <p className="mt-6 rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-300">
              Reporte enviado. Gracias por ayudar a mejorar la plataforma.
            </p>
          ) : (
            <>
              {error && (
                <p className="mt-3 rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              <SearchableSelect
                required
                value={form.tipo}
                onChange={(tipo) =>
                  setForm((prev) => ({
                    ...prev,
                    tipo: tipo as TipoReporteError,
                  }))
                }
                placeholder="Tipo de reporte…"
                className="mt-4"
                maxResults={4}
                options={[
                  {
                    value: "error_sistema",
                    label: "Error del sistema",
                    sublabel: "La app falla o no responde",
                  },
                  {
                    value: "info_erronea",
                    label: "Información errónea",
                    sublabel: "Datos desactualizados o incorrectos",
                  },
                  {
                    value: "info_falsa",
                    label: "Información falsa",
                    sublabel: "Contenido engañoso o inventado",
                  },
                  {
                    value: "otro",
                    label: "Otro",
                    sublabel: "Otro tipo de problema",
                  },
                ]}
              />

              <SearchableSelect
                value={form.centro_id}
                onChange={(centro_id) =>
                  setForm((prev) => ({ ...prev, centro_id }))
                }
                placeholder="Lugar relacionado (opcional)…"
                className="mt-3"
                options={centros.map((c) => ({
                  value: c.id,
                  label: c.nombre,
                  sublabel: c.municipio,
                }))}
              />

              <textarea
                required
                rows={4}
                placeholder="Describe el problema con detalle…"
                value={form.descripcion}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, descripcion: e.target.value }))
                }
                className={`${inputClass} mt-3 resize-none`}
              />

              <input
                type="text"
                placeholder="Contacto opcional (teléfono o correo)"
                value={form.contacto}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, contacto: e.target.value }))
                }
                className={`${inputClass} mt-3`}
              />

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={cerrar}
                  className="flex-1 rounded-xl border border-slate-600 py-3 text-base font-semibold active:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviando || !form.tipo}
                  className="flex-1 rounded-xl bg-amber-600 py-3 text-base font-bold text-white active:bg-amber-500 disabled:opacity-50"
                >
                  {enviando ? "Enviando…" : "Enviar reporte"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </ModalPortal>
  );
}

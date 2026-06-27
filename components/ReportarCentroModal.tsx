"use client";

import { useState } from "react";
import ModalPortal from "@/components/ModalPortal";
import SearchableSelect from "@/components/SearchableSelect";
import type { CentroAcopio, TipoReporteCentro } from "@/types/database";

const TIPOS_CENTRO: {
  value: TipoReporteCentro;
  label: string;
  sublabel?: string;
}[] = [
  {
    value: "ubicacion_incorrecta",
    label: "Mal ubicado",
    sublabel: "El pin no corresponde al lugar",
  },
  {
    value: "info_falsa",
    label: "Información falsa",
    sublabel: "Datos inventados o engañosos",
  },
  {
    value: "info_erronea",
    label: "Información errónea",
    sublabel: "Datos desactualizados o incorrectos",
  },
  { value: "otro", label: "Otro", sublabel: "Otro problema con este lugar" },
];

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 outline-none focus:border-red-500";

interface ReportarCentroModalProps {
  open: boolean;
  centro: CentroAcopio | null;
  onClose: () => void;
}

export default function ReportarCentroModal({
  open,
  centro,
  onClose,
}: ReportarCentroModalProps) {
  const [tipo, setTipo] = useState<TipoReporteCentro | "">("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  function cerrar() {
    setTipo("");
    setDescripcion("");
    setError(null);
    setExito(false);
    onClose();
  }

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    if (!centro || !tipo || descripcion.trim().length < 5) return;

    setEnviando(true);
    setError(null);

    try {
      const res = await fetch("/api/errores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          descripcion: descripcion.trim(),
          centro_id: centro.id,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo enviar el reporte.");
      }

      setExito(true);
      window.setTimeout(cerrar, 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar.");
    } finally {
      setEnviando(false);
    }
  }

  if (!centro) return null;

  return (
    <ModalPortal open={open}>
      <div
        className="fixed inset-0 z-[10000] flex items-end bg-black/60 lg:items-center lg:justify-center lg:p-4"
        onClick={cerrar}
      >
        <form
          onSubmit={enviar}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-slate-900 p-5 pb-safe text-slate-100 shadow-2xl lg:max-w-md lg:rounded-2xl lg:pb-5"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-600 lg:hidden" />
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
            Reportar lugar
          </p>
          <h2 className="mt-1 text-lg font-bold leading-snug">{centro.nombre}</h2>
          <p className="text-sm text-slate-400">{centro.municipio}</p>

          {exito ? (
            <p className="mt-6 rounded-xl border border-emerald-800 bg-emerald-950/40 p-4 text-sm text-emerald-300">
              Reporte enviado. Se publicó en el chat para revisión.
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
                value={tipo}
                onChange={(v) => setTipo(v as TipoReporteCentro)}
                placeholder="Motivo del reporte…"
                className="mt-4"
                maxResults={4}
                options={TIPOS_CENTRO.map((o) => ({
                  value: o.value,
                  label: o.label,
                  sublabel: o.sublabel,
                }))}
              />

              <textarea
                required
                rows={3}
                placeholder="Describe el problema (mín. 5 caracteres)…"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className={`${inputClass} mt-3 resize-none`}
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
                  disabled={enviando || !tipo || descripcion.trim().length < 5}
                  className="flex-1 rounded-xl bg-amber-600 py-3 text-base font-bold text-white active:bg-amber-500 disabled:opacity-50"
                >
                  {enviando ? "Enviando…" : "Enviar"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </ModalPortal>
  );
}

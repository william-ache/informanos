"use client";

import dynamic from "next/dynamic";
import { INSUMO_OPCIONES, insumoValido } from "@/lib/insumos";
import type { CentroAcopio, UrgenciaNivel } from "@/types/database";

const SearchableSelect = dynamic(() => import("@/components/SearchableSelect"), {
  ssr: false,
});

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base outline-none focus:border-red-500";

export interface NecesidadFormState {
  centro_id: string;
  tipo_insumo: string;
  elemento_otro: string;
  cantidad_solicitada: string;
  urgencia: UrgenciaNivel;
}

interface ReportarFormProps {
  compact?: boolean;
  centros: CentroAcopio[];
  form: NecesidadFormState;
  onFormChange: React.Dispatch<React.SetStateAction<NecesidadFormState>>;
  onSubmit: (event: React.FormEvent) => void;
  guardando: boolean;
  mensajeInicial?: string;
}

export default function ReportarForm({
  compact = false,
  centros,
  form,
  onFormChange,
  onSubmit,
  guardando,
  mensajeInicial,
}: ReportarFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className={`overflow-y-auto bg-slate-900 ${compact ? "flex h-full min-h-0 flex-col p-4 lg:p-5" : "border-t border-slate-800 p-4"}`}
    >
      <p className="mb-1 text-lg font-bold text-red-300">Registrar necesidad</p>
      {mensajeInicial ? (
        <p className="mb-4 rounded-xl border border-emerald-800/50 bg-emerald-950/30 px-3 py-2.5 text-sm text-emerald-200">
          {mensajeInicial}
        </p>
      ) : (
        <p className="mb-4 text-sm text-slate-400">
          Indica qué insumos faltan en un centro de acopio.
        </p>
      )}

      <SearchableSelect
        required
        value={form.centro_id}
        onChange={(centro_id) =>
          onFormChange((prev) => ({ ...prev, centro_id }))
        }
        placeholder="Buscar centro…"
        className="mb-3"
        options={centros.map((c) => ({
          value: c.id,
          label: c.nombre,
          sublabel: c.municipio,
        }))}
      />

      <SearchableSelect
        required
        value={form.tipo_insumo}
        onChange={(tipo_insumo) =>
          onFormChange((prev) => ({
            ...prev,
            tipo_insumo,
            elemento_otro: tipo_insumo === "otro" ? prev.elemento_otro : "",
          }))
        }
        placeholder="Buscar insumo…"
        className="mb-3"
        maxResults={6}
        options={INSUMO_OPCIONES.map((o) => ({
          value: o.value,
          label: o.label,
          sublabel: "sublabel" in o ? o.sublabel : undefined,
        }))}
      />

      {form.tipo_insumo === "otro" && (
        <input
          required
          type="text"
          autoComplete="off"
          placeholder="Describe la necesidad (ej. Colchones, Gasolina…)"
          value={form.elemento_otro}
          onChange={(e) =>
            onFormChange((prev) => ({
              ...prev,
              elemento_otro: e.target.value,
            }))
          }
          className={`${inputClass} mb-3`}
        />
      )}

      <input
        required
        type="text"
        autoComplete="off"
        placeholder="Cantidad solicitada"
        value={form.cantidad_solicitada}
        onChange={(e) =>
          onFormChange((prev) => ({
            ...prev,
            cantidad_solicitada: e.target.value,
          }))
        }
        className={`${inputClass} mb-3`}
      />

      <SearchableSelect
        value={form.urgencia}
        onChange={(urgencia) =>
          onFormChange((prev) => ({
            ...prev,
            urgencia: urgencia as UrgenciaNivel,
          }))
        }
        placeholder="Buscar urgencia…"
        className="mb-4"
        maxResults={3}
        options={[
          { value: "alta", label: "Alta", sublabel: "Prioridad máxima" },
          { value: "media", label: "Media", sublabel: "Prioridad moderada" },
          { value: "baja", label: "Baja", sublabel: "Prioridad baja" },
        ]}
      />

      <button
        type="submit"
        disabled={
          guardando ||
          centros.length === 0 ||
          !insumoValido(form.tipo_insumo, form.elemento_otro)
        }
        className="mt-auto w-full rounded-xl bg-red-600 py-4 text-base font-bold text-white active:bg-red-500 disabled:opacity-50"
      >
        {guardando ? "Guardando…" : "Enviar reporte"}
      </button>
    </form>
  );
}

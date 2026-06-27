"use client";

import type { FiltroPoblacion as FiltroPoblacionState } from "@/lib/poblacion";
import { filtroPoblacionActivo } from "@/lib/poblacion";

interface FiltroPoblacionProps {
  value: FiltroPoblacionState;
  onChange: (value: FiltroPoblacionState) => void;
  className?: string;
}

const campos: {
  key: keyof FiltroPoblacionState;
  label: string;
  short: string;
}[] = [
  { key: "minNinos", label: "Mín. niños", short: "Niños" },
  { key: "minPersonas", label: "Mín. personas", short: "Personas" },
  { key: "minAncianos", label: "Mín. ancianos", short: "Ancianos" },
];

export default function FiltroPoblacion({
  value,
  onChange,
  className = "",
}: FiltroPoblacionProps) {
  function actualizar(key: keyof FiltroPoblacionState, valor: string) {
    onChange({ ...value, [key]: valor.replace(/\D/g, "").slice(0, 5) });
  }

  function limpiar() {
    onChange({ minNinos: "", minPersonas: "", minAncianos: "" });
  }

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Filtrar por personas (aprox.)
        </p>
        {filtroPoblacionActivo(value) && (
          <button
            type="button"
            onClick={limpiar}
            className="text-[11px] text-red-400 underline"
          >
            Limpiar
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {campos.map(({ key, label, short }) => (
          <label key={key} className="block">
            <span className="mb-1 block text-[10px] text-slate-500">{short}</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0+"
              aria-label={label}
              value={value[key]}
              onChange={(e) => actualizar(key, e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-center text-sm text-slate-100 outline-none focus:border-red-500"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { SearchableSelectOption } from "@/types/ui";

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  required?: boolean;
  className?: string;
  maxResults?: number;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Buscar…",
  emptyLabel = "Sin coincidencias",
  required = false,
  className = "",
  maxResults = 8,
}: SearchableSelectProps) {
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState(false);

  const seleccionado = options.find((o) => o.value === value);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            (o.sublabel?.toLowerCase().includes(q) ?? false),
        )
      : options;
    return list.slice(0, maxResults);
  }, [options, query, maxResults]);

  function abrir() {
    setQuery("");
    setAbierto(true);
  }

  function cerrar() {
    window.setTimeout(() => setAbierto(false), 150);
  }

  function elegir(option: SearchableSelectOption) {
    onChange(option.value);
    setQuery("");
    setAbierto(false);
  }

  function limpiar() {
    onChange("");
    setQuery("");
    setAbierto(false);
  }

  const textoInput = abierto
    ? query
    : seleccionado
      ? seleccionado.sublabel
        ? `${seleccionado.label} · ${seleccionado.sublabel}`
        : seleccionado.label
      : "";

  return (
    <div className={`relative ${className}`}>
      {required && (
        <input
          type="text"
          required
          value={value}
          readOnly
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      )}
      <div className="relative">
        <input
          type="text"
          autoComplete="off"
          enterKeyHint="search"
          value={textoInput}
          onChange={(e) => {
            setQuery(e.target.value);
            setAbierto(true);
            if (e.target.value.trim()) onChange("");
          }}
          onFocus={abrir}
          onBlur={cerrar}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-4 pr-10 text-base text-slate-100 outline-none focus:border-red-500"
        />
        {value && !abierto && (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm text-slate-400"
            aria-label="Limpiar selección"
          >
            ✕
          </button>
        )}
      </div>

      {abierto && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
          {filtrados.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">{emptyLabel}</li>
          ) : (
            filtrados.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => elegir(option)}
                  className={`w-full px-4 py-3 text-left active:bg-slate-800 ${
                    option.value === value ? "bg-red-950/30" : ""
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-100">
                    {option.label}
                  </p>
                  {option.sublabel && (
                    <p className="text-xs text-slate-400">{option.sublabel}</p>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

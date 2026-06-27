"use client";

import { useMemo, useState } from "react";
import type { CentroAcopio } from "@/types/database";

interface CentroBuscadorProps {
  centros: CentroAcopio[];
  activoId: string | null;
  onSeleccionar: (id: string | null) => void;
  onQueryChange?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

function coincide(centro: CentroAcopio, q: string): boolean {
  return (
    centro.nombre.toLowerCase().includes(q) ||
    centro.municipio.toLowerCase().includes(q) ||
    (centro.direccion?.toLowerCase().includes(q) ?? false)
  );
}

export default function CentroBuscador({
  centros,
  activoId,
  onSeleccionar,
  onQueryChange,
  placeholder = "Buscar lugar…",
  className = "",
}: CentroBuscadorProps) {
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState(false);

  const sugerencias = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    return centros.filter((c) => coincide(c, q)).slice(0, 3);
  }, [centros, query]);

  function actualizarQuery(valor: string) {
    setQuery(valor);
    onQueryChange?.(valor);
    setAbierto(true);
    if (valor.trim()) onSeleccionar(null);
  }

  function seleccionar(centro: CentroAcopio) {
    setQuery(`${centro.nombre} · ${centro.municipio}`);
    onQueryChange?.("");
    setAbierto(false);
    onSeleccionar(centro.id);
  }

  function limpiar() {
    setQuery("");
    onQueryChange?.("");
    setAbierto(false);
    onSeleccionar(null);
  }

  const mostrarSugerencias = abierto && query.trim().length > 0;

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          autoComplete="off"
          enterKeyHint="search"
          value={query}
          onChange={(e) => actualizarQuery(e.target.value)}
          onFocus={() => setAbierto(true)}
          onBlur={() => window.setTimeout(() => setAbierto(false), 150)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-4 pr-10 text-base text-slate-100 outline-none focus:border-red-500"
        />
        {(query || activoId) && (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm text-slate-400"
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>

      {mostrarSugerencias && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
          {sugerencias.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">
              Sin coincidencias
            </li>
          ) : (
            sugerencias.map((centro) => (
              <li key={centro.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => seleccionar(centro)}
                  className="w-full px-4 py-3 text-left active:bg-slate-800"
                >
                  <p className="text-sm font-semibold text-slate-100">
                    {centro.nombre}
                  </p>
                  <p className="text-xs text-slate-400">{centro.municipio}</p>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

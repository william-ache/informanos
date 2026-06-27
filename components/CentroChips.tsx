"use client";

import type { CentroAcopio } from "@/types/database";

interface CentroChipsProps {
  centros: CentroAcopio[];
  activoId: string | null;
  onSeleccionar: (id: string | null) => void;
  className?: string;
}

export default function CentroChips({
  centros,
  activoId,
  onSeleccionar,
  className = "",
}: CentroChipsProps) {
  if (centros.length === 0) return null;

  return (
    <div className={`flex gap-2 overflow-x-auto pb-1 ${className}`}>
      <button
        type="button"
        onClick={() => onSeleccionar(null)}
        className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
          activoId === null
            ? "bg-red-600 text-white"
            : "bg-slate-800 text-slate-400"
        }`}
      >
        Todos
      </button>
      {centros.map((centro) => (
        <button
          key={centro.id}
          type="button"
          onClick={() => onSeleccionar(centro.id)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
            activoId === centro.id
              ? "bg-red-600 text-white"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          {centro.municipio}
        </button>
      ))}
    </div>
  );
}

"use client";

import type { FiltroTipoLugar } from "@/lib/tipo-lugar";
import {
  filtroTipoLugarActivo,
  TIPO_LUGAR_OPCIONES,
} from "@/lib/tipo-lugar";
import type { TipoLugar } from "@/types/database";

interface FiltroTipoLugarProps {
  value: FiltroTipoLugar;
  onChange: (value: FiltroTipoLugar) => void;
  className?: string;
  compact?: boolean;
}

export default function FiltroTipoLugar({
  value,
  onChange,
  className = "",
  compact = false,
}: FiltroTipoLugarProps) {
  function toggle(tipo: TipoLugar) {
    onChange({ ...value, [tipo]: !value[tipo] });
  }

  function limpiar() {
    onChange({
      acopio: true,
      urgencia: true,
      donacion: true,
      peligro: true,
    });
  }

  return (
    <div className={className}>
      {!compact && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Filtrar por tipo de lugar
          </p>
          {filtroTipoLugarActivo(value) && (
            <button
              type="button"
              onClick={limpiar}
              className="text-[11px] text-red-400 underline"
            >
              Todos
            </button>
          )}
        </div>
      )}
      <div className={`flex flex-wrap ${compact ? "gap-1" : "gap-2"}`}>
        {TIPO_LUGAR_OPCIONES.map(({ value: tipo, short, color }) => {
          const activo = value[tipo];
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => toggle(tipo)}
              className={`rounded-full border font-semibold transition ${
                compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
              } ${
                activo
                  ? "border-transparent text-white"
                  : "border-slate-700 bg-slate-950 text-slate-500"
              }`}
              style={activo ? { backgroundColor: color } : undefined}
            >
              {short}
            </button>
          );
        })}
        {compact && filtroTipoLugarActivo(value) && (
          <button
            type="button"
            onClick={limpiar}
            className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400"
          >
            Todos
          </button>
        )}
      </div>
    </div>
  );
}

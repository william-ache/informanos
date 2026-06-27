"use client";

import type { FiltroTipoLugar } from "@/lib/tipo-lugar";
import {
  filtroTipoLugarActivo,
  TIPO_LUGAR_OPCIONES,
  TIPOS_LUGAR,
} from "@/lib/tipo-lugar";
import type { TipoLugar } from "@/types/database";

interface FiltroTipoLugarProps {
  value: FiltroTipoLugar;
  onChange: (value: FiltroTipoLugar) => void;
  className?: string;
  compact?: boolean;
}

const filtroVacio: FiltroTipoLugar = {
  acopio: false,
  urgencia: false,
  donacion: false,
  peligro: false,
};

function filtroSolo(tipo: TipoLugar): FiltroTipoLugar {
  return { ...filtroVacio, [tipo]: true };
}

function filtroTodos(): FiltroTipoLugar {
  return { acopio: true, urgencia: true, donacion: true, peligro: true };
}

export default function FiltroTipoLugar({
  value,
  onChange,
  className = "",
  compact = false,
}: FiltroTipoLugarProps) {
  const filtrado = filtroTipoLugarActivo(value);

  function seleccionar(tipo: TipoLugar) {
    const todosVisibles = TIPOS_LUGAR.every((t) => value[t]);

    if (todosVisibles) {
      onChange(filtroSolo(tipo));
      return;
    }

    if (value[tipo]) {
      const reducido = { ...value, [tipo]: false };
      const quedaAlguno = TIPOS_LUGAR.some((t) => reducido[t]);
      onChange(quedaAlguno ? reducido : filtroTodos());
      return;
    }

    onChange({ ...value, [tipo]: true });
  }

  function verTodos() {
    onChange(filtroTodos());
  }

  return (
    <div className={className}>
      {!compact && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Filtrar por tipo de lugar
          </p>
          {filtrado && (
            <button
              type="button"
              onClick={verTodos}
              className="text-[11px] font-semibold text-red-400 underline"
            >
              Ver todos
            </button>
          )}
        </div>
      )}
      <div className={`flex flex-wrap items-center ${compact ? "gap-1" : "gap-2"}`}>
        {TIPO_LUGAR_OPCIONES.map(({ value: tipo, short, color }) => {
          const activo = value[tipo];
          return (
            <button
              key={tipo}
              type="button"
              onClick={() => seleccionar(tipo)}
              className={`rounded-full border font-semibold transition active:scale-95 ${
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
        {compact && (
          <button
            type="button"
            onClick={verTodos}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition active:scale-95 ${
              filtrado
                ? "border-red-700/60 bg-red-950/40 text-red-300"
                : "border-slate-700 text-slate-500"
            }`}
          >
            Ver todos
          </button>
        )}
      </div>
    </div>
  );
}

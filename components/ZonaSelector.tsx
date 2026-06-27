"use client";

import { useZonaContext, zonaLabel } from "@/lib/zona-context";
import { ZONAS, ZONA_CONFIG } from "@/lib/zones";

interface ZonaSelectorProps {
  compact?: boolean;
}

export default function ZonaSelector({ compact = false }: ZonaSelectorProps) {
  const { zona, setZona, detectando, autoDetectada } = useZonaContext();

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      {!compact && (
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Zona
          {detectando && " · detectando…"}
          {!detectando && autoDetectada && (
            <span className="text-emerald-400"> · por ubicación</span>
          )}
        </p>
      )}
      <div className="flex gap-1.5">
        {ZONAS.map((id) => {
          const active = zona === id;
          const cfg = ZONA_CONFIG[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setZona(id)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition active:scale-95 ${
                active
                  ? "border-transparent text-white"
                  : "border-slate-700 bg-slate-900 text-slate-400"
              }`}
              style={active ? { backgroundColor: cfg.color } : undefined}
              aria-pressed={active}
            >
              {zonaLabel(id)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

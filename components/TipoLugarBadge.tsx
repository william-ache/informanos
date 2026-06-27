import { badgeTipoLugar, colorTipoLugar, tipoLugarEfectivo } from "@/lib/tipo-lugar";
import type { CentroAcopio, TipoLugar } from "@/types/database";

interface TipoLugarBadgeProps {
  centro?: CentroAcopio;
  tipo?: TipoLugar;
  compact?: boolean;
}

export default function TipoLugarBadge({
  centro,
  tipo,
  compact = false,
}: TipoLugarBadgeProps) {
  const resolved = tipo ?? (centro ? tipoLugarEfectivo(centro) : "acopio");

  return (
    <span
      className={
        compact
          ? "mb-1 inline-block max-w-full rounded px-1.5 py-0.5 text-[9px] font-bold leading-tight text-white"
          : "mb-1 inline-block max-w-full rounded px-1.5 py-0.5 text-[10px] font-bold leading-tight text-white"
      }
      style={{ backgroundColor: colorTipoLugar(resolved) }}
    >
      {badgeTipoLugar(resolved)}
    </span>
  );
}

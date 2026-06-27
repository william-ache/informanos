import type { CentroAcopio } from "@/types/database";

interface CentroDescripcionProps {
  centro: CentroAcopio;
  compact?: boolean;
}

export default function CentroDescripcion({
  centro,
  compact = false,
}: CentroDescripcionProps) {
  const texto = centro.descripcion?.trim();
  if (!texto) return null;

  return (
    <p
      className={
        compact
          ? "mt-1 text-[10px] leading-snug text-slate-600"
          : "mt-1 text-xs leading-snug text-slate-400"
      }
    >
      {texto}
    </p>
  );
}

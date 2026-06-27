import type { CentroAcopio } from "@/types/database";
import {
  ayudaDesdeCentro,
  resumenAyudaSolicitada,
  tieneAlgunaAyuda,
} from "@/lib/ayuda-solicitada";

interface AyudaSolicitadaInfoProps {
  centro: CentroAcopio;
  compact?: boolean;
}

export default function AyudaSolicitadaInfo({
  centro,
  compact = false,
}: AyudaSolicitadaInfoProps) {
  const ayuda = ayudaDesdeCentro(centro);
  if (!tieneAlgunaAyuda(ayuda)) return null;

  const texto = resumenAyudaSolicitada(centro);

  return (
    <p
      className={
        compact
          ? "mt-1 text-[10px] font-medium leading-snug text-violet-800"
          : "mt-2 text-xs font-medium leading-snug text-violet-300"
      }
    >
      🆘 Solicita: {texto}
    </p>
  );
}

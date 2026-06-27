import pool from "@/lib/db";
import { obtenerNombreCentro, publicarEnChat } from "@/lib/chat-actividad";
import type { UrgenciaNivel } from "@/types/database";

/** Si hay necesidad alta, el lugar pasa a tipo urgencia */
export async function aplicarUrgenciaCentroPorNecesidad(
  centroId: string,
  urgencia: UrgenciaNivel,
): Promise<void> {
  if (urgencia !== "alta") return;

  const [result] = await pool.execute(
    `UPDATE centros_acopio
     SET tipo_lugar = 'urgencia'
     WHERE id = ? AND tipo_lugar != 'urgencia'`,
    [centroId],
  );

  const affected = (result as { affectedRows?: number }).affectedRows ?? 0;
  if (affected === 0) return;

  const nombre = (await obtenerNombreCentro(centroId)) ?? "un lugar";
  await publicarEnChat(
    `🚨 Urgencia automática: «${nombre}» por necesidad de prioridad alta`,
    centroId,
  );
}

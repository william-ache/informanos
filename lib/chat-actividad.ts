import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

import { AUTOR_SISTEMA } from "@/lib/chat-sistema";

export async function publicarEnChat(
  mensaje: string,
  centroId: string | null = null,
): Promise<void> {
  const texto = mensaje.trim().slice(0, 500);
  if (!texto) return;

  await pool.execute(
    `INSERT INTO chat_mensajes (id, centro_id, autor, mensaje)
     VALUES (?, ?, ?, ?)`,
    [randomUUID(), centroId, AUTOR_SISTEMA, texto],
  );
}

export async function obtenerNombreCentro(
  centroId: string,
): Promise<string | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT nombre FROM centros_acopio WHERE id = ? LIMIT 1",
    [centroId],
  );
  const nombre = rows[0]?.nombre;
  return typeof nombre === "string" ? nombre : null;
}

export const ETIQUETA_TIPO_REPORTE: Record<string, string> = {
  ubicacion_incorrecta: "Ubicación incorrecta",
  info_falsa: "Información falsa",
  info_erronea: "Información errónea",
  error_sistema: "Error del sistema",
  otro: "Otro",
};

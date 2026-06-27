import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import type { ZonaId } from "@/types/database";

import { AUTOR_SISTEMA } from "@/lib/chat-sistema-constants";
import { ETIQUETA_TIPO_REPORTE } from "@/lib/reporte-etiquetas";
import { detectarZona, parseZona } from "@/lib/zones";

export { ETIQUETA_TIPO_REPORTE };

async function zonaDeCentro(centroId: string): Promise<ZonaId | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT zona FROM centros_acopio WHERE id = ? LIMIT 1",
    [centroId],
  );
  return parseZona(rows[0]?.zona);
}

export async function publicarEnChat(
  mensaje: string,
  centroId: string | null = null,
  zonaExplicita?: ZonaId,
): Promise<void> {
  const texto = mensaje.trim().slice(0, 500);
  if (!texto) return;

  let zona: ZonaId = zonaExplicita ?? "aragua";
  if (centroId) {
    zona = (await zonaDeCentro(centroId)) ?? zona;
  }

  await pool.execute(
    `INSERT INTO chat_mensajes (id, zona, centro_id, centro_ref, autor, mensaje)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [randomUUID(), zona, centroId, centroId, AUTOR_SISTEMA, texto],
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

export async function zonaDesdeCoordenadas(
  lat: number,
  lng: number,
): Promise<ZonaId | null> {
  return detectarZona(lat, lng);
}

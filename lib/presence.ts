import { createHash } from "crypto";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";

const ACTIVO_SEGUNDOS = 45;

export function obtenerIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "desconocida";

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "desconocida";
}

export function hashIp(ip: string): string {
  const salt = process.env.IP_SALT ?? "informa-aragua";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export async function registrarPresencia(
  sessionId: string,
  ipHash: string,
): Promise<void> {
  await pool.execute(
    `INSERT INTO presencia_sesiones (id, ip_hash, ultimo_ping)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE ip_hash = VALUES(ip_hash), ultimo_ping = NOW()`,
    [sessionId, ipHash],
  );

  await pool.execute(
    `INSERT INTO visitas_ip (ip_hash, visitas)
     VALUES (?, 1)
     ON DUPLICATE KEY UPDATE visitas = visitas + 1, ultima_visita = NOW()`,
    [ipHash],
  );
}

interface CountRow extends RowDataPacket {
  total: number;
}

export async function obtenerEstadisticasPresencia(): Promise<{
  enLinea: number;
  ipsUnicas: number;
}> {
  await pool.query(
    `DELETE FROM presencia_sesiones
     WHERE ultimo_ping < DATE_SUB(NOW(), INTERVAL ? SECOND)`,
    [ACTIVO_SEGUNDOS],
  );

  const [activos] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS total FROM presencia_sesiones`,
  );

  const [ips] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) AS total FROM visitas_ip`,
  );

  return {
    enLinea: activos[0]?.total ?? 0,
    ipsUnicas: ips[0]?.total ?? 0,
  };
}

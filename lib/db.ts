import mysql from "mysql2/promise";

const requiredEnv = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"] as const;

export const dbConfigurado = requiredEnv.every((key) =>
  Boolean(process.env[key]),
);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z",
  dateStrings: true,
});

export default pool;

export async function pingDb(): Promise<boolean> {
  if (!dbConfigurado) return false;

  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch {
    return false;
  }
}

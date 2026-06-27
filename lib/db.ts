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

let schemaReady: Promise<void> | null = null;

export async function ensureSchema(): Promise<void> {
  if (!dbConfigurado) return;

  if (!schemaReady) {
    schemaReady = (async () => {
      const alters = [
        `ALTER TABLE chat_mensajes ADD COLUMN latitud DECIMAL(10, 8) NULL AFTER mensaje`,
        `ALTER TABLE chat_mensajes ADD COLUMN longitud DECIMAL(10, 8) NULL AFTER latitud`,
      ];

      for (const sql of alters) {
        try {
          await pool.query(sql);
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (!message.includes("Duplicate column")) throw error;
        }
      }

      const necesidadAlters = [
        `ALTER TABLE necesidades ADD COLUMN estado ENUM('disponible', 'agotado') NOT NULL DEFAULT 'disponible' AFTER urgencia`,
        `ALTER TABLE necesidades ADD COLUMN reportes_agotado INT NOT NULL DEFAULT 0 AFTER estado`,
        `ALTER TABLE necesidades ADD COLUMN reportes_confirmados INT NOT NULL DEFAULT 0 AFTER reportes_agotado`,
      ];

      for (const sql of necesidadAlters) {
        try {
          await pool.query(sql);
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (!message.includes("Duplicate column")) throw error;
        }
      }

      try {
        await pool.query(
          `ALTER TABLE centros_acopio MODIFY COLUMN contacto VARCHAR(500) NULL`,
        );
      } catch {
        // ignorar si ya aplicado
      }

      const poblacionAlters = [
        `ALTER TABLE centros_acopio ADD COLUMN aprox_ninos INT NULL AFTER contacto`,
        `ALTER TABLE centros_acopio ADD COLUMN aprox_personas INT NULL AFTER aprox_ninos`,
        `ALTER TABLE centros_acopio ADD COLUMN aprox_ancianos INT NULL AFTER aprox_personas`,
        `ALTER TABLE centros_acopio ADD COLUMN aprox_animales INT NULL AFTER aprox_ancianos`,
      ];

      for (const sql of poblacionAlters) {
        try {
          await pool.query(sql);
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (!message.includes("Duplicate column")) throw error;
        }
      }

      await pool.query(`
        CREATE TABLE IF NOT EXISTS presencia_sesiones (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          ip_hash VARCHAR(64) NOT NULL,
          ultimo_ping DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_presencia_ping (ultimo_ping)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS visitas_ip (
          ip_hash VARCHAR(64) NOT NULL PRIMARY KEY,
          visitas INT NOT NULL DEFAULT 1,
          primera_visita DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ultima_visita DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS reportes_errores (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          tipo ENUM('error_sistema', 'info_erronea', 'info_falsa', 'otro') NOT NULL,
          descripcion TEXT NOT NULL,
          centro_id VARCHAR(36) NULL,
          contacto VARCHAR(200) NULL,
          pagina VARCHAR(500) NULL,
          user_agent VARCHAR(500) NULL,
          ip_hash VARCHAR(64) NULL,
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_reportes_tipo (tipo),
          INDEX idx_reportes_creado (creado_en),
          CONSTRAINT fk_reportes_centro
            FOREIGN KEY (centro_id) REFERENCES centros_acopio (id)
            ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })();
  }

  await schemaReady;
}

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

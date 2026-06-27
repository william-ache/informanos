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

      const tipoLugarAlters = [
        `ALTER TABLE centros_acopio ADD COLUMN tipo_lugar ENUM('acopio', 'urgencia', 'donacion', 'peligro') NOT NULL DEFAULT 'acopio' AFTER aprox_animales`,
        `ALTER TABLE centros_acopio ADD COLUMN donacion_limite DATETIME NULL AFTER tipo_lugar`,
        `ALTER TABLE centros_acopio ADD COLUMN donacion_necesita TEXT NULL AFTER donacion_limite`,
        `ALTER TABLE centros_acopio ADD COLUMN donacion_destino TEXT NULL AFTER donacion_necesita`,
        `ALTER TABLE centros_acopio ADD COLUMN donacion_transporte TINYINT(1) NULL AFTER donacion_destino`,
      ];

      for (const sql of tipoLugarAlters) {
        try {
          await pool.query(sql);
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (!message.includes("Duplicate column")) throw error;
        }
      }

      await pool.query(`
        CREATE TABLE IF NOT EXISTS propuestas_tipo_lugar (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          centro_id VARCHAR(36) NOT NULL,
          tipo_propuesto ENUM('donacion', 'urgencia', 'peligro') NOT NULL,
          estado ENUM('activa', 'aprobada', 'rechazada') NOT NULL DEFAULT 'activa',
          expira_en DATETIME NOT NULL,
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_propuesta_centro (centro_id),
          INDEX idx_propuesta_estado_expira (estado, expira_en),
          CONSTRAINT fk_propuesta_centro
            FOREIGN KEY (centro_id) REFERENCES centros_acopio (id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS votos_propuesta_tipo (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          propuesta_id VARCHAR(36) NOT NULL,
          voto ENUM('si', 'no') NOT NULL,
          ip_hash VARCHAR(64) NOT NULL,
          peso INT NOT NULL DEFAULT 1,
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_voto_propuesta_ip (propuesta_id, ip_hash),
          INDEX idx_votos_propuesta (propuesta_id),
          CONSTRAINT fk_voto_propuesta
            FOREIGN KEY (propuesta_id) REFERENCES propuestas_tipo_lugar (id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      try {
        await pool.query(
          `ALTER TABLE chat_mensajes ADD COLUMN centro_ref VARCHAR(36) NULL AFTER centro_id`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (!message.includes("Duplicate column")) throw error;
      }

      try {
        await pool.query(
          `UPDATE chat_mensajes SET centro_ref = centro_id WHERE centro_ref IS NULL AND centro_id IS NOT NULL`,
        );
      } catch {
        // ignorar
      }

      try {
        await pool.query(`
          ALTER TABLE propuestas_tipo_lugar
          MODIFY COLUMN tipo_propuesto ENUM('acopio', 'urgencia', 'donacion', 'peligro') NOT NULL
        `);
      } catch {
        // ignorar si ya aplicado
      }

      await pool.query(`
        CREATE TABLE IF NOT EXISTS propuestas_necesidad (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          centro_id VARCHAR(36) NOT NULL,
          necesidad_id VARCHAR(36) NULL,
          accion ENUM('editar', 'agregar', 'eliminar') NOT NULL DEFAULT 'editar',
          elemento VARCHAR(255) NOT NULL,
          cantidad_solicitada VARCHAR(100) NOT NULL DEFAULT '',
          urgencia ENUM('alta', 'media', 'baja') NOT NULL DEFAULT 'media',
          estado ENUM('activa', 'aprobada', 'rechazada') NOT NULL DEFAULT 'activa',
          expira_en DATETIME NOT NULL,
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_prop_nec_centro (centro_id),
          INDEX idx_prop_nec_estado (estado, expira_en),
          CONSTRAINT fk_prop_nec_centro
            FOREIGN KEY (centro_id) REFERENCES centros_acopio (id)
            ON DELETE CASCADE,
          CONSTRAINT fk_prop_nec_necesidad
            FOREIGN KEY (necesidad_id) REFERENCES necesidades (id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS votos_propuesta_necesidad (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          propuesta_id VARCHAR(36) NOT NULL,
          voto ENUM('si', 'no') NOT NULL,
          ip_hash VARCHAR(64) NOT NULL,
          peso INT NOT NULL DEFAULT 1,
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_voto_prop_nec_ip (propuesta_id, ip_hash),
          INDEX idx_votos_prop_nec (propuesta_id),
          CONSTRAINT fk_voto_prop_nec
            FOREIGN KEY (propuesta_id) REFERENCES propuestas_necesidad (id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      const operativoAlters = [
        `ALTER TABLE centros_acopio ADD COLUMN estado_operativo ENUM('activo', 'finalizado') NOT NULL DEFAULT 'activo' AFTER donacion_transporte`,
        `ALTER TABLE centros_acopio ADD COLUMN finalizado_en DATETIME NULL AFTER estado_operativo`,
      ];
      for (const sql of operativoAlters) {
        try {
          await pool.query(sql);
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (!message.includes("Duplicate column")) throw error;
        }
      }

      const ayudaAlters = [
        `ALTER TABLE centros_acopio ADD COLUMN solicita_transporte TINYINT(1) NOT NULL DEFAULT 0 AFTER finalizado_en`,
        `ALTER TABLE centros_acopio ADD COLUMN solicita_medico TINYINT(1) NOT NULL DEFAULT 0 AFTER solicita_transporte`,
        `ALTER TABLE centros_acopio ADD COLUMN solicita_voluntarios TINYINT(1) NOT NULL DEFAULT 0 AFTER solicita_medico`,
        `ALTER TABLE centros_acopio ADD COLUMN solicita_psicologo TINYINT(1) NOT NULL DEFAULT 0 AFTER solicita_voluntarios`,
        `ALTER TABLE centros_acopio ADD COLUMN solicita_veterinario TINYINT(1) NOT NULL DEFAULT 0 AFTER solicita_psicologo`,
      ];
      for (const sql of ayudaAlters) {
        try {
          await pool.query(sql);
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (!message.includes("Duplicate column")) throw error;
        }
      }

      await pool.query(`
        CREATE TABLE IF NOT EXISTS propuestas_finalizar (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          centro_id VARCHAR(36) NOT NULL,
          estado ENUM('activa', 'aprobada', 'rechazada') NOT NULL DEFAULT 'activa',
          expira_en DATETIME NOT NULL,
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_prop_fin_centro (centro_id),
          INDEX idx_prop_fin_estado (estado, expira_en),
          CONSTRAINT fk_prop_fin_centro
            FOREIGN KEY (centro_id) REFERENCES centros_acopio (id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS votos_propuesta_finalizar (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          propuesta_id VARCHAR(36) NOT NULL,
          voto ENUM('si', 'no') NOT NULL,
          ip_hash VARCHAR(64) NOT NULL,
          peso INT NOT NULL DEFAULT 1,
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_voto_prop_fin_ip (propuesta_id, ip_hash),
          CONSTRAINT fk_voto_prop_fin
            FOREIGN KEY (propuesta_id) REFERENCES propuestas_finalizar (id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS propuestas_reactivar (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          centro_id VARCHAR(36) NOT NULL,
          estado ENUM('activa', 'aprobada', 'rechazada') NOT NULL DEFAULT 'activa',
          expira_en DATETIME NOT NULL,
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_prop_rea_centro (centro_id),
          INDEX idx_prop_rea_estado (estado, expira_en),
          CONSTRAINT fk_prop_rea_centro
            FOREIGN KEY (centro_id) REFERENCES centros_acopio (id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS votos_propuesta_reactivar (
          id VARCHAR(36) NOT NULL PRIMARY KEY,
          propuesta_id VARCHAR(36) NOT NULL,
          voto ENUM('si', 'no') NOT NULL,
          ip_hash VARCHAR(64) NOT NULL,
          peso INT NOT NULL DEFAULT 1,
          creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_voto_prop_rea_ip (propuesta_id, ip_hash),
          CONSTRAINT fk_voto_prop_rea
            FOREIGN KEY (propuesta_id) REFERENCES propuestas_reactivar (id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

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
          tipo ENUM('error_sistema', 'info_erronea', 'info_falsa', 'ubicacion_incorrecta', 'otro') NOT NULL,
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

      try {
        await pool.query(`
          ALTER TABLE reportes_errores
          MODIFY COLUMN tipo ENUM(
            'error_sistema',
            'info_erronea',
            'info_falsa',
            'ubicacion_incorrecta',
            'otro'
          ) NOT NULL
        `);
      } catch {
        // ignorar si ya aplicado
      }
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

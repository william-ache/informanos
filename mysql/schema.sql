-- Sistema de emergencia — Estado Aragua, Venezuela
-- MySQL 8.0 · VPS propio
-- Ejecutar: mysql -u root -p < mysql/schema.sql

CREATE DATABASE IF NOT EXISTS informa_aragua
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE informa_aragua;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS centros_acopio (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY DEFAULT (UUID()),
  nombre     VARCHAR(255) NOT NULL,
  municipio  VARCHAR(120) NOT NULL,
  direccion  VARCHAR(500) NULL,
  latitud    DECIMAL(10, 8) NOT NULL,
  longitud   DECIMAL(10, 8) NOT NULL,
  contacto   VARCHAR(500) NULL,
  aprox_ninos INT NULL,
  aprox_personas INT NULL,
  aprox_ancianos INT NULL,
  aprox_animales INT NULL,
  tipo_lugar ENUM('acopio', 'urgencia', 'donacion', 'peligro') NOT NULL DEFAULT 'acopio',
  donacion_limite DATETIME NULL,
  donacion_necesita TEXT NULL,
  donacion_destino TEXT NULL,
  donacion_transporte TINYINT(1) NULL,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS necesidades (
  id                  VARCHAR(36)  NOT NULL PRIMARY KEY DEFAULT (UUID()),
  centro_id           VARCHAR(36)  NOT NULL,
  elemento            VARCHAR(255) NOT NULL,
  cantidad_solicitada VARCHAR(255) NOT NULL,
  urgencia            ENUM('alta', 'media', 'baja') NOT NULL DEFAULT 'media',
  estado              ENUM('disponible', 'agotado') NOT NULL DEFAULT 'disponible',
  reportes_agotado    INT NOT NULL DEFAULT 0,
  reportes_confirmados INT NOT NULL DEFAULT 0,
  actualizado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_necesidades_centro
    FOREIGN KEY (centro_id) REFERENCES centros_acopio (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_mensajes (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY DEFAULT (UUID()),
  centro_id  VARCHAR(36)  NULL,
  autor      VARCHAR(120) NOT NULL,
  mensaje    TEXT         NOT NULL,
  latitud    DECIMAL(10, 8) NULL,
  longitud   DECIMAL(10, 8) NULL,
  creado_en  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_centro
    FOREIGN KEY (centro_id) REFERENCES centros_acopio (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_necesidades_centro_id ON necesidades (centro_id);
CREATE INDEX idx_necesidades_urgencia ON necesidades (urgencia);
CREATE INDEX idx_chat_centro_id ON chat_mensajes (centro_id);
CREATE INDEX idx_chat_creado_en ON chat_mensajes (creado_en);

CREATE TABLE IF NOT EXISTS presencia_sesiones (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  ip_hash VARCHAR(64) NOT NULL,
  ultimo_ping DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_presencia_ping (ultimo_ping)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visitas_ip (
  ip_hash VARCHAR(64) NOT NULL PRIMARY KEY,
  visitas INT NOT NULL DEFAULT 1,
  primera_visita DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultima_visita DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usuario de aplicación
CREATE USER IF NOT EXISTS 'informa'@'localhost' IDENTIFIED BY 'Informa@Aragua2026!';
GRANT ALL PRIVILEGES ON informa_aragua.* TO 'informa'@'localhost';
FLUSH PRIVILEGES;

-- ---------------------------------------------------------------------------
-- Datos de prueba
-- ---------------------------------------------------------------------------

SET @id_maracay = 'a1000000-0000-4000-8000-000000000001';
SET @id_turmero  = 'a1000000-0000-4000-8000-000000000002';
SET @id_limon    = 'a1000000-0000-4000-8000-000000000003';

INSERT INTO centros_acopio (id, nombre, municipio, direccion, latitud, longitud, contacto, aprox_ninos, aprox_personas, aprox_ancianos, aprox_animales)
VALUES
  (
    @id_maracay,
    'Centro de Acopio Parque Los Aviadores',
    'Maracay',
    'Av. Las Delicias, Parque Los Aviadores',
    10.24690000,
    -67.59580000,
    '+58 244-555-0101',
    45,
    120,
    18,
    12
  ),
  (
    @id_turmero,
    'Centro de Acopio Plaza Bolívar Turmero',
    'Turmero',
    'Plaza Bolívar, frente a la Alcaldía',
    10.22860000,
    -67.47420000,
    '+58 244-555-0202',
    30,
    85,
    22,
    8
  ),
  (
    @id_limon,
    'Centro de Acopio El Limón',
    'El Limón',
    'Av. Principal El Limón, sector La Candelaria',
    10.30330000,
    -67.42500000,
    '+58 244-555-0303',
    20,
    60,
    15,
    5
  );

INSERT INTO necesidades (centro_id, elemento, cantidad_solicitada, urgencia)
VALUES
  (@id_maracay, 'Agua potable', '500 litros', 'alta'),
  (@id_maracay, 'Medicamentos', '50 kits de primeros auxilios', 'alta'),
  (@id_maracay, 'Frazadas', '100 unidades', 'media'),
  (@id_turmero, 'Agua potable', '300 litros', 'alta'),
  (@id_turmero, 'Alimentos no perecederos', '200 paquetes', 'media'),
  (@id_turmero, 'Pañales', '80 unidades', 'baja'),
  (@id_limon, 'Medicamentos', '30 kits de primeros auxilios', 'alta'),
  (@id_limon, 'Linternas y pilas', '40 unidades', 'media'),
  (@id_limon, 'Agua potable', '200 litros', 'alta');

INSERT INTO chat_mensajes (centro_id, autor, mensaje)
VALUES
  (@id_maracay, 'Coordinación', 'Centro operativo. Recibiendo donaciones de agua.'),
  (@id_turmero, 'Voluntario', 'Faltan frazas y colchones en Plaza Bolívar.'),
  (NULL, 'Sistema', 'Canal general de emergencia activo para el Estado Aragua.');

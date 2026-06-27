-- Sistema de emergencia — Estado Aragua, Venezuela
-- Centros de acopio y necesidades post-terremoto
-- Ejecutar en Supabase SQL Editor o psql

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

CREATE TYPE urgencia_nivel AS ENUM ('alta', 'media', 'baja');

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

CREATE TABLE centros_acopio (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     TEXT NOT NULL,
  municipio  TEXT NOT NULL,
  direccion  TEXT,
  latitud    FLOAT8 NOT NULL,
  longitud   FLOAT8 NOT NULL,
  contacto   TEXT,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE necesidades (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_id           UUID NOT NULL REFERENCES centros_acopio (id) ON DELETE CASCADE,
  elemento            TEXT NOT NULL,
  cantidad_solicitada TEXT NOT NULL,
  urgencia            urgencia_nivel NOT NULL DEFAULT 'media',
  actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_necesidades_centro_id ON necesidades (centro_id);
CREATE INDEX idx_necesidades_urgencia ON necesidades (urgencia);

-- ---------------------------------------------------------------------------
-- RLS deshabilitado para desarrollo rápido
-- (habilitar y definir políticas antes de producción)
-- ---------------------------------------------------------------------------

ALTER TABLE centros_acopio DISABLE ROW LEVEL SECURITY;
ALTER TABLE necesidades DISABLE ROW LEVEL SECURITY;

-- Realtime (requerido para postgres_changes en el cliente)
ALTER PUBLICATION supabase_realtime ADD TABLE centros_acopio;
ALTER PUBLICATION supabase_realtime ADD TABLE necesidades;

-- ---------------------------------------------------------------------------
-- Datos de prueba — 3 centros en Maracay, Turmero y El Limón
-- ---------------------------------------------------------------------------

INSERT INTO centros_acopio (nombre, municipio, direccion, latitud, longitud, contacto)
VALUES
  (
    'Centro de Acopio Parque Los Aviadores',
    'Maracay',
    'Av. Las Delicias, Parque Los Aviadores',
    10.2469,
    -67.5958,
    '+58 244-555-0101'
  ),
  (
    'Centro de Acopio Plaza Bolívar Turmero',
    'Turmero',
    'Plaza Bolívar, frente a la Alcaldía',
    10.2286,
    -67.4742,
    '+58 244-555-0202'
  ),
  (
    'Centro de Acopio El Limón',
    'El Limón',
    'Av. Principal El Limón, sector La Candelaria',
    10.3033,
    -67.4250,
    '+58 244-555-0303'
  );

INSERT INTO necesidades (centro_id, elemento, cantidad_solicitada, urgencia)
SELECT c.id, n.elemento, n.cantidad_solicitada, n.urgencia::urgencia_nivel
FROM centros_acopio c
CROSS JOIN (
  VALUES
    ('Agua potable', '500 litros', 'alta'),
    ('Medicamentos', '50 kits de primeros auxilios', 'alta'),
    ('Frazadas', '100 unidades', 'media')
) AS n (elemento, cantidad_solicitada, urgencia)
WHERE c.nombre = 'Centro de Acopio Parque Los Aviadores';

INSERT INTO necesidades (centro_id, elemento, cantidad_solicitada, urgencia)
SELECT c.id, n.elemento, n.cantidad_solicitada, n.urgencia::urgencia_nivel
FROM centros_acopio c
CROSS JOIN (
  VALUES
    ('Agua potable', '300 litros', 'alta'),
    ('Alimentos no perecederos', '200 paquetes', 'media'),
    ('Pañales', '80 unidades', 'baja')
) AS n (elemento, cantidad_solicitada, urgencia)
WHERE c.nombre = 'Centro de Acopio Plaza Bolívar Turmero';

INSERT INTO necesidades (centro_id, elemento, cantidad_solicitada, urgencia)
SELECT c.id, n.elemento, n.cantidad_solicitada, n.urgencia::urgencia_nivel
FROM centros_acopio c
CROSS JOIN (
  VALUES
    ('Medicamentos', '30 kits de primeros auxilios', 'alta'),
    ('Linternas y pilas', '40 unidades', 'media'),
    ('Agua potable', '200 litros', 'alta')
) AS n (elemento, cantidad_solicitada, urgencia)
WHERE c.nombre = 'Centro de Acopio El Limón';

-- Añadir coordenadas opcionales a chat (si ya ejecutaste schema.sql sin estos campos)
USE informa_aragua;

ALTER TABLE chat_mensajes
  ADD COLUMN IF NOT EXISTS latitud DECIMAL(10, 8) NULL AFTER mensaje,
  ADD COLUMN IF NOT EXISTS longitud DECIMAL(10, 8) NULL AFTER latitud;

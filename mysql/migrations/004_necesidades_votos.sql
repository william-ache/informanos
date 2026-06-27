-- Verificación comunitaria de insumos
USE informa_aragua;

ALTER TABLE necesidades
  ADD COLUMN estado ENUM('disponible', 'agotado') NOT NULL DEFAULT 'disponible' AFTER urgencia,
  ADD COLUMN reportes_agotado INT NOT NULL DEFAULT 0 AFTER estado,
  ADD COLUMN reportes_confirmados INT NOT NULL DEFAULT 0 AFTER reportes_agotado;

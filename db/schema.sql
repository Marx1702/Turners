-- ============================================
-- Turners DB – Schema (Clean)
-- ============================================

DROP DATABASE IF EXISTS u447396976_turners_db;

CREATE DATABASE u447396976_turners_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE u447396976_turners_db;

-- Usuarios (autenticación + perfil)
CREATE TABLE usuarios (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  apellido    VARCHAR(100) DEFAULT '',
  email       VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol         ENUM('cliente','admin') DEFAULT 'cliente',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Clientes del taller (auto-creado al registrarse un usuario)
CREATE TABLE clientes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  apellido    VARCHAR(100) NOT NULL,
  telefono    VARCHAR(30),
  email       VARCHAR(150),
  dni         VARCHAR(20),
  usuario_id  INT UNIQUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Vehículos (identificados por dominio/patente)
CREATE TABLE vehiculos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  dominio     VARCHAR(20) NOT NULL UNIQUE,
  marca       VARCHAR(80) NOT NULL,
  modelo      VARCHAR(80) NOT NULL,
  anio        INT,
  color       VARCHAR(40),
  cliente_id  INT,
  usuario_id  INT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Catálogo de servicios
CREATE TABLE servicios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  descripcion   TEXT,
  duracion_min  INT DEFAULT 30,
  precio        DECIMAL(10,2) DEFAULT 0,
  imagen        VARCHAR(255)
) ENGINE=InnoDB;

-- Turnos
CREATE TABLE turnos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  fecha         DATE NOT NULL,
  hora          TIME NOT NULL,
  servicio_id   INT NOT NULL,
  cliente_id    INT,
  vehiculo_id   INT,
  usuario_id    INT NOT NULL,
  estado        ENUM('pendiente','confirmado','completado','cancelado') DEFAULT 'pendiente',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (servicio_id)  REFERENCES servicios(id),
  FOREIGN KEY (cliente_id)   REFERENCES clientes(id)  ON DELETE SET NULL,
  FOREIGN KEY (vehiculo_id)  REFERENCES vehiculos(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id)   REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- Seguimientos (historial de mantenimientos por vehículo)
CREATE TABLE seguimientos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  vehiculo_id   INT NOT NULL,
  servicio_id   INT NOT NULL,
  fecha         DATE NOT NULL,
  kilometraje   INT,
  observaciones TEXT,
  turno_id      INT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE,
  FOREIGN KEY (servicio_id) REFERENCES servicios(id),
  FOREIGN KEY (turno_id)    REFERENCES turnos(id)    ON DELETE SET NULL
) ENGINE=InnoDB;

-- Bloqueos de fechas
CREATE TABLE bloqueos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  fecha_inicio  DATE NOT NULL,
  fecha_fin     DATE NOT NULL,
  motivo        VARCHAR(255),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Presupuestos
CREATE TABLE presupuestos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  turno_id      INT,
  vehiculo_id   INT,
  usuario_id    INT NOT NULL,
  fecha         DATE NOT NULL,
  observaciones TEXT,
  estado        ENUM('borrador','enviado','aprobado') DEFAULT 'borrador',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (turno_id)    REFERENCES turnos(id)    ON DELETE SET NULL,
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE SET NULL,
  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE presupuesto_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  presupuesto_id  INT NOT NULL,
  descripcion     VARCHAR(255) NOT NULL,
  cantidad        INT DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (presupuesto_id) REFERENCES presupuestos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

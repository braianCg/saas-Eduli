CREATE DATABASE IF NOT EXISTS kiosko CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kiosko;

-- Cada kiosko es un "tenant". Todas las tablas llevan tenant_id para aislar los datos.
CREATE TABLE tenants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  last_ticket INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner','cashier') NOT NULL DEFAULT 'cashier',
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Protección contra ataques de fuerza bruta en inicio de sesión
CREATE TABLE login_attempts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  email VARCHAR(160) NOT NULL,
  attempted_at INT UNSIGNED NOT NULL,
  KEY idx_ip_email_time (ip_address, email, attempted_at)
);

CREATE TABLE products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT UNSIGNED NOT NULL,
  barcode VARCHAR(40) NULL,
  name VARCHAR(160) NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  min_stock INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_tenant_barcode (tenant_id, barcode),
  KEY idx_tenant_name (tenant_id, name),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE sales (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  ticket_number INT UNSIGNED NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  payment_method ENUM('efectivo','debito','credito','transferencia','qr') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tenant_ticket (tenant_id, ticket_number),
  KEY idx_tenant_date (tenant_id, created_at),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- unit_price y unit_cost quedan "congelados" al vender: la ganancia histórica no cambia si luego cambia el costo.
CREATE TABLE sale_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  qty INT UNSIGNED NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL,
  KEY idx_sale (sale_id),
  FOREIGN KEY (sale_id) REFERENCES sales(id)
);

CREATE TABLE invoices (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT UNSIGNED NOT NULL,
  supplier VARCHAR(160) NULL,
  cuit VARCHAR(13) NULL,
  number VARCHAR(30) NULL,
  invoice_date DATE NULL,
  total DECIMAL(12,2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tenant (tenant_id, created_at),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE invoice_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT UNSIGNED NOT NULL,
  description VARCHAR(200) NOT NULL,
  qty INT UNSIGNED NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL,
  product_id INT UNSIGNED NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

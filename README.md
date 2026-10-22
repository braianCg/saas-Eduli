# Kiosko SaaS

Sistema para kioscos: caja con tickets, inventario, gráficas de ganancias, lectura de facturas de proveedores y gestión del personal.
Multi-kiosko: cada kiosko es un *tenant* y sus datos están aislados por `tenant_id`.

- **backend/**: PHP 8.1+ (sin framework ni Composer), MySQL/MariaDB, JWT.
- **frontend/**: React 18 + Vite + TypeScript + Recharts.

## Puesta en marcha

### 1. Base de datos
```bash
mysql -u root -p < backend/database/schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env        # completá DB_*, JWT_SECRET y ANTHROPIC_API_KEY
php -r "echo bin2hex(random_bytes(32));"   # sirve para JWT_SECRET
php -S localhost:8000 -t public public/index.php
```
Extensiones de PHP necesarias: `pdo_mysql`, `curl`, `fileinfo`, `mbstring`.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxy /api -> :8000)
```
Abrí la app, tocá **Quiero crear un kiosko nuevo** y creá tu cuenta de dueño.

## Qué hace cada parte

| Pantalla | Quién | Qué hace |
|---|---|---|
| Caja | dueño y cajero | Busca por nombre o código de barras (la pistola lectora funciona: escribe y manda Enter), arma el carrito, cobra, descuenta stock y genera un ticket imprimible (80 mm). Reimpresión desde "Últimos tickets". |
| Inventario | dueño edita; cajero solo mira | Precios, costos, stock y stock mínimo. El cajero no ve costos. |
| Ganancias | dueño | Ventas y ganancia por día, top de productos, medios de pago, lista para reponer. |
| Facturas | dueño | Subís foto o PDF → la IA lee proveedor, CUIT, número, fecha, total e ítems → vos revisás → al guardar suma stock y actualiza costos. |
| Personal | dueño | Alta de cajeros. |

## Decisiones importantes
- **Los precios nunca vienen del navegador**: `POST /api/sales` recalcula todo con los precios de la base, bloquea las filas (`FOR UPDATE`) y valida el stock dentro de una transacción.
- **La ganancia histórica no se rompe**: cada ítem vendido guarda el precio y el costo del momento (`sale_items`).
- **Lector de facturas**: `InvoiceController::parse` envía el archivo a la API de Anthropic (modelo configurable con `ANTHROPIC_MODEL`) y devuelve un borrador. Nada se guarda hasta que el dueño confirma. El costo se toma neto de IVA cuando la factura lo discrimina; si no te sirve, cambiá el prompt (`PROMPT`) en ese archivo.
- **El ticket no es fiscal**: dice "Documento no válido como factura". Facturar electrónicamente a clientes requiere integrar ARCA/AFIP (WSFE), que no está incluido.

## Pendiente antes de producción
- HTTPS, `APP_DEBUG=0` y `CORS_ORIGIN` con tu dominio real.
- Límite de intentos en el login y recuperación de contraseña.
- Migraciones versionadas y tests (hoy hay un único `schema.sql`).
- Backups de la base y límite de uso para el lector de facturas (cada lectura consume créditos de la API).
- Cierre de caja por turno y devoluciones/anulaciones de tickets.

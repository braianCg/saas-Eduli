# Kiosko SaaS - Sistema de Gestión Punto de Venta Multi-tenant

Plataforma integral y web para la gestión de kioscos y comercios minoristas. Ofrece caja con emisión e impresión de tickets, control de inventario en tiempo real, reportes de ventas y ganancias, lectura automatizada de facturas de proveedores mediante IA y administración de personal por roles.

Sistema multi-kiosko donde cada comercio opera de forma aislada como un *tenant* independiente (`tenant_id`).

## Arquitectura del Proyecto

- **Backend**: PHP 8.1+ (sin dependencias externas pesadas ni frameworks de terceros), MySQL/MariaDB, JWT (HS256).
- **Frontend**: React 18, Vite, TypeScript, React Router, Recharts.

---

## Requisitos del Sistema

- PHP 8.1 o superior con las siguientes extensiones habilitadas: `pdo_mysql`, `curl`, `fileinfo`, `mbstring`.
- Servidor de Base de Datos MySQL 8.0+ o MariaDB 10.5+.
- Node.js 18+ y npm para el desarrollo e instalación del cliente web.

---

## Guía de Instalación y Despliegue

### 1. Base de Datos
Cree la base de datos e importe la estructura desde el script SQL proporcionado:
```bash
mysql -u <usuario_db> -p < backend/database/schema.sql
```

### 2. Configuración del Backend
Acceda al directorio `backend` y configure las variables de entorno a partir del archivo de ejemplo:
```bash
cd backend
cp .env.example .env
```
Edite el archivo `.env` asignando las variables correspondientes a su entorno:
- `DB_HOST`: Host de la base de datos (ej. `127.0.0.1`).
- `DB_NAME`: Nombre de la base de datos (ej. `kiosko`).
- `DB_USER`: Usuario de la base de datos.
- `DB_PASS`: Contraseña de la base de datos.
- `JWT_SECRET`: Clave secreta para la firma de tokens JWT (mínimo 32 caracteres aleatorios y seguros). Puede generar una ejecutando: `php -r "echo bin2hex(random_bytes(32));"`
- `ANTHROPIC_API_KEY`: Clave de API para el servicio de OCR e interpretación de facturas.
- `ANTHROPIC_MODEL`: Modelo a utilizar (ej. `claude-3-5-sonnet-20241022`).
- `CORS_ORIGIN`: Dominio o URL permitida para solicitudes Cross-Origin (ej. `http://localhost:5173` o dominio de producción).
- `APP_DEBUG`: Asignar a `0` en entornos de producción.

Para iniciar el servidor local de desarrollo PHP:
```bash
php -S localhost:8000 -t public public/index.php
```

### 3. Configuración del Frontend
Acceda al directorio `frontend`, instale las dependencias y ejecute el servidor de desarrollo:
```bash
cd frontend
npm install
npm run dev
```

Para construir la versión optimizada para producción:
```bash
npm run build
```

---

## Características de Seguridad

1. **Aislamiento Multi-tenant Riguroso**: Las consultas a nivel de base de datos están parametrizadas y filtradas obligatoriamente por el identificador del comercio (`tenant_id`).
2. **Validación de Precios y Calculo Server-side**: En el endpoint de ventas (`POST /api/sales`), los precios y costos nunca son aceptados desde el cliente; se consultan y recalculan directamente desde la base de datos con bloqueo de filas (`FOR UPDATE`) dentro de una transacción atómica.
3. **Protección Brute-force en Autenticación**: Control de límite de intentos de inicio de sesión (*Rate Limiting*) para mitigar ataques de fuerza bruta.
4. **Cabeceras de Seguridad HTTP**: Configuración de cabeceras de protección activa contra Clickjacking (`X-Frame-Options`), Sniffing de tipos MIME (`X-Content-Type-Options`), y políticas de origen.
5. **Aislamiento de Roles**: Control de acceso granular que restringe el acceso a métricas financieras, administración de usuarios y carga de costos únicamente a usuarios con rol `owner`.

---

## Funcionalidades Principales

- **Módulo de Caja (POS)**: Búsqueda dinámica de productos por nombre o lectura por scanner de código de barras. Generación automatizada de tickets con impresión nativa.
- **Inventario y Stock**: Control de existencias, precios de venta, costos y alertas de stock mínimo.
- **Reportes Financieros**: Cuadro de mando con KPIs de ingresos, ganancias netas, productos más vendidos y desglose por medio de pago.
- **Carga Inteligente de Facturas**: Escaneo e ingreso de comprobantes mediante modelo de lenguaje para la actualización automática de stock e inventario.
- **Gestión de Personal**: Registro e inhabilitación de cajeros por cada establecimiento.

---

## Licencia y Uso
Uso exclusivo según los términos del acuerdo de licencia del software Kiosko SaaS.

# Políticas y Protocolos de Seguridad - Kiosko SaaS

Este documento describe la postura de seguridad, las medidas implementadas y las mejores prácticas para el despliegue y mantenimiento del sistema Kiosko SaaS.

## 1. Protección de Datos y Privacidad Multi-tenant

- **Aislamiento por `tenant_id`**: Cada entidad comercial (*tenant*) opera en una partición lógica de datos aislada. Todas las consultas SELECT, INSERT, UPDATE y DELETE que afecten datos sensibles incorporan la cláusula `tenant_id = ?` correspondiente al usuario autenticado.
- **Filtrado de Respuestas por Rol**: Los usuarios con rol `cashier` (cajero) tienen restringido el acceso a columnas sensibles como costos de compra de productos (`cost`) e informes de margen operativo/ganancias.

## 2. Autenticación y Autorización

- **Almacenamiento de Contraseñas**: Las contraseñas de usuarios se almacenan utilizando `password_hash()` con el algoritmo recomendado de PHP (`PASSWORD_DEFAULT` - Bcrypt/Argon2id) y salting dinámico automático.
- **Firma de Tokens JWT**:
  - Firma mediante HMAC-SHA256 (`HS256`).
  - Verificación estricta del algoritmo declarado en la cabecera del token para evitar ataques de degradación (*alg: none* / *algorithm substitution*).
  - Tiempo de expiración limitado (12 horas).
  - La clave secreta `JWT_SECRET` debe tener una longitud mínima de 32 caracteres (256 bits de entropía).

## 3. Protección contra Ataques de Fuerza Bruta (Rate Limiting)

- Se ha implementado un mecanismo de control de tasa de intentos en la ruta `/auth/login`.
- Máximo de **5 intentos fallidos** por combinación de dirección IP y cuenta de correo en una ventana de **15 minutos**.
- Exceder el límite genera un bloqueo temporal devolviendo una respuesta HTTP `429 Too Many Requests`.

## 4. Seguridad en Transacciones Financieras

- **Integridad de Precios**: El backend recalcula los montos totales utilizando exclusivamente los precios registrados en la base de datos al momento de ejecutar la venta. Se rechaza cualquier precio enviado desde el cliente.
- **Concurrencia y Consistencia de Stock**: Se utiliza bloqueo de filas `FOR UPDATE` y transacciones ACID en MySQL/MariaDB para evitar condiciones de carrera (*race conditions*) en ventas simultáneas.

## 5. Cabeceras de Seguridad HTTP (Security Headers)

El backend responde con las siguientes cabeceras de seguridad activas:
- `X-Content-Type-Options: nosniff`: Previene el análisis MIME incorrecto por parte del navegador.
- `X-Frame-Options: DENY`: Evita ataques de Clickjacking impidiendo el renderizado del sistema en `<iframe>`.
- `Referrer-Policy: strict-origin-when-cross-origin`: Restringe la fuga de URLs en solicitudes externas.
- `X-XSS-Protection: 1; mode=block`: Filtro XSS en navegadores legados.

## 6. Recomendaciones para Entornos de Producción

1. **HTTPS / TLS Obligatorio**: Garantizar que todo el tráfico entre cliente y servidor transite sobre HTTPS mediante certificados TLS válidos (ej. Let's Encrypt) con cifrado fuerte.
2. **Configuración de Variables de Entorno**:
   - Desactivar modo depuración asignando `APP_DEBUG=0`.
   - Restringir la cabecera `CORS_ORIGIN` exclusivamente al dominio de producción del frontend.
3. **Restricción de Acceso a la Base de Datos**: El usuario de base de datos de la aplicación debe contar solo con los privilegios estrictamente necesarios (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
4. **Resguardos y Copias de Seguridad**: Configurar copias de seguridad automáticas y cifradas de la base de datos.

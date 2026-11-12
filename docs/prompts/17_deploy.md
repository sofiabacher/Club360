# Prompt 17 — Preparar el código para el deploy de la demo

Vas a dejar el código listo para correr en producción. Las cuentas y los paneles (Railway, Render, Vercel, Cloudinary, Brevo) los configura Sofía a mano siguiendo `docs/deploy.md`; este prompt cubre solo lo que se resuelve en el código.

**Dónde corre cada cosa:**

| Pieza | Servicio | Notas |
|---|---|---|
| Base de datos | **Railway** (MySQL) | Render se conecta por la conexión pública (`MYSQL_PUBLIC_URL`), con SSL |
| Backend (`api/`) | **Render**, plan gratuito | Disco no persistente, se duerme a los 15 minutos sin tráfico, **bloquea SMTP** (puertos 25, 465 y 587), corre en UTC |
| Frontend (`client/`) | **Vercel** | Con `client/vercel.json` |
| Imágenes y comprobantes | **Cloudinary** | Solo en producción |
| Emails | **API HTTP de Brevo** | Reemplaza a Gmail SMTP, porque Render gratis bloquea SMTP |

Antes de empezar:
- leé `CLAUDE.md`, sobre todo "Imágenes", "Emails", "Deploy de la demo" y "Cuotas y pagos" (comprobantes adjuntos);
- leé la sección 11 de `docs/contexto.md` ("Decisiones técnicas") y `docs/deploy.md` (la guía de Sofía, para que las variables coincidan);
- mirá cómo quedaron hoy `config/index.js`, `config/db.js`, `config/mail.js`, `utils/mailer/`, `middlewares/upload.js`, el borrado de archivos (foto de Mi cuenta, rutinas, comprobantes), `GET /fees/payments/:id/receipt-file`, los jobs de `jobs/` y, en el front, `api/axiosClient.js` y el helper de URLs de imágenes.

**Alcance:**
- **Se hace:** la configuración de producción, el mailer con Brevo, el `upload` con Cloudinary y el borrado común, la zona horaria de los jobs, los chequeos de arranque, el `.env.example` y la verificación.
- **No se hace:** crear cuentas ni tocar paneles; cambiar el modelo; el backup de los archivos subidos.
- **No** hagas commit.
- **Antes de cambiar algo, revisá cómo está.** Si una pieza ya existe y cumple lo que pide este prompt, dejala y avisame. Si algo choca con cómo quedó implementado (por ejemplo, el contrato del `upload` con los services), avisame antes de cambiarlo.

## 1. Configuración (`config/`)

### 1.1 Variables nuevas

Todas se leen solo en `config/index.js`:

| Variable | Uso |
|---|---|
| `DB_SSL` | `true` por defecto cuando hay `DATABASE_URL`. Permite apagar el SSL si hiciera falta, sin tocar código |
| `MAIL_PROVIDER` | `brevo`, `smtp` o `console` (punto 2) |
| `BREVO_API_KEY` | Clave de la API de Brevo |
| `MAIL_FROM`, `MAIL_FROM_NAME` | Remitente (la casilla verificada en Brevo) y nombre visible, por defecto *"Club360"* |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary (punto 3) |
| `TZ_APP` | Zona horaria de la aplicación, por defecto `America/Argentina/Buenos_Aires` (punto 4). Si ya hay una constante con esa zona, usá esa y no sumes la variable |

### 1.2 Base de datos (`config/db.js`)

- Con `DATABASE_URL`: SSL según `DB_SSL` (`require: true, rejectUnauthorized: false`, como hoy), conservando `timezone: '-03:00'` y `freezeTableName`.
- Sumá un `pool` chico (máximo 5 conexiones), porque la base de Railway se comparte entre el back de Render y los scripts que se corren desde una compu.
- No cambies el comportamiento de `sync()` ni el bloqueo de `DB_FORCE_SYNC` / `DB_ALTER_SYNC` en producción.

### 1.3 Chequeo al arrancar (`server.js`)

En producción (`app.isProd`), antes de conectar:
- **Faltan y corta el arranque** con un mensaje claro: `DATABASE_URL`, `JWT_SECRET`, `JWT_ACTIVATION_SECRET` (o el nombre que tenga hoy), `ENCRYPTION_KEY`, `FRONTEND_URL`.
- **Faltan y solo avisa por consola** (el sistema funciona igual, sin esa parte): las de Cloudinary (las subidas devuelven 503 con *"No se pueden subir archivos en este momento."*) y las del mail (los emails se muestran por consola, como en desarrollo).
- Nunca muestres el valor de una variable, solo su nombre.

Confirmá también que el `listen` usa `PORT` (Render la define) y que `api/package.json` tiene `"engines": { "node": ">=20" }`. Si no, sumalo.

## 2. Emails con la API de Brevo

Render gratis bloquea los puertos SMTP, así que en producción los emails salen por la API HTTP de Brevo. El resto del circuito no cambia: todo pasa por `utils/mailer/` y `notify()`, después del commit y en segundo plano.

1. **`config/mail.js`** expone una única función de envío (`sendMail({ to, subject, html })`, o la firma que ya use el mailer) y elige el proveedor con `MAIL_PROVIDER`:
   - **`brevo`:** `POST https://api.brevo.com/v3/smtp/email` con `fetch` (el de Node, sin SDK), headers `api-key`, `content-type: application/json` y `accept: application/json`, y el body `{ sender: { name, email }, to: [{ email, name? }], subject, htmlContent }`. Timeout de 10 segundos con `AbortController`. Si la respuesta no es 2xx, tira un error con el código y el mensaje que devuelve Brevo, para que el mailer lo registre en la bitácora como ya hace.
   - **`smtp`:** si hoy existe el envío con nodemailer, conservalo como opción para el desarrollo local. Si no existe, no lo agregues y sacá `nodemailer` de las dependencias.
   - **`console`:** lo que hoy hace el desarrollo sin credenciales (destinatario, asunto y links por consola).
   - **Sin `MAIL_PROVIDER`:** `brevo` si hay `BREVO_API_KEY`; si no, `smtp` si hay credenciales SMTP y existe esa opción; si no, `console`.
2. Un email a varios destinatarios sale como **un envío por persona** (como hoy), para que nadie vea las direcciones de los demás.
3. Los emails sin destinatario (menores sin email) se siguen salteando antes de llegar al proveedor.
4. Sumá en un comentario de `config/mail.js`: el plan gratuito de Brevo permite **300 emails por día**; por eso siguen saliendo por email solo los tipos de la tabla del contexto, sección 6.

## 3. Archivos subidos con Cloudinary

### 3.1 `middlewares/upload.js`

- **Mismo uso que hoy** (`upload('routines').single('image')` o como haya quedado). Los services no cambian.
- **Desarrollo** (o producción sin Cloudinary configurado, si no hay que devolver 503): disco, como hoy.
- **Producción con Cloudinary:** `multer.memoryStorage()` y, después de multer, un paso que sube el buffer con `cloudinary.uploader.upload_stream` a la carpeta `club360/<carpeta>`:
  - **imágenes** (`resource_type: 'image'`, `type: 'upload'`): públicas. Se guarda la `secure_url`;
  - **comprobantes de transferencia** (carpeta `receipts`, JPG, PNG o PDF): `resource_type: 'raw'` y **`type: 'private'`**, para que no se puedan abrir con el link. Se guarda la `secure_url` igual, solo como referencia para encontrarlo después.
- Deja en `req.file` lo mismo que hoy esperan los services (la ruta o la URL). Si hoy los services leen un campo que con memoria no existe (por ejemplo `req.file.filename`), normalizalo en el middleware, no en los services.
- Se mantienen los filtros de tipo y el límite de 5 MB.
- Usá `cloudinary` (v2) directo. **No** uses `multer-storage-cloudinary`.

### 3.2 Borrado común (`utils/`)

La función única de borrado que pide `CLAUDE.md` ("Imágenes") distingue:
- una ruta local (`/uploads/...`): `fs.unlink`, ignorando si ya no existe;
- una URL de Cloudinary: saca el `public_id` de la URL (sin la versión `v123/`; en las imágenes, sin la extensión; en los `raw`, con la extensión) y llama a `cloudinary.uploader.destroy(publicId, { resource_type, type })`.

Si hoy algún service borra con `fs` directo (por ejemplo la foto de Mi cuenta del P05), pasalo a esta función. Un error al borrar se muestra por consola y no corta la operación.

### 3.3 Descarga del comprobante (`GET /fees/payments/:id/receipt-file`)

Mismos permisos que hoy. Si `receiptUrl` es de Cloudinary:
- generá un link firmado de corta duración con `cloudinary.utils.private_download_url(publicId, '', { resource_type: 'raw', type: 'private', expires_at })` (unos 60 segundos);
- **el back lo descarga y lo reenvía** al cliente con su `Content-Type` (por la extensión). El link firmado no sale nunca al navegador;
- si Cloudinary responde error: 404, como cuando no hay acceso.

Con una ruta local, funciona como hoy.

### 3.4 Front

- El helper de URLs de imágenes (`CLAUDE.md`, "Imágenes"): deja tal cual una URL absoluta y le antepone `VITE_API_URL` a una ruta local. Si no existe, crealo y usalo en todos los lugares donde hoy se arma la URL de una imagen a mano (foto de perfil, rutinas, logo del club si hay).
- Los comprobantes se siguen descargando por el endpoint, nunca con el link guardado.

## 4. Jobs y zona horaria

Render corre en **UTC**. Revisá **todos** los `cron.schedule` de `jobs/` y confirmá que reciben `{ timezone: 'America/Argentina/Buenos_Aires' }` (o la constante de 1.1): `generateFees` (día 1, 00:05), `feeStatus` (00:15), `autoConfirmCitations` (cada 10 minutos), `integrityCheck` (02:30) y `backup` (domingos 03:00).

Revisá también que las fechas que calculan "hoy", "el mes" o "la semana" (`utils/dates.js`, `getOverdueDays`, el período de la cuota, el comprobante) no dependan de la zona horaria del servidor. Corré la verificación del punto 7 con `TZ=UTC` para comprobarlo.

**Un detalle para dejar en un comentario de `server.js`:** en Render gratis el servicio se duerme a los 15 minutos sin tráfico y mientras duerme no corre ningún job. En la demo lo mantiene despierto un servicio externo que llama a `GET /health` cada 10 minutos (`docs/deploy.md`). `/health` no tiene que consultar la base, para no generar tráfico en Railway con cada llamada.

## 5. Otros puntos de producción

1. **CORS:** `FRONTEND_URL` y `http://localhost:5173`, como hoy. Si `FRONTEND_URL` termina en `/`, normalizalo.
2. **Links de los emails:** salen siempre de `FRONTEND_URL` (recuperación, activación del staff, notificaciones). Buscá que no quede ningún `localhost` armado a mano.
3. **`api/backups/`:** se crea solo si no existe, en el arranque o al guardar el primero.
4. **`client/vercel.json`:** confirmá que existe con la reescritura de todas las rutas a `index.html`.
5. **`client/src/api/axiosClient.js`:** la base sale de `VITE_API_URL`, sin URLs fijas. Con el servicio dormido, la primera respuesta puede tardar cerca de un minuto: si el timeout es menor a 60 segundos, subilo a 60.
6. **Errores 500 en producción:** el `errorHandler` ya muestra un mensaje genérico; confirmá que tampoco manda el `stack`.
7. **Scripts que se corren desde una compu contra Railway:** `npm run seed` (y el script de datos de la demo, si existe) tienen que funcionar con solo `DATABASE_URL` en el `.env`. Revisá si existe un script de datos de la demo; **si no existe, no lo armes en este prompt: avisame**, que va en un prompt aparte.

## 6. `.env.example` y documentación del repo

1. **`api/.env.example`:** sumá las variables nuevas con comentarios en español, agrupadas (servidor, base local, base en la nube, JWT, cifrado, emails, Cloudinary, seed). Que coincidan con la tabla de variables de `docs/deploy.md`; si encontrás alguna diferencia, avisame cuál.
2. **`client/.env.example`:** `VITE_API_URL=http://localhost:3000`.
3. **`README.md`:** una sección corta "Demo deployada" con el link a `docs/deploy.md` (las URLs se completan después del deploy).
4. No modifiques `CLAUDE.md` ni `docs/contexto.md`: ya vienen con estas reglas. Si ves que no las incluyen, avisame.

## 7. Verificación

### 7.1 Back

Con un script temporal **fuera del repo**, con `TZ=UTC`:

1. **Arranque en producción:** con `NODE_ENV=production` y sin `JWT_SECRET` corta con un mensaje claro; sin las variables de Cloudinary arranca y avisa; ningún mensaje muestra valores.
2. **Mailer:**
   - `MAIL_PROVIDER=console` muestra destinatario, asunto y links;
   - `MAIL_PROVIDER=brevo` con una clave inválida: el error de Brevo (401) se registra en la bitácora y la notificación in-app se guarda igual;
   - **si el `.env` local tiene una `BREVO_API_KEY` real**, mandá un email de prueba a la casilla de `MAIL_FROM` y mostrame el `messageId`.
3. **Cloudinary** (solo si el `.env` local tiene credenciales reales; si no, avisame y lo pruebo yo después):
   - subir una imagen en modo producción → queda la `secure_url` en la base y se ve;
   - reemplazarla → la anterior se borra de Cloudinary;
   - subir un comprobante PDF → la `secure_url` sola da error al abrirla, y `receipt-file` lo devuelve con sesión;
   - otro socio pidiendo ese comprobante → 404.
4. **Jobs:** las funciones de los jobs con una fecha de prueba dan lo mismo con `TZ=UTC` que con `TZ=America/Argentina/Buenos_Aires` (por ejemplo, el 1/12 a las 00:05 de Argentina genera el período `2026-12`, no `2026-11`).
5. **`/health`** responde sin consultar la base.
6. **Integridad:** la verificación de DVH/DVV del P03 da todo correcto.

### 7.2 Front

1. `npm run build` con `VITE_API_URL=https://ejemplo.onrender.com` compila sin errores, y en el `dist/` no queda ningún `localhost:3000`. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano para hacer **en la demo deployada**, una por rol (Admin, Representante, Entrenadora, Preparadora física, Socio, Jugadora y Familia), con lo mínimo que tiene que andar: login, una pantalla de cada módulo, subir una imagen, recibir un email y recargar la página en una ruta interna.

### 7.3 Cierre

1. **Actualizá `docs/TODO.md`, Fase 7:**
   - marcá el `upload` con Cloudinary y el helper del front;
   - la tarea de la cuenta de Gmail cambiala por *"Crear las cuentas de Cloudinary y Brevo (con la casilla del equipo verificada como remitente)"*;
   - sumá *"Emails por la API de Brevo en producción, porque Render gratis bloquea SMTP (P17)"* y marcala;
   - sumá *"Base de datos en Railway"*, *"Servicio externo que llama a /health cada 10 minutos"* y *"Cargar el seed y los datos de la demo en Railway"*, sin marcar (los hace Sofía).

   En la Fase 6, si sigue abierta la tarea de pasar a Gmail SMTP, marcala `[-]` con *"reemplazado por Brevo el 11/11/2026 (contexto, sección 11)"*. Agregá la línea al Registro.
2. Mostrame el resultado de la verificación, lo que no pudiste probar sin credenciales reales y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
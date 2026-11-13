# Club360 — Guía de deploy de la demo

Pasos manuales para publicar la demo: las cuentas, los paneles y la carga de datos. Lo que se resuelve en el código está en el P17 (`docs/prompts/PROMPT_17_deploy.md`); **esta guía se sigue después de integrar el P17 a `main`**.

En el repo, esta guía va en `docs/deploy.md`.

## Resumen

| Pieza | Servicio | Plan |
|---|---|---|
| Base de datos MySQL | Railway | Prueba (crédito único de USD 5) o Hobby (USD 5 por mes) |
| Backend (`api/`) | Render | Gratuito |
| Frontend (`client/`) | Vercel | Gratuito (Hobby) |
| Imágenes y comprobantes | Cloudinary | Gratuito |
| Emails | Brevo (API HTTP) | Gratuito, 300 emails por día |
| Mantener despierto el back | cron-job.org | Gratuito |

**Por qué Brevo y no Gmail:** el plan gratuito de Render bloquea la salida por los puertos SMTP (25, 465 y 587), así que nodemailer con Gmail no puede enviar desde ahí. La API de Brevo va por HTTPS.

**Por qué el servicio externo:** Render gratis se duerme a los 15 minutos sin tráfico y, mientras duerme, no corre ningún job (cuotas, confirmación de citaciones, integridad, backup). Un llamado a `/health` cada 10 minutos lo mantiene despierto. Las 750 horas gratis por mes de Render alcanzan para un servicio prendido todo el mes, **si no hay otro servicio gratuito en la misma cuenta** (por ejemplo, el back de HotelDesk): las horas son por cuenta, no por servicio.

**Orden:** Cloudinary y Brevo → Railway → Render → Vercel → volver a Render → datos → servicio externo → prueba.

Anotá cada valor que se genera (contraseñas, claves, URLs) en un lugar privado del equipo. **Nada de esto se sube al repo.**

---

## 1. Cloudinary

1. Creá la cuenta en cloudinary.com (plan gratuito).
2. En el panel (**Dashboard** o **Settings → API Keys**), copiá:
   - `Cloud name` → `CLOUDINARY_CLOUD_NAME`
   - `API Key` → `CLOUDINARY_API_KEY`
   - `API Secret` → `CLOUDINARY_API_SECRET`
3. No hace falta crear carpetas: el back sube todo a `club360/<carpeta>`.
4. Los comprobantes de transferencia se guardan como privados y el back los descarga con un link firmado, así que no hace falta habilitar la entrega pública de PDFs.

## 2. Brevo

1. Si todavía no existe, creá la **cuenta de Gmail del equipo** (por ejemplo `club360.demo@gmail.com`). Es la casilla desde la que van a salir los emails.
2. Creá la cuenta en brevo.com (plan gratuito) con esa casilla. Brevo puede pedir completar el perfil y activar la cuenta antes de dejar enviar: hacelo primero.
3. **Remitente:** en **Senders, Domains & Dedicated IPs → Senders**, agregá la casilla del equipo como remitente y verificala con el código que llega a esa casilla.
4. **Clave de la API:** en **SMTP & API → API Keys**, generá una clave nueva (nombre: `club360-render`) → `BREVO_API_KEY`.
5. **A tener en cuenta:** al no tener dominio propio, algunos emails pueden caer en spam. Para la demo, avisá a quienes prueben que revisen esa carpeta. El dominio propio queda en Futuro (contexto, sección 7).

## 3. Railway (base de datos)

1. En railway.com, **New Project → Database → MySQL**.
2. **Región:** en el servicio de MySQL, **Settings → Region**, elegí **US East (Virginia)**, la misma zona que el back en Render.
3. **Acceso desde afuera:** en **Settings → Networking**, agregá **Public Access** (TCP Proxy). Se completa la variable `MYSQL_PUBLIC_URL` del servicio.
4. En la pestaña **Variables** del servicio de MySQL, copiá el valor de `MYSQL_PUBLIC_URL` → es la `DATABASE_URL` de Render. Tiene la forma `mysql://root:<contraseña>@<host>.proxy.rlwy.net:<puerto>/railway`.
5. **Plan:** revisá en **Usage** cuánto crédito te queda. La prueba da un crédito único de USD 5; cuando se termina, el plan gratuito solo da USD 1 por mes, que probablemente no alcance para tener MySQL prendido todo el mes. Si la demo tiene que estar viva hasta la defensa, conviene pasar a Hobby (USD 5 por mes). El tráfico por la conexión pública se cobra como salida de red.

## 4. Render (backend)

1. En render.com, **New → Web Service**, conectá el repo de Club360 en GitHub.
2. Configuración:

   | Campo | Valor |
   |---|---|
   | Name | `club360-api` (define la URL: `https://club360-api.onrender.com`) |
   | Region | **Virginia (US East)** |
   | Branch | `main` |
   | Root Directory | `api` |
   | Runtime | Node |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | **Free** |
   | Health Check Path (en Advanced) | `/health` |

3. **Variables de entorno** (Environment). `PORT` no se carga: la define Render.

   | Variable | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | `MYSQL_PUBLIC_URL` de Railway (paso 3.4) |
   | `DB_SSL` | `true` |
   | `DB_FORCE_SYNC` | `false` |
   | `DB_ALTER_SYNC` | `false` |
   | `FRONTEND_URL` | Por ahora `https://club360.vercel.app`; se corrige en el paso 6 |
   | `JWT_SECRET` | Una clave nueva y larga (ver abajo) |
   | `JWT_ACTIVATION_SECRET` | Otra clave nueva, distinta |
   | `JWT_EXPIRES_IN` | `24h` |
   | `JWT_EMAIL_EXPIRES_IN` | `1h` |
   | `JWT_ACTIVATION_EXPIRES_IN` | `48h` |
   | `ENCRYPTION_KEY` | Una clave nueva, **con el mismo formato que la del `.env` local** (mirá el comentario en `.env.example`) |
   | `BCRYPT_SALT_ROUNDS` | `10` |
   | `MAIL_PROVIDER` | `brevo` |
   | `BREVO_API_KEY` | La del paso 2.4 |
   | `MAIL_FROM` | La casilla verificada en Brevo |
   | `MAIL_FROM_NAME` | `Club360` |
   | `CLOUDINARY_CLOUD_NAME` | Paso 1.2 |
   | `CLOUDINARY_API_KEY` | Paso 1.2 |
   | `CLOUDINARY_API_SECRET` | Paso 1.2 |

   Si después del P17 el `.env.example` tiene alguna variable que no está en esta tabla, cargala también.

   **Para generar las claves**, en una terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   Generá una distinta para cada secreto.

   > **Ojo con `ENCRYPTION_KEY`:** los teléfonos se guardan cifrados con esa clave. Una vez cargados los datos de la demo **no se cambia más**, porque los teléfonos ya guardados no se podrían leer.

4. **Create Web Service.** El primer deploy tarda unos minutos. Al arrancar, `sync()` crea las tablas vacías en Railway.
5. Probá `https://club360-api.onrender.com/health`: tiene que responder `{ success: true, ... }`. Si falla, mirá **Logs** en Render (el chequeo de arranque del P17 dice qué variable falta).

## 5. Vercel (frontend)

1. En vercel.com, **Add New → Project**, importá el mismo repo.
2. Configuración:

   | Campo | Valor |
   |---|---|
   | Project Name | `club360` (define la URL: `https://club360.vercel.app`, si está libre) |
   | Framework Preset | Vite |
   | Root Directory | `client` |
   | Build Command | `npm run build` (el que propone) |
   | Output Directory | `dist` (el que propone) |

3. **Variable de entorno:** `VITE_API_URL` = `https://club360-api.onrender.com` (sin `/` al final).
4. **Deploy.** Anotá la URL de producción que muestra Vercel (la del proyecto, no la de cada deploy).

> Las variables `VITE_*` se leen al compilar: si cambiás `VITE_API_URL`, hay que volver a deployar (**Deployments → Redeploy**).

## 6. Volver a Render

1. En Render, **Environment**, poné en `FRONTEND_URL` la URL de producción de Vercel (sin `/` al final).
2. Guardá: Render vuelve a deployar solo.

## 7. Cargar los datos

El seed y los datos de la demo se corren **desde una compu**, contra Railway (Render gratis no tiene consola).

1. En `api/.env` local, **guardá una copia** del archivo y cambiá temporalmente:
   - `DATABASE_URL` = `MYSQL_PUBLIC_URL` de Railway;
   - `DB_SSL=true`;
   - `ENCRYPTION_KEY` = **la misma que cargaste en Render**;
   - `SEED_ADMIN_*` = los datos reales del usuario Admin de la demo (con un email al que tengan acceso).
   - `SEED_DEMO_PASSWORD` = la contraseña común de los usuarios de la demo, y `SEED_DEMO_EMAIL` = la casilla del equipo (los usuarios reciben alias `casilla+usuario@gmail.com`).
   - `SEED_DEMO_REAL_EMAILS` = los emails personales del equipo para los 4 usuarios que los reciben de verdad (`ctorres=...,gromero=...,nibanez=...,vruiz=...`). Ninguno puede ser el mismo que `SEED_ADMIN_EMAIL`.
   - Verificá que `DB_FORCE_SYNC` y `DB_ALTER_SYNC` estén en `false`: **con `true` se borra la base de la demo**.
2. En `api/`: `npm run seed`.
3. `npm run seed:demo`. Anotá el número de socio y el código de vínculo que muestra al final (son para los casos en vivo; la lista de usuarios está en `docs/demo-usuarios.md`).
   - **Correlo el día de la defensa o el anterior:** las fechas se calculan desde ese día y las citaciones Pendientes vencen a las 24 horas. Para volver a cargarlo después de los ensayos: `npm run seed:demo -- --reset` (borra todo lo del club salvo el seed; la bitácora queda).
4. **Volvé a dejar el `.env` local como estaba** (la copia del paso 1). Así nadie trabaja sin querer contra la base de la demo.
5. Entrá a la demo con el Admin y, desde **Integridad**, verificá que todo dé correcto.

## 8. Mantener despierto el back

1. Creá una cuenta en cron-job.org.
2. **Create cronjob:**
   - URL: `https://club360-api.onrender.com/health`
   - Schedule: **cada 10 minutos**
   - Notificaciones: activá el aviso por email si falla varias veces seguidas.
3. Después de unas horas, revisá en el historial de cron-job.org que las respuestas sean 200.

## 9. Probar la demo

1. Recorré la lista de pruebas por rol que dejó el P17 (sección 7.2). Como mínimo:
   - entrar con cada rol;
   - recargar la página en una ruta interna (por ejemplo `/fees`): no tiene que dar 404;
   - subir una imagen (foto de Mi cuenta o rutina) y verla;
   - adjuntar un comprobante de transferencia y abrirlo como Admin;
   - recibir un email (recuperación de contraseña o una citación) y que el link lleve a la URL de Vercel.
2. **Backups:** el disco de Render se borra en cada deploy o reinicio. Antes de la defensa, generá un backup desde la pantalla de Backup y **descargalo**.
3. Completá las URLs de la demo en el `README.md` y en `docs/TODO.md`, Fase 7.

## 10. Si algo falla

| Síntoma | Qué revisar |
|---|---|
| Render no arranca | **Logs**: el chequeo de arranque dice qué variable falta |
| Error de conexión a la base | `DATABASE_URL` es la **pública** de Railway (`proxy.rlwy.net`) y Public Access está activo. Si el error menciona SSL, probá `DB_SSL=false` |
| El front muestra errores de CORS | `FRONTEND_URL` en Render es exactamente la URL de Vercel, sin `/` al final |
| El front llama a `localhost` | Falta `VITE_API_URL` en Vercel, o no se volvió a deployar después de cargarla |
| 404 al recargar una ruta | Falta `client/vercel.json` |
| No llegan los emails | Remitente verificado en Brevo, cuenta activada, carpeta de spam, y la bitácora (los errores de email se registran ahí) |
| Las imágenes no se suben (503) | Faltan las variables de Cloudinary en Render |
| La primera carga tarda un minuto | El back estaba dormido: revisá que cron-job.org esté llamando a `/health` |
| Los jobs no corrieron (cuotas, citaciones) | Lo mismo: el back estuvo dormido en ese horario |
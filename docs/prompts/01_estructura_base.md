# Prompt 01 — Estructura base de Club360

Vas a crear la estructura base del proyecto Club360. Antes de empezar, leé `CLAUDE.md` (convenciones obligatorias) y `docs/contexto.md` (secciones 2, 4, 8 y 11).

**Alcance de esta tarea.** Creá **todos** los archivos que se describen en este prompt. Hay dos tipos:

- **Con código completo y funcionando:** la configuración, `app.js` y `server.js`, los middlewares, los utils, los `package.json` y los `.env.example`, y la base del front (axios, contexto de sesión, hooks y rutas).
- **Esqueletos:** se crean, pero solo con comentarios y un export vacío, para que la estructura exista y las tareas siguientes los completen. Son `models/index.js`, los 4 archivos de cada uno de los 15 módulos, `seed/seed.js` y `jobs/index.js`. En cada uno, el prompt dice qué comentario lleva.

Lo que **no** se hace en esta tarea:
- Crear los archivos de los 24 modelos (`User.js`, `Member.js`, etc.).
- Escribir la lógica de los endpoints dentro de los módulos.
- Escribir los datos y los inserts del seed.
- Crear cualquier cosa del bot de consultas.

Esas son las tareas siguientes de `docs/TODO.md`. **No** hagas commit: cuando termines, mostrame el resumen para que lo revise.

Referencia de patrones: el repo HotelDesk (https://github.com/sofiabacher/HotelDesk). Si lo consultás, adaptá sus patrones a esta estructura. No copies sus errores: archivos duplicados, URLs hardcodeadas, `.env` subido al repo, seed que se ejecuta al arrancar el servidor, rutas del front protegidas por rol.

## 1. Árbol de carpetas

```
club360/
├── CLAUDE.md            (ya existe)
├── README.md
├── .gitignore
├── docs/                (ya existe: contexto.md, DER_logico.jpg, TODO.md, prompts/)
├── api/
│   ├── package.json
│   ├── .env.example
│   ├── uploads/.gitkeep
│   ├── backups/.gitkeep
│   └── src/
│       ├── server.js
│       ├── app.js
│       ├── config/          index.js, db.js, mail.js
│       ├── models/          index.js (solo comentario, sin modelos todavía)
│       ├── modules/         15 módulos (ver punto 4)
│       ├── middlewares/     cors.js, errorHandler.js, validateFields.js, upload.js, isAuth.js, checkPermission.js
│       ├── jobs/            index.js
│       ├── utils/           constants.js, messages.js, errors.js, token.js, crypto.js, integrity.js, logger.js
│       │   └── mailer/      templates.js, senders.js
│       └── seed/            seed.js
└── client/
    ├── package.json
    ├── .env.example
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx, App.jsx, theme.js
        ├── api/             axiosClient.js, auth.api.js
        ├── context/         AuthContext.jsx
        ├── hooks/           useAuth.js, usePermission.js
        ├── routes/          AppRouter.jsx, PermissionRoute.jsx
        ├── layouts/         .gitkeep
        ├── components/common/  .gitkeep
        ├── pages/<módulo>/  .gitkeep (una carpeta por cada uno de los 15 módulos)
        └── utils/           constants.js
```

## 2. Raíz

- **`.gitignore`:** `node_modules/`, `.env` y variantes (`.env.local`, `.env.*.local`), `dist/`, `build/`, `api/uploads/*` y `api/backups/*` (manteniendo sus `.gitkeep`), `bot/`, `*.log`, `.vscode/`, `.idea/`, `.DS_Store`, `Thumbs.db`.
- **`README.md`:** descripción corta, integrantes (Sofía Bacher, Thiago Chaile, Ignacio Jericó, Julián Prol), stack, y pasos para levantar en local: crear la base `club360` en MySQL (`utf8mb4`), `cp .env.example .env`, `npm install`, `npm run dev`, `npm run seed` (una sola vez) en `api/`, y `npm install` + `npm run dev` en `client/`. Mencionar el endpoint `/health` para comprobar que la API responde.

## 3. Backend (`api/`)

### `package.json`
- Scripts: `start` → `node src/server.js`, `dev` → `node --watch src/server.js`, `seed` → `node src/seed/seed.js`.
- Dependencias: `bcrypt`, `dotenv`, `express` (v5), `express-validator`, `jsonwebtoken`, `multer`, `mysql2`, `mysqldump`, `node-cron`, `resend`, `sequelize` (v6). Sin devDependencies.

### `.env.example` (con comentarios en español)
`NODE_ENV`, `PORT=3000`, `DB_FORCE_SYNC=false`, `DB_ALTER_SYNC=false`, `DB_NAME=club360`, `DB_USER`, `DB_PASS`, `DB_HOST=localhost`, `DB_PORT=3306`, `DATABASE_URL` (comentada; para la demo en la nube), `BCRYPT_SALT_ROUNDS=10`, `JWT_SECRET`, `JWT_ACTIVATION_SECRET`, `JWT_EXPIRES_IN=24h`, `JWT_EMAIL_EXPIRES_IN=1h`, `ENCRYPTION_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL=http://localhost:5173`.

### `config/`
- **`index.js`:** único lugar que lee `process.env` (con `dotenv`). Exporta los objetos `app` (env, port, isDev, isProd, forceSync, alterSync), `db` (url, name, user, password, host, port), `bcrypt`, `jwt`, `encryption`, `email` y `cors` (origin).
- **`db.js`:** instancia de Sequelize para MySQL con `logging: false`, `timezone: '-03:00'` y `define: { freezeTableName: true }`. Si existe `db.url` (`DATABASE_URL`), la usa con SSL (`require: true, rejectUnauthorized: false`). Si no, usa las variables separadas para el MySQL local.
- **`mail.js`:** transporter con Resend, como en HotelDesk, pero con el remitente tomado de `EMAIL_FROM`. Si no hay `RESEND_API_KEY`, no envía: muestra destinatario y asunto por consola (para desarrollo).

### `app.js` y `server.js`
- **`app.js`:** crea Express, aplica `express.json()` y `cors`, sirve `/uploads` como estático, define `GET /health` → `{ success: true, message: 'API de Club360 funcionando' }`, monta las rutas de los 15 módulos (`/auth`, `/access`, `/clubs`, `/members`, `/staff`, `/inscriptions`, `/fees`, `/leagues`, `/games`, `/citations`, `/routines`, `/notifications`, `/logs`, `/integrity`, `/backup`) y al final el `errorHandler`. Exporta `app` sin hacer `listen`.
- **`server.js`:** importa `./models`, autentica la conexión, **corta el arranque si `forceSync` o `alterSync` están activados en producción**, hace `sequelize.sync({ force, alter })`, inicia los jobs y hace `listen`. Si hay error: lo muestra y sale con `process.exit(1)`.

### `middlewares/`
- **`cors.js`:** como el de HotelDesk, pero los orígenes permitidos son `FRONTEND_URL` y `http://localhost:5173` (sin URLs hardcodeadas de deploy). Responde 200 a los `OPTIONS`.
- **`errorHandler.js`:** responde `{ success: false, code, message }` con `err.status` o 500. En producción, los 500 muestran un mensaje genérico.
- **`validateFields.js`:** con `validationResult`. Si hay errores, responde 400 con `{ success: false, errors: [{ field, message }] }`. Usar `err.path` (en express-validator v7 el campo `param` ya no existe).
- **`upload.js`:** fábrica `upload(folder)` que devuelve un multer con `diskStorage` en `api/uploads/<folder>/` (crea la carpeta si no existe), nombre único, solo JPG/PNG/WEBP y máximo 5 MB. Uso: `upload('routines').single('image')`. Agregar un comentario: *PENDIENTE: en Render el disco no es persistente, definir solución antes del deploy*.
- **`isAuth.js`:** lee `Authorization: Bearer <token>`, lo verifica con `verifySessionToken`, busca el usuario (`id`, `clubId`, `userStateId`) y exige que su estado sea `USER_STATES.ACTIVE`. Si fue eliminado, responde 423 con `code: 'USER_DELETED'`. Deja `req.user = { id, clubId, activeRoleId }` (el `activeRoleId` sale del token). Los modelos se requieren adentro de la función, porque todavía no existen.
- **`checkPermission.js`:** `checkPermission('módulo.acción')`. Busca el permiso por `name` y lo concede si existe en `RolePermission` con `roleId = req.user.activeRoleId` **o** en `UserPermission` con `userId = req.user.id`. **No** se suman los permisos de los otros roles del usuario. Si no lo tiene, responde 403.

### `utils/`
- **`errors.js`:** clase `AppError` con `status` y función `createError(message, statusCode)`, como el `errorHelper` de HotelDesk.
- **`constants.js`:** mapeos de estados. Agregar un comentario arriba avisando que se replican en `client/src/utils/constants.js` y que los marcados `[A DEFINIR]` son una propuesta a confirmar:
  - `USER_STATES = { PENDING: 1, ACTIVE: 2, BLOCKED: 3, DELETED: 4 }` [A DEFINIR]
  - `MEMBER_STATES = { ACTIVE: 1, INACTIVE: 2 }` [A DEFINIR]
  - `INSCRIPTION_STATES = { PENDING: 1, APPROVED: 2, REJECTED: 3, CANCELLED: 4 }` [A DEFINIR]
  - `FEE_STATES = { PENDING: 1, PAID: 2, OVERDUE: 3 }` [A DEFINIR]
  - `TRANSACTION_STATES = { PENDING: 1, APPROVED: 2, REJECTED: 3 }`
  - `CITATION_STATES = { PENDING: 1, CONFIRMED: 2, REJECTED: 3, AUTO_CONFIRMED: 4 }` [A DEFINIR]
  - `GAME_STATES = { SCHEDULED: 1, PLAYED: 2, CANCELLED: 3 }` [A DEFINIR]
  - `CRITICITY = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }`
  - `LOG_ACTIONS` con el formato `{ message, criticity }`, empezando por: `LOGIN_SUCCESS`, `LOGIN_FAIL`, `LOGOUT`, `ROLE_SWITCH`, `USER_BLOCKED`, `ACCESS_DENIED`, `MAIL_ERROR`
  - `LOGIN_MAX_ATTEMPTS = 5`
- **`messages.js`:** mensajes al usuario agrupados por módulo, en español rioplatense. Para empezar, `auth`: `tokenRequired`, `invalidToken`, `userNotFound`, `inactiveUser`, `accessDenied`.
- **`token.js`:** `generateLoginToken({ id, clubId, activeRoleId })` / `verifySessionToken(token)` con `JWT_SECRET`, y `generateEmailToken(userId)` / `verifyEmailToken(token)` con `JWT_ACTIVATION_SECRET`. Las funciones `verify*` devuelven `{ valid, payload | error }`.
- **`crypto.js`:** `hashPassword` / `comparePassword` con bcrypt (irreversible), y `encrypt` / `decrypt` con AES-256-GCM (reversible). La clave sale de `ENCRYPTION_KEY` pasada por SHA-256, así siempre mide 32 bytes. El formato guardado es `iv:authTag:contenido` en hex.
- **`integrity.js`:** `calculateDVH(row)` y `calculateDVV(rows)` con el mismo algoritmo de módulo 11 y pesos 2..7 que HotelDesk. El DVH excluye `dvh`, `createdAt` y `updatedAt` y trata los `null` como string vacío. La verificación y el recálculo por tabla irán en `modules/integrity`.
- **`logger.js`:** `logger({ clubId, userId, roleId }, LOG_ACTIONS.X, details)` crea un registro en `Log` con `action = message` y `criticity`. Si falla, solo lo muestra por consola y nunca corta el flujo. Requiere el modelo adentro de la función.
- **`mailer/templates.js`:** función `signature(html)` con un pie de Club360 y una primera plantilla, `buildRecoveryEmail({ name, link })`, que devuelve `{ subject, html }`. En español rioplatense.
- **`mailer/senders.js`:** `sendRecoveryEmail(user, token)` arma el link `${FRONTEND_URL}/reset-password?token=...`, envía con el transporter y, si falla, lo registra con `LOG_ACTIONS.MAIL_ERROR` y relanza el error.

### `jobs/index.js`
Exporta `start()`, que recorre un array de jobs (vacío por ahora) y los inicia. Agregar un comentario con los jobs previstos: `generateFees.job.js` (cuota mensual), `overdueFees.job.js` (mora y avisos desde el primer mes), `autoConfirmCitations.job.js` (confirma las citaciones sin respuesta pasadas las 24 hs) y `backup.job.js` (opcional).

### `seed/seed.js`
Esqueleto ejecutable con `npm run seed`: autentica, hace `sync`, abre una transacción vacía y sale con código 0 o 1. Agregar un comentario con los pasos previstos: catálogo de deportes, club Valencia, activación de Vóley (`clubSport`), permisos + los 7 roles base (`isBase = 1`) con sus permisos, usuario Admin, y recálculo de DVH/DVV. Los datos van en una constante `SEED_DATA`, para que cargar otro club sea solo cambiar esos datos.

### `models/index.js`
Solo un comentario: se crea un modelo por archivo y las asociaciones se definen todas acá. Listar los 24 modelos agrupados por módulo del DER. Exportar `{}`.

## 4. Módulos del backend

Crear `api/src/modules/<módulo>/` para cada uno: **auth, access, clubs, members, staff, inscriptions, fees, leagues, games, citations, routines, notifications, logs, integrity, backup**. Cada carpeta lleva 4 archivos:

- `<módulo>.routes.js`: comentario con la descripción del módulo, `express.Router()` vacío exportado, y los `require` de `isAuth`, `checkPermission`, `validateFields`, controller y validator comentados, con una ruta de ejemplo comentada.
- `<módulo>.controller.js`: comentario con la responsabilidad de la capa (lee `req`, llama al service, responde `{ success, data | message }`, sin lógica de negocio). Exporta `{}`.
- `<módulo>.service.js`: comentario con la responsabilidad de la capa (lógica de negocio, filtra por `clubId`, registra en la bitácora). Exporta `{}`.
- `<módulo>.validator.js`: comentario + `require` de express-validator comentado. Exporta `{}`.

Descripciones: auth (login, registro con número de socio, activación, recuperación de contraseña, cambio de rol activo), access (roles, permisos y su asignación), clubs (parámetros del club y activación de deportes), members (socios, vínculo familiar, mayoría de edad), staff (alta/baja de staff), inscriptions (inscripción y baja a un deporte, aprobación), fees (cuotas sociales y deportivas, pagos simulados), leagues (ligas, categorías, asignación de jugadoras y staff), games (partidos/fixture y detección de superposiciones), citations (generación, respuesta, confirmación automática), routines (rutinas semanales), notifications (in-app y email), logs (bitácora y exportación CSV), integrity (verificación y recálculo de DVH/DVV), backup (backup y restore).

## 5. Frontend (`client/`)

- **`package.json`:** `"type": "module"`, scripts `dev`, `build` y `preview`. Dependencias: `@emotion/react`, `@emotion/styled`, `@fontsource/poppins`, `@mui/material` (v7), `@mui/icons-material`, `@mui/x-date-pickers`, `axios`, `date-fns`, `jwt-decode`, `react` (v19), `react-dom`, `react-router-dom` (v7). DevDependencies: solo `vite` y `@vitejs/plugin-react` (sin ESLint).
- **`.env.example`:** `VITE_API_URL=http://localhost:3000`.
- **`index.html`:** `lang="es"`, título "Club360".
- **`main.jsx`:** `BrowserRouter` → `ThemeProvider` + `CssBaseline` → `AuthProvider` → `App`.
- **`theme.js`:** `createTheme` con Poppins, primario `#1E40AF`, secundario `#F59E0B`, fondo `#F8FAFC`. Comentario: colores provisorios.
- **`api/axiosClient.js`:** instancia de axios con `baseURL: import.meta.env.VITE_API_URL` y timeout de 10 s. Un interceptor agrega `Bearer` con el token de `localStorage`. Otro, ante un 401 (salvo en `/auth/login`) o un 423, limpia la sesión y redirige a `/login` una sola vez. Exporta `clearSession`.
- **`api/auth.api.js`:** `login`, `switchRole` y `getMe` usando `axiosClient`. Comentario: cada módulo tiene su `<módulo>.api.js` y las páginas nunca usan axios directamente.
- **`context/AuthContext.jsx`:** estado `user`, `roles`, `activeRole` y `permissions` (nombres de los permisos efectivos), con `startSession({ token, user, roles, activeRole, permissions })`, `endSession()` e `isAuthenticated`.
- **`hooks/useAuth.js`** y **`hooks/usePermission.js`**: `hasPermission(name)`, que verifica permisos y nunca nombres de rol.
- **`routes/PermissionRoute.jsx`:** sin sesión → `/login`. Con la prop `permission` y sin ese permiso → `/`. Si no, renderiza `children`.
- **`routes/AppRouter.jsx`:** rutas `/` y `/login` con una página provisoria (un `Typography` de MUI), una ruta protegida de ejemplo comentada y `*` → `/`.
- **`utils/constants.js`:** los mismos mapeos de estados que el backend, como `export const`.

## 6. Verificación

1. `cd api && npm install`, y después comprobar sin base de datos que `require('./src/app')` carga y que `GET /health` responde (podés levantar `app` en un puerto temporal con un script de `node -e`). Comprobar también que `decrypt(encrypt('hola')) === 'hola'`.
2. `cd client && npm install && npm run build` tiene que compilar sin errores. Después borrá `dist/`.
3. Actualizá `docs/TODO.md`: marcá como hecha la tarea "Estructura base del proyecto" de la Fase 0 (si la verificación pasó) y agregá la línea correspondiente en el Registro.
4. Mostrame el árbol final (sin `node_modules`) y un resumen de lo creado, con cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
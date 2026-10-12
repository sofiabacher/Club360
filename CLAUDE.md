# Club360 — Guía para Claude Code

Plataforma web de gestión para clubes deportivos (proyecto integrador escolar). Se desarrolla en profundidad un solo caso real: **club Valencia, deporte Vóley**. La arquitectura es multi-club desde el diseño.

## Documentación de referencia

- `docs/contexto.md`: documento de contexto del proyecto (roles, reglas de negocio, módulos del MVP, decisiones de modelado). Es una copia del documento que se mantiene en claude.ai; si se actualiza allá, se reemplaza esta copia.
- `docs/DER_logico.jpg`: DER lógico (24 entidades). **Si la imagen y `docs/contexto.md` no coinciden, manda el contexto.** Diferencias conocidas (la imagen quedó desactualizada):
  - `fee`: `memberId` y `period` **no** son únicos por separado. La restricción es un índice único compuesto `(memberId, period)`.
  - `role`: `name` **no** es único en toda la base. La restricción es un índice único compuesto `(clubId, name)`, para que cada club pueda tener sus propios roles base ("Socio", "Jugadora", etc.).
  - `user.password` admite NULL: queda vacío desde el alta presencial hasta que el socio completa su registro con el número de socio. El login rechaza usuarios sin contraseña.
  - `member.memberAdultId` pasa a ser `adultUserId` y apunta a `user` (no a `member`), porque el adulto Familia puede no ser Socio.
  - `dvv.table_name`, `routine.image_url` y `routine.video_url` pasan a camelCase: `tableName`, `imageUrl`, `videoUrl`.

**Si algo no está definido en este archivo, en el contexto o en el DER, preguntar antes de asumir un criterio.**

## Stack

- Backend: Node.js, Express 5, Sequelize 6, MySQL 8, JWT, express-validator, multer, node-cron, Resend (email). JavaScript con CommonJS (`require`).
- Frontend: React 19, Vite, Material UI 7, React Router 7, axios. JavaScript con ES Modules (`import`).
- Sin TypeScript, sin ESLint/Prettier, sin tests automatizados por ahora.

## Comandos

```bash
# api/
npm run dev      # servidor con recarga automática (node --watch)
npm start        # servidor
npm run seed     # carga inicial del club (se corre a mano, no al arrancar)

# client/
npm run dev      # Vite en http://localhost:5173
npm run build
```

## Estructura

```
api/src/
  server.js            Arranque: conexión, sync, jobs, listen
  app.js               Express: middlewares y montaje de rutas de cada módulo
  config/              index.js (lee el .env una sola vez), db.js, mail.js
  models/              Un modelo por archivo + index.js con TODAS las asociaciones
  modules/<módulo>/    <módulo>.routes.js, .controller.js, .service.js, .validator.js
  middlewares/         isAuth, checkPermission, validateFields, upload, cors, errorHandler
  jobs/                Tareas programadas (node-cron), una por archivo
  utils/               constants, messages, errors, token, crypto, integrity, logger, mailer/
  seed/seed.js         Carga inicial
client/src/
  api/                 axiosClient.js + un <módulo>.api.js por módulo
  context/             AuthContext (usuario, roles, rol activo, permisos)
  hooks/               useAuth, usePermission
  routes/              AppRouter + PermissionRoute
  layouts/             Layouts de dashboard
  components/common/   Componentes reutilizables
  components/<módulo>/ Componentes propios de un módulo
  pages/<módulo>/      Páginas de cada módulo
  utils/constants.js   Mismo mapeo de estados que el backend
```

Módulos: auth, access, clubs, members, staff, inscriptions, fees, leagues, games, citations, routines, notifications, logs, integrity, backup.

## Capas del backend (respetar la responsabilidad de cada una)

`route → validator + validateFields → controller → service → model`

- **routes:** define el endpoint y encadena `isAuth`, `checkPermission('módulo.acción')`, las reglas del validator, `validateFields` y el controller.
- **validator:** reglas de express-validator. Solo formato de los datos, no reglas de negocio.
- **controller:** lee `req`, llama al service y responde. Sin lógica de negocio ni acceso a modelos. Errores con `next(error)`.
- **service:** lógica de negocio y acceso a modelos. Lanza errores con `createError(mensaje, status)` de `utils/errors.js`.
- **model:** definición de Sequelize. Las asociaciones van solo en `models/index.js`.

Formato de respuesta: `{ success: true, data }` o `{ success: false, message }`.

## Reglas transversales (obligatorias)

- **Multi-tenant:** toda entidad de negocio tiene `clubId`. Todo service filtra por `req.user.clubId`; nunca se toma el clubId del body.
- **Permisos, no roles:** el back verifica con `checkPermission('módulo.acción')` y el front con `usePermission()` / `PermissionRoute`. Nunca se compara el nombre de un rol para dar acceso.
- **Rol activo:** el JWT lleva `id`, `clubId` y `activeRoleId`. Los permisos efectivos son los del rol activo + los permisos directos del usuario (`user_permission`), no la suma de todos sus roles. Cambiar de rol genera un token nuevo.
- **Nombres de permisos:** `módulo.acción` (ej. `fees.manage`, `citations.create`). El catálogo es fijo (41 permisos) y vive en `api/src/utils/permissions.js`: en las rutas se usan sus constantes (`checkPermission(PERMISSIONS.FEES_MANAGE)`), nunca strings sueltos. El Admin no puede crear ni modificar permisos, solo roles.
- **Estados:** los campos de estado son `INT NOT NULL DEFAULT 1`, sin tabla de estados. El mapeo vive en `api/src/utils/constants.js` y se replica en `client/src/utils/constants.js`. Nunca escribir números mágicos: usar las constantes.
- **Dígitos verificadores:** las tablas de negocio tienen `dvh`. El DVH de cada registro y el DVV de cada tabla se calculan **automáticamente** con los hooks de `models/integrityHooks.js`: no se calculan a mano en los services. Para que funcionen, toda escritura tiene que pasar por Sequelize (nunca SQL directo con `sequelize.query` para insertar, modificar o borrar datos de negocio) y, si se usa una transacción, hay que pasarla en `options.transaction`. La tabla `log` no tiene `dvh`.
- **Bitácora:** las acciones relevantes se registran con `utils/logger.js`, indicando `clubId`, `userId` y `roleId` (el rol activo). Las acciones se definen en `LOG_ACTIONS` de `constants.js`.
- **Encriptación:** contraseñas con bcrypt (`hashPassword`); datos sensibles reversibles con `encrypt`/`decrypt` de `utils/crypto.js`.
- **Seed:** la carga inicial se hace solo con `npm run seed`, nunca al arrancar el servidor. Es idempotente (se puede correr varias veces). Los datos del club están en `seed/data/club.js` y los del usuario Admin en el `.env` (`SEED_ADMIN_*`).
- **Configuración:** todo valor de entorno se lee desde `config/index.js`, no con `process.env` en otros archivos. Las URLs no se hardcodean.

## Convenciones

- Código, tablas y campos en **inglés camelCase**, igual que el DER (`member`, `numMember`, `clubSport`, `priceFee`). Mensajes al usuario e interfaz en **español** (rioplatense, con voseo).
- Archivos del backend con el nombre del módulo: `fees.service.js`. Modelos en PascalCase singular: `Member.js`.
- Componentes y páginas de React en PascalCase: `FeesPage.jsx`. Las páginas no usan axios directamente: llaman a funciones de `api/<módulo>.api.js`.
- Mensajes al usuario centralizados en `api/src/utils/messages.js`.
- No crear archivos duplicados de prueba (`-copia`, `-v2`, `-Nombre`): usar ramas de git.

## Base de datos

- Desarrollo: MySQL local (variables `DB_*` del `.env`). Demo: base en la nube con `DATABASE_URL` (SSL).
- Las tablas se crean con `sequelize.sync()` (sin migraciones). `DB_FORCE_SYNC=true` borra y recrea todo; `DB_ALTER_SYNC=true` ajusta sin borrar. Ambos están bloqueados en producción.
- Los nombres de tabla son los del DER (`freezeTableName: true`).

## Lista de tareas (`docs/TODO.md`)

`docs/TODO.md` es la lista de todo lo que falta del proyecto. Mantenerla al día es parte de cada tarea:

- **Al empezar** una tarea, leé `docs/TODO.md` para ubicarla y revisá si depende de algo pendiente o bloqueado (`[!]`). Si depende de una decisión pendiente (D1, D2...), avisá y no asumas un criterio.
- **Al terminar**, marcá `[x]` solo lo que quedó terminado y verificado (anda, compila, se probó). Lo que quedó a medias va como `[~]` con una nota corta.
- Agregá una línea al **Registro** (al final del archivo) con la fecha y lo que se hizo.
- Si durante el trabajo aparece una tarea nueva o un problema, agregalo en la fase que corresponda.
- No borres tareas ni cambies el orden de las fases sin consultar.

## Pendientes conocidos

Las decisiones abiertas están en la sección **Decisiones pendientes** de `docs/TODO.md`. Las que más afectan al código: el almacenamiento de imágenes en Render (D7) y los valores de los estados `[A DEFINIR]` en `constants.js` (D8).
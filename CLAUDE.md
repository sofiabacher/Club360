# Club360 — Guía para Claude Code

Plataforma web de gestión para clubes deportivos (proyecto integrador escolar). Se desarrolla en profundidad un solo caso real: **club Valencia, deporte Vóley**. La arquitectura es multi-club desde el diseño.

## Documentación de referencia

- `docs/contexto.md`: documento de contexto del proyecto (roles, reglas de negocio, módulos del MVP, decisiones de modelado). Es una copia del documento que se mantiene en claude.ai; si se actualiza allá, se reemplaza esta copia.
- `docs/moodboard.png`: referencia visual del front (ver "Diseño visual" más abajo).
- `docs/DER_logico.jpg`: DER lógico (24 entidades). **Si la imagen y `docs/contexto.md` no coinciden, manda el contexto.** Diferencias conocidas (la imagen quedó desactualizada):
  - `fee`: `memberId` y `period` **no** son únicos por separado. La restricción es un índice único compuesto `(memberId, period)`.
  - `role`: `name` **no** es único en toda la base. La restricción es un índice único compuesto `(clubId, name)`, para que cada club pueda tener sus propios roles base ("Socio", "Jugadora", etc.).
  - `user.password` admite NULL: queda vacío desde el alta presencial hasta que el socio completa su registro con el número de socio. El login rechaza usuarios sin contraseña.
  - `member.memberAdultId` pasa a ser `adultUserId` y apunta a `user` (no a `member`), porque el adulto Familia puede no ser Socio.
  - `dvv.table_name`, `routine.image_url` y `routine.video_url` pasan a camelCase: `tableName`, `imageUrl`, `videoUrl`.
  - `user.email` admite NULL (sigue siendo único): es obligatorio para mayores de 18 y opcional para menores. La regla va en los services.
  - `user.phone` es `VARCHAR(255)` y se guarda cifrado con AES (getter y setter en el modelo).
  - `club` suma `accentColor` (`VARCHAR(7)`, color propio del club) y `extraInfo` (JSON: WhatsApp, horarios de secretaría, canchas y horarios de entrenamiento).
- `docs/pruebas/`: casos de prueba documentados en `.txt`, uno por módulo (ver "Pruebas").

**Si algo no está definido en este archivo, en el contexto o en el DER, preguntar antes de asumir un criterio.**

## Stack

- Backend: Node.js, Express 5, Sequelize 6, MySQL 8, JWT, express-validator, multer, Cloudinary (imágenes en producción), node-cron, nodemailer con Gmail SMTP (email). JavaScript con CommonJS (`require`).
- Frontend: React 19, Vite, Material UI 7, React Router 7, axios. JavaScript con ES Modules (`import`).
- Sin TypeScript, sin ESLint/Prettier, sin tests automatizados (ver "Pruebas").

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
docs/pruebas/          Casos de prueba en .txt, uno por módulo
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
- **Encriptación:** contraseñas con bcrypt (`hashPassword`); datos sensibles reversibles con `encrypt`/`decrypt` de `utils/crypto.js`. El dato cifrado reversible es el **teléfono del usuario**, y lo cifra y descifra el propio modelo `User`: los services lo usan en claro, y **no** se lee `phone` con `raw: true`.
- **Seed:** la carga inicial se hace solo con `npm run seed`, nunca al arrancar el servidor. Es idempotente (se puede correr varias veces). Los datos del club están en `seed/data/club.js` (provisorios, ver `docs/contexto.md` sección 2.1) y los del usuario Admin en el `.env` (`SEED_ADMIN_*`). Los permisos de un rol base se asignan **solo cuando el rol se crea**: volver a correr el seed no pisa los cambios que hizo el Admin.
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
- **Sin particiones:** no se implementan (no son requisito del trabajo).

## Imágenes

- Toda subida pasa por el middleware `upload` (`middlewares/upload.js`), que elige el destino según el entorno:
  - **desarrollo:** disco, en `uploads/<carpeta>/`, como HotelDesk;
  - **producción:** Cloudinary, en la carpeta `club360/<carpeta>` (variables `CLOUDINARY_*`). El disco de Render no es persistente.
- Los services no saben dónde quedó el archivo: guardan en la base lo que devuelve el middleware (la ruta local `/uploads/...` o la URL de Cloudinary).
- Para borrar una imagen al reemplazarla, se usa una función única de `utils/` que sabe borrar en los dos destinos. No se borra con `fs` desde los services.
- En el front, las imágenes se muestran con el helper de `utils/` que deja la URL tal cual si es absoluta (Cloudinary) o le antepone `VITE_API_URL` si es una ruta local.

## Emails

- Se envían con **nodemailer y Gmail SMTP** (variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` con contraseña de aplicación, `MAIL_FROM`). No se usa Resend.
- Todo envío pasa por `utils/mailer/`; ningún módulo usa nodemailer directo. Cambiar de proveedor solo toca `config/mail.js`.
- **Desarrollo sin SMTP configurado:** si `app.isDev` es verdadero y no hay credenciales, el mailer muestra por consola el destinatario, el asunto y los links del email.
- **Qué notificaciones van por email:** solo las marcadas en `docs/contexto.md`, sección 6 ("Canal de cada notificación"). El resto es solo in-app. Gmail tiene un límite diario de envíos, así que no se mandan emails fuera de esa tabla.
- Los emails son avisos cortos en español rioplatense, con encabezado Marino y botón Naranja con estilos en línea, que invitan a entrar a la plataforma.

## Pruebas

- Sin tests automatizados.
- Los casos de prueba se documentan en `.txt` dentro de `docs/pruebas/`, un archivo por módulo (`docs/pruebas/auth.txt`, `docs/pruebas/fees.txt`...).
- Cada caso lleva: ID (`CP-<MÓDULO>-01`), módulo, descripción, precondiciones, pasos, datos de entrada, resultado esperado, resultado obtenido y estado (Aprobado / Fallido / Pendiente).
- Los scripts de verificación de cada prompt se siguen corriendo fuera del repo. Son un chequeo técnico y no reemplazan los casos documentados.

## Deploy de la demo

- Backend en **Render** y frontend en **Vercel**.
- El front necesita `client/vercel.json` con una reescritura de todas las rutas a `index.html`, para que React Router funcione al recargar una página.
- El front apunta al back con `VITE_API_URL`. El back usa `FRONTEND_URL` para CORS y para los links de los emails.

## Diseño visual (front)

Referencia: `docs/moodboard.png`. Todo lo visual sale del tema (`client/src/theme.js`); **no** se escriben colores ni fuentes sueltos en los componentes.

- **Colores:**
  - `primary` = Naranja `#EA6A1F`, **reservado para lo urgente y la acción principal** de cada pantalla (un solo botón naranja por vista).
  - `secondary` = Azul `#1E40AF` para acciones secundarias, links y selección.
  - `palette.navy` = Marino `#0F1B3D` para la estructura (menú lateral, encabezados) y los títulos.
  - `palette.cream` `#FBF4E6` y `palette.burgundy` `#8E2C3A` para los toques de club de barrio.
  - Fondo de trabajo `#F6F7FB`, tarjetas blancas.
- **Acento del club:** se guarda en `club.accentColor` (D13) y llega al front en `session.club.accentColor`. Para Valencia, Celeste `#2E9BD6` (provisorio). Es solo un acento, por ejemplo una franja junto al nombre del club en el menú o en el carnet de socio, y no reemplaza ningún color de la paleta. Se usa desde la sesión, nunca escrito a mano en un componente.
- **Estados:** siempre con el componente `StatusChip` (`components/common/StatusChip.jsx`): `ok` verde (al día, confirmada, aprobada), `pending` ámbar (pendiente), `overdue` rojo (vencida, rechazada, cancelada), `urgent` naranja (requiere acción ya, ej. citación sin responder).
- **Tipografía:** Poppins para todo. Los números destacados (resultados, fecha y hora de un partido, número de socio) usan la variante `numeric` (Barlow Condensed): `<Typography variant="numeric">`.
- **Íconos:** `@mui/icons-material` en variante Rounded (ej. `NotificationsRounded`).
- **Texturas:** `CourtBackground` (líneas de cancha) en el login y los encabezados; trama de red para grillas de accesos y parquet para rutinas y estados vacíos (cuando se armen esas pantallas).
- **Tono:** español rioplatense con voseo, cercano y claro ("Tenés una citación pendiente para el sábado").
- Diseño responsive: todo tiene que funcionar en el celular.

## Sesión y acceso

- **Login** con `username` y contraseña (no con email). 5 intentos fallidos bloquean al usuario (`USER_STATES.BLOCKED`). Solo entran usuarios ACTIVE con contraseña.
- **Primer ingreso del socio:** `POST /auth/register-member` con número de socio **y fecha de nacimiento**; el número se usa una sola vez.
- **Roles disponibles** (`getAvailableRoles` en `modules/access/access.service.js`): los de `user_role`, salvo que el socio esté INACTIVE, en cuyo caso se quitan los de `MEMBERSHIP_ROLES` (Socio y Jugadora). Es la única lógica que mira nombres de rol (los de `BASE_ROLES`), y es por membresía, no para dar acceso.
- **Rol activo:** con un solo rol disponible se entra directo; con más de uno, el token sale con `activeRoleId: null` y el usuario elige en `/select-role` (`POST /auth/switch-role`, que genera un token nuevo).
- **Permisos efectivos** (`getEffectivePermissions`): rol activo + permisos directos, menos `ADULT_ONLY_PERMISSIONS` si el usuario es menor de 18. Es la **única** fuente de permisos: la usan `checkPermission` y `/auth/me`. No calcular permisos por otro lado.
- **Sesión del front:** `session = { user, club, roles, activeRole, permissions }`, armada siempre con `buildSession` en `auth.service.js`.
- **Recuperación de contraseña:** link por email con token JWT de propósito `password-reset` que incluye una huella del hash actual de la contraseña, así sirve una sola vez. `forgot-password` responde siempre lo mismo, exista o no el usuario. Restablecer la contraseña desbloquea la cuenta.
- **Mi cuenta:** el usuario solo modifica email, teléfono, foto y contraseña. Nombre, apellido, DNI, fecha de nacimiento y usuario los cambia el Admin; los endpoints de la cuenta ignoran esos campos si llegan en el body.
- **Menú y rutas del front:** `client/src/navigation/menu.js` es la única configuración del menú (`label`, `path`, `icon`, `permission`, `group`). Toda pantalla nueva se agrega ahí con su permiso, y la ruta se protege con `PermissionRoute` y el mismo permiso.

## Gestión de roles y permisos (módulo `access`)

- **Roles base** (`isBase`): no se eliminan ni se renombran (el sistema los identifica por su nombre en `BASE_ROLES`); sí se editan su descripción y sus permisos.
- **Rol "Admin del Club":** siempre conserva `LOCKED_ADMIN_PERMISSIONS` (`access.manageRoles` y `access.assignRoles`), definidos en `utils/permissions.js`. Siempre tiene que quedar al menos un usuario ACTIVE con ese rol, y un Admin no puede quitárselo a sí mismo.
- **Roles que el Admin asigna a mano:** solo los roles nuevos (no base) y "Admin del Club". Socio, Jugadora, Familia, Representante, Entrenadora y Preparadora física se asignan **solo** desde su circuito (alta de socio, aprobación de inscripción, vínculo familiar, alta de staff), y el back rechaza asignarlos desde `access`. Los módulos de esos circuitos asignan el rol con un helper de `access.service.js`, no escribiendo `user_role` por su cuenta.
- **Eliminar un rol** con usuarios asignados no se puede: primero hay que quitárselo a cada uno.
- **Permisos directos** (`user_permission`): excepción puntual por usuario, con cualquiera de los 41 permisos. Los de `ADULT_ONLY_PERMISSIONS` igual se quitan si el usuario es menor.
- Los cambios de roles y permisos rigen en el back desde la siguiente request; el front refresca la sesión al recuperar el foco de la pestaña (como mínimo cada 60 segundos).

## Socios y club (módulos `members` y `clubs`)

- **Número de socio:** 6 dígitos correlativos con ceros a la izquierda (`000001`), únicos en toda la plataforma. Lo genera `generateMemberNumber` en `members.service.js`.
- **Código de vínculo familiar:** solo para menores al momento del alta, con formato `XXXX-XXXX` (sin caracteres que se confundan). Se usa una sola vez.
- **Alta presencial:** DNI y fecha de nacimiento obligatorios; email obligatorio solo para mayores. Si la persona ya tiene usuario en el club: si es Staff, se rechaza; si ya es socia, se rechaza; si es otra cosa (por ejemplo, Familia), se le crea el socio sobre ese mismo usuario (`EXISTING_USER`). El rol Socio se asigna con `assignBaseRole`.
- **Baja del socio:** `member` en INACTIVE, sin tocar el `user`. **Reactivación:** solo de INACTIVE a ACTIVE. Un SUSPENDED por mora no se reactiva a mano.
- **Estado del socio:** los demás módulos (inscripciones, cuotas, categorías, citaciones) consultan `memberStateId` en lugar de modificarse cuando el socio se da de baja.
- **Información del club:** los datos de contacto son columnas de `club`; WhatsApp, horarios y canchas van en `club.extraInfo` (JSON). La estructura está comentada en el modelo `Club`.
- **Deportes del club:** no se puede desactivar un deporte que tiene inscripciones Pendientes o Aprobadas.
- **Integridad con JSON:** `utils/integrity.js` normaliza objetos y arrays como JSON con las claves ordenadas, así el DVH no depende del orden que devuelve MySQL.

## Lista de tareas (`docs/TODO.md`)

`docs/TODO.md` es la lista de todo lo que falta del proyecto. Mantenerla al día es parte de cada tarea:

- **Al empezar** una tarea, leé `docs/TODO.md` para ubicarla y revisá si depende de algo pendiente o bloqueado (`[!]`). Si depende de una decisión pendiente (D12, D13...), avisá y no asumas un criterio.
- **Al terminar**, marcá `[x]` solo lo que quedó terminado y verificado (anda, compila, se probó). Lo que quedó a medias va como `[~]` con una nota corta.
- Agregá una línea al **Registro** (al final del archivo) con la fecha y lo que se hizo.
- Si durante el trabajo aparece una tarea nueva o un problema, agregalo en la fase que corresponda.
- No borres tareas ni cambies el orden de las fases sin consultar.

## Pendientes conocidos

Las decisiones abiertas están en la sección **Decisiones pendientes** de `docs/TODO.md`:
- **D12:** día de generación y de vencimiento de la cuota mensual. Bloquea el job de cuotas.
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
  - `league` suma `ageScale` (1 o 2) y `category` suma `ageGroup` (código de la escala, ver `AGE_SCALES`).
  - `game` suma `isHome` (`BOOLEAN NOT NULL DEFAULT true`): partido de local o de visitante.
  - `notification` suma `batchId` (`CHAR(36)` NULL): identifica las notificaciones de un mismo aviso general; las del sistema lo tienen en NULL.
  - `routine` suma `dayOfWeek` (`TINYINT NOT NULL DEFAULT 1`, `DAYS_OF_WEEK`, 1 lunes … 7 domingo), con índice único `(categoryId, weekStart, dayOfWeek)`. `weekStart` es siempre lunes.
  - `payment` suma `method` (`TINYINT NOT NULL DEFAULT 1`, `PAYMENT_METHODS`: 1 tarjeta, 2 transferencia, 3 secretaría), `receiptUrl` (`VARCHAR(255)` NULL) y `note` (`VARCHAR(300)` NULL).
  - `club` suma `accentColor` (`VARCHAR(7)`, color propio del club) y `extraInfo` (JSON: WhatsApp, horarios de secretaría, canchas y horarios de entrenamiento).
- `docs/pruebas/`: casos de prueba documentados en `.txt`, uno por módulo (ver "Pruebas").

**Si algo no está definido en este archivo, en el contexto o en el DER, preguntar antes de asumir un criterio.**

## Stack

- Backend: Node.js, Express 5, Sequelize 6, MySQL 8, JWT, express-validator, multer, Cloudinary (imágenes en producción), node-cron, API HTTP de Brevo (email). JavaScript con CommonJS (`require`).
- Frontend: React 19, Vite, Material UI 7, React Router 7, axios. JavaScript con ES Modules (`import`).
- Sin TypeScript, sin ESLint/Prettier, sin tests automatizados (ver "Pruebas").

## Comandos

```bash
# api/
npm run dev      # servidor con recarga automática (node --watch)
npm start        # servidor
npm run seed     # carga inicial del club (se corre a mano, no al arrancar)
npm run db:snapshot  # guarda todos los datos de la base en api/backups/ (antes de recrearla)
npm run db:restore   # vuelve a cargar el último snapshot en una base recién recreada

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
- **Cambios en el modelo con datos cargados (desde el 01/11/2026):** se recrea la base **conservando los datos**:
  1. `npm run db:snapshot`;
  2. `DB_FORCE_SYNC=true`, `npm run dev` y volver a `false`;
  3. `npm run db:restore`, **sin** correr el seed antes.

  El restore inserta las filas tal cual estaban (`bulkInsert`, con los ids, el teléfono cifrado y los `dvh` originales) y al final verifica la integridad. Es una herramienta de desarrollo y, junto con la restauración del módulo `backup`, una de las dos excepciones a la regla de escribir datos solo con los modelos. Las columnas nuevas tienen que admitir NULL o tener default, para que los datos viejos entren. No se usan parches de SQL ni `DB_ALTER_SYNC`.

## Imágenes

- Toda subida pasa por el middleware `upload` (`middlewares/upload.js`), que elige el destino según el entorno:
  - **desarrollo:** disco, en `uploads/<carpeta>/`, como HotelDesk;
  - **producción:** Cloudinary, en la carpeta `club360/<carpeta>` (variables `CLOUDINARY_*`). El disco de Render no es persistente.
- Los services no saben dónde quedó el archivo: guardan en la base lo que devuelve el middleware (la ruta local `/uploads/...` o la URL de Cloudinary).
- Para borrar una imagen al reemplazarla, se usa una función única de `utils/` que sabe borrar en los dos destinos. No se borra con `fs` desde los services.
- **Comprobantes de transferencia en Cloudinary:** `resource_type: 'raw'` y `type: 'private'`. `receipt-file` genera un link firmado (`private_download_url`, unos 60 segundos), descarga el archivo y lo reenvía; el link nunca sale al navegador.
- En el front, las imágenes se muestran con el helper de `utils/` que deja la URL tal cual si es absoluta (Cloudinary) o le antepone `VITE_API_URL` si es una ruta local.

## Emails

- Se envían con la **API HTTP de Brevo** (`POST /v3/smtp/email`, con `fetch`), elegida con `MAIL_PROVIDER` (`brevo`, `console` y, si se conservó para el desarrollo, `smtp`). Variables: `BREVO_API_KEY`, `MAIL_FROM` (la casilla verificada en Brevo) y `MAIL_FROM_NAME`. No se usa Gmail SMTP en producción: Render gratis bloquea los puertos SMTP.
- Todo envío pasa por `utils/mailer/`; ningún módulo llama a Brevo ni a nodemailer directo. Cambiar de proveedor solo toca `config/mail.js`.
- **Desarrollo sin proveedor configurado:** si `app.isDev` es verdadero y no hay credenciales, el mailer muestra por consola el destinatario, el asunto y los links del email.
- **Qué notificaciones van por email:** solo las marcadas en `docs/contexto.md`, sección 6 ("Canal de cada notificación"). El resto es solo in-app. Brevo gratis permite 300 emails por día, así que no se mandan emails fuera de esa tabla.
- Los emails son avisos cortos en español rioplatense, con encabezado Marino y botón Naranja con estilos en línea, que invitan a entrar a la plataforma.

## Notificaciones

- **Todo aviso a un usuario pasa por `notify()`** (`modules/notifications/notifications.service.js`): ningún módulo crea `notification` ni manda emails de notificación por su cuenta.
- **El tipo define el canal:** `NOTIFICATION_TYPES` (en `utils/constants.js`) dice qué tipos van también por email, según la tabla del contexto, sección 6. `GENERAL` va por email solo si quien envía lo elige.
- `includeFamily: true` suma al adulto Familia de los socios menores vinculados (para "Socio, y Familia si es menor").
- **Momento del envío:** los emails salen **después de confirmar la transacción** (`afterCommit`) y en segundo plano. Un error de email se registra en la bitácora y no deshace la notificación in-app.
- En el front, `client/src/utils/notificationTypes.js` define el ícono y la ruta de cada tipo.
- **Detalle:** tocar una notificación (en la campana o en el listado) abre `NotificationDialog` con el mensaje completo y un botón "Ir a…" si el tipo tiene ruta; no navega directo.
- **Historial de enviados:** cada aviso general lleva un `batchId` común. Quien tiene `notifications.sendAll` ve todos los envíos del club; el resto, solo los suyos. Muestra cuántos destinatarios lo leyeron.

## Pruebas

- Sin tests automatizados.
- Los casos de prueba se documentan en `.txt` dentro de `docs/pruebas/`, un archivo por módulo (`docs/pruebas/auth.txt`, `docs/pruebas/fees.txt`...).
- Cada caso lleva: ID (`CP-<MÓDULO>-01`), módulo, descripción, precondiciones, pasos, datos de entrada, resultado esperado, resultado obtenido y estado (Aprobado / Fallido / Pendiente).
- Los scripts de verificación de cada prompt se siguen corriendo fuera del repo. Son un chequeo técnico y no reemplazan los casos documentados.

## Deploy de la demo

- **Base** en Railway (MySQL, conexión pública con SSL), **backend** en Render (plan gratuito) y **frontend** en Vercel. Pasos manuales en `docs/deploy.md`.
- El front necesita `client/vercel.json` con una reescritura de todas las rutas a `index.html`, para que React Router funcione al recargar una página.
- El front apunta al back con `VITE_API_URL`. El back usa `FRONTEND_URL` para CORS y para los links de los emails.
- **Render gratis:** disco no persistente (los archivos van a Cloudinary y los backups hay que descargarlos), sin SMTP (emails por Brevo), corre en UTC y se duerme a los 15 minutos sin tráfico. Un servicio externo llama a `GET /health` cada 10 minutos: `/health` **no** consulta la base.
- **Zona horaria:** todo `cron.schedule` lleva `timezone: 'America/Argentina/Buenos_Aires'`, y ninguna fecha de negocio depende de la zona del servidor.
- **Arranque en producción:** sin `DATABASE_URL`, los secretos JWT, `ENCRYPTION_KEY` o `FRONTEND_URL`, el servidor no arranca; sin Cloudinary o sin proveedor de email, arranca y avisa. Nunca se muestran valores de variables.
- **Datos:** el seed y los datos de la demo se corren desde una compu contra Railway, con la `ENCRYPTION_KEY` del back de Render. `DB_FORCE_SYNC` y `DB_ALTER_SYNC` siempre en `false` contra esa base.

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
- **Alta presencial:** DNI y fecha de nacimiento obligatorios; email obligatorio solo para mayores. Si la persona ya tiene usuario en el club: si es staff activo (`isActiveStaff`), se rechaza; si ya es socia, se rechaza; si es otra cosa (por ejemplo, Familia), se le crea el socio sobre ese mismo usuario (`EXISTING_USER`). El rol Socio se asigna con `assignBaseRole`.
- **Baja del socio:** `member` en INACTIVE, sin tocar el `user`. **Reactivación:** solo de INACTIVE a ACTIVE. Un SUSPENDED por mora no se reactiva a mano.
- **Estado del socio:** los demás módulos (inscripciones, cuotas, categorías, citaciones) consultan `memberStateId` en lugar de modificarse cuando el socio se da de baja.
- **Información del club:** los datos de contacto son columnas de `club`; WhatsApp, horarios y canchas van en `club.extraInfo` (JSON). La estructura está comentada en el modelo `Club`.
- **Deportes del club:** no se puede desactivar un deporte que tiene inscripciones Pendientes o Aprobadas.
- **Integridad con JSON:** `utils/integrity.js` normaliza objetos y arrays como JSON con las claves ordenadas, así el DVH no depende del orden que devuelve MySQL.

## Staff y vínculo familiar (módulos `staff` y `members`)

- **Staff activo** = usuario con al menos un rol de `STAFF_ROLES` (Representante, Entrenadora, Preparadora física). Se consulta siempre con `isActiveStaff` (`staff.service.js`), nunca solo por la existencia del registro `staff`. Una persona puede tener varios roles de staff.
- **Staff y socio:** no se da de alta como staff a quien tiene un `member` ACTIVE o SUSPENDED, ni como socio a un staff activo. Un ex socio (INACTIVE) puede ser staff y un ex staff puede ser socio.
- **Acceso del staff:** el alta crea el usuario en PENDING y le manda un email de activación (token `account-activation`, vence en `JWT_ACTIVATION_EXPIRES_IN`, 48 h por defecto, y deja de servir al activar la cuenta). El Admin puede reenviarlo.
- **Baja de staff:** se quitan todos sus roles de staff; el usuario pasa a DELETED **solo si no le queda ningún otro rol** (si es Familia, sigue entrando con ese rol). El registro `staff` no se borra.
- **Vínculo familiar:** el código del menor sirve una sola vez (`linkStatus = true`). El adulto tiene que ser mayor y del mismo club; puede crear una cuenta nueva desde `/family-link` o usar la suya (con la validación del login, que suma intentos fallidos). Al vincular se asigna el rol Familia con `assignBaseRole`.
- **Desvincularse** (socio mayor, `members.unlinkAdult`): `adultUserId = null`, `linkStatus = false` y `codeFamily = null`. Si el adulto ya no tiene ningún otro menor vinculado, pierde el rol Familia (`removeBaseRole`).

## Ligas y categorías (módulo `leagues`)

- Las jugadoras y el staff se asignan a la **categoría**, no a la liga. Las asignaciones se quitan con `isActive = false` (no se borran).
- **Alcance:** un staff activo con permisos de `leagues` trabaja solo con las ligas del deporte de su registro `staff`; un usuario con esos permisos que no es staff ve todas las del club (`getLeagueScope`).
- **Escalas de edad:** cada liga elige una escala (`AGE_SCALES`, en `utils/constants.js` de api y client) y cada categoría tiene un grupo (`ageGroup`) con su edad máxima. La edad de temporada es año calendario − año de nacimiento (`getSeasonAge`). Una jugadora entra si su edad de temporada es ≤ `maxAge` (las más chicas pueden subir; en Mayores, cualquiera). Si una ya asignada supera la edad, no se la quita: se marca "Supera la edad".
- **Jugadora asignable:** socia ACTIVE o SUSPENDED con inscripción Aprobada en el deporte de la liga y que cumple la edad de la categoría. Puede estar en varias categorías. **Staff asignable:** staff activo con rol Entrenadora o Preparadora física, del mismo deporte.
- **Socias o staff dados de baja** no se quitan solos de las categorías: los demás módulos los excluyen al consultar.
- Los demás módulos usan las funciones de `leagues.service.js` (`getActivePlayersOfCategory`, `getCategoriesOfMember`, `getCategoriesOfStaff`, `isStaffAssignedToCategory`, `removeMemberFromSportCategories`) en lugar de consultar `categoryPlayer` y `categoryStaff` por su cuenta.

## Partidos y conflictos (módulo `games`)

- Cada partido es de una categoría y lo gestiona `games.manage` con el alcance por deporte de `getLeagueScope`. `season` se completa con el año de la fecha. Solo se editan los Programados; Jugado se marca después de la fecha; Cancelado cancela sus citaciones y avisa a las citadas.
- **Superposición:** dos partidos Programados de una misma jugadora chocan si entre el fin del primero (inicio + `GAME_DURATION_MINUTES`, 120) y el inicio del segundo hay menos minutos que `club.conflictMargin`. Se calcula siempre con `findConflictsForGame` / `listConflicts` de `games.service.js`: **no se guarda**.
- **Al guardar un partido no se bloquea:** se avisa (`check-conflicts` antes de guardar y `conflicts` en la respuesta) y se notifica `SCHEDULE_CONFLICT` a las entrenadoras.
- **Resolución:** solo en la bitácora (`CONFLICT_RESOLVED`, con `conflictKey = "{memberId}:{idMenor}-{idMayor}"` y el partido elegido en `details`). Se consulta con `getConflictResolutions`.

## Citaciones (módulo `citations`)

- La genera una entrenadora para un partido Programado de sus categorías, **dentro de la ventana**: desde 7 días hasta 48 h antes del partido (`CITATION_WINDOW_OPEN_DAYS`, `CITATION_MIN_HOURS`). Se cita a varias a la vez: si una no cumple, no se crea ninguna.
- **No citable:** jugadora con mora (socio SUSPENDED o `getOverdueDays` > `club.delayFee`, en `fees.service.js`) o con un conflicto resuelto en el que se eligió el otro partido (`getResolutionsForMember`).
- **Respuesta:** la jugadora, dentro de las 24 h (`dateMaxResponse`). Rechazar exige una justificación de 10 a 300 caracteres. El job `autoConfirmCitations` (cada 10 min) pasa las vencidas a Confirmada automáticamente.
- La entrenadora puede cancelar una citación antes del partido (notifica `CITATION_CANCELLED`, solo in-app).
- Cuando la jugadora confirma o rechaza, se avisa con `CITATION_RESPONSE` (in-app) a todas las entrenadoras activas de la categoría. La confirmación automática no avisa.
- **Al resolver un conflicto,** se cancela la citación del partido no elegido y se notifica `CONFLICT_RESOLVED` (solo in-app, con la familia). Las respuestas de `mine`/`linked` (citaciones y partidos) traen `conflict.notPlaying` para que el front muestre "No jugás este partido".

## Inscripciones (módulo `inscriptions`)

- **Pedido:** solo socios ACTIVE, en deportes activos del club, sin otra inscripción Pendiente o Aprobada en ese deporte. Avisa a los Representantes del deporte (`INSCRIPTION_REQUEST`, in-app).
- **Aprobar** da el rol Jugadora (`assignBaseRole`) y avisa `INSCRIPTION_RESULT`. Rechazar, con un motivo opcional en la bitácora y en el aviso.
- **Baja de un deporte** (contexto 3.3.1), en una transacción: inscripción Cancelada, `removeMemberFromSportCategories`, citaciones Pendientes, Confirmadas y Confirmadas automáticamente de partidos futuros de ese deporte a Cancelada (avisando a las entrenadoras por las Confirmadas), `removeBaseRole(Jugadora)` si no le queda otra inscripción Aprobada y aviso `SPORT_WITHDRAWAL` a los Representantes.
- El alcance por deporte de los Representantes es una sola función común (`getSportScope`), usada por inscripciones, ligas y partidos.

## Cuotas y pagos (módulo `fees`)

- **D12:** la cuota del mes se genera el **día 1** y vence el **día 10** (`FEE_GENERATION_DAY`, `FEE_DUE_DAY`). Se genera a los socios ACTIVE o SUSPENDED dados de alta antes del día 1 del período. `socialAmount` = `club.socialFee`; `sportAmount` = suma de `priceFee` de las inscripciones Aprobadas en ese momento. Única por `(memberId, period)`.
- **Jobs** (las funciones reciben la fecha de referencia para poder probarlas): `generateFees` (día 1, 00:05) y `feeStatus` (todos los días, 00:15). `feeStatus` avisa las cuotas por vencer (3 días antes), pasa a Vencida y avisa, manda un recordatorio cada 30 días de atraso y suspende a quien supera `club.delayFee`.
- **Pagos:** `payOwn` (socio mayor) o `manageLinked` (Familia), por el total. Simulado: tarjeta terminada en 0000 → Rechazado; si no, Aprobado. **No se guarda la tarjeta** (en la bitácora, solo los últimos 4 dígitos). El Admin registra pagos en secretaría (`SEC-`).
- **Recuperación automática:** al aprobarse un pago, un SUSPENDED sin cuotas impagas por encima de `delayFee` vuelve a ACTIVE.
- La mora se calcula siempre con `getOverdueDays` de `fees.service.js`. Una cuota con una transferencia Pendiente **no** suma días de atraso.
- **Transferencia (P14b):** los datos bancarios están en `club.extraInfo.bankInfo`. El socio adjunta el comprobante (JPG, PNG o PDF, hasta 5 MB, carpeta `receipts`) y se crea un `payment` Pendiente con `method = TRANSFER` y código `TRF-`; la cuota no cambia de estado. Una sola transferencia Pendiente por cuota: mientras exista, la cuota no se paga de otra forma (409). La revisa quien tiene `fees.manage` (aviso `PAYMENT_REVIEW_REQUEST`): aprobar → cuota Pagada y recuperación automática; rechazar → motivo obligatorio (10 a 300) en `note`. El resultado se avisa con `PAYMENT_RESULT`.
- **Comprobantes adjuntos:** nunca por `/uploads` público. Se descargan con `GET /fees/payments/:id/receipt-file` (con sesión: `fees.manage`, quien pagó, el socio o su adulto; si no, 404). En Cloudinary van como recurso `raw` privado.
- **Comprobante de pago:** todo pago Aprobado (cualquier medio) tiene uno (`GET /fees/payments/:id/voucher` y la página `/fees/payments/:id/voucher`). De la tarjeta solo se guardan los últimos 4 dígitos, en `note` ("Tarjeta ****1234").
- **Formulario de tarjeta:** el número se muestra en grupos de 4 con guiones mientras se escribe, pero se envían solo los dígitos.

## Rutinas (módulo `routines`)

- Una rutina por **categoría y día** (`weekStart` lunes + `dayOfWeek`). Las fechas de semana salen de `getWeekStart` / `getCurrentWeekStart` de `utils/dates.js` (zona horaria de Argentina).
- **Alcance** (`getRoutineScope`): la preparadora, sus categorías (`getCategoriesOfStaff`); un usuario con `routines.manage` que no es staff, todas las del club. La entrenadora consulta las suyas y la jugadora las de `getCategoriesOfMember`.
- Se cargan, editan y borran solo rutinas de la **semana actual o futuras**; las pasadas son de solo lectura. El borrado es físico (nada depende de `routine`) y se registra en la bitácora.
- Crear o editar avisa `ROUTINE_PUBLISHED` (in-app) a las jugadoras activas de la categoría; borrar no avisa.

## Panel de inicio (`HomePage`)

- Se elige **por permisos**: `citations.respond` + `games.viewOwn` → `PlayerHome`; si no, `games.viewLinked` + `fees.manageLinked` → `FamilyHome`; si no, los accesos rápidos.
- Los paneles usan los endpoints existentes de cada módulo (`/games/mine`, `/citations/mine`, `/fees/mine`, `/routines/mine` y sus `linked`). No hay módulo ni endpoint de "dashboard". Cada bloque carga y falla por separado.

## Bitácora, integridad y backup (módulos `logs`, `integrity` y `backup`)

- **Filas de un club:** se leen, borran e insertan solo con `utils/clubData.js` (`CLUB_TABLES` en orden de dependencia, `readClubRows`, `deleteClubRows`, `insertClubRows`). Quedan afuera `sport`, `permission`, `dvv` y `log`. **Todo modelo nuevo con `clubId` se agrega a `CLUB_TABLES`.** Lo usan `integrity` y `backup`; `db:snapshot` y `db:restore` siguen copiando la base completa con las mismas funciones de lectura e inserción.
- **Bitácora:** solo del club del usuario. CSV en UTF-8 con BOM y separador `;`. Exportar se registra (`LOGS_EXPORTED`). `log.action` es `STRING(50)`: los `message` de `LOG_ACTIONS` tienen que entrar.
- **Integridad:** `verifyClub` (DVH de las filas del club y de los catálogos, y DVV de cada tabla) y `getIntegrityStatus` (caché en memoria de `INTEGRITY_CACHE_MINUTES`). Con estado `ERROR` el club se **bloquea**: login e `isAuth` responden 503 `INTEGRITY_LOCK`, salvo a quien tiene `integrity.manage` o `backup.manage`, y los jobs saltean ese club. `INTEGRITY_ALERT` (in-app + email) solo al pasar de `OK` a `ERROR`. Reparar actualiza `dvh` con `hooks: false` y recalcula el DVV.
- **Backup:** JSON por club con `meta` y `checksum` SHA-256, en `api/backups/club-{clubId}/`, últimos `BACKUP_KEEP_LAST` (7). Manual o con el job de los domingos 03:00. Los nombres de archivo se validan con regex y solo se buscan en la carpeta del club.
- **Restauración:** valida formato, club, checksum, catálogos y que quien restaura exista activo con `backup.manage` en el backup; guarda un `PRE_RESTORE`; reemplaza las filas del club en **una transacción** con `queryInterface` (sin hooks, conserva ids, `dvh` y teléfono cifrado; sin desactivar `FOREIGN_KEY_CHECKS`); recalcula el DVV y verifica. La bitácora no se toca.

## Lista de tareas (`docs/TODO.md`)

`docs/TODO.md` es la lista de todo lo que falta del proyecto. Mantenerla al día es parte de cada tarea:

- **Al empezar** una tarea, leé `docs/TODO.md` para ubicarla y revisá si depende de algo pendiente o bloqueado (`[!]`). Si depende de una decisión pendiente (D12, D13...), avisá y no asumas un criterio.
- **Al terminar**, marcá `[x]` solo lo que quedó terminado y verificado (anda, compila, se probó). Lo que quedó a medias va como `[~]` con una nota corta.
- Agregá una línea al **Registro** (al final del archivo) con la fecha y lo que se hizo.
- Si durante el trabajo aparece una tarea nueva o un problema, agregalo en la fase que corresponda.
- No borres tareas ni cambies el orden de las fases sin consultar.

## Pendientes conocidos

Las decisiones abiertas están en la sección **Decisiones pendientes** de `docs/TODO.md`. Hoy no queda ninguna abierta que bloquee el código.
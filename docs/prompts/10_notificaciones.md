# Prompt 10 — Emails con Gmail y notificaciones

Vas a hacer tres cosas:
- pasar el envío de emails de Resend a nodemailer con Gmail SMTP;
- crear el servicio de notificaciones `notify()`, que van a usar todos los módulos que vienen;
- armar las pantallas de notificaciones: la campana, el listado y "Enviar avisos".

Antes de empezar, leé `CLAUDE.md` (sobre todo "Emails" y "Notificaciones"), la sección 6 de `docs/contexto.md` (sobre todo la tabla "Canal de cada notificación") y la sección 11 ("Emails").

**Alcance:**
- **Se hace:**
  - el mailer con Gmail;
  - `notify()` con sus tipos;
  - listar y marcar notificaciones como leídas;
  - el envío de avisos generales del Admin, el Representante y la Entrenadora;
  - las pantallas;
  - los casos de prueba.
- **No se hace:** disparar las notificaciones de cada evento (citación nueva, partido cancelado, cuota vencida, etc.). Eso lo hace cada módulo cuando se construya, llamando a `notify()`.
- **No** hagas commit.

## 1. Emails con Gmail SMTP

- **Dependencias:** desinstalá `resend` e instalá `nodemailer`.
- **`config/index.js`:** reemplazá la configuración de Resend por un objeto `smtp` con `host` (default `smtp.gmail.com`), `port` (default 465), `secure` (true si el puerto es 465), `user`, `pass` y `from` (`MAIL_FROM`, por ejemplo `Club360 <club360.equipo@gmail.com>`).
- **`.env.example`:** sacá `RESEND_API_KEY` y `EMAIL_FROM`, y agregá `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `MAIL_FROM`, con un comentario: *"SMTP_PASS es una contraseña de aplicación de Gmail (Cuenta de Google → Seguridad → Verificación en 2 pasos → Contraseñas de aplicación), no la contraseña de la cuenta."*
- **`config/mail.js`:** crea el transporter de nodemailer.
  - Si no hay `SMTP_USER` o `SMTP_PASS` **y** `app.isDev` es verdadero, no envía nada: muestra por consola el destinatario, el asunto y los links del HTML, como ya hacía con Resend.
  - Si faltan en producción, lo avisa al arrancar el servidor y los envíos fallan con un error claro.
- **`utils/mailer/`:** los senders que ya existen (recuperación, aviso de cambio de contraseña, activación de staff) siguen funcionando sin cambios en sus llamadas. Solo cambia el transporte.
- **Verificación al arrancar:** si hay credenciales, `server.js` llama a `transporter.verify()` y muestra "Servidor de email listo" o el error, **sin** cortar el arranque.

## 2. Servicio de notificaciones

### 2.1 Tipos (`NOTIFICATION_TYPES` en `api/src/utils/constants.js`)

Cada tipo define si va por email según la tabla D5 del contexto, sección 6. **Esta constante es la única fuente de esa regla:** ningún módulo decide por su cuenta si manda email.

| Clave | `email` | Se usa para |
|---|---|---|
| `CITATION_NEW` | `true` | Citación nueva (jugadora) |
| `GAME_CANCELLED` | `true` | Partido cancelado con citaciones (jugadoras citadas) |
| `FEE_OVERDUE` | `true` | Cuota vencida y avisos de mora |
| `MEMBER_SUSPENDED` | `true` | Suspensión por mora |
| `FIXTURE_PUBLISHED` | `false` | Fixture publicado o modificado |
| `SCHEDULE_CONFLICT` | `false` | Conflicto de horario (entrenadoras) |
| `ROUTINE_PUBLISHED` | `false` | Rutina publicada |
| `FEE_DUE_SOON` | `false` | Cuota por vencer |
| `INSCRIPTION_RESULT` | `false` | Inscripción aprobada o rechazada |
| `SPORT_WITHDRAWAL` | `false` | Baja de un deporte (Representante) |
| `GENERAL` | `'optional'` | Avisos generales: email solo si quien envía lo elige |

Guardá en `notification.type` la clave.

### 2.2 `notify()` (`modules/notifications/notifications.service.js`)

```js
notify({
  clubId,
  type,                 // clave de NOTIFICATION_TYPES
  recipientUserIds,     // array de ids de usuario
  title,                // hasta 150 caracteres
  message,              // texto
  transmitterId = null, // null si la genera el sistema
  includeFamily = false,// también al adulto Familia vinculado, si el destinatario es un socio menor
  sendEmail = false     // solo cuenta para GENERAL
}, { transaction })
```

1. **Arma la lista final de destinatarios:**
   - saca los repetidos;
   - si `includeFamily` es verdadero, suma el `adultUserId` de cada destinatario que sea un socio menor vinculado;
   - se queda solo con los usuarios del `clubId` que estén ACTIVE o BLOCKED (un bloqueado igual tiene que enterarse).
2. **Crea una `notification` por destinatario,** en la transacción si viene una. Los hooks calculan los DVH.
3. **Emails:**
   - se mandan si el tipo tiene `email: true`, o si es `GENERAL` con `sendEmail` verdadero;
   - se mandan **después de confirmar la transacción** (`transaction.afterCommit` si viene una; si no, enseguida), así nunca sale un email de algo que después se deshizo;
   - van uno por destinatario y en segundo plano, **sin** que la request espere;
   - a quien no tiene email (por ejemplo, un menor), no se le manda: su adulto recibe el suyo si se usó `includeFamily`.
4. **Errores de email:** se registran con `MAIL_ERROR` en la bitácora y **no** deshacen la notificación in-app.
5. **Respuesta:** devuelve la cantidad de notificaciones creadas y de emails programados.

### 2.3 Email de notificación (`utils/mailer/`)

`buildNotificationEmail({ clubName, title, message })` y `sendNotificationEmail(user, notification)`.
- **Asunto:** `{clubName}: {title}`.
- **Cuerpo:** el título, el mensaje (sin HTML del usuario: escapalo) y un botón "Entrar a Club360" → `${FRONTEND_URL}/notifications`.
- **Estilo:** el de los emails de `CLAUDE.md`, es decir, encabezado Marino y botón Naranja con estilos en línea.

### 2.4 Avisos generales: a quién le llegan

El permiso de envío define a quién se le puede mandar. La regla vive en `notifications.service.js`, en `resolveAudience(user, audience)`:

| Permiso | Opciones de destinatarios |
|---|---|
| `notifications.sendAll` (Admin) | `{ scope: 'club' }`: todos los usuarios ACTIVE del club. **O** `{ scope: 'segments', segments: [...], includeFamilies: true\|false, staffRoles: [...] }`, con uno o más segmentos combinados (ver abajo) |
| `notifications.sendSport` (Representante) | `{ scope: 'sport', groups: ['players', 'families', 'coaches'] }`, con uno o más grupos: jugadoras con inscripción Aprobada en el deporte de su registro `staff` (o en todos los deportes, si no es staff), los adultos Familia de esas jugadoras y las entrenadoras y preparadoras físicas activas de ese deporte |
| `notifications.sendCategory` (Entrenadora) | `{ scope: 'categories', categoryIds: [...], includeFamilies: true\|false }`: jugadoras activas de **sus** categorías (`isStaffAssignedToCategory`) y, opcionalmente, sus adultos Familia |

**Segmentos del Admin** (se combinan y se sacan los repetidos):
- **`members`:** usuarios de los socios con `member` ACTIVE o SUSPENDED.
- **`staff`:** staff activo (`isActiveStaff`). Si viene `staffRoles` (nombres de `STAFF_ROLES`), solo quienes tienen alguno de esos roles.
- **`overdue`:** socios ACTIVE o SUSPENDED con **al menos una cuota en estado Vencida** (`FEE_STATES.OVERDUE`). Hasta que exista el módulo de cuotas va a dar 0 destinatarios, y está bien: dejá la consulta armada sobre el modelo `Fee`. Son avisos **manuales**: no reemplazan las notificaciones automáticas de mora que va a mandar el módulo de cuotas.
- **`families`:** adultos con al menos un socio menor vinculado (`member.adultUserId` con `linkStatus` en true).
- **`includeFamilies`:** con `members` u `overdue`, suma al adulto vinculado de cada socio menor del segmento (como `includeFamily` de `notify()`).

Si quien envía tiene más de un permiso de envío, puede usar cualquiera de sus opciones. Una opción que no le corresponde → 403.

## 3. Back (`modules/notifications/`)

| Método y ruta | Permiso | Qué hace |
|---|---|---|
| `GET /notifications?unread=&page=` | `notifications.view` | Notificaciones del usuario logueado, las más nuevas primero, paginadas de a 20, con `transmitter` (nombre, si tiene) |
| `GET /notifications/unread-count` | `notifications.view` | `{ count }` |
| `POST /notifications/:id/read` | `notifications.view` | Marca como leída. Solo las del propio usuario (si no, 404) |
| `POST /notifications/read-all` | `notifications.view` | Marca todas las del usuario como leídas |
| `GET /notifications/send-options` | cualquiera de los tres permisos de envío | Qué opciones de destinatarios puede usar el usuario, con los datos para armarlas (sus categorías, si es Entrenadora; los grupos y el deporte, si es Representante) |
| `POST /notifications/preview` | cualquiera de los tres permisos de envío | `{ audience }`. Responde cuántas personas lo van a recibir y cuántas tienen email |
| `POST /notifications/send` | cualquiera de los tres permisos de envío | `{ audience, title, message, sendEmail }`. Envía un aviso `GENERAL` con `notify()`, con el usuario logueado como `transmitterId`. Registra `NOTIFICATION_SENT` (MEDIUM), con la opción elegida y la cantidad en `details` |

**Validaciones:** `title` de 3 a 150 caracteres; `message` de 1 a 2000. Si la lista de destinatarios queda vacía: 400, *"No hay destinatarios para esta opción."*

## 4. Front

### 4.1 Tipos en el front (`client/src/utils/notificationTypes.js`)

Para cada tipo, el ícono Rounded, el color (`StatusChip` o el del tema) y la ruta a la que lleva al tocarlo:

| Tipo | Ruta |
|---|---|
| `CITATION_NEW` | `/my-citations` |
| `GAME_CANCELLED` | `/my-games` |
| `FEE_OVERDUE`, `MEMBER_SUSPENDED`, `FEE_DUE_SOON` | `/my-fees` (o `/family/fees` si el rol activo tiene `fees.manageLinked`) |
| `FIXTURE_PUBLISHED` | `/my-games` |
| `SCHEDULE_CONFLICT` | `/games/assigned` |
| `ROUTINE_PUBLISHED` | `/my-routine` |
| `INSCRIPTION_RESULT` | `/my-sports` |
| `SPORT_WITHDRAWAL` | `/inscriptions` |
| `GENERAL` | sin ruta |

Si la ruta no está entre las disponibles para el rol activo, la notificación solo se marca como leída.

### 4.2 Campana (en `DashboardLayout`)

- **Contador:** un `Badge` con la cantidad sin leer, en Naranja (es lo urgente). Se pide al cargar, cada 60 segundos mientras la pestaña está visible y al volver a la pestaña.
- **Al tocarla,** se abre un `Popover` con:
  - las últimas 5 notificaciones (ícono, título y "hace 2 horas");
  - "Marcar todas como leídas";
  - "Ver todas" → `/notifications`.
- Tocar una notificación la marca como leída y navega a su ruta.

### 4.3 `pages/notifications/NotificationsPage.jsx` (`/notifications`)

- **Arriba:** las pestañas "Todas" y "Sin leer", y el botón "Marcar todas como leídas".
- **Lista:** cada notificación con:
  - su ícono;
  - el título (en negrita si no está leída, con un punto Naranja);
  - el mensaje;
  - quién la envió ("Club Valencia" si la mandó el sistema);
  - la fecha relativa.
- Al tocar una notificación se comporta como en la campana. La lista es paginada.
- **Estado vacío:** `EmptyState` con *"No tenés notificaciones."* (o *"Estás al día: no tenés notificaciones sin leer."* en la pestaña "Sin leer").

### 4.4 `pages/notifications/SendNoticePage.jsx` (`/notifications/send`)

- **Destinatarios:** según `send-options`.
  - **Admin:** un selector con "Todo el club" o "Elegir grupos". Con "Elegir grupos", aparecen casillas para Socios, Staff (con chips para filtrar por rol: Representantes, Entrenadoras, Preparadoras; sin elegir ninguno, va a todo el staff), Socios con cuotas vencidas y Familias. Debajo, la casilla "Incluir a las familias de los socios menores", habilitada solo si se eligió Socios o Socios con cuotas vencidas.
  - **Representante:** casillas para Jugadoras, Familias y Entrenadoras y preparadoras.
  - **Entrenadora:** la selección de sus categorías y la casilla "Incluir a las familias".
- **Mensaje:** título y mensaje, con un contador de caracteres.
- **Email:** la casilla "Enviar también por email".
- **Resumen:** debajo, en vivo, con `preview`: *"Lo van a recibir {n} personas"* y, si se marcó el email, *"· {m} por email"*. Si `m` pasa de 100, una nota: *"Gmail tiene un límite diario de envíos: usalo para avisos importantes."*
- **Botón "Enviar aviso"** (naranja): pide confirmación y, al terminar, muestra un mensaje de éxito y limpia el formulario.

### 4.5 Rutas y llamadas

- Reemplazá el `ComingSoonPage` de `/notifications` y `/notifications/send`. La segunda ya se habilita con cualquiera de los tres permisos de envío, como quedó en el P05.
- Agregá las llamadas en `client/src/api/notifications.api.js`.

## 5. Casos de prueba documentados

Creá `docs/pruebas/notifications.txt` con el formato de `CLAUDE.md`. Como mínimo:
- un tipo con email y un tipo sin email;
- `GENERAL` con y sin la opción de email;
- destinatario sin email;
- `includeFamily` con un socio menor vinculado;
- un email que no sale cuando la transacción se deshace;
- un error de email registrado en la bitácora sin perder la notificación;
- marcar una notificación como leída y marcar todas;
- intentar marcar una notificación ajena;
- el aviso del Admin a todo el club;
- el aviso del Admin a los segmentos Socios con familias, Staff solo Entrenadoras, Familias, y la combinación de dos segmentos sin repetidos;
- el segmento Socios con cuotas vencidas (con una cuota Vencida creada por script);
- el aviso del Representante a un grupo;
- el aviso de una Entrenadora a una categoría propia y a una que no es suya (rechazado);
- un aviso sin destinatarios;
- el contador de la campana.

## 6. Documentación del repo

No modifiques `CLAUDE.md` ni `docs/contexto.md`: ya vienen con estas reglas. Si ves que no las incluyen, avisame.

## 7. Verificación

### 7.1 Back

Hacelo con un script temporal **fuera del repo**, sin `SMTP_*` (los emails van por consola), con datos de prueba creados con los modelos y borrados al final:

1. **Mailer:** la recuperación de contraseña y la activación de staff siguen mostrando su link por consola. `resend` ya no está en `package.json`.
2. **`notify()`:**
   - `FIXTURE_PUBLISHED` → crea las notificaciones in-app y ningún email;
   - `CITATION_NEW` → in-app y email;
   - `GENERAL` sin `sendEmail` → sin email;
   - `GENERAL` con `sendEmail` → con email;
   - un menor sin email con `includeFamily` → notificación para los dos y email solo para el adulto;
   - destinatarios repetidos → una sola notificación;
   - un usuario de otro club → descartado.
3. **Transacción:** `notify()` dentro de una transacción que después hace rollback → no queda ninguna notificación y no sale ningún email por consola.
4. **Error de email:** simulá que el envío falla (por ejemplo, con un transporter de prueba que lanza un error) → la notificación queda y en la bitácora aparece `MAIL_ERROR`.
5. **Lectura:** el contador, marcar una, marcar todas y marcar una ajena → 404.
6. **Avisos:**
   - el Admin a todo el club;
   - el Admin por segmentos: Socios (con y sin `includeFamilies`), Staff con `staffRoles: ['Entrenadora']`, Familias, y Socios + Staff sin repetidos;
   - `overdue`: con una cuota en estado Vencida creada en el script, aparece solo ese socio (y su adulto, con `includeFamilies`); sin cuotas vencidas, 0 → 400 "No hay destinatarios";
   - el Representante a jugadoras y familias de Vóley;
   - la Entrenadora a una categoría propia → OK y a una ajena → 403;
   - una Jugadora que intenta enviar → 403;
   - `preview` devuelve los mismos números que el envío.
7. **Integridad:** la verificación de DVH/DVV del P03 da todo correcto.

### 7.2 Front

1. `npm run build` compila sin errores. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano en el navegador:
   - enviar un aviso como Admin y verlo llegar a la campana de una socia (con otra sesión o en otro navegador);
   - marcar como leída;
   - mandar un aviso como Entrenadora a su categoría;
   - la campana y el listado en tamaño celular.
3. Agregá en el resumen los pasos para crear la contraseña de aplicación de Gmail y probar un envío real cuando tengan la cuenta del equipo.

### 7.3 Cierre

1. **Actualizá `docs/TODO.md`:**
   - en la Fase 6, marcá: reemplazar Resend por nodemailer; notificaciones in-app y email según la tabla; envío de notificaciones generales;
   - dejá como `[~]` la tarea de pantallas de la Fase 6, con la nota "notificaciones hechas (P10)";
   - agregá la línea al Registro.
2. Mostrame el resultado de la verificación y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
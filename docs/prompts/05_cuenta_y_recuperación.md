# Prompt 05 — Layout del dashboard, Mi cuenta y recuperación de contraseña

Vas a hacer tres cosas: la recuperación de contraseña por email, la sección "Mi cuenta" y el layout del dashboard que van a usar todas las pantallas. Antes de empezar, leé `CLAUDE.md` (sobre todo "Diseño visual" y "Sesión y acceso"), las secciones 3.6.1, 3.7 y 11 de `docs/contexto.md`, y mirá `docs/moodboard.png`.

**Alcance:**
- **Se hace:**
  - recuperación de contraseña (decisión D1);
  - ver y modificar los datos de la propia cuenta y cambiar la contraseña;
  - el layout con el menú armado según los permisos;
  - una página "en construcción" para las secciones que todavía no existen;
  - la página de inicio con accesos rápidos.
- **No se hace:**
  - el desbloqueo de usuarios por el Admin (va con la gestión de socios y staff, Fase 3);
  - la gestión de roles y permisos;
  - el módulo de notificaciones (solo se muestra la campana).
- **No** hagas commit.

## 1. Recuperación de contraseña (decisión D1)

**Reglas:**
- El usuario la pide desde el login ingresando su **nombre de usuario o su email** (se acepta cualquiera de los dos).
- Recibe por email un link que **vence en 1 hora** (`JWT_EMAIL_EXPIRES_IN`) y **sirve una sola vez**.
- Restablecer la contraseña **desbloquea la cuenta** si estaba bloqueada por demasiados intentos. Más adelante, el Admin también va a poder desbloquearla desde la gestión de usuarios.

### 1.1 Back (`modules/auth/`)

**Token de recuperación** (en `utils/token.js`):
- `generatePasswordResetToken(user)` firma con `JWT_ACTIVATION_SECRET` un payload `{ userId, purpose: 'password-reset', pwd }`. `pwd` son los primeros 16 caracteres del SHA-256 del hash de contraseña actual del usuario.
- `verifyPasswordResetToken(token, user)` controla tres cosas: la firma y el vencimiento, que `purpose` sea `'password-reset'` y que `pwd` coincida con el hash **actual**.

Así el link **se invalida solo** apenas se cambia la contraseña: sirve una sola vez sin guardar nada en la base. Agregá un comentario que lo explique.

**Endpoints:**

| Método y ruta | Qué hace |
|---|---|
| `POST /auth/forgot-password` | Body `{ identifier }`. Busca el usuario por `username` o por `email`. **Siempre** responde 200 con el mismo mensaje: *"Si los datos corresponden a una cuenta, te enviamos un email con los pasos para restablecer tu contraseña."* Solo envía el email si el usuario existe, tiene contraseña y está en ACTIVE o BLOCKED (a PENDING y DELETED no se les envía nada). Registra `PASSWORD_RECOVERY` con el `clubId` del usuario |
| `GET /auth/reset-password/validate?token=` | Responde si el token es válido, para que el front no muestre el formulario con un link vencido o ya usado |
| `POST /auth/reset-password` | Body `{ token, password, confirmPassword }`. Valida el token, aplica la política de contraseñas y rechaza que la nueva sea igual a la actual. En una transacción: guarda el hash nuevo y pone `failedAttempts = 0`; si estaba BLOCKED, lo pasa a ACTIVE. Registra `PASSWORD_CHANGE` y, si estaba bloqueado, también `USER_UNBLOCKED`. Envía el email de aviso de cambio de contraseña |

- **Si el token es inválido, está vencido o ya se usó:** 400, *"El link para restablecer la contraseña venció o ya fue usado. Pedí uno nuevo."*
- **Bitácora:** sumá a `LOG_ACTIONS` las acciones `PASSWORD_RECOVERY`, `PASSWORD_CHANGE`, `USER_UNBLOCKED` y `USER_UPDATE` (todas MEDIUM) si todavía no existen.
- **Emails** (`utils/mailer/`):
  - Ajustá `sendRecoveryEmail` para que use el token nuevo. El link es `${FRONTEND_URL}/reset-password?token=...`.
  - Agregá `buildPasswordChangedNotice` y `sendPasswordChangedNotice`: *"Te avisamos que tu contraseña fue modificada. Si no fuiste vos, comunicate con el club."*
  - Los dos en español rioplatense, con la firma de Club360. Usan los colores de marca: encabezado Marino y botón Naranja, con estilos en línea.
- **Desarrollo sin `RESEND_API_KEY`:** en `config/mail.js`, si no hay API key y `app.isDev` es verdadero, mostrá por consola el destinatario, el asunto y **los links** del email. Así se puede probar la recuperación sin enviar mails reales.

### 1.2 Front

- **`pages/auth/ForgotPasswordPage.jsx`** (`/forgot-password`, pública):
  - sobre `CourtBackground`, un campo "Usuario o email";
  - al enviar, muestra siempre el mensaje genérico del back;
  - incluye un link "Volver al inicio de sesión".
- **`pages/auth/ResetPasswordPage.jsx`** (`/reset-password?token=...`, pública):
  - al entrar valida el token;
  - si no es válido, muestra el mensaje y un botón "Pedir un link nuevo";
  - si es válido, muestra los campos nueva contraseña y confirmación, con la lista de requisitos marcando cuáles se cumplen (reutilizá el componente del registro; si no existe como componente, extraelo a `components/common/PasswordRequirements.jsx`);
  - al terminar → `/login` con un mensaje de éxito.
- **En `LoginPage`:** habilitá el link "¿Olvidaste tu contraseña?" → `/forgot-password` y sacá el texto "(próximamente)".

## 2. Mi cuenta (`auth.manageAccount`)

**Reglas:** el usuario puede modificar su **email, teléfono y foto**, y cambiar su **contraseña**. Su nombre, apellido, DNI, fecha de nacimiento y nombre de usuario se muestran **solo para lectura**: los modifica el Admin. La fecha de nacimiento no puede cambiarla el usuario porque define los permisos de los menores.

### 2.1 Back

Todos los endpoints llevan `isAuth` y `checkPermission(PERMISSIONS.AUTH_MANAGE_ACCOUNT)`:

| Método y ruta | Qué hace |
|---|---|
| `GET /auth/account` | Datos de la cuenta: nombre, apellido, DNI, fecha de nacimiento, usuario, email, teléfono, foto y, si es socio, su número de socio |
| `PUT /auth/account` | Body `{ email, phone }`. Email válido y único (409 *"Ese email ya está registrado"*); teléfono opcional, hasta 30 caracteres. Ignora cualquier otro campo del body. Registra `USER_UPDATE` |
| `POST /auth/account/photo` | `upload('avatars').single('photo')`. Guarda en `user.photo` la ruta `/uploads/avatars/<archivo>` y borra del disco la foto anterior, si había. Registra `USER_UPDATE` |
| `PUT /auth/account/password` | Body `{ currentPassword, newPassword, confirmPassword }`. Verifica la contraseña actual (si es incorrecta, 400 *"La contraseña actual no es correcta"*; **no** suma intentos fallidos), aplica la política de contraseñas y rechaza que la nueva sea igual a la actual. Registra `PASSWORD_CHANGE` y envía el aviso por email |

Después de cualquier cambio, el front llama a `refreshSession()` para que el nombre y la foto del menú se actualicen.

### 2.2 Front — `pages/account/AccountPage.jsx` (`/account`)

- Tarjeta **"Mis datos"**:
  - la foto (`Avatar` grande) con botón "Cambiar foto";
  - los datos de solo lectura, con el número de socio en la variante `numeric`;
  - email y teléfono editables, con botón "Guardar cambios";
  - una nota chica: *"Para modificar tu nombre, DNI o fecha de nacimiento, comunicate con el club."*
- Tarjeta **"Cambiar contraseña"**: contraseña actual, nueva y confirmación, con `PasswordRequirements`.
- Los mensajes de éxito y error se muestran con `Snackbar` o `Alert`.
- Las fotos se muestran con la URL completa: `${import.meta.env.VITE_API_URL}${user.photo}`. Armala en un helper de `utils/`, no en cada componente.

## 3. Layout del dashboard

### 3.1 Menú según permisos — `client/src/navigation/menu.js`

Archivo de configuración único con todas las secciones del sistema. Cada entrada es `{ label, path, icon, permission, group }`, con íconos de `@mui/icons-material` en su versión Rounded. El menú muestra **solo** las entradas cuyo `permission` está en `session.permissions`. Si en un mismo grupo hay dos entradas con el mismo `label` (por ejemplo, dos "Cuotas"), se muestra la primera que tenga permiso.

| Grupo | Label | Path | Permiso |
|---|---|---|---|
| — | Inicio | `/` | (siempre) |
| Gestión | Socios | `/members` | `members.manage` |
| Gestión | Staff | `/staff` | `staff.manage` |
| Gestión | Cuotas | `/fees` | `fees.manage` |
| Gestión | Inscripciones | `/inscriptions` | `inscriptions.approve` |
| Gestión | Ligas y categorías | `/leagues` | `leagues.manage` |
| Gestión | Partidos | `/games` | `games.manage` |
| Gestión | Cuotas de jugadoras | `/fees/players` | `fees.viewPlayers` |
| Deportivo | Mis categorías | `/my-categories` | `leagues.viewAssigned` |
| Deportivo | Partidos | `/games/assigned` | `games.viewAssigned` |
| Deportivo | Citaciones | `/citations` | `citations.create` |
| Deportivo | Rutinas | `/routines` | `routines.manage` |
| Deportivo | Rutinas | `/routines/assigned` | `routines.viewAssigned` |
| Mi espacio | Mis partidos | `/my-games` | `games.viewOwn` |
| Mi espacio | Mis citaciones | `/my-citations` | `citations.respond` |
| Mi espacio | Mi rutina | `/my-routine` | `routines.viewOwn` |
| Mi espacio | Mis cuotas | `/my-fees` | `fees.viewOwn` |
| Mi espacio | Deportes | `/my-sports` | `inscriptions.request` |
| Familia | Partidos | `/family/games` | `games.viewLinked` |
| Familia | Citaciones | `/family/citations` | `citations.viewLinked` |
| Familia | Estado de cuenta | `/family/fees` | `fees.manageLinked` |
| Club | El club | `/club` | `clubs.viewInfo` |
| Club | Configuración del club | `/club/settings` | `clubs.manageSettings` |
| Club | Deportes del club | `/club/sports` | `clubs.manageSports` |
| Club | Enviar avisos | `/notifications/send` | `notifications.sendAll` |
| Club | Enviar avisos | `/notifications/send` | `notifications.sendSport` |
| Club | Enviar avisos | `/notifications/send` | `notifications.sendCategory` |
| Sistema | Roles y permisos | `/access/roles` | `access.manageRoles` |
| Sistema | Usuarios y roles | `/access/users` | `access.assignRoles` |
| Sistema | Bitácora | `/logs` | `logs.view` |
| Sistema | Integridad de datos | `/integrity` | `integrity.manage` |
| Sistema | Copias de seguridad | `/backup` | `backup.manage` |

Agregá arriba del archivo un comentario: **toda pantalla nueva se agrega acá con su permiso**, y su ruta en `AppRouter` con `PermissionRoute` y el mismo permiso.

### 3.2 `layouts/DashboardLayout.jsx`

Tiene que verse como el panel del moodboard:

- **Menú lateral Marino:**
  - arriba, `BrandLogo` en su versión clara y debajo el nombre del club (`session.club.name`);
  - las entradas agrupadas, con el título de cada grupo en letra chica y espaciada;
  - la entrada activa resaltada como en el moodboard.
  - En escritorio queda fijo (`Drawer` permanente, unos 240 px). En el celular se esconde y se abre con un botón de menú (`Drawer` temporal).
- **Barra superior blanca:**
  - a la izquierda, el botón de menú (solo en el celular) y el título de la sección actual (el `label` de la entrada activa);
  - a la derecha, la campana de notificaciones si tiene `notifications.view` (por ahora sin contador, lleva a `/notifications`) y el avatar del usuario.
- **Menú del avatar:**
  - nombre del usuario y su rol activo, en un `StatusChip` o chip neutro;
  - "Cambiar de rol", solo si tiene más de un rol: lista los roles disponibles y marca el activo. Al elegir otro, llama a `switchRole`, ejecuta `startSession` con el token nuevo y navega a `/`, porque los permisos cambian;
  - "Mi cuenta" → `/account`;
  - "Cerrar sesión".
- El contenido se renderiza con `<Outlet />` sobre el fondo de trabajo (`background.default`), con márgenes cómodos y un ancho máximo legible.

### 3.3 Rutas (`routes/AppRouter.jsx`)

- **Públicas** (si hay sesión, redirigen a `/`): `/login`, `/register`, `/forgot-password`, `/reset-password`.
- **`/select-role`:** exige sesión, pero no rol activo. No usa el layout.
- **Privadas con layout:** una ruta padre con `PermissionRoute` (sesión y rol activo) que renderiza `DashboardLayout`, y adentro:
  - `/` → `HomePage`;
  - `/account` → `AccountPage`, con `PermissionRoute permission="auth.manageAccount"`;
  - `/notifications` → `ComingSoonPage`, con `notifications.view`;
  - **cada entrada de `menu.js`** con su `PermissionRoute` y su permiso. Mientras la pantalla no exista, renderiza `ComingSoonPage`. Generá estas rutas recorriendo `menu.js`, para no repetirlas a mano.
    - Si varias entradas comparten el mismo `path` (por ejemplo, los tres "Enviar avisos"), generan **una sola ruta**, que se habilita con **cualquiera** de esos permisos.
    - Para eso, `PermissionRoute` tiene que aceptar en `permission` un string o un array; con un array, alcanza con tener uno de los permisos.
- `*` → `/`.

### 3.4 Páginas y texturas

- **`components/common/ParquetBackground.jsx`:** textura de parquet (tablas claras en tonos crema y madera, con una línea naranja y una azul como las de la cancha), hecha con CSS o SVG, como en el moodboard. Se usa para los estados vacíos y las rutinas.
- **`components/common/EmptyState.jsx`:** ícono, título, texto y acción opcional, sobre `ParquetBackground`.
- **`pages/ComingSoonPage.jsx`:** usa `EmptyState`, con el título de la sección y el texto *"Esta sección está en construcción. Muy pronto vas a poder usarla desde acá."*
- **`components/common/NetGrid.jsx`:** fondo con trama de red (cuadrícula fina con un borde superior Marino), como el panel de íconos del moodboard.
- **`pages/HomePage.jsx`** (reemplaza la provisoria):
  - saludo *"Hola, {nombre}"* y el rol activo;
  - debajo, una grilla de **accesos rápidos** sobre `NetGrid`, con un botón grande por cada entrada del menú disponible (ícono redondeado + label), salvo Inicio;
  - si el usuario es menor, nada especial por ahora.
  - Los dashboards propios de cada rol (próximo partido, citaciones, etc.) se van a hacer con cada módulo.

## 4. Documentación del repo

No modifiques `CLAUDE.md` ni `docs/contexto.md`: ya vienen con estas decisiones. Si ves que no las incluyen, avisame.

## 5. Verificación

### 5.1 Back

Hacelo con un script temporal **fuera del repo**, con un usuario de prueba creado con los modelos y borrado al final:

1. **`forgot-password`:**
   - con un usuario que existe, por username y por email → 200, y en la consola aparece el link;
   - con uno inexistente → la misma respuesta 200, sin email;
   - con un usuario PENDING → 200, sin email.
2. **`reset-password`:**
   - con token válido → cambia la contraseña;
   - **el mismo token una segunda vez** → 400 (ya usado);
   - con token adulterado → 400;
   - con token vencido (generalo con vencimiento de 1 segundo) → 400;
   - con una contraseña igual a la actual → rechazado.
3. **Desbloqueo:** bloqueá al usuario con 5 intentos fallidos y pedí el reset. Después del reset, el usuario está ACTIVE, `failedAttempts = 0` y entra con la contraseña nueva. En la bitácora quedan `PASSWORD_RECOVERY`, `PASSWORD_CHANGE` y `USER_UNBLOCKED`.
4. **Mi cuenta:**
   - `PUT /auth/account` cambia el email y el teléfono e **ignora** un `birthDate` o un `name` enviados en el body;
   - un email repetido → 409;
   - sin el permiso `auth.manageAccount` → 403.
5. **Cambio de contraseña:** con la contraseña actual incorrecta, rechaza sin sumar `failedAttempts`; con los datos correctos, cambia la contraseña y registra `PASSWORD_CHANGE`.
6. **Foto:** se guarda en `uploads/avatars/`, `user.photo` queda con la ruta y la foto anterior se borra del disco.
7. **Integridad:** al final, la verificación de DVH/DVV del P03 sigue dando todo correcto.

### 5.2 Front

1. `npm run build` en `client/` compila sin errores. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano en el navegador:
   - con el Admin, el menú muestra Inicio, los grupos Gestión, Club y Sistema y nada de Mi espacio;
   - con un usuario Socio + Familia, cambiar de rol desde el avatar cambia el menú;
   - el flujo completo de "Olvidé mi contraseña" usando el link de la consola;
   - el menú en tamaño celular;
   - la página de una sección en construcción.

### 5.3 Cierre

1. **Actualizá `docs/TODO.md`:**
   - en la Fase 2, marcá: recuperación de contraseña (sacale el `[!]`); modificar los datos de la propia cuenta; y el layout del dashboard con el menú según los permisos;
   - en la Fase 3, si no existe, agregá la tarea *"Desbloqueo de usuarios por el Admin (desde la gestión de socios y staff)"*;
   - en las Decisiones pendientes, marcá la **D1**;
   - agregá la línea al Registro.
2. Mostrame el resultado de la verificación y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
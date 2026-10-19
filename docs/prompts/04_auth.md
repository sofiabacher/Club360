# Prompt 04 — Login, registro con número de socio, rol activo y sesión

Vas a implementar el inicio de sesión completo de Club360, en el back y en el front. Antes de empezar, leé `CLAUDE.md` (incluida la sección "Diseño visual"), las secciones 3, 4, 8 y 11 de `docs/contexto.md`, y mirá `docs/moodboard.png`.

**Alcance:**
- **Se hace:**
  - login con bloqueo por intentos fallidos;
  - registro del socio con su número de socio;
  - elección y cambio de rol activo;
  - `/auth/me` y logout;
  - el cálculo de los permisos efectivos;
  - la actualización de las constantes de estados;
  - el tema visual del front según el moodboard;
  - las pantallas de login, registro y selección de rol.
- **No se hace:**
  - recuperación de contraseña (bloqueada por la decisión D1);
  - registro de Familia con código de vínculo (Fase 3);
  - modificación de los datos de la cuenta;
  - el layout del dashboard y el menú;
  - desbloqueo de usuarios por el Admin.
- **No** hagas commit.

## 1. Constantes de estados (decisión D8, cerrada)

En `api/src/utils/constants.js` **y** en `client/src/utils/constants.js`, revisa que todos los estados estén así y que no queden marcas `[A DEFINIR]`:

- `USER_STATES = { PENDING: 1, ACTIVE: 2, BLOCKED: 3, DELETED: 4 }`
- `MEMBER_STATES = { ACTIVE: 1, SUSPENDED: 2, INACTIVE: 3 }`
  - **SUSPENDED:** perdió la condición por mora y la recupera sola al regularizar.
  - **INACTIVE:** baja dada por el Admin.
- `INSCRIPTION_STATES = { PENDING: 1, APPROVED: 2, REJECTED: 3, CANCELLED: 4 }`
- `FEE_STATES = { PENDING: 1, PAID: 2, OVERDUE: 3 }`
- `TRANSACTION_STATES = { PENDING: 1, APPROVED: 2, REJECTED: 3 }`
- `CITATION_STATES = { PENDING: 1, CONFIRMED: 2, REJECTED: 3, AUTO_CONFIRMED: 4, CANCELLED: 5 }`
- `GAME_STATES = { SCHEDULED: 1, PLAYED: 2, CANCELLED: 3 }`

Agregá también, **solo en el back**:

- `BASE_ROLES`: nombres de los 7 roles base.
  ```js
  { ADMIN: 'Admin del Club', REPRESENTATIVE: 'Representante', COACH: 'Entrenadora',
    TRAINER: 'Preparadora física', MEMBER: 'Socio', PLAYER: 'Jugadora', FAMILY: 'Familia' }
  ```
  Usalos en `seed/data/baseRoles.js` en lugar de los strings sueltos.
- `MEMBERSHIP_ROLES = [BASE_ROLES.MEMBER, BASE_ROLES.PLAYER]`: los roles que dependen de que el socio no esté dado de baja (ver punto 2.2).
- En `LOG_ACTIONS`, sumá:
  - `REGISTER_SUCCESS: { message: 'Registro con número de socio', criticity: MEDIUM }`
  - `REGISTER_FAIL: { message: 'Registro con número de socio fallido', criticity: MEDIUM }`

## 2. Reglas de la sesión

### 2.1 Login: usuario y contraseña

- Se ingresa con `username` y `password`, no con el email.
- **Estados del usuario:**
  - **PENDING** (todavía no se registró): no puede entrar. Mensaje: *"Tu cuenta todavía no está activada. Si es tu primer ingreso, registrate con tu número de socio."*
  - **BLOCKED:** *"Tu cuenta está bloqueada por intentos fallidos. Comunicate con el club."*
  - **DELETED:** *"Tu cuenta fue dada de baja."*
  - Solo entra un usuario en estado **ACTIVE** que tenga contraseña.
- **Bloqueo:** cada contraseña incorrecta suma 1 a `failedAttempts`. Al llegar a `LOGIN_MAX_ATTEMPTS` (5), el usuario pasa a BLOCKED y se registra `USER_BLOCKED` en la bitácora. Un login correcto vuelve `failedAttempts` a 0. Es el mismo patrón de HotelDesk.
- **Si el usuario no existe**, responder el mismo mensaje que con la contraseña incorrecta (*"Usuario o contraseña incorrectos"*), para no revelar qué usuarios existen. Ese caso no se registra en la bitácora, porque no hay `clubId`.
- **Bitácora:** `LOGIN_SUCCESS` y `LOGIN_FAIL` llevan el `clubId` del usuario. El `roleId` va solo si ya quedó un rol activo.

### 2.2 Roles disponibles

Los roles disponibles de un usuario son los de `user_role` (de su club), con una excepción: si el usuario tiene un `member` en estado **INACTIVE**, se quitan los roles de `MEMBERSHIP_ROLES` (Socio y Jugadora). Esto **no** es dar acceso por nombre de rol: es la disponibilidad del rol según la membresía. Los demás roles (por ejemplo, Familia) siguen disponibles.

- Si no le queda **ningún** rol disponible, no puede entrar: *"No tenés roles habilitados en el club. Comunicate con la administración."*
- Un socio **SUSPENDED** por mora sí conserva sus roles: la mora solo restringe las citaciones y la condición de socio (contexto, sección 6).

Implementalo en una función `getAvailableRoles(userId)` dentro de `modules/access/access.service.js`.

### 2.3 Rol activo: se elige al entrar

- Si al iniciar sesión el usuario tiene **un solo** rol disponible, el token ya sale con ese `activeRoleId`.
- Si tiene **más de uno**, el token sale con `activeRoleId: null` y la respuesta incluye `requiresRoleSelection: true`. El front lo manda a la pantalla de selección.
- Con `activeRoleId` en null, el usuario solo puede usar `/auth/me`, `/auth/switch-role` y `/auth/logout`. `checkPermission` responde 403 con *"Elegí un rol para continuar"*.
- `POST /auth/switch-role` sirve tanto para la primera elección como para los cambios posteriores. Verifica que el rol esté entre los disponibles, genera un **token nuevo** y registra `ROLE_SWITCH` con el `roleId` elegido.

### 2.4 Permisos efectivos (patentes y familias)

Agregá `getEffectivePermissions(userId, activeRoleId)` en `modules/access/access.service.js`:

1. Si `activeRoleId` es null, devuelve `[]`.
2. Arma la unión de los permisos del rol activo (`role_permission`) y los permisos directos del usuario (`user_permission`). Devuelve los nombres sin repetir.
3. **Condición calculada:** si el usuario es **menor de 18** (por `birthDate`), se quitan los permisos de `ADULT_ONLY_PERMISSIONS`. Definí esa lista en `utils/permissions.js` como `[PERMISSIONS.FEES_PAY_OWN, PERMISSIONS.MEMBERS_UNLINK_ADULT]`, con un comentario que la vincule con la sección 4.1 de la documentación y con la 3.4 del contexto. Este mecanismo es el caso de uso real de "Patentes y Familias".

Creá `utils/dates.js` con `getAge(birthDate)` e `isAdult(birthDate)`. La edad se calcula por la fecha completa, no solo por el año, en la zona horaria de Argentina.

**Usá esta misma función en `checkPermission`**, reemplazando su consulta actual. Así el back y el front (vía `/auth/me`) calculan los permisos exactamente igual.

### 2.5 Validación del token en cada request (`isAuth`)

Además de lo que ya hace, si el token trae `activeRoleId`, `isAuth` verifica que ese rol **siga** entre los disponibles del usuario. Si el Admin le sacó el rol o dio de baja al socio, responde 401 con *"Tu sesión ya no es válida. Iniciá sesión de nuevo."* Agregá también `isAdult` a `req.user`.

### 2.6 Registro con número de socio (primer ingreso)

`POST /auth/register-member` con `{ numMember, birthDate, username, password, confirmPassword }`:

1. Buscá el `member` por `numMember`, con su `user`. Si no existe o si `birthDate` no coincide con `user.birthDate`, respondé un **único mensaje genérico**: *"Los datos ingresados no coinciden con ningún socio."* No reveles cuál de los dos falló. Registrá `REGISTER_FAIL` solo si el socio existe, porque solo en ese caso hay `clubId`.
2. Recién después de que coincidan los datos, revisá:
   - si el usuario no está en PENDING o ya tiene contraseña: *"Este número de socio ya fue utilizado. Iniciá sesión con tu usuario."* (el número se usa una sola vez);
   - si el `member` está INACTIVE: *"Tu condición de socio no está activa. Comunicate con el club."*
3. Si el `username` ya existe: 409, *"Ese nombre de usuario ya está en uso."*
4. Dentro de una transacción, guardá `username`, la contraseña con `hashPassword`, `userStateId = ACTIVE` y `failedAttempts = 0`. Los hooks recalculan el DVH solos; pasá la transacción.
5. Registrá `REGISTER_SUCCESS` y respondé éxito, **sin token**. El front lleva al login con el usuario precargado.

Nota: el alta presencial (que crea el `user` en PENDING, el `member` y el rol Socio) es de la Fase 3. Este endpoint asume que ya existen.

### 2.7 Política de contraseñas

Es la misma de HotelDesk: mínimo 8 caracteres, con al menos una mayúscula, una minúscula, un número y un carácter especial.

## 3. Endpoints (`modules/auth/`)

| Método y ruta | Middlewares | Qué hace |
|---|---|---|
| `POST /auth/login` | validator | Login (2.1 a 2.3). Responde `{ token, requiresRoleSelection, session }` |
| `POST /auth/register-member` | validator | Registro (2.6) |
| `POST /auth/switch-role` | `isAuth`, validator | Elige o cambia el rol activo (2.3). Responde `{ token, session }` |
| `GET /auth/me` | `isAuth` | Responde `{ session }` |
| `POST /auth/logout` | `isAuth` | Registra `LOGOUT` en la bitácora. El token lo borra el front |

**`session`** se arma siempre con la misma función, `buildSession(userId, activeRoleId)`, en `auth.service.js`:

```js
{
  user: { id, name, lastName, email, username, photo, birthDate, isAdult },
  club: { id, name },
  roles: [{ id, name }],          // roles disponibles (2.2)
  activeRole: { id, name } | null,
  permissions: ['módulo.acción', ...]  // getEffectivePermissions (2.4)
}
```

- **Validators:**
  - **login:** `username` y `password` no vacíos.
  - **register-member:**
    - `numMember` no vacío;
    - `birthDate` con formato `AAAA-MM-DD`;
    - `username` de 4 a 50 caracteres, solo letras, números, punto y guion bajo;
    - `password` según 2.7;
    - `confirmPassword` igual a `password`.
  - **switch-role:** `roleId` entero positivo.
- Todos los mensajes al usuario van en `utils/messages.js`, en español rioplatense.
- **Capas:** las rutas solo encadenan middlewares y controller, el controller no tiene lógica y el service hace todo.

## 4. Front

### 4.0 Tema visual (decisión D10, según `docs/moodboard.png`)

Instalá `@fontsource/barlow-condensed` (pesos 600 y 700) en `client/`. Reescribí `client/src/theme.js`:

- **`palette`:**
  - `primary`: `{ main: '#EA6A1F', contrastText: '#FFFFFF' }` — Naranja, lo urgente y la acción principal
  - `secondary`: `{ main: '#1E40AF' }` — Azul, acciones secundarias, links y selección
  - `navy`: `{ main: '#0F1B3D', contrastText: '#FFFFFF' }` — Marino, estructura y títulos
  - `cream`: `{ main: '#FBF4E6' }` · `burgundy`: `{ main: '#8E2C3A' }`
  - `success`: `{ main: '#1F8A5B' }` · `warning`: `{ main: '#8A5300' }` · `error`: `{ main: '#A32929' }`
  - `background`: `{ default: '#F6F7FB', paper: '#FFFFFF' }`
  - `text`: `{ primary: '#0F1B3D', secondary: '#555A68' }`
- **`status`** (clave propia del tema, para los chips): `ok: { bg: '#E3F4EB', fg: '#16683F' }`, `pending: { bg: '#FEF3C7', fg: '#8A5300' }`, `overdue: { bg: '#FCE8E8', fg: '#A32929' }`, `urgent: { bg: '#FDEBDD', fg: '#B4470D' }`.
- **`typography`:** Poppins como fuente general. Títulos `h1`–`h4` en peso 700 y `h5`–`h6` en 600. Botones sin mayúsculas (`textTransform: 'none'`) y en peso 600. Agregá una variante **`numeric`** con `fontFamily: '"Barlow Condensed", sans-serif'` y peso 700, para resultados, fechas y horas y número de socio, y registrala en `MuiTypography.defaultProps.variantMapping` (que renderice un `span`).
- **`shape.borderRadius`:** 12. Botones con radio 10 y `disableElevation`. Chips redondeados en forma de píldora.
- Importá Poppins (400, 500, 600 y 700) y Barlow Condensed en `theme.js` o `main.jsx`.

Componentes comunes (`components/common/`):
- **`StatusChip.jsx`:** `<StatusChip status="ok|pending|overdue|urgent" label="..." />`, que toma los colores de `theme.status`. Se va a usar en todo el sistema para los estados. En esta tarea solo se crea.
- **`CourtBackground.jsx`:** fondo de pantalla completa en Marino con una cancha de vóley estilizada en Naranja con líneas blancas, hecha en SVG (vista desde arriba, como en el moodboard), y el contenido (`children`) centrado encima. En el celular, la cancha se achica o se recorta sin tapar el formulario.
- **`BrandLogo.jsx`:** "Club" en Marino (o en blanco sobre fondo oscuro, según una prop) y "360" en Naranja, en Poppins 700.

### 4.1 Sesión (`AuthContext`, `api/auth.api.js`, rutas)

- **`auth.api.js`:** `login`, `registerMember`, `switchRole`, `getMe` y `logout`.
- **`AuthContext`:**
  - Agregá `loading`. Al montar, si hay token en `localStorage`, llama a `getMe()` para recuperar la sesión después de recargar la página. Si falla, limpia la sesión.
  - `startSession({ token, session })` guarda el token y la sesión.
  - `refreshSession()` vuelve a pedir `getMe()`.
  - `endSession()` llama a `logout` (ignorando errores) y limpia todo.
  - Exponé `user`, `club`, `roles`, `activeRole`, `permissions`, `isAuthenticated` y `loading`.
- **`PermissionRoute`:**
  - mientras `loading`, muestra un `CircularProgress` centrado;
  - sin sesión, manda a `/login`;
  - con sesión pero sin rol activo, manda a `/select-role`;
  - si le falta el permiso, manda a `/`.
- **Rutas:**
  - `/login` y `/register` son públicas. Si ya hay sesión, redirigen a `/`.
  - `/select-role` exige sesión, pero no rol activo.
  - `/` exige sesión y rol activo.

### 4.2 Pantallas (Material UI, responsive, en español con voseo)

Login, registro y selección de rol van sobre `CourtBackground`, con el formulario en una `Card` blanca centrada y el `BrandLogo` arriba. Tienen que verse bien en el celular. Se usan solo los colores, las fuentes y los íconos Rounded del tema: nada de colores sueltos. El botón principal de cada pantalla (Ingresar, Registrarme) va en `primary` (Naranja), y los links en `secondary`.

- **`pages/auth/LoginPage.jsx`:**
  - Campos usuario y contraseña, con botón para mostrar u ocultar la contraseña. Botón "Ingresar" con estado de carga.
  - Los errores del back se muestran en un `Alert`.
  - Link "¿Primer ingreso? Registrate con tu número de socio" → `/register`.
  - Link "¿Olvidaste tu contraseña?" deshabilitado, con el texto "(próximamente)", porque depende de la decisión D1.
  - Si llega desde el registro, muestra el usuario precargado y un mensaje de éxito.
  - Después del login: `startSession`, y si viene `requiresRoleSelection` → `/select-role`; si no → `/`.
- **`pages/auth/RegisterMemberPage.jsx`:**
  - Campos: número de socio, fecha de nacimiento (`DatePicker` de `@mui/x-date-pickers` con `date-fns` en español), usuario, contraseña y confirmación.
  - Debajo de la contraseña, la lista de requisitos de 2.7, marcando cuáles se cumplen mientras se escribe.
  - Muestra los errores del back, incluidos los de validación campo por campo.
  - Al terminar → `/login` con el usuario precargado.
  - Configurá el `LocalizationProvider` con `AdapterDateFns` y el locale `es` en `main.jsx`.
- **`pages/auth/SelectRolePage.jsx`:**
  - "Hola, {nombre}. ¿Con qué rol querés ingresar?" y una tarjeta clickeable por cada rol disponible.
  - Al elegir: `switchRole` → `startSession` con el token nuevo → `/`.
  - Botón "Cerrar sesión".
- **`pages/HomePage.jsx` (provisoria hasta el layout del dashboard):**
  - Muestra "Hola, {nombre}", el club, el rol activo y la cantidad de permisos.
  - Botón "Cambiar de rol" (solo si tiene más de un rol) → `/select-role`.
  - Botón "Cerrar sesión".

## 5. Documentación del repo

No modifiques `CLAUDE.md` ni `docs/contexto.md`: ya vienen con estas decisiones. Si ves que no las incluyen, avisame.

## 6. Verificación

### 6.1 Back

Hacelo con un script temporal **fuera del repo** (scratchpad o `/tmp`). Las pruebas que necesitan `checkPermission` usan un router de prueba montado en el script, no en el repo.

**Datos de prueba.** Creá los usuarios con los modelos de Sequelize, para que los hooks calculen los DVH:
- **A:** socio menor en PENDING, sin contraseña, con rol Socio, `numMember` `TEST-0001` y fecha de nacimiento 2010-05-10.
- **B:** usuario mayor, ACTIVE, con roles Socio y Familia.
- **C:** socio INACTIVE con solo el rol Socio.
- **D:** socio INACTIVE con roles Socio y Familia.

**Casos a probar:**
1. **Login del Admin del seed:** sale con rol activo directo, `requiresRoleSelection: false` y 14 permisos.
2. **Bloqueo:** 5 contraseñas incorrectas en B lo bloquean. Un intento posterior, aunque la contraseña sea correcta, es rechazado. En la bitácora quedan `LOGIN_FAIL` y `USER_BLOCKED`. Después desbloquealo desde el script para seguir.
3. **Usuario inexistente:** mismo mensaje que la contraseña incorrecta.
4. **A antes de registrarse:** el login es rechazado con el mensaje de cuenta no activada.
5. **Registro de A:**
   - con fecha de nacimiento incorrecta → mensaje genérico;
   - con un `username` ya usado → 409;
   - con los datos correctos → éxito;
   - un segundo registro con el mismo número → "ya fue utilizado".
6. **A después de registrarse:** entra con rol Socio y tiene **7** permisos, porque se le quitan `fees.payOwn` y `members.unlinkAdult` por ser menor.
7. **B:**
   - el login responde `requiresRoleSelection: true` y `permissions: []`;
   - el router de prueba con `checkPermission` responde 403;
   - `switch-role` a Familia da 7 permisos;
   - `switch-role` a Socio da 9 permisos, porque es mayor;
   - `switch-role` a un rol que no tiene responde 403.
8. **C:** no puede entrar, porque no le quedan roles.
9. **D:** entra directo con Familia, porque es su único rol disponible.
10. **Rol revocado:** con el token de B en Socio, quitale el rol Socio desde el script. La siguiente request con ese token responde 401.
11. **Bitácora:** `/auth/me` devuelve la misma sesión que el login, y `logout` registra `LOGOUT`.
12. **Limpieza:** al final, borrá los datos de prueba (roles de usuario, `member`, `user`). Comprobá que el DVV de las tablas tocadas se recalculó y que la verificación de DVH/DVV del P03 sigue dando todo correcto.

### 6.2 Front

1. `npm run build` en `client/` tiene que compilar sin errores. Después borrá `dist/`.
2. Dejame en el resumen una lista corta de pruebas para hacer a mano en el navegador: login del Admin, registro de un socio, elección y cambio de rol, recarga de la página con la sesión abierta, logout, y cómo se ven las pantallas en tamaño celular comparadas con el moodboard.

### 6.3 Cierre

1. **Actualizá `docs/TODO.md`:**
   - en la Fase 2, marcá: login con bloqueo; registro con número de socio; elección y cambio de rol activo; `/auth/me`; y la pantalla de login, registro y selector de rol;
   - en las Decisiones pendientes, marcá la **D8** y la **D10** (con la nota "falta el color propio de Valencia");
   - agregá la línea al Registro.
2. Mostrame el resultado de cada caso de prueba y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
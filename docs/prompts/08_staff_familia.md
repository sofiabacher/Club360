# Prompt 08 — Staff, vínculo familiar y mayoría de edad

Vas a implementar tres cosas:
- la gestión de staff, con la activación de su cuenta por email;
- el circuito "Vincularme como Familia" con el código del menor;
- la desvinculación del adulto cuando el socio es mayor de edad, junto con la información de socio y de vínculo en "Mi cuenta".

Con esto se completa la Fase 3. Antes de empezar, leé `CLAUDE.md` (sobre todo "Socios y club", "Staff y vínculo familiar" y "Sesión y acceso") y las secciones 3.4, 3.5, 3.6 y 8 de `docs/contexto.md`.

**Alcance:**
- **Se hace:**
  - alta, modificación, baja, reactivación y desbloqueo de staff;
  - activación de cuenta por email;
  - vinculación como Familia, desde el login y desde la app;
  - desvinculación por mayoría de edad;
  - sección de socio y de vínculos en "Mi cuenta";
  - casos de prueba.
- **No se hace:**
  - asignar staff a categorías (es del módulo de ligas, P09);
  - el cambio del mailer a Gmail (P10). Los emails siguen saliendo por el mailer actual, que en desarrollo los muestra por consola.
- **No** hagas commit.

## 1. Reglas

### 1.1 Staff

1. **Roles de staff:** Representante, Entrenadora y Preparadora física (`STAFF_ROLES` en `utils/constants.js`, con los nombres de `BASE_ROLES`). Una persona puede tener **uno o más** y trabaja con el rol activo, como cualquier usuario con varios roles. Los roles se asignan con `assignBaseRole` y se quitan con `removeBaseRole`.
2. **Datos del alta:**
   - obligatorios: nombre, apellido, DNI, fecha de nacimiento, email, al menos un rol de staff y el deporte del club (`clubSportId`, entre los deportes activos);
   - opcional: teléfono.

   El email es obligatorio porque por ahí recibe la activación.
3. **Staff activo:** es el usuario que tiene **al menos un rol de staff**. Agregá `isActiveStaff(userId, { transaction })` en `staff.service.js` y usalo en todos lados donde haga falta saber si alguien es staff, en lugar de mirar solo si existe un registro en `staff`.
   - **Corregí `members.service.js`:** el alta de socio tiene que rechazar a la persona si `isActiveStaff` da verdadero, no por el solo hecho de tener un registro en `staff`.
4. **Staff y socio no se mezclan** (contexto 3.6):
   - no se puede dar de alta como staff a quien tiene un `member` en estado ACTIVE o SUSPENDED: 409, *"Esta persona es socia del club y no puede ser staff."*;
   - un ex socio con `member` INACTIVE sí puede ser staff.
5. **Persona que ya tiene usuario en el club** (se busca por DNI y por email):
   - si es staff activo: 409, *"Esta persona ya es parte del staff."*;
   - si tiene otro rol (por ejemplo, Familia), responde 409 con `code: 'EXISTING_USER'`. El front confirma y reenvía con `existingUserId`. En ese caso:
     - se crea (o se reutiliza, si fue staff antes) el registro `staff` sobre ese usuario;
     - se le asignan los roles;
     - **no** se le manda activación si ya tiene contraseña.
6. **Alta normal**, en una transacción:
   - crea el `user` en PENDING, sin usuario ni contraseña;
   - crea el registro `staff`;
   - le asigna los roles.

   Después de confirmar la transacción, le envía el email de activación (punto 1.2).
7. **Modificación:** datos personales (los mismos que para un socio), roles de staff (al menos uno) y deporte.
8. **Baja:**
   - se le quitan **todos** sus roles de staff con `removeBaseRole`;
   - si después de eso **no le queda ningún otro rol**, el usuario pasa a DELETED;
   - si le queda otro (por ejemplo, Familia), el usuario sigue ACTIVE y entra con ese rol;
   - el registro `staff` **no se borra**, porque lo referencian citaciones y asignaciones; un staff sin roles de staff es un ex staff.
9. **Reactivación:** el Admin vuelve a elegir los roles de staff.
   - Si el usuario estaba DELETED, pasa a ACTIVE si ya tenía contraseña, o a PENDING (con un email de activación nuevo) si nunca la activó.
   - Si nunca había quedado DELETED (porque conservaba Familia), solo se le devuelven los roles.
10. **Desbloqueo:** igual que en socios (BLOCKED → ACTIVE, `failedAttempts = 0`, `USER_UNBLOCKED`).

### 1.2 Activación de cuenta por email

- **Token** (en `utils/token.js`), con el mismo mecanismo que la recuperación de contraseña:
  - `generateActivationToken(user)` usa `purpose: 'account-activation'` y la huella del hash de contraseña. Como el usuario todavía no tiene contraseña, la huella es la del valor vacío, así el link deja de servir apenas la cuenta se activa.
  - Vence según `JWT_ACTIVATION_EXPIRES_IN` (nueva variable, default `48h`). Agregala a `config/index.js` y a `.env.example`.
- **Endpoints públicos:**
  - `GET /auth/activate/validate?token=`;
  - `POST /auth/activate` con `{ token, username, password, confirmPassword }`. Valida el token y que el usuario siga PENDING y sin contraseña, controla que el `username` sea único (409 si no) y aplica la política de contraseñas. Después guarda el usuario y la contraseña y pasa el usuario a ACTIVE. Registra `ACCOUNT_ACTIVATED`.
- **Email:** `buildActivationEmail` y `sendActivationEmail` en `utils/mailer/`. Asunto: *"Activá tu cuenta en Club360"*. Texto corto con el nombre del club, el link `${FRONTEND_URL}/activate?token=...` y el aviso de que vence en 48 horas. Estilo de los emails de `CLAUDE.md`. Registra `ACTIVATION_EMAIL_SENT`.
- **Reenvío:** el Admin puede reenviar la activación a un staff PENDING desde su detalle. Cada envío genera un token nuevo; los anteriores siguen sirviendo hasta que venzan o hasta que la cuenta se active.

### 1.3 Vincularme como Familia

1. **El código** de un socio menor (`member.codeFamily`) sirve **una sola vez**: queda usado cuando `linkStatus = true`.
2. **El adulto tiene que ser mayor de 18 y del mismo club** que el menor. No puede ser el propio menor ni otro menor.
3. **Dos caminos:**
   - **Usuario nuevo:** crea su cuenta con nombre, apellido, DNI, fecha de nacimiento, email (obligatorio), teléfono (opcional), usuario y contraseña, con la política de siempre. Queda ACTIVE de inmediato, en el club del menor. Si el DNI o el email ya existen en el club: 409, *"Ya tenés un usuario en el club. Elegí 'Ya tengo usuario' e ingresá con él."*
   - **Usuario existente:** ingresa su usuario y contraseña. Se validan con la misma lógica del login: estado, contraseña y **suma de intentos fallidos con bloqueo**. Puede ser Socio, Staff o ya Familia de otro menor (hermanos).
4. **Al vincular**, en una transacción:
   - `member.adultUserId = user.id` y `linkStatus = true`;
   - se le asigna el rol Familia con `assignBaseRole` (si ya lo tenía, no pasa nada);
   - se registra `FAMILY_LINKED`.
5. **Desde la app:** un usuario logueado (con cualquier rol) puede vincular a otro menor ingresando el código, sin volver a poner su contraseña. Por ejemplo, para un hermano.
6. **Mensajes:**
   - código inexistente: *"El código no es válido."*;
   - código ya usado: *"Este código ya fue usado."* No hace falta ocultar si un código existe, porque tiene 8 caracteres al azar y no se puede adivinar.

### 1.4 Desvincularse al ser mayor de edad

1. Lo hace el **propio socio**, con el permiso `members.unlinkAdult`. `getEffectivePermissions` ya se lo quita a los menores.
2. **Al desvincularse**, en una transacción:
   - `adultUserId = null`, `linkStatus = false` y **`codeFamily = null`**, para que el código usado no vuelva a quedar disponible;
   - si el adulto ya no tiene **ningún** otro menor vinculado, se le quita el rol Familia con `removeBaseRole`;
   - se registra `MEMBER_UNLINKED`, con el nombre del adulto en `details`.
3. **No se notifica** al adulto: no figura en la tabla de canales del contexto, sección 6.

### 1.5 Bitácora

Sumá a `LOG_ACTIONS`:
- `STAFF_CREATED`, `STAFF_UPDATED`, `STAFF_DEACTIVATED`, `STAFF_REACTIVATED` (MEDIUM);
- `ACCOUNT_ACTIVATED`, `ACTIVATION_EMAIL_SENT` (MEDIUM);
- `FAMILY_LINKED`, `MEMBER_UNLINKED` (MEDIUM).

## 2. Back

### 2.1 `modules/staff/` (todos con `checkPermission(PERMISSIONS.STAFF_MANAGE)`)

| Método y ruta | Qué hace |
|---|---|
| `GET /staff?search=&role=&state=&page=` | Listado paginado de a 20. Busca por nombre, apellido, DNI o email, y filtra por rol de staff y por estado (`active`, `pending`, `inactive` = ex staff). Devuelve `id`, nombre completo, roles de staff, deporte, `userStateId` y si es staff activo |
| `GET /staff/:id` | Detalle: datos personales (teléfono descifrado), roles de staff, otros roles (solo para mostrar), deporte, estados y fecha de alta |
| `POST /staff` | Alta (reglas 1.1.2 a 1.1.6). Body: `{ name, lastName, dni, birthDate, email, phone, roles, clubSportId, existingUserId? }`, donde `roles` es un array de nombres de `STAFF_ROLES` |
| `PUT /staff/:id` | Modificación (regla 1.1.7) |
| `POST /staff/:id/deactivate` | Baja (regla 1.1.8) |
| `POST /staff/:id/reactivate` | Reactivación con `{ roles }` (regla 1.1.9) |
| `POST /staff/:id/unblock` | Desbloqueo |
| `POST /staff/:id/resend-activation` | Reenvía la activación. Solo si el usuario está PENDING |

### 2.2 Activación (`modules/auth/`)

Los endpoints del punto 1.2.

### 2.3 Vínculo familiar (`modules/members/`, en un archivo de rutas o un grupo propio dentro del módulo)

| Método y ruta | Acceso | Qué hace |
|---|---|---|
| `POST /family-link/validate` | público | `{ code }`. Si es válido y no se usó, responde el nombre del menor (nombre y la inicial del apellido) y el nombre del club |
| `POST /family-link/new-account` | público | `{ code, name, lastName, dni, birthDate, email, phone, username, password, confirmPassword }`. Crea el usuario y vincula (camino 1) |
| `POST /family-link/existing-account` | público | `{ code, username, password }`. Valida las credenciales como el login y vincula (camino 2) |
| `POST /family-link` | `isAuth` | `{ code }`. Vincula al usuario logueado (regla 1.3.5). Si es su primer vínculo y ahora tiene más de un rol, el front le avisa que puede cambiar al rol Familia desde el menú |

### 2.4 Mi cuenta (`modules/auth/`)

- **Ampliá `GET /auth/account`** con:
  - **`member`**, si el usuario es socio: `numMember`, `memberStateId`, `isMinor` y `codeFamily` (solo si es menor y `linkStatus` es false);
  - **`adult`**: nombre del adulto, si está vinculado;
  - **`canUnlink`**: verdadero si es mayor, está vinculado y tiene `members.unlinkAdult` entre sus permisos efectivos;
  - **`linkedMembers`**, si es adulto responsable de alguien: `[{ name, numMember, age }]`.
- **Agregá `POST /auth/account/unlink`**, con `isAuth` y `checkPermission(PERMISSIONS.MEMBERS_UNLINK_ADULT)` (regla 1.4).

## 3. Front

### 3.1 Staff (`/staff`, en el menú desde el P05)

- **`pages/staff/StaffPage.jsx`:**
  - buscador, filtros por rol y por estado, y el botón **"Nuevo integrante del staff"** (naranja);
  - una tabla (tarjetas en el celular) con:
    - el nombre;
    - los roles de staff como chips;
    - el deporte;
    - el estado con `StatusChip`: Activo `ok`, Pendiente de activación `pending`, Bloqueado `overdue`, Ex staff neutro.
- **`pages/staff/StaffFormPage.jsx`** (`/staff/new` y `/staff/:id/edit`):
  - datos personales;
  - casillas para los roles de staff (al menos uno);
  - selector del deporte del club;
  - maneja `EXISTING_USER` con un diálogo de confirmación;
  - después del alta → va al detalle, con el mensaje *"Le enviamos el email de activación a {email}."* (o *"Ya tenía usuario: puede ingresar con él."* si se usó un usuario existente).
- **`pages/staff/StaffDetailPage.jsx`** (`/staff/:id`):
  - datos, roles y estados;
  - acciones, con confirmación las que cambian el estado: Editar, Dar de baja o Reactivar (con el selector de roles), Desbloquear (si está bloqueado) y Reenviar activación (si está pendiente).
- **Rutas:** agregá a `AppRouter`, con `staff.manage`, las rutas `/staff/new`, `/staff/:id` y `/staff/:id/edit`.

### 3.2 Activación (`/activate?token=`, pública)

**`pages/auth/ActivateAccountPage.jsx`**, sobre `CourtBackground`:
- valida el token;
- si no sirve, muestra el mensaje y la sugerencia de pedirle al club un link nuevo;
- si sirve: *"Hola, {nombre}. Elegí tu usuario y tu contraseña para entrar a Club360."* con los campos usuario, contraseña y confirmación, y `PasswordRequirements`;
- al terminar → `/login` con el usuario precargado y un mensaje de éxito.

### 3.3 Vincularme como Familia (`/family-link`, pública)

**`pages/auth/FamilyLinkPage.jsx`**, sobre `CourtBackground`, con un `Stepper` de tres pasos:
1. **"Código":** un campo con el formato `XXXX-XXXX` (mayúsculas automáticas y guion al tipear). Al validarlo: *"Vas a vincularte como adulto responsable de {Nombre I.}, socia de {club}."*
2. **"Tu cuenta":** dos pestañas.
   - "Ya tengo usuario": usuario y contraseña.
   - "Crear mi cuenta": el formulario del camino 1, con `PasswordRequirements`. La fecha de nacimiento tiene que ser de un mayor de edad.
3. **"Listo":** *"¡Listo! Ya estás vinculado como Familia."* y el botón "Ir a iniciar sesión", con el usuario precargado.

**En `LoginPage`:** agregá el link "Vincularme como Familia" → `/family-link`.

### 3.4 Mi cuenta

Agregá dos tarjetas a `AccountPage`:
- **"Mi condición de socio"** (solo si `member` existe):
  - el número de socio en la variante `numeric`;
  - el estado con `StatusChip`;
  - **si es menor y tiene código sin usar:** un recuadro con el código grande (variante `numeric`) y el texto *"Pasale este código a tu adulto responsable para que se vincule como Familia desde 'Vincularme como Familia'. Sirve una sola vez."*;
  - **si está vinculado:** *"Adulto responsable: {nombre}"*. Si `canUnlink`, el botón "Desvincularme", con un diálogo de confirmación que explica que el adulto deja de ver sus partidos, citaciones y cuotas.
- **"Jugadoras vinculadas"** (para cualquier usuario):
  - la lista de `linkedMembers`, si tiene;
  - el campo "Vincular a otra socia menor" con su código y el botón "Vincular".

  Después de vincular, ejecutá `refreshSession()`, porque puede sumar el rol Familia.

## 4. Casos de prueba documentados

- **Creá `docs/pruebas/staff.txt` con:**
  - alta con un rol;
  - alta con dos roles;
  - alta sin email (rechazada);
  - socio activo (rechazado);
  - ex socio inactivo (aceptado);
  - usuario Familia existente (`EXISTING_USER`);
  - activación con link válido, vencido y ya usado;
  - reenvío de la activación;
  - baja de quien solo es staff (usuario DELETED);
  - baja de quien además es Familia (sigue entrando como Familia);
  - reactivación;
  - desbloqueo.
- **Sumá a `docs/pruebas/members.txt` los casos de vínculo:**
  - código inválido;
  - código válido con cuenta nueva;
  - cuenta nueva de un menor (rechazada);
  - código con usuario existente;
  - contraseña incorrecta (suma intentos);
  - código ya usado;
  - vincular a un hermano desde la app;
  - el menor ve su código en "Mi cuenta";
  - el menor no puede desvincularse;
  - el mayor se desvincula y el adulto pierde el rol Familia si no le quedan otros vinculados;
  - socio con staff de baja: aceptado, por la corrección de la regla 1.1.3.

## 5. Documentación del repo

No modifiques `CLAUDE.md` ni `docs/contexto.md`: ya vienen con estas reglas. Si ves que no las incluyen, avisame.

## 6. Verificación

### 6.1 Back

Hacelo con un script temporal **fuera del repo**, con datos de prueba creados con los modelos y borrados al final:

1. **Alta de staff:**
   - sin email → 400;
   - socio activo → 409;
   - ex socio → OK;
   - usuario Familia → `EXISTING_USER`, y con `existingUserId` → OK sin activación;
   - con dos roles, el usuario tiene los dos.
2. **Activación:**
   - el link de la consola sirve una sola vez;
   - un token vencido (generalo con 1 segundo) → 400;
   - `username` repetido → 409;
   - después de activar, el login funciona.
3. **Baja de staff:**
   - solo staff → usuario DELETED y sin roles de staff;
   - staff y Familia → sigue ACTIVE, `getAvailableRoles` devuelve solo Familia y el login entra directo con ese rol.
4. **Reactivación** de los dos casos y **desbloqueo**.
5. **Corrección del P07:** un ex staff (sin roles de staff) puede darse de alta como socio; un staff activo, no.
6. **Vínculo:**
   - cuenta nueva → usuario ACTIVE con rol Familia, `member.adultUserId` asignado y `linkStatus` en true;
   - mismo código otra vez → "ya fue usado";
   - usuario existente con contraseña incorrecta suma `failedAttempts`;
   - adulto menor de 18 → rechazado;
   - vincular desde la app a un segundo menor deja a los dos en `linkedMembers`.
7. **Desvincularse:**
   - un menor → 403;
   - un mayor (cambiale la fecha de nacimiento a la de un mayor) → queda sin adulto, con `codeFamily` en null;
   - el adulto pierde el rol Familia solo si no le queda otro menor vinculado.
8. **Multi-tenant:** un código de un socio de otro club de prueba no vincula a un adulto de Valencia. Borrá el club de prueba al final.
9. **Integridad:** la verificación de DVH/DVV del P03 da todo correcto.

### 6.2 Front

1. `npm run build` compila sin errores. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano en el navegador:
   - alta de una entrenadora y su activación con el link de la consola;
   - alta de un socio menor, su comprobante y vincular un adulto con ese código desde `/family-link` con una cuenta nueva;
   - entrar como el menor y ver el código en "Mi cuenta" antes de vincular y el adulto después;
   - entrar como el adulto con el rol Familia;
   - las pantallas nuevas en tamaño celular.

### 6.3 Cierre

1. **Actualizá `docs/TODO.md`.** En la Fase 3, marcá:
   - el código visible en el perfil del menor;
   - "Vincularme como Familia";
   - la mayoría de edad y la desvinculación;
   - el alta, modificación y baja de staff;
   - el desbloqueo por el Admin (completo);
   - las pantallas del Admin;
   - el perfil del socio y la vinculación de Familia.

   Agregá la línea al Registro.
2. Mostrame el resultado de la verificación y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
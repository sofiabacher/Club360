# Prompt 07 — Club, deportes y alta de socios

Vas a implementar la configuración del club, la activación de deportes, el alta presencial de socios con su comprobante, la gestión de socios del Admin y la pantalla "El club". Antes de empezar, leé `CLAUDE.md` (sobre todo "Socios y club" y "Diseño visual"), las secciones 2.1, 3.1, 3.5 y 8 de `docs/contexto.md`, y mirá el carnet de socio en `docs/moodboard.png`.

**Alcance:**
- **Se hace:**
  - cambios en el modelo;
  - datos de Valencia en el seed;
  - configuración del club;
  - deportes del club;
  - alta de socio con comprobante imprimible;
  - listado, detalle, modificación, baja, reactivación y desbloqueo de socios;
  - pantalla "El club";
  - casos de prueba en `docs/pruebas/clubs.txt` y `docs/pruebas/members.txt`.
- **No se hace** (va en el P08):
  - staff;
  - "Vincularme como Familia" con el código;
  - el perfil del propio socio, con el código visible para el menor;
  - la desvinculación por mayoría de edad.
- **No** hagas commit.

## 1. Cambios en el modelo

### 1.1 `User`

- **`email`:** pasa a `allowNull: true`, sigue siendo `unique`. Es **obligatorio para los mayores de 18** y opcional para los menores. Esa regla va en los services (alta, modificación y Mi cuenta), no en el modelo.
- **`phone`:** pasa a `STRING(255)` y se guarda **cifrado con AES** (`encrypt`/`decrypt` de `utils/crypto.js`). Implementalo en el modelo:
  - un `set` que cifra (si el valor es vacío o `null`, guarda `null`);
  - un `get` que descifra.

  Así los services trabajan con el teléfono en claro sin acordarse de cifrar. Agregá un comentario: **no leer `phone` con `raw: true`**, porque así se obtiene el texto cifrado. Los hooks de integridad sí usan `raw: true` a propósito: el DVH se calcula sobre el valor cifrado guardado.
- **Revisá los lugares que ya usan `email` y `phone`:**
  - `forgot-password` tiene que ignorar a los usuarios sin email, sin cambiar su respuesta genérica;
  - Mi cuenta (`PUT /auth/account`) tiene que exigir email solo si el usuario es mayor.

### 1.2 `Club`

- **`accentColor`:** `STRING(7)`, `allowNull: false`, `defaultValue: '#0F1B3D'`. Es el color propio del club, en formato hex `#RRGGBB` (decisión D13).
- **`extraInfo`:** `JSON`, `allowNull: true`. Es la información general del club que no tiene columna propia:
  ```json
  {
    "whatsapp": "11 5000-0000",
    "secretaryHours": ["Lunes a viernes de 9 a 13 y de 16 a 21", "Sábados de 9 a 13"],
    "courts": [{ "name": "Cancha 1", "address": "Av. Ejemplo 1234" }],
    "trainingSchedule": [{ "sport": "Vóley", "schedule": "Lunes, miércoles y viernes de 18 a 22" }]
  }
  ```
  Agregá un comentario con esta estructura en el modelo y validala en el validator de la configuración del club.

### 1.3 Integridad con campos JSON

En `utils/integrity.js`, normalizá los objetos y arrays (no `Date`) como **JSON con las claves ordenadas** (`stableStringify`). Así el DVH no depende del orden en que MySQL devuelve las claves. Verificá que `computeRowDVH` siga dando igual en todas las tablas.

### 1.4 Recrear la base local

Como cambian columnas existentes, recreá la base:
1. Poné `DB_FORCE_SYNC=true` en `api/.env`.
2. Corré `npm run dev` hasta que diga que sincronizó y frenalo.
3. Volvé a `DB_FORCE_SYNC=false`.
4. Corré `npm run seed`.

Antes de hacerlo, avisame y esperá mi confirmación. En el resumen final, dejá estos pasos explicados para que los repita cada integrante después del merge.

## 2. Datos de Valencia en el seed (`seed/data/club.js`)

Cargá los datos provisorios de la sección 2.1 del contexto:
- **Nombre:** `Club Valencia`.
- **Dirección:** Av. Ejemplo 1234, Ciudad de Buenos Aires.
- **Teléfono:** (011) 4000-0000.
- **Email:** `contacto@clubvalencia.example`.
- **Cuotas:** `socialFee` 15000 y `priceFee` de Vóley 25000.
- **Otros parámetros:** `delayFee` 180 y `conflictMargin` 60.
- **Acento:** `accentColor` `#2E9BD6`.
- **`extraInfo`:**
  - WhatsApp: 11 5000-0000;
  - horarios de secretaría;
  - canchas: Cancha 1 y Cancha 2 en Av. Ejemplo 1234, y Cancha Anexo en Calle Ficticia 567, Ciudad de Buenos Aires;
  - horario de entrenamiento de Vóley.

Marcá todo con `// [PROVISORIO] contexto 2.1`.

**Idempotencia:**
- Si el club ya existe, el seed **solo completa** `accentColor` (si tiene el default) y `extraInfo` (si es `null`). No pisa lo que haya cambiado el Admin.
- Antes de crear el club, el seed busca también por el nombre viejo `'Valencia'`. Si lo encuentra, le cambia el nombre a `'Club Valencia'` en lugar de crear otro club.

## 3. Reglas de socios

1. **Número de socio:** 6 dígitos correlativos con ceros a la izquierda (`000001`), únicos en toda la plataforma.
   - Se genera en el service, dentro de la transacción del alta, como el máximo actual + 1.
   - Si choca con otro alta simultánea (error de unique), reintenta hasta 3 veces.
   - Agregá `generateMemberNumber(transaction)` en `members.service.js`.
2. **Código de vínculo familiar:** solo para los socios **menores de 18** al momento del alta.
   - Formato `XXXX-XXXX`, con letras y números sin los caracteres que se confunden (`23456789ABCDEFGHJKMNPQRSTUVWXYZ`), generado con `crypto.randomInt`.
   - Único: si choca, se genera otro.
   - Se guarda en `member.codeFamily`, con `linkStatus = false` y `adultUserId = null`.
3. **Datos del alta:**
   - **obligatorios:** nombre, apellido, DNI (7 u 8 dígitos) y fecha de nacimiento;
   - **email:** obligatorio si es mayor de edad, opcional si es menor;
   - **teléfono:** opcional.

   El DNI es obligatorio en el alta presencial aunque en el modelo admita NULL, porque el Admin lo tiene a mano y sirve para detectar si la persona ya tiene usuario.
4. **Persona que ya tiene usuario en el club** (se busca por DNI y por email):
   - **Si es Staff** (tiene registro en `staff`): 409, *"Esta persona es staff del club y no puede ser socia."*
   - **Si ya es socia** (tiene `member`): 409, *"Esta persona ya es socia (Nº {numMember})."*
   - **Si tiene usuario pero no es socia** (por ejemplo, un adulto Familia): 409 con `code: 'EXISTING_USER'` y los datos básicos del usuario. El front pregunta *"{Nombre} ya tiene usuario en el club. ¿Querés darlo de alta como socio con ese usuario?"* y, si se confirma, reenvía el alta con `existingUserId`. En ese caso se crea el `member` vinculado a ese usuario y se le asigna el rol Socio, **sin tocar** su usuario ni su contraseña, porque ya está activo y no necesita registrarse.
5. **Alta normal** (persona nueva), en **una transacción**:
   - crea el `user` en PENDING, sin usuario ni contraseña;
   - crea el `member` en estado ACTIVE, con su número y, si es menor, su código;
   - le asigna el rol Socio con `assignBaseRole(userId, BASE_ROLES.MEMBER, { transaction })`.
6. **Baja:** el `member` pasa a INACTIVE.
   - **No** se toca el `user`: si además es Familia, sigue entrando con ese rol (contexto 3.6.1).
   - Sus inscripciones, cuotas y categorías **no** se modifican acá: los módulos de cada cosa consultan el estado del socio.
7. **Reactivación:** solo de INACTIVE a ACTIVE, y la hace el Admin. Un socio SUSPENDED por mora **no** se reactiva a mano: se recupera solo al pagar (contexto, sección 6).
8. **Modificación por el Admin:** nombre, apellido, DNI, fecha de nacimiento, email, teléfono y nombre de usuario (si ya se registró).
   - El email vuelve a ser obligatorio si, con la fecha nueva, la persona es mayor.
   - Si cambia la fecha de nacimiento, se registra en la bitácora con la fecha anterior y la nueva, porque cambia los permisos condicionados por edad.
9. **Desbloqueo:** un usuario BLOCKED pasa a ACTIVE con `failedAttempts = 0`. Se registra `USER_UNBLOCKED`.
10. **Bitácora:** sumá a `LOG_ACTIONS` las acciones `MEMBER_CREATED`, `MEMBER_UPDATED`, `MEMBER_DEACTIVATED` y `MEMBER_REACTIVATED` (MEDIUM), y `CLUB_SETTINGS_UPDATED` y `CLUB_SPORT_UPDATED` (HIGH).

## 4. Back

### 4.1 `modules/clubs/`

| Método y ruta | Permiso | Qué hace |
|---|---|---|
| `GET /clubs/info` | `clubs.viewInfo` | Información pública del club: nombre, dirección, teléfono, email, `accentColor`, `extraInfo` y deportes activos con su cuota |
| `GET /clubs/settings` | `clubs.manageSettings` | Todo lo editable del club |
| `PUT /clubs/settings` | `clubs.manageSettings` | Modifica: `socialFee` (> 0), `delayFee` (días, entero ≥ 1), `conflictMargin` (minutos, entero ≥ 0), `address`, `phone`, `email`, `accentColor` (hex) y `extraInfo` (estructura del punto 1.2). El nombre del club no se edita |
| `GET /clubs/sports` | `clubs.manageSports` | Catálogo maestro con el estado de cada deporte en el club (activo o no) y su `priceFee` |
| `PUT /clubs/sports/:sportId` | `clubs.manageSports` | `{ isActive, priceFee }`. Activa (crea o reactiva el `clubSport`), desactiva o cambia la cuota. No se puede desactivar un deporte con inscripciones Pendientes o Aprobadas: 409, *"Hay socios inscriptos en este deporte. No se puede desactivar."* |

Sumá `accentColor` al objeto `club` de `buildSession`, para que el layout lo use.

### 4.2 `modules/members/`

Todos los endpoints llevan `checkPermission(PERMISSIONS.MEMBERS_MANAGE)`.

| Método y ruta | Qué hace |
|---|---|
| `GET /members?search=&state=&registration=&page=` | Listado paginado de a 20. Busca por nombre, apellido, DNI o número de socio. Filtros: estado del socio y registro (`pending` = usuario PENDING, `registered`). Devuelve: `id`, `numMember`, nombre completo, DNI, edad, `isMinor`, `memberStateId`, `userStateId` y si tiene código de vínculo sin usar |
| `GET /members/:id` | Detalle con los datos personales (teléfono descifrado), el estado del socio y del usuario, el código de vínculo (si no se usó) o el adulto vinculado (si se usó), sus roles y la fecha de alta |
| `POST /members` | Alta (reglas 1 a 5). Body: `{ name, lastName, dni, birthDate, email, phone, existingUserId? }`. Responde el socio creado con lo necesario para el comprobante |
| `PUT /members/:id` | Modificación (regla 8) |
| `POST /members/:id/deactivate` | Baja (regla 6). Pide confirmación en el front |
| `POST /members/:id/reactivate` | Reactivación (regla 7) |
| `POST /members/:id/unblock` | Desbloqueo (regla 9) |
| `GET /members/:id/receipt` | Datos del comprobante: club (nombre, `accentColor`), nombre completo, número de socio, fecha de alta, si está pendiente de registro, el código de vínculo si no se usó, y `registerUrl = ${FRONTEND_URL}/register` |

## 5. Front

### 5.1 Configuración del club (`/club/settings`, `pages/clubs/ClubSettingsPage.jsx`)

- **Tarjeta "Cuotas y plazos":** cuota social (en pesos), días de atraso para mora y margen de conflicto (en minutos). Cada campo con una ayuda corta debajo.
- **Tarjeta "Datos de contacto":** dirección, teléfono, email y WhatsApp.
- **Tarjeta "Información general":**
  - horarios de secretaría (lista editable de líneas);
  - canchas (lista editable de nombre y dirección);
  - horarios de entrenamiento (deporte y horario).
- **Tarjeta "Color del club":**
  - un campo hex con una muestra del color al lado;
  - una vista previa de la franja de acento junto al nombre del club.
- Un único botón "Guardar cambios" (naranja).

### 5.2 Deportes del club (`/club/sports`, `pages/clubs/ClubSportsPage.jsx`)

Una fila por deporte del catálogo, con su nombre, un `Switch` para activarlo y el campo de cuota deportiva (solo si está activo), con su botón para guardar. Los errores del back se muestran en un `Snackbar`.

### 5.3 Socios (`/members`)

- **`pages/members/MembersPage.jsx`:**
  - buscador, filtros por estado y registro, y el botón **"Nuevo socio"** (naranja);
  - una tabla (tarjetas en el celular) con:
    - el número de socio en la variante `numeric`;
    - el nombre;
    - un chip "Menor" si corresponde;
    - el estado con `StatusChip`: Activo `ok`, Suspendido `urgent`, Inactivo neutro;
    - "Pendiente de registro" (`pending`) si el usuario está PENDING;
    - "Bloqueado" (`overdue`) si está BLOCKED.
  - Tocar una fila abre el detalle.
- **`pages/members/MemberFormPage.jsx`** (`/members/new` y `/members/:id/edit`):
  - el formulario del alta o de la modificación;
  - debajo de la fecha de nacimiento, un aviso: *"Es menor de edad: se va a generar un código de vínculo para el adulto responsable"* y el email pasa a opcional;
  - maneja la respuesta `EXISTING_USER` con un diálogo de confirmación;
  - al terminar un alta → va directo al comprobante.
- **`pages/members/MemberDetailPage.jsx`** (`/members/:id`):
  - los datos;
  - los estados con chips;
  - el bloque "Vínculo familiar": el código si no se usó, o el nombre del adulto vinculado;
  - las acciones: Editar, Dar de baja o Reactivar (según el estado), Desbloquear (solo si está bloqueado) y Ver comprobante;
  - las acciones que cambian el estado piden confirmación.
- **`pages/members/MemberReceiptPage.jsx`** (`/members/:id/receipt`):
  - **Comprobante imprimible con forma de carnet,** como en el moodboard:
    - encabezado Bordó con el nombre del club en mayúsculas espaciadas y una franja con el `accentColor`;
    - fondo Crema;
    - el nombre del socio;
    - "SOCIO Nº 000123" en la variante `numeric`;
    - la fecha de alta.
  - **Debajo, las instrucciones de primer ingreso,** solo si está pendiente de registro: *"Entrá a {registerUrl} y registrate con tu número de socio y tu fecha de nacimiento."*
  - **Si tiene código de vínculo sin usar, un recuadro separado para el adulto responsable,** con el código grande en la variante `numeric` y el texto: *"Con este código, el adulto responsable se vincula como Familia desde la pantalla de inicio de sesión (opción 'Vincularme como Familia'). Se puede usar una sola vez."*
  - Botones "Imprimir" (`window.print()`) y "Volver al socio".
  - Con CSS de impresión (`@media print`) que esconde el menú, la barra superior y los botones, y deja solo el comprobante.

### 5.4 "El club" (`/club`, `pages/clubs/ClubInfoPage.jsx`)

- **Encabezado:** el nombre del club con la franja de acento y la textura `CourtBackground` en una versión baja, como encabezado de la página.
- **Tarjetas:**
  - contacto: dirección, teléfono, email y WhatsApp, con link `https://wa.me/549...` armado desde el número;
  - horarios de secretaría;
  - canchas;
  - horarios de entrenamiento;
  - deportes que ofrece el club.
- Íconos Rounded en cada tarjeta.

### 5.5 Menú, rutas y layout

- `/members`, `/club`, `/club/settings` y `/club/sports` ya están en `navigation/menu.js`: reemplazá su `ComingSoonPage`.
- Agregá a `AppRouter`, con `members.manage` y fuera del menú, las rutas `/members/new`, `/members/:id`, `/members/:id/edit` y `/members/:id/receipt`.
- **En `DashboardLayout`:** mostrá junto al nombre del club una franja vertical fina con `session.club.accentColor`.

## 6. Casos de prueba documentados

Creá `docs/pruebas/clubs.txt` y `docs/pruebas/members.txt` con el formato de `CLAUDE.md`. Como mínimo:

**`clubs.txt`:**
- modificar la configuración;
- valores inválidos;
- activar y desactivar un deporte;
- desactivar un deporte con inscriptos;
- ver "El club" con cada rol que tiene `clubs.viewInfo`.

**`members.txt`:**
- alta de un mayor;
- alta de un menor con código;
- alta de un menor sin email;
- alta de un mayor sin email (rechazada);
- DNI repetido de un socio;
- persona que es Staff;
- persona que ya es Familia (`EXISTING_USER`);
- número de socio correlativo;
- baja y reactivación;
- un suspendido que no se puede reactivar a mano;
- desbloqueo;
- cambio de fecha de nacimiento registrado en la bitácora;
- comprobante con y sin código.

## 7. Documentación del repo

No modifiques `CLAUDE.md` ni `docs/contexto.md`: ya vienen con estas decisiones. Si ves que no las incluyen, avisame.

## 8. Verificación

### 8.1 Back

Hacelo con un script temporal **fuera del repo**, después de recrear la base y correr el seed:

1. **Seed:** el club se llama "Club Valencia" y tiene los datos de 2.1, el `accentColor` y el `extraInfo`. Corriéndolo de nuevo no se duplica nada y no se pisa un `extraInfo` modificado.
2. **Teléfono:** al crear un usuario con teléfono, en la base (`raw: true`) queda cifrado, y leyéndolo con el modelo vuelve en claro.
3. **Alta:**
   - mayor sin email → 400;
   - menor sin email → OK, con código `XXXX-XXXX`;
   - números de socio correlativos (`000001`, `000002`...);
   - Staff → 409;
   - socio ya existente → 409;
   - usuario Familia existente → 409 `EXISTING_USER`, y con `existingUserId` se crea el socio sin tocar su contraseña;
   - el rol Socio queda asignado.
4. **Baja y reactivación:**
   - la baja deja al socio INACTIVE y `getAvailableRoles` ya no le devuelve Socio;
   - la reactivación funciona;
   - un SUSPENDED → 409.
5. **Desbloqueo:** un BLOCKED queda ACTIVE con 0 intentos, y en la bitácora queda `USER_UNBLOCKED`.
6. **Club:**
   - configuración con valores inválidos → 400;
   - desactivar Vóley con una inscripción Aprobada de prueba → 409;
   - `GET /clubs/info` con un usuario Socio funciona.
7. **Multi-tenant:** un socio de un segundo club de prueba no aparece en el listado ni se puede leer (404). Borralo al final.
8. **Integridad:** la verificación de DVH/DVV del P03 da todo correcto, incluida la tabla `club` con su campo JSON.
9. **Limpieza:** borrá los datos de prueba, salvo que el script los necesite para los casos documentados.

### 8.2 Front

1. `npm run build` compila sin errores. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano en el navegador:
   - alta de un menor y el comprobante impreso (vista previa de impresión);
   - registrarse con ese número de socio y la fecha de nacimiento desde `/register`;
   - modificar la configuración del club y ver los cambios en "El club";
   - el listado de socios en tamaño celular.

### 8.3 Cierre

1. **Actualizá `docs/TODO.md`:**
   - en la Fase 1, marcá los datos provisorios de Valencia en el seed;
   - en la Fase 3, marcá:
     - parámetros del club;
     - activación de deportes;
     - alta presencial;
     - código de vínculo;
     - comprobante imprimible;
     - modificación y baja de socios;
     - desbloqueo por el Admin (aclarando "socios; staff en P08");
     - pantalla "El club";
   - en la Fase 3, dejá como `[~]` las pantallas del Admin, con la nota "falta staff (P08)";
   - en las Decisiones pendientes, marcá la **D13**;
   - agregá la línea al Registro.
2. Mostrame el resultado de la verificación, los pasos para que el resto del equipo recree su base, y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
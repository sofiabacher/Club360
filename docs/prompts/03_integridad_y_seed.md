# Prompt 03 — Dígitos verificadores automáticos, catálogo de permisos y seed

Vas a hacer tres cosas: el cálculo automático de los dígitos verificadores (DVH y DVV), el catálogo de permisos en código y el seed completo del club Valencia. Antes de empezar, leé `CLAUDE.md` y las secciones 2, 4 y 8 de `docs/contexto.md`.

**Alcance:**
- **Se hace:** los hooks de integridad, `utils/permissions.js`, los datos del seed, `seed.js` completo y la verificación.
- **No se hace:** la carga de datos de prueba (socios, jugadoras, partidos), los endpoints del módulo `integrity` (verificar y reparar desde la app) ni ningún otro endpoint. Son tareas posteriores.
- **No** hagas commit.

## 1. Dígitos verificadores automáticos

El objetivo es que el DVH de cada registro y el DVV de cada tabla se mantengan solos, sin que cada service tenga que acordarse de calcularlos.

### 1.1 `utils/integrity.js`

Ajustá `calculateDVH` para que el resultado no dependa de cómo llegó el dato (desde un `create`, desde la base, en otro servidor):

- Firma: `calculateDVH(row, attributeNames)`. Se recorren los campos **en el orden de `attributeNames`**, no en el orden de las claves del objeto.
- Se excluyen `dvh`, `createdAt` y `updatedAt`.
- Normalización de cada valor antes de concatenar:
  - `null` o `undefined` → `''`
  - `Date` → `toISOString()`
  - `boolean` → `1` o `0`
  - número o string → `String(valor)`
- Agregá `getDVHAttributes(Model)`: devuelve `Object.keys(Model.rawAttributes)` sin los campos excluidos.
- Agregá `computeRowDVH(Model, row)`: atajo que combina las dos funciones anteriores. El futuro módulo `integrity` va a usar esta misma función para verificar.
- `calculateDVV(rows)` queda igual: módulo 11 sobre la concatenación de los DVH de todas las filas de la tabla. Se incluyen todas, también las dadas de baja, porque las bajas son lógicas.

### 1.2 `models/integrityHooks.js` (nuevo)

Exportá `registerIntegrityHooks(models)` y llamala al final de `models/index.js`, después de las asociaciones. Se aplica a **todos los modelos que tienen el campo `dvh`**, o sea, todos menos `Log` y `Dvv`.

- **`afterSave`** (cubre create y update):
  1. Releé la fila desde la base con `findOne` por su clave primaria. Usá `Model.primaryKeyAttributes`, porque las tablas intermedias tienen PK compuesta. Pasá `raw: true` y la `transaction` de `options`. Hay que releerla para que el DVH se calcule sobre los mismos valores que va a leer la verificación: por ejemplo, los `DECIMAL` vuelven como string `"1500.00"` y los booleanos como `1`/`0`.
  2. Calculá `computeRowDVH(Model, fila)`.
  3. Si es distinto al guardado, actualizalo con `Model.update({ dvh }, { where: pk, hooks: false, transaction })`. El `hooks: false` evita que el hook se dispare de nuevo en bucle.
  4. Recalculá el DVV de la tabla (ver el punto siguiente).
- **`afterDestroy`:** recalculá el DVV de la tabla.
- **`beforeBulkCreate`, `beforeBulkUpdate` y `beforeBulkDestroy`:** asigná `options.individualHooks = true`. Así las operaciones masivas también disparan los hooks de cada registro y nadie tiene que acordarse de pasarlo.
- **Recálculo del DVV:** función `updateTableDVV(Model, transaction)`. Lee todos los `dvh` de la tabla (`attributes: ['dvh'], raw: true`), calcula `calculateDVV` y hace `Dvv.upsert({ tableName: Model.getTableName(), dvv })` dentro de la misma transacción.
- Todas las consultas de los hooks usan `options.transaction`. Si la operación original corre en una transacción, los dígitos se guardan o se descartan junto con ella.

### 1.3 `CLAUDE.md` y `docs/contexto.md`

No los modifiques: ya vienen actualizados con las reglas de esta tarea (dígitos verificadores automáticos y uso de `PERMISSIONS`). Si ves que no las incluyen, avisame.

## 2. Catálogo de permisos — `utils/permissions.js` (nuevo)

El catálogo es **fijo y común a toda la plataforma**: lo carga el seed y el Admin del club no puede crear, modificar ni eliminar permisos.

Exportá:
- **`PERMISSIONS`:** objeto con constantes para usar en las rutas, sin escribir strings sueltos. Ejemplo: `PERMISSIONS.FEES_MANAGE = 'fees.manage'`. La clave es el nombre en MAYÚSCULAS con guion bajo: `auth.manageAccount` → `AUTH_MANAGE_ACCOUNT`.
- **`PERMISSION_CATALOG`:** array de `{ name, description }` con los 41 permisos. En el seed, `module` y `action` se obtienen separando `name` por el punto.

Agregá un comentario arriba del archivo que diga que es la fuente única del catálogo en el código, que se corresponde con la sección 4.1 del documento de Club360 y que, si un permiso cambia, hay que cambiarlo en los dos lugares.

**Catálogo (nombre — descripción):**

*Funciones comunes*
- `auth.manageAccount` — Ver y modificar los datos de la propia cuenta
- `notifications.view` — Ver las notificaciones recibidas

*Notificaciones*
- `notifications.sendAll` — Enviar avisos generales a todo el club
- `notifications.sendSport` — Enviar notificaciones a jugadoras, familias y entrenadoras del deporte
- `notifications.sendCategory` — Enviar notificaciones a jugadoras y familias de sus categorías

*Roles y permisos*
- `access.manageRoles` — Consultar roles, crear roles nuevos y editar sus permisos
- `access.assignRoles` — Asignar roles y permisos directos a usuarios

*Club*
- `clubs.viewInfo` — Consultar la información general del club
- `clubs.manageSettings` — Configurar la cuota social, los días de atraso y el margen de conflicto horario
- `clubs.manageSports` — Activar deportes del catálogo maestro y fijar su cuota deportiva

*Socios y staff*
- `members.manage` — Dar de alta, consultar, modificar y dar de baja socios
- `members.unlinkAdult` — Desvincularse del adulto responsable (solo mayores de edad)
- `staff.manage` — Dar de alta, consultar, modificar y dar de baja staff

*Inscripciones*
- `inscriptions.request` — Solicitar la inscripción a un deporte
- `inscriptions.withdraw` — Solicitar la baja de un deporte
- `inscriptions.approve` — Consultar solicitudes de inscripción y aprobarlas o rechazarlas

*Cuotas y pagos*
- `fees.manage` — Gestionar las cuotas de todo el club
- `fees.viewPlayers` — Consultar el estado de cuotas de las jugadoras del deporte
- `fees.viewOwn` — Consultar el estado de las propias cuotas
- `fees.payOwn` — Pagar las propias cuotas (solo mayores de edad)
- `fees.manageLinked` — Consultar el estado de cuenta de las jugadoras vinculadas y pagar sus cuotas

*Ligas y categorías*
- `leagues.manage` — Crear, modificar y eliminar ligas y categorías
- `leagues.assignPlayers` — Asignar jugadoras a categorías
- `leagues.assignStaff` — Asignar entrenadoras y preparadoras físicas a categorías
- `leagues.viewAssigned` — Consultar las categorías asignadas y sus jugadoras

*Partidos y conflictos*
- `games.manage` — Publicar y editar partidos, incluidos los avisos de conflicto de horario
- `games.viewAssigned` — Consultar el fixture de las categorías asignadas
- `games.resolveConflicts` — Resolver conflictos de horario
- `games.viewOwn` — Consultar el propio fixture
- `games.viewLinked` — Consultar el fixture de las jugadoras vinculadas

*Citaciones*
- `citations.create` — Generar citaciones y consultar las de sus categorías
- `citations.respond` — Consultar las propias citaciones y confirmarlas o rechazarlas
- `citations.viewLinked` — Consultar las citaciones de las jugadoras vinculadas

*Rutinas*
- `routines.manage` — Cargar y editar las rutinas semanales y su contenido de apoyo
- `routines.viewAssigned` — Consultar las rutinas de sus categorías
- `routines.viewOwn` — Consultar la propia rutina semanal

*Bitácora, integridad y copias de seguridad*
- `logs.view` — Consultar la bitácora con filtros
- `logs.export` — Descargar la bitácora en formato CSV
- `integrity.manage` — Verificar y reparar los dígitos verificadores
- `backup.manage` — Realizar copias de seguridad y restaurar la base de datos

*Bot de consultas (opcional)*
- `bot.use` — Usar el bot de consultas

## 3. Datos del seed — `api/src/seed/data/`

### `baseRoles.js`
Los 7 roles base, todos con `isBase: true`. Exportá un array de `{ name, description, permissions: [nombres] }`. Para no repetir la lista de permisos del Socio, la de **Jugadora** se arma en el código como la del Socio más sus 3 permisos propios.

| Rol (`name`) | Permisos | Cant. |
|---|---|---|
| `Admin del Club` | auth.manageAccount, notifications.view, notifications.sendAll, access.manageRoles, access.assignRoles, clubs.manageSettings, clubs.manageSports, members.manage, staff.manage, fees.manage, logs.view, logs.export, integrity.manage, backup.manage | 14 |
| `Representante` | auth.manageAccount, notifications.view, notifications.sendSport, inscriptions.approve, fees.viewPlayers, leagues.manage, leagues.assignPlayers, leagues.assignStaff, games.manage | 9 |
| `Entrenadora` | auth.manageAccount, notifications.view, notifications.sendCategory, leagues.viewAssigned, games.viewAssigned, games.resolveConflicts, citations.create, routines.viewAssigned | 8 |
| `Preparadora física` | auth.manageAccount, notifications.view, leagues.viewAssigned, games.viewAssigned, routines.manage | 5 |
| `Socio` | auth.manageAccount, notifications.view, clubs.viewInfo, members.unlinkAdult, inscriptions.request, inscriptions.withdraw, fees.viewOwn, fees.payOwn, bot.use | 9 |
| `Jugadora` | los 9 del Socio + games.viewOwn, citations.respond, routines.viewOwn | 12 |
| `Familia` | auth.manageAccount, notifications.view, clubs.viewInfo, fees.manageLinked, games.viewLinked, citations.viewLinked, bot.use | 7 |

Descripciones cortas de cada rol (en español):
- **Admin del Club:** administra la operación de su club.
- **Representante:** administra el deporte dentro del club.
- **Entrenadora:** gestiona sus categorías, citaciones y conflictos de horario.
- **Preparadora física:** carga las rutinas semanales de sus categorías.
- **Socio:** perfil base del socio del club.
- **Jugadora:** socia deportista, incluye todo lo del Socio.
- **Familia:** adulto responsable vinculado a una o más jugadoras.

Nota para el código: `members.unlinkAdult` y `fees.payOwn` dependen además de que el socio sea mayor de edad. Esa condición la va a verificar el service correspondiente, no el seed. Dejalo en un comentario.

### `club.js`
Datos del club a cargar. Exportá un objeto `CLUB_SEED`. Los valores provisorios llevan un comentario `// [COMPLETAR]`:
- `club`:
  - `name: 'Valencia'`
  - `address: 'Dirección a completar'` [COMPLETAR]
  - `phone: null` [COMPLETAR]
  - `email: 'contacto@valencia-club.com'` [COMPLETAR]
  - `socialFee: 10000` [COMPLETAR]
  - `delayFee: 180` (default del contexto)
  - `conflictMargin: 60` (minutos)
- `sports`: `['Vóley', 'Futsal', 'Básquet']` (catálogo maestro)
- `activeSports`: `[{ name: 'Vóley', priceFee: 15000 }]` [COMPLETAR el valor]

### Usuario Admin: desde el `.env`
Los datos del Admin **no** van en el código, porque tienen la contraseña. Agregá al `.env.example`, en una sección `# --- Seed (usuario Admin del club) ---`:
- `SEED_ADMIN_NAME=Admin`
- `SEED_ADMIN_LASTNAME=Valencia`
- `SEED_ADMIN_EMAIL=admin@valencia-club.com`
- `SEED_ADMIN_USERNAME=admin.valencia`
- `SEED_ADMIN_PASSWORD=` (sin valor: cada uno elige la suya)
- `SEED_ADMIN_BIRTHDATE=1990-01-01`

Agregá también un objeto `seed` en `config/index.js` que los lea. Si falta `SEED_ADMIN_PASSWORD`, el seed tiene que cortar con un mensaje claro.

## 4. `seed/seed.js` completo

- Corre todo dentro de **una transacción**. Si algo falla, no queda nada a medias.
- Es **idempotente**: se puede correr más de una vez sin duplicar nada. Usá `findOrCreate` por la clave natural de cada cosa:
  - permisos por `name`;
  - deportes por `name`;
  - club por `name`;
  - `clubSport` por `(clubId, sportId)`;
  - roles por `(clubId, name)`;
  - `role_permission` por el par;
  - usuario por `username`;
  - `user_role` por el par.

  Esto además sostiene el argumento de escalabilidad: para cargar otro club solo cambian los datos de `club.js`, y los permisos y deportes globales ya existentes se reutilizan.
- Pasá `{ transaction }` en **todas** las operaciones, para que los hooks de integridad trabajen dentro de la misma transacción.
- **Orden de carga:**
  1. Permisos del catálogo
  2. Deportes
  3. Club
  4. `clubSport` de los deportes activos
  5. Roles base del club con sus permisos
  6. Usuario Admin: contraseña con `hashPassword`, estado `USER_STATES.ACTIVE` (la constante, no el número), con su rol `Admin del Club`
- Al final, mostrá un resumen por consola con las cantidades de permisos, roles, permisos por rol, deportes, club y usuario Admin. Indicá también si cada cosa se creó o ya existía.
- No usa `sync({ force })`: solo `sync()` común.

## 5. Verificación

1. Revisá que `api/.env` tenga `SEED_ADMIN_PASSWORD`. Si no lo tiene, frená y pedime que lo complete.
2. Corré `npm run seed` y revisá que termine sin errores.
3. Corré `npm run seed` **una segunda vez** y confirmá que no se duplicó nada.
4. Con un script temporal fuera del repo (scratchpad o `/tmp`), confirmá:
   - `permission` tiene **41** filas;
   - `role` tiene **7** filas, todas con `isBase = 1`;
   - `role_permission` tiene **64** filas, con la cantidad por rol de la tabla del punto 3;
   - `sport` tiene 3 filas, `club` 1, `clubSport` 1, `user` 1 y `user_role` 1;
   - en todas las tablas cargadas, el `dvh` guardado de cada fila es igual a `computeRowDVH` calculado de nuevo;
   - existe una fila en `dvv` por cada tabla cargada, y su valor coincide con `calculateDVV` recalculado.
5. Prueba de los hooks:
   - Modificá un campo de un registro con `update` y comprobá que su `dvh` y el DVV de la tabla se actualizaron.
   - Modificá el mismo campo con SQL directo (`sequelize.query`) y comprobá que ahora la verificación del punto anterior **detecta** la diferencia.
   - Revertí el cambio.
6. Levantá el servidor con `npm run dev` y comprobá que arranca bien.
7. Actualizá `docs/TODO.md`. En la Fase 1, marcá:
   - el cálculo automático de DVH/DVV;
   - el catálogo de permisos;
   - el seed completo.

   Agregá la línea al Registro.
8. Mostrame el resumen de la verificación y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
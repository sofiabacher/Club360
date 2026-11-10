# Prompt 16 — Bitácora, integridad de datos y copias de seguridad

Vas a completar los tres módulos de seguridad que faltan: `logs`, `integrity` y `backup`. La referencia funcional son los casos de uso CU018 a CU021 de HotelDesk (bitácora con filtros y CSV, informe de integridad, rectificación y backup manual y automático), con dos diferencias:
- **todo es por club** (multi-club);
- **se puede restaurar desde la app.**

Antes de empezar:
- leé `CLAUDE.md`, sobre todo "Reglas transversales", "Base de datos", "Notificaciones" y la sección nueva "Bitácora, integridad y backup";
- leé la sección 11 de `docs/contexto.md` ("Bitácora, integridad y copias de seguridad");
- mirá cómo funcionan hoy `utils/integrity.js`, `models/integrityHooks.js` (`computeRowDVH`) y los scripts `db:snapshot` y `db:restore` del P10b. Este prompt los reutiliza.

**Alcance:**
- **Se hace:** los tres módulos (back y front), el bloqueo por integridad, los dos jobs nuevos, los casos de prueba y la verificación.
- **No se hace:**
  - el backup de los archivos subidos (imágenes y comprobantes): el backup es solo de la base;
  - el panel de SuperAdmin.
- **No** hagas commit.
- Si algo de esto choca con cómo quedó implementado el P03 o el P10b, avisame antes de cambiarlo.

## 0. Base común: qué filas son "de un club"

Armá `utils/clubData.js`, usado por `integrity` y `backup`. Los scripts `db:snapshot` y `db:restore` siguen copiando **la base completa** (incluida la bitácora), pero refactorizalos para que usen las mismas funciones de bajo nivel de lectura `raw` e inserción con `bulkInsert`, en lugar de tener su propia copia.

### 0.1 Las tablas

Usá una lista explícita, `CLUB_TABLES`, **en orden de dependencia**: primero las tablas de las que dependen las otras. Cada tabla lleva su modelo y cómo se filtran sus filas de un club:

| Cómo se filtra | Tablas |
|---|---|
| Por `id` | `club` |
| Por `clubId` | todas las tablas de negocio que tienen `clubId`, menos `log` |
| A través de la tabla padre | `user_role` y `user_permission` (por `user.clubId`), `role_permission` (por `role.clubId`), `categoryPlayer` y `categoryStaff` (por `category.clubId`) |

**Quedan afuera:**
- **los catálogos compartidos** (`sport` y `permission`): no son de ningún club;
- **`dvv`:** se recalcula;
- **`log`:** la bitácora no se restaura, para que una restauración no borre el rastro de lo que pasó.

En un comentario arriba de `CLUB_TABLES`, explicá por qué queda afuera cada una.

### 0.2 Las funciones

- `readClubRows(clubId, { transaction })`: devuelve `{ [tabla]: filas }` con `raw: true`, como el snapshot. Así el teléfono queda cifrado y se conservan los `dvh`.
- `deleteClubRows(clubId, { transaction })`: borra las filas del club en el **orden inverso** de `CLUB_TABLES`.
- `insertClubRows(data, { transaction })`: inserta en el orden de `CLUB_TABLES`, con `queryInterface.bulkInsert` y los ids originales.

Las tres usan la misma `transaction`. **No** desactives `FOREIGN_KEY_CHECKS`: el orden tiene que alcanzar. Si alguna tabla se referencia a sí misma, avisame cómo lo resolviste.

Si se suma un modelo con `clubId` y no está en `CLUB_TABLES` (ni en la lista de excluidas), que `clubData.js` tire un error al arrancar. Así nadie se olvida de agregarlo.

## 1. Bitácora (módulo `logs`)

### 1.1 Back

| Método y ruta | Permiso | Qué hace |
|---|---|---|
| `GET /logs?from=&to=&criticity=&action=&userId=&search=&page=` | `logs.view` | Registros del club, del más nuevo al más viejo, de a 50. Cada uno con la fecha y hora, el usuario (nombre, apellido y usuario), el rol activo, la acción, el detalle y la criticidad. Devuelve también la **cantidad por criticidad de todo el filtro** (no solo de la página) |
| `GET /logs/filters` | `logs.view` | Las acciones posibles (los `message` de `LOG_ACTIONS`) y los usuarios del club que tienen registros, para los filtros |
| `GET /logs/export?…` (mismos filtros) | `logs.export` | Descarga el CSV con todos los registros del filtro, sin paginar |

**Reglas:**
- `from` y `to` son fechas `YYYY-MM-DD` en hora de Argentina, y `to` incluye todo ese día.
- Si `from` es posterior a `to`: 400, *"El rango de fechas no es válido."*
- `search` busca en el detalle y en el nombre del usuario.
- **El CSV:**
  - en UTF-8 con BOM y separador `;`, para que Excel lo abra bien en español;
  - columnas: Fecha, Hora, Usuario, Nombre, Rol, Acción, Detalle, Criticidad (con el nombre: Baja, Media, Alta, Crítica);
  - archivo `bitacora-{club}-{AAAAMMDD-HHmm}.csv`;
  - escapá las comillas y los saltos de línea del detalle;
  - sin registros: 404, *"No hay registros para exportar."*
- **Exportar queda registrado** (`LOGS_EXPORTED`, con los filtros en el detalle).

### 1.2 Front (`/logs`, `pages/logs/LogsPage.jsx`)

- **Arriba:** cuatro tarjetas con la cantidad por criticidad del filtro actual.
- **Filtros:** desde y hasta, criticidad, acción, usuario y un buscador. Hay un botón "Limpiar filtros".
- **Tabla** (tarjetas en el celular): fecha y hora, usuario, rol, acción, detalle (cortado, completo al tocarlo) y criticidad.
- **Chips de criticidad:**
  - Baja: neutro (gris);
  - Media: `pending`;
  - Alta: `overdue`;
  - Crítica: Bordó, relleno.

  Agregá la variante `critical` a `StatusChip` si hace falta; no escribas el color a mano.
- **El botón "Descargar CSV"** (Azul, no naranja), solo con `logs.export`. Descarga el archivo con axios (`responseType: 'blob'`) y muestra *"Bitácora descargada correctamente."*
- **Sin registros:** `EmptyState` con *"No hay registros para este filtro."*

## 2. Integridad (módulo `integrity`)

### 2.1 Verificación

`verifyClub(clubId)` en `integrity.service.js`:

1. **Las filas del club** (`readClubRows`): recalcula el DVH de cada una con `computeRowDVH` y lo compara con el guardado.
2. **Las filas de `sport` y `permission`:** lo mismo, porque las usan todos los clubes.
3. **El DVV de cada tabla** de `CLUB_TABLES`, de `sport` y de `permission`: recalculado sobre la tabla completa, con la misma función que usan los hooks, y comparado con el de `dvv`.

   El DVV es de toda la tabla, no de un club. Si no coincide, puede ser por otro club: el informe lo marca igual y la reparación lo recalcula.
4. **Devuelve:**
   - `status`: `OK` o `ERROR`;
   - `checkedAt`;
   - por tabla: el nombre en español (sumá `TABLE_LABELS` a `constants.js`), la cantidad de filas revisadas, las filas con error (la clave primaria, el DVH guardado y el calculado) y si el DVV coincide.

### 2.2 Estado y bloqueo del club

1. **Caché:** `getIntegrityStatus(clubId)` guarda en memoria el último resultado de cada club durante `INTEGRITY_CACHE_MINUTES` (constante nueva, **5**). Pasado ese tiempo, vuelve a verificar. `repair` y `restore` lo invalidan.
2. **Cuándo se verifica:** en cada login (usando la caché), con el job nocturno (punto 2.4) y a pedido del Admin.
3. **Si el estado es `ERROR`, el club queda bloqueado:**
   - **solo trabajan** los usuarios cuyos permisos efectivos incluyen `integrity.manage` o `backup.manage`;
   - **el resto, en el login:** 503 con `code: 'INTEGRITY_LOCK'` y el mensaje *"El sistema está en mantenimiento. Probá de nuevo más tarde."*. No suma un intento fallido;
   - **el resto, con la sesión abierta:** `isAuth` devuelve lo mismo en la siguiente request. Calculá los permisos con `getEffectivePermissions`, una sola vez por request (reutilizá lo que ya calcula `checkPermission` si podés);
   - **se registra** `ACCESS_BLOCKED_INTEGRITY` en la bitácora: una vez por usuario y por bloqueo, no en cada request.
4. **Los jobs** (cuotas, citaciones y rutinas, si alguno escribe) **saltean** los clubes bloqueados y lo registran en la bitácora. El backup automático sí corre.
5. **Aviso** `INTEGRITY_ALERT` (sumalo a `NOTIFICATION_TYPES`, **in-app + email**, y a `notificationTypes.js` con la ruta `/integrity`):
   - **a quiénes:** los usuarios ACTIVE del club con `integrity.manage`;
   - **cuándo:** solo cuando el estado **pasa** de `OK` a `ERROR`, no en cada verificación;
   - **mensaje:** *"Se detectaron {n} registros alterados en {tablas}. Los demás usuarios no pueden entrar hasta que se reparen."*
   - Se registra `INTEGRITY_ERROR` (criticidad Crítica) con el detalle de las tablas.

### 2.3 Reparación (rectificar)

1. **Por tabla o todas** (`POST /integrity/repair`, con `{ tables: [...] }` o `{ all: true }`):
   - recalcula y guarda el DVH de las filas **del club** que tienen error;
   - recalcula el DVV de esas tablas;
   - vuelve a verificar y devuelve el informe nuevo.
2. **Cómo se guarda:** la actualización del DVH se hace con el modelo y `hooks: false`, solo sobre la columna `dvh`. Después se recalcula el DVV con la función de los hooks.
3. **Qué significa reparar:** acepta los datos actuales como válidos. El diálogo de confirmación lo dice:
   > *"Reparar recalcula los dígitos verificadores y acepta los datos tal como están ahora. Si creés que alguien modificó datos por fuera del sistema, restaurá un backup en lugar de reparar."*
4. **Se registra** `INTEGRITY_REPAIRED` (criticidad Alta), con las tablas y las claves de las filas reparadas.
5. Si después de reparar queda en `OK`, el club se desbloquea.

### 2.4 Job nocturno

`jobs/integrityCheck.job.js`:
- todos los días a las **02:30** (hora de Argentina);
- verifica cada club activo, sin usar la caché;
- actualiza la caché y aplica la regla 2.2.5;
- la función recibe la fecha, como los jobs del P14.

### 2.5 Back

| Método y ruta | Permiso | Qué hace |
|---|---|---|
| `GET /integrity/status` | con sesión | `{ status, checkedAt }` del club, desde la caché. Lo usa el front para el aviso del Admin |
| `POST /integrity/verify` | `integrity.manage` | Verifica ahora, sin caché, y devuelve el informe completo |
| `POST /integrity/repair` | `integrity.manage` | Punto 2.3 |
| `GET /integrity/report.csv` | `integrity.manage` | El último informe en CSV, con el mismo formato que la bitácora: tabla, filas revisadas, clave, DVH guardado, DVH calculado y DVV correcto |

### 2.6 Front (`/integrity`, `pages/integrity/IntegrityPage.jsx`)

- **Tarjeta de estado** grande:
  - **correcto:** verde, *"Los datos del club están íntegros"*, con la fecha de la última verificación;
  - **con error:** rojo, con la cantidad de registros alterados y *"Los demás usuarios no pueden entrar hasta que se reparen."*
- **Botones:** **"Verificar ahora"** (naranja) y "Descargar informe" (Azul).
- **Tabla por tabla:** el nombre en español, las filas revisadas, `StatusChip` (`ok` o `overdue`) y, si tiene errores, una fila desplegable con las claves de los registros alterados.
- **Con errores:**
  - "Reparar tabla" en cada tabla con error;
  - "Reparar todo";
  - el diálogo del punto 2.3.3;
  - un link "Restaurar un backup" a `/backup`.

**Aviso en el layout:** si `GET /integrity/status` da `ERROR` y el usuario tiene `integrity.manage`, `DashboardLayout` muestra arriba un `Alert` rojo: *"Se detectaron errores de integridad. Los demás usuarios no pueden entrar."*, con el link "Revisar".

**Pantalla de mantenimiento:**
- `pages/MaintenancePage.jsx`, con `CourtBackground`, el logo y el mensaje del 503;
- el interceptor de `axiosClient` manda ahí ante `code: 'INTEGRITY_LOCK'`;
- en el login, el error se muestra en el formulario con el mismo texto.

## 3. Copias de seguridad (módulo `backup`)

### 3.1 El archivo de backup

1. **Formato:** JSON, generado con `readClubRows` del club del Admin.
2. **Contenido:**
   ```json
   {
     "meta": {
       "app": "Club360",
       "formatVersion": 1,
       "clubId": 1,
       "clubName": "Club Valencia",
       "type": "MANUAL",
       "createdAt": "...",
       "createdBy": { "id": 1, "username": "..." },
       "tables": { "member": 120 },
       "checksum": "sha256..."
     },
     "data": { "club": [...], "user": [...] }
   }
   ```
   - `type`: `MANUAL`, `AUTO` o `PRE_RESTORE` (sumá `BACKUP_TYPES` a `constants.js`);
   - `checksum`: SHA-256 de `JSON.stringify(data)`. Sirve para detectar un archivo modificado.
3. **Dónde se guarda:**
   - en `api/backups/club-{clubId}/backup-{AAAAMMDD-HHmmss}-{tipo}.json` (la carpeta ya está en `.gitignore`);
   - se conservan los **últimos 7** de cada club (contando todos los tipos), como HotelDesk: al guardar uno nuevo, se borran los más viejos.
4. **Comentario en `backup.service.js`:** el archivo contiene contraseñas hasheadas y teléfonos cifrados, así que solo lo descarga quien tiene `backup.manage`. Además, en Render el disco se borra en cada reinicio: en la demo, lo seguro es descargar el backup.

### 3.2 Generar

- **Manual:** el Admin con `backup.manage`. Registra `BACKUP_CREATED` (criticidad Media).
- **Automático:** `jobs/backup.job.js`, los **domingos a las 03:00** (hora de Argentina), para cada club activo, con `type = AUTO`. Si falla, registra `BACKUP_AUTO_FAILED` (Alta) y sigue con el siguiente club.

### 3.3 Restaurar

Se puede restaurar **uno de la lista** o **un archivo subido** (`multipart`, campo `file`, `.json` de hasta 20 MB, en memoria: no se guarda en `uploads/`).

**Validaciones,** antes de tocar nada. Si alguna falla: 400 con el motivo y `BACKUP_RESTORE_FAILED` (Alta).
1. **Archivo:** es JSON, `meta.app` es `Club360` y `formatVersion` es 1.
2. **Club:** `meta.clubId` es el club del Admin: *"Este backup es de otro club."*
3. **Integridad del archivo:** el `checksum` coincide: *"El archivo fue modificado o está dañado."*
4. **Catálogos:** todas las referencias a `sport` y `permission` existen en la base.
5. **Quien restaura:** está en el backup, ACTIVE y con `backup.manage`. Si no: *"Este backup es anterior a tu usuario o no te da permiso para restaurar. Pedile a otro administrador que lo haga."* Así nadie se deja afuera a sí mismo.

**Restauración:**
1. **Backup previo:** antes de empezar, guarda un backup automático del estado actual (`PRE_RESTORE`), para poder deshacerlo.
2. **Una sola transacción,** con `deleteClubRows` del club y después `insertClubRows` con los datos del archivo. Si algo falla, se deshace todo y el club queda como estaba.
3. **Después de confirmar:**
   - recalcula el DVV de todas las tablas tocadas;
   - corre `verifyClub` sin caché e invalida la caché;
   - registra `BACKUP_RESTORED` (Crítica), con el archivo, su fecha, el tipo, las filas por tabla y el backup previo que se generó.
4. **Respuesta:** el resultado de la verificación y las filas por tabla.

**Notas para dejar en comentarios:**
- la restauración es la **segunda excepción** a la regla de escribir solo con los modelos (la primera es `db:restore`): usa `queryInterface` para insertar los datos tal cual estaban, con su teléfono cifrado y sus `dvh`;
- los archivos subidos no se restauran: si una imagen se borró después del backup, el link queda roto;
- las sesiones abiertas siguen, pero `isAuth` vuelve a leer el estado de cada usuario en cada request.

### 3.4 Back

| Método y ruta | Permiso | Qué hace |
|---|---|---|
| `GET /backup` | `backup.manage` | Los backups guardados del club: archivo, fecha, tipo, tamaño, filas totales y quién lo generó (de `meta`) |
| `POST /backup` | `backup.manage` | Genera un backup manual |
| `GET /backup/:fileName/download` | `backup.manage` | Descarga el archivo y registra `BACKUP_DOWNLOADED` (Media) |
| `POST /backup/:fileName/restore` | `backup.manage` | Restaura uno de la lista. Body `{ confirm: "RESTAURAR" }` |
| `POST /backup/restore-file` | `backup.manage` | Restaura un archivo subido, con `confirm` en el form |

**Validaciones de seguridad:**
- `fileName` tiene que cumplir `^backup-\d{8}-\d{6}-(manual|auto|pre_restore)\.json$` y se busca **solo** en la carpeta del club del usuario: nada de rutas armadas con lo que manda el cliente;
- sin `confirm` correcto: 400.

### 3.5 Front (`/backup`, `pages/backup/BackupPage.jsx`)

- **Arriba:** el botón **"Generar backup"** (naranja) y una nota: *"Se hace un backup automático todos los domingos a las 03:00. Se guardan los últimos 7. Descargá los importantes: el servidor de la demo puede borrarlos."*
- **Lista** (tarjetas en el celular): fecha, tipo con chip (Manual, Automático, Previo a restaurar), tamaño, filas y quién lo generó, con los botones "Descargar" y "Restaurar".
- **"Restaurar desde un archivo":** una zona para arrastrar o elegir el `.json`.
- **Diálogo de restauración:**
  - un resumen del backup (fecha, tipo y filas por tabla);
  - una advertencia: *"Se reemplazan todos los datos del club por los de este backup. Lo que se cargó después se pierde (antes se guarda un backup del estado actual). La bitácora y las imágenes no cambian."*;
  - un campo donde hay que escribir **RESTAURAR** para habilitar el botón.
- **Al terminar:** el resultado y el estado de la integridad.
  - Si el usuario que restauró cambió de permisos, refrescá la sesión.

## 4. Constantes y bitácora

En `utils/constants.js` (api y client, cuando aplique), sumá:
- `INTEGRITY_CACHE_MINUTES`;
- `TABLE_LABELS`;
- `BACKUP_TYPES`;
- `BACKUP_KEEP_LAST = 7`;
- `CRITICITY_LABELS`, si no existe.

En `LOG_ACTIONS`, con su criticidad:

| Acción | Criticidad |
|---|---|
| `LOGS_EXPORTED` | Media |
| `INTEGRITY_ERROR` | Crítica |
| `INTEGRITY_REPAIRED` | Alta |
| `ACCESS_BLOCKED_INTEGRITY` | Media |
| `JOB_SKIPPED_INTEGRITY` | Alta |
| `BACKUP_CREATED` | Media |
| `BACKUP_DOWNLOADED` | Media |
| `BACKUP_RESTORED` | Crítica |
| `BACKUP_RESTORE_FAILED` | Alta |
| `BACKUP_AUTO_FAILED` | Alta |

Los `message` de las acciones tienen que entrar en `log.action` (`STRING(50)`).

## 5. Casos de prueba documentados

### `docs/pruebas/logs.txt`

- filtrar por fechas, criticidad, acción y usuario;
- un rango de fechas inválido;
- exportar a CSV y abrirlo en Excel (con tildes y ñ bien);
- exportar sin registros;
- un usuario sin `logs.export` no ve el botón y recibe 403;
- no se ven registros de otro club.

### `docs/pruebas/integrity.txt`

- verificar con todo correcto;
- **alterar un dato con SQL directo** (por ejemplo, el monto de una cuota) y verificar: se detecta, llega el aviso por email y el club se bloquea;
- con el club bloqueado: la jugadora no puede entrar ("Sistema en mantenimiento") y el Admin sí, y ve el aviso;
- reparar una tabla y reparar todo: el club se desbloquea;
- descargar el informe;
- el job nocturno con un dato alterado.

### `docs/pruebas/backup.txt`

- generar uno manual;
- que queden solo los últimos 7;
- descargar;
- restaurar de la lista (por ejemplo, después de borrar un socio, vuelve);
- restaurar un archivo subido;
- un archivo de otro club (rechazado);
- un archivo modificado a mano (rechazado por el checksum);
- un backup anterior al usuario que restaura (rechazado);
- sin escribir RESTAURAR (rechazado);
- un nombre de archivo con `../` (rechazado);
- que se genere el backup previo a restaurar y se pueda volver con él;
- la bitácora no cambia al restaurar.

## 6. Documentación del repo

No modifiques `CLAUDE.md` ni `docs/contexto.md`: ya vienen con estas reglas. Si ves que no las incluyen, avisame.

## 7. Verificación

### 7.1 Back

Hacelo con un script temporal **fuera del repo**, con un **segundo club de prueba** creado por el script (con algunos socios), para comprobar que nada cruza de un club al otro. Al final, el script lo borra.

1. **`clubData`:**
   - `readClubRows` del club 1 no trae filas del club 2;
   - `deleteClubRows` + `insertClubRows` dentro de una transacción con `rollback` dejan todo igual;
   - `db:snapshot` y `db:restore` siguen copiando la base completa y funcionando después del refactor.
2. **Bitácora:**
   - filtros, cantidad por criticidad del filtro completo y paginado;
   - el CSV con BOM, `;` y comillas escapadas;
   - el Admin del club 2 no ve registros del club 1.
3. **Integridad:**
   - alterar un campo con `sequelize.query` → `verifyClub` lo detecta;
   - el estado pasa a `ERROR`, llega un solo aviso (al verificar dos veces, no se repite) y el login de una jugadora da 503 sin sumar intentos;
   - el Admin entra;
   - con el token de la jugadora, otra request da 503;
   - reparar → `OK` y la jugadora entra.
   - El club 2 no queda bloqueado por un error en una fila del club 1.
4. **Backup y restauración:**
   - generar, verificar que quedan 7, y descargar;
   - borrar (de forma lógica) un socio, restaurar y comprobar que vuelve con el mismo id, que su teléfono se lee bien y que la integridad da `OK`;
   - existe el `PRE_RESTORE`;
   - las validaciones 1 a 5 de 3.3;
   - un error a mitad de la restauración (forzalo en el script) deja el club como estaba;
   - el club 2 no cambia;
   - la bitácora conserva los registros posteriores al backup.
5. **Jobs:** las funciones de los jobs con una fecha de prueba (un domingo y las 02:30).
6. **Integridad:** al final, la verificación de DVH/DVV del P03 da todo correcto.

### 7.2 Front

1. `npm run build` compila sin errores. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano en el navegador:
   - la bitácora con filtros y la descarga;
   - **alterar un dato en MySQL Workbench** y verificar desde la pantalla de integridad;
   - entrar como jugadora (mantenimiento);
   - reparar;
   - generar, descargar y restaurar un backup;
   - en el celular.

### 7.3 Cierre

1. **Actualizá `docs/TODO.md`, Fase 6:**
   - marcá bitácora, integridad, backup y restore, y el front de esas pantallas;
   - la tarea de **particiones** cambiala por `[x] ~~Particiones de la base~~ — descartadas el 21/10/2026, no son requisito (contexto, sección 0)`.

   En la Fase 8, sumá *"Documentar las estrategias de base de datos: backup por club, restauración, integridad con bloqueo (P16)"*. Agregá la línea al Registro.
2. Mostrame el resultado de la verificación y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
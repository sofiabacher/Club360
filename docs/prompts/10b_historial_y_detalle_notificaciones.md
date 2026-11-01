# Prompt 10b — Detalle de una notificación e historial de avisos enviados

> **Cómo usarlo:** con el P10 ya integrado a `main`, en una rama nueva (`git checkout -b p10b-notifications-history`), con `CLAUDE.md` y `docs/contexto.md` reemplazados por las versiones nuevas, escribí en la terminal:
> `Leé docs/prompts/PROMPT_10b_historial_y_detalle.md y ejecutalo.`

---

Vas a sumar dos cosas al módulo de notificaciones que hizo el P10:
- ver una notificación completa en una ventana flotante;
- el historial de los avisos enviados, con quiénes los leyeron.

Antes de empezar, leé `CLAUDE.md` (sobre todo "Notificaciones" y "Base de datos") y la sección 6 de `docs/contexto.md` ("Canal de cada notificación").

**Alcance:**
- **Se hace:**
  - el campo `batchId` en `notification`;
  - los comandos `db:snapshot` y `db:restore`, para recrear la base sin perder los datos cargados;
  - el diálogo de detalle;
  - el historial de enviados;
  - los casos de prueba.
- **No se hace:** ningún otro cambio en `notify()` ni en los tipos de notificación.
- **No** hagas commit.

## 1. Cambio en el modelo: `notification.batchId`

- **Campo:** `batchId`, `CHAR(36)`, `allowNull: true`, con índice. Identifica a todas las notificaciones que salieron de **un mismo aviso general**. Las notificaciones automáticas del sistema lo dejan en `null`.
- **`notify()`:** suma el parámetro opcional `batchId` y lo guarda en cada notificación que crea.
- **`POST /notifications/send`:** genera un `batchId` con `crypto.randomUUID()` por cada envío, se lo pasa a `notify()` y lo incluye en `details` del log `NOTIFICATION_SENT`.

### 1.1 Recrear la base conservando los datos

Las bases locales ya tienen datos cargados a mano que hay que conservar. Creá dos comandos que se van a usar en este cambio y en cualquier cambio futuro del modelo. Van en `api/src/scripts/db/`, con sus scripts en `api/package.json`.

**`npm run db:snapshot` (`snapshot.js`)**
- Lee **todas** las tablas de los modelos (los 24) con `raw: true`, así se guardan tal cual están en la base: el teléfono cifrado, los hashes de las contraseñas, los `dvh` y las fechas.
- Las guarda en `api/backups/snapshot-AAAAMMDD-HHmmss.json` (la carpeta ya está en `.gitignore`), con la cantidad de filas por tabla.
- Muestra un resumen por consola.

**`npm run db:restore -- <archivo>` (`restore.js`)**

Sin argumento, usa el snapshot más reciente.
1. Verifica que las tablas estén **vacías**. Si alguna tiene datos, frena con un mensaje: *"La base no está vacía: recreala con DB_FORCE_SYNC antes de restaurar. No corras el seed antes."*
2. Inserta las filas con `queryInterface.bulkInsert`, **no** con `Model.bulkCreate`. Con `bulkCreate` se ejecutarían el setter que cifra el teléfono (lo cifraría dos veces) y los hooks de integridad. Con `bulkInsert` se respetan los ids, los `dvh` y los timestamps originales. Las columnas JSON (`club.extraInfo`) se convierten a texto antes de insertar.
3. Todo va en **una transacción**, con `SET FOREIGN_KEY_CHECKS = 0` al principio y `= 1` al final, en la misma conexión, así no importa el orden de las tablas.
4. Si una tabla del snapshot tiene una columna que ya no existe en el modelo, la ignora y lo avisa. Si el modelo tiene una columna nueva que el snapshot no trae, queda con su default o en NULL (como `batchId`).
5. Al terminar, **recalcula el DVV** de todas las tablas y corre la verificación de DVH/DVV. Si algún DVH no coincide (por ejemplo, porque cambió el tipo de una columna), lo informa tabla por tabla y sugiere correrlo con `--recompute-dvh`. Esa opción recalcula los DVH de todas las filas restauradas con `computeRowDVH`, pero solo con esa opción explícita.

Agregá un comentario arriba de `restore.js` que diga tres cosas:
- es una herramienta de desarrollo para recrear la base sin perder datos;
- es la única excepción a la regla de no escribir datos sin pasar por Sequelize, porque restaura exactamente lo que había, con sus dígitos verificadores ya calculados;
- en producción no se usa: para eso está el módulo `backup`.

**Pasos para aplicar el cambio de `batchId`** (hacelos en este orden, y avisame antes del paso 2 y esperá mi confirmación):
1. `npm run db:snapshot`
2. `DB_FORCE_SYNC=true` en `api/.env`, `npm run dev` hasta que sincronice, frenarlo y volver a `DB_FORCE_SYNC=false`
3. `npm run db:restore` (**sin** correr el seed antes)

Dejá estos pasos en el `README.md` del repo, en una sección "Cambios en el modelo", para que el resto del equipo los repita después del merge.

## 2. Detalle de una notificación (ventana flotante)

**`components/notifications/NotificationDialog.jsx`:** un `Dialog` (de pantalla completa en el celular) con:
- el ícono y el color del tipo;
- el título;
- la fecha completa ("sábado 1 de noviembre, 16:44");
- quién la envió: el nombre de la persona o "Club Valencia" si es del sistema;
- el **mensaje completo**, respetando los saltos de línea;
- abajo, el botón **"Ir a {sección}"** si el tipo tiene ruta y está disponible para el rol activo (por ejemplo, "Ir a mis citaciones"), y el botón "Cerrar".

**Comportamiento:**
- Abrir la notificación la marca como leída y actualiza el contador de la campana.
- **En la campana:** tocar un resumen cierra el `Popover` y abre el diálogo. Ya **no** navega directo a la sección.
- **En `/notifications`:** tocar una notificación también abre el diálogo.
- Si no está en la lista cargada, el diálogo trae la notificación con un endpoint nuevo: `GET /notifications/:id`, con `notifications.view`, solo de las propias (si no, 404).

## 3. Historial de avisos enviados

### 3.1 Back

Permiso: cualquiera de `notifications.sendAll`, `notifications.sendSport` o `notifications.sendCategory`.

**Qué ve cada uno:**
- quien tiene `notifications.sendAll` (el Admin) ve **todos** los avisos generales del club;
- el resto ve **solo los que envió**.

Si alguien pide un envío que no le corresponde: 404.

| Método y ruta | Qué hace |
|---|---|
| `GET /notifications/sent?page=&senderId=` | Envíos agrupados por `batchId` (solo los que tienen `batchId`), los más nuevos primero, paginados de a 20. Por cada uno: `batchId`, fecha, remitente (nombre), título, mensaje, `recipientsCount` y `readCount`. `senderId` es un filtro que solo puede usar quien ve todo |
| `GET /notifications/sent/:batchId` | Detalle del envío y la lista de destinatarios: nombre, rol o vínculo para mostrar ("Socia", "Familia de…", "Entrenadora") y si la leyó |

Las cantidades se calculan con `GROUP BY batchId` en una consulta de Sequelize (`attributes` con `fn('COUNT', ...)` y `fn('SUM', col('isRead'))`), no trayendo todas las filas.

### 3.2 Front

- **`pages/notifications/SentNoticesPage.jsx`** (`/notifications/sent`):
  - una tarjeta por envío, con el título, la fecha, el remitente (solo si quien mira ve todo), el principio del mensaje y **"Leído por {x} de {n}"** con una barra de progreso (`LinearProgress`);
  - para quien ve todo, un filtro por remitente arriba;
  - paginado;
  - estado vacío con `EmptyState`: *"Todavía no enviaste avisos."*
- **Detalle de un envío:** al tocar una tarjeta se abre un `Drawer` a la derecha (pantalla completa en el celular) con:
  - el mensaje completo;
  - la fecha;
  - el resumen de lectura;
  - la lista de destinatarios, con buscador y un `StatusChip` por persona: "Leído" (`ok`) o "Sin leer" (`pending`);
  - un filtro rápido "Solo sin leer".
- **Menú:** en `navigation/menu.js`, grupo Club, agregá "Avisos enviados" → `/notifications/sent`, una entrada por cada uno de los tres permisos de envío (como "Enviar avisos"), con un ícono Rounded de historial.
- **Ruta:** agregala en `AppRouter`, habilitada con cualquiera de los tres permisos.
- **En `SendNoticePage`:** un link "Ver avisos enviados" arriba. Después de enviar, el mensaje de éxito trae un botón "Ver en el historial" que abre ese envío.

## 4. Casos de prueba documentados

Sumá a `docs/pruebas/notifications.txt`:
- abrir una notificación desde la campana: se abre el diálogo y se marca como leída;
- el botón "Ir a…" con un tipo que tiene ruta;
- una notificación sin ruta, que no muestra el botón;
- abrir una notificación ajena por URL → 404;
- el historial de una Entrenadora, que solo muestra sus envíos;
- el historial del Admin, con todos los envíos y el filtro por remitente;
- el detalle de un envío con el conteo de lectura correcto después de que dos destinatarios lean;
- una Entrenadora que pide el detalle de un envío ajeno → 404;
- `db:snapshot` y `db:restore`: después de recrear la base, los mismos socios, usuarios y contraseñas siguen funcionando, y la integridad da correcta;
- `db:restore` con la base no vacía (rechazado).

## 5. Documentación del repo

No modifiques `CLAUDE.md` ni `docs/contexto.md`: ya vienen con estas reglas. Si ves que no las incluyen, avisame.

## 6. Verificación

### 6.1 Back

Hacelo con un script temporal **fuera del repo**:

1. **Snapshot y restauración:**
   - antes de recrear la base, anotá la cantidad de filas por tabla y algunos datos de control (un socio con teléfono, el Admin);
   - después de `db:restore`: las cantidades coinciden; el teléfono del socio se lee bien con el modelo (no quedó cifrado dos veces); el Admin entra con su contraseña de siempre; la columna `batchId` existe con su índice;
   - la verificación de DVH/DVV del P03 da todo correcto;
   - correr `db:restore` otra vez, con la base ya cargada, frena con el mensaje de base no vacía.
2. **`batchId`:**
   - un envío general crea N notificaciones con el mismo `batchId`;
   - una notificación de sistema (por ejemplo, `FIXTURE_PUBLISHED` llamada con `notify()`) queda con `batchId` en null y no aparece en el historial.
3. **Historial:**
   - con dos envíos de una Entrenadora y uno del Admin, la Entrenadora ve 2 y el Admin ve 3;
   - el filtro `senderId` funciona solo para el Admin;
   - después de que dos destinatarios marcan como leído, `readCount` = 2.
4. **Detalle:** `GET /notifications/:id` funciona con una propia y responde 404 con una ajena; `GET /notifications/sent/:batchId` ajeno → 404 para la Entrenadora.

### 6.2 Front

1. `npm run build` compila sin errores. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano en el navegador:
   - enviar un aviso como Admin;
   - abrirlo desde la campana de una socia (ventana flotante, contador que baja);
   - ver "Leído por 1 de N" en el historial del Admin;
   - las dos pantallas nuevas en tamaño celular.

### 6.3 Cierre

1. **Actualizá `docs/TODO.md`:** en la Fase 6, sumá y marcá *"Detalle de notificaciones en ventana flotante e historial de avisos enviados con lectura (P10b)"*. Agregá la línea al Registro.
2. Mostrame el resultado de la verificación, los pasos para que el equipo recree su base con `db:snapshot` y `db:restore` después del merge, y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
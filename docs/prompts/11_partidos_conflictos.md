# Prompt 11 — Partidos y detección de superposiciones de horario

Vas a implementar el módulo `games`:
- el fixture: crear y editar partidos, marcarlos como jugados o cancelarlos;
- la **detección automática de superposiciones de horario**, que es el diferencial de Club360;
- la resolución de los conflictos entre entrenadoras;
- las vistas de partidos para el staff, la jugadora y la familia.

Antes de empezar, leé `CLAUDE.md` (sobre todo "Partidos y conflictos", "Ligas y categorías" y "Notificaciones"), la sección 6 de `docs/contexto.md` (conflictos, margen, estado de los partidos, citación y la tabla de canales) y la sección 8.

**Alcance:**
- **Se hace:**
  - el campo `isHome` en `game`;
  - partidos y sus estados;
  - el cálculo de conflictos;
  - la resolución de conflictos en la bitácora;
  - las notificaciones de fixture, conflicto y partido cancelado;
  - las pantallas;
  - los casos de prueba.
- **No se hace:**
  - generar citaciones (P12). Al cancelar un partido sí se cancelan sus citaciones, que ya están en el modelo.
  - el dashboard completo de la Jugadora (P15). Acá va solo la lista "Mis partidos".
  - los resultados de los partidos (Futuro, prioridad 1).
- **No** hagas commit.

## 0. Cambio en el modelo: `game.isHome`

- **Campo:** `isHome`, `BOOLEAN`, `allowNull: false`, `defaultValue: true`. Indica si el partido es de **local**. Agregá un comentario en el modelo.
- **Base local:** aplicá el cambio sin perder los datos, con los pasos de `CLAUDE.md` ("Cambios en el modelo con datos cargados"):
  1. `npm run db:snapshot`;
  2. recrear la base;
  3. `npm run db:restore`.

  Avisame antes de recrear la base y esperá mi confirmación.

## 1. Reglas

### 1.1 Partidos

1. **A quién pertenece:** cada partido es de **una categoría** (`game.categoryId`). Lo gestiona quien tiene `games.manage`, con el mismo alcance por deporte que las ligas (`getLeagueScope` de `leagues.service.js`).
2. **Datos:**
   - categoría activa;
   - rival (hasta 100 caracteres);
   - fecha y hora (`dateTime`);
   - local o visitante (`isHome`);
   - dirección (`address`, hasta 200 caracteres).
3. **Dirección:** si es de **local**, se elige una de las canchas del club (`club.extraInfo.courts`) y se guarda con el formato `"{nombre} · {dirección}"`. Si es de **visitante**, se escribe a mano. El back no exige que la dirección de local coincida con una cancha, porque el Admin puede cambiar las canchas después.
4. **Temporada:** `season` se completa **solo**, con el año de la fecha del partido (`"2026"`). No se pide en el formulario.
5. **Fecha:** un partido nuevo tiene que ser **en el futuro**.
6. **Estados** (`GAME_STATES`, contexto sección 8):
   - **Programado (1):** es el único estado editable. Se pueden cambiar todos los datos salvo la categoría.
   - **Jugado (2):** lo marca a mano quien tiene `games.manage`, solo si la fecha y hora ya pasaron. Después ya no se edita.
   - **Cancelado (3):** se puede cancelar un partido Programado, con un motivo opcional que se guarda en la bitácora. Al cancelarlo, **todas sus citaciones** que no estén Canceladas pasan a Cancelada (`CITATION_STATES.CANCELLED`), y se notifica a las jugadoras que estaban citadas (regla 1.3). No se puede volver a programar: si se reprograma, se crea otro partido.
7. **Partidos solo para jugar:** los partidos Jugados o Cancelados no generan conflictos ni admiten citaciones (eso lo va a validar el P12).

### 1.2 Superposiciones de horario (el diferencial)

1. **Definición:** dos partidos **Programados** distintos están en conflicto para una jugadora si:
   - ella está asignada y activa en las categorías de los dos (`getCategoriesOfMember`), y
   - entre el **fin del primero** y el **inicio del segundo** hay **menos minutos que el margen del club** (`club.conflictMargin`).

   El fin de un partido es su inicio más `GAME_DURATION_MINUTES` (constante nueva en `utils/constants.js`, valor **120**, con un comentario: *"El modelo no guarda la duración: se asume 2 horas por partido (decisión del 01/11/2026)."*).

   En fórmula, con A el que empieza primero: hay conflicto si `B.inicio − A.inicio < GAME_DURATION_MINUTES + conflictMargin`. Con el margen de 60 minutos, un partido a las 10:00 choca con otro que empieza antes de las 13:00.
2. **No se guardan** (contexto, sección 6): se calculan cada vez. Agregá en `games.service.js`:
   - `findConflictsForGame(gameId | datosDelPartido, { excludeGameId })`: los conflictos que generaría (o genera) un partido;
   - `listConflicts({ scope })`: todos los conflictos actuales de partidos futuros, dentro de un alcance (las categorías de un staff o un deporte).

   Cada conflicto devuelve: la jugadora (id, nombre), los dos partidos (id, categoría, liga, rival, fecha y hora, dirección), los minutos entre el fin de uno y el inicio del otro, la clave `conflictKey` y si está resuelto (regla 1.2.4).
3. **Aviso al guardar:** al crear o editar un partido, el back **no bloquea** el guardado (contexto: "el sistema avisa"), pero:
   - existe `POST /games/check-conflicts`, para que el formulario muestre los conflictos **antes** de guardar;
   - la respuesta de crear o editar incluye `conflicts`;
   - si hay conflictos nuevos, se notifica `SCHEDULE_CONFLICT` (in-app) a las entrenadoras de las dos categorías involucradas.
4. **Resolución entre entrenadoras** (`games.resolveConflicts`):
   - La resuelve una entrenadora asignada a **alguna** de las dos categorías, después de acordarlo con la otra.
   - Elige en qué partido **juega** la jugadora y puede dejar una nota (hasta 300 caracteres).
   - **Se registra solo en la bitácora**, como `CONFLICT_RESOLVED` (MEDIUM), con `details` en JSON: `{ conflictKey, memberId, gameIds, chosenGameId, note }`.
   - **`conflictKey`** = `"{memberId}:{idMenor}-{idMayor}"`.
   - Un conflicto está **resuelto** si existe en la bitácora un `CONFLICT_RESOLVED` del club con esa `conflictKey`.
   - Si cambian la fecha u hora de uno de los partidos, la clave es la misma: el conflicto sigue resuelto si todavía existe, y desaparece si ya no hay superposición.
   - Agregá `getConflictResolutions(clubId, conflictKeys)` para consultarlas en un solo pedido. La va a usar el P12 para avisar al citar a una jugadora en el partido que **no** se eligió.

### 1.3 Notificaciones (con `notify()`, según la tabla del contexto)

| Evento | Tipo | Destinatarios | Mensaje |
|---|---|---|---|
| Se crea un partido, o se cambia su fecha, hora o dirección | `FIXTURE_PUBLISHED` | jugadoras activas de la categoría, con `includeFamily` | *"Nuevo partido: Sub-18 vs. Atlético Ribera, sábado 7/11 a las 18:30 (Local)."* o *"Cambió el partido del sábado…"* |
| Conflicto nuevo al crear o editar | `SCHEDULE_CONFLICT` | entrenadoras de las dos categorías | *"Martina López tiene dos partidos superpuestos: Sub-16 (sáb. 10:00) y Sub-18 (sáb. 11:30)."* |
| Partido cancelado con citaciones | `GAME_CANCELLED` | jugadoras con citaciones canceladas, con `includeFamily` | *"Se canceló el partido de Sub-18 vs. Atlético Ribera del sábado 7/11. Tu citación quedó cancelada."* |

Todo en la misma transacción que la operación. Los emails salen después de confirmarla: `notify()` ya lo resuelve.

### 1.4 Bitácora

Sumá a `LOG_ACTIONS`:
- `GAME_CREATED`, `GAME_UPDATED`, `GAME_PLAYED` (MEDIUM);
- `GAME_CANCELLED` (HIGH, con el motivo);
- `CONFLICT_RESOLVED` (MEDIUM).

## 2. Back (`modules/games/`)

| Método y ruta | Permiso | Qué hace |
|---|---|---|
| `GET /games?categoryId=&state=&from=&to=&page=` | `games.manage` | Partidos del alcance, ordenados por fecha, con su categoría, liga, la cantidad de jugadoras con conflicto y si tienen citaciones |
| `POST /games/check-conflicts` | `games.manage` | `{ categoryId, dateTime, gameId? }`: conflictos que generaría, sin guardar nada |
| `POST /games` | `games.manage` | Crea el partido (reglas 1.1.1 a 1.1.5) y responde `{ game, conflicts }` |
| `PUT /games/:id` | `games.manage` | Edita un partido Programado y responde `{ game, conflicts }` |
| `POST /games/:id/played` | `games.manage` | Regla 1.1.6 |
| `POST /games/:id/cancel` | `games.manage` | `{ reason? }`. Regla 1.1.6, con la cancelación de citaciones y la notificación |
| `GET /games/assigned?from=&to=` | `games.viewAssigned` | Partidos de las categorías del staff logueado (`getCategoriesOfStaff`). Por defecto, desde hoy |
| `GET /games/conflicts` | `games.resolveConflicts` | Conflictos actuales en las categorías de la entrenadora logueada, pendientes y resueltos |
| `POST /games/conflicts/resolve` | `games.resolveConflicts` | `{ memberId, gameIds: [a, b], chosenGameId, note? }`. Verifica que el conflicto exista hoy y que la entrenadora esté en alguna de las dos categorías. Si ya estaba resuelto: 409 |
| `GET /games/mine?from=&to=` | `games.viewOwn` | Partidos de las categorías de la jugadora logueada, agrupados por liga y categoría, con su estado. Por defecto, desde hoy |
| `GET /games/linked?memberId=` | `games.viewLinked` | Lo mismo, para cada socia menor vinculada al adulto logueado. Sin `memberId`, devuelve todas, agrupadas por jugadora |

En todas las consultas se excluyen las categorías y ligas dadas de baja, y las jugadoras inactivas (usá las funciones de `leagues.service.js`).

## 3. Front

### 3.1 Fixture del Representante (`/games`, `pages/games/GamesPage.jsx`)

- **Encabezado:** filtros por categoría, estado y rango de fechas, y el botón **"Nuevo partido"** (naranja).
- **Lista agrupada por fecha** ("Sábado 7 de noviembre"). Cada partido muestra:
  - la hora en la variante `numeric`;
  - la categoría y la liga;
  - "vs. {rival}";
  - un chip "Local" o "Visitante";
  - la dirección;
  - el estado con `StatusChip`: Programado `pending`, Jugado `ok`, Cancelado `overdue`;
  - si tiene conflictos, un chip `urgent` "{n} con conflicto".
- **Menú de cada partido** (si está Programado): Editar, Marcar como jugado (solo si ya pasó la fecha) y Cancelar, con un diálogo que pide el motivo y avisa *"Se van a cancelar las citaciones y se les va a avisar a las jugadoras."*
- **Formulario** (`Dialog`, pantalla completa en el celular):
  - la categoría (solo al crear);
  - el rival;
  - la fecha y la hora (`DateTimePicker`);
  - "Local" o "Visitante" (`ToggleButtonGroup`);
  - la dirección: con Local, un selector de canchas del club; con Visitante, un campo de texto.
  - **Al cambiar la categoría o la fecha y hora**, llama a `check-conflicts` y muestra en vivo un `Alert` en Naranja: *"Ojo: {n} jugadoras tendrían partidos superpuestos"*, con la lista desplegable (jugadora, el otro partido y "empieza {x} min después de que termine este"). El botón dice "Guardar igual" si hay conflictos.

### 3.2 Partidos del staff (`/games/assigned`, `pages/games/AssignedGamesPage.jsx`)

- **Pestaña "Próximos partidos":** la lista de partidos de sus categorías, con el mismo formato y sin acciones.
- **Pestaña "Conflictos"** (si tiene `games.resolveConflicts`):
  - una tarjeta por conflicto, con:
    - la jugadora;
    - los dos partidos lado a lado (categoría, rival, día y hora en la variante `numeric`);
    - el texto *"Se superponen: el segundo empieza {x} min después de que termina el primero (el margen del club es de {m} min)"*;
  - **si está pendiente:** `StatusChip` `urgent` "Pendiente" y el botón "Resolver". Abre un diálogo para elegir en qué partido juega (dos opciones) y una nota opcional, con el texto *"Acordalo con la otra entrenadora antes de confirmar."*
  - **si está resuelto:** `StatusChip` `ok` "Resuelto: juega en {categoría}", con quién lo resolvió y la nota (del log).
  - Estado vacío: *"No hay conflictos de horario en tus categorías."*

### 3.3 Mis partidos y Familia

- **`/my-games` (`pages/games/MyGamesPage.jsx`, `games.viewOwn`):**
  - si la jugadora está en más de una categoría, una sección por cada categoría, con módulos separados por liga como pide el contexto;
  - cada partido con la fecha en grande (variante `numeric`, por ejemplo "SÁB 7/11 · 18:30"), "vs. {rival}", el chip Local o Visitante y la dirección, con un link "Cómo llegar" a Google Maps (`https://www.google.com/maps/search/?api=1&query=...`);
  - los cancelados, con su chip y tachados;
  - estado vacío: *"Todavía no hay partidos en tus categorías."*
- **`/family/games` (`pages/games/FamilyGamesPage.jsx`, `games.viewLinked`):** lo mismo para cada jugadora vinculada, con un selector de jugadora arriba si tiene más de una. Solo lectura.

### 3.4 Rutas y llamadas

Reemplazá el `ComingSoonPage` de `/games`, `/games/assigned`, `/my-games` y `/family/games`. Agregá las llamadas en `client/src/api/games.api.js`.

## 4. Casos de prueba documentados

Creá `docs/pruebas/games.txt` con el formato de `CLAUDE.md`. Como mínimo:
- crear un partido de local con una cancha del club;
- crear uno de visitante con dirección escrita;
- crear un partido en el pasado (rechazado);
- editar uno Programado;
- intentar editar uno Jugado;
- marcar como jugado antes de la fecha (rechazado);
- cancelar con citaciones (quedan Canceladas y las jugadoras reciben la notificación);
- conflicto en el borde: con el margen de 60, partidos a las 10:00 y a las 12:59 chocan, y a las 10:00 y a las 13:00 no;
- conflicto entre dos ligas distintas;
- un partido Cancelado que no genera conflicto;
- aviso previo con `check-conflicts`;
- notificación `SCHEDULE_CONFLICT` a las entrenadoras de las dos categorías;
- resolver un conflicto (en la bitácora y marcado como resuelto);
- resolver dos veces (rechazado);
- resolver una entrenadora ajena (rechazado);
- Mis partidos con dos categorías;
- Familia con dos jugadoras vinculadas;
- cambiar el margen del club y que los conflictos se recalculen.

## 5. Documentación del repo

No modifiques `CLAUDE.md` ni `docs/contexto.md`: ya vienen con estas reglas. Si ves que no las incluyen, avisame.

## 6. Verificación

### 6.1 Back

Hacelo con un script temporal **fuera del repo**, con datos de prueba creados con los modelos:
- una liga con Sub-16 y Sub-18 y otra liga con una categoría Mayores;
- una jugadora en Sub-16 y en Mayores;
- dos entrenadoras, una en cada categoría.

Borralos al final, salvo los que necesites para los casos documentados.

1. **`isHome`:** la columna existe, y después del `db:restore` los datos anteriores siguen y la integridad da correcta.
2. **Partidos:**
   - crear en el pasado → 400;
   - `season` se completa con el año;
   - editar uno Jugado o Cancelado → 409;
   - marcar como jugado antes de la fecha → 400.
3. **Conflictos:**
   - con el margen de 60, a las 10:00 y a las 12:59 → conflicto, y a las 10:00 y a las 13:00 → no;
   - con el margen en 30 (cambiándolo en el club), a las 10:00 y a las 12:31 → no;
   - un partido cancelado no cuenta;
   - una jugadora sacada de la categoría no cuenta;
   - `check-conflicts` devuelve lo mismo que la respuesta de `POST /games`.
4. **Notificaciones:**
   - crear un partido → `FIXTURE_PUBLISHED` para las jugadoras de la categoría (y sus adultos, si son menores);
   - un conflicto nuevo → `SCHEDULE_CONFLICT` para las dos entrenadoras;
   - cancelar con una citación de prueba (creala con el modelo) → la citación queda Cancelada y llega `GAME_CANCELLED`, que se manda por email (en desarrollo, por consola).
5. **Resolución:**
   - `CONFLICT_RESOLVED` en la bitácora con la `conflictKey`;
   - `GET /games/conflicts` lo marca resuelto;
   - resolver de nuevo → 409;
   - una entrenadora de otra categoría → 403 o 404;
   - `getConflictResolutions` devuelve la elección.
6. **Vistas:** `mine` agrupa por categoría; `linked` devuelve solo las jugadoras propias; una Jugadora que llama a `GET /games` → 403.
7. **Integridad:** la verificación de DVH/DVV del P03 da todo correcto.

### 6.2 Front

1. `npm run build` compila sin errores. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano en el navegador:
   - crear dos partidos superpuestos para una jugadora que está en dos categorías y ver el aviso en vivo;
   - entrar como entrenadora, ver el conflicto y resolverlo;
   - ver "Mis partidos" como jugadora;
   - cancelar un partido;
   - las pantallas en tamaño celular.

### 6.3 Cierre

1. **Actualizá `docs/TODO.md`.** En la Fase 4, marcá:
   - partidos con dirección;
   - marcar como Jugado;
   - cancelar un partido;
   - detección de superposición;
   - resolución de conflictos.

   Actualizá la nota de las pantallas del Representante, la Entrenadora y la Preparadora, y la de la vista de la Familia. Agregá la línea al Registro.
2. Mostrame el resultado de la verificación y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
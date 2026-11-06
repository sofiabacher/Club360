# Prompt 12 — Citaciones y aviso a la jugadora cuando se resuelve un conflicto

Vas a implementar el módulo `citations`:
- la entrenadora cita jugadoras para los partidos de sus categorías;
- la jugadora confirma o rechaza dentro de las 24 horas;
- un job confirma solas las citaciones sin respuesta;
- la familia ve las citaciones de sus jugadoras.

Además, vas a conectar la **resolución de conflictos de horario** (P11) con las citaciones y con lo que ve la jugadora.

Antes de empezar, leé `CLAUDE.md` (sobre todo "Citaciones", "Partidos y conflictos" y "Notificaciones") y la sección 6 de `docs/contexto.md` (citación, mora, conflictos y la tabla de canales).

**Alcance:**
- **Se hace:**
  - generar y cancelar citaciones;
  - responder;
  - el job de confirmación automática;
  - el control de mora;
  - el efecto de la resolución de conflictos;
  - las pantallas de la Entrenadora, la Jugadora y la Familia;
  - los casos de prueba.
- **No se hace:** el resto del módulo de cuotas (P14). Acá solo se agrega la función que calcula los días de atraso.
- **No** hagas commit.

## 1. Reglas de la citación (contexto, sección 6)

1. **Quién cita:** la genera una entrenadora (`citations.create`) para un partido de **una de sus categorías** (`isStaffAssignedToCategory`). `citation.staffId` es su registro `staff`.
2. **Partido:** tiene que estar **Programado** y faltar **al menos 48 horas** para el partido (`game.dateTime − ahora ≥ 48 h`). Si no: 400, *"Las citaciones se generan con al menos 2 días de anticipación."*
3. **Jugadora citable:**
   - está asignada y activa en la categoría del partido, y su socio no está INACTIVE;
   - **no tiene mora** superior al plazo del club;
   - **no tiene un conflicto resuelto** para ese partido en el que se eligió el **otro** partido (regla 3.3).
4. **Mora:** una jugadora tiene mora si su socio está **SUSPENDED** o si su cuota impaga más vieja tiene **más días de atraso que `club.delayFee`**.
   - Para calcularlo, creá en `modules/fees/fees.service.js` la función `getOverdueDays(memberId, { transaction })`: los días entre hoy y el `expirationDate` de la cuota no Pagada más vieja que ya venció (0 si no hay). La va a reutilizar el P14.
   - Mensaje: *"{Nombre} tiene cuotas atrasadas: no se la puede citar hasta que regularice su situación."*
5. **Una sola citación por jugadora y partido,** salvo las Canceladas: si existe una Cancelada, se puede volver a citar. Una Rechazada **no** se vuelve a citar.
6. **Plazo para responder:** `dateMaxResponse` = momento de la citación + 24 horas.
7. **Cómo se cita:** a varias jugadoras a la vez. Si alguna no cumple las reglas, **no se crea ninguna** y el 400 trae la lista de nombres con su motivo.
8. **Respuesta:** la responde siempre la **jugadora** (`citations.respond`), aunque sea menor. La Familia solo mira.
   - Solo mientras está **Pendiente** y antes de `dateMaxResponse`.
   - **Confirmar** → Confirmada (2).
   - **Rechazar** → Rechazada (3), con una justificación **obligatoria** de 10 a 300 caracteres (`citation.justification`).
   - No se puede cambiar la respuesta. `dateResponse` = ahora.
9. **Confirmación automática:** un job cada 10 minutos (`jobs/autoConfirmCitations.job.js`) pasa a **Confirmada automáticamente** (4) las Pendientes con `dateMaxResponse` vencido. Registra `CITATION_AUTO_CONFIRMED` (LOW), con `userId` y `roleId` en null.
10. **Cancelación por la entrenadora:**
    - antes del partido, puede cancelar una citación de sus categorías que esté Pendiente, Confirmada o Confirmada automáticamente;
    - pasa a Cancelada (5);
    - se notifica `CITATION_CANCELLED` (solo in-app, con `includeFamily`): *"Se canceló tu citación para Sub-18 vs. Atlético Ribera del sábado 7/11."*
11. **Partido cancelado:** ya lo resuelve el P11 (cancela las citaciones y notifica `GAME_CANCELLED`).

## 2. Notificaciones

Sumá a `NOTIFICATION_TYPES` (en api) y a `notificationTypes.js` (en el front):

| Clave | `email` | Ruta en el front |
|---|---|---|
| `CITATION_CANCELLED` | `false` | `/my-citations` |
| `CONFLICT_RESOLVED` | `false` | `/my-games` |

Y usá los que ya existen:
- **Citación nueva:** `CITATION_NEW` (in-app y email, con `includeFamily`): *"Te citaron para Sub-18 vs. Atlético Ribera, sábado 7/11 a las 18:30. Tenés tiempo de responder hasta el jueves 5/11 a las 21:35."*

## 3. Conflictos resueltos y citaciones

1. **Al resolver un conflicto** (`POST /games/conflicts/resolve` del P11), en la misma transacción:
   - si la jugadora tiene una citación **no cancelada** en el partido **no elegido**, pasa a **Cancelada**;
   - se le notifica `CONFLICT_RESOLVED` a la jugadora (con `includeFamily`): *"Tenías dos partidos superpuestos el sábado 7/11. Se decidió que juegues Sub-18 vs. Atlético Ribera (18:30). No jugás Sub-16 vs. Club Norte (17:00)."*
   - Para no duplicar avisos, **no** se manda además `CITATION_CANCELLED`.

   Hacé este cambio en el service de `games`, llamando a una función de `citations.service.js` (`cancelCitationsForResolvedConflict`).
2. **Consulta de resoluciones:** agregá en `games.service.js` `getResolutionsForMember(clubId, memberId)`, que busca en la bitácora los `CONFLICT_RESOLVED` de esa jugadora y devuelve `[{ gameIds, chosenGameId, note, resolvedBy, resolvedAt }]`. Usala para:
   - **bloquear la citación** en el partido no elegido (regla 1.3), con el mensaje *"{Nombre} no se puede citar: por un conflicto de horario ya resuelto, juega {categoría} vs. {rival}."*;
   - mostrarle a la jugadora y a la familia los partidos que **no** juega.
3. **Lo que ve la jugadora:** en las respuestas de `/citations/mine`, `/citations/linked`, `/games/mine` y `/games/linked`, cada partido y cada citación afectados por una resolución llevan:
   ```js
   conflict: { notPlaying: true, chosenGame: { id, categoryName, rival, dateTime } }
   ```

## 4. Back (`modules/citations/`)

| Método y ruta | Permiso | Qué hace |
|---|---|---|
| `GET /citations/games?from=` | `citations.create` | Próximos partidos Programados de las categorías de la entrenadora. De cada uno: si todavía se puede citar (faltan ≥ 48 h) y un resumen con la cantidad de citadas, confirmadas, pendientes, rechazadas y canceladas |
| `GET /citations/games/:gameId` | `citations.create` | El partido y la **lista de la categoría**: cada jugadora activa con su citación (estado, fecha límite, justificación) o, si no tiene, si es citable y por qué no (`reason`: `OVERDUE`, `CONFLICT_RESOLVED` con el partido elegido, o `TOO_LATE` si faltan menos de 48 h) |
| `POST /citations/games/:gameId` | `citations.create` | `{ memberIds }`: cita (reglas 1.1 a 1.7) y notifica `CITATION_NEW` |
| `POST /citations/:id/cancel` | `citations.create` | Regla 1.10 |
| `GET /citations/mine?scope=upcoming\|history` | `citations.respond` | Citaciones de la jugadora logueada, con el partido, la categoría, el estado, la fecha límite y `conflict` (punto 3.3). Las Pendientes primero |
| `POST /citations/:id/respond` | `citations.respond` | `{ response: 'confirm' \| 'reject', justification? }`. Solo de la propia jugadora (si no, 404). Regla 1.8 |
| `GET /citations/linked?memberId=` | `citations.viewLinked` | Lo mismo que `mine`, para las jugadoras vinculadas al adulto, agrupadas por jugadora |

**Bitácora:** sumá a `LOG_ACTIONS` `CITATION_CREATED` (con la cantidad), `CITATION_CANCELLED`, `CITATION_CONFIRMED`, `CITATION_REJECTED` (MEDIUM) y `CITATION_AUTO_CONFIRMED` (LOW).

## 5. Front

### 5.1 Citaciones de la Entrenadora (`/citations`, `pages/citations/CitationsPage.jsx`)

- **Lista de próximos partidos** de sus categorías, cada uno con la fecha y hora en la variante `numeric`, la categoría, el rival, el resumen ("8 citadas · 5 confirmadas · 2 pendientes · 1 rechazada") y un chip si **ya no se puede citar** (faltan menos de 48 h).
- **Al abrir un partido** (`/citations/games/:gameId`, `pages/citations/GameCitationsPage.jsx`), la lista de la categoría con:
  - una casilla en las jugadoras citables;
  - el estado de cada una con `StatusChip`: Confirmada y Confirmada automáticamente `ok` (la segunda con "(automática)"), Pendiente `pending` (con "responde hasta {día y hora}"), Rechazada `overdue` (con la justificación al tocar) y Cancelada neutro;
  - las **no citables** con su motivo: "Mora" (`urgent`) o "Juega en {categoría}: conflicto resuelto" (neutro);
  - el botón **"Citar a las seleccionadas"** (naranja), con confirmación;
  - en cada citación que se puede cancelar, la acción "Cancelar citación", con confirmación.

  Si faltan menos de 48 h: un `Alert` *"Ya no se pueden generar citaciones para este partido"* y las casillas deshabilitadas.

### 5.2 Mis citaciones (`/my-citations`, `pages/citations/MyCitationsPage.jsx`)

Tiene que verse como la tarjeta de citación del moodboard.

- **Pendientes arriba,** cada una en una tarjeta destacada con:
  - un `StatusChip` `urgent` "Respondé antes de {jueves 5/11, 21:35}" y el tiempo que queda ("faltan 6 h");
  - el partido: la categoría, "vs. {rival}", la fecha y hora en la variante `numeric`, Local o Visitante y la dirección;
  - el botón **"Confirmo"** (naranja) y el botón **"No puedo"**, que abre un diálogo con la justificación obligatoria y su contador.
- **Próximas ya respondidas** y un **historial**, con su estado.
- **Citaciones canceladas por conflicto** (`conflict.notPlaying`): una tarjeta con un mensaje claro: *"No jugás este partido. Por superposición de horario se decidió que juegues {categoría} vs. {rival} ({día} {hora})."*, en lugar del simple "Cancelada".
- **Estado vacío:** *"No tenés citaciones por ahora."*

### 5.3 Familia (`/family/citations`, `pages/citations/FamilyCitationsPage.jsx`)

Lo mismo en solo lectura, con un selector si tiene más de una jugadora, y la nota *"La citación la responde la jugadora."* en las Pendientes.

### 5.4 Mis partidos (ajuste a `MyGamesPage` y `FamilyGamesPage` del P11)

Los partidos con `conflict.notPlaying` se muestran atenuados, con el chip "No lo jugás" y el texto *"Por superposición de horario, jugás {categoría} vs. {rival}."*

### 5.5 Rutas y llamadas

- Reemplazá el `ComingSoonPage` de `/citations`, `/my-citations` y `/family/citations`.
- Agregá a `AppRouter` la ruta `/citations/games/:gameId`, con `citations.create`.
- Agregá las llamadas en `client/src/api/citations.api.js`.

## 6. Casos de prueba documentados

Creá `docs/pruebas/citations.txt` con el formato de `CLAUDE.md`. Como mínimo:
- citar a dos jugadoras;
- citar a menos de 48 h (rechazado);
- citar en un partido Jugado o Cancelado (rechazado);
- citar a una jugadora con mora (rechazado, con el motivo);
- citar a una suspendida (rechazado);
- citar con una lista donde una no cumple (no se crea ninguna);
- citar dos veces a la misma (rechazado);
- volver a citar después de una cancelada (aceptado);
- confirmar;
- rechazar sin justificación (rechazado);
- rechazar con justificación;
- responder después de las 24 h (rechazado);
- confirmación automática por el job;
- la Familia intenta responder (sin permiso);
- la entrenadora cancela una citación (notificación in-app);
- conflicto resuelto con la jugadora citada en los dos partidos: se cancela la citación del no elegido, llega `CONFLICT_RESOLVED` y se ve "No jugás este partido";
- intentar citar en el partido no elegido (rechazado con el motivo);
- "Mis partidos" muestra "No lo jugás".

## 7. Documentación del repo

No modifiques `CLAUDE.md` ni `docs/contexto.md`: ya vienen con estas reglas. Si ves que no las incluyen, avisame.

## 8. Verificación

### 8.1 Back

Hacelo con un script temporal **fuera del repo**, con datos de prueba creados con los modelos:
- dos categorías con una jugadora en las dos y dos entrenadoras;
- partidos dentro de más de 48 h y uno dentro de menos;
- una jugadora con una cuota vencida hace más de `delayFee` días (creala con el modelo `Fee`);
- un conflicto entre dos partidos.

Borralos al final, salvo los que necesites para los casos documentados.

1. **Reglas de la citación:** todas las de la sección 1, con los mensajes; las de "todas o ninguna" no crean ninguna.
2. **`getOverdueDays`:** devuelve los días correctos con una cuota vencida y 0 sin cuotas.
3. **Respuesta:**
   - confirmar;
   - rechazar sin justificación → 400;
   - rechazar con justificación;
   - responder una ajena → 404;
   - responder con el plazo vencido (cambiá `dateMaxResponse` con el modelo) → 400.
4. **Job:** con una Pendiente vencida, ejecutá la función del job a mano: queda Confirmada automáticamente y en la bitácora aparece `CITATION_AUTO_CONFIRMED`.
5. **Notificaciones:**
   - `CITATION_NEW` para la jugadora y su adulto, con el email por consola;
   - `CITATION_CANCELLED` solo in-app.
6. **Conflicto:**
   - con la jugadora citada en los dos partidos, resolver eligiendo uno → la citación del otro queda Cancelada y llega `CONFLICT_RESOLVED` (sin `CITATION_CANCELLED`);
   - citarla en el no elegido → 400 con el motivo;
   - `/citations/mine` y `/games/mine` traen `conflict.notPlaying` en el no elegido.
7. **Alcance:** una entrenadora no ve ni cita partidos de categorías ajenas (404 o 403).
8. **Integridad:** la verificación de DVH/DVV del P03 da todo correcto.

### 8.2 Front

1. `npm run build` compila sin errores. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano en el navegador:
   - citar como entrenadora;
   - responder "Confirmo" y "No puedo" como jugadora;
   - resolver un conflicto con la jugadora citada en los dos partidos y ver cómo le queda a ella en "Mis citaciones" y en "Mis partidos";
   - las pantallas en tamaño celular.

### 8.3 Cierre

1. **Actualizá `docs/TODO.md`.** En la Fase 4, marcá:
   - citaciones;
   - respuesta a la citación;
   - el job de confirmación automática.

   Agregá la tarea *"Aviso a la jugadora y cancelación de la citación del partido no elegido al resolver un conflicto (P12)"*, ya marcada. Actualizá las notas de las pantallas. Agregá la línea al Registro.
2. Mostrame el resultado de la verificación y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
# Prompt 15 — Rutinas semanales y paneles de inicio de la Jugadora y la Familia

Vas a hacer dos cosas:
1. **El módulo `routines`:** la preparadora física carga la rutina de cada día de entrenamiento de sus categorías, la entrenadora la consulta y la jugadora ve la suya.
2. **Los paneles de inicio de la Jugadora y de la Familia,** como muestra `docs/moodboard.png` ("así se vería el inicio"). Los demás roles siguen con los accesos rápidos.

Antes de empezar:
- leé `CLAUDE.md`, sobre todo "Imágenes", "Notificaciones", "Diseño visual", "Ligas y categorías", "Citaciones" y "Cuotas y pagos";
- leé la sección 6 de `docs/contexto.md` ("Rutinas");
- mirá `docs/moodboard.png`.

**Alcance:**
- **Se hace:** lo de arriba, los casos de prueba y la verificación.
- **No se hace:**
  - el seguimiento personal de la jugadora (cumplimiento de la rutina, objetivos), que está en Futuro;
  - los paneles de inicio de los otros roles.
- **No** hagas commit.

## 0. Cambio en el modelo `Routine`

1. **Campo nuevo:** `dayOfWeek`, `TINYINT`, `allowNull: false`, `defaultValue: 1`. Es el día de la semana con la numeración ISO: 1 lunes … 7 domingo.
   - Sumá `DAYS_OF_WEEK` a `utils/constants.js` (api y client), con el número, la etiqueta corta (`L`, `M`, `X`, `J`, `V`, `S`, `D`) y el nombre (`lunes`…).
2. **Índice único compuesto:** `(categoryId, weekStart, dayOfWeek)`. Hay una sola rutina por categoría y por día.
3. **`weekStart`:** siempre es el **lunes** de esa semana. La fecha del día se calcula como `weekStart + (dayOfWeek − 1)`.
4. **Cómo aplicarlo:**
   1. `npm run db:snapshot`;
   2. recrear la base;
   3. `npm run db:restore`.

   Avisame antes de recrear la base y esperá mi confirmación. Si ya había rutinas cargadas, quedan como lunes: avisame cuántas había.
5. **Integridad:** revisá que `models/integrityHooks.js` recalcule el DVV también al **borrar** (`afterDestroy`), porque las rutinas se pueden borrar (regla 1.1.5). Si no lo hace, agregalo para todos los modelos con `dvh`.

## 1. Rutinas (módulo `routines`)

### 1.1 Reglas

1. **Fechas:** sumá a `utils/dates.js`, en la zona horaria de Argentina, como el resto de las funciones de fechas:
   - `getWeekStart(date)`: el lunes de esa semana, como `DATEONLY`;
   - `getCurrentWeekStart()`.
2. **Quién carga** (`routines.manage`):
   - **la preparadora física**, solo en las categorías a las que está asignada (`getCategoriesOfStaff`, `isStaffAssignedToCategory`);
   - un usuario con ese permiso que **no** es staff (por ejemplo, un rol nuevo que cree el Admin) trabaja con todas las categorías activas del club, como `getLeagueScope`.

   Armá una función `getRoutineScope(user)` en `routines.service.js` que devuelva los ids de las categorías del alcance.
3. **Semanas editables:** se cargan, se editan y se borran rutinas de la **semana actual y de las futuras**. Las semanas pasadas quedan como historial, de solo lectura: si se intenta modificarlas, 400 con *"Las rutinas de semanas pasadas no se pueden modificar."*
4. **Datos de una rutina:**
   - `title`: de 3 a 150 caracteres;
   - `description`: obligatoria, hasta 3000 caracteres. Es el detalle de los ejercicios, en texto;
   - `image`: opcional, JPG, PNG o WEBP, hasta 5 MB. Se sube con `upload('routines')`;
   - `videoUrl`: opcional, un link `http` o `https` de hasta 255 caracteres.

   Al reemplazar o quitar la imagen, la anterior se borra con la función común de `utils/` (ver "Imágenes" en `CLAUDE.md`).
5. **Borrar:** la preparadora puede borrar la rutina de un día de la semana actual o de una futura (por ejemplo, si cargó un día equivocado). Es un borrado físico, porque `routine` no tiene nada que dependa de ella. Se registra en la bitácora con la categoría, la semana y el día.
6. **Avisos** (`ROUTINE_PUBLISHED`, in-app, ya existe en `NOTIFICATION_TYPES`):
   - **destinatarias:** las jugadoras activas de la categoría (`getActivePlayersOfCategory`), sin la familia;
   - **al crear:** *"Se publicó la rutina del {día} {dd/mm} de {categoría}."*;
   - **al editar:** *"Se actualizó la rutina del {día} {dd/mm} de {categoría}."*;
   - **al borrar:** no se avisa.
7. **Bitácora:** sumá a `LOG_ACTIONS` `ROUTINE_CREATED`, `ROUTINE_UPDATED` y `ROUTINE_DELETED`.
8. **Quién consulta:**
   - **la entrenadora** (`routines.viewAssigned`): las rutinas de sus categorías (`getCategoriesOfStaff`), en solo lectura;
   - **la jugadora** (`routines.viewOwn`): las de las categorías en las que está activa (`getCategoriesOfMember`). Si juega en dos ligas, las ve separadas por categoría.

   Las dos pueden ver cualquier semana, pasada o futura.

### 1.2 Back (`modules/routines/`)

| Método y ruta | Permiso | Qué hace |
|---|---|---|
| `GET /routines/categories` | `routines.manage` o `routines.viewAssigned` | Las categorías del alcance, con su liga y su deporte |
| `GET /routines?categoryId=&weekStart=` | `routines.manage` o `routines.viewAssigned` | La semana de la categoría: los 7 días, cada uno con su rutina o `null`. Sin `weekStart`, la actual. Devuelve también `editable` (regla 1.1.3) y los partidos de la categoría de esa semana (para que la preparadora ajuste las rutinas) |
| `GET /routines/weeks?categoryId=` | `routines.manage` o `routines.viewAssigned` | Historial: las semanas con rutinas cargadas, de la más reciente a la más vieja, con la cantidad de días cargados |
| `POST /routines` | `routines.manage` | `multipart/form-data`: `categoryId`, `weekStart`, `dayOfWeek`, `title`, `description`, `videoUrl?` y el archivo `image?`. Si ese día ya tiene rutina, 409 |
| `PUT /routines/:id` | `routines.manage` | Los mismos campos, menos la categoría, la semana y el día. Con `removeImage=true` se quita la imagen |
| `DELETE /routines/:id` | `routines.manage` | Regla 1.1.5 |
| `GET /routines/mine?weekStart=` | `routines.viewOwn` | La semana de la jugadora logueada, agrupada por categoría (con la liga): los 7 días de cada una, con su rutina o `null` |

**Validaciones:**
- `weekStart`: una fecha `YYYY-MM-DD` que sea lunes;
- `dayOfWeek`: de 1 a 7;
- `categoryId`: que esté en el alcance; si no, 404.

Todo filtra por `clubId`.

## 2. Front de rutinas

Con un componente compartido, `components/routines/RoutineWeekView.jsx`:
- **un navegador de semanas:** "‹ Semana del 10/11 al 16/11 ›", con un botón "Esta semana";
- **los días en pastillas,** como en el moodboard ("Rutina de la semana"):
  - L, M, X, J y V siempre; S y D solo si tienen rutina o si se está editando;
  - **con rutina:** fondo verde suave;
  - **seleccionado:** borde Azul;
  - **vacío:** gris;
  - **hoy:** un punto debajo;
- **la tarjeta del día:** el título, la descripción (con los saltos de línea), la imagen (se abre en grande al tocarla) y un botón "Ver video" que abre el link en otra pestaña. El fondo `ParquetBackground` va detrás de la tarjeta;
- **un día sin rutina:** `EmptyState` con *"No hay rutina cargada para este día."*

### 2.1 Preparadora física (`/routines`, `pages/routines/RoutinesManagePage.jsx`)

- **Arriba:** un selector de categoría (con la liga) y `RoutineWeekView`.
- **Partidos de la categoría esa semana:** en una tarjeta al costado (abajo en el celular), con la fecha, el rival y si es de local.
- **En las semanas editables,** el día elegido se edita en el lugar:
  - título y descripción (multilínea);
  - una zona para subir la imagen, con la vista previa y el botón "Quitar imagen";
  - el link del video;
  - el botón **"Publicar"** (naranja; dice "Guardar cambios" si el día ya tenía rutina) y "Borrar rutina" (con confirmación).
- **En las semanas pasadas:** un `Alert` *"Las semanas pasadas son solo de consulta."* y la vista de lectura.
- **Historial:** una lista de las semanas cargadas (de `/routines/weeks`) para saltar a cualquiera.

### 2.2 Entrenadora (`/routines/assigned`, `pages/routines/RoutinesAssignedPage.jsx`)

La misma pantalla, en solo lectura: el selector de categoría, `RoutineWeekView`, los partidos de la semana y el historial.

### 2.3 Jugadora (`/my-routine`, `pages/routines/MyRoutinePage.jsx`)

- `RoutineWeekView` con la semana actual y el día de hoy elegido.
- Si está en dos categorías, una pestaña por categoría con el nombre de la liga.
- Puede navegar a semanas pasadas y futuras.
- Sin categorías: `EmptyState` con *"Todavía no estás en ninguna categoría."*

**Rutas y menú:** las tres entradas ya están en `navigation/menu.js` desde el P05. Revisá que las rutas de `AppRouter` usen `PermissionRoute` con el mismo permiso. Sumá las llamadas a `api/routines.api.js`.

## 3. Panel de inicio

### 3.1 Cómo se elige el panel

`pages/HomePage.jsx` elige el panel **por permisos, nunca por el nombre del rol**:
- con `citations.respond` y `games.viewOwn` → `PlayerHome`;
- si no, con `games.viewLinked` y `fees.manageLinked` → `FamilyHome`;
- si no, el inicio actual: el saludo y los accesos rápidos.

En los dos paneles nuevos, los accesos rápidos siguen abajo, con el título "Accesos rápidos".

Los paneles usan los endpoints que ya existen: `/games/mine`, `/citations/mine`, `/fees/mine`, `/routines/mine`, `/games/linked`, `/citations/linked` y `/fees/linked`.
- Cada bloque carga por separado, con su `Skeleton`, y si falla muestra su propio error, sin romper el resto del panel.
- Si para un bloque falta un dato, sumá un parámetro chico al endpoint existente (por ejemplo, `?limit=`). **No** crees un módulo ni un endpoint de "dashboard".

### 3.2 Panel de la Jugadora (`components/home/PlayerHome.jsx`)

Siguiendo el moodboard ("Panel de la Jugadora" y "así se vería el inicio"):

1. **Encabezado:** "Hola, {nombre}" y **una frase de lo más urgente**, en este orden de prioridad:
   1. una citación pendiente: *"Tenés una citación pendiente para el {día}."*;
   2. una cuota vencida: *"Tenés una cuota vencida."*;
   3. el próximo partido: *"Tu próximo partido es el {día} a las {hora}."*;
   4. si no hay nada de eso: *"Estás al día. ¡A entrenar!"*
2. **Carnet de socia,** como en el moodboard: encabezado Bordó con el nombre del club, la franja del `accentColor`, fondo Crema, la foto o un ícono, el nombre, "SOCIO Nº 004821" en la variante `numeric` y "{deporte} · {categoría}".
3. **Próximo partido, una tarjeta por categoría** ("módulos diferenciados" si juega en dos ligas, con el nombre de la liga como título):
   - "PRÓXIMO PARTIDO" y la fecha y hora en la variante `numeric`, grande ("SÁB 25/10 · 18:30");
   - "vs. {rival} · Local/Visitante" y la dirección;
   - **el estado de su citación:**
     - si está **Pendiente:** `StatusChip` `urgent` "Citación pendiente", la fecha límite y los botones **"Confirmo"** (naranja) y "No puedo ir" (abre el diálogo de justificación del P12; reusalo, no lo copies);
     - si está **Confirmada:** `ok`;
     - si está **Rechazada o Cancelada:** `overdue`;
     - **sin citación:** el texto "Todavía sin citación";
   - si el partido tiene `conflict.notPlaying`: "No jugás este partido" en lugar de los botones;
   - debajo, los **2 partidos siguientes** de esa categoría en una lista chica, y un link "Ver fixture".
   - **Sin partidos:** "No hay partidos programados."
4. **Cuota:** un `StatusChip` "Cuota al día" (`ok`), "Pendiente" (`pending`) o "Vencida" (`overdue`), con el total adeudado si debe y un link "Ver mis cuotas".
   - Si está suspendida, el `Alert` de la suspensión del P14.
   - Si tiene una transferencia en revisión, "Transferencia en revisión".
5. **Rutina de la semana:** las pastillas de los días (las mismas de `RoutineWeekView`, sin la tarjeta del día) por categoría, con el título de la rutina de hoy si tiene, y un link "Ver rutina".

**Diseño:**
- un solo botón naranja visible: "Confirmo" si hay una citación pendiente;
- si no hay citación pendiente, ningún botón naranja;
- en la compu, las tarjetas van en grilla de dos columnas (partido a la izquierda; carnet, cuota y rutina a la derecha); en el celular, en una columna, con el partido primero.

### 3.3 Panel de la Familia (`components/home/FamilyHome.jsx`)

1. **Encabezado:** "Hola, {nombre}" y la frase más urgente de todas sus jugadoras:
   1. una cuota vencida: *"La cuota de {jugadora} está vencida."*;
   2. una citación pendiente: *"{jugadora} tiene una citación pendiente para el {día}."*;
   3. si no: *"Todo al día."*
2. **Una tarjeta por cada jugadora vinculada,** con:
   - su nombre y el carnet chico (número de socio y categoría);
   - el próximo partido (fecha y hora en `numeric`, rival, Local o Visitante);
   - el estado de su citación, en solo lectura, con la nota *"La responde {jugadora}."*;
   - el estado de la cuota con `StatusChip` y el total adeudado.
3. **El botón "Pagar"** (naranja) en la jugadora con la cuota impaga más vieja: lleva a `/family/fees` con esa jugadora elegida. Las otras con deuda muestran el link "Ver cuotas".
4. **Sin jugadoras vinculadas:** `EmptyState` con *"Todavía no tenés jugadoras vinculadas."* y un link a "Mi cuenta" para vincular una.

## 4. Casos de prueba documentados

### `docs/pruebas/routines.txt`

1. **Carga:** cargar la rutina de un día con imagen y video; sin título (rechazado); un día que ya tiene rutina (409); un `weekStart` que no es lunes (rechazado).
2. **Alcance:**
   - en una categoría que no es suya (404);
   - en una semana pasada (rechazado);
   - una entrenadora que intenta cargar (403).
3. **Edición:** editar (aviso "Se actualizó"), quitar la imagen y borrar (sin aviso).
4. **Avisos:** llega a las jugadoras activas de la categoría y no a las de otra categoría.
5. **Consulta:**
   - la jugadora en dos categorías ve las dos;
   - la entrenadora ve sus categorías;
   - el historial de semanas.

### `docs/pruebas/inicio.txt`

1. **Panel de la Jugadora:**
   - con una citación pendiente, confirmar desde el inicio;
   - con un conflicto resuelto ("No jugás este partido");
   - con una cuota vencida;
   - en dos ligas;
   - sin partidos.
2. **Panel de la Familia:** con dos jugadoras, el botón "Pagar" en la que debe más y sin jugadoras vinculadas.
3. **Otros roles:** el Admin y la entrenadora siguen viendo los accesos rápidos.

## 5. Documentación del repo

No modifiques `CLAUDE.md` ni `docs/contexto.md`: ya vienen con estas reglas. Si ves que no las incluyen, avisame.

## 6. Verificación

### 6.1 Back

Hacelo con un script temporal **fuera del repo**:

1. **Modelo:** después del restore, `dayOfWeek` existe, el índice único funciona y la integridad da correcta.
2. **Reglas:**
   - las reglas 1.1.2 a 1.1.6;
   - borrar recalcula el DVV;
   - el aviso llega solo a las jugadoras activas de la categoría.
3. **Consulta:**
   - `/routines/mine` agrupa por categoría;
   - una entrenadora con `GET /routines` de una categoría que no es suya → 404;
   - una Jugadora con `POST /routines` → 403.
4. **Fechas:** `getWeekStart` con un domingo a las 23:30 (hora de Argentina) devuelve el lunes de esa misma semana, no el siguiente.
5. **Integridad:** la verificación de DVH/DVV del P03 da todo correcto.

### 6.2 Front

1. `npm run build` compila sin errores. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano en el navegador:
   - **como preparadora:** cargar la semana con imagen y video, y mirar los partidos de la semana;
   - **como entrenadora:** ver la misma semana;
   - **como jugadora:**
     - ver el inicio;
     - confirmar una citación desde ahí;
     - ver la rutina de hoy;
   - **como Familia:** ver el inicio con dos jugadoras e ir a pagar;
   - **en el celular:** todo lo anterior.

### 6.3 Cierre

1. **Actualizá `docs/TODO.md`:**
   - marcá las tareas de rutinas y del panel de la Jugadora;
   - sumá y marcá: *"Panel de inicio de la Familia (P15)"*.

   Agregá la línea al Registro.
2. Mostrame el resultado de la verificación y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
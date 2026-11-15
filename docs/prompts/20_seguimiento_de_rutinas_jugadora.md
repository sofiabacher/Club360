# Prompt 20 — Seguimiento personal de la jugadora e historial de partidos jugados

Vas a hacer dos cosas:
1. **El seguimiento personal de la jugadora:** registra cómo le fue con cada rutina, carga sus objetivos y ve su progreso con gráficos. La preparadora física de sus categorías ve ese seguimiento.
2. **La pestaña "Jugados"** en las vistas de partidos de la Jugadora, la Entrenadora y la Familia: el historial de lo que ya pasó, con los resultados del P19.

Antes de empezar:
- leé `CLAUDE.md`, sobre todo "Rutinas", "Partidos y conflictos", "Bitácora, integridad y backup", "Datos de la demo" y "Deploy de la demo";
- leé en `docs/contexto.md`: la sección 6 ("Seguimiento personal de la jugadora" e "Historial de partidos"), la sección 4 (catálogo de permisos) y la sección 8;
- mirá cómo quedaron hoy:
  - `modules/routines/`, `RoutineWeekView` y `MyRoutinePage` (P15);
  - las vistas de partidos de cada rol y `CampaignCard` (P19);
  - `seed/seed.js` y `seed/data/baseRoles.js` (cómo se asignan los permisos de los roles base);
  - `utils/clubData.js` (P16);
  - `seed/demo.js`.

**Alcance:**
- **Se hace:**
  - los dos modelos nuevos y los dos permisos nuevos;
  - el registro de cumplimiento, los objetivos, el progreso y la vista de la preparadora;
  - la pestaña "Jugados";
  - los datos de la demo;
  - los casos de prueba y la verificación.
- **No se hace:**
  - métricas físicas (peso, saltos, tiempos);
  - comentarios de la preparadora sobre los registros;
  - avisos.
- **No** hagas commit.

## 0. Modelos y permisos nuevos

### 0.1 `RoutineLog` → tabla `routineLog`

El registro de cumplimiento de una jugadora para la rutina de un día.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | PK | |
| `clubId` | FK `club`, NOT NULL | |
| `routineId` | FK `routine`, NOT NULL | `RESTRICT` |
| `memberId` | FK `member`, NOT NULL | `RESTRICT` |
| `status` | `TINYINT NOT NULL DEFAULT 1` | `ROUTINE_LOG_STATUS`: 1 Completada, 2 Parcial, 3 No completada |
| `effort` | `TINYINT` NULL | Percepción de esfuerzo, de 1 a 5. NULL si no la completó |
| `note` | `VARCHAR(300)` NULL | |
| `dvh` | | Con los hooks de integridad |

- **Índice único:** `(routineId, memberId)`. Hay un solo registro por jugadora y por rutina.
- Con timestamps.

### 0.2 `Goal` → tabla `goal`

Un objetivo personal de la jugadora.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | PK | |
| `clubId` | FK `club`, NOT NULL | |
| `memberId` | FK `member`, NOT NULL | `RESTRICT` |
| `text` | `VARCHAR(200) NOT NULL` | |
| `dueDate` | `DATEONLY NOT NULL` | Fecha límite |
| `goalState` | `INT NOT NULL DEFAULT 1` | `GOAL_STATES`: 1 En curso, 2 Cumplido, 3 Abandonado |
| `closedAt` | `DATE` NULL | Cuándo se marcó como Cumplido o Abandonado |
| `dvh` | | |

- **"Vencido" no es un estado:** es un objetivo En curso con `dueDate` pasada. Se calcula al mostrarlo, como los días de mora.

### 0.3 Integración

1. **Asociaciones** en `models/index.js`:
   - `Routine 1-N RoutineLog`;
   - `Member 1-N RoutineLog`;
   - `Member 1-N Goal`;
   - `Club 1-N` de las dos.
2. **`CLUB_TABLES`** (`utils/clubData.js`): sumá `goal` después de `member`, y `routineLog` después de `routine` y de `member`. Así entran en la integridad, el backup, la restauración y el `--reset` de la demo.
3. **Constantes** en `utils/constants.js` (api y client): `ROUTINE_LOG_STATUS`, `GOAL_STATES`, `ROUTINE_LOG_WINDOW_DAYS = 7`, y las etiquetas de las tablas nuevas en `TABLE_LABELS`.
4. **Base local:** son tablas nuevas, así que `sync()` las crea al arrancar, sin recrear la base. Comprobalo.

### 0.4 Permisos nuevos

El catálogo pasa de 41 a **43 permisos**. Agregalos en `utils/permissions.js` (con sus constantes):

| Permiso | Descripción | Rol base |
|---|---|---|
| `routines.trackOwn` | Registrar el cumplimiento de las propias rutinas y gestionar los objetivos personales | Jugadora |
| `routines.viewTracking` | Consultar el seguimiento de las jugadoras de sus categorías | Preparadora física |

- **Ningún permiso nuevo es solo para mayores:** las menores también hacen su seguimiento.
- **En `seed/data/baseRoles.js`:** Jugadora pasa a 13 permisos y Preparadora física a 6.

### 0.5 Los permisos nuevos en una base que ya tiene datos

Hoy el seed asigna los permisos de un rol base **solo cuando crea el rol**, para no pisar los cambios del Admin. Así, en una base que ya tiene los roles (tu base local y la de Railway), Jugadora y Preparadora física nunca recibirían los permisos nuevos.

Sumá esta regla al seed, con un comentario que la explique: **cuando el seed crea un permiso que no existía en el catálogo, se lo asigna a los roles base que lo tienen en `baseRoles.js`.**
- Los permisos que ya existían no se tocan: los cambios del Admin se siguen respetando.
- Un permiso nuevo no lo pudo haber quitado nadie, porque no existía.

Registralo en la consola del seed (*"Permiso nuevo routines.trackOwn → Jugadora (1 club)"*).

## 1. Registro de cumplimiento

### 1.1 Reglas

1. **Quién:** la jugadora (`routines.trackOwn`), solo sobre las rutinas de las categorías donde está activa (`getCategoriesOfMember`). Si juega en dos categorías y las dos tienen rutina ese día, registra cada una por separado.
2. **Cuándo:** desde el día de la rutina hasta `ROUTINE_LOG_WINDOW_DAYS` (7) días después. La fecha de la rutina es `weekStart + (dayOfWeek − 1)`, en hora de Argentina.
   - Una rutina de un día futuro: 400, *"Todavía no podés registrar esta rutina."*
   - Una rutina con la ventana vencida: 400, *"Ya pasó el plazo para registrar esta rutina."*
3. **Datos:**
   - `status` es obligatorio;
   - `effort` (de 1 a 5) es obligatorio si es Completada o Parcial, y tiene que venir vacío si es No completada;
   - `note` es opcional, hasta 300 caracteres.
4. **Crear y editar:** se crea y se edita con el mismo endpoint (si ya existe, se actualiza), siempre dentro de la ventana. No se borra.
5. **Sin bitácora ni avisos:** es información personal de la jugadora, no una acción de gestión del club.
6. **Borrar una rutina** (regla del P15): si alguna jugadora ya la registró, no se puede borrar. Responde 409, *"No se puede borrar: ya hay jugadoras que registraron esta rutina. Podés editarla."*

### 1.2 Objetivos

1. **Solo la jugadora** los crea, los edita y los cierra (`routines.trackOwn`).
2. **Al crear:** `text` de 5 a 200 caracteres y `dueDate` de hoy en adelante.
3. **Editar:** solo los En curso (el texto y la fecha, que tiene que seguir siendo de hoy en adelante).
4. **Cerrar:** marcarlo como Cumplido o Abandonado completa `closedAt`. Un objetivo cerrado se puede **reabrir** (vuelve a En curso y `closedAt` queda en NULL), por si se marcó por error. Si su fecha ya pasó, al reabrirlo pide una fecha nueva.
5. **No se borran:** "Abandonado" cumple esa función y deja el historial.
6. **Máximo 10 objetivos En curso:** 400, *"Tenés 10 objetivos en curso. Cerrá alguno antes de sumar otro."*

### 1.3 Progreso

`getProgress(memberId, { weeks = 8 })` en `routines.service.js`. Se calcula, no se guarda:
1. **Por semana**, de las últimas `weeks` semanas, incluida la actual hasta hoy:
   - las rutinas programadas de sus categorías con fecha de hoy o anterior;
   - cuántas registró como Completada, Parcial y No completada, y cuántas quedaron sin registrar;
   - el **cumplimiento**: `(completadas + parciales × 0,5) / programadas`, en porcentaje;
   - el **esfuerzo promedio** de las que tienen esfuerzo.
2. **Totales del período:**
   - cumplimiento y esfuerzo promedio;
   - la **racha**: cuántas rutinas seguidas, de la más reciente hacia atrás, tienen Completada o Parcial. Una sin registrar todavía dentro de la ventana no corta la racha; una No completada o una con la ventana vencida, sí.
3. **Objetivos:** cuántos En curso (y de esos, cuántos vencidos), Cumplidos y Abandonados.

### 1.4 Back (`modules/routines/`)

| Método y ruta | Permiso | Qué hace |
|---|---|---|
| `GET /routines/mine?weekStart=` | `routines.viewOwn` (ya existe) | Suma a cada rutina `myLog` (o `null`) y `canLog` (si está dentro de la ventana), si la jugadora tiene `routines.trackOwn` |
| `PUT /routines/:id/log` | `routines.trackOwn` | `{ status, effort?, note? }`. Reglas 1.1 |
| `GET /routines/progress/mine?weeks=` | `routines.trackOwn` | Punto 1.3, de la jugadora logueada |
| `GET /routines/goals/mine?state=` | `routines.trackOwn` | Sus objetivos: primero los En curso por fecha, después los cerrados, del más reciente al más viejo. Cada uno con `overdue` |
| `POST /routines/goals` | `routines.trackOwn` | Regla 1.2.2 |
| `PUT /routines/goals/:id` | `routines.trackOwn` | Regla 1.2.3. Solo sus propios objetivos; si no: 404 |
| `PATCH /routines/goals/:id/state` | `routines.trackOwn` | `{ goalState, dueDate? }`. Reglas 1.2.4 |
| `GET /routines/tracking?categoryId=&weekStart=` | `routines.viewTracking` | La semana de una categoría de su alcance (`getRoutineScope`): cada jugadora activa con su registro de cada rutina de la semana, más el cumplimiento y el esfuerzo promedio de esa semana |
| `GET /routines/tracking/members/:memberId?weeks=` | `routines.viewTracking` | El progreso (1.3) y los objetivos de una jugadora **activa en alguna categoría de su alcance**; si no: 404 |

Todo filtra por `clubId`.

## 2. Front del seguimiento

### 2.1 Registrar desde "Mi rutina" (`MyRoutinePage`)

En la tarjeta del día de `RoutineWeekView`, debajo de la rutina, si `canLog`:
- **"¿Cómo te fue?"**, con tres botones grandes: **Completada** (verde), **Parcial** (ámbar) y **No la hice** (rojo);
- si eligió Completada o Parcial, el **esfuerzo**: cinco círculos del 1 al 5, con etiquetas en los extremos ("Muy liviano" y "Al máximo");
- la nota opcional y el botón **"Guardar"** (naranja).

Si ya lo registró, se muestra lo que puso, con un botón "Editar" mientras esté dentro de la ventana. Fuera de la ventana, solo lectura; sin registro: "No registrada".

**En las pastillas de los días** (solo en la vista de la jugadora), un indicador chico del registro: ✓ verde, medio círculo ámbar, ✕ rojo, o nada.

### 2.2 Mi progreso (`/my-progress`, `pages/routines/MyProgressPage.jsx`)

- **Menú:** "Mi progreso", en el grupo Mi espacio, con `routines.trackOwn`.
- **Aviso arriba,** en un texto chico: *"Tu preparadora física puede ver tus registros y tus objetivos."*
- **Tarjetas de resumen:** el cumplimiento de las últimas 8 semanas (en `numeric`, grande), el esfuerzo promedio y la racha (*"5 rutinas seguidas"*).
- **Gráfico de barras apiladas por semana:** completadas, parciales, no completadas y sin registrar, con los colores de estado.
- **Gráfico de líneas:** el esfuerzo promedio por semana.
- **Selector de período:** 4, 8 o 12 semanas.
- **Objetivos:**
  - la lista con el texto, la fecha límite y un `StatusChip`: En curso `pending`, Vencido `overdue`, Cumplido `ok`, Abandonado neutro;
  - los botones "Cumplido", "Abandonar", "Editar" y "Reabrir", según el estado;
  - el botón "Nuevo objetivo" (Azul) con un diálogo.
- **Sin datos:** `EmptyState` sobre `ParquetBackground`.

**Gráficos:** usá `@mui/x-charts`, en la versión compatible con la MUI que ya está instalada. Los colores salen del tema, no escritos a mano. Armá los dos gráficos como componentes en `components/routines/` (`ComplianceChart` y `EffortChart`), porque los reusa la vista de la preparadora.

### 2.3 Vista de la preparadora (`/routines/tracking`, `pages/routines/TrackingPage.jsx`)

- **Menú:** "Seguimiento", en el grupo Deportivo, con `routines.viewTracking`.
- **Arriba:** un selector de categoría (con la liga) y el navegador de semanas.
- **Una grilla:**
  - una fila por jugadora y una columna por rutina de la semana;
  - cada celda con el ícono del estado y el esfuerzo ("✓ 4");
  - al pasar o tocar, la nota;
  - al final de cada fila, el cumplimiento de esa semana.
  - En el celular, una tarjeta por jugadora.
- **Al tocar una jugadora:** su progreso, con los mismos gráficos y sus objetivos en solo lectura, en un `Drawer`.

### 2.4 Panel de la Jugadora (`PlayerHome`)

En el bloque "Rutina de la semana":
- si la rutina de hoy (o una de los días anteriores dentro de la ventana) no está registrada: un link **"Registrá cómo te fue"**;
- un dato chico con el cumplimiento de la semana.

No suma botones naranjas.

## 3. Pestaña "Jugados" (historial de partidos)

### 3.1 Back

En `/games/mine`, `/games/linked` y `/games/assigned`, sumá `scope=upcoming|history` (por defecto `upcoming`, que es lo que devuelven hoy).

1. **Qué entra en `history`:** los partidos Jugados y Cancelados, y los Programados con la fecha ya pasada (todavía sin marcar).
   - Del más nuevo al más viejo, paginados de a 20.
   - Filtros: `season` (por defecto la actual), `categoryId` e `includeCancelled` (por defecto `true`).
2. **Cada partido trae:**
   - fecha, rival, local o visitante, la categoría y la liga, y el estado;
   - el resultado del P19 (`ownScore`, `rivalScore`, `setScores` y `outcome`), si tiene;
   - **para la Jugadora y la Familia:**
     - el estado de **su citación** en ese partido (Confirmada, Confirmada automáticamente, Rechazada con la justificación, Cancelada o "No citada");
     - si tuvo `conflict.notPlaying`;
   - **para la Entrenadora:** el resumen de citaciones del partido (citadas, confirmadas, rechazadas y canceladas).

### 3.2 Front

En "Mis partidos" (Jugadora), en los partidos de las jugadoras vinculadas (Familia) y en el fixture de la Entrenadora, dos pestañas: **"Próximos"** (lo que se ve hoy) y **"Jugados"**.

**La pestaña "Jugados":**
1. **Arriba:** la `CampaignCard` de la categoría elegida (P19), con selectores de temporada y de categoría.
2. **La lista:** una tarjeta por partido, con:
   - la fecha y la hora en `numeric`;
   - el rival, Local o Visitante;
   - **el resultado**, grande, con el chip Ganado o Perdido y los sets en chico;
   - si fue cancelado: `StatusChip` `overdue` "Cancelado";
   - si está Programado con la fecha pasada: "Resultado pendiente";
   - **Jugadora y Familia:** su citación con su chip ("Confirmada", "Rechazada: {justificación}", "No citada") y, si corresponde, *"No jugaste este partido (conflicto de horario)"*. En la Familia, el texto va en tercera persona;
   - **Entrenadora:** el resumen de citaciones ("12 citadas · 10 confirmadas · 1 rechazada").
3. **Filtros:** el interruptor "Mostrar cancelados" y la paginación.
4. **Sin partidos:** `EmptyState` con *"Todavía no hay partidos jugados esta temporada."*

La pestaña elegida se guarda en la URL (`?tab=jugados`), así se puede compartir el link y volver con "Atrás".

## 4. Datos de la demo

Actualizá `seed/data/demo.js` y `seed/demo.js`:
1. **Registros de cumplimiento** de las rutinas de las semanas cargadas (P18: la actual y las dos anteriores), con fechas de hoy o anteriores:
   - **Camila:** casi todas Completadas, con esfuerzos de 3 a 5, alguna Parcial con nota y una No completada (*"Tenía parcial de la facu."*). **La rutina de hoy (o la última de la semana) sin registrar**, para hacerlo en vivo;
   - **Sofía y Martina:** cumplimiento medio, con alguna sin registrar;
   - **Valentina** y algunas de relleno, con pocos registros;
   - el resto, sin registros.
2. **Objetivos de Camila:**
   - En curso: *"Mejorar la recepción en el saque flotado"*, con fecha en 3 semanas;
   - En curso y **vencido**: *"Llegar a 50 saltos al cajón por serie"*, con fecha de hace 2 días;
   - Cumplido: *"Completar todas las rutinas de la pretemporada"*.
3. **Objetivos de Sofía:** uno En curso.
4. **Todo con los modelos y en la misma transacción,** como el resto del script. Los registros respetan la regla del índice único, pero **no** pasan por la ventana de 7 días (son datos cargados, no registrados por la jugadora).
5. **Actualizá `docs/demo-usuarios.md`:** en la lista de lo que queda listo para hacer en vivo, sumá:
   - *"Registrar la rutina del día como Camila y ver Mi progreso"*;
   - *"Ver el seguimiento de Sub-18 como Valeria (Preparadora física)"*;
   - *"Ver la pestaña Jugados como Camila, como Gabriela (Familia) y como Carla (Entrenadora)"*.

## 5. Con la demo publicada

Este prompt **no cambia columnas de tablas existentes:** solo suma tablas y permisos.
1. **Tablas:** comprobá que `sync()` en producción (sin `force` ni `alter`) crea las tablas que faltan al arrancar. Si es así, alcanza con integrar a `main` y Render las crea al publicar.
2. **Permisos:** hay que correr `npm run seed` contra Railway (con `.env.railway.local`, como dice `docs/deploy.md`, paso 7), así se crean los dos permisos nuevos y se les asignan a Jugadora y Preparadora física (regla 0.5).

Agregá a `docs/deploy.md`, sección 11, un apartado **"Si el cambio solo suma tablas o permisos"** con esos dos pasos y el orden:
1. integrar a `main` y esperar que Render diga *Live*;
2. correr `npm run seed` contra Railway;
3. verificar la integridad desde la demo.

## 6. Casos de prueba documentados

### `docs/pruebas/routines.txt`

- registrar una rutina de hoy, de hace 3 días y de hace 8 (rechazada);
- registrar una rutina de mañana (rechazada);
- registrar Completada sin esfuerzo (rechazada);
- registrar No completada con esfuerzo (rechazada);
- editar un registro;
- registrar una rutina de una categoría que no es suya (404);
- borrar una rutina ya registrada (409);
- crear, editar, cumplir, abandonar y reabrir un objetivo (al reabrir uno vencido, pide una fecha);
- el objetivo número 11 en curso (rechazado);
- el progreso con números calculados a mano;
- la preparadora ve su categoría y no la de otra (404);
- la entrenadora y la Familia no tienen acceso al seguimiento (403).

### `docs/pruebas/games.txt`

- la pestaña Jugados para cada rol, con un cancelado, uno sin resultado y uno con conflicto;
- el filtro de cancelados y por temporada.

### `docs/pruebas/access.txt`

- correr el seed sobre una base con datos: los permisos nuevos se asignan a Jugadora y Preparadora física;
- un permiso que el Admin le quitó a un rol base no vuelve al correr el seed de nuevo.

## 7. Documentación del repo

- **No modifiques `CLAUDE.md` ni `docs/contexto.md`:** ya vienen con estas reglas. Si ves que no las incluyen, avisame.
- **Sí modificá `docs/deploy.md`** (punto 5) **y `docs/demo-usuarios.md`** (punto 4.5).

## 8. Verificación

### 8.1 Back

Con un script temporal **fuera del repo**, contra la base **local**:

1. **Modelos:**
   - las tablas se crean al arrancar, sin recrear la base;
   - el índice único funciona;
   - las dos tablas están en `CLUB_TABLES` (backup y restore de prueba dentro de una transacción con `rollback` las incluyen);
   - la integridad da correcta.
2. **Seed y permisos:**
   - con la base actual, `npm run seed` crea los dos permisos y se los asigna a los roles base;
   - quitale `routines.trackOwn` a Jugadora, corré el seed de nuevo y comprobá que **no** vuelve;
   - devolvéselo al final.
3. **Reglas:** de 1.1 y 1.2, incluida la ventana con fechas en el borde (el día 7 sí, el 8 no, en hora de Argentina).
4. **Progreso:** con una jugadora de prueba, los números de 1.3 coinciden con un cálculo a mano, incluida la racha con una rutina sin registrar dentro de la ventana.
5. **Alcance:**
   - una jugadora no puede ver ni editar los objetivos de otra (404);
   - la preparadora no ve jugadoras de categorías que no son suyas (404);
   - la entrenadora con `GET /routines/tracking` → 403.
6. **Historial:** `scope=history` para los tres roles, con cancelados, Programados pasados y el filtro `includeCancelled=false`; la citación de la jugadora y el resumen de la entrenadora coinciden.
7. **Demo:** `npm run seed:demo -- --reset` corre sin errores y deja los registros y objetivos del punto 4. El único conflicto sigue siendo el de Camila.
8. **Integridad:** la verificación de DVH/DVV da todo correcto.

### 8.2 Front

1. `npm run build` compila sin errores. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano:
   - **Camila:** registrar la rutina, ver Mi progreso y manejar los objetivos;
   - **Valeria como preparadora:** ver el seguimiento;
   - **la pestaña Jugados** como Camila, Gabriela y Carla;
   - todo en el celular.

### 8.3 Cierre

1. **Actualizá `docs/TODO.md`:**
   - en la Fase 4, sumá y marcá *"Seguimiento personal de la jugadora: cumplimiento, objetivos y progreso (P20)"* y *"Historial de partidos jugados para Jugadora, Entrenadora y Familia (P20)"*;
   - en la Fase 7, sumá sin marcar *"Correr `npm run seed` en Railway después de integrar el P20 (permisos nuevos)"*.

   Agregá la línea al Registro.
2. Mostrame el resultado de la verificación, cómo quedó la regla de permisos nuevos en el seed, si `sync()` en producción crea las tablas nuevas, y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
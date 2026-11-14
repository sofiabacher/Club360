# Prompt 19 — Resultados de los partidos y campaña por categoría

Vas a sumar los resultados de los partidos y la **campaña** de cada categoría: partidos jugados, ganados y perdidos, sets y puntos a favor y en contra, y la racha. Es la "prioridad 1 si queda tiempo" del contexto, que ahora entra al MVP.

Antes de empezar:
- leé `CLAUDE.md`, sobre todo "Partidos y conflictos", "Panel de inicio", "Datos de la demo" y "Deploy de la demo";
- leé la sección 6 de `docs/contexto.md` ("Resultados de los partidos");
- mirá cómo quedaron hoy:
  - el endpoint y el diálogo para **marcar un partido como Jugado** (P11);
  - las vistas de partidos de cada rol (`/games`, `/games/assigned`, `/games/mine`, `/games/linked`);
  - `PlayerHome` y `FamilyHome` (P15);
  - `seed/data/demo.js` (P18);
  - `docs/deploy.md`.

**Alcance:**
- **Se hace:** el cambio en el modelo, la carga y la corrección del resultado, la campaña, los resultados en las vistas de partidos, el panel de inicio del Representante, los resultados en los datos de la demo, la receta para cambiar el modelo con la demo publicada, los casos de prueba y la verificación.
- **No se hace:**
  - la tabla de posiciones del torneo: no se cargan los partidos entre otros equipos;
  - estadísticas por jugadora;
  - avisos por el resultado.
- **No** hagas commit.

## 0. Cambio en el modelo `Game`

Sumá tres campos, todos `allowNull: true`:

| Campo | Tipo | Qué guarda |
|---|---|---|
| `ownScore` | `TINYINT` | Sets ganados por el club |
| `rivalScore` | `TINYINT` | Sets ganados por el rival |
| `setScores` | `JSON` | El detalle de los puntos de cada set, en orden: `[{ "own": 25, "rival": 20 }, { "own": 23, "rival": 25 }, ...]`. Es opcional: puede haber resultado en sets sin detalle de puntos |

- **Sin resultado:** los tres en `NULL`. Así quedan los partidos Programados, los Cancelados y los Jugados de antes de este prompt.
- **Integridad:** el DVH ya normaliza JSON con las claves ordenadas (`utils/integrity.js`). Comprobá que `setScores` entre en el DVH igual al guardar y al verificar.
- **Cómo aplicarlo en tu base local:** `db:snapshot`, recrear y `db:restore`, como siempre. Avisame antes de recrear la base y esperá mi confirmación.

## 1. Reglas del resultado

### 1.1 Validación

Una función `validateResult({ ownScore, rivalScore, setScores })` en `games.service.js`. El validator solo controla el formato; las reglas van en el service.

1. **Sets:** el resultado tiene que ser uno de un partido de vóley terminado:
   - **al mejor de 5:** 3-0, 3-1, 3-2 o al revés;
   - **al mejor de 3:** 2-0, 2-1 o al revés.

   No hay empates. Si no: 400, *"El resultado no es válido: un partido de vóley termina 3-0, 3-1, 3-2, 2-0 o 2-1."*
2. **Puntos de cada set** (si vienen):
   - tiene que haber **exactamente** `ownScore + rivalScore` sets;
   - cada set tiene un ganador, con al menos 2 puntos de diferencia;
   - los puntos van de 0 a 99;
   - cada equipo gana tantos sets como dice su resultado;
   - el set decisivo puede ser a 15. No valides el mínimo de 25 o 15 puntos: algunas categorías juegan sets más cortos.

   Si no se cumple: 400 con el motivo, por ejemplo *"El set 3 no tiene ganador: tiene que haber al menos 2 puntos de diferencia."*
3. Constante nueva en `utils/constants.js` (api y client): `VALID_SET_RESULTS`, con los cinco resultados válidos del ganador.

### 1.2 Cuándo se carga y quién lo corrige

1. **Al marcar como Jugado** (endpoint del P11), el resultado pasa a ser **obligatorio**: el body suma `ownScore`, `rivalScore` y `setScores?`. Sigue valiendo la regla del P11 de que solo se marca después de la fecha del partido.
2. **Corregir o cargar después:** `PUT /games/:id/result` (`games.manage`, con el alcance de `getLeagueScope`):
   - solo para partidos **Jugados**;
   - sirve para corregir un error y para cargarles el resultado a los que se marcaron como Jugados antes de este prompt;
   - en Programados o Cancelados: 400, *"Solo se carga el resultado de un partido jugado."*
3. **Bitácora:** `GAME_RESULT_SAVED` (criticidad Baja) al marcar como Jugado con resultado, y `GAME_RESULT_UPDATED` (criticidad Media) al corregirlo, con el resultado anterior y el nuevo en el detalle.
4. **Sin avisos:** cargar o corregir un resultado no notifica a nadie (no está en la tabla de canales del contexto).

### 1.3 Campaña

Una función `getCampaign(categoryId, season)` en `games.service.js`, calculada siempre sobre los partidos **Jugados con resultado** de esa categoría y temporada (no se guarda). Devuelve:
- **partidos:** jugados, ganados y perdidos, y el porcentaje de victorias;
- **sets:** a favor, en contra y la diferencia;
- **puntos:** a favor y en contra, sumados solo de los partidos que tienen detalle, y en cuántos partidos hay detalle (para mostrar *"puntos de 4 de 6 partidos"*);
- **local y visitante:** ganados y perdidos de cada uno;
- **racha:** los últimos 5 resultados, del más nuevo al más viejo (`W` o `L`);
- **último partido:** fecha, rival, local o visitante, y el resultado con el detalle de los sets.

Los partidos Jugados sin resultado no cuentan: devolvé también cuántos hay, así el Representante sabe que le faltan cargar.

### 1.4 Endpoints

| Método y ruta | Permiso | Qué hace |
|---|---|---|
| `PUT /games/:id/result` | `games.manage` | Punto 1.2.2 |
| `GET /games/campaign?categoryId=&season=` | `games.manage`, `games.viewAssigned`, `games.viewOwn` o `games.viewLinked` | La campaña de una categoría. Sin `season`, la del año actual. Cada permiso con su alcance: `games.manage` con `getLeagueScope`, `viewAssigned` con las categorías del staff, `viewOwn` con las de la jugadora y `viewLinked` con las de sus jugadoras vinculadas. Fuera del alcance: 404 |

- Las respuestas de `/games`, `/games/assigned`, `/games/mine` y `/games/linked` suman `ownScore`, `rivalScore`, `setScores` y un campo calculado `outcome` (`W`, `L` o `null`).
- `/games/mine` y `/games/linked` traen también, por categoría, un resumen corto de la campaña (jugados, ganados y perdidos), para el panel de inicio sin otra llamada.

## 2. Front

### 2.1 Cargar el resultado (`components/games/GameResultForm.jsx`)

Un componente común para el diálogo de "Marcar como Jugado" y para "Cargar o corregir resultado":
- **Los sets** con dos selectores grandes, en la variante `numeric` ("Valencia **3** – **1** Atlético Ribera"). Solo se pueden elegir los resultados de `VALID_SET_RESULTS`: por ejemplo, con 3 en un lado, el otro va de 0 a 2.
- **"Agregar los puntos de cada set"** (opcional, plegado): al abrirlo, aparecen tantas filas como sets se jugaron, cada una con dos campos numéricos. Las filas se marcan en verde o rojo según quién ganó el set, y la validación del punto 1.1.2 se muestra en vivo debajo de cada fila.
- El botón principal (naranja): "Marcar como jugado" o "Guardar resultado".

### 2.2 Resultados en las vistas de partidos

En todas las listas y tarjetas de partidos (Representante, Entrenadora, Jugadora y Familia):
- **un partido Jugado con resultado** muestra el resultado en la variante `numeric` ("3 – 1"), con un chip **Ganado** (`ok`) o **Perdido** (`overdue`), y, si hay detalle, los sets en chico ("25-20 · 23-25 · 25-18 · 25-21");
- **un Jugado sin resultado:** "Sin resultado". En la vista del Representante, con un botón "Cargar resultado".

Filtro nuevo en la lista del Representante: **"Jugados sin resultado"**.

### 2.3 Campaña (`components/games/CampaignCard.jsx`)

Una tarjeta con:
- el nombre de la categoría y de la liga, y la temporada;
- **ganados – perdidos** grandes en `numeric` ("**7** – **3**"), con el porcentaje de victorias;
- la **racha** en cinco círculos chicos: verde con "G" o rojo con "P", del más nuevo al más viejo;
- los sets y los puntos a favor y en contra, y local y visitante, en una fila de datos chicos;
- **el último partido,** con el resultado (como en el moodboard: "**3 - 1** SÁB 25/10 · 18:30");
- sin partidos jugados con resultado: *"Todavía no hay partidos jugados esta temporada."*

**Dónde aparece:**
1. **Panel de la Jugadora** (`PlayerHome`): debajo del próximo partido de cada categoría, la `CampaignCard` de esa categoría, en versión compacta (ganados – perdidos, la racha y el último resultado).
2. **Panel de la Familia** (`FamilyHome`): en la tarjeta de cada jugadora, una línea con el último resultado y ganados – perdidos.
3. **Fixture de la Jugadora y de la Entrenadora:** arriba de la lista de partidos de cada categoría, la `CampaignCard` completa.
4. **Panel del Representante** (punto 2.4).

### 2.4 Panel de inicio del Representante (`components/home/RepresentativeHome.jsx`)

`HomePage` suma un caso, **por permisos**: con `games.manage` y `inscriptions.approve` → `RepresentativeHome`, evaluado después de Jugadora y Familia.

1. **Encabezado:** "Hola, {nombre}" y la frase más urgente, en este orden:
   1. *"Tenés {n} inscripciones pendientes."*;
   2. *"Hay {n} partidos jugados sin resultado."*;
   3. *"Hay {n} conflictos de horario sin resolver."*;
   4. si no hay nada de eso: *"Todo al día."*

   Usá los endpoints que ya existen (inscripciones pendientes, partidos y conflictos). Cada bloque carga y falla por separado, como en el P15.
2. **Pendientes:** tres tarjetas chicas con la cantidad y un link: inscripciones por aprobar, partidos sin resultado (abre la lista con ese filtro) y conflictos sin resolver.
3. **Campaña de cada categoría** de su alcance: una `CampaignCard` por categoría, agrupadas por liga.
4. **Próximos partidos:** los próximos 5 de su deporte.
5. **Accesos rápidos,** debajo, como en los otros paneles.

**Botón naranja:** solo "Cargar resultado" si hay partidos sin resultado; si no, ninguno.

## 3. Datos de la demo

Actualizá `seed/data/demo.js` (y lo que haga falta en `seed/demo.js`):
1. **Los partidos Jugados de H-14 y H-7** (las tres categorías) cargan su resultado, con la regla 1.1:
   - Mayores: uno ganado 3-1 y otro perdido 1-3;
   - Sub-18: uno ganado 3-0 y otro ganado 3-2;
   - Sub-16: al mejor de 3, uno ganado 2-1 y otro perdido 0-2.

   Todos con el detalle de puntos, **salvo uno** de Sub-16 (para mostrar que es opcional). Con puntos realistas: sets a 25 y el decisivo a 15.
2. **Sumá 4 partidos Jugados más por categoría,** entre H-60 y H-21, con resultados variados, así la campaña y la racha tienen datos. Sin citaciones (son viejos), con los rivales inventados de siempre.
3. **Dejá un partido Jugado sin resultado** (Mayores, H-21), para cargarlo en vivo como Representante.
4. Revisá que los partidos nuevos no generen conflictos de horario (el único sigue siendo el de Camila) y que el script siga corriendo en una sola transacción.
5. **Actualizá `docs/demo-usuarios.md`:** en la lista de lo que queda listo para hacer en vivo, sumá *"Cargar el resultado del partido de Mayores sin resultado (Representante) y ver cómo cambia la campaña en el inicio de Camila"*.

## 4. Cambiar el modelo con la demo publicada

Este es el primer cambio en el modelo después del deploy: la base de Railway no tiene las columnas nuevas. **Render no las crea solo**, porque en producción `sync()` no altera tablas. Hasta que se apliquen, el código nuevo de Render falla al consultar `game`.

### 4.1 Seguridad de los scripts contra una base remota

En `db:snapshot` y `db:restore`, y en el arranque con `DB_FORCE_SYNC=true`:
- **antes de hacer nada,** mostrar el host y el nombre de la base (sin usuario ni contraseña);
- **si el host no es `localhost` ni `127.0.0.1`,** pedir confirmación por consola escribiendo el nombre de la base. Así nadie recrea la base de la demo sin darse cuenta.

Revisá cómo quedó implementado el bloqueo de `DB_FORCE_SYNC` en producción (P17): contra Railway desde una compu, `NODE_ENV` no es `production`. Si ese bloqueo depende solo de `NODE_ENV`, sumá la confirmación de arriba y contame cómo quedó.

### 4.2 Receta en `docs/deploy.md`

Sumá la sección **"11. Cambios en el modelo con la demo publicada"**, en este orden. El orden importa: la base se actualiza **antes** de que Render tenga el código nuevo. El código viejo funciona con columnas de más; el nuevo no funciona con columnas de menos.

1. **Antes de integrar la rama a `main`** (así Render sigue con el código viejo), en la compu, con el código de la rama y el `.env` apuntando a Railway como en el paso 7 (la misma `ENCRYPTION_KEY` que Render):
   1. `npm run db:snapshot`: guarda los datos de la demo;
   2. `DB_FORCE_SYNC=true` y `npm run dev`, con la confirmación del punto 4.1. Cuando termina de arrancar, cortalo y volvé a `false`;
   3. `npm run db:restore`.
   4. **Alternativa** si los datos de la demo no importan (por ejemplo, después de los ensayos): en lugar de restaurar, `npm run seed` y `npm run seed:demo`.
2. Volvé a dejar el `.env` local como estaba.
3. **Integrá la rama a `main`:** Render y Vercel se actualizan solos.
4. Entrá a la demo con el Admin y verificá la integridad.

Sumá también en la tabla del punto 10 ("Si algo falla"): *"Errores `Unknown column` en los logs de Render después de un deploy → falta aplicar el cambio en el modelo en Railway (sección 11)"*.

## 5. Casos de prueba documentados

En `docs/pruebas/games.txt`:
- marcar como Jugado con un resultado válido, con y sin puntos;
- marcar como Jugado sin resultado (rechazado);
- un resultado inválido: 3-3, 4-1, 2-2 (rechazado);
- puntos que no coinciden con los sets (rechazado);
- un set sin 2 puntos de diferencia (rechazado);
- corregir un resultado (queda en la bitácora con el anterior);
- cargar el resultado de un partido Programado (rechazado);
- la campaña con partidos sin resultado (no cuentan, y se informa cuántos hay);
- la campaña desde cada rol, y fuera del alcance (404);
- el panel del Representante con cada pendiente.

## 6. Documentación del repo

- **No modifiques `CLAUDE.md` ni `docs/contexto.md`:** ya vienen con estas reglas. Si ves que no las incluyen, avisame.
- **Sí modificá `docs/deploy.md`** (punto 4.2) **y `docs/demo-usuarios.md`** (punto 3.5).

## 7. Verificación

### 7.1 Back

Con un script temporal **fuera del repo**, contra la base **local**:

1. **Modelo:** después del restore, las columnas existen, los partidos viejos quedan con `NULL` y la integridad da correcta.
2. **Validación:** los cinco resultados válidos y sus inversos pasan; 3-3, 4-0, 1-0 y 2-2 no; los puntos que no coinciden con los sets no; un set 25-24 no.
3. **Marcar y corregir:** marcar como Jugado exige el resultado; corregirlo deja la bitácora con el anterior; corregir uno Programado da 400.
4. **Campaña:** con una categoría de prueba con 4 partidos (3 ganados y 1 perdido, uno sin detalle de puntos y un Jugado sin resultado), los números coinciden a mano: jugados 4, ganados 3, sets, puntos de 3 partidos, racha en orden y 1 sin resultado.
5. **Alcance:** la jugadora pide la campaña de una categoría que no es suya → 404; la Familia, la de su jugadora → 200.
6. **Demo:** `npm run seed:demo -- --reset` corre sin errores, la campaña de cada categoría da lo esperado y el único conflicto sigue siendo el de Camila.
7. **Scripts contra una base remota:** con un `DATABASE_URL` de prueba que no sea local (podés usar un host inventado y comprobar que **pide la confirmación antes de intentar conectarse**), `db:snapshot`, `db:restore` y `DB_FORCE_SYNC` frenan y piden confirmación.
8. **Integridad:** la verificación de DVH/DVV da todo correcto.

### 7.2 Front

1. `npm run build` compila sin errores. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano:
   - **como Representante:** marcar un partido como Jugado con los puntos, corregirlo y ver el panel;
   - **como Camila:** la campaña en el inicio y en el fixture;
   - **como Gabriela (Familia):** la línea de resultados de sus dos jugadoras;
   - **como entrenadora:** la campaña en el fixture;
   - todo en el celular.

### 7.3 Cierre

1. **Actualizá `docs/TODO.md`:**
   - en la Fase 4, sumá y marcá *"Resultados de los partidos y campaña por categoría (P19)"* y *"Panel de inicio del Representante (P19)"*;
   - en la Fase 7, sumá sin marcar *"Aplicar el cambio en el modelo del P19 en Railway (`docs/deploy.md`, sección 11) antes de integrar a `main`"*.

   Agregá la línea al Registro.
2. Mostrame el resultado de la verificación, cómo quedó el bloqueo de `DB_FORCE_SYNC` contra una base remota y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
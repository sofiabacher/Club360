# Prompt 09 — Ligas, categorías y asignación de jugadoras y staff

Vas a implementar el módulo `leagues`:
- las ligas y sus categorías, con las **escalas de edad del vóley**;
- la asignación de jugadoras y de staff (entrenadoras y preparadoras físicas) a cada categoría;
- la vista "Mis categorías" del staff.

Es la base de partidos, citaciones y rutinas. Antes de empezar, leé `CLAUDE.md` (sobre todo "Ligas y categorías", "Staff y vínculo familiar" y "Diseño visual") y las secciones 3.3, 4, 6 y 8 de `docs/contexto.md`.

**Alcance:**
- **Se hace:**
  - ligas y categorías: crear, modificar y dar de baja;
  - asignar y quitar jugadoras y staff en las categorías;
  - "Mis categorías" para la Entrenadora y la Preparadora física;
  - funciones auxiliares para los módulos que vienen;
  - casos de prueba.
- **También se hace:** un cambio chico en el modelo (`league.ageScale` y `category.ageGroup`, punto 0).
- **No se hace:**
  - partidos (P11);
  - inscripciones (más adelante; para las pruebas, las inscripciones aprobadas se crean con el script);
  - notificaciones: asignar a una categoría no figura en la tabla de canales del contexto.
- **No** hagas commit.

## 0. Escalas de edad (cambio en el modelo)

En el vóley, las categorías van por edad, y hay dos escalas en uso. **Cada liga elige una escala** y sus categorías se eligen de esa lista.

### 0.1 Constante `AGE_SCALES` (`api/src/utils/constants.js`, replicada en `client/src/utils/constants.js`)

```js
AGE_SCALES = {
  1: [ { code: 'SUB11', label: 'Sub-11', maxAge: 11 }, { code: 'SUB12', label: 'Sub-12', maxAge: 12 },
       { code: 'SUB13', label: 'Sub-13', maxAge: 13 }, { code: 'SUB15', label: 'Sub-15', maxAge: 15 },
       { code: 'SUB16', label: 'Sub-16', maxAge: 16 }, { code: 'SUB18', label: 'Sub-18', maxAge: 18 },
       { code: 'SUB21', label: 'Sub-21', maxAge: 21 }, { code: 'MAYORES', label: 'Mayores', maxAge: null } ],
  2: [ { code: 'SUB13', label: 'Sub-13', maxAge: 13 }, { code: 'SUB15', label: 'Sub-15', maxAge: 15 },
       { code: 'SUB17', label: 'Sub-17', maxAge: 17 }, { code: 'SUB20', label: 'Sub-20', maxAge: 20 },
       { code: 'SUB23', label: 'Sub-23', maxAge: 23 }, { code: 'MAYORES', label: 'Mayores', maxAge: null } ]
}
```

Agregá también una etiqueta para mostrar cada escala, por ejemplo *"Escala 1: Sub-11 a Sub-21 y Mayores"*.

### 0.2 Modelo

- **`League`:** suma `ageScale`, `TINYINT`, `allowNull: false`, con valor 1 o 2.
- **`Category`:** suma `ageGroup`, `STRING(10)`, `allowNull: false`, con un `code` de la escala de su liga.
- Agregá comentarios en los dos modelos que remitan a `AGE_SCALES`.

### 0.3 Edad de temporada y regla de edad

- **Edad de temporada:** año calendario en curso − año de nacimiento. No importa si ya cumplió años en el año. En 2026, alguien nacido en 2008 tiene 18 todo el año. Agregá `getSeasonAge(birthDate, year)` en `utils/dates.js`; por defecto, `year` es el año actual en la zona horaria de Argentina.
- **Regla de edad:** una jugadora puede estar en una categoría si su edad de temporada es **menor o igual** al `maxAge` del grupo. Las más chicas pueden jugar en una categoría superior. En **Mayores**, cualquiera.
- **Cambio de año:** si una jugadora ya asignada supera la edad de su categoría (por ejemplo, al empezar un año nuevo), **no** se la quita sola. En los listados aparece con un chip "Supera la edad" (`overdue`), para que el Representante la reasigne.

### 0.4 Base local

Como cambian dos tablas, recreá la base igual que en el P07: `DB_FORCE_SYNC=true`, `npm run dev`, volver a `false` y `npm run seed`. Avisame antes y esperá mi confirmación. No uses `DB_ALTER_SYNC`, porque en MySQL puede duplicar índices.

## 1. Reglas

1. **Estructura:** una liga pertenece a un deporte del club (`league.clubSportId`) y tiene categorías (`category.leagueId`). Las jugadoras y el staff se asignan a las **categorías**, no a la liga.
2. **Alcance del Representante:** un usuario con permisos de `leagues` que es staff activo trabaja **solo** con las ligas del deporte de su registro `staff` (`staff.clubSportId`). Un usuario con esos permisos que no es staff (por ejemplo, con un rol creado por el Admin o con un permiso directo) ve todas las ligas de su club. Implementalo una sola vez en `getLeagueScope(user)` dentro de `leagues.service.js` y aplicalo en todas las consultas. Si una liga queda fuera del alcance: 404.
3. **Baja de ligas y categorías:** es lógica (`isActive = false`), como el resto del sistema.
   - Dar de baja una liga da de baja también sus categorías.
   - Una categoría dada de baja no acepta asignaciones nuevas y deja de aparecer en "Mis categorías", pero conserva su historial.
   - Se pueden reactivar. Reactivar una liga **no** reactiva sus categorías solas.
   - Los nombres son únicos entre las activas: no puede haber dos ligas activas con el mismo nombre en el mismo deporte, ni dos categorías activas con el mismo nombre en la misma liga (409).
4. **Jugadoras que se pueden asignar:** socias con `member` en estado ACTIVE o SUSPENDED (la mora no impide jugar, solo ser citada), con una **inscripción Aprobada en el deporte de la liga** y que **cumplen la regla de edad** de la categoría (punto 0.3).
   - No hace falta que tenga el rol Jugadora como condición aparte, porque la inscripción aprobada ya se lo da.
   - Una jugadora **puede estar en más de una categoría**, incluso de distintas ligas. Es justamente el caso que genera superposiciones de horario.
5. **Staff que se puede asignar:** staff activo (`isActiveStaff`) con rol **Entrenadora** o **Preparadora física**, del **mismo deporte** que la liga. Una categoría puede tener varias personas de staff, y una persona puede estar en varias categorías.
6. **Quitar una asignación:** el registro de `categoryPlayer` o `categoryStaff` pasa a `isActive = false`; no se borra. Si se vuelve a asignar, vuelve a `true`.
7. **Socias y staff dados de baja:** no se quitan solas de las categorías.
   - En los listados se muestran con un chip ("Socia inactiva", "Ya no es staff") y quedan fuera de las listas para asignar.
   - Los módulos que vienen (citaciones, rutinas) las excluyen al consultar.
8. **Bitácora** (MEDIUM): `LEAGUE_CREATED`, `LEAGUE_UPDATED`, `LEAGUE_DEACTIVATED`, `LEAGUE_REACTIVATED`, `CATEGORY_CREATED`, `CATEGORY_UPDATED`, `CATEGORY_DEACTIVATED`, `CATEGORY_REACTIVATED`, `PLAYER_ASSIGNED`, `PLAYER_UNASSIGNED`, `STAFF_ASSIGNED`, `STAFF_UNASSIGNED`.

## 2. Funciones para otros módulos (`leagues.service.js`)

Creá estas funciones, que van a usar los prompts siguientes. Todas reciben `{ transaction }` opcional y filtran por club:

| Función | Qué hace | La va a usar |
|---|---|---|
| `getActivePlayersOfCategory(categoryId)` | Jugadoras asignadas y activas de la categoría, excluyendo socias INACTIVE | partidos, citaciones, rutinas, notificaciones |
| `getCategoriesOfMember(memberId)` | Categorías activas en las que está una socia, con su liga | dashboard de la Jugadora, superposiciones de horario |
| `getCategoriesOfStaff(staffId)` | Categorías activas asignadas a un staff | "Mis categorías", citaciones, rutinas |
| `isStaffAssignedToCategory(staffId, categoryId)` | Verdadero si el staff está asignado y activo en esa categoría | citaciones y rutinas (para que cada uno opere solo en sus categorías) |
| `removeMemberFromSportCategories(memberId, clubSportId)` | Quita a la socia de todas las categorías de ese deporte | baja de un deporte (contexto 3.3.1) |

## 3. Back (`modules/leagues/`)

| Método y ruta | Permiso | Qué hace |
|---|---|---|
| `GET /leagues?includeInactive=` | `leagues.manage` | Ligas del alcance, cada una con su deporte, sus categorías y, por categoría, la cantidad de jugadoras y de staff activos |
| `POST /leagues` | `leagues.manage` | `{ name, clubSportId, ageScale }`. El deporte tiene que estar activo en el club y dentro del alcance |
| `PUT /leagues/:id` | `leagues.manage` | `{ name, ageScale }`. El deporte no se cambia. La escala se puede cambiar solo si la liga todavía no tiene categorías (409 si ya tiene) |
| `POST /leagues/:id/deactivate` · `/reactivate` | `leagues.manage` | Regla 3 |
| `POST /leagues/:id/categories` | `leagues.manage` | `{ ageGroup, name }`. Crea una categoría en una liga activa. `ageGroup` tiene que ser de la escala de la liga. `name` es opcional: si no viene, se usa la etiqueta del grupo ("Sub-18"). Se pueden tener dos categorías del mismo grupo con nombres distintos ("Sub-18 A" y "Sub-18 B") |
| `PUT /leagues/categories/:id` | `leagues.manage` | `{ name }`. El grupo de edad no se cambia |
| `POST /leagues/categories/:id/deactivate` · `/reactivate` | `leagues.manage` | Regla 3. Para reactivar una categoría, su liga tiene que estar activa |
| `GET /leagues/categories/:id` | `leagues.manage`, `leagues.assignPlayers` o `leagues.assignStaff` (alcanza con uno) | Detalle: liga, deporte, grupo de edad con su edad máxima, jugadoras asignadas (nombre, número de socio, edad de temporada, estado del socio y `exceedsAge`) y staff asignado (nombre, roles de staff, si sigue siendo staff activo) |
| `GET /leagues/categories/:id/eligible-players?search=` | `leagues.assignPlayers` | Jugadoras que se pueden asignar (regla 4, incluida la edad) y todavía no están en la categoría, con su edad de temporada |
| `POST /leagues/categories/:id/players` | `leagues.assignPlayers` | `{ memberIds }`. Asigna una o varias jugadoras. Si alguna no cumple la regla 4: 400, con el nombre de la jugadora y el motivo (por ejemplo, *"Martina López supera la edad de Sub-16 (tiene 17 en 2026)."*) |
| `DELETE /leagues/categories/:id/players/:memberId` | `leagues.assignPlayers` | Quita una jugadora (regla 6) |
| `GET /leagues/categories/:id/eligible-staff` | `leagues.assignStaff` | Staff que se puede asignar (regla 5) y todavía no está en la categoría |
| `POST /leagues/categories/:id/staff` | `leagues.assignStaff` | `{ staffIds }` |
| `DELETE /leagues/categories/:id/staff/:staffId` | `leagues.assignStaff` | Quita un staff |
| `GET /leagues/my-categories` | `leagues.viewAssigned` | Categorías activas del staff logueado (`getCategoriesOfStaff`), cada una con su liga, su grupo de edad, sus jugadoras activas (nombre, edad de temporada, número de socio, estado del socio y `exceedsAge`) y el resto del staff asignado. Si el usuario no es staff, devuelve una lista vacía |

Para que un middleware acepte cualquiera de varios permisos, si `checkPermission` todavía no recibe un array, agregale esa opción (alcanza con tener uno de los permisos) sin romper el uso actual con un solo permiso.

## 4. Front

### 4.1 Ligas y categorías (`/leagues`, `pages/leagues/LeaguesPage.jsx`)

- **Encabezado:** título, el botón **"Nueva liga"** (naranja) y un switch "Mostrar dadas de baja".
- **Ligas:**
  - una tarjeta por liga, con su nombre y su deporte;
  - si está dada de baja, un chip neutro;
  - un menú con Editar, Dar de baja y Reactivar.
- **Categorías:** dentro de cada tarjeta, las categorías como filas, con:
  - el nombre;
  - "{n} jugadoras · {m} staff";
  - un chip si está dada de baja;
  - un botón para abrir el detalle.

  Al final de la lista, "Agregar categoría".
- **Diálogos:**
  - **Crear y editar liga:** nombre, deporte (ya elegido si el usuario solo tiene uno en su alcance) y escala de edad. La escala se elige con un selector que muestra la lista de cada una, y queda deshabilitada si la liga ya tiene categorías.
  - **Crear categoría:** grupo de edad (selector con los grupos de la escala de la liga, con su edad máxima: *"Sub-18 · hasta 18 años en 2026"*) y nombre, prellenado con la etiqueta del grupo.
  - **Editar categoría:** solo el nombre.
- **Grupo de edad:** cada categoría muestra el suyo como un chip.
- **Estado vacío:** si no hay ligas, `EmptyState` con *"Todavía no hay ligas. Creá la primera para empezar a organizar las categorías."*

### 4.2 Detalle de una categoría (`/leagues/categories/:id`, `pages/leagues/CategoryDetailPage.jsx`)

- **Encabezado:** el nombre de la categoría, la liga y el deporte.
- **Pestaña "Jugadoras"** (si tiene `leagues.assignPlayers`, o solo para ver si tiene `leagues.manage`):
  - la lista de jugadoras asignadas: nombre, número de socio en la variante `numeric`, edad de temporada y estado;
  - estado con `StatusChip`: Suspendida (`urgent`), "Socia inactiva" (neutro) y "Supera la edad" (`overdue`);
  - el botón "Quitar" en cada una, con confirmación;
  - el botón "Agregar jugadoras": abre un diálogo con buscador y casillas sobre `eligible-players`, para agregar varias de una vez, con la edad de temporada de cada una. Arriba del diálogo, una nota: *"Solo aparecen las jugadoras de hasta {maxAge} años en {año}."* (o *"Mayores: todas las edades"*).
- **Pestaña "Staff"** (igual, con `leagues.assignStaff`):
  - el staff asignado, con sus roles como chips y un chip "Ya no es staff" si corresponde;
  - el botón "Agregar staff", con la lista de `eligible-staff`.
- **Estado vacío** en cada pestaña.

### 4.3 Mis categorías (`/my-categories`, `pages/leagues/MyCategoriesPage.jsx`)

- **Una tarjeta por categoría asignada,** con:
  - el nombre y la liga;
  - el grupo de edad;
  - la lista de jugadoras: nombre, edad de temporada, número de socio y estado. Las suspendidas por mora llevan un `StatusChip` `urgent` "Mora", como aviso para cuando se generen citaciones. Las que superan la edad llevan "Supera la edad";
  - el resto del staff de la categoría.
- **Si no tiene categorías:** `EmptyState` con *"Todavía no tenés categorías asignadas. El Representante del deporte te las va a asignar."*

### 4.4 Rutas y llamadas

- `/leagues` y `/my-categories` ya están en `navigation/menu.js`: reemplazá su `ComingSoonPage`.
- Agregá a `AppRouter` la ruta `/leagues/categories/:id`, habilitada con cualquiera de los permisos `leagues.manage`, `leagues.assignPlayers` o `leagues.assignStaff`.
- Agregá las llamadas en `client/src/api/leagues.api.js`.

## 5. Casos de prueba documentados

Creá `docs/pruebas/leagues.txt` con el formato de `CLAUDE.md`. Como mínimo:
- crear una liga con la escala 1 y otra con la escala 2;
- crear una categoría con un grupo de otra escala (rechazada);
- cambiar la escala de una liga con categorías (rechazado);
- asignar una jugadora más chica a una categoría superior (aceptada);
- asignar una jugadora que supera la edad (rechazada, con el motivo);
- asignar a Mayores a una jugadora de cualquier edad;
- una jugadora asignada que pasa a superar la edad al cambiar el año (aparece marcada);
- crear una liga con un nombre repetido;
- crear una liga en un deporte inactivo;
- dar de baja una liga y que se den de baja sus categorías;
- reactivar;
- crear una categoría en una liga dada de baja;
- asignar una jugadora con inscripción aprobada;
- asignar una socia sin inscripción (rechazada);
- asignar una socia inactiva (rechazada);
- asignar una socia suspendida (aceptada);
- la misma jugadora en dos categorías de ligas distintas;
- asignar una entrenadora del deporte;
- asignar a un Representante como staff de categoría (rechazado: solo Entrenadora o Preparadora física);
- quitar y volver a asignar;
- un Representante que no ve las ligas de otro deporte;
- "Mis categorías" de una entrenadora;
- "Mis categorías" de un staff sin categorías.

## 6. Documentación del repo

No modifiques `CLAUDE.md` ni `docs/contexto.md`: ya vienen con estas reglas. Si ves que no las incluyen, avisame.

## 7. Verificación

### 7.1 Back

Hacelo con un script temporal **fuera del repo**, con datos de prueba creados con los modelos:
- un deporte extra activado en el club;
- un Representante de Vóley y uno del otro deporte;
- una entrenadora y una preparadora física de Vóley;
- socias con y sin inscripción Aprobada en Vóley, una suspendida y una inactiva.

Borralos al final, salvo los que necesites para los casos documentados.

0. **Escalas y edad:**
   - `getSeasonAge` da 18 para alguien nacido en 2008, con el año 2026, tanto en enero como en diciembre;
   - una categoría con un `ageGroup` de otra escala → 400;
   - cambiar la escala de una liga con categorías → 409;
   - en Sub-16, una jugadora de 15 → OK, una de 16 → OK, una de 17 → 400 con el motivo;
   - en Mayores, una de 14 → OK;
   - `eligible-players` no devuelve a las que superan la edad;
   - llamando a `getSeasonAge` con el año siguiente, la de 16 asignada a Sub-16 aparece con `exceedsAge = true`.
1. **Ligas y categorías:**
   - crear, editar, dar de baja (con cascada a las categorías) y reactivar;
   - nombres repetidos → 409;
   - deporte inactivo → 400.
2. **Alcance:** el Representante del otro deporte no ve ni edita las ligas de Vóley (404). Un usuario con `leagues.manage` por permiso directo y sin staff ve todas.
3. **Jugadoras:**
   - la regla 4 en los cuatro casos (aprobada, sin inscripción, inactiva y suspendida);
   - una jugadora en dos categorías;
   - quitar y volver a asignar reutiliza el registro.
4. **Staff:**
   - entrenadora y preparadora de Vóley → OK;
   - staff del otro deporte → 400;
   - Representante → 400;
   - ex staff → no aparece en `eligible-staff`.
5. **Funciones auxiliares:** probá las cinco. `removeMemberFromSportCategories` deja a la socia fuera de las categorías de Vóley y dentro de las del otro deporte.
6. **Mis categorías:** una entrenadora asignada a dos categorías ve las dos, sin la que está dada de baja.
7. **Permisos:** una Jugadora que llama a `GET /leagues` → 403.
8. **Integridad:** la verificación de DVH/DVV del P03 da todo correcto.

### 7.2 Front

1. `npm run build` compila sin errores. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano en el navegador. Como todavía no hay pantalla de inscripciones, decime cómo crear rápido una socia con inscripción aprobada para probar, por ejemplo con un script en el scratchpad. La lista:
   - con un Representante, crear una liga "Liga Metropolitana" con la escala 1 y las categorías Sub-16 y Sub-18;
   - comprobar que en Sub-16 no aparecen para asignar las jugadoras de 17 o más;
   - asignar jugadoras y una entrenadora;
   - entrar como esa entrenadora y ver "Mis categorías";
   - las pantallas en tamaño celular.

### 7.3 Cierre

1. **Actualizá `docs/TODO.md`:** en la Fase 4, marcá "Ligas y categorías" y "Asignación de jugadoras y staff a las categorías". Dejá "Front: pantallas del Representante, la Entrenadora y la Preparadora física" como `[~]`, con la nota "ligas y Mis categorías hechas (P09)". Agregá la línea al Registro.
2. Mostrame el resultado de la verificación y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
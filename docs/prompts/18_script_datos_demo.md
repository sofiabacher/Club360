# Prompt 18 — Script de datos de la demo

> **Cómo usarlo:** con el P17 ya integrado a `main`, en una rama nueva (`git checkout -b p18-demo-data`), con `CLAUDE.md`, `docs/contexto.md` y `docs/deploy.md` reemplazados por las versiones nuevas, escribí en la terminal:
> `Leé docs/prompts/PROMPT_18_datos_demo.md y ejecutalo.`

---

Vas a armar el script que carga los datos de la demo del club Valencia: socias, jugadoras, familias, staff, ligas, categorías, partidos, citaciones, cuotas, pagos, rutinas y notificaciones. Con esos datos, cada rol entra a la demo y encuentra algo para mostrar, y quedan preparados los casos que se hacen en vivo en la defensa (resolver un conflicto, citar, pagar, vincular una familia, registrarse con el número de socio).

Antes de empezar:
- leé `CLAUDE.md` completo y las secciones 2.1, 3, 6 y 8 de `docs/contexto.md`;
- mirá cómo quedaron hoy `seed/seed.js` y `seed/data/`, `utils/constants.js`, `utils/permissions.js`, los helpers de `access.service.js` (`assignBaseRole`), `members.service.js` (`generateMemberNumber` y el generador del código de vínculo), `fees.service.js` (`getOverdueDays`), el cálculo de conflictos de `games.service.js`, `utils/dates.js`, el cifrado del teléfono, `hashPassword` y el validador de contraseñas.

**Alcance:**
- **Se hace:** el script `npm run seed:demo`, sus datos, la opción `--reset`, la hoja de usuarios de la demo y la verificación.
- **No se hace:** cambiar modelos, services ni pantallas; mandar emails; subir archivos (imágenes o comprobantes).
- **No** hagas commit.
- Si para cargar algo tenés que tocar un service o un modelo, **frená y avisame** antes de hacerlo.

## 1. Cómo funciona el script

### 1.1 Archivos y comando

- `api/src/seed/demo.js`: el script.
- `api/src/seed/data/demo.js`: los datos (personas, ligas, partidos, rutinas, avisos), separados de la lógica, igual que `seed/data/club.js`.
- En `api/package.json`: `"seed:demo": "node src/seed/demo.js"`. Se corre con `npm run seed:demo` y, para recargar, `npm run seed:demo -- --reset`.

### 1.2 Requisitos para correr

- **Tiene que haber corrido el seed antes:** si no existe el club Valencia o su usuario Admin, corta con *"Primero corré npm run seed."*
- **Variables nuevas del `.env`** (sumalas a `api/.env.example`, en la sección del seed, con comentarios en español):
  - `SEED_DEMO_PASSWORD`: la contraseña de **todos** los usuarios de la demo (no la del Admin, que sigue saliendo de `SEED_ADMIN_PASSWORD`). Obligatoria: si falta o no cumple la política de contraseñas (la misma validación del registro), corta con un mensaje claro.
  - `SEED_DEMO_EMAIL`: una casilla del equipo (por ejemplo `club360.demo@gmail.com`). Cada usuario de la demo recibe una dirección con alias de esa casilla (`club360.demo+ctorres@gmail.com`), así los emails que se disparen en vivo (una citación, una recuperación de contraseña) llegan al equipo. Opcional: si falta, usa `{usuario}@demo.example` y avisa por consola que esos emails no van a llegar a nadie.
  - `SEED_DEMO_REAL_EMAILS`: emails reales del equipo para **4 usuarios de la demo** (punto 2.5), para probar que los emails llegan de verdad. Formato `clave=email` separado por comas: `ctorres=nombre@gmail.com,gromero=...`. La clave es el usuario de la tabla del punto 2 (para Natalia, que no tiene usuario, su clave `nibanez` en `seed/data/demo.js`). Opcional: el usuario que no figura usa el alias de `SEED_DEMO_EMAIL`. **Los emails no se escriben en el código ni en ningún archivo del repo**, solo en el `.env`. Si una clave no existe en los datos o un email no tiene formato válido, corta con un mensaje claro.
- Funciona con solo `DATABASE_URL` en el `.env`, para correrlo desde una compu contra Railway (`docs/deploy.md`, paso 7), con la misma `ENCRYPTION_KEY` que el back de Render.
- **Antes de escribir nada,** muestra el host y el nombre de la base a la que está conectado (nunca el usuario ni la contraseña), para que se vea si va contra la base local o la de la demo.

### 1.3 Una sola carga, o `--reset`

- **Sin `--reset`:** si ya hay datos de la demo (por ejemplo, existe el usuario `ctorres`), corta con *"Ya hay datos de la demo cargados. Para recargarlos, corré npm run seed:demo -- --reset."* No intenta completar ni duplicar nada: los datos dependen de la fecha del día (punto 1.4) y mezclar dos cargas no tendría sentido.
- **Con `--reset`:** pide confirmación por consola (escribir `BORRAR`) y, en la misma transacción que la carga, borra **todos los datos del club Valencia salvo lo que carga el seed**: se conservan el club, sus `clubSport`, los roles base y sus permisos, el usuario Admin del seed con sus roles, y los catálogos compartidos (deportes, permisos). Se borra también lo que se haya creado a mano en los ensayos (socios, staff, partidos, roles nuevos, notificaciones, etc.), respetando el orden de las FK.
  - **La bitácora no se borra**, igual que en la restauración (contexto, sección 11): queda el rastro de lo que pasó. Los registros de usuarios borrados quedan con `userId` en NULL, como define la FK.
  - No toca otros clubes.
- **Todo corre en una transacción:** si algo falla, no queda nada a medias. Pasá `{ transaction }` en todas las operaciones, para que los hooks de DVH/DVV trabajen dentro de ella (como el seed del P03).

### 1.4 Fechas relativas al día

Todas las fechas de negocio (partidos, citaciones, cuotas, pagos, altas, rutinas, notificaciones) se calculan desde **hoy en la zona horaria de Argentina**, con los helpers de `utils/dates.js`. En este prompt, **H** es hoy y **H+4** es dentro de 4 días.

- Así el script se puede correr el día de la defensa o el día anterior y siempre hay un partido dentro de la ventana de citación, cuotas vencidas y una semana de rutinas en curso.
- Las horas de los partidos son horas de Argentina (`18:30` es 18:30 en Buenos Aires), aunque el script corra con `TZ=UTC`.
- **Las citaciones Pendientes vencen 24 horas después de correr el script** (`dateMaxResponse`), y después las confirma el job. Dejalo dicho en el resumen de la consola y en la hoja de usuarios (punto 5).
- Las fechas de nacimiento son fijas (punto 2), porque definen las edades de los casos.

### 1.5 Cómo se crean los datos

- **Con los modelos**, no con los services que mandan notificaciones o emails: el script no tiene que disparar ningún email ni pasar por `notify()`. Las notificaciones in-app que tienen que verse en la demo se crean a propósito en el punto 4.
- **Pero con la lógica de la aplicación:** el número de socio con `generateMemberNumber`, el código de vínculo con el mismo generador del alta, las contraseñas con `hashPassword`, el teléfono cifrado como lo hace el alta, los roles base con `assignBaseRole`, los estados y códigos con las constantes de `utils/constants.js` (nunca números sueltos), los códigos de pago con los mismos prefijos (`PAY-`, `SEC-`).
- **Los montos de las cuotas** siguen la regla de D12: `socialAmount` = `club.socialFee` y `sportAmount` = la suma de los `priceFee` de los deportes con inscripción Aprobada. El estado de cada cuota impaga sale de su vencimiento: Pendiente si todavía no venció y Vencida si ya venció.
- **Fechas de alta en el pasado:** si Sequelize pisa `createdAt` (o el campo que usa `generateFeesForPeriod` para decidir desde cuándo paga un socio), resolvelo de forma que los DVH queden bien calculados. Contame cómo lo resolviste.
- **Teléfonos:** de relleno, con el formato de 2.1 del contexto (`11 5000-00xx`). **DNI:** de 8 dígitos, ficticios y únicos, desde `40000001`.
- Todos los nombres son inventados. Los rivales también (no usen clubes reales).

## 2. Personas

Usuarios **Activos con usuario y contraseña** salvo que se indique otra cosa. La columna "Usuario" es el `username`. Todos son del club Valencia y del deporte Vóley.

### 2.1 Staff

| Usuario | Nombre | Roles | Categorías |
|---|---|---|---|
| `mferreyra` | Mariana Ferreyra | Representante | (todo Vóley) |
| `cbenitez` | Carla Benítez | Entrenadora | Sub-16 y Sub-18 |
| `lquiroga` | Laura Quiroga | Entrenadora | Mayores |
| `vsosa` | Valeria Sosa | Preparadora física **y** Entrenadora (dos roles de staff: elige el rol al entrar) | las tres |
| — (clave `nibanez`) | Natalia Ibáñez | Entrenadora, **Pendiente de activación** (sin usuario ni contraseña; no se manda el email: el Admin lo reenvía en vivo) | ninguna |

### 2.2 Socias y familias (los casos de la demo)

| Usuario | Nombre | Nacimiento | Qué es | Caso que muestra |
|---|---|---|---|---|
| `ctorres` | Camila Torres | 14/03/2008 | Jugadora, mayor | Está en **Sub-18 y Mayores**: tiene el **conflicto de horario** (punto 3.3) y una citación Pendiente al partido de Mayores. Cuotas al día |
| `sromero` | Sofía Romero | 22/05/2011 | Jugadora, menor | Sub-16. Cuotas del **mes anterior y del actual impagas** (no llega al plazo de mora: se la puede citar). Citación Confirmada |
| `mromero` | Martina Romero | 03/09/2013 | Jugadora, menor | Sub-16 (juega en una categoría superior a su edad). Citación Pendiente. Cuotas al día |
| `gromero` | Gabriela Romero | 08/06/1982 | **Socia y Familia** de Sofía y Martina | Elige el rol al entrar; el panel de Familia muestra dos jugadoras y una con cuota vencida para pagar en vivo |
| `vruiz` | Valentina Ruiz | 30/07/2009 | Jugadora, menor | Sub-18. Cuotas al día |
| `rruiz` | Roberto Ruiz | 17/11/1978 | Solo Familia de Valentina | Familia que no es socio |
| `jmendez` | Julieta Méndez | 11/02/2010 | Jugadora, menor | Sub-16. **Código de vínculo sin usar**: se vincula una Familia en vivo |
| `acastro` | Abril Castro | 19/08/2003 | Jugadora, mayor, **Suspendida** | Mayores. Cuotas impagas desde hace 8 meses: las dos o tres más viejas superan los 180 días. No se la puede citar; el Admin registra pagos en secretaría y recupera la condición sola |
| `pgimenez` | Paula Giménez | 25/04/1999 | Jugadora, mayor | Mayores. Al día hasta el mes anterior; la cuota del mes actual impaga, para **pagar por transferencia** en vivo |
| `faguirre` | Florencia Aguirre | 02/12/1996 | Socia, mayor | **Inscripción Pendiente** a Vóley: la aprueba la Representante en vivo |
| — | Rocío Fernández | 09/10/1990 | Socia **Pendiente de registro** (alta de hoy, sin usuario) | Se registra en vivo con su número de socio y su fecha de nacimiento. Como se dio de alta después del día 1, **no tiene cuota** este mes |
| `mponce` | Micaela Ponce | 21/01/1988 | Socia, usuario **Bloqueado** por intentos | El Admin la desbloquea |
| `alucero` | Ana Lucero | 05/05/1975 | Socia **Inactiva** (baja) | Aparece en el filtro de inactivos y se puede reactivar |

Reglas para estos casos:
- **Familias:** los menores vinculados quedan con `adultUserId`, `linkStatus = true` y el código ya usado (como lo deja el circuito de vínculo). Julieta queda con su código sin usar.
- **Inscripciones:** todas las jugadoras tienen la inscripción a Vóley Aprobada (con fecha anterior a su primera cuota con deporte); Florencia, Pendiente.
- **Altas:** las socias se dieron de alta el día 15 de hace 6 meses, salvo Abril (hace 10 meses) y Rocío (hoy).

### 2.3 Jugadoras de relleno

Para que las categorías no se vean vacías, sumá **4 jugadoras más en cada categoría** (12 en total), con nombres inventados, usuario `nombre.apellido` en minúscula y sin tildes, edades válidas para su categoría (las de Sub-16 y Sub-18, menores sin adulto vinculado), cuotas al día y la misma fecha de alta que el resto. Listalas en la hoja de usuarios (punto 5).

### 2.4 Cuotas y pagos

- **Al día:** todas las cuotas desde su alta pagadas, incluida la del mes actual.
- **Medios de pago:** la mayoría con tarjeta (`note` = `"Tarjeta ****4242"` u otros 4 dígitos) y algunas en secretaría (`SEC-`), pagadas entre el día 2 y el 10 de cada mes. Quien paga: la socia si es mayor, y el adulto si es menor y tiene; las menores de relleno, en secretaría.
- **Un pago Rechazado** con tarjeta terminada en 0000 en el historial de Camila, seguido del pago Aprobado de esa misma cuota.
- **No** se cargan transferencias (requieren un comprobante subido): se muestran en vivo.

### 2.5 Usuarios con email real

Estos 4 usuarios reciben el email que figura para su clave en `SEED_DEMO_REAL_EMAILS`, así cada integrante del equipo recibe en su casilla los emails de un caso:

| Clave | Persona | Emails que recibe en la demo |
|---|---|---|
| `ctorres` | Camila Torres (jugadora mayor) | Citación nueva al citarla en Sub-18, partido cancelado y recuperación de contraseña |
| `gromero` | Gabriela Romero (socia y Familia) | Cuota vencida y avisos de mora de Sofía y Martina (como adulta vinculada) y avisos generales con email |
| `nibanez` | Natalia Ibáñez (entrenadora pendiente) | Email de activación de la cuenta de staff, cuando el Admin lo reenvía en vivo |
| `vruiz` | Valentina Ruiz (jugadora menor con email) | Citación nueva al citarla en Sub-18 |

- **Emails únicos:** `user.email` es único. Si un email de `SEED_DEMO_REAL_EMAILS` ya lo tiene otro usuario de la base (por ejemplo, el Admin del seed por `SEED_ADMIN_EMAIL`), corta **antes de escribir nada** con *"El email de {clave} ya lo usa otro usuario ({username}). Usá otro en SEED_DEMO_REAL_EMAILS."*, sin mostrar el email completo. Con `--reset`, ese chequeo se hace contra lo que queda después del borrado (el Admin del seed).
- Por consola, al terminar, se indica qué claves recibieron un email real, enmascarado (`ch***@gmail.com`).

## 3. Ligas, partidos y citaciones

### 3.1 Ligas y categorías

| Liga | Escala | Categorías |
|---|---|---|
| Liga Metropolitana de Vóley | 1 | Sub-16 y Sub-18 |
| Liga Federal Femenina | 2 | Mayores |

Las asignaciones de jugadoras y staff, como en las tablas del punto 2.

### 3.2 Partidos

Rivales inventados (por ejemplo: Atlético Ribera, Náutico Sur, Social Parque, Deportivo Lomas, Unión Vecinal, Estrella del Oeste). De local, la dirección de una de las canchas del club (contexto 2.1); de visitante, una dirección ficticia.

| Categoría | Cuándo | Rival | Estado y citaciones |
|---|---|---|---|
| las tres | H-14 y H-7 | uno distinto cada vez | **Jugado**, con citaciones Confirmadas, alguna Confirmada automáticamente y una Rechazada con justificación |
| Mayores | H-3 | Deportivo Lomas | **Cancelado**, con sus citaciones Canceladas |
| Sub-16 | H+4, 18:30, local, Cancha 1 | Atlético Ribera | Programado. Sofía y dos de relleno Confirmadas, Martina **Pendiente**, una de relleno **Rechazada** (*"Tengo un examen ese día y no llego."*). Julieta sin citar |
| Sub-18 | H+5, 10:00, visitante | Náutico Sur | Programado, **sin citaciones** (se cita en vivo) |
| Mayores | H+5, 12:00, local, Cancha Anexo | Social Parque | Programado. Camila **Pendiente**, Paula Confirmada. Abril sin citar |
| las tres | H+11 y H+18 | uno distinto cada vez | Programados, sin citaciones (todavía fuera de la ventana) |

- Las citaciones las genera la entrenadora de la categoría (`staffId`), con fecha dentro de la ventana de cada partido. Las Pendientes, creadas ahora y con `dateMaxResponse` = ahora + 24 horas.
- Las horas de los partidos de las otras fechas, elegilas de forma que **no** generen otro conflicto que el del punto 3.3.

### 3.3 El conflicto

Camila está en Sub-18 y en Mayores: el partido de Sub-18 de H+5 a las 10:00 termina a las 12:00 (2 horas asumidas) y el de Mayores empieza a las 12:00, con un margen de 60 minutos. **Queda sin resolver**, para resolverlo en vivo: al elegir Sub-18, se cancela sola la citación Pendiente de Camila en Mayores y ella ve "No jugás este partido". Confirmá con la función de conflictos de `games.service.js` que se detecta, y que es el único conflicto del club.

## 4. Rutinas, notificaciones y bitácora

### 4.1 Rutinas

- La Preparadora (`vsosa`) cargó la rutina de **lunes, miércoles y viernes** (los días de entrenamiento de 2.1 del contexto) de las tres categorías, para la **semana actual y las dos anteriores** (historial).
- Título y descripción realistas de preparación física de vóley (por ejemplo, *"Saltabilidad y core"*, con la entrada en calor, los bloques y las series). Distintas según la categoría.
- Sin imagen ni video: no se suben archivos y un link de video de relleno quedaría roto en la demo. La imagen se sube en vivo.
- La **semana siguiente queda vacía**, para cargarla en vivo.

### 4.2 Notificaciones in-app

Con el modelo, sin email, con los mismos tipos y textos que usan los módulos (buscá cada texto en el código, no lo inventes). Fechas recientes y coherentes con los datos:

- **Camila:** citación nueva (partido de Mayores) y fixture publicado; la primera sin leer.
- **Martina:** citación nueva, sin leer.
- **Gabriela (Familia):** cuota vencida de Sofía, sin leer.
- **Abril:** suspensión por mora, leída.
- **Carla y Laura:** conflicto de horario detectado, sin leer.
- **Mariana:** solicitud de inscripción de Florencia, sin leer.
- **Carla:** respuesta a la citación con el rechazo de la jugadora de relleno, leída.
- **Un aviso general del Admin** (con `batchId`, `transmitterId` del Admin): *"Recordamos que el sábado a las 10 hay reunión de familias en la sede para organizar el torneo de fin de año."*, a todas las socias y las familias. Que lo hayan leído alrededor de la mitad, así el historial de avisos enviados muestra lecturas.

### 4.3 Bitácora

Un solo registro al final: `DEMO_DATA_LOADED` (sumalo a `LOG_ACTIONS` en el bloque del seed), del sistema, con criticidad MEDIUM y en `details` las cantidades cargadas y si fue con `--reset`.

## 5. Hoja de usuarios de la demo

Generá `docs/demo-usuarios.md` (el script no lo escribe: lo armás vos ahora, desde los datos):
- la tabla de usuarios con nombre, rol o roles y qué caso muestra (los de 2.1, 2.2 y el relleno), y **dónde sale la contraseña** (`SEED_DEMO_PASSWORD` y `SEED_ADMIN_PASSWORD`), **sin ningún valor**;
- el número de socio de Rocío y el código de vínculo de Julieta **no** van en el archivo (cambian en cada carga): el script los muestra por consola al terminar;
- la lista de **lo que queda listo para hacer en vivo**: resolver el conflicto, citar en Sub-18, responder una citación, aprobar la inscripción de Florencia, vincular una Familia a Julieta, registrar a Rocío, pagar como Familia, pagar por transferencia y revisarla como Admin, recuperar a Abril con pagos en secretaría, desbloquear a Micaela, cargar la rutina de la semana siguiente, verificar la integridad y hacer un backup;
- qué usuarios tienen email real (punto 2.5), **sin las direcciones**: solo que salen de `SEED_DEMO_REAL_EMAILS`;
- las advertencias: las citaciones Pendientes vencen 24 horas después de correr el script, y con `--reset` se borra todo lo creado en los ensayos.

Al terminar, el script muestra por consola: la base contra la que corrió, las cantidades por tabla, el número de socio de Rocío, el código de Julieta, la fecha y hora en que vencen las citaciones Pendientes y un recordatorio de que los usuarios están en `docs/demo-usuarios.md`.

## 6. Verificación

### 6.1 Back

Contra la base **local**, con un script temporal **fuera del repo**:

1. **Requisitos:** sin `SEED_DEMO_PASSWORD` corta; con una contraseña que no cumple la política corta; sin haber corrido el seed corta.
2. **Carga:** `npm run seed:demo` termina sin errores. Correrlo de nuevo sin `--reset` corta sin escribir nada.
3. **Reset:** cargá a mano un socio y un partido, corré con `--reset` y confirmá que desaparecen, que el Admin del seed y los roles base siguen, que la bitácora conserva sus registros y que los datos se cargan de nuevo igual.
4. **Casos**, con las funciones de los services (sin pasar por el front):
   - la función de conflictos devuelve **un** conflicto, el de Camila, sin resolver;
   - la validación de citaciones rechaza a Abril por mora y permite citar a Sofía;
   - `getOverdueDays` de Abril supera 180 y el de Sofía no;
   - el login de `mponce` responde bloqueado; el de `alucero`, que no tiene roles para entrar (o lo que corresponda según 3.6.1 del contexto);
   - el registro de Rocío con su número y su fecha de nacimiento funciona (revertilo después, o corré `--reset` al final);
   - el código de Julieta es válido para vincularse;
   - Rocío no tiene cuotas y el resto tiene una cuota por mes desde su alta, con los montos de D12;
   - `vsosa` y `gromero` tienen dos roles para elegir.
5. **Fechas:** corriendo con `TZ=UTC`, los partidos quedan a la misma hora de Argentina que con `TZ=America/Argentina/Buenos_Aires`, y el partido de Sub-16 cae en H+4.
6. **Sin emails:** no se llamó al mailer ni a `notify()` (por ejemplo, con el mailer en `console`, no aparece nada).
7. **Emails reales:** con `SEED_DEMO_REAL_EMAILS` de prueba (direcciones `@demo.example`, no las reales), los 4 usuarios del punto 2.5 quedan con esos emails y el resto con el alias; con una clave inexistente, con un email mal escrito o con un email repetido con el del Admin, corta sin escribir nada; sin la variable, los 4 usan el alias.
8. **Integridad:** la verificación de DVH/DVV da todo correcto.

### 6.2 Front

1. Levantá back y front en local y dejame una lista corta de pruebas a mano, una por usuario de la tabla 2.2 y por cada staff: qué tiene que ver al entrar.

### 6.3 Cierre

1. **Actualizá `docs/TODO.md`:**
   - en la Fase 1, marcá *"Datos de prueba: socios, jugadoras, familias, staff, ligas y partidos para probar y para la demo"* con *"(P18)"*;
   - en la Fase 7, dejá sin marcar *"Cargar el seed y los datos de la demo en Railway"* (lo hace Sofía) y sumá debajo: *"Correr `npm run seed:demo -- --reset` el día de la defensa o el anterior (las citaciones Pendientes vencen a las 24 horas)"*.

   Agregá la línea al Registro.
2. No modifiques `CLAUDE.md`, `docs/contexto.md` ni `docs/deploy.md`: ya vienen con las reglas de este script (`CLAUDE.md`, "Datos de la demo"; contexto, sección 11; `docs/deploy.md`, paso 7). Si ves que algo no coincide con lo que implementaste, avisame.
3. Mostrame el resultado de la verificación, cómo resolviste las fechas de alta en el pasado, cualquier texto de notificación que no encontraste en el código y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
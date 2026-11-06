# Prompt 13 — Inscripciones a deportes y ajustes a las citaciones

Este prompt tiene dos partes:
1. **El módulo `inscriptions`:** el socio pide inscribirse a un deporte, el Representante aprueba o rechaza (y aprobar le da el rol Jugadora), y el socio se da de baja de un deporte en el momento.
2. **Dos ajustes a las citaciones del P12:**
   - una ventana para citar, desde 7 días hasta 48 horas antes del partido;
   - un aviso a las entrenadoras cuando una jugadora responde.

Antes de empezar, leé `CLAUDE.md` (sobre todo "Inscripciones", "Citaciones", "Ligas y categorías" y "Notificaciones") y las secciones 3.3, 3.3.1 y 6 de `docs/contexto.md`.

**Alcance:**
- **Se hace:**
  - pedido, aprobación, rechazo y cancelación de inscripciones;
  - la baja de un deporte con todos sus efectos;
  - las notificaciones;
  - las pantallas;
  - los dos ajustes a citaciones;
  - los casos de prueba.
- **No se hace:** las cuotas (P14). La cuota deportiva va a salir sola de las inscripciones Aprobadas cuando se genere cada cuota mensual.
- **No** hagas commit.

## Parte 1 — Inscripciones

### 1.1 Reglas

1. **Pedido** (`inscriptions.request`, roles Socio y Jugadora; también lo puede hacer un menor):
   - el socio tiene que estar **ACTIVE**. Un socio SUSPENDED por mora no puede pedir: *"Tenés cuotas atrasadas: regularizá tu situación para inscribirte a un deporte."*;
   - el deporte tiene que estar **activo en el club** (`clubSport.isActive`);
   - no puede tener ya una inscripción **Pendiente o Aprobada** en ese deporte (409). Con una Rechazada o Cancelada, puede volver a pedirla;
   - la inscripción se crea Pendiente.
   - Se avisa a los **Representantes de ese deporte** (staff activo con rol Representante y ese `clubSportId`) con `INSCRIPTION_REQUEST`, solo in-app: *"Nueva solicitud de inscripción a Vóley: {nombre} (Nº {numMember})."*
2. **Aprobación** (`inscriptions.approve`), solo de inscripciones Pendientes de los deportes de su alcance (el mismo criterio que `getLeagueScope`: un staff, su deporte; quien no es staff, todos). En una transacción:
   - la inscripción pasa a Aprobada;
   - se le asigna el rol **Jugadora** con `assignBaseRole` (si ya lo tenía por otro deporte, no pasa nada);
   - se avisa al socio con `INSCRIPTION_RESULT`: *"¡Se aprobó tu inscripción a Vóley! Ya sos jugadora del club. Desde el menú podés cambiar al rol Jugadora."*
   - Si el socio dejó de estar ACTIVE mientras la solicitud esperaba: 409.
3. **Rechazo:** Pendiente → Rechazada, con un motivo opcional (hasta 300 caracteres). El motivo va en la bitácora y en el aviso `INSCRIPTION_RESULT`: *"Tu inscripción a Vóley no fue aprobada. Motivo: {motivo}."*
4. **Cancelar una solicitud** (`inscriptions.withdraw`): el socio puede cancelar su propia solicitud Pendiente, que pasa a Cancelada, sin otros efectos.
5. **Baja de un deporte** (`inscriptions.withdraw`, contexto 3.3.1): el socio, sobre su propia inscripción Aprobada, después de confirmar en un diálogo. Es **inmediata** y va en **una transacción**:
   - la inscripción pasa a **Cancelada**;
   - sale de todas sus categorías de ese deporte, con `removeMemberFromSportCategories`;
   - sus citaciones **Pendientes** de partidos futuros de ese deporte pasan a **Cancelada**. Son exactamente las que define el contexto 3.3.1; las Confirmadas no se tocan;
   - si ya no le queda **ninguna** inscripción Aprobada, pierde el rol **Jugadora**, con `removeBaseRole`. Si estaba trabajando con ese rol, el `isAuth` del P04 lo va a sacar en la siguiente request: el front tiene que manejarlo llevándolo a elegir rol de nuevo;
   - se avisa a los Representantes del deporte con `SPORT_WITHDRAWAL` (in-app): *"{nombre} (Nº {numMember}) se dio de baja de Vóley."*
   - Las cuotas ya generadas no se tocan. La cuota deportiva deja de generarse desde el mes siguiente, porque el P14 solo cuenta las inscripciones Aprobadas.
6. **Bitácora** (MEDIUM): `INSCRIPTION_REQUESTED`, `INSCRIPTION_APPROVED`, `INSCRIPTION_REJECTED` (con el motivo), `INSCRIPTION_CANCELLED` y `SPORT_WITHDRAWN`.

### 1.2 Alcance por deporte

Si `getLeagueScope` (de `leagues.service.js`) sirve para cualquier módulo, movela a un lugar común (por ejemplo, `getSportScope(user)` en `staff.service.js`) y que `leagues` la siga usando desde ahí. Se usa en inscripciones, ligas y partidos. No dupliques la lógica.

### 1.3 Back (`modules/inscriptions/`)

| Método y ruta | Permiso | Qué hace |
|---|---|---|
| `GET /inscriptions/mine` | `inscriptions.request` | Los deportes activos del club, cada uno con el estado de la inscripción del socio (o ninguna), su cuota deportiva y qué acciones puede hacer: pedir, cancelar la solicitud o darse de baja |
| `POST /inscriptions` | `inscriptions.request` | `{ clubSportId }` (regla 1) |
| `POST /inscriptions/:id/withdraw` | `inscriptions.withdraw` | Solo sobre una inscripción propia. Con una Pendiente aplica la regla 4; con una Aprobada, la regla 5. Responde lo que cambió: cuántas categorías y citaciones se cancelaron y si perdió el rol Jugadora |
| `GET /inscriptions?state=&clubSportId=&search=&page=` | `inscriptions.approve` | Inscripciones del alcance, paginadas de a 20, con el socio (nombre, número de socio, edad de temporada, estado del socio) y el deporte. Por defecto, las Pendientes primero |
| `POST /inscriptions/:id/approve` | `inscriptions.approve` | Regla 2 |
| `POST /inscriptions/:id/reject` | `inscriptions.approve` | `{ reason? }` (regla 3) |

### 1.4 Front

- **`/my-sports` (`pages/inscriptions/MySportsPage.jsx`):**
  - una tarjeta por deporte del club, con el nombre, la cuota deportiva y el estado de la inscripción con `StatusChip`: Pendiente `pending`, Aprobada `ok`, Rechazada `overdue` (con el motivo si lo hay), o sin inscripción;
  - las acciones, según el caso:
    - **"Inscribirme"** (naranja);
    - **"Cancelar solicitud"**;
    - **"Darme de baja"**: abre un diálogo de confirmación que explica las consecuencias. *"Vas a dejar de estar en tus categorías de Vóley, se cancelan tus citaciones pendientes y, si no tenés otro deporte, dejás de ser Jugadora. La cuota deportiva deja de cobrarse desde el mes que viene; las cuotas ya generadas se siguen debiendo."*;
  - si el socio está suspendido, un `Alert` arriba con el aviso de la regla 1;
  - después de darse de baja, si perdió el rol activo, llamá a `refreshSession()` y mandalo a `/select-role` o a `/`, según los roles que le queden.
- **`/inscriptions` (`pages/inscriptions/InscriptionsPage.jsx`):**
  - pestañas "Pendientes" e "Historial", con un buscador y un filtro por deporte (solo si tiene más de uno en su alcance);
  - cada inscripción muestra el nombre, el número de socio en la variante `numeric`, la edad de temporada, el deporte y la fecha de la solicitud;
  - en las Pendientes, los botones **"Aprobar"** y "Rechazar", este último con un diálogo para el motivo opcional;
  - después de aprobar, un `Snackbar` con el link **"Asignarla a una categoría"** → `/leagues`;
  - estado vacío: *"No hay solicitudes pendientes."*
- **Rutas y llamadas:** reemplazá el `ComingSoonPage` de `/my-sports` y `/inscriptions`. Agregá las llamadas en `client/src/api/inscriptions.api.js`.

## Parte 2 — Ajustes a las citaciones (P12)

### 2.1 Ventana para citar

- **Regla nueva:** solo se puede citar **desde 7 días antes** del partido **hasta 48 horas antes**. Reemplaza la regla del P12, que solo pedía el mínimo de 48 horas.
  - Sumá `CITATION_WINDOW_OPEN_DAYS = 7` y `CITATION_MIN_HOURS = 48` a `utils/constants.js` (api y client) y usalas en lugar de números sueltos.
- **Mensajes:**
  - si falta más de una semana: 400, *"Las citaciones para este partido se habilitan el {día y hora: partido − 7 días}."*;
  - si faltan menos de 48 h: el mensaje que ya existe.
- **En `GET /citations/games` y `GET /citations/games/:gameId`:** devolvé `citationWindow: { opensAt, closesAt, status: 'NOT_YET_OPEN' | 'OPEN' | 'CLOSED' }`. En la lista de la categoría, el motivo de no citable pasa a ser `NOT_YET_OPEN` o `TOO_LATE`, según corresponda.
- **En el front (`CitationsPage` y `GameCitationsPage`):**
  - los partidos que todavía no abrieron muestran el chip "Se habilita el {día}" (neutro);
  - en el detalle, un `Alert` informativo con esa fecha y las casillas deshabilitadas.

### 2.2 Aviso a las entrenadoras cuando una jugadora responde

- **Tipo nuevo:** `CITATION_RESPONSE` en `NOTIFICATION_TYPES` (`email: false`) y en `notificationTypes.js`, con la ruta `/citations`.
- **Cuándo se manda:** al **confirmar** o al **rechazar** una citación, se avisa a **todas las entrenadoras asignadas y activas en la categoría** del partido (`categoryStaff` con rol Entrenadora y staff activo).
  - Al confirmar: *"Martina López confirmó la citación para Sub-18 vs. Atlético Ribera (sáb. 7/11, 18:30)."*
  - Al rechazar: *"Martina López no puede ir a Sub-18 vs. Atlético Ribera (sáb. 7/11): «{justificación}»."*
- **Confirmaciones automáticas:** no avisan.
- Va en la misma transacción que la respuesta, con `notify()`.

## 3. Notificaciones nuevas

| Clave | `email` | Ruta en el front |
|---|---|---|
| `INSCRIPTION_REQUEST` | `false` | `/inscriptions` |
| `CITATION_RESPONSE` | `false` | `/citations` |

`INSCRIPTION_RESULT` y `SPORT_WITHDRAWAL` ya existen.

## 4. Casos de prueba documentados

- **Creá `docs/pruebas/inscriptions.txt` con:**
  - pedir la inscripción;
  - pedirla siendo suspendido (rechazado);
  - pedirla dos veces (rechazado);
  - pedir en un deporte inactivo (rechazado);
  - volver a pedir después de un rechazo;
  - el Representante recibe el aviso;
  - aprobar (rol Jugadora y aviso al socio);
  - rechazar con motivo;
  - un Representante de otro deporte no la ve;
  - cancelar una solicitud Pendiente;
  - **baja con todos sus efectos:** sale de las categorías, se cancelan las citaciones Pendientes futuras, se mantienen las Confirmadas, pierde el rol Jugadora y llega el aviso al Representante;
  - baja teniendo dos deportes: conserva el rol Jugadora;
  - un menor que pide su inscripción.
- **Sumá a `docs/pruebas/citations.txt`:**
  - citar a 8 días del partido (rechazado, con la fecha de apertura);
  - citar a 7 días (aceptado);
  - el aviso a las dos entrenadoras de la categoría al confirmar y al rechazar;
  - una confirmación automática que no avisa.

## 5. Documentación del repo

No modifiques `CLAUDE.md` ni `docs/contexto.md`: ya vienen con estas reglas. Si ves que no las incluyen, avisame.

## 6. Verificación

### 6.1 Back

Hacelo con un script temporal **fuera del repo**, con datos de prueba creados con los modelos:
- un segundo deporte activo;
- Representantes de los dos deportes;
- un socio ACTIVE, uno SUSPENDED y uno menor;
- una jugadora en dos categorías de Vóley, con citaciones Pendientes y Confirmadas en partidos futuros.

Borralos al final, salvo los que necesites para los casos documentados.

1. **Pedido:** las cuatro validaciones de la regla 1; el aviso llega solo a los Representantes de ese deporte.
2. **Aprobación y rechazo:**
   - aprobar asigna el rol Jugadora y avisa;
   - aprobar con el socio ya INACTIVE → 409;
   - rechazar guarda el motivo en la bitácora y avisa;
   - el Representante del otro deporte → 404.
3. **Baja de un deporte:**
   - la jugadora sale de las dos categorías;
   - las Pendientes futuras pasan a Canceladas;
   - las Confirmadas siguen igual;
   - pierde el rol Jugadora;
   - el Representante recibe `SPORT_WITHDRAWAL`.

   Con dos deportes aprobados, darse de baja de uno le deja el rol.
4. **Ventana de citación:** con partidos a 8 días, a 7 días y a 47 horas: rechazado con la fecha de apertura, aceptado y rechazado. `citationWindow` devuelve el estado correcto en los tres casos.
5. **Aviso a las entrenadoras:** con dos entrenadoras en la categoría, confirmar y rechazar les avisa a las dos; el job de confirmación automática no avisa.
6. **Integridad:** la verificación de DVH/DVV del P03 da todo correcto.

### 6.2 Front

1. `npm run build` compila sin errores. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano en el navegador:
   - pedir la inscripción como socio, aprobarla como Representante y entrar con el rol Jugadora;
   - darse de baja y ver cómo cambian el menú y los roles;
   - un partido a más de una semana en la pantalla de citaciones;
   - el aviso en la campana de la entrenadora cuando la jugadora responde;
   - las pantallas en tamaño celular.

### 6.3 Cierre

1. **Actualizá `docs/TODO.md`:**
   - en la Fase 4, marcá la solicitud y aprobación de inscripción y la baja inmediata de un deporte;
   - agregá y marcá: *"Ventana de citación de 7 días a 48 horas antes del partido (P13)"* y *"Aviso a las entrenadoras cuando una jugadora confirma o rechaza (P13)"*;
   - agregá la línea al Registro.
2. Mostrame el resultado de la verificación y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
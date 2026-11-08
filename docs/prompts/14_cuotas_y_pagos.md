# Prompt 14 — Cuotas, pagos y mora

Vas a implementar el módulo `fees`:
- la generación mensual de las cuotas;
- el pago simulado y el pago en secretaría;
- los avisos de vencimiento y de mora;
- la suspensión por mora y la recuperación automática;
- las pantallas del Admin, el Representante, el Socio y la Familia.

Además, vas a hacer un ajuste a la baja de un deporte (P13). Antes de empezar, leé `CLAUDE.md` (sobre todo "Cuotas y pagos", "Notificaciones" e "Inscripciones") y las secciones 3.3.1, 3.4 y 6 de `docs/contexto.md`.

**Alcance:**
- **Se hace:**
  - generación de cuotas;
  - jobs de vencimiento, avisos y suspensión;
  - pagos;
  - recuperación del socio suspendido;
  - pantallas;
  - el ajuste del punto 6;
  - los casos de prueba.
- **No se hace:**
  - una pasarela de pago real (contexto, sección 7);
  - pagos parciales;
  - anular cuotas.
- **No** hagas commit.

## 1. Reglas de las cuotas (decisión D12 y contexto, sección 6)

1. **Generación:** el **día 1 de cada mes** se genera la cuota de ese mes (`period = 'AAAA-MM'`), que **vence el día 10** (`expirationDate`). Sumá a `utils/constants.js`:
   - `FEE_GENERATION_DAY = 1`;
   - `FEE_DUE_DAY = 10`;
   - `FEE_DUE_SOON_DAYS = 3`;
   - `FEE_OVERDUE_REMINDER_DAYS = 30`.
2. **A quién se le genera:** a todos los socios **ACTIVE o SUSPENDED** del club (la deuda sigue corriendo) que se dieron de alta **antes del día 1 del período**. Un socio dado de alta a mitad de mes paga desde el mes siguiente. A los INACTIVE no se les genera. Los socios pendientes de registro sí pagan.
3. **Montos**, guardados en la cuota en el momento de generarla:
   - `socialAmount` = `club.socialFee`;
   - `sportAmount` = suma de los `priceFee` de los deportes en los que el socio tiene una inscripción **Aprobada** en ese momento (una cuota deportiva por deporte, D6). Una inscripción aprobada a mitad de mes suma desde la cuota siguiente, y una baja deja de sumar desde la siguiente.
4. **Idempotencia:** la cuota es única por `(memberId, period)`. Generar dos veces el mismo período no duplica nada.
5. **Estados** (`FEE_STATES`):
   - Pendiente (1);
   - Pagada (2);
   - **Vencida (3):** el día siguiente al vencimiento, si no se pagó.
6. **Días de atraso:** `getOverdueDays` (P12) ya los calcula desde el `expirationDate` de la cuota impaga más vieja. Usá esa misma función en todo el módulo.

## 2. Jobs (zona horaria de Argentina)

Cada job llama a una **función del service** que recibe la fecha de referencia (`today`), así se puede probar con cualquier fecha. Todos son idempotentes.

1. **`jobs/generateFees.job.js`:** todos los días 1 a las 00:05. Llama a `generateFeesForPeriod(clubId, period)` para cada club y registra `FEES_GENERATED`, con la cantidad (sistema, LOW).
2. **`jobs/feeStatus.job.js`:** todos los días a las 00:15. Llama a `runDailyFeeCheck(today)`, que hace, en este orden:
   - **Por vencer:** a las cuotas Pendientes que vencen dentro de `FEE_DUE_SOON_DAYS` días exactos, les manda `FEE_DUE_SOON` (in-app, con `includeFamily`): *"Tu cuota de noviembre vence el martes 10/11 ($40.000)."*
   - **Vencidas:** las cuotas Pendientes con el vencimiento ya pasado pasan a **Vencida** y se avisa `FEE_OVERDUE` (in-app y email, con `includeFamily`): *"Tu cuota de noviembre venció el 10/11. Regularizá tu situación desde Mis cuotas."*
   - **Recordatorio de mora:** a los socios con cuotas Vencidas cuyos días de atraso son múltiplo de `FEE_OVERDUE_REMINDER_DAYS` (30, 60, 90…), un solo `FEE_OVERDUE` por socio, con el resumen: *"Tenés {n} cuotas vencidas por ${total}. La más vieja tiene {d} días de atraso. Si superás los {delayFee} días, perdés tu condición de socio."*
   - **Suspensión:** los socios ACTIVE con días de atraso **mayores a `club.delayFee`** pasan a **SUSPENDED**. Se registra `MEMBER_SUSPENDED` (HIGH) y se avisa `MEMBER_SUSPENDED` (in-app y email, con `includeFamily`): *"Por tener cuotas impagas hace más de {delayFee} días, perdiste tu condición de socio. Mientras tanto no podés ser citada ni inscribirte a deportes. Se recupera sola cuando regularices tus cuotas."*

Registrá los dos jobs en `jobs/index.js`.

## 3. Pagos

1. **Quién paga:**
   - el propio socio, con `fees.payOwn` (solo mayores: `getEffectivePermissions` ya se lo quita a los menores);
   - el adulto Familia, por las socias vinculadas, con `fees.manageLinked`.

   Solo se pagan cuotas **Pendientes o Vencidas**, por el **total** (`socialAmount + sportAmount`). Una cuota con un pago aprobado no se paga de nuevo (409).
2. **Pago simulado:**
   - el front manda número de tarjeta, titular, vencimiento y código. **No se guarda ningún dato de la tarjeta**: en la bitácora, solo los últimos 4 dígitos;
   - el back crea un `payment` en **Pendiente**, con `userId` = quien paga, `amount` y un `confirmationCode` único (`PAY-` + 8 caracteres), y lo resuelve al instante: si la tarjeta **termina en 0000**, **Rechazado**; si no, **Aprobado**;
   - si se aprueba, la cuota pasa a **Pagada**;
   - todo en una transacción. Registra `PAYMENT_APPROVED` o `PAYMENT_REJECTED` (MEDIUM).
3. **Pago en secretaría** (Admin, `fees.manage`):
   - registra un pago **Aprobado**, con `userId` = el Admin, un `confirmationCode` `SEC-` + 8 caracteres y una nota opcional;
   - la cuota pasa a Pagada;
   - registra `FEE_PAID_MANUAL` (HIGH, con la nota).
4. **Recuperación automática** (contexto, sección 6): al **aprobarse cualquier pago**, si el socio está SUSPENDED y ya no le queda **ninguna** cuota impaga con más días de atraso que `club.delayFee`, vuelve a **ACTIVE**, en la misma transacción. Se registra `MEMBER_RECOVERED` (MEDIUM). La pantalla de pago muestra *"¡Recuperaste tu condición de socio!"*.

## 4. Back (`modules/fees/`)

| Método y ruta | Permiso | Qué hace |
|---|---|---|
| `GET /fees/mine` | `fees.viewOwn` | Estado de cuenta del socio logueado: sus cuotas (período, desglose, total, vencimiento, estado y días de atraso), el total adeudado, su estado de socio, si puede pagar (`canPay`, según `fees.payOwn`) y los pagos hechos |
| `GET /fees/linked?memberId=` | `fees.manageLinked` | Lo mismo para cada socia vinculada al adulto, con `canPay: true` |
| `POST /fees/:id/pay` | `fees.payOwn` o `fees.manageLinked` | `{ cardNumber, cardHolder, cardExpiry, cardCvv }`. Valida que la cuota sea del socio logueado (con `payOwn`) o de una socia vinculada (con `manageLinked`); si no, 404. Responde el pago, el estado de la cuota y si el socio se recuperó |
| `GET /fees?period=&state=&search=&page=` | `fees.manage` | Cuotas del club, paginadas de a 20, con el socio. Además, un resumen del período: cantidad y monto de Pagadas, Pendientes y Vencidas |
| `GET /fees/members/:memberId` | `fees.manage` | Estado de cuenta completo de un socio |
| `POST /fees/generate` | `fees.manage` | `{ period }`. Genera a mano las cuotas de un período (para la demo o si el job no corrió). Por la idempotencia, responde cuántas se crearon y cuántas ya existían. No se puede generar un período futuro |
| `POST /fees/:id/register-payment` | `fees.manage` | `{ note? }` (regla 3.3) |
| `GET /fees/players?status=&search=` | `fees.viewPlayers` | Jugadoras con una inscripción Aprobada en los deportes del alcance del Representante (`getSportScope`), con su situación: al día, con cuotas pendientes o con cuotas vencidas, y los días de atraso. Sin montos individuales |

**Validaciones del pago:**
- número de tarjeta: de 13 a 19 dígitos;
- titular: obligatorio;
- vencimiento: `MM/AA`, sin vencer;
- código: de 3 o 4 dígitos.

**Bitácora:** sumá a `LOG_ACTIONS` las acciones que falten: `FEES_GENERATED`, `PAYMENT_APPROVED`, `PAYMENT_REJECTED`, `FEE_PAID_MANUAL`, `MEMBER_SUSPENDED` y `MEMBER_RECOVERED`.

## 5. Front

### 5.1 Mis cuotas (`/my-fees`, `pages/fees/MyFeesPage.jsx`) y Familia (`/family/fees`, `pages/fees/FamilyFeesPage.jsx`)

- **Arriba, un resumen** con el total adeudado en grande (variante `numeric`) y el estado:
  - "Al día" (`ok`);
  - "Tenés cuotas pendientes" (`pending`);
  - "Tenés cuotas vencidas" (`overdue`);
  - si está suspendido, un `Alert` con el texto de la suspensión.
- **La lista de cuotas,** la más reciente primero. Cada una muestra:
  - el mes ("Noviembre 2026");
  - el desglose: cuota social y cuota deportiva;
  - el total;
  - "Vence el 10/11" o "{d} días de atraso";
  - un `StatusChip`: Pagada `ok`, Pendiente `pending`, Vencida `overdue`.
- **El botón "Pagar"** (naranja) en las impagas, solo si `canPay`. Si es menor, en su lugar la nota *"El pago lo hace tu adulto responsable."*
- **Diálogo de pago:**
  - un formulario de tarjeta;
  - un aviso fijo: *"Pago simulado: no se cobra nada. Usá cualquier número de tarjeta; los que terminan en 0000 se rechazan."*;
  - el resultado: aprobado, con el código de confirmación en la variante `numeric`, o rechazado, con la opción de reintentar.
- **Historial de pagos:** fecha, monto, código y estado.
- **En la vista de Familia:** un selector de jugadora si tiene más de una.

### 5.2 Gestión de cuotas del Admin (`/fees`, `pages/fees/FeesPage.jsx`)

- **Arriba:**
  - el selector de período (por defecto, el actual);
  - tres tarjetas de resumen: Pagadas, Pendientes y Vencidas, con la cantidad y el monto;
  - el botón **"Generar cuotas de {mes}"**, con confirmación y el resultado ("Se generaron 45 cuotas · 3 ya existían").
- **Tabla** (tarjetas en el celular), con filtros por estado y un buscador: socio, número de socio, desglose, total, vencimiento y estado.
- **En cada impaga, "Registrar pago en secretaría":** un diálogo con el total y una nota opcional.
- **Al tocar un socio,** su estado de cuenta (`/fees/members/:memberId`), con la misma vista que "Mis cuotas" más el botón de pago en secretaría.

### 5.3 Cuotas de jugadoras (`/fees/players`, `pages/fees/PlayersFeesPage.jsx`)

Lista de jugadoras con:
- su situación, con `StatusChip`: Al día `ok`, Pendiente `pending`, Vencida `overdue`;
- los días de atraso;
- un chip "No se puede citar" (`urgent`) si supera el plazo.

Con un filtro por situación y un buscador. Solo lectura.

### 5.4 Rutas y llamadas

- Reemplazá el `ComingSoonPage` de `/my-fees`, `/family/fees`, `/fees` y `/fees/players`.
- Agregá a `AppRouter` la ruta `/fees/members/:memberId`, con `fees.manage`.
- Agregá las llamadas en `client/src/api/fees.api.js`.

## 6. Ajuste a la baja de un deporte (P13)

Al darse de baja de un deporte, se cancelan **también** las citaciones **Confirmadas y Confirmadas automáticamente** de partidos **futuros** de ese deporte, además de las Pendientes.
- Por cada citación Confirmada que se cancela, se avisa a las entrenadoras activas de la categoría con `CITATION_RESPONSE` (in-app): *"{nombre} se dio de baja de Vóley: se canceló su citación confirmada para Sub-18 vs. Atlético Ribera (sáb. 7/11)."*
- Actualizá la respuesta de `POST /inscriptions/:id/withdraw` y el texto del diálogo de baja en `MySportsPage`: *"…se cancelan tus citaciones de partidos que todavía no se jugaron…"*.
- Corregí el caso de prueba de `docs/pruebas/inscriptions.txt` que decía que las Confirmadas se mantenían.

## 7. Casos de prueba documentados

- **Creá `docs/pruebas/fees.txt` con:**
  - generar las cuotas de un período (social + deportiva con dos deportes);
  - generar dos veces (no duplica);
  - un socio dado de alta a mitad de mes (no tiene cuota de ese mes);
  - un socio inactivo (no se le genera);
  - el aviso de cuota por vencer;
  - el vencimiento y el aviso con email;
  - el recordatorio a los 30 días;
  - la suspensión al superar el plazo;
  - el pago aprobado;
  - el pago rechazado (tarjeta terminada en 0000);
  - pagar una cuota ya pagada (rechazado);
  - un menor que intenta pagar (sin permiso);
  - la Familia paga por su jugadora;
  - la Familia intenta pagar una cuota ajena (404);
  - el pago en secretaría;
  - la recuperación automática del suspendido;
  - un pago que no recupera porque queda otra cuota con mora;
  - la vista del Representante;
  - una jugadora suspendida que no se puede citar (con el P12).
- **Ajustá `docs/pruebas/inscriptions.txt`** según el punto 6.

## 8. Documentación del repo

No modifiques `CLAUDE.md` ni `docs/contexto.md`: ya vienen con estas reglas. Si ves que no las incluyen, avisame.

## 9. Verificación

### 9.1 Back

Hacelo con un script temporal **fuera del repo**, llamando a las funciones del service con fechas de referencia distintas, con datos de prueba creados con los modelos:
- socios ACTIVE, SUSPENDED e INACTIVE;
- uno dado de alta a mitad de mes;
- una jugadora con dos deportes aprobados;
- un menor vinculado a un adulto.

Borralos al final, salvo los que necesites para los casos documentados.

1. **Generación:**
   - `generateFeesForPeriod` con `period = 2026-11` crea las cuotas con los montos correctos;
   - el socio del alta del 15/11 no tiene la de noviembre y sí la de diciembre;
   - el INACTIVE no tiene;
   - correrlo dos veces no duplica;
   - `POST /fees/generate` con un período futuro → 400.
2. **Chequeo diario:**
   - `runDailyFeeCheck('2026-11-07')` → aviso de por vencer;
   - `'2026-11-11'` → Vencida y aviso con email por consola, también al adulto del menor;
   - con el `delayFee` en 30 y la fecha 30 días después → recordatorio;
   - un día más → SUSPENDED con su aviso.
3. **Pagos:**
   - aprobado → la cuota queda Pagada;
   - con 0000 → Rechazado y la cuota sigue igual;
   - pagar de nuevo una Pagada → 409;
   - un menor con `payOwn` → 403;
   - la Familia paga la de su menor → OK;
   - la de otra → 404;
   - en la bitácora no aparece el número completo de la tarjeta.
4. **Recuperación:**
   - un SUSPENDED con dos cuotas vencidas, paga solo la más nueva → sigue SUSPENDED;
   - paga la más vieja → ACTIVE y `MEMBER_RECOVERED`;
   - pago en secretaría → mismo efecto.
5. **Representante:** ve solo jugadoras de su deporte, con su situación.
6. **Ajuste de baja:** con una citación Confirmada futura, darse de baja la cancela y avisa a las entrenadoras.
7. **Integridad:** la verificación de DVH/DVV del P03 da todo correcto.

### 9.2 Front

1. `npm run build` compila sin errores. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano en el navegador:
   - generar las cuotas del mes como Admin;
   - pagar como socio mayor (aprobado y rechazado);
   - ver "Mis cuotas" como menor;
   - pagar como Familia;
   - registrar un pago en secretaría;
   - las pantallas en tamaño celular.

### 9.3 Cierre

1. **Actualizá `docs/TODO.md`:**
   - en la Fase 5, marcá todas las tareas (sacale el `[!]` a la generación);
   - en las Decisiones pendientes, marcá la **D12**;
   - agregá y marcá *"Pago en secretaría registrado por el Admin (P14)"* y *"La baja de un deporte cancela también las citaciones Confirmadas de partidos futuros (P14)"*;
   - agregá la línea al Registro.
2. Mostrame el resultado de la verificación y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
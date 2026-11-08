# Prompt 14b — Pago por transferencia, comprobantes de pago y formulario de tarjeta

Vas a sumar tres cosas al módulo `fees` del P14:
1. **Pago por transferencia:** el socio ve los datos bancarios del club, transfiere, adjunta el comprobante y el Admin lo revisa.
2. **Comprobante de pago** imprimible para todo pago aprobado, sea con tarjeta, por transferencia o en secretaría.
3. **Formulario de tarjeta más claro,** con el número separado en grupos de 4 dígitos.

Antes de empezar, leé `CLAUDE.md` (sobre todo "Cuotas y pagos", "Imágenes" y "Notificaciones") y la sección 6 de `docs/contexto.md`.

**Alcance:**
- **Se hace:** lo de arriba, el historial de pagos del Admin, las notificaciones y los casos de prueba.
- **No se hace:** una conexión real con un banco. El Admin compara el comprobante a mano.
- **No** hagas commit.

## 0. Cambios en el modelo

### 0.1 `Payment`

Sumá tres campos:
- **`method`:** `TINYINT`, `allowNull: false`, `defaultValue: 1`. Usa `PAYMENT_METHODS = { CARD: 1, TRANSFER: 2, CASH: 3 }` (constante nueva en `utils/constants.js`, api y client).
- **`receiptUrl`:** `STRING(255)`, `allowNull: true`. El comprobante de la transferencia que subió el socio.
- **`note`:** `STRING(300)`, `allowNull: true`. La nota del pago en secretaría o el motivo del rechazo de una transferencia.

### 0.2 Aplicarlo sin perder datos

1. `npm run db:snapshot`.
2. Recrear la base.
3. `npm run db:restore`.

Avisame antes de recrear la base y esperá mi confirmación.

**Después del restore,** con un script en el scratchpad que use los **modelos** (no SQL), pasá a `method = CASH` los pagos cuyo `confirmationCode` empieza con `SEC-` y copiá a `note` la nota de la bitácora si la encontrás. Así los hooks recalculan los DVH. Después corré la verificación de integridad.

### 0.3 Datos bancarios del club

Van en `club.extraInfo.bankInfo`, que ya es JSON, así que no cambia el modelo:
```json
{ "holder": "Club Valencia", "cuit": "30-00000000-0", "bank": "Banco Ejemplo", "cbu": "0000000000000000000000", "alias": "CLUB.VALENCIA.CUOTAS" }
```
- **Seed:** cargá estos datos en `seed/data/club.js`, con `// [PROVISORIO] contexto 2.1`. El seed solo los completa si `bankInfo` no existe.
- **Configuración del club** (P07): sumá una tarjeta "Datos para transferencias" con esos cinco campos. Validaciones: CBU de 22 dígitos; alias de 6 a 20 caracteres, con letras, números y puntos.

## 1. Pago por transferencia

### 1.1 Reglas

1. **Quién y qué cuotas:** los mismos que el pago con tarjeta (`fees.payOwn` o `fees.manageLinked`, cuotas Pendientes o Vencidas, por el total).
2. **El socio:**
   - ve los datos bancarios del club y el **monto exacto**, con un botón para copiar el CBU y el alias;
   - adjunta el **comprobante**: JPG, PNG o PDF, hasta 5 MB.
3. **Se crea un `payment`** con:
   - `method = TRANSFER`;
   - `transactionState = PENDING`;
   - `receiptUrl` y `userId` = quien paga;
   - un `confirmationCode` `TRF-` + 8 caracteres.

   La cuota **no cambia de estado** hasta que el Admin la revisa.
4. **Una sola transferencia en revisión por cuota.** Mientras haya una Pendiente, no se puede pagar esa cuota de otra forma: 409, *"Ya hay una transferencia en revisión para esta cuota."*
5. **Aviso al Admin:** a los usuarios ACTIVE del club con `fees.manage` (calculado con `getEffectivePermissions` sobre sus roles) les llega `PAYMENT_REVIEW_REQUEST` (in-app): *"{nombre} informó una transferencia de ${monto} por la cuota de {mes}."*
6. **Revisión del Admin** (`fees.manage`):
   - **Aprobar:** el pago pasa a Aprobado y la cuota a Pagada. Aplica la **recuperación automática** del P14 y registra `PAYMENT_APPROVED`.
   - **Rechazar:** con un motivo **obligatorio** (de 10 a 300 caracteres, en `note`), el pago pasa a Rechazado y la cuota sigue impaga. Registra `PAYMENT_REJECTED`.

   En los dos casos se avisa `PAYMENT_RESULT` (in-app, con `includeFamily`) a quien pagó y al socio:
   - *"Se aprobó tu transferencia por la cuota de {mes}. Ya podés descargar el comprobante."*
   - *"Se rechazó tu transferencia por la cuota de {mes}: {motivo}. Podés volver a pagarla."*
7. **Mora mientras se revisa:** una cuota con una transferencia **Pendiente** no cuenta para los días de atraso de `getOverdueDays`. Así el socio no queda suspendido ni sin poder ser citado por una demora de la revisión.
   - La cuota sí puede pasar a Vencida si llega al vencimiento sin aprobación.
   - Agregalo en `getOverdueDays`, con un comentario.
8. **Archivo del comprobante:**
   - sube con el middleware `upload`, en la carpeta `receipts`. Ampliá el filtro de tipos **solo para esa carpeta**, para aceptar también PDF;
   - **no** se sirve por `/uploads` público. Se descarga con un endpoint que exige sesión y permiso (punto 1.2);
   - para el P17 (Cloudinary), dejá un comentario: los comprobantes van como recurso `raw` y privados.

### 1.2 Back (`modules/fees/`)

| Método y ruta | Permiso | Qué hace |
|---|---|---|
| `GET /fees/transfer-info` | `fees.payOwn` o `fees.manageLinked` | Los datos bancarios del club |
| `POST /fees/:id/transfer` | `fees.payOwn` o `fees.manageLinked` | `multipart/form-data`, con el archivo `receipt`. Reglas 1.1.1 a 1.1.5 |
| `GET /fees/payments?method=&state=&search=&from=&to=&page=` | `fees.manage` | **Historial de pagos** del club, paginado de a 20: fecha, socio, período, monto, medio, estado, código, quién pagó y si tiene comprobante adjunto. Por defecto, las transferencias Pendientes primero |
| `POST /fees/payments/:id/approve` | `fees.manage` | Regla 1.1.6, solo para transferencias Pendientes |
| `POST /fees/payments/:id/reject` | `fees.manage` | `{ reason }` (regla 1.1.6) |
| `GET /fees/payments/:id/receipt-file` | `fees.manage`, o quien hizo el pago, o el socio de la cuota, o su adulto vinculado | Devuelve el archivo adjunto con su tipo de contenido. Si no hay acceso: 404 |

Sumá a `NOTIFICATION_TYPES` (api) y a `notificationTypes.js` (front):

| Clave | `email` | Ruta en el front |
|---|---|---|
| `PAYMENT_REVIEW_REQUEST` | `false` | `/fees/payments` |
| `PAYMENT_RESULT` | `false` | `/my-fees` (o `/family/fees`) |

## 2. Comprobante de pago (todos los medios)

1. **Cuándo hay comprobante:** todo pago **Aprobado** tiene uno, sin importar el medio. Las transferencias Pendientes o Rechazadas no tienen.
2. **Endpoint:** `GET /fees/payments/:id/voucher`, con el mismo acceso que `receipt-file`. Devuelve:
   - el club (nombre, dirección, CUIT de `bankInfo`, `accentColor`);
   - el número de comprobante (`confirmationCode`) y la fecha y hora de aprobación;
   - el socio (nombre y número de socio) y quién pagó, si fue otra persona (por ejemplo, "Pagó: {adulto}, adulto responsable");
   - el período y el desglose (cuota social, cuota deportiva y total);
   - el medio de pago: "Tarjeta terminada en 1234", "Transferencia bancaria" o "Pago en secretaría".

   Para mostrar los últimos 4 dígitos de la tarjeta sin guardar la tarjeta, sumalos al principio de `payment.note` con el formato `"Tarjeta ****1234"` cuando se aprueba un pago con tarjeta.
3. **Página imprimible** (`/fees/payments/:id/voucher`, `pages/fees/PaymentVoucherPage.jsx`):
   - con el mismo estilo del comprobante del alta (P07): encabezado Bordó con el nombre del club, franja con el `accentColor` y fondo Crema;
   - "COMPROBANTE DE PAGO" y el número en la variante `numeric`;
   - los datos en una tabla clara y el total destacado;
   - al pie: *"Pago simulado — proyecto escolar Club360"*;
   - los botones "Imprimir o guardar como PDF" (`window.print()`) y "Volver";
   - con `@media print`, que deja solo el comprobante.
4. **Dónde aparece:**
   - después de un pago aprobado con tarjeta, en el diálogo de resultado, con el botón **"Ver comprobante"**;
   - en el historial de pagos de "Mis cuotas", de Familia y del estado de cuenta del Admin: un ícono de comprobante en cada pago Aprobado;
   - en el historial de pagos del Admin.

## 3. Front

### 3.1 Diálogo de pago (en "Mis cuotas" y Familia)

Dos pestañas: **"Tarjeta"** y **"Transferencia"**.

**Pestaña "Tarjeta"** (mejoras del formulario):
- **Número:** se muestra en grupos de 4 dígitos separados por guiones mientras se escribe (`4242-4242-4242-4242`); solo acepta números, hasta 19 dígitos; al enviar se mandan solo los dígitos.
- **Vencimiento:** con la barra automática (`MM/AA`).
- **Código:** oculto, de 3 o 4 dígitos.
- **Validación en vivo,** con el mensaje debajo de cada campo.
- Arriba, un ícono de tarjeta y el aviso de pago simulado que ya existe.

**Pestaña "Transferencia":**
- **Paso 1:** los datos del club en una tarjeta (titular, CUIT, banco, CBU y alias), con botones para copiar el CBU y el alias (con un `Snackbar` "Copiado"), y el **monto exacto** en grande (variante `numeric`).
- **Paso 2:** "Adjuntá el comprobante": zona para arrastrar o elegir un archivo (JPG, PNG o PDF, hasta 5 MB), con la vista previa del nombre y del tamaño.
- **Botón "Informar transferencia"** (naranja). Al terminar: *"Recibimos tu comprobante. El club lo va a revisar y te avisamos por acá."*

**En la lista de cuotas:** una cuota con una transferencia en revisión muestra un `StatusChip` `pending` "Transferencia en revisión" y no muestra el botón "Pagar".

### 3.2 Historial de pagos del Admin (`/fees/payments`, `pages/fees/PaymentsHistoryPage.jsx`)

- **Pestañas:** "Transferencias por revisar" (con el contador) y "Todos los pagos".
- **Filtros:** medio, estado, fechas y un buscador por socio.
- **Cada pago muestra:**
  - la fecha;
  - el socio y su número de socio;
  - el período;
  - el monto;
  - el medio, con un chip: Tarjeta, Transferencia o Secretaría;
  - el estado, con `StatusChip`: Aprobado `ok`, Pendiente `pending`, Rechazado `overdue`;
  - el código.
- **Revisión de una transferencia:** un `Drawer` con el comprobante adjunto (imagen embebida, o PDF en un `iframe` o con un link para abrirlo), los datos de la cuota y el monto esperado, y los botones **"Aprobar"** y "Rechazar" (este con el motivo obligatorio).
- **En los pagos aprobados:** el ícono del comprobante de pago.
- **Menú:** sumá a `navigation/menu.js` "Pagos" → `/fees/payments`, en el grupo Gestión, con `fees.manage`. Desde `FeesPage`, sumá también un link "Ver historial de pagos" con el contador de transferencias por revisar.

### 3.3 Rutas y llamadas

- Agregá a `AppRouter`:
  - `/fees/payments`, con `fees.manage`;
  - `/fees/payments/:id/voucher`, para cualquier usuario con sesión: el back controla el acceso.
- Agregá las llamadas a `fees.api.js`. El archivo del comprobante se pide con axios (`responseType: 'blob'`), así viaja con el token.

## 4. Casos de prueba documentados

Sumá a `docs/pruebas/fees.txt`:
- informar una transferencia con comprobante;
- informarla sin archivo (rechazado);
- un archivo de otro tipo o de más de 5 MB (rechazado);
- una segunda transferencia de la misma cuota en revisión (rechazado);
- el aviso al Admin;
- aprobar (cuota Pagada, comprobante disponible y aviso);
- rechazar sin motivo (rechazado);
- rechazar con motivo (aviso y cuota todavía impaga);
- volver a pagar después del rechazo;
- una transferencia en revisión que no suma mora;
- descargar el comprobante adjunto siendo de otro socio (404);
- el comprobante de pago con tarjeta, transferencia y secretaría;
- el número de tarjeta con guiones mientras se escribe.

## 5. Documentación del repo

No modifiques `CLAUDE.md` ni `docs/contexto.md`: ya vienen con estas reglas. Si ves que no las incluyen, avisame.

## 6. Verificación

### 6.1 Back

Hacelo con un script temporal **fuera del repo**:

1. **Cambio en el modelo:** después del restore, las columnas nuevas existen, los pagos `SEC-` quedaron con `method = CASH` y la integridad da correcta.
2. **Transferencia:** las reglas 1.1.1 a 1.1.5, con un archivo de prueba; el aviso llega a los usuarios con `fees.manage`.
3. **Revisión:**
   - aprobar → cuota Pagada y `PAYMENT_RESULT`;
   - con un socio SUSPENDED → se recupera;
   - rechazar sin motivo → 400;
   - con motivo → Rechazado y aviso.
4. **Mora:** con una cuota vencida hace más de `delayFee` días y una transferencia Pendiente por ella, `getOverdueDays` no la cuenta.
5. **Acceso al archivo:** quien pagó, el socio, su adulto y el Admin pueden; otro socio → 404; sin sesión → 401. `/uploads/receipts/...` no es accesible directo.
6. **Comprobante:** `voucher` de un pago aprobado con cada medio trae los datos correctos (con la tarjeta, los últimos 4 dígitos); de uno Pendiente → 404.
7. **Integridad:** la verificación de DVH/DVV del P03 da todo correcto.

### 6.2 Front

1. `npm run build` compila sin errores. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano en el navegador:
   - pagar con tarjeta, ver los guiones y descargar el comprobante;
   - informar una transferencia con una foto;
   - entrar como Admin, revisarla y aprobarla;
   - ver el comprobante desde "Mis cuotas";
   - imprimirlo como PDF;
   - las pantallas en tamaño celular.

### 6.3 Cierre

1. **Actualizá `docs/TODO.md`:** en la Fase 5, sumá y marcá:
   - *"Pago por transferencia con comprobante adjunto y revisión del Admin (P14b)"*;
   - *"Comprobante de pago imprimible para todos los medios (P14b)"*;
   - *"Historial de pagos del Admin (P14b)"*.

   Agregá la línea al Registro.
2. Mostrame el resultado de la verificación y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
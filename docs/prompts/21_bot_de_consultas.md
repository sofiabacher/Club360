# Prompt 21 — Bot de consultas (versión liviana en Node)

Vas a hacer el bot de consultas de Club360: un asistente con menú de botones y texto libre que responde dudas **generales** sobre el club y sobre cómo usar la plataforma. Solo aparece con la sesión iniciada y cuando el rol activo tiene `bot.use` (Socio, Jugadora y Familia).

**Cambio de diseño (15/11/2026):** la guía original (`Club360_Bot_Guia_de_Traspaso.md`) proponía un servicio aparte en Python (Flask con TensorFlow). No entra en la demo publicada: Render gratis tiene 512 MB y un segundo servicio en la misma cuenta se come las horas del back. Se mantiene todo el comportamiento de la guía (menú por rol, botones, texto libre, sugerencias, fallback, reglas y privacidad), pero el clasificador va **dentro del back, en Node**, como un módulo más: `bot`.

Antes de empezar:
- leé `CLAUDE.md` y en `docs/contexto.md` la sección 9 ("Bot de consultas") y todas las reglas que el bot explica (secciones 3, 4 y 6);
- mirá `utils/permissions.js`, `getEffectivePermissions`, `utils/logger.js`, `DashboardLayout`, `navigation/menu.js`, y cómo se leen los datos del club (`club` y `club.extraInfo`).

**Alcance:**
- **Se hace:**
  - el módulo `bot`: base de conocimiento, clasificador, endpoints, bitácora y feedback;
  - el widget en React;
  - el script de evaluación con sus resultados;
  - los casos de prueba y la verificación.
- **No se hace:**
  - IA generativa ni APIs externas: funciona sin conexión a ningún servicio;
  - respuestas con datos personales;
  - Python.
- **No** hagas commit.

## 1. Reglas del bot

1. **Quién lo usa:** con `bot.use` en los permisos efectivos. El bot arma su menú según un **grupo**, que se calcula **por permisos, nunca por el nombre del rol**:
   - `jugadora`: tiene `citations.respond`;
   - `familia`: si no, tiene `fees.manageLinked`;
   - `socio`: en cualquier otro caso.

   Sin `bot.use`: 403. Un usuario con más de un rol ve el bot solo mientras su rol activo lo habilita, y el menú cambia al cambiar de rol.
2. **Qué no hace:**
   - **No accede a datos personales:** a "¿cuánto debo?" o "¿me citaron?" responde **dónde** verlo en la plataforma;
   - **no lista partidos:** explica dónde ver el fixture;
   - **no informa valores que configura el Admin:** días de mora, margen de conflicto, montos de las cuotas. Dice "el plazo que fija el club" o "el valor que fija el club";
   - **sí informa las reglas fijas del sistema:** citar desde 7 días hasta 48 horas antes del partido, 24 horas para responder, cuota que se genera el día 1 y vence el 10, 7 días para registrar una rutina.
3. **Datos del club:** contacto, horarios, dirección y canchas salen de la base (`club` y `club.extraInfo`), no de un archivo aparte. No son datos personales. Si un dato falta, responde *"Todavía no tengo ese dato cargado; consultalo directamente en el club."*
4. **Interacción:**
   - **un botón** manda la intención directo, sin pasar por el clasificador;
   - **el texto libre** pasa por el clasificador:
     - con confianza **≥ `BOT_THRESHOLD`:** responde;
     - **entre `BOT_SUGGEST_THRESHOLD` y `BOT_THRESHOLD`:** *"No estoy seguro de haber entendido. ¿Quisiste decir…?"*, con hasta 3 intenciones como botones;
     - **por debajo, o si gana `fuera_de_tema`:** el fallback, con el contacto del club y el menú.
   - Si gana una intención que no es visible para el grupo: *"Esa consulta corresponde a otro perfil de usuario."* y el menú.
   - **Después de cada respuesta:** los botones de seguimiento de esa intención (si tiene), "Volver al menú", "Contactar al club" y 👍/👎.
5. **Privacidad:**
   - **Si el texto parece tener datos personales** (7 o más dígitos seguidos, o un email): responde *"Por tu seguridad, no compartas datos personales en el chat."* y **no** guarda el texto en ningún lado.
   - **Mensajes:** de hasta 300 caracteres.
   - **Límite de uso:** 30 mensajes por minuto por usuario, con `express-rate-limit`. Al pasarlo: 429, *"Esperá un momento antes de seguir escribiendo."*
6. **Respuestas:**
   - **Cortas** (de 2 a 4 líneas), en español rioplatense con voseo.
   - **Una sola respuesta fija** por intención informativa. Solo `saludo` y `despedida` pueden variar.
   - **Redactadas solo con lo que dice `docs/contexto.md`.** Si algo no está definido, no lo inventes: avisame.

## 2. Base de conocimiento

`api/src/modules/bot/knowledge/intents.json`, con este esquema (el de la guía, adaptado):

```json
{
  "categories": [{ "id": "citaciones", "order": 5, "label": "Citaciones" }],
  "screenPriority": { "citations": "citaciones", "fees": "cuotas" },
  "intents": [
    {
      "tag": "citacion_responder",
      "category": "citaciones",
      "button": true,
      "groups": ["jugadora"],
      "label": "¿Cómo confirmo o rechazo una citación?",
      "patterns": ["como confirmo una citacion", "cuanto tiempo tengo para responder la citacion"],
      "response": "Tenés 24 horas desde que te citan para confirmar o rechazar...",
      "followUps": ["citacion_que_es"]
    }
  ]
}
```

- **Marcadores** que se reemplazan con los datos del club: `{club_nombre}`, `{club_contacto}`, `{club_horarios}`, `{club_direccion}` y `{club_canchas}`.
- **Patrones:** de 12 a 20 por intención, en cantidades parecidas entre intenciones. Con variantes con y sin tildes, voseo y tuteo, frases cortas ("cuotas") y largas, y algún error de tipeo común.

### 2.1 Categorías e intenciones

**Visible para:** `todos` = `socio`, `jugadora` y `familia`.

| Categoría | Intención | Qué tiene que decir | Visible para |
|---|---|---|---|
| **Empezar** | `empezar_hacerme_socio` | Para que otra persona se haga socia, se acerca al club; el Admin la da de alta y le entrega el número de socio, con el que se registra (con su fecha de nacimiento) | todos |
| | `empezar_codigo_vinculo` | Cada socio menor tiene un código de un solo uso para su adulto responsable. Viene en el comprobante del alta y se ve en el perfil del menor mientras no se usó. El adulto entra en "Vincularme como Familia" desde el login, o desde Mi cuenta si ya tiene usuario | todos |
| | `empezar_mayoria_edad` | Al cumplir 18 se detecta solo: puede desvincularse del adulto desde Mi cuenta y pagar sus propias cuotas | todos |
| | `cuenta_mis_datos` | En Mi cuenta se cambian el email, el teléfono, la foto y la contraseña; el resto (nombre, DNI, fecha de nacimiento, usuario) lo cambia el club | todos |
| **Cuotas y pagos** | `cuotas_como_pagar` | Se paga desde Mis cuotas (o las cuotas de la jugadora, en Familia), por el total: con tarjeta (pago simulado) o por transferencia, o en la secretaría. Si es menor, paga su adulto | todos |
| | `cuotas_transferencia` | Muestra los datos del club y el monto, se transfiere y se adjunta el comprobante (JPG, PNG o PDF). El club la revisa y avisa; mientras está en revisión, esa cuota no suma atraso | todos |
| | `cuotas_comprobante` | Todo pago aprobado tiene un comprobante para imprimir o guardar en PDF, en el historial de pagos | todos |
| | `cuotas_vencimiento` | La cuota se genera el día 1 y vence el 10. Cuota social, más una deportiva por cada deporte. Sin montos | todos |
| | `cuotas_atraso` | Se avisa al vencer y cada 30 días; pasado el plazo que fija el club, la socia queda suspendida y no se la puede citar, y se recupera sola al pagar. **Sin la cantidad de días** | todos |
| **Deportes** | `deporte_inscripcion` | Desde "Deportes", el socio pide la inscripción; el Representante la aprueba y pasa a ser Jugadora | socio, jugadora |
| | `deporte_baja` | Desde "Deportes", es inmediata: sale de sus categorías, se cancelan sus citaciones futuras de ese deporte y la cuota deportiva deja de generarse desde el mes siguiente | socio, jugadora |
| **Ligas y partidos** | `liga_que_es` | Las ligas son las competencias; las categorías, los grupos por edad. El Representante las arma y asigna a las jugadoras | jugadora, familia |
| | `fixture_donde_ver` | En "Mis partidos" (o los partidos de la jugadora, en Familia): "Próximos" y "Jugados", separados por categoría si juega en dos ligas | jugadora, familia |
| | `fixture_conflicto` | Cuando dos partidos de una jugadora en distintas categorías se superponen; las entrenadoras eligen cuál juega, y en el otro aparece "No jugás este partido". **Sin el margen** | jugadora, familia |
| | `partidos_resultados` | En la pestaña "Jugados": el resultado de cada partido y la campaña de la categoría (ganados, perdidos y racha) | jugadora, familia |
| **Citaciones** | `citacion_que_es` | Es la convocatoria a un partido. La entrenadora cita desde 7 días hasta 48 horas antes; llega como aviso y por email | jugadora, familia |
| | `citacion_responder` | 24 horas para confirmar o rechazar; rechazar pide una justificación; sin respuesta, queda confirmada sola. La responde siempre la jugadora, aunque sea menor | jugadora, familia |
| **Rutinas y seguimiento** | `rutina_donde_ver` | En "Mi rutina", una rutina por día de entrenamiento, con texto, imagen o video, e historial por semana | jugadora |
| | `seguimiento_registro` | En la rutina del día, "¿Cómo te fue?": completada, parcial o no la hice, esfuerzo del 1 al 5 y una nota, hasta 7 días después | jugadora |
| | `seguimiento_objetivos` | En "Mi progreso": texto y fecha límite; se marcan como cumplidos o abandonados | jugadora |
| | `seguimiento_progreso` | En "Mi progreso": cumplimiento, esfuerzo y racha, con gráficos por semana. La preparadora física también lo ve | jugadora |
| **Notificaciones** | `notificaciones` | Todas en la campana; algunas también por email (citación, partido cancelado, cuota vencida y mora, suspensión y avisos generales si el club lo elige) | todos |
| **Familia** | `familia_varios_hijos` | Un adulto puede vincularse a varios menores, cada uno con su código, y ser socio por su cuenta: elige con qué rol entrar | familia |
| | `familia_que_veo` | Los partidos (próximos y jugados) y las citaciones de sus jugadoras, en solo lectura, y sus cuotas para pagarlas. No responde citaciones ni ve el seguimiento personal | familia |
| **El club** | `club_contacto` | `{club_contacto}` | todos |
| | `club_horarios` | `{club_horarios}` | todos |
| | `club_direccion` | `{club_direccion}` y `{club_canchas}` | todos |

**De redirección** (`button: false`, solo con texto libre). Nunca devuelven el dato:

| Intención | Respuesta |
|---|---|
| `personal_cuotas` | *"Eso lo ves en tu estado de cuenta, en Mis cuotas."* (en Familia, en las cuotas de la jugadora) |
| `personal_citacion` | *"Tus citaciones las ves en el inicio y en Mis partidos."* |
| `personal_rutina` | *"Tu rutina la ves en Mi rutina."* |

**De sistema** (`button: false`): `saludo` (devuelve el menú), `despedida` y `fuera_de_tema` (de 15 a 20 frases ajenas al club: recetas, clima, otros deportes, tareas del colegio).

**Las respuestas que dicen dónde ver algo** usan los nombres reales del menú (`navigation/menu.js`). Si un texto de la tabla no coincide con cómo quedó la pantalla, usá el de la pantalla y contame.

### 2.2 Pantalla → categoría que va primero

El front manda `screen`, la primera parte de la ruta (`/my-fees` → `my-fees`). En `screenPriority`, asociá las rutas reales del menú con su categoría: cuotas, partidos, citaciones, rutinas y progreso, deportes, notificaciones, Mi cuenta (Empezar) y El club. Cualquier otra pantalla usa el orden por defecto.

## 3. Clasificador (`modules/bot/bot.classifier.js`)

Sin red neuronal: **similitud de coseno con TF-IDF** sobre los patrones, en JavaScript.

1. **Normalización** (una sola función, usada para los patrones y para el texto del usuario):
   - minúsculas;
   - sin tildes;
   - sin signos;
   - tokens;
   - stopwords en español, **sin** sacar "no" ni "si", que cambian el sentido;
   - stemming en español con `natural` (`PorterStemmerEs`).
2. **Entrenamiento al arrancar:** se arma el vocabulario y el IDF con todos los patrones, y un vector por patrón. Tarda milisegundos, así que no se guarda ningún modelo.
3. **Clasificar:**
   - la confianza de cada intención es la **mayor similitud** entre el texto y sus patrones;
   - devuelve las intenciones ordenadas, con su confianza.
4. **Constantes** en `utils/constants.js`: `BOT_THRESHOLD` y `BOT_SUGGEST_THRESHOLD`. Empezá con 0,5 y 0,25 y **calibralos con la evaluación** (punto 6).
5. **Validación del conocimiento:** al arrancar, `bot.service.js` revisa que:
   - los tags sean únicos;
   - las categorías y los grupos existan;
   - cada `followUp` exista;
   - los marcadores sean válidos;
   - cada intención con botón tenga `label`.

   Si algo falla, el servidor no arranca y lo dice.

## 4. Back (módulo `bot`, el número 16)

| Método y ruta | Permiso | Qué hace |
|---|---|---|
| `GET /bot/menu?screen=` | `bot.use` | El saludo y las categorías del grupo (solo las que tienen al menos una intención con botón visible), con sus preguntas. La categoría de la pantalla va primero |
| `POST /bot/chat` | `bot.use` | `{ type: "text" \| "button", message?, intent?, screen? }`. Reglas del punto 1. Responde `{ responseType, response, intent, confidence, buttons, interactionId }` |
| `POST /bot/feedback` | `bot.use` | `{ interactionId, useful: true \| false }` |

- **`responseType`:** `answer`, `suggestions`, `fallback`, `blocked` (datos personales) u `other_profile`.
- **`confidence`:** `null` en los botones.
- **`buttons`:** `{ type: "intent" | "menu", value, label }`.
- **Un `intent` de botón que no existe o no es visible para el grupo:** se trata como `other_profile`, sin error.
- **Validaciones:**
  - `type` obligatorio;
  - `message` de 1 a 300 caracteres si es texto;
  - `intent` obligatorio si es botón.
- **Bitácora** (`LOG_ACTIONS`):
  - `BOT_INTERACTION` (criticidad Baja), por cada consulta: en `details`, el `interactionId`, el grupo, la pantalla, el tipo, la intención, la confianza y el `responseType`. **Nunca el texto del usuario.**
  - `BOT_UNANSWERED` (Baja), solo en los fallbacks y sin datos personales: el texto, **sin `userId` ni `roleId`** (en NULL), para poder mejorar la base de conocimiento.
  - `BOT_FEEDBACK` (Baja): el `interactionId` y si fue útil. La bitácora no se edita: el feedback es un registro aparte.
- **Dependencias nuevas:** `natural` y `express-rate-limit`.
- **Montaje:** el módulo se monta en `app.js` como `/bot`. No tiene tablas, así que no va en `CLUB_TABLES` ni en `TABLE_LABELS`.

## 5. Widget (`components/bot/ChatBot.jsx`)

1. **Dónde aparece:** se monta en `DashboardLayout`, solo si `usePermission('bot.use')`. Aparece y desaparece al cambiar de rol. No está en las pantallas públicas.
2. **El botón flotante** abajo a la derecha:
   - un `Fab` Marino con el ícono `SmartToyRounded` o `ChatRounded`. **No naranja:** el naranja queda para la acción principal de cada pantalla;
   - en el celular, por encima de la barra inferior si la hay.
3. **La ventana:**
   - en la compu, un panel de unos 380 × 560 px;
   - en el celular, pantalla completa;
   - encabezado Marino con "Asistente de {club}" y el botón de cerrar.
4. **Los mensajes:**
   - burbujas: las del usuario a la derecha, en Azul; las del bot a la izquierda, en blanco, y en Crema el fallback;
   - debajo de cada respuesta, los botones como `Chip` clickeables;
   - las sugerencias, con el texto "¿Quisiste decir…?".
5. **Al abrir:** el saludo y las categorías en una grilla de 2 columnas. Al tocar una categoría, sus preguntas.
6. **El campo de texto:**
   - con el contador de 300 caracteres;
   - el botón de enviar se deshabilita mientras espera;
   - "Escribiendo…" con tres puntos animados;
   - debajo, fijo: *"No compartas datos personales."*
7. **Feedback:** 👍/👎 chiquitos en cada respuesta; al tocar uno, *"¡Gracias!"*.
8. **Errores:** si la llamada falla (por ejemplo, el back se está despertando), una burbuja con *"El asistente no está disponible en este momento. Reintentá en unos minutos."* El widget sigue andando. Un 401 se maneja como el resto del front.
9. **El historial vive en el estado del componente:** se pierde al recargar, y eso está bien.
10. Llamadas en `api/bot.api.js`. Todo con los colores del tema.

## 6. Evaluación (evidencia para la etapa de Prueba)

1. **Set de prueba:** `api/src/modules/bot/knowledge/test-questions.json`, con **al menos 5 preguntas por intención, distintas de los patrones** (sin tildes, con errores de tipeo, más largas, más cortas), más 15 frases fuera de tema.
2. **Script:** `npm run bot:eval` (`api/scripts/botEval.js`). Calcula:
   - la precisión total y por intención;
   - la matriz de confusión;
   - los errores (la pregunta, lo esperado y lo obtenido);
   - cuántas preguntas fuera de tema terminan en fallback.

   Lo guarda en `docs/pruebas/bot-evaluacion.txt`, con la fecha y los umbrales usados.
3. **Meta:** **90 % o más** sobre el set de prueba y todas las frases fuera de tema en fallback o sugerencias.
   - Si no llega: sumá patrones donde se confunde y ajustá los umbrales (nunca sumes al entrenamiento las mismas frases del set de prueba).
   - Mostrame la primera y la última corrida.

## 7. Datos de la demo y documentación del repo

- **`docs/demo-usuarios.md`:** sumá a lo que queda listo para hacer en vivo:
  - *"Abrir el asistente como Camila desde Mis cuotas (aparece primero 'Cuotas y pagos'), preguntar '¿cómo pago por transferencia?' y '¿cuánto debo?' (redirige, no da el monto)"*;
  - *"Entrar como Carla (Entrenadora): el asistente no aparece"*.
- **`README.md`:** en la lista de funciones, sumá el asistente.
- **No modifiques `CLAUDE.md` ni `docs/contexto.md`:** ya vienen con estas reglas. Si ves que no las incluyen, avisame.

## 8. Casos de prueba documentados (`docs/pruebas/bot.txt`)

- **Menú por grupo:** jugadora, socio y familia, con la categoría de la pantalla primero.
- **El usuario con dos roles:** Gabriela como Socio y como Familia.
- **Botón y texto libre:**
  - un botón;
  - un texto claro;
  - un texto ambiguo ("citación") → sugerencias;
  - fuera de tema ("receta de milanesas") → fallback.
- **Reglas:**
  - la intención de otro perfil (forzando el tag) → `other_profile`;
  - "¿cuánto debo?" → redirige sin el monto;
  - un texto con un DNI → `blocked`, y no queda en la bitácora;
  - ninguna respuesta tiene los días de mora, el margen o montos.
- **Acceso:**
  - sin sesión (401);
  - con Entrenadora o Admin (403, y el widget no aparece);
  - el límite de 30 por minuto (429).
- **Bitácora y feedback:** `BOT_INTERACTION` sin texto, `BOT_UNANSWERED` sin usuario y el 👍/👎.
- **Robustez:** el widget con el back caído.

## 9. Verificación

### 9.1 Back

Con un script temporal **fuera del repo**, contra la base **local**:

1. **Arranque:**
   - el conocimiento valida;
   - un `intents.json` roto a propósito (tag repetido) frena el arranque con un mensaje claro;
   - devolvelo a la normalidad.
2. **Cada rama del punto 1.4 con `curl` o el script:** botón, texto claro, ambiguo, fuera de tema, otro perfil, dato personal, mensaje de 301 caracteres.
3. **Acceso:** sin token 401; Entrenadora 403; Gabriela con rol Familia y con rol Socio, menús distintos.
4. **Privacidad:** después de las pruebas, ningún registro `BOT_INTERACTION` tiene el texto, y los `BOT_UNANSWERED` tienen `userId` en NULL.
5. **Evaluación:** `npm run bot:eval` llega a la meta del punto 6.3.
6. **Integridad:** la verificación de DVH/DVV da todo correcto.

### 9.2 Front

1. `npm run build` compila sin errores. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano:
   - Camila desde Mis cuotas y desde Mi rutina;
   - Gabriela cambiando de rol;
   - Carla (sin widget);
   - el celular.

### 9.3 Cierre

1. **Actualizá `docs/TODO.md`:**
   - marcá la tarea del bot de consultas (*"Bot de consultas en Node dentro del back, sin Flask (P21)"*);
   - sumá y marcá *"Evaluación del bot con set de prueba (P21)"*.

   Agregá la línea al Registro.
2. Mostrame:
   - el resultado de la verificación;
   - la precisión de la primera y la última corrida de la evaluación, y los umbrales que quedaron;
   - los textos que no pudiste redactar con lo que dice el contexto;
   - cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.

## 10. Con la demo publicada

No cambia la base ni suma variables de entorno. Render instala las dependencias nuevas (`natural` y `express-rate-limit`) solo al publicar. Alcanza con integrar a `main` y esperar *Deploy live*.
# CLUB360 — Proyecto Integrador (Colegio)
Plataforma de gestión para clubes deportivos. Módulo desarrollado en profundidad: **Vóley, club Valencia**.

Este documento es el contexto acumulado del proyecto. Está pensado para pegarse como "conocimiento del proyecto" en Claude, de forma que cualquier chat nuevo pueda continuar el trabajo sin perder las decisiones ya tomadas. Todo lo que figura acá está **definido y acordado** salvo que se indique lo contrario.

**Convenciones del documento:**
- Cada regla vive en **un solo lugar**; en el resto del documento se referencia con "ver sección X". Si una regla cambia, se actualiza solo en su lugar de origen.
- `[A DEFINIR]` marca una contradicción o ambigüedad que necesita una decisión explícita. `[COMPLETAR]` marca datos que faltan cargar. `[PROVISORIO]` marca datos inventados para avanzar, que se reemplazan por los reales más adelante.

**Última actualización (04/10/2026) — reducción de alcance:** se adelantó la fecha de entrega y se recortó el MVP. Salen del MVP (pasan a Futuro, sección 7): módulo de seguimiento personal de la jugadora, tienda de merch y panel de SuperAdmin (reemplazado por un script de carga inicial). El caso real pasa a ser el club **Valencia** (antes CAPAL). Se definieron dos tipos de cuota: social y deportiva (ver sección 6).

**Última actualización (10/10/2026) — DER lógico final:** el DER lógico definitivo (24 entidades, nombres de tabla/campo en inglés camelCase, igual que el código Sequelize) queda como **imagen adjunta al conocimiento del proyecto**. Incorporó varios ajustes respecto de la primera versión del modelo — ver el detalle en sección 8.

**Última actualización (11/10/2026) — catálogo de permisos y seed:** se definió el catálogo de 41 permisos (ver sección 4) y los datos iniciales del seed (ver sección 2).

**Última actualización (11/10/2026) — ajustes al DER para los modelos:** contraseña nullable, adulto responsable como FK a `user`, campos en camelCase y política de FK y borrado (ver sección 8).

**Última actualización (10/10/2026) — estructura del proyecto:** se definió la estructura del repositorio, la organización del código por módulos, el stack completo y las convenciones técnicas (ver sección 11). El bot de consultas queda fuera del repo hasta decidir si entra en el trabajo (ver sección 9).

**Última actualización (18/10/2026) — valores de los estados:** se cerraron los valores numéricos de todos los campos de estado (ver sección 8), la recuperación automática del Socio suspendido por mora y la cancelación de citaciones de un partido cancelado (ver sección 6). Los resultados de los partidos quedan en Futuro como prioridad 1 si sobra tiempo (ver sección 7).

**Última actualización (21/10/2026) — recuperación de contraseña y Mi cuenta:** link por email que vence en 1 hora y desbloquea la cuenta, y qué datos puede modificar cada usuario (ver 3.6.1, 3.6.2 y 3.7).

**Última actualización (21/10/2026) — cierre de decisiones abiertas:**
- **Club y vínculo familiar:** datos provisorios de Valencia (ver 2.1) y entrega del código de vínculo en el comprobante del alta (D3, ver 3.5).
- **Deportes y cuotas:** baja inmediata de un deporte (D4, ver 3.3.1) y una cuota deportiva por cada deporte (D6, ver sección 6).
- **Notificaciones y emails:** canal de cada notificación (D5, ver sección 6) y emails con Gmail SMTP (ver sección 11).
- **Deploy y pruebas:** imágenes en Cloudinary en producción (D7) y front en Vercel (ver sección 11); casos de prueba documentados en `.txt` (D9, ver sección 11).
- **Prioridades si sobra tiempo:** primero los resultados de partidos, después el bot (D11, ver sección 7).
- **Particiones:** no se implementan porque no son requisito (ver sección 0).

**Última actualización (09/11/2026) — bitácora, integridad y copias de seguridad:** el backup y la restauración son por club, se restauran desde la lista del servidor o subiendo un archivo, y si la verificación de integridad encuentra un registro alterado el club queda bloqueado para todos menos quienes administran la integridad y los backups (ver sección 6, sección 10 y sección 11).

**Última actualización (08/11/2026) — rutinas y paneles de inicio:** la rutina se carga por día de entrenamiento (campo nuevo `routine.dayOfWeek`), la preparadora edita la semana actual y las futuras, y se definieron los paneles de inicio de la Jugadora y de la Familia (ver sección 6 y sección 8).

**Última actualización (08/11/2026) — pago por transferencia y comprobantes:** el Socio puede pagar por transferencia con los datos bancarios del club y adjuntar el comprobante, que revisa el Admin desde un historial de pagos; todo pago aprobado tiene un comprobante de pago imprimible; `payment` suma `method`, `receiptUrl` y `note` (ver 2.1, sección 6 y sección 8).

**Última actualización (08/11/2026) — cuotas y pagos:** se cerró la D12 (la cuota se genera el día 1 y vence el 10), desde cuándo paga un socio nuevo, cálculo de los montos, avisos de vencimiento y de mora, pago simulado, pago en secretaría y recuperación automática (ver sección 6). La baja de un deporte cancela también las citaciones confirmadas de partidos futuros (ver 3.3.1).

**Última actualización (05/11/2026) — inscripciones y ajustes a citaciones:** reglas para pedir, aprobar y rechazar inscripciones (solo socios activos), aviso al Representante de cada solicitud, ventana para citar de 7 días a 48 horas antes del partido y aviso a las entrenadoras cuando una jugadora responde (ver 3.3 y sección 6).

**Última actualización (05/11/2026) — citaciones:** cálculo de la mora para citar, cancelación de una citación por la entrenadora, y aviso a la jugadora y cancelación de la citación del partido no elegido cuando se resuelve un conflicto de horario (ver sección 6).

**Última actualización (01/11/2026) — partidos y superposiciones:** duración asumida de 2 horas por partido para calcular superposiciones, cómo se registra la resolución de un conflicto, local o visitante con el campo `game.isHome`, temporada automática y reglas para editar, marcar como jugado y cancelar (ver sección 6 y sección 8).

**Última actualización (01/11/2026) — detalle e historial de notificaciones:** ventana flotante para ver una notificación completa, historial de avisos enviados con lectura y campo `batchId` en `notification` (ver sección 6 y sección 8).

**Última actualización (31/10/2026) — notificaciones:** a quién le llegan los avisos generales según el permiso de quien envía, envío de emails después de confirmar la operación y destinatarios sin email (ver sección 6, "Canal de cada notificación").

**Última actualización (28/10/2026) — ligas y categorías:** alcance del Representante por deporte, escalas de edad del vóley con validación de la edad máxima, quiénes se pueden asignar a una categoría y bajas lógicas de ligas, categorías y asignaciones (ver sección 6, "Ligas y categorías", y sección 8).

**Última actualización (23/10/2026) — staff y vínculo familiar:** activación de la cuenta del staff por email, varios roles de staff por persona, baja de staff que conserva el rol Familia, circuito "Vincularme como Familia" y desvinculación por mayoría de edad (ver 3.4, 3.5, 3.6 y sección 8).

**Última actualización (21/10/2026) — club y alta de socios:** formato del número de socio y del código de vínculo, datos obligatorios del alta, socios que ya tienen usuario, baja y reactivación (ver 3.1); email opcional para menores, teléfono cifrado y campos nuevos de `club` para el color y la información general (D13, ver sección 8).

**Última actualización (21/10/2026) — gestión de roles y permisos:** reglas para editar roles base, permisos bloqueados del rol Admin del Club, qué roles se asignan a mano y cuáles desde su circuito, y eliminación de roles (ver sección 4, "Gestión de roles y permisos").

**Última actualización (18/10/2026) — diseño visual:** se adoptó el moodboard "Propuesta 1" como referencia del front: paleta, colores de estado, tipografías, íconos y texturas (ver sección 11). El color propio de Valencia quedó con un valor provisorio el 21/10/2026.

**Última actualización (18/10/2026) — login y sesión:** registro con número de socio y fecha de nacimiento, bloqueo por intentos, roles disponibles según la condición de socio y elección del rol al entrar (ver 3.1 y 3.6.1).

---

## 0. Contexto de la consigna escolar

El proyecto integrador sigue el ciclo de vida de desarrollo de software (Ingeniería de Sistemas, Análisis, Diseño, Codificación, Prueba, Utilización, Mantenimiento) y debe entregar, entre otras cosas: documento de Visión, requisitos funcionales/no funcionales, actores del sistema, participantes del equipo, descripción de escalabilidad, DER lógico, Diagrama de Clases, Diagrama General de Casos de Uso, especificación de funcionalidad, manuales de usuario, y debe implementar seguridad (login/roles, encriptación, dígitos verificadores, patentes y familias), bitácora, estrategias de base de datos (backup/restore, integridad), manejo de idiomas. **Decisión: la plataforma tendrá un único idioma, español.** **Decisión (21/10/2026): no se implementan particiones de la base, porque no son requisito del trabajo** (quedan en Futuro, sección 7).

**Fecha de entrega:** fines de noviembre (fecha exacta [COMPLETAR]). **Objetivo interno: tener todo listo a mediados de noviembre.**

**Equipo de colegio:** 4 integrantes — Sofía Bacher, Thiago Chaile, Ignacio Jericó, Julián Prol. Roles y tareas de cada uno: aún sin definir.

---

## 1. Visión general y objetivo

Club360 es una plataforma pensada para que **cualquier club deportivo** pueda gestionar su operación diaria: socios, cuotas, deportes, ligas, categorías, fixtures, citaciones, rutinas y notificaciones.

El sistema nace con **arquitectura multi-club** desde el diseño (ver sección 2).

**Problema que resuelve:** los clubes gestionan hoy, de forma manual y fragmentada, la coordinación entre ligas de competencia, categorías, entrenadores, preparadores físicos, deportistas y sus familias — cuotas, fixtures, formaciones, citaciones, rutinas.

**Diferencial clave:** detección automática de superposiciones de horario cuando un deportista participa en más de una liga/categoría.

**Alcance de desarrollo:** el desarrollo y la defensa del proyecto se construyen y prueban en profundidad sobre **un solo caso de uso real: el club Valencia y su módulo de Vóley**. Otros deportes y otros clubes quedan preparados a nivel de arquitectura, pero no se cargan con datos reales ni se desarrollan funcionalmente en esta etapa.

---

## 2. Arquitectura multi-club (nivel plataforma)

- Multi-tenant: cada club tiene sus datos aislados. Toda entidad de negocio relevante (Socio, Liga, Fixture, Cuota, etc.) está asociada a un `club_id`, y el backend filtra todo por el club del usuario logueado. Sin SuperAdmin en el MVP, todo Usuario pertenece siempre a un club (`club_id NOT NULL`, ver sección 8).
- **Catálogo de Deportes**: lista maestra de la plataforma (Vóley, Futsal, Básquet...). Cada club activa los que ofrece. Valencia activa solo Vóley.
- **Carga inicial por script (seed), sin panel de SuperAdmin en el MVP:** un script inserta el club, el catálogo de deportes, la activación de Vóley para el club y el usuario Admin del club. A partir de ahí el Admin opera desde la aplicación.
- **Seed de Valencia (11/10/2026):** margen de conflicto inicial de **60 minutos** y días de atraso 180. Los datos de contacto y los valores de las cuotas son provisorios (ver 2.1) y se cargan en `seed/data/club.js`. Los datos del usuario Admin se toman del `.env` (`SEED_ADMIN_*`), no del código. El seed es idempotente.
- **Argumento de Escalabilidad:** agregar un club nuevo no requiere rediseño ni cambios de código, solo correr el script con otros datos. El panel de SuperAdmin queda en Futuro (sección 7).

**2.1 Datos del club Valencia `[PROVISORIO]` (inventados el 21/10/2026, decisión D2)**

Se usan para el seed, los datos de prueba, la pantalla "El club" y el bot. Se reemplazan por los reales cuando estén. Son ficticios a propósito (dominio `.example`, teléfonos de relleno).

- **Nombre:** Club Valencia.
- **Sede:** Av. Ejemplo 1234, Ciudad de Buenos Aires.
- **Contacto:** teléfono (011) 4000-0000, WhatsApp 11 5000-0000, email `contacto@clubvalencia.example`.
- **Horario de secretaría:** lunes a viernes de 9 a 13 y de 16 a 21; sábados de 9 a 13.
- **Datos para transferencias (08/11/2026):** titular Club Valencia, CUIT 30-00000000-0, Banco Ejemplo, CBU 0000000000000000000000, alias CLUB.VALENCIA.CUOTAS. Se guardan en `club.extraInfo.bankInfo` y los edita el Admin.
- **Canchas de Vóley:**
  - Cancha 1 y Cancha 2: gimnasio de la sede (Av. Ejemplo 1234).
  - Cancha Anexo: Calle Ficticia 567, Ciudad de Buenos Aires.
- **Horario de entrenamiento de Vóley:** lunes, miércoles y viernes de 18 a 22.
- **Cuotas:**
  - cuota social: $15.000 por mes (`club.socialFee`);
  - cuota deportiva de Vóley: $25.000 por mes (`clubSport.priceFee`).
- **Color propio del club:** Celeste Valencia `#2E9BD6` (ver sección 11, "Acento del club").

---

## 3. Circuito de alta y login de usuarios

**3.1 Alta de Socio**
- El alta es presencial: la persona se acerca al club, el Admin la da de alta y le entrega su **número de socio único, de una sola vez**. Con ese número ingresa por primera vez a la plataforma y genera su propio usuario/contraseña.
- Si es **menor de edad**: se genera automáticamente un código de vínculo familiar para un adulto responsable (ver 3.5).
- Si es **mayor de edad**: sin código, gestión de cuotas propia habilitada desde el alta.
- **Primer ingreso (18/10/2026):** para registrarse, el Socio ingresa su número de socio **y su fecha de nacimiento** (que se carga obligatoriamente en el alta); si no coinciden, el sistema responde un mensaje genérico sin indicar cuál falló. Así, alguien que adivine un número de socio no puede registrarse en lugar de otra persona.
- El número de socio se entrega una sola vez en el alta presencial y se usa una única vez para completar el registro (generación de usuario/contraseña). A partir de ese momento el Socio ingresa siempre con usuario y contraseña; el número de socio queda asociado a la persona de forma permanente como identificador, pero no se reutiliza para futuros inicios de sesión.
- **Reglas del alta (21/10/2026):**
  - **Número de socio:** 6 dígitos correlativos con ceros a la izquierda (`000001`), únicos en toda la plataforma, como en el carnet del moodboard.
  - **Datos:** nombre, apellido, DNI y fecha de nacimiento son obligatorios en el alta; el email es obligatorio para los mayores de 18 y opcional para los menores (ver sección 8); el teléfono es opcional.
  - **Código de vínculo:** formato `XXXX-XXXX`, con letras y números sin caracteres que se confundan (sin 0/O, 1/I/L).
  - **Persona que ya tiene usuario en el club** (se detecta por DNI o email): si es Staff, no puede ser socia (ver 3.6); si ya es socia, se rechaza; si tiene otro rol, por ejemplo Familia, se la da de alta como socia **con ese mismo usuario**, sin tocar su contraseña ni pedirle que se registre de nuevo.
  - **Baja y reactivación:** la baja deja al Socio Inactivo sin tocar su usuario (si es Familia, sigue entrando con ese rol, ver 3.6.1). El Admin puede reactivar a un Socio Inactivo; un Socio Suspendido por mora no se reactiva a mano, se recupera solo al pagar (ver sección 6). La baja no modifica inscripciones, cuotas ni categorías: cada módulo consulta el estado del socio.
- **Comprobante del alta (21/10/2026, decisión D3):** al terminar el alta, el sistema muestra un comprobante imprimible con el número de socio y, si es menor, el código de vínculo familiar (ver 3.5). El Admin lo entrega en el momento.

**3.2 Perfil base de Socio**
- Gestión de datos personales y cuotas/pagos propios.
- Inscripción o baja a un deporte (baja: ver 3.3.1).
- Acceso a información general del club.
- Notificaciones.
- Acceso al bot de consultas (funcionalidad opcional, ver sección 9).

**3.3 Socio → Socio-Deportista**
- El Socio solicita inscripción a un deporte (botón "Inscripción a un deporte").
- El Representante del deporte aprueba → el Socio pasa a tener el rol **Jugadora** (Socio-Deportista), que incluye todas las funciones y permisos del rol Socio más las deportivas. Es una extensión del perfil base, **no** un usuario nuevo, y no alterna entre ambos roles.
- Al pasar a Jugadora se le suma la cuota deportiva (ver sección 6).
- **Reglas de la inscripción (05/11/2026):** solo puede pedirla un Socio **Activo** (un Suspendido por mora primero tiene que regularizar), en un deporte activo del club y si no tiene ya una inscripción Pendiente o Aprobada en ese deporte; puede volver a pedirla después de un rechazo. También la puede pedir un Socio menor. Al pedirla, se avisa in-app al Representante del deporte. El Representante la aprueba (le da el rol Jugadora) o la rechaza con un motivo opcional, que se le informa al Socio. El Socio puede cancelar una solicitud mientras está Pendiente.

**3.3.1 Baja de un deporte (21/10/2026, decisión D4)**
- La hace el propio Socio desde su perfil (permiso `inscriptions.withdraw`), sin aprobación del Representante. Es **inmediata**, después de un diálogo de confirmación.
- Al confirmarla:
  - la inscripción pasa a Cancelada;
  - sale de todas sus categorías de ese deporte;
  - sus citaciones Pendientes de partidos futuros de ese deporte pasan a Cancelada; **desde el 08/11/2026, también las Confirmadas** (incluidas las confirmadas automáticamente) de partidos futuros, y se avisa in-app a las entrenadoras de la categoría;
  - si ya no le queda ningún deporte con inscripción Aprobada, pierde el rol Jugadora y queda como Socio;
  - la cuota deportiva de ese deporte deja de generarse desde el mes siguiente;
  - se notifica al Representante del deporte (ver sección 6, canales).
- Las cuotas ya generadas no se anulan: siguen debiéndose.
- Se registra en la bitácora.

**3.4 Mayoría de edad (detección automática)**
- Por fecha de nacimiento, sin intervención manual.
- Al cumplir 18: se habilita la opción de desvincularse del adulto responsable + acceso propio a la gestión de cuotas.
- Si no se desvincula, ambos (Socio y adulto) pueden operar en paralelo — la Bitácora registra quién hizo cada acción.
- **Desvinculación (23/10/2026):** la hace el propio Socio desde "Mi cuenta". Se borra el vínculo y también el código (para que no se pueda volver a usar). Si el adulto ya no tiene ningún otro menor vinculado, pierde el rol Familia. No se notifica al adulto (no figura en la tabla de canales, sección 6).
- **Nota de diseño:** este mecanismo (habilitar/deshabilitar acceso según una condición calculada, no según rol fijo) es el caso de uso real para el ítem de consigna "Patentes y Familias".

**3.5 Alta de Familia y código de vínculo familiar**
- Se registra con el código de vínculo familiar: de un solo uso, un código por cada Socio menor, un adulto por Socio menor.
- **Entrega del código (21/10/2026, decisión D3):** el adulto lo recibe en mano, en el comprobante del alta presencial del menor (ver 3.1). Además, el código queda visible en el perfil del Socio menor mientras no se haya usado. No se envía por email, porque el adulto todavía no tiene cuenta.
- **Vincularme como Familia (23/10/2026):** desde la pantalla de inicio de sesión, el adulto ingresa el código y elige entre crear su cuenta (queda activa en el momento, en el club del menor) o ingresar con el usuario que ya tiene (con la validación del login, incluido el bloqueo por intentos). El adulto tiene que ser mayor de 18 y del mismo club. Un usuario que ya tiene sesión iniciada también puede vincular a otro menor desde "Mi cuenta" (por ejemplo, un hermano). Al vincular recibe el rol Familia.
- Un mismo adulto puede vincularse a varios Socios menores (hermanos) y/o ser Socio independiente él mismo.
- Si el usuario Familia es también Socio por su cuenta, tiene ambos roles (ver "Rol activo" más abajo).
- Un usuario Staff puede ser también Familia de un Socio menor (no puede ser Socio, ver 3.6); tiene ambos roles (ver "Rol activo" más abajo).
- Un usuario puede ser "Jugadora" y estar vinculado como "Familia" de otra jugadora (mayor de edad), sin conflicto entre roles.
- **Rol activo:** un usuario con más de un rol (ej. Familia y Socio, Familia y Jugadora, Familia y Staff) elige con qué rol trabajar y alterna entre sus dashboards. Los permisos efectivos son **solo los del rol activo**, no la suma de ambos. La Bitácora registra con qué rol se hizo cada acción.

**3.6 Alta de Staff** (Representante, entrenadoras, preparadora física)
- No pasa por el circuito de Socio. Alta directa por el Admin del club, con rol de staff ya asignado.
- Un usuario Staff **no puede ser además Socio**: o es Staff o es Socio. Sí puede ser además Familia (ver 3.5).
- **Reglas del alta de Staff (23/10/2026):**
  - Datos obligatorios: nombre, apellido, DNI, fecha de nacimiento, email, el deporte del club y al menos un rol de staff. **Una persona puede tener más de un rol de staff** (por ejemplo, Entrenadora y Preparadora física) y trabaja con el rol activo (ver 3.5).
  - **Acceso:** el alta crea el usuario pendiente y le envía un **email de activación** con un link que vence en 48 horas y sirve una sola vez, para que elija su usuario y su contraseña. El Admin puede reenviarlo.
  - Se considera staff a quien tiene al menos un rol de staff. No puede ser staff quien es Socio Activo o Suspendido; un ex Socio (Inactivo) sí puede. Si la persona ya tiene usuario en el club con otro rol (por ejemplo, Familia), el staff se crea sobre ese usuario, sin activación.
  - **Baja:** se le quitan los roles de staff. El usuario queda Eliminado **solo si no le queda ningún otro rol**; si además es Familia, sigue entrando con ese rol. El Admin puede reactivarlo eligiendo de nuevo sus roles.

**3.6.1 Login, roles disponibles y rol activo (18/10/2026)**
- Se inicia sesión con **nombre de usuario** y contraseña. Política de contraseñas igual a HotelDesk: mínimo 8 caracteres, con mayúscula, minúscula, número y carácter especial.
- **Bloqueo:** 5 intentos fallidos seguidos bloquean al usuario (estado Bloqueado). Se desbloquea de dos formas (21/10/2026): restableciendo la contraseña por email (ver 3.7), que lo desbloquea automáticamente, o por el Admin del club desde la gestión de socios y staff.
- Solo entran usuarios Activos con contraseña. Un usuario Pendiente (alta presencial sin registro) debe registrarse primero con su número de socio.
- **Socio dado de baja (Inactivo):** pierde los roles Socio y Jugadora, pero conserva los demás (por ejemplo, Familia). Si no le queda ningún rol, no puede iniciar sesión. Un Socio Suspendido por mora conserva sus roles (ver sección 6).
- **Elección del rol activo:** con un solo rol se entra directo; con más de uno, después del login el usuario elige con qué rol entrar, y después puede cambiarlo desde el menú (ver "Rol activo" en 3.5).
- **Permisos condicionados por edad:** el pago de las propias cuotas y la desvinculación del adulto se quitan de los permisos efectivos mientras el Socio es menor de 18 (ver 3.4 y `Documentación Club360`, sección 4.1).

**3.6.2 Mi cuenta (21/10/2026)**
- Con el permiso `auth.manageAccount` (todos los roles), cada usuario puede modificar su **email, teléfono y foto**, y cambiar su contraseña (pidiendo la actual). Nombre, apellido, DNI, fecha de nacimiento y nombre de usuario los modifica solo el Admin: la fecha de nacimiento, en particular, define los permisos condicionados por edad (ver 3.4).

**3.7 Recuperación de contraseña**
- Desde el login, botón "Olvidé mi contraseña".
- **Mecanismo (definido el 21/10/2026, decisión D1):** link por email, igual que HotelDesk. El usuario ingresa su nombre de usuario **o** su email; el sistema responde siempre el mismo mensaje, exista o no la cuenta, para no revelar qué usuarios existen. El link vence en 1 hora y sirve una sola vez (se invalida al cambiar la contraseña). Solo se envía a usuarios Activos o Bloqueados; restablecer la contraseña desbloquea la cuenta (ver 3.6.1). Después del cambio se envía un email de aviso.
- Es una función del sistema, independiente del bot de consultas (que solo funciona con la sesión iniciada).

---

## 4. Actores y permisos

**Roles del sistema (7):** Socio (perfil base), Jugadora (Socio-Deportista), Familia, Representante, Entrenadora, Preparadora física y Admin del club. *(El SuperAdmin salió del MVP; ver sección 2 y 7. Estos 7 son los roles base del DER, `Rol.es_base`, ver sección 8.)*

**Catálogo de permisos (definido el 11/10/2026):** el catálogo completo (41 permisos, formato `módulo.acción`, con los permisos de cada rol: Admin 14, Representante 9, Entrenadora 8, Preparadora física 5, Socio 9, Jugadora 12, Familia 7) está en el documento `Documentación Club360`, sección 4.1, que es su lugar de origen. En el código vive en `api/src/utils/permissions.js`. El catálogo es fijo y común a toda la plataforma: lo carga el seed y el Admin del club no puede crear, modificar ni eliminar permisos (sí crear roles con los permisos existentes, editar los permisos de cada rol y asignar permisos directos).

Los actores se describen por rol para facilitar la lectura, pero el acceso a pantallas y acciones se implementa por **permisos** (patentes): cada rol es un conjunto de permisos (familia), y el front y el back verifican el permiso, no el rol. Además de los permisos por rol, un usuario puede tener permisos directos (tabla `UsuarioPermiso`, ver sección 8) para excepciones puntuales sin crear un rol nuevo. Un usuario con más de un rol trabaja con un rol activo a la vez (ver 3.5).

**Gestión de roles y permisos (21/10/2026):**
- **Roles base:** no se pueden eliminar ni cambiar de nombre (el sistema los identifica por su nombre). Sí se pueden editar su descripción y sus permisos. Los cambios que hace el Admin en los permisos de un rol base no se pierden si se vuelve a correr el seed: el seed solo asigna los permisos al crear el rol.
- **Rol Admin del Club:** conserva siempre los permisos `access.manageRoles` y `access.assignRoles`, para que nunca quede nadie sin poder administrar los roles. El resto de sus permisos se puede editar. Siempre tiene que quedar al menos un usuario activo con el rol Admin del Club, y un Admin no puede quitarse ese rol a sí mismo.
- **Roles nuevos:** el Admin los crea con cualquier combinación de permisos del catálogo. El nombre es único dentro del club.
- **Asignación manual:** desde "Usuarios y roles", el Admin solo asigna o quita los **roles nuevos y el rol Admin del Club**. Socio, Jugadora, Familia, Representante, Entrenadora y Preparadora física se asignan únicamente desde su circuito: alta de socio (3.1), aprobación de la inscripción (3.3), vínculo familiar (3.5) y alta de staff (3.6). Así no se puede, por ejemplo, convertir a alguien en Jugadora sin inscripción ni darle el rol Socio a un Staff.
- **Eliminar un rol nuevo:** solo si no tiene usuarios asignados; si los tiene, primero hay que quitárselo a cada uno.
- **Permisos directos:** cualquiera de los 41, como excepción puntual para un usuario. Los permisos condicionados por edad igual se quitan si el usuario es menor (ver 3.6.1).
- Los cambios de roles y permisos rigen desde la siguiente acción del usuario afectado.

**Funciones comunes** — todos los usuarios con sesión
- Iniciar sesión, recuperar contraseña y modificar sus datos de cuenta
- Ver notificaciones (canales: ver sección 6)

**Admin del Club** — acotado a su propio club
- Dar de alta, modificar y dar de baja Socios (ver 3.1) y Staff (ver 3.6). En el alta de un Socio, entregar el comprobante con el número de socio y, si es menor, el código de vínculo (ver 3.1 y 3.5)
- Gestionar cuotas sociales y deportivas, incluido el parámetro de días de atraso (ver sección 6)
- Activar deportes del catálogo maestro para su club
- Configurar parámetros globales, como el margen de conflicto horario
- Asignar roles a usuarios, editar los permisos de cada rol y crear roles nuevos. Los roles base no se pueden eliminar (reglas en "Gestión de roles y permisos", arriba)
- Consultar y descargar la bitácora
- Enviar notificaciones generales

**Representante del deporte**
- Crear, modificar y eliminar ligas y categorías
- Asignar jugadoras a liga/categoría
- Asignar entrenadoras y preparadoras físicas a sus ligas/categorías
- Publicar y editar fixtures con dirección. El sistema avisa si hay superposición
- Marcar un partido como jugado o cancelarlo (ver sección 6)
- Aprobar inscripciones de jugadoras nuevas
- Ver el estado de cuotas de sus jugadoras
- Enviar notificaciones a jugadoras, familias y entrenadoras

**Entrenadora**
- Ver sus ligas, jugadoras asignadas y fixtures
- Generar citaciones (reglas en sección 6). El sistema no permite citar a una jugadora con mora superior al plazo configurado hasta que regularice su situación (ver sección 6)
- Resolver conflictos de horario junto con otras entrenadoras (reglas y registro en bitácora en sección 6)
- Ver rutinas físicas en solo lectura
- Enviar notificaciones a jugadoras y familias

**Preparadora física**
- Asignar la rutina semanal por categoría/liga
- Subir contenido adicional (texto, imagen o link de video)
- Ver el fixture para ajustar las rutinas

**Socio** — perfil base
- Gestionar sus datos personales, cuotas y pagos
- Solicitar inscripción a un deporte o darse de baja de uno (ver 3.3.1)
- Ver información general del club
- Usar el bot de consultas (ver sección 9)
- Al cumplir 18 y estar vinculado a un adulto, desvincularse de él (opcional, ver 3.4)

**Jugadora** (= Socio-Deportista de Vóley; incluye todo lo del Socio)
- Ver un dashboard con fixtures y citaciones, con módulos diferenciados si juega en 2 ligas
- Confirmar o rechazar citaciones con justificación (plazos y reglas en sección 6)
- Ver la rutina física semanal

**Familia**
- Vincularse con el código (ver 3.5)
- Ver fixtures y citaciones de sus jugadoras vinculadas, solo lectura
- Ver el estado de cuenta y pagar las cuotas de la menor (pago simulado)
- Usar el bot de consultas (ver sección 9)
- Si además es Socio, suma las funciones de Socio
- No confirma ni rechaza citaciones

---

## 5. Módulos funcionales del MVP (club Valencia, deporte Vóley)

1. Gestión de socios y cuotas sociales y deportivas (pago simulado; arquitectura lista para pasarela real futura)
2. Gestión de ligas y categorías de Vóley + asignación de jugadoras
3. Fixture inteligente: dirección de cancha + detección automática de superposición de horarios (margen configurable)
4. Citaciones (reglas en sección 6)
5. Rutinas físicas semanales (texto + imagen/link video, historial por semana)
6. Notificaciones (in-app y email): citación, fixture/conflicto, rutina publicada, cuota por vencer/vencida, avisos generales. Canal de cada tipo: ver sección 6
7. Vínculo familiar por código (ver 3.5)
8. Bitácora de actividad y decisiones de negocio
9. Carga inicial de club y catálogo de deportes por script (ver sección 2) — sin panel de SuperAdmin
10. **Bot de consultas (FUNCIONALIDAD OPCIONAL, última prioridad)**: ver sección 9.

---

## 6. Reglas de negocio clave

- **Ligas y categorías (26/10/2026):**
  - Cada liga pertenece a un deporte del club y tiene categorías. Las jugadoras y el staff se asignan a las categorías.
  - El Representante gestiona solo las ligas de su deporte.
  - **Escalas de edad (28/10/2026):** las categorías del vóley van por edad y hay dos escalas en uso. Cada liga elige una, y sus categorías se eligen de esa lista:
    - **Escala 1:** Sub-11, Sub-12, Sub-13, Sub-15, Sub-16, Sub-18, Sub-21 y Mayores.
    - **Escala 2:** Sub-13, Sub-15, Sub-17, Sub-20, Sub-23 y Mayores.

    La **edad de temporada** es el año calendario menos el año de nacimiento (en 2026, alguien nacido en 2008 tiene 18 todo el año). Cada categoría Sub-N cubre las edades desde la siguiente a la categoría anterior hasta N (por ejemplo, Sub-18 en la escala 1 es para 17 y 18), pero **una jugadora más chica puede jugar en una categoría superior**: solo se valida la edad máxima. En Mayores puede jugar cualquiera. Si con el cambio de año una jugadora ya asignada supera la edad de su categoría, no se la quita sola: queda marcada para que el Representante la reasigne. Una liga puede tener dos categorías del mismo grupo con nombres distintos (por ejemplo, Sub-18 A y Sub-18 B).
  - **Jugadoras asignables:** Socias Activas o Suspendidas (la mora impide ser citada, no jugar) con inscripción Aprobada en el deporte de la liga y que cumplen la edad máxima de la categoría. Una jugadora puede estar en varias categorías, incluso de ligas distintas: es el caso que genera superposiciones de horario.
  - **Staff asignable:** Entrenadoras y Preparadoras físicas activas del mismo deporte; una categoría puede tener varias y una persona puede estar en varias categorías.
  - **Bajas:** las de ligas, categorías y asignaciones son lógicas. Dar de baja una liga da de baja sus categorías. Las socias o el staff dados de baja no se quitan solos de las categorías, pero no aparecen para asignar y los demás módulos los excluyen.
- **Conflictos de horario:** los resuelven las entrenadoras entre sí; el sistema solo avisa y registra en bitácora quién lo resolvió. No se guarda una entidad de conflicto: se calculan a partir de los partidos de cada jugadora y el margen configurado.
- **Deportes del club (21/10/2026):** el Admin activa o desactiva los deportes del catálogo y fija su cuota deportiva. No se puede desactivar un deporte que tiene inscripciones Pendientes o Aprobadas.
- **Margen de conflicto:** el margen mínimo entre partidos para considerarlo "conflicto" es un parámetro configurable por el Admin del club (no fijo en código).
- **Cálculo de la superposición (01/11/2026):** como no se guarda la duración de los partidos, se asume que cada uno dura **2 horas**. Dos partidos Programados de una misma jugadora (que está en las categorías de los dos) están en conflicto si entre el fin del primero y el inicio del segundo hay menos minutos que el margen del club. Con el margen de 60 minutos, un partido a las 10:00 choca con cualquier otro que empiece antes de las 13:00. Los partidos Jugados o Cancelados no generan conflictos.
- **Aviso y resolución (01/11/2026):** al crear o editar un partido, el sistema muestra los conflictos antes de guardar y no bloquea el guardado; avisa a las entrenadoras de las dos categorías. La resuelve una de ellas (después de acordarlo con la otra) eligiendo en qué partido juega la jugadora, con una nota opcional. La resolución se registra en la bitácora y, desde ahí, el conflicto se muestra como resuelto.
- **Efecto de la resolución en la jugadora (05/11/2026):** si la jugadora estaba citada en el partido que no se eligió, esa citación se cancela sola. Se le avisa a ella (y a su familia, si es menor) que, por la superposición de horario, se decidió que juegue el otro partido, y en sus pantallas el partido no elegido aparece marcado como "No jugás este partido", con el partido que sí juega. Después de resuelto el conflicto, el sistema no deja citarla en el partido no elegido.
- **Tipos de cuota:** hay **cuota social** y **cuota deportiva**. Un Socio paga solo la cuota social; si además es deportista (Jugadora), se suman ambas.
  - **Una cuota deportiva por cada deporte (21/10/2026, decisión D6):** el Socio paga la cuota deportiva de cada deporte en el que tiene inscripción Aprobada, con el valor de ese deporte en el club (`clubSport.priceFee`). En la cuota mensual, `sportAmount` es la suma de todas. En el MVP solo existe Vóley, pero el cálculo ya contempla varios deportes.
  - **Generación y vencimiento de la cuota mensual (08/11/2026, decisión D12):** la cuota de cada mes se genera el **día 1** y vence el **día 10**. Se genera a los Socios Activos o Suspendidos (la deuda sigue corriendo) dados de alta antes del día 1: un Socio que se da de alta a mitad de mes paga desde el mes siguiente. A los Inactivos no se les genera. Los montos se fijan al generarla: la cuota social del club y la suma de las cuotas deportivas de los deportes con inscripción Aprobada en ese momento (una inscripción aprobada o dada de baja a mitad de mes impacta desde la cuota siguiente). Una cuota impaga pasa a Vencida al día siguiente del vencimiento. El Admin también puede generar a mano las cuotas del mes en curso (sin duplicar las que ya existen).
  - **Avisos:** 3 días antes del vencimiento (cuota por vencer, in-app); al vencer (in-app y email); un recordatorio cada 30 días de atraso, con el total adeudado; y al superar el plazo de mora, la suspensión (in-app y email). En los menores, los avisos llegan también al adulto vinculado.
  - **Pago (08/11/2026):** paga el propio Socio si es mayor, o el adulto Familia por sus jugadoras vinculadas, siempre por el total de la cuota. El pago simulado pide los datos de una tarjeta que no se guardan (las terminadas en 0000 se rechazan, para poder mostrar un rechazo). El Admin también puede registrar un pago hecho en secretaría. Al aprobarse un pago, si el Socio estaba Suspendido y ya no tiene cuotas impagas por encima del plazo, recupera su condición automáticamente.
  - **Pago por transferencia (08/11/2026):** los mismos que pagan con tarjeta pueden pagar por transferencia: ven los datos bancarios del club y el monto exacto, transfieren y adjuntan el comprobante (JPG, PNG o PDF, hasta 5 MB). El pago queda Pendiente y la cuota no cambia de estado hasta que lo revisa un usuario con gestión de cuotas, que lo aprueba (la cuota queda Pagada y aplica la recuperación automática) o lo rechaza con un motivo obligatorio (la cuota sigue impaga y se puede volver a pagar). Hay una sola transferencia en revisión por cuota, y mientras está en revisión esa cuota no se puede pagar de otra forma ni cuenta para los días de mora (para que una demora de la revisión no suspenda al Socio ni le impida ser citado). El comprobante adjunto no es público: lo ven solo quien pagó, el Socio, su adulto vinculado y quienes gestionan cuotas.
  - **Historial de pagos (08/11/2026):** quienes gestionan cuotas ven todos los pagos del club (tarjeta, transferencia y secretaría), con las transferencias por revisar primero.
  - **Comprobante de pago (08/11/2026):** todo pago Aprobado, con cualquier medio, tiene un comprobante imprimible con los datos del club, el número de comprobante, la fecha, el socio, quién pagó, el período, el desglose y el medio de pago (en las tarjetas, solo los últimos 4 dígitos).
- **Mora (únicas dos restricciones funcionales del MVP):** con más de 180 días de atraso (default, configurable por el Admin) → (1) la jugadora puede perder su condición de socia y (2) la entrenadora no puede citarla hasta que regularice su situación. El resto del sistema sigue accesible (solo aviso/badge informativo). Se envían notificaciones desde el primer mes de atraso, junto con las advertencias correspondientes, si no regulariza su situación.
  - **Pérdida y recuperación de la condición (18/10/2026):** al superar el plazo, el Socio pasa a estado Suspendido (ver sección 8). La recupera automáticamente, sin intervención del Admin, cuando se aprueba un pago y ya no le queda ninguna cuota que supere el plazo de mora. La baja dada por el Admin es un estado distinto (Inactivo) y no se revierte sola.
- **Pagos de cuotas simulados:** se registra estado de transacción (pendiente/aprobado/rechazado), sin pasarela real conectada. Sin tienda en el MVP, todo Pago está asociado a una Cuota (ver sección 8).
- **Citación:** mínimo 2 días de anticipación al partido; la jugadora tiene 24 hs para rechazar con justificación, si no queda confirmada automáticamente. La responde siempre la jugadora, aunque sea menor. La genera siempre un miembro del Staff (ver sección 8 — FK de Citación a Staff, no a Usuario genérico). Si el partido se cancela, todas sus citaciones pasan a estado Cancelada y se notifica a las jugadoras citadas (18/10/2026).
  - **Reglas de la citación (05/11/2026):** la entrenadora cita solo en los partidos de sus categorías y puede citar a varias jugadoras a la vez (si alguna no cumple las reglas, no se crea ninguna y se informa el motivo de cada una). **Mora para citar:** la jugadora tiene mora si está Suspendida o si su cuota impaga más vieja tiene más días de atraso que el plazo del club. **Ventana para citar (05/11/2026):** se puede citar desde **7 días antes** del partido hasta **48 horas antes**; antes de esa semana, el sistema informa desde cuándo se habilita. Una jugadora no se cita dos veces para el mismo partido; si se le canceló la citación, se la puede volver a citar, pero si la rechazó, no. Al rechazar, la justificación es obligatoria. La entrenadora puede cancelar una citación antes del partido (por ejemplo, si se equivocó), y la jugadora (y su familia, si es menor) recibe un aviso in-app. La confirmación automática revisa las citaciones vencidas cada 10 minutos. **Aviso a las entrenadoras (05/11/2026):** cuando una jugadora confirma o rechaza una citación, se avisa in-app a todas las entrenadoras de la categoría (en el rechazo, con la justificación); las confirmaciones automáticas no avisan.
- **Estado de los partidos (18/10/2026):** el Representante marca a mano el partido como Jugado una vez que ocurrió, o lo cancela. No se pueden generar citaciones para un partido jugado o cancelado.
- **Datos de un partido (01/11/2026):** categoría, rival, fecha y hora (siempre en el futuro al crearlo), si es de local o de visitante y la dirección. De local, la dirección se elige entre las canchas del club (ver 2.1); de visitante, se escribe. La temporada se completa sola con el año de la fecha. Solo se editan los partidos Programados; uno cancelado no se reprograma: se crea otro.
- **Rutinas (08/11/2026):** la Preparadora física carga una rutina **por cada día de entrenamiento** de sus categorías (título, descripción, imagen opcional y link de video opcional), como muestra el moodboard con los días de la semana. Hay una sola rutina por categoría y por día. Puede cargar, editar y borrar las de la **semana actual y las futuras**; las semanas pasadas quedan como historial de solo lectura. Al publicar o editar una rutina se avisa in-app a las jugadoras activas de la categoría (al borrarla, no). La Entrenadora las consulta en solo lectura y la Jugadora ve las de sus categorías, separadas si juega en dos ligas.
- **Paneles de inicio (08/11/2026):** la Jugadora tiene un panel con lo más urgente (citación pendiente, cuota vencida o próximo partido), su carnet de socia, el próximo partido de cada categoría con el estado de la citación (y puede confirmarla o rechazarla desde ahí), el estado de la cuota y la rutina de la semana. La Familia tiene un panel con una tarjeta por jugadora vinculada (próximo partido, citación en solo lectura y cuota, con acceso al pago). Los demás roles tienen el inicio con accesos rápidos.
- **Canal de cada notificación (21/10/2026, decisión D5):** todas las notificaciones se guardan y se muestran **in-app**. Algunas se envían además por **email**:

  | Notificación | Destinatario | Canal |
  |---|---|---|
  | Citación nueva | Jugadora citada | in-app + email |
  | Partido cancelado (con citaciones canceladas) | Jugadoras citadas | in-app + email |
  | Cuota vencida y avisos de mora | Socio (y Familia si es menor) | in-app + email |
  | Suspensión por mora | Socio (y Familia si es menor) | in-app + email |
  | Fixture publicado o modificado | Jugadoras de la categoría | in-app |
  | Conflicto de horario detectado | Entrenadoras involucradas | in-app |
  | Rutina publicada | Jugadoras de la categoría | in-app |
  | Cuota por vencer | Socio (y Familia si es menor) | in-app |
  | Inscripción aprobada o rechazada | Socio | in-app |
  | Baja de un deporte (ver 3.3.1) | Representante del deporte | in-app |
  | Citación cancelada por la entrenadora (05/11) | Jugadora (y Familia si es menor) | in-app |
  | Conflicto de horario resuelto (05/11) | Jugadora (y Familia si es menor) | in-app |
  | Respuesta a una citación: confirmación o rechazo (05/11) | Entrenadoras de la categoría | in-app |
  | Transferencia informada para revisar (08/11) | Usuarios con gestión de cuotas | in-app |
  | Resultado de la revisión de una transferencia (08/11) | Quien pagó y el Socio (y Familia si es menor) | in-app |
  | Error de integridad detectado (09/11) | Usuarios con gestión de la integridad | in-app + email |
  | Solicitud de inscripción nueva (05/11) | Representante del deporte | in-app |
  | Avisos generales (Admin, Representante, Entrenadora) | Según el permiso de envío | in-app, y email si quien envía lo elige |

  El email es un aviso corto que invita a entrar a la plataforma; el detalle se ve in-app. Los emails de seguridad (recuperación y cambio de contraseña, ver 3.7; activación de la cuenta del staff, ver 3.6) no son notificaciones: se envían siempre por email.
  - **Destinatarios de los avisos generales (31/10/2026):** el Admin los envía a todo el club o a uno o más grupos: socios, staff (todo o por rol), socios con cuotas vencidas y familias, con la opción de sumar a las familias de los socios menores (los avisos manuales a socios con cuotas vencidas no reemplazan los automáticos de mora); el Representante, a las jugadoras de su deporte, a sus familias y a las entrenadoras y preparadoras físicas de ese deporte (elige uno o más grupos); la Entrenadora, a las jugadoras de sus categorías y, si quiere, a sus familias. Antes de enviar se muestra a cuántas personas les llega y cuántas por email.
  - **Funcionamiento (31/10/2026):** los emails se envían después de confirmar la operación que los genera (si la operación falla, no sale ningún email) y no demoran la respuesta. A quien no tiene email (por ejemplo, un menor) solo le llega in-app; en los avisos para "Socio, y Familia si es menor", el adulto vinculado recibe también el suyo. Si un email falla, se registra en la bitácora y la notificación in-app se mantiene. Las notificaciones llegan a usuarios Activos o Bloqueados del club.
  - **Ver una notificación (01/11/2026):** al tocarla, en la campana o en el listado, se abre una ventana flotante con el mensaje completo, quién la envió, la fecha y, si corresponde, un botón para ir a la sección relacionada (por ejemplo, a la citación). Al abrirla queda leída.
  - **Historial de avisos enviados (01/11/2026):** quien envía avisos generales ve los suyos, con la fecha, el mensaje, a cuántas personas les llegó y cuántas lo leyeron, y la lista de destinatarios con su estado de lectura. El Admin ve todos los avisos enviados en el club, con un filtro por remitente. Las notificaciones automáticas del sistema no aparecen en el historial.
- Formato de exportación de la bitácora: CSV.

---

## 7. Futuro / Escalabilidad (documentado, NO se construye en el MVP)

**Prioridad 1 si queda tiempo (definido el 18/10/2026):**
- Resultados de los partidos y campaña por categoría: el Representante carga el resultado al marcar el partido como Jugado, y se muestran los partidos jugados, ganados y perdidos y los sets a favor y en contra, en el dashboard de la Jugadora y del Representante. Requiere sumar `ownScore` y `rivalScore` (INT, null) a `game`. Es la campaña del club, no la tabla de posiciones completa del torneo, porque no se cargan los partidos entre otros equipos. **Va antes que el bot de consultas (21/10/2026, decisión D11).**

**Prioridad 2 si queda tiempo (definido el 21/10/2026):**
- Bot de consultas (sección 9).
- Dominio propio verificado para enviar los emails con Resend en lugar de Gmail SMTP (ver sección 11, "Emails").

**Recortados del MVP el 04/10/2026:**
- Panel de SuperAdmin (Administrador de Plataforma): alta de clubes y asignación del primer Admin, mantenimiento del catálogo maestro de deportes, consulta y corrección de datos de un club como soporte (con registro en bitácora), sin poder ingresar como otro usuario
- Módulo de seguimiento personal de la jugadora: registro semanal de cumplimiento de rutina (completada/parcial/no completada + nota + percepción de esfuerzo 1-5), objetivos personales (texto + fecha límite + estado) y progreso con gráficos básicos
- Tienda de merch tipo e-commerce (productos, pedidos, detalle), habilitada para mayores de 18 y familias, con catálogo gestionable y delegable por permiso

**Otras mejoras futuras:**
- Tabla de posiciones completa del torneo (requiere cargar los resultados de todos los equipos de la liga)
- Particiones de la base (por ejemplo, la bitácora por mes) — descartadas del MVP el 21/10/2026 (ver sección 0)
- Onboarding real de nuevos clubes (auto-registro)
- Integración real de pasarela de pago (ej. Mercado Pago)
- Restricciones adicionales por mora
- Bot de IA personalizado (accede a datos propios de la jugadora logueada)
- Extensión a otros deportes dentro de Valencia
- Carga real de un segundo/tercer club con datos propios
- Upload propio de video (en vez de link externo)
- Métricas físicas avanzadas y dashboard analítico ampliado
- Módulo de psicología deportiva y nutrición, con roles propios
- Notificaciones push nativas / app mobile
- Recordatorios automáticos de citación, sincronización de calendario
- Bot que liste los próximos partidos (hoy solo explica cómo acceder al fixture)

---

## 8. Entidades del DER lógico (cerrado — ver imagen adjunta al proyecto)

**24 entidades en 6 módulos.** El DER lógico definitivo está adjunto como **imagen (JPG) al conocimiento del proyecto** — esa imagen es la referencia visual oficial. Nombres de tabla/campo en inglés camelCase, igual que el código Sequelize.

1. **Seguridad y acceso (7):** Usuario (`user`), Rol (`role`), Permiso (`permission`), UsuarioRol (`user_role`), RolPermiso (`role_permission`), UsuarioPermiso (`user_permission`), DigitoVerificadorVertical (`dvv`)
2. **Club, deportes y auditoría (5):** Club (`club`, incluye cuota_social → `socialFee`, dias_atraso → `delayFee`, margen_conflicto_min → `conflictMargin`), Deporte (`sport`), ClubDeporte (`clubSport`, incluye valor_cuota → `priceFee`), Bitacora (`log`), Notificacion (`notification`)
3. **Socios, staff e inscripciones (3):** Socio (`member`, incluye el vínculo familiar: codigo_vinculo → `codeFamily`, adulto_id → `memberAdultId`, vinculo_activo → `linkStatus`), Staff (`staff`), Inscripcion (`inscription`)
4. **Cuotas y pagos (2):** Cuota (`fee`), Pago (`payment`)
5. **Ligas, partidos y citaciones (6):** Liga (`league`), Categoria (`category`), JugadoraCategoria (`categoryPlayer`), StaffCategoria (`categoryStaff`), Partido (`game`), Citacion (`citation`)
6. **Rutinas (1):** Rutina (`routine`)

**Salieron del DER por el recorte de alcance (04/10/2026):** `Producto`, `Pedido`, `PedidoDetalle` (tienda) y `RegistroSemanal`, `Objetivo` (seguimiento personal) — ver sección 7.

**Decisiones de modelado (vigentes):**
- Tipos reales de MySQL 8, con longitud y restricciones (`NOT NULL`, `UNIQUE`, `DEFAULT`) en cada columna. `boolean` se modela como `TINYINT(1)`.
- Todas las entidades de negocio llevan `club_id` (`clubId`) y `dvh`. `created_at`/`updated_at` **no se dibujan explícitamente en el DER**: existen igual a nivel de base por el `timestamps: true` default de Sequelize, pero se consideran implementación, no parte del DER visual. Excepción ya existente: la Bitácora (`log`) solo tiene `createdAt` (sin `updatedAt`, un log no se edita — igual que en el proyecto HotelDesk de referencia).
- **Patrón de estados por código numérico** (campos `userStateId`, `memberStateId`, `inscriptionState`, `citationState`, `gameState`, `transactionState` en `payment`, `feeState` en `fee`): se modelan como `INT NOT NULL DEFAULT 1`, **sin tabla de estados en la base**. El mapeo nombre↔número vive en un archivo de constantes de la aplicación (mismo patrón que `USER_STATES`/`ROOM_STATES` en el proyecto HotelDesk de referencia). Los campos `TINYINT(1)` tipo `isActive`/`linkStatus` son flags booleanas simples y no siguen este patrón.
- **Valores de los estados (cerrado el 18/10/2026, decisión D8):** el 1 es siempre el estado inicial (default del modelo). Los mapeos viven en `utils/constants.js`, replicados en `api/` y `client/`.
  - `user.userStateId`: 1 Pendiente, 2 Activo, 3 Bloqueado, 4 Eliminado. `staff` no tiene estado propio: la baja de un Staff le quita sus roles de staff y deja el usuario en Eliminado solo si no le queda otro rol (ver 3.6, 23/10/2026).
  - `member.memberStateId`: 1 Activo, 2 Suspendido (perdió la condición por mora, se recupera solo al regularizar; ver sección 6), 3 Inactivo (baja dada por el Admin).
  - `inscription.inscriptionState`: 1 Pendiente, 2 Aprobada, 3 Rechazada, 4 Cancelada (incluye la baja del deporte; ver 3.3.1).
  - `fee.feeState`: 1 Pendiente, 2 Pagada, 3 Vencida. Los días de mora no son un estado: se calculan desde `expirationDate`.
  - `payment.transactionState`: 1 Pendiente, 2 Aprobado, 3 Rechazado.
  - `citation.citationState`: 1 Pendiente, 2 Confirmada, 3 Rechazada, 4 Confirmada automáticamente, 5 Cancelada (partido cancelado o baja del deporte, ver 3.3.1).
  - `game.gameState`: 1 Programado, 2 Jugado (lo marca el Representante), 3 Cancelado.
- `member.numMember`: `VARCHAR(20) UNIQUE NOT NULL`, generado por la aplicación (no autoincrement, no lo calcula la base) — mismo patrón que `confirmationCode` en HotelDesk.
- Relaciones dibujadas con línea simple, sin círculo de opcionalidad: la nulabilidad de cada FK está indicada en su propia columna, no en la flecha.
- Sin SuperAdmin en el MVP: todo Usuario pertenece a un club (`club_id NOT NULL`) y hay 7 roles base (`Rol.es_base`). La Bitácora también tiene `club_id NOT NULL` (ya no hay acciones de plataforma sin club).
- **Roles por club:** `role.name` es único **junto con `clubId`** (índice compuesto `(clubId, name)`), no único en toda la base, para que cada club tenga sus propios roles base.
- **La imagen del DER quedó desactualizada en estos puntos; manda este documento:**
  - (10/10) En `fee`, `memberId` y `period` no son únicos por separado: es un único compuesto `(memberId, period)` (ver más abajo).
  - (10/10) En `role`, `name` no es único global (ver el punto anterior).
  - (11/10) `user.password` admite NULL: queda vacío desde el alta presencial hasta que el socio genera su usuario y contraseña con el número de socio (ver 3.1). El login rechaza usuarios sin contraseña.
  - (11/10) El adulto responsable del vínculo familiar se guarda en `member.adultUserId` (en el DER figura como `memberAdultId`) y es FK a **`user`**, no a `member`, porque el adulto Familia puede no ser Socio (ver 3.5).
  - (11/10) Los tres campos que estaban en snake_case pasan a camelCase como el resto: `dvv.tableName`, `routine.imageUrl` y `routine.videoUrl`.
  - (21/10) `user.email` admite NULL (sigue siendo único): es obligatorio para los mayores de 18 y opcional para los menores, que pueden no tener email propio y no pueden repetir el del adulto si son hermanos. Un menor sin email recupera su contraseña a través del club.
  - (21/10) `user.phone` pasa a `VARCHAR(255)` y se guarda **cifrado con AES** (encriptación reversible de la consigna). El DNI y el email no se cifran porque se buscan y son únicos.
  - (28/10) `league` suma `ageScale` (`TINYINT NOT NULL`, 1 o 2) y `category` suma `ageGroup` (`VARCHAR(10) NOT NULL`, código del grupo de edad, por ejemplo `SUB18` o `MAYORES`). Las edades máximas de cada grupo viven en la constante `AGE_SCALES` de la aplicación, no en la base (ver sección 6, "Escalas de edad").
  - (01/11) `game` suma `isHome` (`TINYINT(1) NOT NULL DEFAULT 1`): si el partido es de local, como muestra el moodboard ("vs. Atlético Ribera · Local").
  - (01/11) `notification` suma `batchId` (`CHAR(36)` NULL, con índice): identifica a todas las notificaciones de un mismo aviso general, para el historial de enviados. Las notificaciones automáticas lo tienen en NULL. Se agrega recreando la base y restaurando los datos (ver sección 11, "Cambios en el modelo").
  - (08/11) `routine` suma `dayOfWeek` (`TINYINT NOT NULL DEFAULT 1`, 1 lunes … 7 domingo) con un índice único compuesto `(categoryId, weekStart, dayOfWeek)`: una rutina por categoría y por día. `weekStart` es siempre el lunes de la semana. Se agrega recreando la base y restaurando los datos.
  - (08/11) `payment` suma `method` (`TINYINT NOT NULL DEFAULT 1`: 1 Tarjeta, 2 Transferencia, 3 Secretaría), `receiptUrl` (`VARCHAR(255)` NULL, comprobante de la transferencia) y `note` (`VARCHAR(300)` NULL: nota del pago en secretaría, motivo del rechazo de una transferencia o los últimos 4 dígitos de la tarjeta). Se agregan recreando la base y restaurando los datos.
  - (21/10, decisión D13) `club` suma `accentColor` (`VARCHAR(7)`, NOT NULL, color propio del club en hex) y `extraInfo` (JSON, NULL: WhatsApp, horarios de secretaría, canchas y horarios de entrenamiento). Los carga el seed y los edita el Admin en la configuración del club.
- **FK y borrado (11/10):** las FK son NOT NULL salvo `log.userId`, `log.roleId`, `notification.transmitterId` (NULL cuando notifica el sistema) y `member.adultUserId`. Las bajas son lógicas (por estado o `isActive`), por eso las relaciones usan `RESTRICT` al borrar, salvo las tablas intermedias (`CASCADE`) y esas cuatro FK opcionales (`SET NULL`). Las flags booleanas son NOT NULL con default (`isActive` en true; `isBase`, `isRead` y `linkStatus` en false).
- Permisos por rol (`RolPermiso`) y también directos por usuario (`UsuarioPermiso`), para excepciones puntuales sin crear un rol nuevo.
- Datos personales en Usuario. El alta presencial crea Usuario (pendiente de activación) y Socio.
- Un solo Pago, siempre asociado a una Cuota (sin tienda en el MVP). Cuota = cuota social (Club) + cuota deportiva (ClubDeporte), con el desglose guardado en la cuota (`socialAmount` + `sportAmount`; `sportAmount` es la suma de las cuotas deportivas de cada deporte, ver sección 6). La Cuota lleva `period` (`CHAR(7)`, formato `AAAA-MM`), único **junto con `memberId`** (no único solo) — identifica a qué mes corresponde.
- El vínculo familiar se guarda en Socio (hay un solo vínculo por menor).
- La Categoría pertenece a una Liga. Jugadoras y staff se asignan a la Categoría.
- No hay entidad Fixture (el fixture de una categoría es el conjunto de sus partidos por temporada), ni RutinaEjercicio, ni ConfiguracionClub (fusionadas en Partido, Rutina y Club respectivamente).
- Los conflictos de horario no se guardan: se calculan y su resolución queda en Bitacora.
- Staff no puede ser Socio (regla de la aplicación). El rol activo vive en la sesión (JWT).
- **Citación → Staff, no Usuario:** la FK de "quién genera la citación" apunta a Staff (`staffId`), no a Usuario. Motivo: solo el Staff (entrenadoras) genera citaciones; referenciar Staff directamente es más estricto a nivel de base que depender solo del sistema de permisos.
- **Bitácora simplificada:** sin campos `entidad`/`entidad_id` (puntero genérico a cualquier tabla) ni `dvh`. Queda con `clubId`, `userId`, `roleId`, `action`, `details`, `criticity`, `createdAt`. Se prioriza simplicidad sobre poder de filtrado por entidad afectada (mismo criterio que el `Log.js` de HotelDesk).

---

## 9. Bot de consultas (funcionalidad opcional)

Asistente de consultas generales sobre el club y sobre cómo usar la plataforma, con menú de botones y texto libre. **No es requisito del profesor**, tiene **la última prioridad** del MVP y no debe poner en riesgo los ítems obligatorios ni el cronograma. Si sobra tiempo, se hace **después de los resultados de partidos** (decisión D11, ver sección 7). Si no llega a estar listo, queda en Futuro sin afectar el resto.

- **Acceso:** por el permiso "Usar bot de consultas", que traen los roles Socio, Jugadora y Familia. Un usuario con más de un rol lo ve solo mientras trabaja con un rol activo que lo habilita (ej. un Staff que además es Familia lo ve únicamente en el rol Familia). No está disponible antes del login ni para Staff o Admin del club.
- **Alcance:** solo información general y orientación. No accede a datos personales ni a la base de datos. Los datos del club que usa son los de 2.1.
- **Arquitectura:** React → Express → servicio interno en Flask (Python, TensorFlow/Keras).
- **Ubicación en el repo:** por ahora **fuera del repositorio** (y excluido en `.gitignore`), hasta decidir si se incluye en el trabajo. Si entra, va en una carpeta `bot/` en la raíz del repo y en un módulo `bot` del backend (ver sección 11).
- **Bitácora:** se registran las interacciones del bot.
- **Detalle técnico** (contratos de API, catálogo de intents, reglas del bot, plan por fases, criterios de aceptación): ver `Club360_Bot_Guia_de_Traspaso.md`. *(Ojo: esa guía puede mencionar CAPAL, la tienda o el SuperAdmin; revisar con el recorte.)*

---

## 10. Estado actual y próximos pasos

**Cerrado:** visión, problema/objetivo, arquitectura multi-club, circuito de alta/login, actores y permisos, módulos del MVP (recortados el 04/10), reglas de negocio, futuro/escalabilidad, **DER lógico completo (sección 8; imagen adjunta al proyecto, actualizado el 10/10)**, bot de consultas (resumen en la sección 9; detalle en la guía de traspaso), documento de visión y requisitos, **estructura del proyecto y convenciones técnicas (sección 11, 10/10)**, **valores de los estados (sección 8, 18/10)**, **diseño visual (sección 11, 18/10)**, **recuperación de contraseña y Mi cuenta (3.6.2 y 3.7, 21/10)**, **decisiones D2 a D7, D9 y D11 y emails de la demo (21/10)**, **gestión de roles y permisos (sección 4, 21/10)**, **club y alta de socios, D13 (3.1 y sección 8, 21/10)**, **staff y vínculo familiar (3.4, 3.5 y 3.6, 23/10)**, **ligas y categorías (sección 6, 26/10)**, **notificaciones (sección 6, 31/10; detalle e historial, 01/11)**, **partidos y superposiciones (sección 6, 01/11)**, **citaciones (sección 6, 05/11)**, **inscripciones (3.3, 05/11)**, **cuotas y pagos, D12 (sección 6, 08/11)**, **pago por transferencia y comprobantes de pago (sección 6, 08/11)**, **rutinas y paneles de inicio (sección 6, 08/11)**, **bitácora, integridad y copias de seguridad (sección 11, 09/11)**

**Pendiente:**
1. ~~Modelo DER Lógico completo~~ — cerrado el 04/10/2026, actualizado el 10/10/2026 (ver sección 8)
2. Diagrama de Clases
3. ~~Documento de Visión formal + requisitos funcionales/no funcionales~~ — cerrado el 10/10/2026 (Propósito del sistema, Alcance funcional, requisitos funcionales y no funcionales, ajustados al recorte de alcance). Actualizado el 21/10/2026 con las decisiones D3, D4, D5 y D6: 51 requisitos funcionales (se sumaron el comprobante del alta y la baja de un deporte) y 11 no funcionales
4. Diagrama General de Casos de Uso + especificación de funcionalidad
5. Cronograma de trabajo con objetivo de terminar a mediados de noviembre (dejar margen)
6. Definir roles/participantes del equipo de desarrollo (quién hace qué)
7. Manuales de usuario
8. Diseño de seguridad técnica (encriptación reversible/irreversible, dígitos verificadores horizontales/verticales), bitácora técnica, backup/restore — **definidos el 09/11/2026** (ver sección 11, "Bitácora, integridad y copias de seguridad"); falta redactarlos en la documentación formal. Las particiones no se hacen (ver sección 0)
9. ~~Mecanismo de recuperación de contraseña~~ — cerrado el 21/10/2026 (ver 3.7)
10. ~~Datos de contacto, horarios y direcciones de Valencia y sus canchas~~ — cargados con datos provisorios el 21/10/2026 (D2, ver 2.1). Reemplazar por los reales cuando estén
11. ~~Cómo recibe el adulto responsable el código de vínculo familiar~~ — cerrado el 21/10/2026 (D3, ver 3.5)
12. ~~Pasos de la baja de un deporte desde el perfil del Socio~~ — cerrado el 21/10/2026 (D4, ver 3.3.1)
13. ~~Formato de la Bitácora~~ — cerrado el 10/10/2026 (ver sección 8: `clubId`, `userId`, `roleId`, `action`, `details`, `criticity`, `createdAt`, sin `entidad`/`entidad_id` ni `dvh`)
14. ~~Canal de cada tipo de notificación~~ — cerrado el 21/10/2026 (D5, ver sección 6)
15. ~~Cuota deportiva: una por deporte o una única~~ — cerrado el 21/10/2026: una por deporte (D6, ver sección 6)
16. ~~Almacenamiento de imágenes en el deploy de Render~~ — cerrado el 21/10/2026: Cloudinary en producción (D7, ver sección 11)
17. ~~Valores numéricos de cada estado~~ — cerrado el 18/10/2026 (ver sección 8)
18. ~~Pruebas~~ — cerrado el 21/10/2026: casos de prueba documentados en `.txt`, sin tests automatizados (D9, ver sección 11)
19. ~~Envío de emails en la demo~~ — cerrado el 21/10/2026: Gmail SMTP con nodemailer; el dominio propio con Resend pasa a Futuro (ver secciones 7 y 11)
20. ~~Día de generación y día de vencimiento de la cuota mensual~~ — cerrado el 08/11/2026: se genera el día 1 y vence el 10 (D12, ver sección 6)
21. ~~Dónde se guarda el color de acento de cada club~~ — cerrado el 21/10/2026: campo `club.accentColor` (D13, ver sección 8)

**Stack técnico:** ver sección 11.

---

## 11. Estructura del proyecto y convenciones técnicas (definido el 10/10/2026)

El repositorio incluye un `CLAUDE.md` en la raíz con estas mismas convenciones, para trabajar con Claude Code desde la terminal. Claude Code no ve este documento de claude.ai, así que se guarda una copia en `docs/contexto.md` (junto con `docs/DER_logico.jpg`), que hay que reemplazar cada vez que este documento se actualice. Las tareas para la terminal se pasan como prompts en `docs/prompts/` (ej. `PROMPT_01_estructura_base.md`). El avance del proyecto se sigue en `docs/TODO.md` (desarrollo por fases, entregables de la consigna y decisiones pendientes D1–D13); Claude Code lo actualiza al terminar cada tarea, según la regla del `CLAUDE.md`. Referencia de arquitectura: repo HotelDesk, con las mejoras que se detallan abajo.

**Stack:**
- Backend: Node.js, Express, Sequelize, MySQL 8, JWT, express-validator, multer (imágenes), Cloudinary (imágenes en producción), node-cron (tareas programadas), nodemailer con Gmail SMTP (email; cambió el 21/10/2026, antes Resend). JavaScript con CommonJS.
- Frontend: React + Vite, Material UI, React Router, axios. JavaScript.
- npm como gestor de paquetes. Sin TypeScript, sin ESLint/Prettier, sin `.nvmrc`.
- Aplicación web (no nativa mobile en el MVP).

**Repositorio:** un solo repo con `api/` (backend), `client/` (frontend) y `docs/` (DER y documentación). El bot queda afuera (ver sección 9).

**Organización del backend: por módulo.** Se mantienen las capas de HotelDesk (`route → validator → controller → service → model`), pero en lugar de agrupar los archivos por tipo (todas las rutas juntas, todos los controllers juntos), cada módulo tiene su carpeta en `api/src/modules/<módulo>/` con `<módulo>.routes.js`, `.controller.js`, `.service.js` y `.validator.js`. Los modelos quedan juntos en `api/src/models/` (un archivo por entidad del DER + `index.js` con todas las asociaciones), porque las relaciones cruzan módulos. Motivo: con 4 integrantes cada uno trabaja en su carpeta y hay menos conflictos al hacer merge, y todo lo de un dominio está en un solo lugar.

**Módulos del backend (15):** auth, access (roles y permisos), clubs, members, staff, inscriptions, fees (cuotas y pagos), leagues (ligas y categorías), games (partidos y conflictos), citations, routines, notifications, logs (bitácora), integrity (DVH/DVV), backup.

**Otras carpetas del backend:** `config/` (lee el `.env` una sola vez), `middlewares/` (isAuth, checkPermission, validateFields, upload, cors, errorHandler), `jobs/` (tareas programadas: generación de cuotas, avisos de mora, confirmación automática de citaciones), `utils/` (constantes de estados, mensajes, errores, token, encriptación, dígitos verificadores, bitácora, emails), `seed/` (carga inicial).

**Frontend:** `api/` (un archivo de llamadas por módulo, las páginas no usan axios directo), `context/` (AuthContext con usuario, roles, rol activo y permisos), `hooks/` (useAuth, usePermission), `routes/` (AppRouter y PermissionRoute), `layouts/`, `components/common/` y `components/<módulo>/`, `pages/<módulo>/`, `utils/constants.js` (mismo mapeo de estados que el backend).

**Decisiones técnicas:**
- **Base de datos:** MySQL local para desarrollo; base en la nube (con `DATABASE_URL` y SSL) para el deploy de la demo.
- **Deploy de la demo:** backend en Render; **frontend en Vercel** (21/10/2026), con una regla de reescritura en `client/vercel.json` para que las rutas de React Router funcionen al recargar la página. El front apunta al back con `VITE_API_URL`, y el back usa `FRONTEND_URL` para CORS y para los links de los emails.
- **Tablas con `sequelize.sync()`**, sin migraciones (por tiempo). `DB_FORCE_SYNC` / `DB_ALTER_SYNC` bloqueados en producción.
- **Cambios en el modelo (01/11/2026):** como las bases locales ya tienen datos cargados, cada cambio en el modelo se aplica recreando la base **sin perder los datos**: `npm run db:snapshot` guarda todos los datos en un archivo, se recrea la base con `DB_FORCE_SYNC` y `npm run db:restore` los vuelve a cargar tal cual estaban, con sus dígitos verificadores, y verifica la integridad. Es una herramienta de desarrollo; en producción se usa el módulo de backup. No se usan parches de SQL.
- **Seed como script aparte** (`npm run seed`), no se ejecuta al arrancar el servidor.
- **JWT con `id`, `clubId` y `activeRoleId`.** Cambiar de rol activo genera un token nuevo.
- **Verificación de permisos** (back y front): permisos del rol activo + permisos directos del usuario. El front protege rutas con `PermissionRoute` por permiso, no por rol (en HotelDesk era por rol).
- **Nombres de permisos:** `módulo.acción` (ej. `fees.manage`, `citations.create`), igual que en HotelDesk.
- **Encriptación:** bcrypt para contraseñas (irreversible) y AES-256 para datos sensibles (reversible): el teléfono del usuario (ver sección 8).
- **Imágenes (21/10/2026, decisión D7):** se suben con multer a través del middleware `upload`, que decide dónde guardar según el entorno:
  - **en desarrollo**, en disco (`uploads/`), como HotelDesk;
  - **en producción**, en Cloudinary (plan gratuito), porque el disco de Render no es persistente: se borra en cada reinicio o deploy, y el plan gratuito se duerme después de unos minutos sin uso.
  - Los services no saben dónde se guardó: reciben la URL o la ruta del archivo y la guardan en la base. El front arma la URL con un helper que usa la URL tal cual si es absoluta (Cloudinary) o le antepone `VITE_API_URL` si es una ruta local.
  - Al reemplazar una imagen, se borra la anterior del lugar donde esté.
- **Emails (21/10/2026):**
  - Se envían con **nodemailer y Gmail SMTP**, desde una cuenta de Gmail del equipo con contraseña de aplicación (variables `SMTP_*` en el `.env`). Reemplaza a Resend, que sin un dominio propio verificado solo entrega a la casilla de la cuenta.
  - Límites a tener en cuenta: Gmail permite unos 500 envíos por día y algunos mails pueden caer en spam. Por eso solo algunas notificaciones van por email (ver sección 6).
  - En desarrollo, si no hay SMTP configurado, el mailer muestra por consola el destinatario, el asunto y los links del email.
  - El dominio propio con Resend queda en Futuro (sección 7). El mailer se mantiene detrás de `utils/mailer/`, así que cambiar de proveedor solo toca la configuración.
- **Bitácora, integridad y copias de seguridad (09/11/2026):**
  - **Bitácora:** el Admin la consulta con filtros (fechas, criticidad, acción, usuario y texto) y la descarga en CSV (UTF-8 con separador `;` para Excel). Solo ve los registros de su club. La descarga queda registrada.
  - **Integridad:** se verifica el DVH de cada registro del club (y de los catálogos compartidos de deportes y permisos) y el DVV de cada tabla, al iniciar sesión (con un resultado guardado en memoria por 5 minutos), todas las noches a las 02:30 y a pedido del Admin. Si hay un registro alterado, **el club queda bloqueado**: solo entran quienes tienen permiso de integridad o de backup, para reparar o restaurar; el resto ve "Sistema en mantenimiento" y los procesos automáticos del club se pausan. Se avisa por in-app y email solo cuando el estado pasa de correcto a error. **Reparar** (por tabla o todo, como el CU020 de HotelDesk) recalcula los dígitos y acepta los datos actuales; si se sospecha una modificación externa, se restaura un backup. El informe se descarga en CSV.
  - **Backup por club:** copia en JSON de todas las filas del club (sin la bitácora, ni los catálogos compartidos, ni los archivos subidos), con un checksum SHA-256 para detectar archivos modificados. Manual o automático (domingos a las 03:00); se guardan los últimos 7 por club en `api/backups/club-{id}/`, excluidos del repo, y se pueden descargar (en Render el disco no es persistente, así que en la demo hay que descargarlos).
  - **Restauración por club:** desde un backup de la lista o subiendo un archivo. Solo backups del mismo club, sin modificar y en los que quien restaura existe como usuario activo con permiso de backup. Antes guarda un backup del estado actual, reemplaza los datos del club en una sola transacción (si algo falla, no cambia nada), recalcula los dígitos y verifica la integridad. La bitácora no se restaura, para conservar el rastro de lo que pasó. No afecta a otros clubes.
- **Pruebas (21/10/2026, decisión D9):** sin tests automatizados. Las pruebas son **casos de prueba documentados en archivos `.txt`**, en `docs/pruebas/`, uno por módulo. Cada caso indica ID, módulo, descripción, precondiciones, pasos, datos de entrada, resultado esperado, resultado obtenido y estado. Los scripts de verificación que corre Claude Code en cada prompt se mantienen como chequeo técnico, pero no reemplazan los casos documentados.

**Diseño visual (definido el 18/10/2026, decisión D10):** referencia oficial: el moodboard adjunto al proyecto (`Club360_Moodboard.png`, "Propuesta 1"), copiado en el repo como `docs/moodboard.png`. Personalidad: **ordenado, vivo, cercano, confiable** — "orden de tablero, energía de partido y calidez de club de barrio".
- **Paleta:** Marino `#0F1B3D` (estructura: menú lateral, encabezados, títulos), Naranja `#EA6A1F` (**lo urgente**: acción principal y avisos que requieren atención), Azul `#1E40AF` (acciones secundarias, links, selección), Crema `#FBF4E6` (fondos cálidos), Bordó `#8E2C3A` (guiño al club de barrio, por ejemplo el carnet de socio), Verde `#1F8A5B`. Fondo del área de trabajo `#F6F7FB`, tarjetas en blanco.
- **Colores de estado** (chips con fondo claro y texto oscuro): verde = al día (`#E3F4EB` / `#16683F`), ámbar = pendiente (`#FEF3C7` / `#8A5300`), rojo = vencida (`#FCE8E8` / `#A32929`), naranja = urgente, por ejemplo una citación pendiente (`#FDEBDD` / `#B4470D`).
- **Tipografía:** Poppins para títulos, textos y botones; Barlow Condensed **solo para números** (resultados, fechas y horas de partidos, número de socio).
- **Íconos:** los redondeados de Material UI (variante *Rounded*).
- **Texturas:** "líneas de cancha" (cancha naranja sobre marino) en el login y los encabezados; "trama de red" en las grillas de accesos; "parquet" en las rutinas y los estados vacíos.
- **Imágenes:** fotos reales del club, nada de bancos de imágenes.
- **Acento del club:** el color propio de cada club, para personalizar la plataforma. Para Valencia, provisoriamente Celeste Valencia `#2E9BD6` (ver 2.1). Es solo un acento, por ejemplo una franja junto al nombre del club en el menú lateral o en el carnet de socio: no reemplaza a ningún color de la paleta. Se guarda en `club.accentColor` (decisión D13, ver sección 8).

**Convenciones de código:** código, tablas y campos en inglés camelCase (igual que el DER); mensajes al usuario e interfaz en español. Archivos del backend con el nombre del módulo (`fees.service.js`); modelos en PascalCase singular (`Member.js`); componentes y páginas de React en PascalCase. Variables de entorno solo en `.env` (se sube únicamente `.env.example`), sin URLs hardcodeadas. Sin archivos duplicados por persona (`-Sofi`, `-v2`): se usan ramas de git.
# CLUB360 — Proyecto Integrador (Colegio)
Plataforma de gestión para clubes deportivos. Módulo desarrollado en profundidad: **Vóley, club Valencia**.

Este documento es el contexto acumulado del proyecto. Está pensado para pegarse como "conocimiento del proyecto" en Claude, de forma que cualquier chat nuevo pueda continuar el trabajo sin perder las decisiones ya tomadas. Todo lo que figura acá está **definido y acordado** salvo que se indique lo contrario.

**Convenciones del documento:**
- Cada regla vive en **un solo lugar**; en el resto del documento se referencia con "ver sección X". Si una regla cambia, se actualiza solo en su lugar de origen.
- `[A DEFINIR]` marca una contradicción o ambigüedad que necesita una decisión explícita. `[COMPLETAR]` marca datos que faltan cargar.

**Última actualización (04/10/2026) — reducción de alcance:** se adelantó la fecha de entrega y se recortó el MVP. Salen del MVP (pasan a Futuro, sección 7): módulo de seguimiento personal de la jugadora, tienda de merch y panel de SuperAdmin (reemplazado por un script de carga inicial). El caso real pasa a ser el club **Valencia** (antes CAPAL). Se definieron dos tipos de cuota: social y deportiva (ver sección 6).

**Última actualización (10/10/2026) — DER lógico final:** el DER lógico definitivo (24 entidades, nombres de tabla/campo en inglés camelCase, igual que el código Sequelize) queda como **imagen adjunta al conocimiento del proyecto**. Incorporó varios ajustes respecto de la primera versión del modelo — ver el detalle en sección 8.

**Última actualización (10/10/2026) — estructura del proyecto:** se definió la estructura del repositorio, la organización del código por módulos, el stack completo y las convenciones técnicas (ver sección 11). El bot de consultas queda fuera del repo hasta decidir si entra en el trabajo (ver sección 9).

---

## 0. Contexto de la consigna escolar

El proyecto integrador sigue el ciclo de vida de desarrollo de software (Ingeniería de Sistemas, Análisis, Diseño, Codificación, Prueba, Utilización, Mantenimiento) y debe entregar, entre otras cosas: documento de Visión, requisitos funcionales/no funcionales, actores del sistema, participantes del equipo, descripción de escalabilidad, DER lógico, Diagrama de Clases, Diagrama General de Casos de Uso, especificación de funcionalidad, manuales de usuario, y debe implementar seguridad (login/roles, encriptación, dígitos verificadores, patentes y familias), bitácora, estrategias de base de datos (backup/restore, particiones, integridad), manejo de idiomas. **Decisión: la plataforma tendrá un único idioma, español.**

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
- **Argumento de Escalabilidad:** agregar un club nuevo no requiere rediseño ni cambios de código, solo correr el script con otros datos. El panel de SuperAdmin queda en Futuro (sección 7).

---

## 3. Circuito de alta y login de usuarios

**3.1 Alta de Socio**
- El alta es presencial: la persona se acerca al club, el Admin la da de alta y le entrega su **número de socio único, de una sola vez**. Con ese número ingresa por primera vez a la plataforma y genera su propio usuario/contraseña.
- Si es **menor de edad**: se genera automáticamente un código de vínculo familiar para un adulto responsable (ver 3.5).
- Si es **mayor de edad**: sin código, gestión de cuotas propia habilitada desde el alta.
- El número de socio se entrega una sola vez en el alta presencial y se usa una única vez para completar el registro (generación de usuario/contraseña). A partir de ese momento el Socio ingresa siempre con usuario y contraseña; el número de socio queda asociado a la persona de forma permanente como identificador, pero no se reutiliza para futuros inicios de sesión.

**3.2 Perfil base de Socio**
- Gestión de datos personales y cuotas/pagos propios.
- Inscripción o baja a un deporte.
- Acceso a información general del club.
- Notificaciones.
- Acceso al bot de consultas (funcionalidad opcional, ver sección 9).

**3.3 Socio → Socio-Deportista**
- El Socio solicita inscripción a un deporte (botón "Inscripción a un deporte").
- El Representante del deporte aprueba → el Socio pasa a tener el rol **Jugadora** (Socio-Deportista), que incluye todas las funciones y permisos del rol Socio más las deportivas. Es una extensión del perfil base, **no** un usuario nuevo, y no alterna entre ambos roles.
- Al pasar a Jugadora se le suma la cuota deportiva (ver sección 6).

**3.4 Mayoría de edad (detección automática)**
- Por fecha de nacimiento, sin intervención manual.
- Al cumplir 18: se habilita la opción de desvincularse del adulto responsable + acceso propio a la gestión de cuotas.
- Si no se desvincula, ambos (Socio y adulto) pueden operar en paralelo — la Bitácora registra quién hizo cada acción.
- **Nota de diseño:** este mecanismo (habilitar/deshabilitar acceso según una condición calculada, no según rol fijo) es el caso de uso real para el ítem de consigna "Patentes y Familias".

**3.5 Alta de Familia y código de vínculo familiar**
- Se registra con el código de vínculo familiar: de un solo uso, un código por cada Socio menor, un adulto por Socio menor.
- Un mismo adulto puede vincularse a varios Socios menores (hermanos) y/o ser Socio independiente él mismo.
- Si el usuario Familia es también Socio por su cuenta, tiene ambos roles (ver "Rol activo" más abajo).
- Un usuario Staff puede ser también Familia de un Socio menor (no puede ser Socio, ver 3.6); tiene ambos roles (ver "Rol activo" más abajo).
- Un usuario puede ser "Jugadora" y estar vinculado como "Familia" de otra jugadora (mayor de edad), sin conflicto entre roles.
- **Rol activo:** un usuario con más de un rol (ej. Familia y Socio, Familia y Jugadora, Familia y Staff) elige con qué rol trabajar y alterna entre sus dashboards. Los permisos efectivos son **solo los del rol activo**, no la suma de ambos. La Bitácora registra con qué rol se hizo cada acción.

**3.6 Alta de Staff** (Representante, entrenadoras, preparadora física)
- No pasa por el circuito de Socio. Alta directa por el Admin del club, con rol de staff ya asignado.
- Un usuario Staff **no puede ser además Socio**: o es Staff o es Socio. Sí puede ser además Familia (ver 3.5).

**3.7 Recuperación de contraseña**
- Desde el login, botón "Olvidé mi contraseña".
- Mecanismo de recuperación: [PENDIENTE DE DEFINIR] (ver sección 10, pendiente 9).
- Es una función del sistema, independiente del bot de consultas (que solo funciona con la sesión iniciada).

---

## 4. Actores y permisos

**Roles del sistema (7):** Socio (perfil base), Jugadora (Socio-Deportista), Familia, Representante, Entrenadora, Preparadora física y Admin del club. *(El SuperAdmin salió del MVP; ver sección 2 y 7. Estos 7 son los roles base del DER, `Rol.es_base`, ver sección 8.)*

Los actores se describen por rol para facilitar la lectura, pero el acceso a pantallas y acciones se implementa por **permisos** (patentes): cada rol es un conjunto de permisos (familia), y el front y el back verifican el permiso, no el rol. Además de los permisos por rol, un usuario puede tener permisos directos (tabla `UsuarioPermiso`, ver sección 8) para excepciones puntuales sin crear un rol nuevo. Un usuario con más de un rol trabaja con un rol activo a la vez (ver 3.5).

**Funciones comunes** — todos los usuarios con sesión
- Iniciar sesión, recuperar contraseña y modificar sus datos de cuenta
- Ver notificaciones (canales: ver sección 5, módulo 6)

**Admin del Club** — acotado a su propio club
- Dar de alta, modificar y dar de baja Socios (ver 3.1) y Staff (ver 3.6)
- Gestionar cuotas sociales y deportivas, incluido el parámetro de días de atraso (ver sección 6)
- Activar deportes del catálogo maestro para su club
- Configurar parámetros globales, como el margen de conflicto horario
- Asignar roles a usuarios, editar los permisos de cada rol y crear roles nuevos. Los roles base no se pueden eliminar
- Consultar y descargar la bitácora
- Enviar notificaciones generales

**Representante del deporte**
- Crear, modificar y eliminar ligas y categorías
- Asignar jugadoras a liga/categoría
- Asignar entrenadoras y preparadoras físicas a sus ligas/categorías
- Publicar y editar fixtures con dirección. El sistema avisa si hay superposición
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
- Solicitar inscripción o baja de un deporte
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
6. Notificaciones (in-app y email): citación, fixture/conflicto, rutina publicada, cuota por vencer/vencida, avisos generales. **Qué canal se usa para cada tipo: [A DEFINIR]** (ver sección 10, pendiente 14)
7. Vínculo familiar por código (ver 3.5)
8. Bitácora de actividad y decisiones de negocio
9. Carga inicial de club y catálogo de deportes por script (ver sección 2) — sin panel de SuperAdmin
10. **Bot de consultas (FUNCIONALIDAD OPCIONAL, última prioridad)**: ver sección 9.

---

## 6. Reglas de negocio clave

- **Conflictos de horario:** los resuelven las entrenadoras entre sí; el sistema solo avisa y registra en bitácora quién lo resolvió. No se guarda una entidad de conflicto: se calculan a partir de los partidos de cada jugadora y el margen configurado.
- **Margen de conflicto:** el margen mínimo entre partidos para considerarlo "conflicto" es un parámetro configurable por el Admin del club (no fijo en código).
- **Tipos de cuota:** hay **cuota social** y **cuota deportiva**. Un Socio paga solo la cuota social; si además es deportista (Jugadora), se suman ambas. Si la cuota deportiva es una por cada deporte en que se inscribe o una única: [A DEFINIR] (en el MVP solo existe Vóley; ver sección 10, pendiente 15).
- **Mora (únicas dos restricciones funcionales del MVP):** con más de 180 días de atraso (default, configurable por el Admin) → (1) la jugadora puede perder su condición de socia y (2) la entrenadora no puede citarla hasta que regularice su situación. El resto del sistema sigue accesible (solo aviso/badge informativo). Se envían notificaciones desde el primer mes de atraso, junto con las advertencias correspondientes, si no regulariza su situación.
- **Pagos de cuotas simulados:** se registra estado de transacción (pendiente/aprobado/rechazado), sin pasarela real conectada. Sin tienda en el MVP, todo Pago está asociado a una Cuota (ver sección 8).
- **Citación:** mínimo 2 días de anticipación al partido; la jugadora tiene 24 hs para rechazar con justificación, si no queda confirmada automáticamente. La responde siempre la jugadora, aunque sea menor. La genera siempre un miembro del Staff (ver sección 8 — FK de Citación a Staff, no a Usuario genérico).
- Formato de exportación de la bitácora: CSV.

---

## 7. Futuro / Escalabilidad (documentado, NO se construye en el MVP)

**Recortados del MVP el 04/10/2026:**
- Panel de SuperAdmin (Administrador de Plataforma): alta de clubes y asignación del primer Admin, mantenimiento del catálogo maestro de deportes, consulta y corrección de datos de un club como soporte (con registro en bitácora), sin poder ingresar como otro usuario
- Módulo de seguimiento personal de la jugadora: registro semanal de cumplimiento de rutina (completada/parcial/no completada + nota + percepción de esfuerzo 1-5), objetivos personales (texto + fecha límite + estado) y progreso con gráficos básicos
- Tienda de merch tipo e-commerce (productos, pedidos, detalle), habilitada para mayores de 18 y familias, con catálogo gestionable y delegable por permiso

**Otras mejoras futuras:**
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
- `member.numMember`: `VARCHAR(20) UNIQUE NOT NULL`, generado por la aplicación (no autoincrement, no lo calcula la base) — mismo patrón que `confirmationCode` en HotelDesk.
- Relaciones dibujadas con línea simple, sin círculo de opcionalidad: la nulabilidad de cada FK está indicada en su propia columna, no en la flecha.
- Sin SuperAdmin en el MVP: todo Usuario pertenece a un club (`club_id NOT NULL`) y hay 7 roles base (`Rol.es_base`). La Bitácora también tiene `club_id NOT NULL` (ya no hay acciones de plataforma sin club).
- **Roles por club:** `role.name` es único **junto con `clubId`** (índice compuesto `(clubId, name)`), no único en toda la base, para que cada club tenga sus propios roles base.
- **La imagen del DER quedó desactualizada en dos restricciones (10/10/2026); manda este documento:** en `fee`, `memberId` y `period` no son únicos por separado (es un único compuesto `(memberId, period)`, ver más abajo); en `role`, `name` no es único global (ver el punto anterior).
- Permisos por rol (`RolPermiso`) y también directos por usuario (`UsuarioPermiso`), para excepciones puntuales sin crear un rol nuevo.
- Datos personales en Usuario. El alta presencial crea Usuario (pendiente de activación) y Socio.
- Un solo Pago, siempre asociado a una Cuota (sin tienda en el MVP). Cuota = cuota social (Club) + cuota deportiva (ClubDeporte), con el desglose guardado en la cuota (`socialAmount` + `sportAmount`). La Cuota lleva `period` (`CHAR(7)`, formato `AAAA-MM`), único **junto con `memberId`** (no único solo) — identifica a qué mes corresponde.
- El vínculo familiar se guarda en Socio (hay un solo vínculo por menor).
- La Categoría pertenece a una Liga. Jugadoras y staff se asignan a la Categoría.
- No hay entidad Fixture (el fixture de una categoría es el conjunto de sus partidos por temporada), ni RutinaEjercicio, ni ConfiguracionClub (fusionadas en Partido, Rutina y Club respectivamente).
- Los conflictos de horario no se guardan: se calculan y su resolución queda en Bitacora.
- Staff no puede ser Socio (regla de la aplicación). El rol activo vive en la sesión (JWT).
- **Citación → Staff, no Usuario:** la FK de "quién genera la citación" apunta a Staff (`staffId`), no a Usuario. Motivo: solo el Staff (entrenadoras) genera citaciones; referenciar Staff directamente es más estricto a nivel de base que depender solo del sistema de permisos.
- **Bitácora simplificada:** sin campos `entidad`/`entidad_id` (puntero genérico a cualquier tabla) ni `dvh`. Queda con `clubId`, `userId`, `roleId`, `action`, `details`, `criticity`, `createdAt`. Se prioriza simplicidad sobre poder de filtrado por entidad afectada (mismo criterio que el `Log.js` de HotelDesk).

---

## 9. Bot de consultas (funcionalidad opcional)

Asistente de consultas generales sobre el club y sobre cómo usar la plataforma, con menú de botones y texto libre. **No es requisito del profesor**, tiene **la última prioridad** del MVP y no debe poner en riesgo los ítems obligatorios ni el cronograma. Si no llega a estar listo, pasa a Futuro sin afectar el resto.

- **Acceso:** por el permiso "Usar bot de consultas", que traen los roles Socio, Jugadora y Familia. Un usuario con más de un rol lo ve solo mientras trabaja con un rol activo que lo habilita (ej. un Staff que además es Familia lo ve únicamente en el rol Familia). No está disponible antes del login ni para Staff o Admin del club.
- **Alcance:** solo información general y orientación. No accede a datos personales ni a la base de datos.
- **Arquitectura:** React → Express → servicio interno en Flask (Python, TensorFlow/Keras).
- **Ubicación en el repo:** por ahora **fuera del repositorio** (y excluido en `.gitignore`), hasta decidir si se incluye en el trabajo. Si entra, va en una carpeta `bot/` en la raíz del repo y en un módulo `bot` del backend (ver sección 11).
- **Bitácora:** se registran las interacciones del bot.
- **Detalle técnico** (contratos de API, catálogo de intents, reglas del bot, plan por fases, criterios de aceptación): ver `Club360_Bot_Guia_de_Traspaso.md`. *(Ojo: esa guía puede mencionar CAPAL, la tienda o el SuperAdmin; revisar con el recorte.)*

---

## 10. Estado actual y próximos pasos

**Cerrado:** visión, problema/objetivo, arquitectura multi-club, circuito de alta/login, actores y permisos, módulos del MVP (recortados el 04/10), reglas de negocio, futuro/escalabilidad, **DER lógico completo (sección 8; imagen adjunta al proyecto, actualizado el 10/10)**, bot de consultas (resumen en la sección 9; detalle en la guía de traspaso), documento de visión y requisitos, **estructura del proyecto y convenciones técnicas (sección 11, 10/10)**

**Pendiente:**
1. ~~Modelo DER Lógico completo~~ — cerrado el 04/10/2026, actualizado el 10/10/2026 (ver sección 8)
2. Diagrama de Clases
3. ~~Documento de Visión formal + requisitos funcionales/no funcionales~~ — cerrado el 10/10/2026 (Propósito del sistema, Alcance funcional, 51 requisitos funcionales y 11 no funcionales, ajustados al recorte de alcance). Revisar el requisito de cuotas (42) y el de notificaciones (47) cuando se resuelvan los pendientes 14 y 15
4. Diagrama General de Casos de Uso + especificación de funcionalidad
5. Cronograma de trabajo con objetivo de terminar a mediados de noviembre (dejar margen)
6. Definir roles/participantes del equipo de desarrollo (quién hace qué)
7. Manuales de usuario
8. Diseño de seguridad técnica (encriptación reversible/irreversible, dígitos verificadores horizontales/verticales), bitácora técnica, backup/restore, particiones — aún no desarrollados en detalle
9. Mecanismo de recuperación de contraseña (3.7)
10. Datos de contacto, horarios y direcciones de Valencia y sus canchas (los usa el bot). FALTA COMPLETAR
11. Cómo recibe el adulto responsable el código de vínculo familiar
12. Pasos de la baja de un deporte desde el perfil del Socio (3.2)
13. ~~Formato de la Bitácora~~ — cerrado el 10/10/2026 (ver sección 8: `clubId`, `userId`, `roleId`, `action`, `details`, `criticity`, `createdAt`, sin `entidad`/`entidad_id` ni `dvh`)
14. Canal de cada tipo de notificación (in-app, email o ambos) (ver sección 5, módulo 6)
15. Cuota deportiva: una por deporte o una única (ver sección 6)
16. Almacenamiento de imágenes (rutinas, fotos) en el deploy de la demo en Render, donde el disco no es persistente (ver sección 11)
17. Valores numéricos de cada estado (`USER_STATES`, `FEE_STATES`, etc.): hay una propuesta en `utils/constants.js` marcada `[A DEFINIR]`, falta confirmarla
18. Pruebas: definir si se hacen tests automatizados o solo casos de prueba documentados (por ahora no es prioridad)

**Stack técnico:** ver sección 11.

---

## 11. Estructura del proyecto y convenciones técnicas (definido el 10/10/2026)

El repositorio incluye un `CLAUDE.md` en la raíz con estas mismas convenciones, para trabajar con Claude Code desde la terminal. Claude Code no ve este documento de claude.ai, así que se guarda una copia en `docs/contexto.md` (junto con `docs/DER_logico.jpg`), que hay que reemplazar cada vez que este documento se actualice. Las tareas para la terminal se pasan como prompts en `docs/prompts/` (ej. `PROMPT_01_estructura_base.md`). El avance del proyecto se sigue en `docs/TODO.md` (desarrollo por fases, entregables de la consigna y decisiones pendientes D1–D10); Claude Code lo actualiza al terminar cada tarea, según la regla del `CLAUDE.md`. Referencia de arquitectura: repo HotelDesk, con las mejoras que se detallan abajo.

**Stack:**
- Backend: Node.js, Express, Sequelize, MySQL 8, JWT, express-validator, multer (imágenes), node-cron (tareas programadas), Resend (email, igual que HotelDesk). JavaScript con CommonJS.
- Frontend: React + Vite, Material UI, React Router, axios. JavaScript.
- npm como gestor de paquetes. Sin TypeScript, sin ESLint/Prettier, sin `.nvmrc`.
- Aplicación web (no nativa mobile en el MVP).

**Repositorio:** un solo repo con `api/` (backend), `client/` (frontend) y `docs/` (DER y documentación). El bot queda afuera (ver sección 9).

**Organización del backend: por módulo.** Se mantienen las capas de HotelDesk (`route → validator → controller → service → model`), pero en lugar de agrupar los archivos por tipo (todas las rutas juntas, todos los controllers juntos), cada módulo tiene su carpeta en `api/src/modules/<módulo>/` con `<módulo>.routes.js`, `.controller.js`, `.service.js` y `.validator.js`. Los modelos quedan juntos en `api/src/models/` (un archivo por entidad del DER + `index.js` con todas las asociaciones), porque las relaciones cruzan módulos. Motivo: con 4 integrantes cada uno trabaja en su carpeta y hay menos conflictos al hacer merge, y todo lo de un dominio está en un solo lugar.

**Módulos del backend (15):** auth, access (roles y permisos), clubs, members, staff, inscriptions, fees (cuotas y pagos), leagues (ligas y categorías), games (partidos y conflictos), citations, routines, notifications, logs (bitácora), integrity (DVH/DVV), backup.

**Otras carpetas del backend:** `config/` (lee el `.env` una sola vez), `middlewares/` (isAuth, checkPermission, validateFields, upload, cors, errorHandler), `jobs/` (tareas programadas: generación de cuotas, avisos de mora, confirmación automática de citaciones), `utils/` (constantes de estados, mensajes, errores, token, encriptación, dígitos verificadores, bitácora, emails), `seed/` (carga inicial).

**Frontend:** `api/` (un archivo de llamadas por módulo, las páginas no usan axios directo), `context/` (AuthContext con usuario, roles, rol activo y permisos), `hooks/` (useAuth, usePermission), `routes/` (AppRouter y PermissionRoute), `layouts/`, `components/common/` y `components/<módulo>/`, `pages/<módulo>/`, `utils/constants.js` (mismo mapeo de estados que el backend).

**Decisiones técnicas:**
- **Base de datos:** MySQL local para desarrollo; base en la nube (con `DATABASE_URL` y SSL) para el deploy de la demo. El backend de la demo se deploya en Render.
- **Tablas con `sequelize.sync()`**, sin migraciones (por tiempo). `DB_FORCE_SYNC` / `DB_ALTER_SYNC` bloqueados en producción.
- **Seed como script aparte** (`npm run seed`), no se ejecuta al arrancar el servidor.
- **JWT con `id`, `clubId` y `activeRoleId`.** Cambiar de rol activo genera un token nuevo.
- **Verificación de permisos** (back y front): permisos del rol activo + permisos directos del usuario. El front protege rutas con `PermissionRoute` por permiso, no por rol (en HotelDesk era por rol).
- **Nombres de permisos:** `módulo.acción` (ej. `fees.manage`, `citations.create`), igual que en HotelDesk.
- **Encriptación:** bcrypt para contraseñas (irreversible) y AES-256 para datos sensibles (reversible).
- **Imágenes:** multer guardando en disco, como HotelDesk. Pendiente resolver el almacenamiento para Render (ver sección 10, pendiente 16).
- **Backups:** se guardan en `api/backups/`, excluidos del repo.

**Convenciones de código:** código, tablas y campos en inglés camelCase (igual que el DER); mensajes al usuario e interfaz en español. Archivos del backend con el nombre del módulo (`fees.service.js`); modelos en PascalCase singular (`Member.js`); componentes y páginas de React en PascalCase. Variables de entorno solo en `.env` (se sube únicamente `.env.example`), sin URLs hardcodeadas. Sin archivos duplicados por persona (`-Sofi`, `-v2`): se usan ramas de git.
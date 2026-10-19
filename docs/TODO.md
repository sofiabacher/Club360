# Club360 — Lista de tareas

Seguimiento de todo lo que falta para entregar el proyecto: desarrollo, entregables de la consigna y decisiones pendientes.

**Entrega:** fines de noviembre de 2026 (fecha exacta [COMPLETAR]). **Objetivo interno:** todo listo a mediados de noviembre.

## Cómo se usa

- `[ ]` pendiente · `[~]` en curso · `[x]` hecho · `[!]` bloqueado (se indica por qué)
- Responsable: se agrega `@nombre` al final de la tarea cuando alguien la toma (Sofía, Thiago, Ignacio, Julián).
- `(P01)` indica el prompt de `docs/prompts/` que resuelve la tarea. Los prompts se van escribiendo a medida que se avanza.
- Una tarea se marca `[x]` solo cuando está terminada **y verificada** (anda, compila, se probó el caso). Si quedó a medias, queda `[~]` con una nota.
- Cada vez que se complete algo, se mueve también a **Registro** (al final), con la fecha.
- Las fases de desarrollo están en orden de dependencia: cada una usa lo que construyó la anterior.

---

## Fase 0 — Preparación del repo

- [] Crear el repo en GitHub y sumar a los 4 integrantes
- [x] Copiar `CLAUDE.md` en la raíz, y `docs/contexto.md`, `docs/DER_logico.jpg` y `docs/prompts/` en `docs/`
- [x] Crear la base `club360` en el MySQL local de cada integrante
- [x] Estructura base del proyecto: carpetas, configuración, middlewares, utils, front base (P01)
- [x] Revisar el resultado del P01 y hacer el primer commit

## Fase 1 — Base de datos

- [x] Los 24 modelos de Sequelize según el DER, con las correcciones del contexto (P02)
- [x] Asociaciones entre modelos en `models/index.js` (P02)
- [x] Índices únicos compuestos: `fee (memberId, period)` y `role (clubId, name)` (P02)
- [x] Valores definitivos de los estados en `utils/constants.js` (api y client) y `defaultValue: 1` en cada campo de estado de los modelos (D8, contexto sección 8)
- [x] Cálculo automático de DVH al crear/modificar y recálculo del DVV de la tabla (hooks de Sequelize)
- [x] Catálogo de permisos (`módulo.acción`) y qué permisos trae cada uno de los 7 roles base — definido en el contexto, sección 4.1 (41 permisos)
- [x] Seed completo: deportes, club Valencia, Vóley activado, permisos (catálogo de la sección 4.1 del contexto), roles base y usuario Admin
- [ ] Datos de prueba: socios, jugadoras, familias, staff, ligas y partidos para probar y para la demo

## Fase 2 — Seguridad y acceso

- [x] Login con usuario y contraseña, bloqueo después de 5 intentos fallidos (P04)
- [x] Registro del Socio con número de socio y fecha de nacimiento (primer ingreso: genera usuario y contraseña) (P04)
- [x] Elección y cambio de rol activo (genera un token nuevo) (P04)
- [x] Endpoint `/auth/me`: usuario, roles, rol activo y permisos efectivos (P04)
- [!] Recuperación de contraseña — bloqueado: falta definir el mecanismo (decisión D1)
- [!] Desbloqueo de usuarios bloqueados por intentos fallidos — bloqueado: falta definir quién y cómo lo hace (contexto 3.6.1, se resuelve junto con la D1)
- [ ] Modificar los datos de la propia cuenta
- [ ] Gestión de roles: crear, editar permisos, asignar a usuarios, impedir borrar roles base
- [ ] Permisos directos por usuario (`user_permission`)
- [x] Front: pantalla de login, registro con número de socio y selector de rol activo (P04; falta probarlas a mano en el navegador)
- [ ] Front: layout de dashboard con menú armado según los permisos (responsive)
- [ ] Front: pantallas de gestión de roles y permisos

## Fase 3 — Club y personas

- [ ] Parámetros del club: cuota social, días de atraso, margen de conflicto
- [ ] Activación de deportes del catálogo para el club, con su cuota deportiva
- [ ] Alta presencial de Socio: genera el número de socio y crea el usuario pendiente de activación
- [ ] Código de vínculo familiar automático para los socios menores de edad
- [!] Entrega del código de vínculo al adulto — bloqueado: falta definir cómo lo recibe (decisión D3)
- [ ] Pantalla "Vincularme como Familia" desde el login: con el código, crea la cuenta o suma el rol Familia a un usuario existente (un solo uso)
- [ ] Detección de la mayoría de edad: habilita desvincularse del adulto y pagar las propias cuotas
- [ ] Modificación y baja de Socios
- [ ] Alta, modificación y baja de Staff (impedir que un Staff sea también Socio)
- [ ] Front: pantallas del Admin (socios, staff, parámetros del club, deportes)
- [ ] Front: perfil del Socio y vinculación de Familia

## Fase 4 — Gestión deportiva

- [ ] Solicitud de inscripción a un deporte y aprobación por el Representante (otorga el rol Jugadora)
- [!] Baja de un deporte desde el perfil del Socio — bloqueado: faltan definir los pasos (decisión D4)
- [ ] Ligas y categorías: crear, modificar, eliminar
- [ ] Asignación de jugadoras y staff a las categorías
- [ ] Partidos (fixture) con dirección de la cancha
- [ ] Marcar un partido como Jugado (Representante)
- [ ] Cancelar un partido: pasa sus citaciones a Cancelada y notifica a las jugadoras citadas
- [ ] Detección de superposición de horarios según el margen del club
- [ ] Resolución de conflictos entre entrenadoras, registrada en bitácora
- [ ] Citaciones: mínimo 2 días antes, sin jugadoras con mora vencida, solo para partidos Programados
- [ ] Respuesta a la citación: confirmar o rechazar con justificación dentro de las 24 hs
- [ ] Job: confirmación automática de las citaciones sin respuesta
- [ ] Rutinas semanales por categoría (texto, imagen, link de video) con historial
- [ ] Front: pantallas del Representante, la Entrenadora y la Preparadora física
- [ ] Front: dashboard de la Jugadora (fixtures y citaciones, separados si juega en 2 ligas, y rutina)
- [ ] Front: vista de solo lectura para la Familia

## Fase 5 — Cuotas y pagos

- [!] Cuota deportiva: una por deporte o una única — bloqueado (decisión D6)
- [ ] Job: generación de la cuota mensual (social + deportiva, con el desglose)
- [ ] Pago simulado (pendiente / aprobado / rechazado); el Socio menor ve sus cuotas pero no paga
- [ ] Job: cuotas vencidas, avisos de mora desde el primer mes y pérdida de la condición de socia al superar el plazo (Socio a Suspendido)
- [ ] Recuperación automática del Socio suspendido: al aprobarse un pago, vuelve a Activo si ya no le queda ninguna cuota que supere el plazo de mora
- [ ] Estado de cuotas de las jugadoras para el Representante
- [ ] Front: estado de cuenta y pago (Socio, Jugadora y Familia) y gestión de cuotas (Admin)

## Fase 6 — Funciones transversales

- [!] Notificaciones in-app y por email — bloqueado parcialmente: falta el canal de cada tipo (decisión D5)
- [ ] Envío de notificaciones generales (Admin) y a jugadoras, familias y entrenadoras (Representante, Entrenadora)
- [ ] Bitácora: consulta con filtros y exportación CSV
- [ ] Integridad: verificar DVH/DVV de todas las tablas y reparar
- [ ] Backup y restore de la base
- [ ] Particiones de la base (ítem de la consigna): definir estrategia e implementarla
- [ ] Front: pantallas de bitácora, integridad, backup y notificaciones

## Fase 7 — Deploy de la demo

- [!] Almacenamiento de imágenes en Render — bloqueado: falta definir la solución (decisión D7)
- [ ] Base de datos en la nube
- [ ] Backend en Render
- [ ] Frontend: definir dónde se publica y hacer el deploy
- [ ] Cargar los datos de la demo y probar el recorrido completo de cada rol

## Fase 8 — Documentación y entregables de la consigna

Formato de referencia: el PDF de HotelDesk.

- [x] Documento de Visión: propósito y alcance funcional
- [x] Requisitos funcionales y no funcionales
- [x] DER lógico
- [x] Catálogo de permisos por rol (Documentación, sección 4.1)
- [ ] Participantes del equipo y roles (quién hace qué)
- [ ] Cronograma de trabajo hasta mediados de noviembre
- [ ] Actores del sistema y descripción de escalabilidad
- [ ] Diagrama de Clases
- [ ] Diagrama General de Casos de Uso
- [ ] Especificación de funcionalidad (casos de uso)
- [ ] Diseño de seguridad técnica: encriptación, dígitos verificadores, patentes y familias
- [ ] Estrategias de base de datos: backup/restore, particiones, integridad
- [ ] Casos de prueba (decisión D9)
- [ ] Manuales de usuario
- [ ] Armado del documento final con todo lo anterior

## Decisiones pendientes

Cada una se resuelve en el chat de Claude y se registra en el documento de contexto (copiarlo de nuevo a `docs/contexto.md`).

- [ ] **D1** — Mecanismo de recuperación de contraseña
- [ ] **D2** — Datos de contacto, horarios y direcciones de Valencia y sus canchas
- [ ] **D3** — Cómo recibe el adulto el código de vínculo familiar
- [ ] **D4** — Pasos de la baja de un deporte desde el perfil del Socio
- [ ] **D5** — Canal de cada tipo de notificación (in-app, email o ambos)
- [ ] **D6** — Cuota deportiva: una por deporte o una única
- [ ] **D7** — Almacenamiento de imágenes en el deploy de Render
- [x] **D8** — Valores numéricos de los estados (resuelto el 18/10/2026, contexto sección 8)
- [ ] **D9** — Pruebas: tests automatizados o casos de prueba documentados
- [x] **D10** — Paleta de colores y estilo visual de Club360 (resuelto el 18/10/2026, moodboard en `docs/moodboard.png`; falta el color propio de Valencia)
- [ ] **D11** — Si sobra tiempo para uno solo: resultados de partidos o bot de consultas primero

## Si queda tiempo (prioridad 1 de Futuro)

- [ ] Resultados de partidos y campaña por categoría: `ownScore` y `rivalScore` en `game`, carga al marcar el partido como Jugado, campaña en los dashboards de la Jugadora y el Representante (contexto sección 7)

## Opcional (última prioridad)

- [ ] Decidir si se incluye el bot de consultas en el trabajo
- [ ] Si se incluye: implementarlo según `Club360_Bot_Guia_de_Traspaso.md`

---

## Registro

Lo terminado, con la fecha. Lo más reciente arriba.

- 18/10/2026 — Login y sesión (P04): login con bloqueo por intentos, registro con número de socio y fecha de nacimiento, roles disponibles según la condición de socio, elección y cambio de rol activo, permisos efectivos con los permisos solo para mayores (`getEffectivePermissions`, usada por `checkPermission` y `/auth/me`), validación del rol activo en `isAuth`, tema visual del moodboard y pantallas de login, registro, selección de rol e inicio provisorio. Verificado con un script contra la base local (los 12 casos del prompt) y con el build del front
- 18/10/2026 — Valores de los estados cerrados (D8; contexto secciones 6, 7 y 8)
- 11/10/2026 — Catálogo de permisos y permisos de los 7 roles base (contexto 4.1; Documentación, sección 4.1)
- 10/10/2026 — Definidas la estructura del proyecto y las convenciones técnicas (`CLAUDE.md`, contexto sección 11)
- 10/10/2026 — DER lógico cerrado, con las correcciones de `fee` y `role` en el contexto
- 10/10/2026 — Documento de Visión y requisitos cerrados
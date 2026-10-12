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

- [-] Crear el repo en GitHub y sumar a los 4 integrantes
- [x] Copiar `CLAUDE.md` en la raíz, y `docs/contexto.md`, `docs/DER_logico.jpg` y `docs/prompts/` en `docs/`
- [x] Crear la base `club360` en el MySQL local de cada integrante
- [x] Estructura base del proyecto: carpetas, configuración, middlewares, utils, front base (P01)
- [x] Revisar el resultado del P01 y hacer el primer commit

## Fase 1 — Base de datos

- [x] Los 24 modelos de Sequelize según el DER, con las correcciones del contexto (P02)
- [x] Asociaciones entre modelos en `models/index.js` (P02)
- [x] Índices únicos compuestos: `fee (memberId, period)` y `role (clubId, name)` (P02)
- [x] Cálculo automático de DVH al crear/modificar y recálculo del DVV de la tabla (hooks de Sequelize)
- [x] Catálogo de permisos (`módulo.acción`) y qué permisos trae cada uno de los 7 roles base — definido en el contexto, sección 4.1 (41 permisos)
- [x] Seed completo: deportes, club Valencia, Vóley activado, permisos, roles base y usuario Admin
- [ ] Datos de prueba: socios, jugadoras, familias, staff, ligas y partidos para probar y para la demo

## Fase 2 — Seguridad y acceso

- [ ] Login con usuario y contraseña, bloqueo después de 5 intentos fallidos
- [ ] Registro del Socio con número de socio (primer ingreso: genera usuario y contraseña)
- [ ] Elección y cambio de rol activo (genera un token nuevo)
- [ ] Endpoint `/auth/me`: usuario, roles, rol activo y permisos efectivos
- [!] Recuperación de contraseña — bloqueado: falta definir el mecanismo (decisión D1)
- [ ] Modificar los datos de la propia cuenta
- [ ] Gestión de roles: crear, editar permisos, asignar a usuarios, impedir borrar roles base
- [ ] Permisos directos por usuario (`user_permission`)
- [ ] Front: pantalla de login, registro con número de socio y selector de rol activo
- [ ] Front: layout de dashboard con menú armado según los permisos (responsive)
- [ ] Front: pantallas de gestión de roles y permisos

## Fase 3 — Club y personas

- [ ] Parámetros del club: cuota social, días de atraso, margen de conflicto
- [ ] Activación de deportes del catálogo para el club, con su cuota deportiva
- [ ] Alta presencial de Socio: genera el número de socio y crea el usuario pendiente de activación
- [ ] Código de vínculo familiar automático para los socios menores de edad
- [!] Entrega del código de vínculo al adulto — bloqueado: falta definir cómo lo recibe (decisión D3)
- [ ] Pantalla "Vincularme como Familia" desde el login: con el código, crea la cuenta o suma el rol Familia a un usuario existente (un solo uso)
- [ ] Detección de la mayoría de edad y opción de desvincularse del adulto
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
- [ ] Detección de superposición de horarios según el margen del club
- [ ] Resolución de conflictos entre entrenadoras, registrada en bitácora
- [ ] Citaciones: mínimo 2 días antes, sin jugadoras con mora vencida
- [ ] Respuesta a la citación: confirmar o rechazar con justificación dentro de las 24 hs
- [ ] Job: confirmación automática de las citaciones sin respuesta
- [ ] Rutinas semanales por categoría (texto, imagen, link de video) con historial
- [ ] Front: pantallas del Representante, la Entrenadora y la Preparadora física
- [ ] Front: dashboard de la Jugadora (fixtures y citaciones, separados si juega en 2 ligas, y rutina)
- [ ] Front: vista de solo lectura para la Familia

## Fase 5 — Cuotas y pagos

- [!] Cuota deportiva: una por deporte o una única — bloqueado (decisión D6)
- [ ] Job: generación de la cuota mensual (social + deportiva, con el desglose)
- [ ] Pago simulado (pendiente / aprobado / rechazado)
- [ ] Job: cuotas vencidas, avisos de mora desde el primer mes y pérdida de la condición de socia al superar el plazo
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
- [ ] **D8** — Valores numéricos de los estados (`[A DEFINIR]` en `utils/constants.js`)
- [ ] **D9** — Pruebas: tests automatizados o casos de prueba documentados
- [ ] **D10** — Paleta de colores y estilo visual de Club360

## Opcional (última prioridad)

- [ ] Decidir si se incluye el bot de consultas en el trabajo
- [ ] Si se incluye: implementarlo según `Club360_Bot_Guia_de_Traspaso.md`

---

## Registro

Lo terminado, con la fecha. Lo más reciente arriba.

- 11/10/2026 — Integridad y seed (P03): hooks de DVH/DVV automáticos (`models/integrityHooks.js`), catálogo de 41 permisos (`utils/permissions.js`) y seed completo del club Valencia (7 roles base, Vóley activado, usuario Admin). Verificado: seed corrido dos veces sin duplicar, cantidades, DVH/DVV de todas las tablas cargadas y detección de cambios hechos por SQL directo
- 11/10/2026 — Modelos y asociaciones (P02): los 24 modelos, las asociaciones en `models/index.js` y los índices únicos compuestos de `fee` y `role`. Verificado contra la base local con `sync({ force: true })` y arranque del servidor. Ojo: la base local es MariaDB 10.4, no MySQL 8
- 11/10/2026 — Estructura base del proyecto (P01): `api/` y `client/` con configuración, middlewares, utils, esqueletos de los 15 módulos y front base. Verificado sin base de datos (`/health`, `encrypt`/`decrypt`, build del front). Falta probar el arranque completo (`npm run dev` y `npm run seed`) con MySQL y un `.env`
- 10/10/2026 — Definidas la estructura del proyecto y las convenciones técnicas (`CLAUDE.md`, contexto sección 11)
- 10/10/2026 — DER lógico cerrado, con las correcciones de `fee` y `role` en el contexto
- 10/10/2026 — Documento de Visión y requisitos cerrados
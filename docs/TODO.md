# Club360 — Lista de tareas

Seguimiento de todo lo que falta para entregar el proyecto: desarrollo, entregables de la consigna y decisiones pendientes.

**Entrega:** fines de noviembre de 2026 (fecha exacta [COMPLETAR]). **Objetivo interno:** todo listo a mediados de noviembre.

## Cómo se usa

- `[ ]` pendiente · `[~]` en curso · `[x]` hecho · `[!]` bloqueado (se indica por qué) · `[-]` descartado (se indica por qué)
- Responsable: se agrega `@nombre` al final de la tarea cuando alguien la toma (Sofía, Thiago, Ignacio, Julián).
- `(P01)` indica el prompt de `docs/prompts/` que resuelve la tarea. Los prompts se van escribiendo a medida que se avanza.
- Una tarea se marca `[x]` solo cuando está terminada **y verificada** (anda, compila, se probó el caso). Si quedó a medias, queda `[~]` con una nota.
- Cada vez que se complete algo, se mueve también a **Registro** (al final), con la fecha.
- Las fases de desarrollo están en orden de dependencia: cada una usa lo que construyó la anterior.

---

## Fase 0 — Preparación del repo

- [x] Crear el repo en GitHub y sumar a los 4 integrantes
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
- [x] Actualizar `seed/data/club.js` con los datos provisorios de Valencia (D2, contexto 2.1: contacto, horarios, canchas, cuota social $15.000 y cuota de Vóley $25.000) (P07: club "Club Valencia" con `accentColor` y `extraInfo`; el seed renombra el club "Valencia" y no pisa lo que cambió el Admin)
- [ ] Datos de prueba: socios, jugadoras, familias, staff, ligas y partidos para probar y para la demo (usar las canchas de la sección 2.1 del contexto)

## Fase 2 — Seguridad y acceso

- [x] Login con usuario y contraseña, bloqueo después de 5 intentos fallidos (P04)
- [x] Registro del Socio con número de socio y fecha de nacimiento (primer ingreso: genera usuario y contraseña) (P04)
- [x] Elección y cambio de rol activo (genera un token nuevo) (P04)
- [x] Endpoint `/auth/me`: usuario, roles, rol activo y permisos efectivos (P04)
- [x] Recuperación de contraseña por email: link que vence en 1 hora y sirve una sola vez (D1, P05)
- [x] Desbloqueo de usuarios bloqueados por intentos fallidos al restablecer la contraseña (P05). El desbloqueo por el Admin quedó en la Fase 3
- [x] Modificar los datos de la propia cuenta: email, teléfono, foto y contraseña (Mi cuenta, P05)
- [x] Gestión de roles: crear, editar permisos, asignar a usuarios, impedir borrar roles base (P06: permisos bloqueados del Admin del Club, roles de circuito solo desde su circuito, siempre un Admin activo; el seed ya no pisa los permisos de un rol existente)
- [x] Permisos directos por usuario (`user_permission`) (P06)
- [x] Front: pantalla de login, registro con número de socio y selector de rol activo (P04; falta probarlas a mano en el navegador)
- [x] Front: layout de dashboard con menú armado según los permisos (responsive), inicio con accesos rápidos y página "en construcción" (P05; falta probarlo a mano en el navegador)
- [x] Front: pantallas de gestión de roles y permisos ("Roles y permisos" y "Usuarios y roles", P06; falta probarlas a mano en el navegador)

## Fase 3 — Club y personas

- [x] Parámetros del club: cuota social, días de atraso, margen de conflicto (P07; también contacto, información general y color del club)
- [x] Activación de deportes del catálogo para el club, con su cuota deportiva (P07; no se desactiva un deporte con inscripciones Pendientes o Aprobadas)
- [x] Alta presencial de Socio: genera el número de socio y crea el usuario pendiente de activación (P07; número de 6 dígitos correlativo y alta sobre un usuario existente con `EXISTING_USER`)
- [x] Código de vínculo familiar automático para los socios menores de edad (P07, formato `XXXX-XXXX`)
- [x] Comprobante imprimible del alta con el número de socio y, si es menor, el código de vínculo para el adulto (D3, contexto 3.1 y 3.5) (P07; falta probar la impresión en el navegador)
- [x] Código de vínculo visible en el perfil del Socio menor mientras no se haya usado (D3, contexto 3.5) (P08: tarjeta "Mi condición de socio" en Mi cuenta; falta probarla a mano en el navegador)
- [x] Pantalla "Vincularme como Familia" desde el login: con el código, crea la cuenta o suma el rol Familia a un usuario existente (un solo uso) (P08; también desde Mi cuenta para vincular a un hermano)
- [x] Detección de la mayoría de edad: habilita desvincularse del adulto y pagar las propias cuotas (P08: desvinculación desde Mi cuenta; si el adulto no tiene otros menores, pierde Familia. El permiso de pagar las propias cuotas ya lo habilita getEffectivePermissions; el pago es de la Fase 5)
- [x] Modificación y baja de Socios (P07; también reactivación de los Inactivos)
- [x] Alta, modificación y baja de Staff (impedir que un Staff sea también Socio) (P08: varios roles de staff por persona, activación de la cuenta por email, reactivación; staff activo = con algún rol de staff, isActiveStaff)
- [x] Desbloqueo de usuarios por el Admin (desde la gestión de socios y staff) (P07: socios; P08: staff)
- [x] Front: pantallas del Admin (socios, staff, parámetros del club, deportes) (P07: socios, configuración y deportes del club; P08: staff. Falta probarlas a mano en el navegador)
- [x] Front: perfil del Socio y vinculación de Familia (P08: "Mi condición de socio" y "Jugadoras vinculadas" en Mi cuenta, "Vincularme como Familia" y activación de la cuenta del staff; falta probarlas a mano en el navegador)
- [x] Front: pantalla "El club" con la información general (contexto 2.1) (P07; falta probarla a mano en el navegador)

## Fase 4 — Gestión deportiva

- [x] Solicitud de inscripción a un deporte y aprobación por el Representante (otorga el rol Jugadora) (P13: solo socios ACTIVE, aviso `INSCRIPTION_REQUEST` al Representante del deporte, rechazo con motivo opcional, cancelación de la solicitud Pendiente)
- [x] Baja inmediata de un deporte desde el perfil del Socio: cancela la inscripción, lo saca de sus categorías, cancela sus citaciones pendientes de ese deporte, quita el rol Jugadora si no le queda otro deporte y notifica al Representante (D4, contexto 3.3.1) (P13: si pierde el rol activo, el back devuelve una sesión nueva)
- [x] Ligas y categorías: crear, modificar, eliminar (P09: baja lógica con cascada a las categorías, escalas de edad del vóley con `league.ageScale` y `category.ageGroup`, alcance del Representante por deporte)
- [x] Asignación de jugadoras y staff a las categorías (P09: jugadoras con inscripción Aprobada y la edad de la categoría; Entrenadoras y Preparadoras físicas del deporte; funciones para los módulos que vienen en `leagues.service.js`)
- [x] Partidos (fixture) con dirección de la cancha (P11: local con las canchas del club o visitante con la dirección escrita, `game.isHome`, temporada automática)
- [x] Marcar un partido como Jugado (Representante) (P11: solo después de la fecha y hora)
- [x] Cancelar un partido: pasa sus citaciones a Cancelada y notifica a las jugadoras citadas (P11; con motivo en la bitácora)
- [x] Detección de superposición de horarios según el margen del club (P11: duración asumida de 2 horas, aviso antes de guardar y notificación a las entrenadoras)
- [x] Resolución de conflictos entre entrenadoras, registrada en bitácora (P11: `CONFLICT_RESOLVED` con la `conflictKey`)
- [x] Citaciones: mínimo 2 días antes, sin jugadoras con mora vencida, solo para partidos Programados (P12: varias a la vez, todas o ninguna; mora con `getOverdueDays` de `fees.service.js`; cancelación por la entrenadora)
- [x] Respuesta a la citación: confirmar o rechazar con justificación dentro de las 24 hs (P12: justificación de 10 a 300 caracteres; la respuesta no se cambia)
- [x] Job: confirmación automática de las citaciones sin respuesta (P12: `autoConfirmCitations`, cada 10 minutos)
- [x] Aviso a la jugadora y cancelación de la citación del partido no elegido al resolver un conflicto (P12)
- [x] Ventana de citación de 7 días a 48 horas antes del partido (P13)
- [x] Aviso a las entrenadoras cuando una jugadora confirma o rechaza (P13)
- [x] Alcance por deporte común (`getSportScope` en `staff.service.js`), usado por ligas, partidos, inscripciones y avisos generales (P13)
- [x] La baja de un deporte cancela también las citaciones Confirmadas de partidos futuros (P14)
- [ ] Rutinas semanales por categoría (texto, imagen, link de video) con historial
- [~] Front: pantallas del Representante, la Entrenadora y la Preparadora física — ligas y Mis categorías hechas (P09); partidos y conflictos (P11); citaciones de la Entrenadora (P12); inscripciones del Representante (P13)
- [ ] Front: dashboard de la Jugadora (fixtures y citaciones, separados si juega en 2 ligas, y rutina) — por ahora, "Mis partidos" (P11) y "Mis citaciones" (P12) por separado
- [~] Front: vista de solo lectura para la Familia — partidos (P11) y citaciones (P12) de las jugadoras vinculadas hechos

## Fase 5 — Cuotas y pagos

- [x] Cálculo de la cuota deportiva: una por cada deporte con inscripción Aprobada; `sportAmount` es la suma (D6, contexto sección 6) (P14: se fija al generar la cuota)
- [x] Job: generación de la cuota mensual (social + deportiva, con el desglose) (P14: `generateFees`, día 1 a las 00:05; vence el 10; idempotente; generación a mano del Admin)
- [x] Pago simulado (pendiente / aprobado / rechazado); el Socio menor ve sus cuotas pero no paga (P14: tarjeta terminada en 0000 → Rechazado; la tarjeta no se guarda)
- [x] Job: cuotas vencidas, avisos de mora desde el primer mes y pérdida de la condición de socia al superar el plazo (Socio a Suspendido) (P14: `feeStatus`, todos los días a las 00:15, con el aviso de cuota por vencer y el recordatorio cada 30 días)
- [x] Recuperación automática del Socio suspendido: al aprobarse un pago, vuelve a Activo si ya no le queda ninguna cuota que supere el plazo de mora (P14)
- [x] Estado de cuotas de las jugadoras para el Representante (P14)
- [x] Front: estado de cuenta y pago (Socio, Jugadora y Familia) y gestión de cuotas (Admin) (P14)
- [x] Pago en secretaría registrado por el Admin (P14)
- [x] Pago por transferencia con comprobante adjunto y revisión del Admin (P14b)
- [x] Comprobante de pago imprimible para todos los medios (P14b)
- [x] Historial de pagos del Admin (P14b)

## Fase 6 — Funciones transversales

- [x] Reemplazar Resend por nodemailer con Gmail SMTP en `config/mail.js` y `utils/mailer/`, manteniendo la salida por consola en desarrollo sin credenciales (contexto sección 11, "Emails"; `CLAUDE.md`, "Emails") (P10; verificación del servidor de email al arrancar. Falta un envío real con la cuenta de Gmail del equipo)
- [x] Notificaciones in-app para todos los tipos y email solo para los de la tabla del contexto, sección 6 (D5) (P10: `notify()` y `NOTIFICATION_TYPES`; cada módulo la llama cuando se construya)
- [x] Envío de notificaciones generales (Admin) y a jugadoras, familias y entrenadoras (Representante, Entrenadora), con la opción de mandarlas también por email (P10)
- [x] Detalle de notificaciones en ventana flotante e historial de avisos enviados con lectura (P10b; `notification.batchId` y los comandos `db:snapshot` y `db:restore` para recrear la base sin perder datos. Falta probar las pantallas a mano en el navegador)
- [ ] Bitácora: consulta con filtros y exportación CSV
- [ ] Integridad: verificar DVH/DVV de todas las tablas y reparar
- [ ] Backup y restore de la base
- [-] Particiones de la base — descartado el 21/10/2026: no es requisito del trabajo (contexto sección 0; queda en Futuro)
- [~] Front: pantallas de bitácora, integridad, backup y notificaciones — notificaciones hechas (P10)

## Fase 7 — Deploy de la demo

- [ ] Middleware `upload` con dos destinos: disco en desarrollo y Cloudinary en producción, con un borrado común para los dos. Adaptar la foto de Mi cuenta (P05), que hoy borra del disco (D7, contexto sección 11; `CLAUDE.md`, "Imágenes")
- [ ] Helper del front para armar la URL de una imagen: absoluta si viene de Cloudinary, con `VITE_API_URL` si es una ruta local
- [ ] Crear la cuenta de Cloudinary y la cuenta de Gmail del equipo con contraseña de aplicación
- [ ] Base de datos en la nube
- [ ] Backend en Render
- [ ] Frontend en Vercel, con `client/vercel.json` para las rutas de React Router
- [ ] Configurar `FRONTEND_URL` y `VITE_API_URL` con las URLs de la demo
- [ ] Cargar los datos de la demo y probar el recorrido completo de cada rol

## Fase 8 — Documentación y entregables de la consigna

Formato de referencia: el PDF de HotelDesk.

- [x] Documento de Visión: propósito y alcance funcional
- [x] Requisitos funcionales y no funcionales (actualizados el 21/10/2026 con D3, D4, D5 y D6: 51 funcionales y 11 no funcionales)
- [x] DER lógico
- [x] Catálogo de permisos por rol (Documentación, sección 4.1)
- [ ] Participantes del equipo y roles (quién hace qué)
- [ ] Cronograma de trabajo hasta mediados de noviembre
- [ ] Actores del sistema y descripción de escalabilidad
- [ ] Diagrama de Clases
- [ ] Diagrama General de Casos de Uso
- [ ] Especificación de funcionalidad (casos de uso)
- [ ] Diseño de seguridad técnica: encriptación, dígitos verificadores, patentes y familias
- [ ] Estrategias de base de datos: backup/restore e integridad (sin particiones)
- [~] Casos de prueba en `.txt`, uno por módulo, en `docs/pruebas/` (D9; formato en `CLAUDE.md`, "Pruebas"). Hecho: `docs/pruebas/access.txt` (P06), `docs/pruebas/clubs.txt` y `docs/pruebas/members.txt` (P07), `docs/pruebas/staff.txt` y los casos de vínculo familiar en `members.txt` (P08), `docs/pruebas/leagues.txt` (P09), `docs/pruebas/notifications.txt` (P10 y P10b), `docs/pruebas/games.txt` (P11), `docs/pruebas/citations.txt` (P12 y P13), `docs/pruebas/inscriptions.txt` (P13 y P14), `docs/pruebas/fees.txt` (P14 y P14b)
- [ ] Manuales de usuario
- [ ] Armado del documento final con todo lo anterior

## Decisiones pendientes

Cada una se resuelve en el chat de Claude y se registra en el documento de contexto (copiarlo de nuevo a `docs/contexto.md`).

- [x] **D1** — Mecanismo de recuperación de contraseña (resuelto el 21/10/2026: link por email, contexto 3.7)
- [x] **D2** — Datos de contacto, horarios y direcciones de Valencia y sus canchas (21/10/2026: datos provisorios inventados, contexto 2.1; reemplazar por los reales cuando estén)
- [x] **D3** — Cómo recibe el adulto el código de vínculo familiar (resuelto el 21/10/2026: comprobante del alta y perfil del menor, contexto 3.5)
- [x] **D4** — Pasos de la baja de un deporte desde el perfil del Socio (resuelto el 21/10/2026: baja inmediata, contexto 3.3.1)
- [x] **D5** — Canal de cada tipo de notificación (resuelto el 21/10/2026: todo in-app y algunas también por email, contexto sección 6)
- [x] **D6** — Cuota deportiva: una por deporte o una única (resuelto el 21/10/2026: una por deporte, contexto sección 6)
- [x] **D7** — Almacenamiento de imágenes en el deploy de Render (resuelto el 21/10/2026: Cloudinary en producción, contexto sección 11)
- [x] **D8** — Valores numéricos de los estados (resuelto el 18/10/2026, contexto sección 8)
- [x] **D9** — Pruebas (resuelto el 21/10/2026: casos de prueba documentados en `.txt`, sin tests automatizados)
- [x] **D10** — Paleta de colores y estilo visual de Club360 (resuelto el 18/10/2026, moodboard en `docs/moodboard.png`; color de Valencia provisorio `#2E9BD6` desde el 21/10/2026)
- [x] **D11** — Si sobra tiempo para uno solo: resultados de partidos o bot (resuelto el 21/10/2026: primero los resultados)
- [x] **D12** — Día de generación y día de vencimiento de la cuota mensual (resuelto el 08/11/2026: se genera el día 1 y vence el 10, contexto sección 6; implementado en el P14)
- [x] **D13** — Dónde se guarda el color de acento de cada club (resuelto el 21/10/2026: campo `club.accentColor`, contexto sección 8; implementado en el P07)

## Si queda tiempo (prioridad 1 de Futuro)

- [ ] Resultados de partidos y campaña por categoría: `ownScore` y `rivalScore` en `game`, carga al marcar el partido como Jugado, campaña en los dashboards de la Jugadora y el Representante (contexto sección 7)

## Si queda tiempo (prioridad 2 de Futuro)

- [ ] Bot de consultas: decidir si se incluye y, si entra, implementarlo según `Club360_Bot_Guia_de_Traspaso.md`
- [ ] Dominio propio verificado para enviar los emails con Resend en lugar de Gmail SMTP

---

## Registro

Lo terminado, con la fecha. Lo más reciente arriba.

- 08/11/2026 — Transferencias y comprobantes (P14b): `payment` suma `method` (`PAYMENT_METHODS`), `receiptUrl` y `note` (base recreada con db:snapshot y db:restore --recompute-dvh; los pagos `SEC-` migrados a Secretaría con su nota y el `PAY-` con los últimos 4 dígitos, por modelos). Datos bancarios en `club.extraInfo.bankInfo` (seed y tarjeta "Datos para transferencias" en la configuración del club). Pago por transferencia con comprobante adjunto (JPG, PNG o PDF hasta 5 MB, carpeta privada `receipts` que no se sirve por `/uploads`; descarga con `GET /fees/payments/:id/receipt-file` con control de acceso), una sola en revisión por cuota (409 para cualquier otro pago), aviso `PAYMENT_REVIEW_REQUEST` a quienes tienen `fees.manage`, aprobación (cuota Pagada y recuperación automática) o rechazo con motivo, y aviso `PAYMENT_RESULT`. Una cuota con una transferencia Pendiente no suma días de atraso (`getOverdueDays`). Comprobante de pago para todo pago Aprobado (`GET /fees/payments/:id/voucher`; de la tarjeta, solo "Tarjeta ****1234" en `note`). Front: diálogo de pago con las pestañas Tarjeta (número con guiones, vencimiento con barra, código oculto y validación en vivo) y Transferencia, "Transferencia en revisión" en las cuotas, Gestión > Pagos con la revisión en un Drawer, comprobante imprimible y link desde Cuotas. Casos en `docs/pruebas/fees.txt`. Verificado con un script contra la base local (95 chequeos, en un club de prueba aparte) y con el build del front
- 08/11/2026 — Cuotas, pagos y mora (P14): módulo `fees` con la generación mensual (D12: día 1, vence el 10; socios ACTIVE o SUSPENDED dados de alta antes del día 1; social + suma de las cuotas deportivas de las inscripciones Aprobadas; idempotente), los jobs `generateFees` y `feeStatus` (cuota por vencer, paso a Vencida con email, recordatorio cada 30 días de atraso y suspensión al superar `delayFee`), el pago simulado (0000 → Rechazado, sin guardar la tarjeta), el pago en secretaría (`SEC-`), la recuperación automática del suspendido y la vista de cuotas de jugadoras del Representante. `getOverdueDays` acepta una fecha de referencia. La baja de un deporte cancela también las citaciones Confirmadas de partidos futuros y avisa a las entrenadoras. Front: Mis cuotas, Estado de cuenta de la Familia, Cuotas del Admin con el estado de cuenta de cada socio y Cuotas de jugadoras. Casos en `docs/pruebas/fees.txt` e `inscriptions.txt`. Verificado con un script contra la base local (66 chequeos, en un club de prueba aparte) y con el build del front
- 05/11/2026 — Inscripciones y ajustes a citaciones (P13): módulo `inscriptions` con el pedido (solo socios ACTIVE, deporte activo, sin otra Pendiente o Aprobada; aviso `INSCRIPTION_REQUEST` a los Representantes del deporte), aprobación (rol Jugadora y aviso `INSCRIPTION_RESULT`; 409 si el socio ya no está activo), rechazo con motivo opcional (bitácora y aviso), cancelación de la solicitud y baja inmediata de un deporte en una transacción (inscripción Cancelada, `removeMemberFromSportCategories`, citaciones Pendientes futuras de ese deporte Canceladas, `removeBaseRole(Jugadora)` si no le queda otro deporte, aviso `SPORT_WITHDRAWAL` y sesión nueva si perdió el rol activo). `getLeagueScope` pasó a `getSportScope` en `staff.service.js`. Citaciones: ventana de 7 días a 48 horas antes del partido (`CITATION_WINDOW_OPEN_DAYS`, `CITATION_MIN_HOURS`, `citationWindow` en la API) y aviso `CITATION_RESPONSE` a las entrenadoras de la categoría al confirmar o rechazar. Front: Deportes del socio, Inscripciones del Representante y la ventana en las pantallas de citaciones. Casos en `docs/pruebas/inscriptions.txt` y `citations.txt`. Verificado con un script contra la base local (62 chequeos) y con el build del front
- 05/11/2026 — Citaciones (P12): módulo `citations` con la lista de la categoría por partido, citación de varias jugadoras a la vez (todas o ninguna, con el motivo de cada una), al menos 48 horas antes y solo en partidos Programados, sin jugadoras con mora (`getOverdueDays` en `fees.service.js`: Suspendida o atraso mayor al plazo del club), una sola citación por jugadora y partido salvo las Canceladas, y cancelación por la entrenadora (`CITATION_CANCELLED`, in-app). Respuesta de la jugadora dentro de las 24 horas (rechazo con justificación) y job `autoConfirmCitations` cada 10 minutos. Al resolver un conflicto de horario se cancela la citación del partido no elegido y se avisa `CONFLICT_RESOLVED` (`getResolutionsForMember`, `conflict.notPlaying` en las vistas de la jugadora y la familia). Front: Citaciones de la Entrenadora, Mis citaciones, Citaciones de la Familia y "No lo jugás" en Mis partidos. Casos en `docs/pruebas/citations.txt`. Verificado con un script contra la base local (51 chequeos) y con el build del front
- 01/11/2026 — Partidos y superposiciones (P11): `game.isHome` (base recreada con db:snapshot y db:restore). Módulo `games`: fixture con alta, edición, jugado y cancelación (cancela las citaciones y avisa a las citadas); detección de superposiciones de horario calculada siempre (`findConflictsForGame`, `listConflicts`, duración asumida de 2 horas y el margen del club), aviso antes de guardar y notificación a las entrenadoras; resolución entre entrenadoras en la bitácora (`CONFLICT_RESOLVED`, `getConflictResolutions`). Front: Partidos del Representante con el aviso en vivo, Partidos del staff con la pestaña de conflictos, Mis partidos y los partidos de la Familia. Casos en `docs/pruebas/games.txt`. Verificado con un script contra la base local y con el build del front
- 01/11/2026 — Detalle e historial de notificaciones (P10b): `notification.batchId` (un valor por aviso general) y los comandos `npm run db:snapshot` y `npm run db:restore` para recrear la base conservando los datos (pasos en el README, "Cambios en el modelo"); base local recreada así. Detalle de una notificación en una ventana flotante (campana y listado) con el botón "Ir a…", `GET /notifications/:id`, e historial de avisos enviados con lectura (el Admin ve todos, con filtro por remitente; el resto, los suyos). Casos en `docs/pruebas/notifications.txt`. Verificado con scripts contra la base local y con el build del front
- 31/10/2026 — Emails con Gmail y notificaciones (P10): nodemailer con Gmail SMTP en lugar de Resend (por consola en desarrollo sin credenciales, verificación al arrancar). `notify()` con `NOTIFICATION_TYPES` como única fuente del canal, familias de los menores, emails después del commit y en segundo plano, y errores de email en la bitácora. Módulo `notifications`: listado, contador y lectura; avisos generales del Admin (todo el club o por grupos), el Representante (su deporte) y la Entrenadora (sus categorías), con resumen previo. Front: campana con contador, Notificaciones y Enviar avisos. Casos documentados en `docs/pruebas/notifications.txt`. Verificado con un script contra la base local y con el build del front
- 28/10/2026 — Ligas y categorías (P09): `league.ageScale` y `category.ageGroup` con las escalas de edad del vóley (`AGE_SCALES`) y la edad de temporada (`getSeasonAge`); base local recreada. Módulo `leagues`: ligas y categorías (alta, modificación, baja lógica con cascada y reactivación), asignación de jugadoras (inscripción Aprobada, Activa o Suspendida, edad máxima de la categoría) y de staff (Entrenadora o Preparadora física del deporte), alcance del Representante por su deporte (`getLeagueScope`), Mis categorías y las funciones para los módulos que vienen. Front: Ligas y categorías, detalle de la categoría con sus jugadoras y su staff, y Mis categorías. Casos documentados en `docs/pruebas/leagues.txt`. Verificado con un script contra la base local y con el build del front
- 23/10/2026 — Staff y vínculo familiar (P08): módulo `staff` (alta con uno o más roles de staff, alta sobre un usuario existente con `EXISTING_USER`, modificación, baja que deja el usuario Eliminado solo si no le queda otro rol, reactivación, desbloqueo y reenvío de la activación) con `isActiveStaff`; corrección del alta de socio para usarlo. Activación de la cuenta del staff por email (token `account-activation`, `JWT_ACTIVATION_EXPIRES_IN`). "Vincularme como Familia" con cuenta nueva o usuario existente (validado como el login) y desde Mi cuenta; desvinculación del socio mayor de edad. Front: Staff (listado, alta y edición, detalle), activación de la cuenta, "Vincularme como Familia" (link en el login) y las tarjetas "Mi condición de socio" y "Jugadoras vinculadas" en Mi cuenta. Casos documentados en `docs/pruebas/staff.txt` y `docs/pruebas/members.txt`. Verificado con un script contra la base local y con el build del front
- 23/10/2026 — Club, deportes y alta de socios (P07): `user.email` opcional para menores y `user.phone` cifrado con AES en el modelo; `club.accentColor` y `club.extraInfo` (D13), con el DVH de los campos JSON independiente del orden de las claves; datos provisorios de Club Valencia en el seed. Módulo `clubs` (información, configuración y deportes del club) y módulo `members` (alta presencial con número correlativo, código de vínculo para menores y alta sobre un usuario existente; listado, detalle, modificación, baja, reactivación, desbloqueo y comprobante). Front: Socios (listado, alta y edición, detalle y comprobante imprimible con forma de carnet), Configuración del club, Deportes del club, "El club" y la franja del color del club en el menú. Base local recreada. Casos documentados en `docs/pruebas/clubs.txt` y `docs/pruebas/members.txt`. Verificado con un script contra la base local y con el build del front
- 21/10/2026 — Gestión de roles y permisos (P06): módulo `access` con el catálogo de permisos, CRUD de roles (los base no se eliminan ni se renombran; el Admin del Club conserva `LOCKED_ADMIN_PERMISSIONS`; un rol con usuarios no se elimina), asignación manual solo de roles nuevos y Admin del Club (siempre un Admin activo, sin quitarse el rol a sí mismo), permisos directos, helpers `assignBaseRole`/`removeBaseRole` para los circuitos y bitácora de todo con criticidad alta. El seed asigna los permisos de un rol base solo al crearlo. Front: pantallas "Roles y permisos" y "Usuarios y roles" con `PermissionPicker`, y refresco de la sesión al volver a la pestaña. Casos documentados en `docs/pruebas/access.txt`. Verificado con un script contra la base local y con el build del front
- 21/10/2026 — Decisiones D2 a D7, D9 y D11 cerradas; emails con Gmail SMTP en lugar de Resend, front en Vercel y particiones descartadas (contexto secciones 0, 2.1, 3, 6, 7 y 11). Surgen D12 y D13
- 21/10/2026 — Mi cuenta, recuperación de contraseña y layout (P05): recuperación por email con link de un solo uso (token con huella del hash de la contraseña) que desbloquea la cuenta, aviso por email del cambio de contraseña, links por consola en desarrollo sin `RESEND_API_KEY`; Mi cuenta (email, teléfono, foto y contraseña); layout del dashboard con el menú de `navigation/menu.js` según los permisos, inicio con accesos rápidos, página "en construcción" y texturas de red y parquet. Verificado con un script contra la base local y con el build del front
- 18/10/2026 — Login y sesión (P04): login con bloqueo por intentos, registro con número de socio y fecha de nacimiento, roles disponibles según la condición de socio, elección y cambio de rol activo, permisos efectivos con los permisos solo para mayores (`getEffectivePermissions`, usada por `checkPermission` y `/auth/me`), validación del rol activo en `isAuth`, tema visual del moodboard y pantallas de login, registro, selección de rol e inicio provisorio. Verificado con un script contra la base local (los 12 casos del prompt) y con el build del front
- 18/10/2026 — Valores de los estados cerrados (D8; contexto secciones 6, 7 y 8)
- 11/10/2026 — Catálogo de permisos y permisos de los 7 roles base (contexto 4.1; Documentación, sección 4.1)
- 10/10/2026 — Definidas la estructura del proyecto y las convenciones técnicas (`CLAUDE.md`, contexto sección 11)
- 10/10/2026 — DER lógico cerrado, con las correcciones de `fee` y `role` en el contexto
- 10/10/2026 — Documento de Visión y requisitos cerrados
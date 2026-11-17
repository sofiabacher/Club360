# Club360 — Usuarios de la demo

Usuarios que carga `npm run seed:demo` (datos en `api/src/seed/data/demo.js`) en el club Valencia, deporte Vóley. Si cambian esos datos, se actualiza este archivo.

## Contraseñas

- **Admin del seed** (`admin.valencia`, o el `SEED_ADMIN_USERNAME` del `.env`): la contraseña de `SEED_ADMIN_PASSWORD`.
- **Todos los demás:** la contraseña de `SEED_DEMO_PASSWORD`.

Las contraseñas no se escriben en ningún archivo del repo: se piden al equipo.

## Lo que muestra la consola al terminar

El número de socio de Rocío y el código de vínculo de Julieta cambian en cada carga, así que **no** están en este archivo: el script los muestra al terminar, junto con la hora en que vencen las citaciones Pendientes. Anotalos antes de la defensa.

## Admins del Club

| Usuario | Nombre | Qué muestra |
|---|---|---|
| `admin.valencia` | Admin del seed (`SEED_ADMIN_USERNAME`) | Toda la administración del club |
| `pvera` | Patricia Vera | Segundo Admin: si uno se bloquea, el otro lo desbloquea desde **Usuarios y roles** (aviso "Está bloqueado" con el botón Desbloquear). Si se bloquean los dos, `npm run admin:unlock` (`docs/deploy.md`, sección 12) |

## Staff

| Usuario | Nombre | Roles | Categorías | Qué muestra |
|---|---|---|---|---|
| `mferreyra` | Mariana Ferreyra | Representante | Todo Vóley | Su panel de inicio con los pendientes y la campaña de las tres categorías; la inscripción Pendiente de Florencia para aprobar; el partido de Mayores sin resultado para cargar |
| `cbenitez` | Carla Benítez | Entrenadora | Sub-16 y Sub-18 | Citar en Sub-18; el rechazo de Pilar; el conflicto de Camila |
| `lquiroga` | Laura Quiroga | Entrenadora | Mayores | Abril no se puede citar (mora); el conflicto de Camila |
| `vsosa` | Valeria Sosa | Preparadora física **y** Entrenadora (elige el rol al entrar) | Las tres | Rutinas de lunes, miércoles y viernes de las últimas 3 semanas; la semana siguiente vacía para cargarla; como Preparadora física, el **Seguimiento** de las jugadoras |
| — | Natalia Ibáñez | Entrenadora, **Pendiente de activación** (sin usuario) | Ninguna | El Admin le reenvía el email de activación |

## Socias y familias

Las jugadoras tienen los roles Socio y Jugadora, así que eligen el rol al entrar.

| Usuario | Nombre | Qué es | Caso que muestra |
|---|---|---|---|
| `ctorres` | Camila Torres (18) | Jugadora mayor, Sub-18 y Mayores | El **conflicto de horario** sin resolver (Sub-18 a las 10 y Mayores a las 12, en H+5) y una citación **Pendiente** al partido de Mayores. Cuotas al día, con un pago rechazado (tarjeta 0000) en el historial. **Seguimiento:** casi todas las rutinas registradas, las dos del último día sin registrar, y 3 objetivos (uno vencido) |
| `sromero` | Sofía Romero (15) | Jugadora menor, Sub-16 | Cuotas del mes anterior y del actual **impagas** (no llega a la mora: se la puede citar). Citación Confirmada |
| `mromero` | Martina Romero (13) | Jugadora menor, Sub-16 | Juega en una categoría superior a su edad. Citación **Pendiente**. Cuotas al día |
| `gromero` | Gabriela Romero | Socia **y** Familia de Sofía y Martina (elige el rol al entrar) | El panel de Familia con dos jugadoras y una cuota vencida para **pagar en vivo** |
| `vruiz` | Valentina Ruiz (17) | Jugadora menor, Sub-18 | Cuotas al día. Se la cita en vivo en Sub-18 |
| `rruiz` | Roberto Ruiz | Solo Familia de Valentina | Familia que no es socio |
| `jmendez` | Julieta Méndez (16) | Jugadora menor, Sub-16 | **Código de vínculo sin usar**: se vincula una Familia en vivo |
| `acastro` | Abril Castro | Jugadora mayor, Mayores, **Suspendida** | 8 cuotas impagas, las más viejas con más de 180 días. No se la puede citar; el Admin registra los pagos en secretaría y recupera la condición sola |
| `pgimenez` | Paula Giménez | Jugadora mayor, Mayores | Al día hasta el mes anterior; la cuota del mes actual impaga, para **pagar por transferencia** en vivo. Citación Confirmada |
| `faguirre` | Florencia Aguirre | Socia mayor | **Inscripción Pendiente** a Vóley |
| — | Rocío Fernández | Socia **Pendiente de registro** (alta de hoy, sin usuario) | Se registra en vivo con su número de socio y su fecha de nacimiento (09/10/1990). No tiene cuota este mes |
| `mponce` | Micaela Ponce | Socia, usuario **Bloqueado** | El Admin la desbloquea |
| `alucero` | Ana Lucero | Socia **Inactiva** (baja) | Aparece con el filtro de inactivos y se puede reactivar. No puede entrar: no tiene roles habilitados |

## Jugadoras de relleno

Cuatro por categoría, con las cuotas al día. Las de Sub-16 y Sub-18 son menores sin adulto vinculado y pagan en secretaría.

| Categoría | Usuarios |
|---|---|
| Sub-16 | `lucia.paz`, `mora.villalba`, `pilar.medina` (rechazó la citación de H+4: "Tengo un examen ese día y no llego."), `delfina.ortiz` |
| Sub-18 | `agustina.rey`, `candela.sanchez`, `juana.molina`, `renata.luna` |
| Mayores | `brenda.rios`, `lorena.vega`, `carolina.diaz`, `milagros.herrera` |

## Partidos

**H** es el día en que se corrió el script.

| Categoría | Cuándo | Rival | Estado |
|---|---|---|---|
| Las tres | H-56, H-49, H-35 y H-28 | Distinto cada vez | Jugados con resultado, sin citaciones (para la campaña y la racha) |
| Mayores | H-21 | Estrella del Oeste | Jugado **sin resultado**: lo carga la Representante en vivo |
| Las tres | H-14 y H-7 | Distinto cada vez | Jugados con resultado, con citaciones Confirmadas, alguna Confirmada automáticamente y una Rechazada |
| Mayores | H-3 | Deportivo Lomas | Cancelado |
| Sub-16 | H+4, 18:30, local (Cancha 1) | Atlético Ribera | Programado, con citaciones |
| Sub-18 | H+5, 10:00, visitante | Náutico Sur | Programado, sin citaciones |
| Mayores | H+5, 12:00, local (Cancha Anexo) | Social Parque | Programado, con citaciones |
| Las tres | H+11 y H+18 | Distinto cada vez | Programados, todavía fuera de la ventana de citación |

### Seguimiento personal

Registros de las rutinas de las 3 semanas cargadas, con fecha de hoy o anterior (datos cargados: no pasan por la ventana de 7 días):

| Jugadora | Registros | Objetivos |
|---|---|---|
| Camila (`ctorres`) | Casi todas Completadas (esfuerzo de 3 a 5), dos Parciales (una con nota) y una No completada ("Tenía parcial de la facu."). **Las dos rutinas del último día sin registrar**, para hacerlo en vivo | En curso: "Mejorar la recepción en el saque flotado" (en 3 semanas); En curso y **vencido**: "Llegar a 50 saltos al cajón por serie" (hace 2 días); Cumplido: "Completar todas las rutinas de la pretemporada" |
| Sofía (`sromero`) y Martina (`mromero`) | Cumplimiento medio, con alguna sin registrar | Sofía: uno En curso ("Mejorar el saque de arriba") |
| Valentina (`vruiz`), `lucia.paz`, `agustina.rey` y `brenda.rios` | Pocos registros | — |
| El resto | Sin registros | — |

### Resultados y campaña

Sub-16 juega al mejor de 3 y las otras dos categorías al mejor de 5. Todos los Jugados tienen los puntos de cada set, salvo el de Sub-16 de H-7 (para mostrar que son opcionales) y el de Mayores de H-21, que no tiene resultado.

| Categoría | Ganados – perdidos | Racha (del más nuevo) | Último partido |
|---|---|---|---|
| Sub-16 | 5 – 1 | P G G G G | Perdido 0-2 vs. Náutico Sur (H-7, sin puntos) |
| Sub-18 | 3 – 3 | G G P P G | Ganado 3-2 vs. Social Parque (H-7) |
| Mayores | 4 – 2 (y 1 sin resultado) | P G G G P | Perdido 1-3 vs. Unión Vecinal (H-7) |

## Usuarios con email real

`ctorres`, `gromero`, `vruiz` y Natalia Ibáñez (clave `nibanez`) reciben el email que figura para su clave en `SEED_DEMO_REAL_EMAILS`, en el `.env`. Las direcciones no se escriben en el repo. Los demás usuarios reciben un alias de `SEED_DEMO_EMAIL` (o `@demo.example` si falta).

| Clave | Emails que recibe en la demo |
|---|---|
| `ctorres` | Citación nueva al citarla en Sub-18, partido cancelado y recuperación de contraseña |
| `gromero` | Cuota vencida y avisos de mora de Sofía y Martina, y avisos generales con email |
| `nibanez` | Email de activación de la cuenta de staff, cuando el Admin lo reenvía |
| `vruiz` | Citación nueva al citarla en Sub-18 |

## Listo para hacer en vivo

1. **Resolver el conflicto** de Camila (Carla o Laura): al elegir Sub-18, la citación Pendiente de Mayores se cancela sola y Camila ve "No jugás este partido".
2. **Citar en Sub-18** (Carla, partido de H+5): Camila y Valentina reciben el email.
3. **Responder una citación** (Martina o Camila).
4. **Aprobar la inscripción** de Florencia (Mariana).
5. **Vincular una Familia** a Julieta con su código.
6. **Registrar a Rocío** con su número de socio y su fecha de nacimiento.
7. **Pagar como Familia** (Gabriela, la cuota vencida de Sofía).
8. **Pagar por transferencia** (Paula, la cuota del mes) y **revisarla** como Admin.
9. **Recuperar a Abril** registrando sus pagos en secretaría (Admin).
10. **Desbloquear a Micaela** (Admin).
11. **Cargar la rutina** de la semana siguiente (Valeria, como Preparadora física), con una imagen.
12. **Verificar la integridad** y **hacer un backup** (Admin).
13. **Cargar el resultado del partido de Mayores sin resultado** (Representante) y ver cómo cambia la campaña en el inicio de Camila. Por ejemplo, con un 3-0, Mayores pasa de 4 – 2 a 5 – 2 y la racha a P G G G G.
14. **Registrar la rutina del día como Camila y ver Mi progreso.**
15. **Ver el seguimiento de Sub-18 como Valeria** (Preparadora física).
16. **Ver la pestaña Jugados** como Camila, como Gabriela (Familia) y como Carla (Entrenadora).
17. **Abrir el asistente como Camila desde Mis cuotas** (aparece primero "Cuotas y pagos"), preguntar "¿cómo pago por transferencia?" y "¿cuánto debo?" (redirige, no da el monto).
18. **Entrar como Carla (Entrenadora):** el asistente no aparece.

## Advertencias

- **Las citaciones Pendientes vencen 24 horas después de correr el script**; después el job las confirma solas. Corré el script el día de la defensa o el anterior.
- **`npm run seed:demo -- --reset` borra todo lo creado en los ensayos** en el club (socios, staff, partidos, pagos, roles nuevos, notificaciones…), salvo lo que carga el seed. La bitácora se conserva. Pide escribir `BORRAR` para confirmar.
- Las altas, las cuotas y los partidos se calculan desde el día en que se corre: después de unos días los casos dejan de coincidir (por ejemplo, el partido de H+4 ya se jugó). Para la defensa, volvé a correrlo con `--reset`.

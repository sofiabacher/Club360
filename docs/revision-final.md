# Club360 — Revisión final antes del congelamiento (P22)

Revisión del 15/11/2026 contra las reglas de `CLAUDE.md` y `docs/contexto.md`. No se sumaron funciones ni se tocó el
modelo durante la revisión; las funciones que se pidieron después (paneles de inicio, bienvenida y PDF del comprobante)
están en `docs/TODO.md`.

## 1. Resumen

| Severidad | Hallazgos | Corregidos | Pendientes |
|---|---|---|---|
| Alta | 2 | 2 | 0 |
| Media | 6 | 6 | 0 |
| Baja | 10 | 10 | 0 |
| **Total** | **18** | **18** | **0** |

Tres hallazgos (2, 15 y 16) se consultaron al equipo antes de corregirlos, y los dos que habían quedado pendientes (17 y
18) se corrigieron después.

## 2. Hallazgos

| # | Severidad | Área | Archivo | Problema | Estado | Cómo se corrigió |
|---|---|---|---|---|---|---|
| 1 | Alta | Dependencias | `api/package-lock.json`, `client/package-lock.json` | `npm audit`: `body-parser` y `multer` (alta, DoS) en api; `follow-redirects` (alta) y `vite` (moderada) en client; `qs` (moderada) en api | Corregido | `npm audit fix` sin `--force`: solo cambian los lockfiles, sin versiones mayores |
| 2 | Alta | Dependencias | `api/package.json` | `mysql2` con una vulnerabilidad crítica, que entraba solo por `mysqldump`, una dependencia del P01 que no se usaba en ningún archivo | Corregido (consultado) | `npm uninstall mysqldump` |
| 3 | Media | Seguridad (CORS) | `api/src/middlewares/cors.js` | Aceptaba `http://localhost:5173` también en producción | Corregido | `localhost:5173` solo con `app.isDev`; en producción, solo `FRONTEND_URL` |
| 4 | Media | Diseño | `client/src/theme.js` | Toda la interfaz se veía en Roboto, no en Poppins: la tipografía iba en el segundo `createTheme`, cuando las variantes ya estaban calculadas con la fuente por defecto | Corregido | La tipografía pasó al primer `createTheme`; verificado en el navegador |
| 5 | Media | Front (rutas) | `client/src/routes/AppRouter.jsx` | Una dirección inexistente redirigía al inicio sin avisar | Corregido | `pages/NotFoundPage.jsx` con `EmptyState` y "Volver al inicio", dentro del layout |
| 6 | Media | Responsive | `pages/staff/StaffPage.jsx`, `pages/fees/FeesPage.jsx`, `pages/members/MembersPage.jsx` | Scroll horizontal en el celular (Staff y Cuotas del Admin) | Corregido | Ancho mínimo de los filtros solo desde `sm` y la fila de Cuotas en dos líneas en el celular |
| 7 | Media | Textos | `client/src/theme.js` | Textos propios de MUI en inglés ("Go to next page", "Close") | Corregido | Idioma `esES` de `@mui/material/locale` en el tema |
| 8 | Media | Repo | `README.md` | Faltaban el link a la demo, las funciones por rol, el paso a paso desde clonar hasta `seed:demo`, los scripts y varios documentos | Corregido | README completo, sin contraseñas ni emails reales |
| 9 | Baja | Pestaña | `client/index.html` | Sin favicon | Corregido | `client/public/favicon.svg` y su `<link>` |
| 10 | Baja | Diseño | `CampaignCard.jsx`, `RoutineWeekView.jsx` | Color `#FFFFFF` escrito a mano | Corregido | `common.white` del tema |
| 11 | Baja | Jobs | `api/src/jobs/generateFees.job.js` | El día de generación escrito a mano en el cron | Corregido | El cron usa `FEE_GENERATION_DAY` |
| 12 | Baja | Código muerto | `api/src/utils/files.js` | `isCloudinaryUrl` exportada y sin uso | Corregido | Eliminada |
| 13 | Baja | Formatos | `PayFeeDialog.jsx`, `BackupPage.jsx` | La misma función de tamaño de archivo repetida | Corregido | `formatFileSize` en `utils/format.js` |
| 14 | Baja | Docs | `docs/deploy.md` | No figuraba la URL de Vercel | Corregido | `https://club360-ten.vercel.app` en el paso 5 |
| 15 | Baja | Estados de pantalla | Páginas con listas | Las listas cargaban con un spinner y no con `Skeleton`, y cuatro tablas del Admin mostraban el vacío como texto | Corregido (consultado) | `components/common/LoadingSkeleton.jsx` en las 44 cargas de pantalla; `EmptyState` en Socios, Staff, Cuotas y Usuarios y roles |
| 16 | Baja | Docs | `CLAUDE.md` | Decía que "los jobs saltean" un club bloqueado, pero el backup automático corre igual (decisión del P16) | Corregido (consultado) | `CLAUDE.md` aclara que saltean el club los jobs que escriben datos y que la verificación y el backup corren igual |
| 17 | Baja | Mensajes | 6 services y `seed/demo.js` | Los textos de las notificaciones se armaban en cada service, fuera de `utils/messages.js` | Corregido | `notificationTexts` en `messages.js` (23 funciones que devuelven `{ title, message }`), con los mismos textos; probado citando, confirmando y cancelando contra la API |
| 18 | Baja | Dependencias | `api` (`sequelize` → `uuid`) | `uuid` moderada; npm solo ofrecía instalar `sequelize@3` | Corregido | `overrides` en `api/package.json` para usar `uuid` 11.1.1 (misma API); Sequelize sigue generando UUID v1 y v4 |

## 3. Lo que se revisó y estaba bien

- **Rutas:** 150 revisadas. Todas tienen `isAuth` y `checkPermission` con una constante de `PERMISSIONS`, salvo las **10 públicas** (login, registro con número de socio, `forgot-password`, validar y restablecer la contraseña, validar y activar la cuenta del staff, y las 3 de "Vincularme como Familia"), `/health`, las de **sesión** (`/auth/me`, `/auth/switch-role`, `/auth/logout`, `POST /family-link` y `GET /integrity/status`) y `receipt-file` y `voucher` de pagos, que controlan el acceso en el service.
- **Validaciones:** todo parámetro de ruta se valida (enteros, `batchId` como UUID y `fileName` con regex). Los `POST` sin validator no reciben body o son subidas con multer.
- **Multi-club**, en los 16 módulos (access, auth, backup, bot, citations, clubs, fees, games, inscriptions, integrity, leagues, logs, members, notifications, routines y staff): toda consulta filtra por `req.user.clubId` y ningún controller ni service toma `clubId` del body o la query.
- **Escritura de datos:** `sequelize.query` y `queryInterface` solo en `utils/clubData.js` (lectura y las dos restauraciones permitidas) y en `scripts/db/restore.js`.
- **Permisos por rol:** ningún acceso se decide por el nombre del rol; los nombres de `BASE_ROLES` se usan para asignar roles en los circuitos, para el staff activo, para elegir destinatarios de avisos y en `getAvailableRoles`.
- **`process.env`:** solo en `config/index.js`, y `.env.example` tiene todas sus variables.
- **Respuestas:** ningún JSON trae `password`, `dvh` ni hashes, y los tokens solo salen en el login y el cambio de rol. El teléfono llega solo a la propia persona, a quien gestiona socios o staff y el del club. Un 500 en producción responde el mensaje general.
- **Archivos subidos:** tipos y tamaños limitados; los comprobantes nunca salen por `/uploads` ni por URL pública.
- **Secretos:** solo los dos `.env.example` en el repo y ninguna clave ni email real en el código.
- **Bitácora:** sin contraseñas ni tokens, de la tarjeta solo los últimos 4 dígitos, y del bot solo `BOT_UNANSWERED` guarda el texto, sin usuario.
- **Constantes:** los 25 objetos replicados entre api y client coinciden; las 88 `LOG_ACTIONS` tienen `message` de 50 caracteres o menos y criticidad.
- **Notificaciones:** los 18 tipos tienen ícono y ruta en el front, y el canal coincide con la tabla del contexto (sección 6).
- **Jobs:** los 5 con la zona horaria de Argentina; cuotas y citaciones saltean los clubes bloqueados.
- **Modelos:** todos los que tienen `clubId` están en `CLUB_TABLES`.
- **Código muerto:** el front usa todos los endpoints; sin archivos huérfanos ni `console.log` de depuración.
- **Front:** menú y rutas con el mismo permiso; fechas y montos con `utils/format.js`; botones de ícono con `aria-label`, imágenes con `alt`, campos con `label` y foco visible en el login; `<title>Club360</title>`.
- **Repo:** sin duplicados; `.gitignore` completo.

## 4. `npm audit`

| | Antes | Después |
|---|---|---|
| `api/` | 7: 1 crítica (`mysql2` por `mysqldump`), 2 altas (`body-parser`, `multer`), 4 moderadas (`qs`, `uuid` por `sequelize`) | 0 |
| `client/` | 2: 1 alta (`follow-redirects`), 1 moderada (`vite`) | 0 (también con `jspdf` 4.2.1, sumado para el PDF del comprobante) |

## 5. Recorrida automática

Script temporal fuera del repo (Playwright con el Edge de la compu, sobre un build del front y la API local, con la
base cargada con `npm run seed:demo -- --reset`): **26 sesiones** (cada usuario de `docs/demo-usuarios.md` con cada rol,
incluido el Admin), el inicio y todas las entradas del menú, Mi cuenta y Notificaciones, en la compu (1366 × 768) y en
el celular (390 × 844): **427 visitas** por vez.

| | Antes de corregir | Después |
|---|---|---|
| Errores de consola | 0 | 0 |
| Respuestas 4xx / 5xx | 0 / 0 | 0 / 0 |
| Pantallas con scroll horizontal (celular) | 2 (Staff y Cuotas del Admin) | 0 |
| Textos `undefined`, `null`, `NaN`... | 0 | 0 |
| Más de un botón naranja | 0 | 0 |
| Claves sensibles en las respuestas | 0 | 0 |

La corrida "antes" ya tenía los arreglos de la revisión del código (404, Poppins y textos en español). Una corrida
intermedia detectó un error introducido al pasar los vacíos a `EmptyState` (faltaba un import en cuatro pantallas); se
corrigió antes de la corrida final. Las capturas del celular están fuera del repo, en `Club360-capturas-P22/` en el
Escritorio. Las pantallas de detalle y los diálogos se revisaron en el código, no en la recorrida.

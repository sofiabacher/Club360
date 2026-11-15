# Prompt 22 — Revisión final antes del congelamiento

Vas a hacer una **revisión completa del proyecto** antes del congelamiento del 17/11 y la entrega del 18/11. No se suman funciones: se buscan errores, huecos de seguridad e inconsistencias, se corrige lo seguro y se deja un informe.

Antes de empezar, leé `CLAUDE.md` completo (son las reglas contra las que se revisa) y `docs/TODO.md`.

**Alcance:**
- **Se hace:** revisar, corregir y documentar los hallazgos.
- **No se hace:** funciones nuevas, cambios en el modelo ni cambios en las reglas de negocio del contexto.
- **No** hagas commit.

## 0. Cómo trabajar

1. **Primero revisá todo y armá la lista de hallazgos** (punto 6). Cada hallazgo lleva:
   - **severidad:**
     - **Alta:** un hueco de seguridad, un dato de otro club, algo que rompe una pantalla o una regla;
     - **Media:** algo incorrecto o inconsistente que se ve;
     - **Baja:** prolijidad;
   - el área, el archivo y el problema.
2. **Corregí vos, sin preguntar,** lo de severidad Alta y Media que:
   - no cambia una regla de negocio;
   - no cambia el modelo;
   - no borra archivos (salvo los duplicados del punto 4.1).

   Lo de severidad Baja, corregilo si es rápido y seguro.
3. **Frená y preguntame antes de:**
   - cualquier corrección que cambie el comportamiento que ve el usuario más allá de arreglar un error;
   - tocar un modelo;
   - actualizar una dependencia con cambios de versión mayor;
   - cualquier cosa en la que dudes si es un error o una decisión.
4. Si algo de lo que encontrás contradice `CLAUDE.md` o el contexto, gana el documento: corregí el código. Si te parece que el que está mal es el documento, avisame.

## 1. Back: seguridad y multi-club

1. **Rutas:**
   - todas tienen `isAuth` y `checkPermission` con una constante de `PERMISSIONS`;
   - listá las excepciones y confirmá que son solo las públicas: login, registro con número de socio, vínculo de Familia, recuperación y activación de cuenta, y `/health`.
2. **Multi-club:**
   - toda consulta de un service sobre una tabla con `clubId` filtra por el club del usuario;
   - todo id que llega por parámetro (`:id`, `memberId`, `categoryId`…) se busca **dentro del club**, y si no es del club responde 404;
   - nunca se toma `clubId` del body ni de la query.

   Revisalo módulo por módulo y anotá cuáles revisaste.
3. **Escritura de datos:** `sequelize.query` y `queryInterface` solo para leer, o en las dos excepciones permitidas (`db:restore` y la restauración del backup).
4. **Permisos:** ningún acceso se decide comparando el nombre de un rol. La única excepción permitida es la de `getAvailableRoles`, en `access.service.js`.
5. **Configuración:** `process.env` solo en `config/index.js`.
6. **Respuestas:**
   - ninguna devuelve `password`, tokens, hashes ni `dvh` de más;
   - el teléfono solo le llega a quien corresponde (la persona y quien gestiona socios o staff);
   - en producción, un error 500 responde un mensaje genérico, sin el stack.
7. **Validaciones:** todo `POST`, `PUT` y `PATCH` tiene su validator, y todo `:id` se valida como entero.
8. **Archivos subidos:** tipos y tamaños limitados en todas las subidas, y los comprobantes de transferencia nunca accesibles por URL pública.
9. **CORS:** solo acepta `FRONTEND_URL` (y `localhost:5173` en desarrollo).
10. **Secretos:**
    - con `git ls-files`, confirmá que no hay ningún `.env` en el repo, solo `.env.example`;
    - buscá en el código claves, contraseñas o emails reales escritos a mano;
    - `.env.example` tiene **todas** las variables que lee `config/index.js`, con comentarios y sin valores reales.
11. **Bitácora:** ningún registro guarda contraseñas, tokens, números de tarjeta ni el texto del bot (salvo `BOT_UNANSWERED`, sin usuario).
12. **Dependencias:** `npm audit` en `api/` y en `client/`.
    - Aplicá solo `npm audit fix` **sin** `--force`.
    - Lo que quede de severidad alta o crítica, listalo con lo que haría falta para resolverlo, y preguntame antes de actualizar.

## 2. Back: consistencia

1. **Constantes de api y client:** los objetos de estados y de tipos que se replican coinciden exactamente. Compará cada uno.
2. **Sin valores escritos a mano:**
   - sin números de estado sueltos: siempre las constantes;
   - sin mensajes al usuario fuera de `utils/messages.js` (salvo los textos del bot, que viven en su `intents.json`).
3. **Bitácora:** todas las `LOG_ACTIONS` tienen `message` de 50 caracteres o menos y una criticidad.
4. **Notificaciones:** todos los tipos de `NOTIFICATION_TYPES` tienen su ícono y su ruta en `client/src/utils/notificationTypes.js`, y su canal coincide con la tabla del contexto (sección 6).
5. **Jobs:** todos tienen `timezone: 'America/Argentina/Buenos_Aires'` y saltean los clubes bloqueados por integridad.
6. **Modelos:** todos los que tienen `clubId` están en `CLUB_TABLES`.
7. **Código muerto:** endpoints sin uso en el front, funciones sin llamar y `console.log` de depuración. Los `console.log` informativos del arranque y de los scripts se quedan.

## 3. Front

1. **Menú y rutas:**
   - cada entrada de `navigation/menu.js` tiene su ruta en `AppRouter`, con `PermissionRoute` y **el mismo permiso**;
   - no hay rutas privadas sin protección;
   - una ruta que no existe muestra una página 404 con un link al inicio (si no existe, creala con el estilo del resto).
2. **Recorrida automática** (un script temporal **fuera del repo**, con Playwright, que ya está instalado):
   1. levantá back y front en local, con los datos de la demo (`npm run seed:demo -- --reset`);
   2. entrá con cada usuario de `docs/demo-usuarios.md` (con más de un rol, con cada rol), incluido el Admin;
   3. recorré **todas** las entradas del menú y el inicio, dos veces: en la compu (1366 × 768) y en el celular (390 × 844);
   4. registrá:
      - los errores de la consola;
      - las respuestas 4xx y 5xx que no sean esperables;
      - el scroll horizontal en el celular;
      - los textos `undefined`, `null`, `NaN`, `Invalid Date` u `[object Object]` en pantalla;
   5. guardá una captura de cada pantalla en el celular, en una carpeta fuera del repo, para que yo las revise.
3. **Textos:**
   - sin restos en inglés en la interfaz (botones, títulos, placeholders, errores de validación de MUI);
   - fechas en formato argentino (`dd/mm/aaaa` o "SÁB 25/10");
   - montos con `$` y separador de miles (`$ 15.000`), usando una sola función de formato en `utils/`.
4. **Estados de cada pantalla:** cada lista tiene su estado de carga (`Skeleton`), su estado vacío (`EmptyState`) y un mensaje de error si la llamada falla.
5. **Diseño (`CLAUDE.md`, "Diseño visual"):**
   - **un solo botón naranja por vista:** listá las pantallas que tienen más de uno y corregilas, dejando naranja la acción principal;
   - sin colores ni fuentes escritos a mano en los componentes;
   - los estados siempre con `StatusChip`.
6. **Accesibilidad básica:**
   - `alt` en las imágenes;
   - `label` en los campos;
   - `aria-label` en los botones que son solo un ícono;
   - el foco visible al navegar con el teclado en el login.
7. **Pestaña del navegador:** el `<title>` dice "Club360" y el favicon es el del proyecto, no el de Vite.

## 4. Repo

1. **Duplicados:** no hay archivos duplicados ni de prueba (`-copia`, `-v2`, `-Sofi`, `-old`, `test.js` sueltos). Si hay, listalos y borralos, salvo que tengan algo que no está en el original: en ese caso, preguntame.
2. **`.gitignore`:** cubre `node_modules`, `.env` y sus variantes (`.env.*.local`), `dist`, `api/uploads/*` y `api/backups/*` (con sus `.gitkeep`).
3. **`README.md`:**
   - qué es Club360 y el link a la demo (https://club360-ten.vercel.app);
   - las funciones principales, por rol;
   - el stack;
   - cómo levantarlo en local, paso a paso, desde clonar hasta `npm run seed:demo`;
   - los scripts de `api/` y `client/`;
   - dónde está cada documento (`docs/contexto.md`, `docs/deploy.md`, `docs/demo-usuarios.md`, `docs/pruebas/`, `docs/prompts/`);
   - el equipo.

   **Sin** contraseñas ni emails reales.
4. **`docs/deploy.md`:** coincide con cómo quedó todo (las secciones 7 y 11, las variables de Render).

## 5. Comprobación final

Después de las correcciones:
1. **Datos y servidor:**
   - `npm run seed` y `npm run seed:demo -- --reset` corren sin errores contra la base local;
   - el back arranca sin advertencias nuevas.
2. **Integridad:** la verificación de DVH/DVV da todo correcto.
3. **Bot:** `npm run bot:eval` sigue llegando a la meta.
4. **Build:** `npm run build` del front compila sin errores. Después borrá `dist/`.
5. **Recorrida automática:** el script del punto 3.2, de nuevo. Tiene que dar **cero** errores de consola, cero 5xx y cero pantallas con scroll horizontal o con textos `undefined`.

## 6. Informe

Generá `docs/revision-final.md`:
1. **El resumen:** cuántos hallazgos de cada severidad, cuántos se corrigieron y cuántos quedan.
2. **La tabla de hallazgos:** severidad, área, archivo, problema y estado (Corregido, Pendiente o Consultado), con una línea de cómo se corrigió o por qué quedó pendiente.
3. **Lo que se revisó y estaba bien:** por ejemplo, "Rutas: 112 revisadas, todas con permiso salvo las 7 públicas", y los módulos revisados en multi-club.
4. **El resultado de `npm audit`,** antes y después.
5. **El resultado de la recorrida automática:** usuarios, pantallas recorridas y errores encontrados, antes y después de corregir.

**Sin** datos sensibles en el informe.

## 7. Cierre

1. **Actualizá `docs/TODO.md`:**
   - sumá y marcá *"Revisión final del código antes del congelamiento (P22)"*;
   - si quedó algo pendiente que haya que hacer antes de la entrega, sumalo en la fase que corresponda.

   Agregá la línea al Registro.
2. **Mostrame:**
   - el resumen del informe;
   - **las consultas que tengas** (lo del punto 0.3), una por una, para que decida;
   - la carpeta de las capturas del celular.

## 8. Con la demo publicada

No cambia la base. Si `npm audit fix` actualizó dependencias, Render y Vercel las instalan al publicar. Después de integrar a `main`:
1. esperá *Deploy live* en Render y *Ready* en Vercel;
2. entrá con el Admin y verificá la integridad;
3. recorré la demo con dos o tres usuarios.
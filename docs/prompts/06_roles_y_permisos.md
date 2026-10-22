# Prompt 06 — Gestión de roles, permisos y asignación a usuarios

Vas a implementar la gestión de roles y permisos del Admin del Club (patentes y familias). Con esto se cierra la Fase 2. Antes de empezar, leé `CLAUDE.md` (sobre todo "Sesión y acceso" y "Diseño visual"), la sección 4 y la 4.1 de `docs/contexto.md`.

**Alcance:**
- **Se hace:**
  - roles: listar, crear, editar sus permisos y eliminarlos;
  - asignar y quitar roles a los usuarios;
  - permisos directos por usuario;
  - las dos pantallas del front;
  - un ajuste en el seed;
  - los casos de prueba del módulo en `docs/pruebas/access.txt`.
- **No se hace:**
  - altas, bajas ni desbloqueo de usuarios (Fase 3);
  - la asignación de los roles de circuito (Socio, Jugadora, Familia, Representante, Entrenadora, Preparadora física), que se hace desde su propio circuito.
- **No** hagas commit.

## 1. Reglas

1. **El catálogo de permisos es fijo:** el Admin no crea, modifica ni elimina permisos (contexto, sección 4). Solo trabaja con roles y asignaciones.
2. **Roles nuevos:** el Admin crea roles (`isBase = false`) con cualquier combinación de los 41 permisos. El nombre es único dentro del club (índice `(clubId, name)`).
3. **Roles base** (`isBase = true`):
   - **no** se pueden eliminar;
   - **no** se les puede cambiar el nombre, porque el sistema los identifica por su nombre (`BASE_ROLES`, `MEMBERSHIP_ROLES`, seed);
   - **sí** se puede editar su descripción y sus permisos.
4. **Rol "Admin del Club":** siempre conserva `access.manageRoles` y `access.assignRoles`. El resto de sus permisos se puede editar. Así nunca queda nadie sin poder administrar los roles. Definí esta lista en `utils/permissions.js` como `LOCKED_ADMIN_PERMISSIONS`.
5. **Eliminar un rol nuevo:** si tiene usuarios asignados, no se puede: 409, *"Este rol está asignado a {n} usuarios. Quitáselo a cada uno antes de eliminarlo."* Si no tiene usuarios, se elimina junto con sus permisos (`role_permission`).
6. **Asignación manual de roles** (pantalla "Usuarios y roles"): el Admin solo puede asignar o quitar **los roles nuevos y el rol "Admin del Club"**. Los demás roles base se asignan desde su circuito:
   - Socio, en el alta de socio;
   - Jugadora, al aprobar una inscripción;
   - Familia, con el código de vínculo;
   - Representante, Entrenadora y Preparadora física, en el alta de staff.

   El back lo valida aunque el front no muestre la opción: 403, *"Este rol se asigna desde su circuito (alta de socio, inscripción, vínculo familiar o alta de staff)."*
7. **Siempre tiene que haber al menos un Admin activo:**
   - no se puede quitar el rol "Admin del Club" si el usuario es el último con ese rol en estado ACTIVE;
   - un Admin no puede quitarse a sí mismo el rol "Admin del Club".
8. **Permisos directos:** el Admin puede asignar a un usuario cualquiera de los 41 permisos como excepción puntual (`user_permission`). Siguen valiendo las reglas de `getEffectivePermissions`: por ejemplo, los de `ADULT_ONLY_PERMISSIONS` no aplican a un menor aunque se le asignen directamente.
9. **Efecto de los cambios:** el back los aplica **en la siguiente request**, porque `checkPermission` calcula los permisos en el momento. El menú del usuario afectado se actualiza cuando su front vuelve a pedir la sesión. Agregá en `AuthContext` un `refreshSession()` automático cuando la pestaña recupera el foco (`visibilitychange`), con un mínimo de 60 segundos entre pedidos.
10. **Multi-tenant:** roles y usuarios siempre filtrados por `req.user.clubId`. Los permisos son globales.
11. **Bitácora** (criticidad HIGH, porque cambian la seguridad del sistema). Sumá a `LOG_ACTIONS` las que falten:
    - `ROLE_CREATED`, `ROLE_UPDATED` (en `details`, los permisos agregados y quitados), `ROLE_DELETED`;
    - `ROLE_ASSIGNED`, `ROLE_REMOVED` (en `details`, el usuario y el rol);
    - `PERMISSION_ASSIGNED`, `PERMISSION_REMOVED` (para los permisos directos).

## 2. Ajuste en el seed

Hoy el seed hace `findOrCreate` de cada par rol-permiso. Si se vuelve a correr, le devolvería a un rol base los permisos que el Admin le sacó. Cambialo así:
- los permisos de un rol se asignan **solo cuando el rol se crea**;
- si el rol ya existía, no se tocan sus permisos.

Dejalo explicado en un comentario. Los permisos del catálogo y el resto del seed siguen siendo idempotentes como hasta ahora.

## 3. Back (`modules/access/`)

Todos los endpoints llevan `isAuth`. Los de roles llevan `checkPermission(PERMISSIONS.ACCESS_MANAGE_ROLES)` y los de usuarios, `checkPermission(PERMISSIONS.ACCESS_ASSIGN_ROLES)`.

| Método y ruta | Qué hace |
|---|---|
| `GET /access/permissions` | Catálogo agrupado por módulo: `[{ module, permissions: [{ id, name, action, description }] }]` |
| `GET /access/roles` | Roles del club: `id`, `name`, `description`, `isBase`, `permissionCount`, `userCount` y `editableName` (false si es base). Primero los base y después los nuevos, por nombre |
| `GET /access/roles/:id` | El rol con los `id` de sus permisos y `lockedPermissions` (los de `LOCKED_ADMIN_PERMISSIONS` si es "Admin del Club"; si no, `[]`) |
| `POST /access/roles` | `{ name, description, permissionIds }`. Crea un rol nuevo. Nombre repetido en el club → 409 |
| `PUT /access/roles/:id` | `{ name, description, permissionIds }`. Reemplaza los permisos del rol (agrega los que faltan y quita los que sobran, en una transacción). Si es base, **ignora** `name`. Si es "Admin del Club" y faltan permisos bloqueados → 400, *"El rol Admin del Club tiene que conservar los permisos de roles y permisos."* |
| `DELETE /access/roles/:id` | Base → 403. Con usuarios → 409 (regla 5) |
| `GET /access/users?search=&page=` | Usuarios del club que no estén DELETED, paginados de a 20. Busca por nombre, apellido, usuario o email. Devuelve `id`, nombre completo, `username`, `email`, `userStateId` y sus roles (`id`, `name`, `isBase`) |
| `GET /access/users/:id` | El usuario, sus roles, sus permisos directos y `assignableRoleIds` (los roles nuevos del club y "Admin del Club") |
| `PUT /access/users/:id/roles` | `{ roleIds }` con **solo** roles asignables. Reemplaza los roles asignables del usuario y **no toca** sus roles de circuito. Aplica las reglas 6 y 7 |
| `PUT /access/users/:id/permissions` | `{ permissionIds }`. Reemplaza sus permisos directos |

**Detalles:**
- **Validators:**
  - `name`: de 3 a 50 caracteres, con letras, números, espacios y guiones;
  - `description`: hasta 200 caracteres;
  - `permissionIds` y `roleIds`: arrays de enteros positivos, que tienen que existir. Los roles, además, tienen que ser del club.
- **Reemplazos:** se hacen dentro de una transacción, con `create` y `destroy` de Sequelize, para que los hooks recalculen DVH y DVV.
- **Organización:** la lógica de las reglas va en `access.service.js`, junto a `getAvailableRoles` y `getEffectivePermissions`.
- **Helpers para los circuitos:** agregá en `access.service.js` `assignBaseRole(userId, roleName, { transaction })` y `removeBaseRole(userId, roleName, { transaction })`, que reciben un nombre de `BASE_ROLES`, buscan el rol en el club del usuario y lo asignan o lo quitan. No pasan por las reglas de la asignación manual, pero **no** permiten tocar el rol "Admin del Club". Los van a usar los módulos de la Fase 3 y la 4 (alta de socio, inscripción, vínculo, staff). En esta tarea solo se crean y se prueban.

## 4. Front

### 4.1 Etiquetas

`client/src/utils/permissionLabels.js` traduce cada módulo a un nombre en español para los títulos de grupo:

| Módulo | Etiqueta |
|---|---|
| `auth` | Cuenta |
| `notifications` | Notificaciones |
| `access` | Roles y permisos |
| `clubs` | Club |
| `members` | Socios |
| `staff` | Staff |
| `inscriptions` | Inscripciones |
| `fees` | Cuotas y pagos |
| `leagues` | Ligas y categorías |
| `games` | Partidos |
| `citations` | Citaciones |
| `routines` | Rutinas |
| `logs` | Bitácora |
| `integrity` | Integridad de datos |
| `backup` | Copias de seguridad |
| `bot` | Bot de consultas |

Las descripciones de cada permiso vienen del back.

### 4.2 Componente `components/access/PermissionPicker.jsx`

Se reutiliza en las dos pantallas:
- una sección por módulo (`Accordion`), con el título del grupo, un contador "3 de 5" y la casilla "Seleccionar todos";
- dentro de cada sección, una casilla por permiso con su descripción y, más chico, el nombre técnico (`fees.manage`);
- recibe `value`, `onChange`, `locked` (permisos que se ven tildados y deshabilitados, con un tooltip que explica por qué) y `hint` (un texto por permiso; por ejemplo, *"Ya lo tiene por el rol Representante"*).

### 4.3 `pages/access/RolesPage.jsx` (`/access/roles`)

- Encabezado: título "Roles y permisos" y el botón **"Nuevo rol"** (el único botón naranja de la pantalla).
- Una tarjeta por rol con:
  - nombre;
  - un chip "Rol base" en los base;
  - descripción;
  - "{n} permisos · {m} usuarios";
  - acciones "Editar" y "Eliminar". "Eliminar" no aparece en los base y, si el rol tiene usuarios, queda deshabilitado con un tooltip.
- **Crear y editar:** en un `Dialog` de pantalla completa en el celular, con nombre (solo lectura en los base, con la nota *"El nombre de los roles base no se puede cambiar"*), descripción y `PermissionPicker`. En "Admin del Club", los permisos bloqueados van con `locked`.
- **Eliminar:** pide confirmación con un diálogo.
- Los errores del back se muestran en un `Alert` o `Snackbar`.

### 4.4 `pages/access/UsersRolesPage.jsx` (`/access/users`)

- Buscador y una tabla (en el celular, una lista de tarjetas) con el nombre, el usuario, el estado en `StatusChip` (ACTIVE `ok`, PENDING `pending`, BLOCKED `overdue`) y los roles como chips. Con paginación.
- Al tocar un usuario se abre un panel lateral (`Drawer` a la derecha; pantalla completa en el celular) con dos pestañas:
  - **"Roles":**
    - una casilla por cada rol asignable;
    - debajo, los roles de circuito del usuario solo para lectura, con la nota *"Se asignan desde el alta de socio, la inscripción, el vínculo familiar o el alta de staff"*;
    - botón "Guardar roles".
  - **"Permisos directos":**
    - `PermissionPicker` con sus permisos directos;
    - en `hint`, para cada permiso, si ya lo tiene por alguno de sus roles;
    - arriba, una nota: *"Usalos para excepciones puntuales. Para varios usuarios conviene crear un rol."*;
    - botón "Guardar permisos".
- Si el Admin se cambia sus propios roles o permisos, después de guardar llama a `refreshSession()`.

### 4.5 Rutas

Reemplazá el `ComingSoonPage` de `/access/roles` y `/access/users` por estas pantallas, con el mismo permiso que tienen en `navigation/menu.js`. Agregá las funciones de llamada en `client/src/api/access.api.js`.

## 5. Casos de prueba documentados

Creá `docs/pruebas/access.txt` con el formato de `CLAUDE.md` ("Pruebas") y al menos estos casos:

| ID | Caso |
|---|---|
| CP-ACCESS-01 | Crear un rol nuevo con permisos |
| CP-ACCESS-02 | Crear un rol con un nombre repetido |
| CP-ACCESS-03 | Editar los permisos de un rol base |
| CP-ACCESS-04 | Intentar cambiar el nombre de un rol base |
| CP-ACCESS-05 | Intentar sacarle al Admin del Club los permisos bloqueados |
| CP-ACCESS-06 | Intentar eliminar un rol base |
| CP-ACCESS-07 | Intentar eliminar un rol con usuarios |
| CP-ACCESS-08 | Eliminar un rol sin usuarios |
| CP-ACCESS-09 | Asignar un rol nuevo a un usuario y comprobar que su menú cambia |
| CP-ACCESS-10 | Intentar asignar el rol Jugadora a mano |
| CP-ACCESS-11 | Intentar quitar el rol Admin al último Admin |
| CP-ACCESS-12 | Asignar un permiso directo y comprobar el acceso |
| CP-ACCESS-13 | Permiso solo para mayores asignado directo a un menor |
| CP-ACCESS-14 | Usuario sin permiso que entra a `/access/roles` |

Completá "Resultado obtenido" y "Estado" con lo que te dé la verificación del back. Los que solo se pueden comprobar en el navegador quedan como "Pendiente".

## 6. Documentación del repo

No modifiques `CLAUDE.md` ni `docs/contexto.md`: ya vienen con estas reglas. Si ves que no las incluyen, avisame.

## 7. Verificación

### 7.1 Back

Hacelo con un script temporal **fuera del repo**, con usuarios de prueba creados con los modelos y borrados al final:

1. **Roles:**
   - CRUD de un rol nuevo, con los errores de nombre repetido, de rol base (eliminar o renombrar) y de rol con usuarios;
   - los permisos bloqueados del Admin del Club;
   - en la bitácora, `ROLE_UPDATED` con los permisos agregados y quitados en `details`.
2. **Asignación:**
   - asignar un rol nuevo funciona;
   - asignar Jugadora → 403;
   - el `PUT` de roles no toca los roles de circuito del usuario;
   - el último Admin activo no puede perder su rol, y un Admin no puede quitárselo a sí mismo.
3. **Efecto inmediato:**
   - con un usuario logueado, asignale un rol nuevo con `fees.manage` (agregando el rol y eligiéndolo como activo) o un permiso directo, y comprobá que un router de prueba con `checkPermission(PERMISSIONS.FEES_MANAGE)` pasa a responder 200;
   - al quitárselo, vuelve a 403 en la siguiente request.
4. **Menor de edad:** un permiso directo `fees.payOwn` a un menor **no** aparece en `getEffectivePermissions`.
4b. **Helpers:** `assignBaseRole` asigna Jugadora a un usuario de prueba y `removeBaseRole` se la quita. Los dos rechazan "Admin del Club".
5. **Seed:**
   - sacale un permiso a un rol base, corré `npm run seed` y comprobá que el rol **no** lo recuperó;
   - devolvéselo a mano al final.
6. **Multi-tenant:** crea un segundo club de prueba con un rol. Un Admin de Valencia no lo ve ni lo puede editar (404). Borrá el club de prueba al final.
7. **Integridad:** la verificación de DVH/DVV del P03 sigue dando todo correcto.

### 7.2 Front

1. `npm run build` compila sin errores. Después borrá `dist/`.
2. Dejame una lista de pruebas a mano en el navegador:
   - con el Admin, crear un rol "Tesorería" con `fees.manage`, asignárselo a un usuario de prueba y ver que a ese usuario le aparece "Cuotas" en el menú al recargar;
   - intentar eliminar el rol mientras está asignado;
   - ver el rol Admin del Club con los permisos bloqueados;
   - revisar las dos pantallas en tamaño celular.

### 7.3 Cierre

1. **Actualizá `docs/TODO.md`:**
   - en la Fase 2, marcá: gestión de roles, permisos directos y las pantallas de gestión de roles y permisos;
   - en la Fase 8, dejá una nota de que se creó `docs/pruebas/access.txt`;
   - agregá la línea al Registro.
2. Mostrame el resultado de la verificación y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
# Prompt 02 — Modelos de Sequelize y asociaciones

Vas a crear los 24 modelos de Sequelize de Club360 y sus asociaciones. Antes de empezar, leé `CLAUDE.md`, la sección 8 de `docs/contexto.md` y mirá `docs/DER_logico.jpg`. **Este prompt es la especificación final:** si algo difiere de la imagen del DER, manda este prompt, porque ya incluye las correcciones del contexto.

**Alcance:**
- **Se hace:** un archivo por modelo en `api/src/models/`, todas las asociaciones en `models/index.js` y la verificación contra MySQL.
- **No se hace:** el cálculo automático de DVH/DVV (hooks), el seed ni ningún endpoint. Son las tareas siguientes.
- **No** hagas commit.

## 1. Reglas generales para todos los modelos

- Formato: `sequelize.define('NombreModelo', { ...campos }, { tableName: '<tabla>', ...opciones })`, importando la instancia de `../config/db`. Un modelo por archivo, en PascalCase singular, exportado con `module.exports`.
- `tableName` exactamente como figura en la lista del punto 2 (ya está `freezeTableName: true` en `db.js`).
- PK `id`: `INTEGER`, `autoIncrement`, `primaryKey`. Las tablas intermedias no tienen `id`: su PK es compuesta por las dos FK (`primaryKey: true` en ambas).
- Tipos de MySQL 8 tal cual el DER: `STRING(n)`, `TEXT`, `INTEGER`, `TINYINT` para la criticidad, `DECIMAL(10, 2)`, `DATEONLY` para `date`, `DATE` para `datetime`, `CHAR(7)` para `period`.
- **Flags booleanas** (`TINYINT(1)`): `DataTypes.BOOLEAN` con `allowNull: false` y default: `isActive` → `true`, `isBase` → `false`, `isRead` → `false`, `linkStatus` → `false`.
- **Estados** (`userStateId`, `memberStateId`, `inscriptionState`, `feeState`, `transactionState`, `citationState`, `gameState`): `INTEGER`, `allowNull: false`, `defaultValue: 1`. Agregá un comentario que indique la constante de `utils/constants.js` que los mapea.
- **`dvh`:** `INTEGER`, `allowNull: true`, en todas las tablas salvo `log` y `dvv`.
- **`clubId`:** `INTEGER`, `allowNull: false`, en todas las tablas que lo tienen en la lista.
- **FK:** `allowNull: false` salvo las que el punto 2 marca como **NULL**.
- **Timestamps:** `timestamps: true` (default) en todas. Excepciones: `log` lleva solo `createdAt` (`updatedAt: false`) y `dvv` lleva solo `updatedAt` (`createdAt: false`).
- **No** pongas `references` dentro de los campos: las FK las arman las asociaciones de `models/index.js`.

## 2. Modelos (24)

### Seguridad y acceso

**User** → `user`
- `id`, `clubId`
- `name` STRING(100) not null · `lastName` STRING(100) not null
- `email` STRING(150) unique not null · `password` STRING(255) **NULL** (queda en NULL hasta que el socio completa su registro con el número de socio; el login debe rechazar usuarios sin contraseña)
- `phone` STRING(30) null · `dni` STRING(20) unique null · `birthDate` DATEONLY not null · `photo` STRING(255) null
- `userStateId` (estado, `USER_STATES`) · `username` STRING(50) unique null · `failedAttempts` INTEGER not null default 0 · `dvh`

**Role** → `role`
- `id`, `clubId`, `name` STRING(50) not null, `isBase` BOOLEAN, `description` TEXT null, `dvh`
- **Índice único compuesto `(clubId, name)`.** `name` **no** es único por sí solo.

**Permission** → `permission` (catálogo global de la plataforma, sin `clubId`)
- `id`, `name` STRING(100) unique not null (formato `módulo.acción`), `module` STRING(50) not null, `action` STRING(50) not null, `description` TEXT null, `dvh`

**UserRole** → `user_role`: `userId` + `roleId` (PK compuesta), `dvh`
**RolePermission** → `role_permission`: `roleId` + `permissionId` (PK compuesta), `dvh`
**UserPermission** → `user_permission`: `userId` + `permissionId` (PK compuesta), `dvh`

**Dvv** → `dvv`
- `tableName` STRING(50) **PK** (sin `id`), `dvv` INTEGER null. Solo `updatedAt`.

### Club, deportes y auditoría

**Club** → `club`
- `id`, `name` STRING(50) unique not null, `address` STRING(100) not null, `phone` STRING(30) null, `email` STRING(100) unique not null
- `socialFee` DECIMAL(10,2) not null (cuota social) · `delayFee` INTEGER not null (días de atraso para mora) · `conflictMargin` INTEGER not null (margen de conflicto en minutos) · `dvh`

**Sport** → `sport` (catálogo global, sin `clubId`): `id`, `name` STRING(80) unique not null, `isActive`, `dvh`

**ClubSport** → `clubSport`: `id`, `clubId`, `sportId`, `priceFee` DECIMAL(10,2) not null (cuota deportiva), `isActive`, `dvh`

**Log** → `log` (sin `dvh`, solo `createdAt`)
- `id`, `clubId`, `userId` **NULL**, `roleId` **NULL**
- `action` STRING(50) not null · `details` TEXT null · `criticity` TINYINT not null default 1 (`CRITICITY`)

**Notification** → `notification`
- `id`, `clubId`, `recipientId` (→ user), `transmitterId` **NULL** (→ user; NULL cuando la genera el sistema)
- `type` STRING(50) not null · `title` STRING(150) not null · `message` TEXT not null · `isRead` · `dvh`

### Socios, staff e inscripciones

**Member** → `member`
- `id`, `clubId`, `userId` unique (→ user)
- `numMember` STRING(20) unique not null (lo genera la aplicación) · `memberStateId` (estado, `MEMBER_STATES`)
- `codeFamily` STRING(20) unique null · `adultUserId` **NULL** (→ **user**, el adulto responsable) · `linkStatus` · `dvh`
- Nota: en el DER figura como `memberAdultId`. Se renombró a `adultUserId` y apunta a `user`, porque el adulto Familia puede no ser Socio.

**Staff** → `staff`: `id`, `clubId`, `userId` unique (→ user), `clubSportId`, `dvh`

**Inscription** → `inscription`: `id`, `clubId`, `clubSportId`, `memberId`, `inscriptionState` (estado, `INSCRIPTION_STATES`), `dvh`

### Cuotas y pagos

**Fee** → `fee`
- `id`, `clubId`, `memberId`
- `period` CHAR(7) not null (formato `AAAA-MM`) · `expirationDate` DATEONLY not null
- `socialAmount` DECIMAL(10,2) not null · `sportAmount` DECIMAL(10,2) not null · `feeState` (estado, `FEE_STATES`) · `dvh`
- **Índice único compuesto `(memberId, period)`.** Ni `memberId` ni `period` son únicos por sí solos.

**Payment** → `payment`
- `id`, `clubId`, `userId` (quién pagó: el socio o el adulto Familia), `feeId`
- `amount` DECIMAL(10,2) not null · `transactionState` (estado, `TRANSACTION_STATES`) · `confirmationCode` STRING(50) unique not null · `dvh` (en el DER figura dos veces: es un solo campo)

### Ligas, partidos y citaciones

**League** → `league`: `id`, `clubId`, `clubSportId`, `name` STRING(100) not null, `isActive`, `dvh`
**Category** → `category`: `id`, `clubId`, `leagueId`, `name` STRING(100) not null, `isActive`, `dvh`
**CategoryPlayer** → `categoryPlayer`: `memberId` + `categoryId` (PK compuesta), `isActive`, `dvh`
**CategoryStaff** → `categoryStaff`: `staffId` + `categoryId` (PK compuesta), `isActive`, `dvh`

**Game** → `game`
- `id`, `clubId`, `categoryId`
- `season` STRING(50) not null · `rival` STRING(100) not null · `dateTime` DATE not null · `address` STRING(200) not null · `gameState` (estado, `GAME_STATES`) · `dvh`

**Citation** → `citation`
- `id`, `clubId`, `gameId`, `memberId`, `staffId` (quién citó: siempre Staff, no un usuario genérico)
- `justification` TEXT null · `dateMaxResponse` DATE not null · `dateResponse` DATE null · `citationState` (estado, `CITATION_STATES`) · `dvh`

### Rutinas

**Routine** → `routine`
- `id`, `clubId`, `categoryId`, `userId` (la preparadora física que la cargó)
- `weekStart` DATEONLY not null · `title` STRING(150) not null · `description` TEXT not null
- `imageUrl` STRING(255) null · `videoUrl` STRING(255) null · `dvh`

## 3. Asociaciones (`models/index.js`)

Importá los 24 modelos, definí las asociaciones y exportalos todos en un objeto. Cada relación va en los dos sentidos (`hasMany`/`belongsTo`, `hasOne`/`belongsTo`, `belongsToMany` en ambos lados), con la misma `foreignKey` y un alias (`as`) en camelCase.

**Política de borrado:**
- Por defecto `onDelete: 'RESTRICT'`. Las bajas del sistema son lógicas, por estado o por `isActive`, así que no se borran registros en cascada.
- `CASCADE` solo en las tablas intermedias (`user_role`, `role_permission`, `user_permission`, `categoryPlayer`, `categoryStaff`).
- `SET NULL` en `log.userId`, `log.roleId`, `notification.transmitterId` y `member.adultUserId`.
- `onUpdate: 'CASCADE'` en todas.

**Relaciones:**
- **Club 1-N** (`clubId`): User, Role, Log, Notification, ClubSport, Member, Staff, Inscription, Fee, Payment, League, Category, Game, Citation, Routine
- **Sport 1-N** ClubSport (`sportId`)
- **ClubSport 1-N** Inscription, League, Staff (`clubSportId`)
- **User N-M Role** a través de UserRole · **Role N-M Permission** a través de RolePermission · **User N-M Permission** a través de UserPermission
- Además, `hasMany`/`belongsTo` directos entre cada tabla intermedia y sus dos tablas (ej. `UserRole.belongsTo(Role)`), para poder consultarlas solas, como hace `checkPermission`.
- **User 1-1** Member (`userId`) · **User 1-1** Staff (`userId`)
- **User 1-N** Member como adulto responsable (`adultUserId`; alias `dependents` en User y `adultUser` en Member)
- **User 1-N** Log (`userId`) · **Role 1-N** Log (`roleId`)
- **User 1-N** Notification dos veces: `recipientId` (alias `receivedNotifications` / `recipient`) y `transmitterId` (alias `sentNotifications` / `transmitter`)
- **User 1-N** Payment (`userId`) · **User 1-N** Routine (`userId`, alias `routines` / `author`)
- **Member 1-N** Inscription, Fee, Citation (`memberId`) · **Member N-M Category** a través de CategoryPlayer
- **Staff N-M Category** a través de CategoryStaff · **Staff 1-N** Citation (`staffId`)
- **League 1-N** Category (`leagueId`) · **Category 1-N** Game, Routine (`categoryId`)
- **Game 1-N** Citation (`gameId`) · **Fee 1-N** Payment (`feeId`)

## 4. Ajustes en archivos existentes

- **`utils/integrity.js`:** si algo del archivo depende del nombre del campo de la tabla `dvv`, usá `tableName`.
- **`CLAUDE.md` y `docs/contexto.md`:** no los modifiques. Ya vienen actualizados con estas decisiones. Si ves que no las incluyen, avisame.

## 5. Verificación

1. Revisá que exista `api/.env` con los datos del MySQL local. Si no existe, frená y avisame.
2. Escribí un script temporal en el scratchpad o en `/tmp`, **no** en el repo, que:
   - importe `models`, haga `sequelize.sync({ force: true })` y consulte `information_schema`;
   - confirme que hay **24 tablas** con los nombres exactos del punto 2;
   - confirme que existen los índices únicos compuestos `fee (memberId, period)` y `role (clubId, name)`, y que **no** hay índices únicos sueltos en `fee.memberId`, `fee.period` ni `role.name`;
   - confirme que las FK de `log.userId`, `log.roleId`, `notification.transmitterId` y `member.adultUserId` admiten NULL y que `user.password` admite NULL.

   En esta etapa la base está vacía, así que `force: true` no borra nada importante. Si encontrás tablas con datos, preguntame antes de correrlo.
3. Levantá el servidor con `npm run dev` y comprobá que arranca y sincroniza sin errores.
4. Actualizá `docs/TODO.md`: marcá en la Fase 1 las tres tareas del P02 (modelos, asociaciones e índices únicos) y agregá la línea al Registro.
5. Mostrame el resultado de la verificación y cualquier decisión que hayas tenido que tomar y no estuviera en este prompt.
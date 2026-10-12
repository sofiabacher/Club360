
// 1. Seguridad y acceso
const User = require('./User')
const Role = require('./Role')
const Permission = require('./Permission')
const UserRole = require('./UserRole')
const RolePermission = require('./RolePermission')
const UserPermission = require('./UserPermission')
const Dvv = require('./Dvv')

// 2. Club, deportes y auditoría
const Club = require('./Club')
const Sport = require('./Sport')
const ClubSport = require('./ClubSport')
const Log = require('./Log')
const Notification = require('./Notification')

// 3. Socios, staff e inscripciones
const Member = require('./Member')
const Staff = require('./Staff')
const Inscription = require('./Inscription')

// 4. Cuotas y pagos
const Fee = require('./Fee')
const Payment = require('./Payment')

// 5. Ligas, partidos y citaciones
const League = require('./League')
const Category = require('./Category')
const CategoryPlayer = require('./CategoryPlayer')
const CategoryStaff = require('./CategoryStaff')
const Game = require('./Game')
const Citation = require('./Citation')

// 6. Rutinas
const Routine = require('./Routine')

const { registerIntegrityHooks } = require('./integrityHooks')


// Las bajas del sistema son lógicas (por estado o isActive), así que por defecto no se borra en cascada.
const RESTRICT = { onDelete: 'RESTRICT', onUpdate: 'CASCADE' }
const CASCADE = { onDelete: 'CASCADE', onUpdate: 'CASCADE' }     // Solo tablas intermedias
const SET_NULL = { onDelete: 'SET NULL', onUpdate: 'CASCADE' }   // Solo FK que admiten NULL

// parent 1-N child. `many` es el alias en parent y `one` el alias en child.
function oneToMany(parent, child, foreignKey, many, one, rule = RESTRICT) {
    parent.hasMany(child, { foreignKey, as: many, ...rule })
    child.belongsTo(parent, { foreignKey, as: one, ...rule })
}

// parent 1-1 child
function oneToOne(parent, child, foreignKey, asChild, asParent) {
    parent.hasOne(child, { foreignKey, as: asChild, ...RESTRICT })
    child.belongsTo(parent, { foreignKey, as: asParent, ...RESTRICT })
}

// a N-M b a través de `through`. Además relaciona la tabla intermedia con sus dos tablas, para poder consultarla sola.
// a y b: { model, key (FK en la intermedia), many (alias con que el otro lado lo ve), one (alias desde la intermedia) }
function manyToMany(a, b, through, throughAlias) {
    a.model.belongsToMany(b.model, { through: { model: through, unique: false }, foreignKey: a.key, otherKey: b.key, as: b.many, ...CASCADE })
    b.model.belongsToMany(a.model, { through: { model: through, unique: false }, foreignKey: b.key, otherKey: a.key, as: a.many, ...CASCADE })

    oneToMany(a.model, through, a.key, throughAlias, a.one, CASCADE)
    oneToMany(b.model, through, b.key, throughAlias, b.one, CASCADE)
}

// ---------- Club ----------
oneToMany(Club, User, 'clubId', 'users', 'club')
oneToMany(Club, Role, 'clubId', 'roles', 'club')
oneToMany(Club, Log, 'clubId', 'logs', 'club')
oneToMany(Club, Notification, 'clubId', 'notifications', 'club')
oneToMany(Club, ClubSport, 'clubId', 'clubSports', 'club')
oneToMany(Club, Member, 'clubId', 'members', 'club')
oneToMany(Club, Staff, 'clubId', 'staff', 'club')
oneToMany(Club, Inscription, 'clubId', 'inscriptions', 'club')
oneToMany(Club, Fee, 'clubId', 'fees', 'club')
oneToMany(Club, Payment, 'clubId', 'payments', 'club')
oneToMany(Club, League, 'clubId', 'leagues', 'club')
oneToMany(Club, Category, 'clubId', 'categories', 'club')
oneToMany(Club, Game, 'clubId', 'games', 'club')
oneToMany(Club, Citation, 'clubId', 'citations', 'club')
oneToMany(Club, Routine, 'clubId', 'routines', 'club')

// ---------- Deportes ----------
oneToMany(Sport, ClubSport, 'sportId', 'clubSports', 'sport')
oneToMany(ClubSport, Inscription, 'clubSportId', 'inscriptions', 'clubSport')
oneToMany(ClubSport, League, 'clubSportId', 'leagues', 'clubSport')
oneToMany(ClubSport, Staff, 'clubSportId', 'staff', 'clubSport')

// ---------- Usuarios, roles y permisos ----------
manyToMany(
    { model: User, key: 'userId', many: 'users', one: 'user' },
    { model: Role, key: 'roleId', many: 'roles', one: 'role' },
    UserRole, 'userRoles'
)

manyToMany(
    { model: Role, key: 'roleId', many: 'roles', one: 'role' },
    { model: Permission, key: 'permissionId', many: 'permissions', one: 'permission' },
    RolePermission, 'rolePermissions'
)

manyToMany(
    { model: User, key: 'userId', many: 'users', one: 'user' },
    { model: Permission, key: 'permissionId', many: 'permissions', one: 'permission' },
    UserPermission, 'userPermissions'
)

// ---------- Usuario ----------
oneToOne(User, Member, 'userId', 'member', 'user')
oneToOne(User, Staff, 'userId', 'staff', 'user')
oneToMany(User, Member, 'adultUserId', 'dependents', 'adultUser', SET_NULL)   // Adulto responsable de socios menores

oneToMany(User, Log, 'userId', 'logs', 'user', SET_NULL)
oneToMany(Role, Log, 'roleId', 'logs', 'role', SET_NULL)

oneToMany(User, Notification, 'recipientId', 'receivedNotifications', 'recipient')
oneToMany(User, Notification, 'transmitterId', 'sentNotifications', 'transmitter', SET_NULL)

oneToMany(User, Payment, 'userId', 'payments', 'user')
oneToMany(User, Routine, 'userId', 'routines', 'author')

// ---------- Socios y staff ----------
oneToMany(Member, Inscription, 'memberId', 'inscriptions', 'member')
oneToMany(Member, Fee, 'memberId', 'fees', 'member')
oneToMany(Member, Citation, 'memberId', 'citations', 'member')
oneToMany(Staff, Citation, 'staffId', 'citations', 'staff')

manyToMany(
    { model: Member, key: 'memberId', many: 'players', one: 'member' },
    { model: Category, key: 'categoryId', many: 'categories', one: 'category' },
    CategoryPlayer, 'categoryPlayers'
)

manyToMany(
    { model: Staff, key: 'staffId', many: 'staff', one: 'staff' },
    { model: Category, key: 'categoryId', many: 'categories', one: 'category' },
    CategoryStaff, 'categoryStaff'
)

// ---------- Ligas, partidos, cuotas ----------
oneToMany(League, Category, 'leagueId', 'categories', 'league')
oneToMany(Category, Game, 'categoryId', 'games', 'category')
oneToMany(Category, Routine, 'categoryId', 'routines', 'category')
oneToMany(Game, Citation, 'gameId', 'citations', 'game')
oneToMany(Fee, Payment, 'feeId', 'payments', 'fee')

const models = {
    User,
    Role,
    Permission,
    UserRole,
    RolePermission,
    UserPermission,
    Dvv,
    Club,
    Sport,
    ClubSport,
    Log,
    Notification,
    Member,
    Staff,
    Inscription,
    Fee,
    Payment,
    League,
    Category,
    CategoryPlayer,
    CategoryStaff,
    Game,
    Citation,
    Routine
}

registerIntegrityHooks(models)   // DVH y DVV automáticos en todos los modelos con dvh

module.exports = models

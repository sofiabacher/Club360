// Catálogo de permisos de la plataforma: fuente única en el código.
// Se corresponde con la sección 4.1 del documento de Club360. Si un permiso cambia, hay que cambiarlo en los dos lugares.
// El catálogo es fijo y común a todos los clubes: lo carga el seed y el Admin del club no puede crear, modificar ni eliminar permisos.

// Constantes para usar en las rutas: checkPermission(PERMISSIONS.FEES_MANAGE)
const PERMISSIONS = {
    // Funciones comunes
    AUTH_MANAGE_ACCOUNT: 'auth.manageAccount',
    NOTIFICATIONS_VIEW: 'notifications.view',

    // Notificaciones
    NOTIFICATIONS_SEND_ALL: 'notifications.sendAll',
    NOTIFICATIONS_SEND_SPORT: 'notifications.sendSport',
    NOTIFICATIONS_SEND_CATEGORY: 'notifications.sendCategory',

    // Roles y permisos
    ACCESS_MANAGE_ROLES: 'access.manageRoles',
    ACCESS_ASSIGN_ROLES: 'access.assignRoles',

    // Club
    CLUBS_VIEW_INFO: 'clubs.viewInfo',
    CLUBS_MANAGE_SETTINGS: 'clubs.manageSettings',
    CLUBS_MANAGE_SPORTS: 'clubs.manageSports',

    // Socios y staff
    MEMBERS_MANAGE: 'members.manage',
    MEMBERS_UNLINK_ADULT: 'members.unlinkAdult',
    STAFF_MANAGE: 'staff.manage',

    // Inscripciones
    INSCRIPTIONS_REQUEST: 'inscriptions.request',
    INSCRIPTIONS_WITHDRAW: 'inscriptions.withdraw',
    INSCRIPTIONS_APPROVE: 'inscriptions.approve',

    // Cuotas y pagos
    FEES_MANAGE: 'fees.manage',
    FEES_VIEW_PLAYERS: 'fees.viewPlayers',
    FEES_VIEW_OWN: 'fees.viewOwn',
    FEES_PAY_OWN: 'fees.payOwn',
    FEES_MANAGE_LINKED: 'fees.manageLinked',

    // Ligas y categorías
    LEAGUES_MANAGE: 'leagues.manage',
    LEAGUES_ASSIGN_PLAYERS: 'leagues.assignPlayers',
    LEAGUES_ASSIGN_STAFF: 'leagues.assignStaff',
    LEAGUES_VIEW_ASSIGNED: 'leagues.viewAssigned',

    // Partidos y conflictos
    GAMES_MANAGE: 'games.manage',
    GAMES_VIEW_ASSIGNED: 'games.viewAssigned',
    GAMES_RESOLVE_CONFLICTS: 'games.resolveConflicts',
    GAMES_VIEW_OWN: 'games.viewOwn',
    GAMES_VIEW_LINKED: 'games.viewLinked',

    // Citaciones
    CITATIONS_CREATE: 'citations.create',
    CITATIONS_RESPOND: 'citations.respond',
    CITATIONS_VIEW_LINKED: 'citations.viewLinked',

    // Rutinas
    ROUTINES_MANAGE: 'routines.manage',
    ROUTINES_VIEW_ASSIGNED: 'routines.viewAssigned',
    ROUTINES_VIEW_OWN: 'routines.viewOwn',

    // Bitácora, integridad y copias de seguridad
    LOGS_VIEW: 'logs.view',
    LOGS_EXPORT: 'logs.export',
    INTEGRITY_MANAGE: 'integrity.manage',
    BACKUP_MANAGE: 'backup.manage',

    // Bot de consultas (opcional)
    BOT_USE: 'bot.use'
}

// Los 41 permisos con su descripción. En el seed, module y action salen de separar name por el punto.
const PERMISSION_CATALOG = [
    { name: PERMISSIONS.AUTH_MANAGE_ACCOUNT, description: 'Ver y modificar los datos de la propia cuenta' },
    { name: PERMISSIONS.NOTIFICATIONS_VIEW, description: 'Ver las notificaciones recibidas' },

    { name: PERMISSIONS.NOTIFICATIONS_SEND_ALL, description: 'Enviar avisos generales a todo el club' },
    { name: PERMISSIONS.NOTIFICATIONS_SEND_SPORT, description: 'Enviar notificaciones a jugadoras, familias y entrenadoras del deporte' },
    { name: PERMISSIONS.NOTIFICATIONS_SEND_CATEGORY, description: 'Enviar notificaciones a jugadoras y familias de sus categorías' },

    { name: PERMISSIONS.ACCESS_MANAGE_ROLES, description: 'Consultar roles, crear roles nuevos y editar sus permisos' },
    { name: PERMISSIONS.ACCESS_ASSIGN_ROLES, description: 'Asignar roles y permisos directos a usuarios' },

    { name: PERMISSIONS.CLUBS_VIEW_INFO, description: 'Consultar la información general del club' },
    { name: PERMISSIONS.CLUBS_MANAGE_SETTINGS, description: 'Configurar la cuota social, los días de atraso y el margen de conflicto horario' },
    { name: PERMISSIONS.CLUBS_MANAGE_SPORTS, description: 'Activar deportes del catálogo maestro y fijar su cuota deportiva' },

    { name: PERMISSIONS.MEMBERS_MANAGE, description: 'Dar de alta, consultar, modificar y dar de baja socios' },
    { name: PERMISSIONS.MEMBERS_UNLINK_ADULT, description: 'Desvincularse del adulto responsable (solo mayores de edad)' },
    { name: PERMISSIONS.STAFF_MANAGE, description: 'Dar de alta, consultar, modificar y dar de baja staff' },

    { name: PERMISSIONS.INSCRIPTIONS_REQUEST, description: 'Solicitar la inscripción a un deporte' },
    { name: PERMISSIONS.INSCRIPTIONS_WITHDRAW, description: 'Solicitar la baja de un deporte' },
    { name: PERMISSIONS.INSCRIPTIONS_APPROVE, description: 'Consultar solicitudes de inscripción y aprobarlas o rechazarlas' },

    { name: PERMISSIONS.FEES_MANAGE, description: 'Gestionar las cuotas de todo el club' },
    { name: PERMISSIONS.FEES_VIEW_PLAYERS, description: 'Consultar el estado de cuotas de las jugadoras del deporte' },
    { name: PERMISSIONS.FEES_VIEW_OWN, description: 'Consultar el estado de las propias cuotas' },
    { name: PERMISSIONS.FEES_PAY_OWN, description: 'Pagar las propias cuotas (solo mayores de edad)' },
    { name: PERMISSIONS.FEES_MANAGE_LINKED, description: 'Consultar el estado de cuenta de las jugadoras vinculadas y pagar sus cuotas' },

    { name: PERMISSIONS.LEAGUES_MANAGE, description: 'Crear, modificar y eliminar ligas y categorías' },
    { name: PERMISSIONS.LEAGUES_ASSIGN_PLAYERS, description: 'Asignar jugadoras a categorías' },
    { name: PERMISSIONS.LEAGUES_ASSIGN_STAFF, description: 'Asignar entrenadoras y preparadoras físicas a categorías' },
    { name: PERMISSIONS.LEAGUES_VIEW_ASSIGNED, description: 'Consultar las categorías asignadas y sus jugadoras' },

    { name: PERMISSIONS.GAMES_MANAGE, description: 'Publicar y editar partidos, incluidos los avisos de conflicto de horario' },
    { name: PERMISSIONS.GAMES_VIEW_ASSIGNED, description: 'Consultar el fixture de las categorías asignadas' },
    { name: PERMISSIONS.GAMES_RESOLVE_CONFLICTS, description: 'Resolver conflictos de horario' },
    { name: PERMISSIONS.GAMES_VIEW_OWN, description: 'Consultar el propio fixture' },
    { name: PERMISSIONS.GAMES_VIEW_LINKED, description: 'Consultar el fixture de las jugadoras vinculadas' },

    { name: PERMISSIONS.CITATIONS_CREATE, description: 'Generar citaciones y consultar las de sus categorías' },
    { name: PERMISSIONS.CITATIONS_RESPOND, description: 'Consultar las propias citaciones y confirmarlas o rechazarlas' },
    { name: PERMISSIONS.CITATIONS_VIEW_LINKED, description: 'Consultar las citaciones de las jugadoras vinculadas' },

    { name: PERMISSIONS.ROUTINES_MANAGE, description: 'Cargar y editar las rutinas semanales y su contenido de apoyo' },
    { name: PERMISSIONS.ROUTINES_VIEW_ASSIGNED, description: 'Consultar las rutinas de sus categorías' },
    { name: PERMISSIONS.ROUTINES_VIEW_OWN, description: 'Consultar la propia rutina semanal' },

    { name: PERMISSIONS.LOGS_VIEW, description: 'Consultar la bitácora con filtros' },
    { name: PERMISSIONS.LOGS_EXPORT, description: 'Descargar la bitácora en formato CSV' },
    { name: PERMISSIONS.INTEGRITY_MANAGE, description: 'Verificar y reparar los dígitos verificadores' },
    { name: PERMISSIONS.BACKUP_MANAGE, description: 'Realizar copias de seguridad y restaurar la base de datos' },

    { name: PERMISSIONS.BOT_USE, description: 'Usar el bot de consultas' }
]

module.exports = {
    PERMISSIONS,
    PERMISSION_CATALOG
}

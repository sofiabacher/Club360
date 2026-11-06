// Mapeo de los campos de estado (INT en la base, sin tabla de estados).
// IMPORTANTE: estos mapeos se replican en client/src/utils/constants.js. Si se cambia uno, se cambia en los dos.
// Valores cerrados el 18/10/2026 (decisión D8). El valor 1 es siempre el estado inicial (default del modelo).

// user.userStateId — staff no tiene estado propio: la baja de un Staff le quita sus roles de staff y deja el usuario
// en DELETED solo si no le queda ningún otro rol
const USER_STATES = { 
    PENDING: 1, 
    ACTIVE: 2, 
    BLOCKED: 3, 
    DELETED: 4 
}

// member.memberStateId — SUSPENDED: perdió la condición por mora; vuelve sola a ACTIVE al regularizar.
// INACTIVE: baja dada por el Admin.
const MEMBER_STATES = { 
    ACTIVE: 1, 
    SUSPENDED: 2, 
    INACTIVE: 3 
}

// inscription.inscriptionState — CANCELLED incluye la baja del deporte (pasos en D4)
const INSCRIPTION_STATES = {
    PENDING: 1, 
    APPROVED: 2, 
    REJECTED: 3, 
    CANCELLED: 4 
}

// fee.feeState — la mora (días de atraso) se calcula desde expirationDate, no es un estado
const FEE_STATES = { 
    PENDING: 1, 
    PAID: 2, 
    OVERDUE: 3 
}

// payment.transactionState
const TRANSACTION_STATES = { 
    PENDING: 1, 
    APPROVED: 2, 
    REJECTED: 3 
}

// citation.citationState — CANCELLED: el partido se canceló
const CITATION_STATES = { 
    PENDING: 1, 
    CONFIRMED: 2, 
    REJECTED: 3, 
    AUTO_CONFIRMED: 4, 
    CANCELLED: 5 
}

// game.gameState — PLAYED lo marca a mano el Representante
const GAME_STATES = { 
    SCHEDULED: 1, 
    PLAYED: 2, 
    CANCELLED: 3 
}

// Niveles de criticidad de la bitácora
const CRITICITY = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }

// Acciones registrables en la bitácora. Cada módulo agrega las suyas acá.
const LOG_ACTIONS = {
    LOGIN_SUCCESS: { message: 'Inicio de sesión exitoso', criticity: CRITICITY.LOW },
    LOGIN_FAIL: { message: 'Inicio de sesión fallido', criticity: CRITICITY.MEDIUM },
    LOGOUT: { message: 'Cierre de sesión', criticity: CRITICITY.LOW },
    ROLE_SWITCH: { message: 'Cambio de rol activo', criticity: CRITICITY.MEDIUM },
    USER_BLOCKED: { message: 'Usuario bloqueado', criticity: CRITICITY.HIGH },
    REGISTER_SUCCESS: { message: 'Registro con número de socio', criticity: CRITICITY.MEDIUM },
    REGISTER_FAIL: { message: 'Registro con número de socio fallido', criticity: CRITICITY.MEDIUM },
    ACCESS_DENIED: { message: 'Acceso denegado', criticity: CRITICITY.MEDIUM },
    MAIL_ERROR: { message: 'Error en el envío de correo', criticity: CRITICITY.HIGH },
    PASSWORD_RECOVERY: { message: 'Pedido de recuperación de contraseña', criticity: CRITICITY.MEDIUM },
    PASSWORD_CHANGE: { message: 'Cambio de contraseña', criticity: CRITICITY.MEDIUM },
    USER_UNBLOCKED: { message: 'Usuario desbloqueado', criticity: CRITICITY.MEDIUM },
    USER_UPDATE: { message: 'Modificación de datos del usuario', criticity: CRITICITY.MEDIUM },

    // Roles y permisos: HIGH porque cambian la seguridad del sistema
    ROLE_CREATED: { message: 'Creación de rol', criticity: CRITICITY.HIGH },
    ROLE_UPDATED: { message: 'Modificación de rol', criticity: CRITICITY.HIGH },
    ROLE_DELETED: { message: 'Eliminación de rol', criticity: CRITICITY.HIGH },
    ROLE_ASSIGNED: { message: 'Asignación de rol a un usuario', criticity: CRITICITY.HIGH },
    ROLE_REMOVED: { message: 'Quita de rol a un usuario', criticity: CRITICITY.HIGH },
    PERMISSION_ASSIGNED: { message: 'Asignación de permiso directo', criticity: CRITICITY.HIGH },
    PERMISSION_REMOVED: { message: 'Quita de permiso directo', criticity: CRITICITY.HIGH },

    // Socios
    MEMBER_CREATED: { message: 'Alta de socio', criticity: CRITICITY.MEDIUM },
    MEMBER_UPDATED: { message: 'Modificación de socio', criticity: CRITICITY.MEDIUM },
    MEMBER_DEACTIVATED: { message: 'Baja de socio', criticity: CRITICITY.MEDIUM },
    MEMBER_REACTIVATED: { message: 'Reactivación de socio', criticity: CRITICITY.MEDIUM },

    // Club: HIGH porque cambian las cuotas y las reglas de todo el club
    CLUB_SETTINGS_UPDATED: { message: 'Modificación de la configuración del club', criticity: CRITICITY.HIGH },
    CLUB_SPORT_UPDATED: { message: 'Modificación de un deporte del club', criticity: CRITICITY.HIGH },

    // Staff y activación de su cuenta
    STAFF_CREATED: { message: 'Alta de staff', criticity: CRITICITY.MEDIUM },
    STAFF_UPDATED: { message: 'Modificación de staff', criticity: CRITICITY.MEDIUM },
    STAFF_DEACTIVATED: { message: 'Baja de staff', criticity: CRITICITY.MEDIUM },
    STAFF_REACTIVATED: { message: 'Reactivación de staff', criticity: CRITICITY.MEDIUM },
    ACCOUNT_ACTIVATED: { message: 'Activación de cuenta', criticity: CRITICITY.MEDIUM },
    ACTIVATION_EMAIL_SENT: { message: 'Envío del email de activación', criticity: CRITICITY.MEDIUM },

    // Vínculo familiar
    FAMILY_LINKED: { message: 'Vínculo como Familia', criticity: CRITICITY.MEDIUM },
    MEMBER_UNLINKED: { message: 'Desvinculación del adulto responsable', criticity: CRITICITY.MEDIUM },

    // Ligas, categorías y asignaciones
    LEAGUE_CREATED: { message: 'Alta de liga', criticity: CRITICITY.MEDIUM },
    LEAGUE_UPDATED: { message: 'Modificación de liga', criticity: CRITICITY.MEDIUM },
    LEAGUE_DEACTIVATED: { message: 'Baja de liga', criticity: CRITICITY.MEDIUM },
    LEAGUE_REACTIVATED: { message: 'Reactivación de liga', criticity: CRITICITY.MEDIUM },
    CATEGORY_CREATED: { message: 'Alta de categoría', criticity: CRITICITY.MEDIUM },
    CATEGORY_UPDATED: { message: 'Modificación de categoría', criticity: CRITICITY.MEDIUM },
    CATEGORY_DEACTIVATED: { message: 'Baja de categoría', criticity: CRITICITY.MEDIUM },
    CATEGORY_REACTIVATED: { message: 'Reactivación de categoría', criticity: CRITICITY.MEDIUM },
    PLAYER_ASSIGNED: { message: 'Asignación de jugadora a una categoría', criticity: CRITICITY.MEDIUM },
    PLAYER_UNASSIGNED: { message: 'Quita de jugadora de una categoría', criticity: CRITICITY.MEDIUM },
    STAFF_ASSIGNED: { message: 'Asignación de staff a una categoría', criticity: CRITICITY.MEDIUM },
    STAFF_UNASSIGNED: { message: 'Quita de staff de una categoría', criticity: CRITICITY.MEDIUM },

    // Notificaciones
    NOTIFICATION_SENT: { message: 'Envío de aviso general', criticity: CRITICITY.MEDIUM },

    // Partidos y conflictos de horario. La cancelación es HIGH: cancela citaciones y avisa a las jugadoras
    GAME_CREATED: { message: 'Alta de partido', criticity: CRITICITY.MEDIUM },
    GAME_UPDATED: { message: 'Modificación de partido', criticity: CRITICITY.MEDIUM },
    GAME_PLAYED: { message: 'Partido marcado como jugado', criticity: CRITICITY.MEDIUM },
    GAME_CANCELLED: { message: 'Cancelación de partido', criticity: CRITICITY.HIGH },
    CONFLICT_RESOLVED: { message: 'Resolución de conflicto de horario', criticity: CRITICITY.MEDIUM }
}

// Intentos fallidos de login antes de bloquear al usuario
const LOGIN_MAX_ATTEMPTS = 5

// Nombres de los 7 roles base de cada club (los crea el seed con isBase: true).
// No se usan para dar acceso (eso va siempre por permisos): solo para el seed, para MEMBERSHIP_ROLES y para las reglas
// de la gestión de roles (access.service: qué roles se asignan a mano y cuáles desde su circuito).
const BASE_ROLES = {
    ADMIN: 'Admin del Club',
    REPRESENTATIVE: 'Representante',
    COACH: 'Entrenadora',
    TRAINER: 'Preparadora física',
    MEMBER: 'Socio',
    PLAYER: 'Jugadora',
    FAMILY: 'Familia'
}

// Roles que dependen de la condición de socio: si el member está INACTIVE (baja del Admin), dejan de estar disponibles.
// Un socio SUSPENDED por mora los conserva (contexto, secciones 3.6.1 y 6).
const MEMBERSHIP_ROLES = [BASE_ROLES.MEMBER, BASE_ROLES.PLAYER]

// Roles de staff. Staff activo = usuario con al menos uno de estos roles (isActiveStaff en staff.service).
// Una persona puede tener varios y trabaja con el rol activo.
const STAFF_ROLES = [BASE_ROLES.REPRESENTATIVE, BASE_ROLES.COACH, BASE_ROLES.TRAINER]

// Roles de staff que se asignan a las categorías (el Representante gestiona las ligas, no se asigna)
const CATEGORY_STAFF_ROLES = [BASE_ROLES.COACH, BASE_ROLES.TRAINER]

// Escalas de edad del vóley (contexto, sección 6). Cada liga elige una (league.ageScale) y sus categorías un grupo
// (category.ageGroup = code). Una jugadora entra si su edad de temporada (getSeasonAge) es <= maxAge; null = sin límite.
// IMPORTANTE: se replica en client/src/utils/constants.js.
const AGE_SCALES = {
    1: [
        { code: 'SUB11', label: 'Sub-11', maxAge: 11 },
        { code: 'SUB12', label: 'Sub-12', maxAge: 12 },
        { code: 'SUB13', label: 'Sub-13', maxAge: 13 },
        { code: 'SUB15', label: 'Sub-15', maxAge: 15 },
        { code: 'SUB16', label: 'Sub-16', maxAge: 16 },
        { code: 'SUB18', label: 'Sub-18', maxAge: 18 },
        { code: 'SUB21', label: 'Sub-21', maxAge: 21 },
        { code: 'MAYORES', label: 'Mayores', maxAge: null }
    ],
    2: [
        { code: 'SUB13', label: 'Sub-13', maxAge: 13 },
        { code: 'SUB15', label: 'Sub-15', maxAge: 15 },
        { code: 'SUB17', label: 'Sub-17', maxAge: 17 },
        { code: 'SUB20', label: 'Sub-20', maxAge: 20 },
        { code: 'SUB23', label: 'Sub-23', maxAge: 23 },
        { code: 'MAYORES', label: 'Mayores', maxAge: null }
    ]
}

// Etiqueta de cada escala para mostrarla
const AGE_SCALE_LABELS = {
    1: 'Escala 1: Sub-11 a Sub-21 y Mayores',
    2: 'Escala 2: Sub-13 a Sub-23 y Mayores'
}

// Tipos de notificación (notification.type guarda la clave) y su canal, según la tabla "Canal de cada notificación"
// del contexto, sección 6 (D5). Es la ÚNICA fuente de qué va por email: notify() la consulta y ningún módulo decide
// por su cuenta. email: true (in-app y email), false (solo in-app) u 'optional' (email solo si quien envía lo elige).
// IMPORTANTE: el ícono y la ruta de cada tipo están en client/src/utils/notificationTypes.js.
const NOTIFICATION_TYPES = {
    CITATION_NEW: { email: true },          // Citación nueva (jugadora)
    GAME_CANCELLED: { email: true },        // Partido cancelado con citaciones (jugadoras citadas)
    FEE_OVERDUE: { email: true },           // Cuota vencida y avisos de mora
    MEMBER_SUSPENDED: { email: true },      // Suspensión por mora
    FIXTURE_PUBLISHED: { email: false },    // Fixture publicado o modificado
    SCHEDULE_CONFLICT: { email: false },    // Conflicto de horario (entrenadoras)
    ROUTINE_PUBLISHED: { email: false },    // Rutina publicada
    FEE_DUE_SOON: { email: false },         // Cuota por vencer
    INSCRIPTION_RESULT: { email: false },   // Inscripción aprobada o rechazada
    SPORT_WITHDRAWAL: { email: false },     // Baja de un deporte (Representante)
    GENERAL: { email: 'optional' }          // Avisos generales del Admin, el Representante y la Entrenadora
}

// Duración de un partido para calcular las superposiciones de horario (games.service).
// El modelo no guarda la duración: se asume 2 horas por partido (decisión del 01/11/2026).
const GAME_DURATION_MINUTES = 120

// Grupo de edad de una escala por su code (undefined si no es de esa escala)
const findAgeGroup = (ageScale, code) => AGE_SCALES[ageScale]?.find(group => group.code === code)

module.exports = {
    USER_STATES,
    MEMBER_STATES,
    INSCRIPTION_STATES,
    FEE_STATES,
    TRANSACTION_STATES,
    CITATION_STATES,
    GAME_STATES,
    CRITICITY,
    LOG_ACTIONS,
    LOGIN_MAX_ATTEMPTS,
    BASE_ROLES,
    MEMBERSHIP_ROLES,
    STAFF_ROLES,
    CATEGORY_STAFF_ROLES,
    AGE_SCALES,
    AGE_SCALE_LABELS,
    findAgeGroup,
    NOTIFICATION_TYPES,
    GAME_DURATION_MINUTES
}

// Mapeo de los campos de estado (INT en la base, sin tabla de estados).
// IMPORTANTE: estos mapeos se replican en client/src/utils/constants.js. Si se cambia uno, se cambia en los dos.
// Valores cerrados el 18/10/2026 (decisión D8). El valor 1 es siempre el estado inicial (default del modelo).

// user.userStateId — la baja de un Staff se hace con DELETED (staff no tiene estado propio)
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
    PERMISSION_REMOVED: { message: 'Quita de permiso directo', criticity: CRITICITY.HIGH }
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
    MEMBERSHIP_ROLES
}

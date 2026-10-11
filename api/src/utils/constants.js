// Mapeo de los campos de estado (INT en la base, sin tabla de estados).
// IMPORTANTE: estos mapeos se replican en client/src/utils/constants.js. Si se cambia uno, se cambia en los dos.
// Los marcados [A DEFINIR] son una propuesta a confirmar (decisión D8 de docs/TODO.md).

// user.userStateId [A DEFINIR]
const USER_STATES = { PENDING: 1, ACTIVE: 2, BLOCKED: 3, DELETED: 4 }

// member.memberStateId [A DEFINIR]
const MEMBER_STATES = { ACTIVE: 1, INACTIVE: 2 }

// inscription.inscriptionState [A DEFINIR]
const INSCRIPTION_STATES = { PENDING: 1, APPROVED: 2, REJECTED: 3, CANCELLED: 4 }

// fee.feeState [A DEFINIR]
const FEE_STATES = { PENDING: 1, PAID: 2, OVERDUE: 3 }

// payment.transactionState
const TRANSACTION_STATES = { PENDING: 1, APPROVED: 2, REJECTED: 3 }

// citation.citationState [A DEFINIR]
const CITATION_STATES = { PENDING: 1, CONFIRMED: 2, REJECTED: 3, AUTO_CONFIRMED: 4 }

// game.gameState [A DEFINIR]
const GAME_STATES = { SCHEDULED: 1, PLAYED: 2, CANCELLED: 3 }

// Niveles de criticidad de la bitácora
const CRITICITY = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }

// Acciones registrables en la bitácora. Cada módulo agrega las suyas acá.
const LOG_ACTIONS = {
    LOGIN_SUCCESS: { message: 'Inicio de sesión exitoso', criticity: CRITICITY.LOW },
    LOGIN_FAIL: { message: 'Inicio de sesión fallido', criticity: CRITICITY.MEDIUM },
    LOGOUT: { message: 'Cierre de sesión', criticity: CRITICITY.LOW },
    ROLE_SWITCH: { message: 'Cambio de rol activo', criticity: CRITICITY.MEDIUM },
    USER_BLOCKED: { message: 'Usuario bloqueado', criticity: CRITICITY.HIGH },
    ACCESS_DENIED: { message: 'Acceso denegado', criticity: CRITICITY.MEDIUM },
    MAIL_ERROR: { message: 'Error en el envío de correo', criticity: CRITICITY.HIGH }
}

// Intentos fallidos de login antes de bloquear al usuario
const LOGIN_MAX_ATTEMPTS = 5

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
    LOGIN_MAX_ATTEMPTS
}

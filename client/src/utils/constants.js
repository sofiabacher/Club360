// Mapeo de los campos de estado.
// IMPORTANTE: es una copia de api/src/utils/constants.js. Si se cambia uno, se cambia en los dos.
// Valores cerrados el 18/10/2026 (decisión D8). El valor 1 es siempre el estado inicial (default del modelo).

// user.userStateId — la baja de un Staff se hace con DELETED (staff no tiene estado propio)
export const USER_STATES = { 
    PENDING: 1, 
    ACTIVE: 2, 
    BLOCKED: 3, 
    DELETED: 4 
}

// member.memberStateId — SUSPENDED: perdió la condición por mora; vuelve sola a ACTIVE al regularizar.
// INACTIVE: baja dada por el Admin.
export const MEMBER_STATES = { 
    ACTIVE: 1, 
    SUSPENDED: 2, 
    INACTIVE: 3 
}

// inscription.inscriptionState — CANCELLED incluye la baja del deporte (pasos en D4)
export const INSCRIPTION_STATES = {
    PENDING: 1, 
    APPROVED: 2, 
    REJECTED: 3, 
    CANCELLED: 4 
}

// fee.feeState — la mora (días de atraso) se calcula desde expirationDate, no es un estado
export const FEE_STATES = { 
    PENDING: 1, 
    PAID: 2, 
    OVERDUE: 3 
}

// payment.transactionState
export const TRANSACTION_STATES = { 
    PENDING: 1, 
    APPROVED: 2, 
    REJECTED: 3 
}

// citation.citationState — CANCELLED: el partido se canceló
export const CITATION_STATES = { 
    PENDING: 1, 
    CONFIRMED: 2, 
    REJECTED: 3, 
    AUTO_CONFIRMED: 4, 
    CANCELLED: 5 
}

// game.gameState — PLAYED lo marca a mano el Representante
export const GAME_STATES = { 
    SCHEDULED: 1, 
    PLAYED: 2, 
    CANCELLED: 3 
}

// Niveles de criticidad de la bitácora
export const CRITICITY = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }

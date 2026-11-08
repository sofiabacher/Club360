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

// payment.method — medio de pago. CASH: pago en secretaría registrado por el Admin
export const PAYMENT_METHODS = {
    CARD: 1,
    TRANSFER: 2,
    CASH: 3
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

// Escalas de edad del vóley (copia de api/src/utils/constants.js). Cada liga elige una (league.ageScale) y sus
// categorías un grupo (category.ageGroup = code). Una jugadora entra si su edad de temporada (año actual − año de
// nacimiento) es <= maxAge; null = sin límite (Mayores).
export const AGE_SCALES = {
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
export const AGE_SCALE_LABELS = {
  1: 'Escala 1: Sub-11 a Sub-21 y Mayores',
  2: 'Escala 2: Sub-13 a Sub-23 y Mayores'
}

// Ventana para citar (copia de api/src/utils/constants.js): desde 7 días hasta 48 horas antes del partido
export const CITATION_WINDOW_OPEN_DAYS = 7
export const CITATION_MIN_HOURS = 48

// Cuotas (copia de api/src/utils/constants.js): se generan el día 1 y vencen el día 10
export const FEE_DUE_DAY = 10

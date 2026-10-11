// Mapeo de los campos de estado.
// IMPORTANTE: es una copia de api/src/utils/constants.js. Si se cambia uno, se cambia en los dos.
// Los marcados [A DEFINIR] son una propuesta a confirmar (decisión D8 de docs/TODO.md).

// user.userStateId [A DEFINIR]
export const USER_STATES = { PENDING: 1, ACTIVE: 2, BLOCKED: 3, DELETED: 4 }

// member.memberStateId [A DEFINIR]
export const MEMBER_STATES = { ACTIVE: 1, INACTIVE: 2 }

// inscription.inscriptionState [A DEFINIR]
export const INSCRIPTION_STATES = { PENDING: 1, APPROVED: 2, REJECTED: 3, CANCELLED: 4 }

// fee.feeState [A DEFINIR]
export const FEE_STATES = { PENDING: 1, PAID: 2, OVERDUE: 3 }

// payment.transactionState
export const TRANSACTION_STATES = { PENDING: 1, APPROVED: 2, REJECTED: 3 }

// citation.citationState [A DEFINIR]
export const CITATION_STATES = { PENDING: 1, CONFIRMED: 2, REJECTED: 3, AUTO_CONFIRMED: 4 }

// game.gameState [A DEFINIR]
export const GAME_STATES = { SCHEDULED: 1, PLAYED: 2, CANCELLED: 3 }

// Niveles de criticidad de la bitácora
export const CRITICITY = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }

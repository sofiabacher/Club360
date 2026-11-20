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
// chargeMember.chargeState — cargo eventual de un socio. Un cargo impago no es mora
export const CHARGE_STATES = {
    PENDING: 1,
    PAID: 2,
    OVERDUE: 3,
    CANCELLED: 4
}

// charge.targetType — a quiénes se les cobra un cargo eventual
export const CHARGE_TARGETS = {
    ALL: 1,
    MEMBERS: 2,
    CATEGORIES: 3,
    SPORTS: 4
}

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
// Días de la semana con la numeración ISO (routine.dayOfWeek): 1 lunes … 7 domingo. short: la letra de las pastillas
export const DAYS_OF_WEEK = [
    { value: 1, short: 'L', name: 'lunes' },
    { value: 2, short: 'M', name: 'martes' },
    { value: 3, short: 'X', name: 'miércoles' },
    { value: 4, short: 'J', name: 'jueves' },
    { value: 5, short: 'V', name: 'viernes' },
    { value: 6, short: 'S', name: 'sábado' },
    { value: 7, short: 'D', name: 'domingo' }
]

// Días con rutina: de lunes a viernes (los mismos que ROUTINE_DAYS del back)
export const ROUTINE_DAYS = DAYS_OF_WEEK.filter((day) => day.value <= 5)

export const GAME_STATES = { 
    SCHEDULED: 1, 
    PLAYED: 2, 
    CANCELLED: 3 
}

// routineLog.status — cómo le fue a la jugadora con la rutina del día (igual que el backend)
export const ROUTINE_LOG_STATUS = {
    COMPLETED: 1,
    PARTIAL: 2,
    NOT_COMPLETED: 3
}

// goal.goalState — "Vencido" no es un estado: es un objetivo IN_PROGRESS con la fecha pasada (overdue en la respuesta)
export const GOAL_STATES = {
    IN_PROGRESS: 1,
    ACHIEVED: 2,
    ABANDONED: 3
}

// Días desde la fecha de la rutina en los que la jugadora la puede registrar
export const ROUTINE_LOG_WINDOW_DAYS = 7

// Resultados en sets de un partido de vóley terminado, del lado del ganador (igual que el backend): al mejor de 5
// (3-0, 3-1, 3-2) o al mejor de 3 (2-0, 2-1). Valen también al revés. No hay empates
export const VALID_SET_RESULTS = [[3, 0], [3, 1], [3, 2], [2, 0], [2, 1]]

// Niveles de criticidad de la bitácora
export const CRITICITY = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }

// Nombre de cada criticidad y su chip (StatusChip): Baja neutro, Media pending, Alta overdue, Crítica critical (Bordó)
export const CRITICITY_LABELS = { 1: 'Baja', 2: 'Media', 3: 'Alta', 4: 'Crítica' }
export const CRITICITY_CHIPS = { 1: 'neutral', 2: 'pending', 3: 'overdue', 4: 'critical' }

// Tipo de backup (los mismos que BACKUP_TYPES del back)
export const BACKUP_TYPES = { MANUAL: 'MANUAL', AUTO: 'AUTO', PRE_RESTORE: 'PRE_RESTORE' }
export const BACKUP_TYPE_LABELS = { MANUAL: 'Manual', AUTO: 'Automático', PRE_RESTORE: 'Previo a restaurar' }

// Nombre en español de cada tabla (los mismos que TABLE_LABELS del back): resumen de un backup
export const TABLE_LABELS = {
  club: 'Club', user: 'Usuarios', role: 'Roles', user_role: 'Roles de los usuarios', role_permission: 'Permisos de los roles',
  user_permission: 'Permisos directos', permission: 'Permisos (catálogo)', sport: 'Deportes (catálogo)', clubSport: 'Deportes del club',
  member: 'Socios', staff: 'Staff', inscription: 'Inscripciones', fee: 'Cuotas', payment: 'Pagos', league: 'Ligas', category: 'Categorías',
  categoryPlayer: 'Jugadoras de las categorías', categoryStaff: 'Staff de las categorías', game: 'Partidos', citation: 'Citaciones',
  routine: 'Rutinas', routineLog: 'Registros de rutinas', goal: 'Objetivos', notification: 'Notificaciones'
}

// Escalas de edad del vóley (copia de api/src/utils/constants.js). Cada liga elige una (league.ageScale) y sus
// categorías un grupo (category.ageGroup = code). Una jugadora entra si su edad de temporada (año actual − año de
// nacimiento) es <= maxAge y >= minAge; sin el campo = sin límite (Mayores, Maxi). La escala personalizada
// (AGE_SCALE_CUSTOM) no tiene grupos fijos: cada categoría se crea con su edad mínima y/o máxima.
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
  ],
  3: [
    { code: 'MAXI35', label: '+35', minAge: 35 },
    { code: 'MAXI40', label: '+40', minAge: 40 },
    { code: 'MAXI45', label: '+45', minAge: 45 },
    { code: 'MAXI50', label: '+50', minAge: 50 },
    { code: 'MAXI55', label: '+55', minAge: 55 },
    { code: 'MAXI60', label: '+60', minAge: 60 }
  ],
  4: []
}

// Escala personalizada y edades que se pueden cargar en sus categorías
export const AGE_SCALE_CUSTOM = 4
export const CUSTOM_AGE_LIMITS = { min: 5, max: 99 }

// Etiqueta de cada escala para mostrarla
export const AGE_SCALE_LABELS = {
  1: 'Escala 1: Sub-11 a Sub-21 y Mayores',
  2: 'Escala 2: Sub-13 a Sub-23 y Mayores',
  3: 'Escala 3: Maxi (+35 a +60)',
  4: 'Personalizada'
}

// Ventana para citar (copia de api/src/utils/constants.js): desde 7 días hasta 48 horas antes del partido
export const CITATION_WINDOW_OPEN_DAYS = 7
export const CITATION_MIN_HOURS = 48

// Cuotas (copia de api/src/utils/constants.js): se generan el día 1 y vencen el día 10
export const FEE_DUE_DAY = 10

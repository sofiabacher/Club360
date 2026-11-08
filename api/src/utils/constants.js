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

// payment.method — medio de pago (P14b). CASH: pago en secretaría registrado por el Admin
const PAYMENT_METHODS = {
    CARD: 1,
    TRANSFER: 2,
    CASH: 3
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

// Días de la semana con la numeración ISO (routine.dayOfWeek): 1 lunes … 7 domingo. short: la letra de las pastillas
const DAYS_OF_WEEK = [
    { value: 1, short: 'L', name: 'lunes' },
    { value: 2, short: 'M', name: 'martes' },
    { value: 3, short: 'X', name: 'miércoles' },
    { value: 4, short: 'J', name: 'jueves' },
    { value: 5, short: 'V', name: 'viernes' },
    { value: 6, short: 'S', name: 'sábado' },
    { value: 7, short: 'D', name: 'domingo' }
]

// Días con rutina: de lunes a viernes (routine.dayOfWeek de 1 a 5). Sábado y domingo no tienen rutina
const ROUTINE_DAYS = DAYS_OF_WEEK.filter(day => day.value <= 5)

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
    CONFLICT_RESOLVED: { message: 'Resolución de conflicto de horario', criticity: CRITICITY.MEDIUM },

    // Citaciones. La confirmación automática la hace el job (sin usuario ni rol)
    CITATION_CREATED: { message: 'Generación de citaciones', criticity: CRITICITY.MEDIUM },
    CITATION_CANCELLED: { message: 'Cancelación de citación', criticity: CRITICITY.MEDIUM },
    CITATION_CONFIRMED: { message: 'Citación confirmada', criticity: CRITICITY.MEDIUM },
    ROUTINE_CREATED: { message: 'Rutina publicada', criticity: CRITICITY.LOW },
    ROUTINE_UPDATED: { message: 'Rutina modificada', criticity: CRITICITY.LOW },
    ROUTINE_DELETED: { message: 'Rutina borrada', criticity: CRITICITY.MEDIUM },
    CITATION_REJECTED: { message: 'Citación rechazada', criticity: CRITICITY.MEDIUM },
    CITATION_AUTO_CONFIRMED: { message: 'Citación confirmada automáticamente', criticity: CRITICITY.LOW },

    // Inscripciones a deportes y baja de un deporte
    INSCRIPTION_REQUESTED: { message: 'Solicitud de inscripción a un deporte', criticity: CRITICITY.MEDIUM },
    INSCRIPTION_APPROVED: { message: 'Aprobación de inscripción', criticity: CRITICITY.MEDIUM },
    INSCRIPTION_REJECTED: { message: 'Rechazo de inscripción', criticity: CRITICITY.MEDIUM },
    INSCRIPTION_CANCELLED: { message: 'Cancelación de solicitud de inscripción', criticity: CRITICITY.MEDIUM },
    SPORT_WITHDRAWN: { message: 'Baja de un deporte', criticity: CRITICITY.MEDIUM },

    // Cuotas, pagos y mora. La generación automática, la suspensión y sus avisos los hace el sistema (sin usuario ni rol)
    FEES_GENERATED: { message: 'Generación de cuotas', criticity: CRITICITY.LOW },
    PAYMENT_APPROVED: { message: 'Pago aprobado', criticity: CRITICITY.MEDIUM },
    PAYMENT_REJECTED: { message: 'Pago rechazado', criticity: CRITICITY.MEDIUM },
    FEE_PAID_MANUAL: { message: 'Pago registrado en secretaría', criticity: CRITICITY.HIGH },
    TRANSFER_REPORTED: { message: 'Transferencia informada', criticity: CRITICITY.LOW },
    MEMBER_SUSPENDED: { message: 'Suspensión de socio por mora', criticity: CRITICITY.HIGH },
    MEMBER_RECOVERED: { message: 'Recuperación de la condición de socio', criticity: CRITICITY.MEDIUM }
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
    CITATION_CANCELLED: { email: false },   // Citación cancelada por la entrenadora (jugadora y Familia)
    CONFLICT_RESOLVED: { email: false },    // Conflicto de horario resuelto: qué partido juega (jugadora y Familia)
    CITATION_RESPONSE: { email: false },    // Una jugadora confirmó o rechazó su citación (entrenadoras de la categoría)
    INSCRIPTION_REQUEST: { email: false },  // Solicitud de inscripción nueva (Representante del deporte)
    PAYMENT_REVIEW_REQUEST: { email: false },   // Transferencia informada para revisar (usuarios con fees.manage)
    PAYMENT_RESULT: { email: false },       // Resultado de la revisión de una transferencia (quien pagó y el socio, con Familia)
    GENERAL: { email: 'optional' }          // Avisos generales del Admin, el Representante y la Entrenadora
}

// Duración de un partido para calcular las superposiciones de horario (games.service).
// El modelo no guarda la duración: se asume 2 horas por partido (decisión del 01/11/2026).
const GAME_DURATION_MINUTES = 120

// Citaciones (contexto, sección 6): se generan dentro de una ventana, desde 7 días hasta 48 horas antes del partido, y
// la jugadora tiene 24 horas desde la citación para responder. Después, el job autoConfirmCitations la confirma sola
const CITATION_WINDOW_OPEN_DAYS = 7
const CITATION_MIN_HOURS = 48
const CITATION_RESPONSE_HOURS = 24

// Cuotas (D12, contexto sección 6): la cuota del mes se genera el día 1 y vence el día 10. El aviso de cuota por vencer
// sale 3 días antes del vencimiento y el recordatorio de mora, cada 30 días de atraso
const FEE_GENERATION_DAY = 1
const FEE_DUE_DAY = 10
const FEE_DUE_SOON_DAYS = 3
const FEE_OVERDUE_REMINDER_DAYS = 30

// Grupo de edad de una escala por su code (undefined si no es de esa escala)
const findAgeGroup = (ageScale, code) => AGE_SCALES[ageScale]?.find(group => group.code === code)

module.exports = {
    USER_STATES,
    MEMBER_STATES,
    INSCRIPTION_STATES,
    FEE_STATES,
    TRANSACTION_STATES,
    PAYMENT_METHODS,
    CITATION_STATES,
    GAME_STATES,
    DAYS_OF_WEEK,
    ROUTINE_DAYS,
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
    GAME_DURATION_MINUTES,
    CITATION_WINDOW_OPEN_DAYS,
    CITATION_MIN_HOURS,
    CITATION_RESPONSE_HOURS,
    FEE_GENERATION_DAY,
    FEE_DUE_DAY,
    FEE_DUE_SOON_DAYS,
    FEE_OVERDUE_REMINDER_DAYS
}

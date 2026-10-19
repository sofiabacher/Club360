// Los 7 roles base de cada club (isBase: true) con sus permisos.
const { PERMISSIONS: P } = require('../../utils/permissions')
const { BASE_ROLES: R } = require('../../utils/constants')

// members.unlinkAdult y fees.payOwn dependen además de que el socio sea mayor de edad.
// Esa condición no la maneja el seed: getEffectivePermissions las quita a los menores (ADULT_ONLY_PERMISSIONS).
const MEMBER_PERMISSIONS = [
    P.AUTH_MANAGE_ACCOUNT,
    P.NOTIFICATIONS_VIEW,
    P.CLUBS_VIEW_INFO,
    P.MEMBERS_UNLINK_ADULT,
    P.INSCRIPTIONS_REQUEST,
    P.INSCRIPTIONS_WITHDRAW,
    P.FEES_VIEW_OWN,
    P.FEES_PAY_OWN,
    P.BOT_USE
]

const BASE_ROLES_SEED = [
    {
        name: R.ADMIN,
        description: 'Administra la operación de su club.',
        permissions: [
            P.AUTH_MANAGE_ACCOUNT,
            P.NOTIFICATIONS_VIEW,
            P.NOTIFICATIONS_SEND_ALL,
            P.ACCESS_MANAGE_ROLES,
            P.ACCESS_ASSIGN_ROLES,
            P.CLUBS_MANAGE_SETTINGS,
            P.CLUBS_MANAGE_SPORTS,
            P.MEMBERS_MANAGE,
            P.STAFF_MANAGE,
            P.FEES_MANAGE,
            P.LOGS_VIEW,
            P.LOGS_EXPORT,
            P.INTEGRITY_MANAGE,
            P.BACKUP_MANAGE
        ]
    },
    {
        name: R.REPRESENTATIVE,
        description: 'Administra el deporte dentro del club.',
        permissions: [
            P.AUTH_MANAGE_ACCOUNT,
            P.NOTIFICATIONS_VIEW,
            P.NOTIFICATIONS_SEND_SPORT,
            P.INSCRIPTIONS_APPROVE,
            P.FEES_VIEW_PLAYERS,
            P.LEAGUES_MANAGE,
            P.LEAGUES_ASSIGN_PLAYERS,
            P.LEAGUES_ASSIGN_STAFF,
            P.GAMES_MANAGE
        ]
    },
    {
        name: R.COACH,
        description: 'Gestiona sus categorías, citaciones y conflictos de horario.',
        permissions: [
            P.AUTH_MANAGE_ACCOUNT,
            P.NOTIFICATIONS_VIEW,
            P.NOTIFICATIONS_SEND_CATEGORY,
            P.LEAGUES_VIEW_ASSIGNED,
            P.GAMES_VIEW_ASSIGNED,
            P.GAMES_RESOLVE_CONFLICTS,
            P.CITATIONS_CREATE,
            P.ROUTINES_VIEW_ASSIGNED
        ]
    },
    {
        name: R.TRAINER,
        description: 'Carga las rutinas semanales de sus categorías.',
        permissions: [
            P.AUTH_MANAGE_ACCOUNT,
            P.NOTIFICATIONS_VIEW,
            P.LEAGUES_VIEW_ASSIGNED,
            P.GAMES_VIEW_ASSIGNED,
            P.ROUTINES_MANAGE
        ]
    },
    {
        name: R.MEMBER,
        description: 'Perfil base del socio del club.',
        permissions: MEMBER_PERMISSIONS
    },
    {
        name: R.PLAYER,
        description: 'Socia deportista, incluye todo lo del Socio.',
        permissions: [...MEMBER_PERMISSIONS, P.GAMES_VIEW_OWN, P.CITATIONS_RESPOND, P.ROUTINES_VIEW_OWN]
    },
    {
        name: R.FAMILY,
        description: 'Adulto responsable vinculado a una o más jugadoras.',
        permissions: [
            P.AUTH_MANAGE_ACCOUNT,
            P.NOTIFICATIONS_VIEW,
            P.CLUBS_VIEW_INFO,
            P.FEES_MANAGE_LINKED,
            P.GAMES_VIEW_LINKED,
            P.CITATIONS_VIEW_LINKED,
            P.BOT_USE
        ]
    }
]

module.exports = { BASE_ROLES_SEED }

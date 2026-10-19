// Service de auth: login, registro con número de socio, rol activo y sesión.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
const { Op, UniqueConstraintError } = require('sequelize')

const sequelize = require('../../config/db')
const { User, Member, Club } = require('../../models')
const { getAvailableRoles, getEffectivePermissions } = require('../access/access.service')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { hashPassword, comparePassword } = require('../../utils/crypto')
const { generateLoginToken } = require('../../utils/token')
const { isAdult } = require('../../utils/dates')
const { USER_STATES, MEMBER_STATES, LOG_ACTIONS, LOGIN_MAX_ATTEMPTS } = require('../../utils/constants')
const { auth } = require('../../utils/messages')

// Sesión que recibe el front: se arma siempre acá, para el login, el cambio de rol y /auth/me.
// Si el rol activo ya no está entre los disponibles, la sesión sale sin rol activo y sin permisos.
async function buildSession(userId, activeRoleId) {
    const user = await User.findByPk(userId, {
        attributes: ['id', 'name', 'lastName', 'email', 'username', 'photo', 'birthDate'],
        include: [{ model: Club, as: 'club', attributes: ['id', 'name'] }]
    })

    if (!user) throw createError(auth.userNotFound, 401)

    const roles = await getAvailableRoles(userId)
    const activeRole = roles.find(role => role.id === activeRoleId) ?? null
    const permissions = await getEffectivePermissions(userId, activeRole?.id ?? null)

    return {
        user: {
            id: user.id,
            name: user.name,
            lastName: user.lastName,
            email: user.email,
            username: user.username,
            photo: user.photo,
            birthDate: user.birthDate,
            isAdult: isAdult(user.birthDate)
        },
        club: { id: user.club.id, name: user.club.name },
        roles,
        activeRole,
        permissions
    }
}

// Contraseña incorrecta: suma un intento y, al llegar a LOGIN_MAX_ATTEMPTS, bloquea al usuario
async function registerFailedAttempt(user) {
    const failedAttempts = user.failedAttempts + 1
    const blocked = failedAttempts >= LOGIN_MAX_ATTEMPTS
    const actor = { clubId: user.clubId, userId: user.id, roleId: null }

    await user.update({
        failedAttempts,
        ...(blocked && { userStateId: USER_STATES.BLOCKED })
    })

    await logger(actor, LOG_ACTIONS.LOGIN_FAIL, `Contraseña incorrecta (intento ${failedAttempts} de ${LOGIN_MAX_ATTEMPTS})`)

    if (blocked) {
        await logger(actor, LOG_ACTIONS.USER_BLOCKED, `Bloqueado por ${LOGIN_MAX_ATTEMPTS} intentos fallidos de inicio de sesión`)
        throw createError(auth.blockedUser, 403, 'USER_BLOCKED')
    }

    throw createError(auth.invalidCredentials, 401)
}

// Rechaza a los usuarios que no pueden entrar por su estado. Solo entra un usuario ACTIVE con contraseña.
function checkLoginState(user) {
    if (user.userStateId === USER_STATES.DELETED) throw createError(auth.userDeleted, 403, 'USER_DELETED')
    if (user.userStateId === USER_STATES.BLOCKED) throw createError(auth.blockedUser, 403, 'USER_BLOCKED')
    if (user.userStateId !== USER_STATES.ACTIVE || !user.password) throw createError(auth.pendingUser, 403, 'USER_PENDING')
}

async function login({ username, password }) {
    const user = await User.findOne({ where: { username } })

    // Mismo mensaje que con la contraseña incorrecta, para no revelar qué usuarios existen.
    // No se registra en la bitácora porque no hay clubId.
    if (!user) throw createError(auth.invalidCredentials, 401)

    checkLoginState(user)

    if (!await comparePassword(password, user.password)) {
        await registerFailedAttempt(user)
    }

    if (user.failedAttempts > 0) {
        await user.update({ failedAttempts: 0 })
    }

    const roles = await getAvailableRoles(user.id)

    if (roles.length === 0) {
        await logger({ clubId: user.clubId, userId: user.id, roleId: null }, LOG_ACTIONS.LOGIN_FAIL, 'Sin roles habilitados en el club')
        throw createError(auth.noRoles, 403, 'NO_ROLES')
    }

    // Con un solo rol se entra directo; con más de uno, el usuario elige en /select-role (POST /auth/switch-role)
    const activeRoleId = roles.length === 1 ? roles[0].id : null
    const token = generateLoginToken({ id: user.id, clubId: user.clubId, activeRoleId })

    await logger(
        { clubId: user.clubId, userId: user.id, roleId: activeRoleId },
        LOG_ACTIONS.LOGIN_SUCCESS,
        activeRoleId ? `Rol activo: ${roles[0].name}` : 'Pendiente de elegir el rol activo'
    )

    return {
        token,
        requiresRoleSelection: activeRoleId === null,
        session: await buildSession(user.id, activeRoleId)
    }
}

// Sirve para la primera elección del rol activo y para los cambios posteriores. Genera un token nuevo.
async function switchRole({ id: userId, clubId }, roleId) {
    const roles = await getAvailableRoles(userId)
    const role = roles.find(item => item.id === roleId)

    if (!role) throw createError(auth.roleNotAvailable, 403)

    const token = generateLoginToken({ id: userId, clubId, activeRoleId: role.id })

    await logger({ clubId, userId, roleId: role.id }, LOG_ACTIONS.ROLE_SWITCH, `Rol activo: ${role.name}`)

    return {
        token,
        session: await buildSession(userId, role.id)
    }
}

async function getMe({ id: userId, activeRoleId }) {
    return { session: await buildSession(userId, activeRoleId) }
}

// El token lo borra el front: acá solo queda registrado en la bitácora
async function logout({ id: userId, clubId, activeRoleId }) {
    await logger({ clubId, userId, roleId: activeRoleId }, LOG_ACTIONS.LOGOUT, null)
}

// Primer ingreso del socio: con su número de socio y su fecha de nacimiento genera su usuario y contraseña.
// El alta presencial (user en PENDING, member y rol Socio) es de la Fase 3: acá se asume que ya existen.
async function registerMember({ numMember, birthDate, username, password }) {
    const member = await Member.findOne({
        where: { numMember },
        include: [{ model: User, as: 'user' }]
    })

    // Mensaje único: no se revela si falló el número o la fecha. Solo se registra si el socio existe (hay clubId).
    if (!member || member.user.birthDate !== birthDate) {
        if (member) {
            await logger({ clubId: member.clubId, userId: member.userId, roleId: null }, LOG_ACTIONS.REGISTER_FAIL, 'La fecha de nacimiento no coincide')
        }

        throw createError(auth.registerDataMismatch, 400)
    }

    const { user } = member
    const actor = { clubId: member.clubId, userId: user.id, roleId: null }

    // El número de socio se usa una sola vez
    if (user.userStateId !== USER_STATES.PENDING || user.password) {
        await logger(actor, LOG_ACTIONS.REGISTER_FAIL, 'El número de socio ya fue utilizado')
        throw createError(auth.numMemberAlreadyUsed, 409)
    }

    if (member.memberStateId === MEMBER_STATES.INACTIVE) {
        await logger(actor, LOG_ACTIONS.REGISTER_FAIL, 'El socio está dado de baja')
        throw createError(auth.memberInactive, 403)
    }

    const usernameTaken = await User.findOne({ where: { username, id: { [Op.ne]: user.id } }, attributes: ['id'] })
    if (usernameTaken) throw createError(auth.usernameTaken, 409)

    const hashedPassword = await hashPassword(password)

    try {
        await sequelize.transaction(async (transaction) => {
            await user.update({
                username,
                password: hashedPassword,
                userStateId: USER_STATES.ACTIVE,
                failedAttempts: 0
            }, { transaction })
        })

    } catch (error) {
        if (error instanceof UniqueConstraintError) throw createError(auth.usernameTaken, 409)   // Otro registro tomó el usuario recién
        throw error
    }

    await logger(actor, LOG_ACTIONS.REGISTER_SUCCESS, `Usuario: ${username}`)

    return { username }
}

module.exports = {
    buildSession,
    login,
    switchRole,
    getMe,
    logout,
    registerMember
}

// Service de auth: login, registro con número de socio, rol activo, sesión, recuperación de contraseña y Mi cuenta.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
const { Op, UniqueConstraintError } = require('sequelize')

const sequelize = require('../../config/db')
const { User, Member, Club } = require('../../models')
const { getAvailableRoles, getEffectivePermissions } = require('../access/access.service')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { hashPassword, comparePassword } = require('../../utils/crypto')
const { generateLoginToken, generatePasswordResetToken, getPasswordResetUserId, verifyPasswordResetToken } = require('../../utils/token')
const { sendRecoveryEmail, sendPasswordChangedNotice } = require('../../utils/mailer/senders')
const { UPLOAD_FOLDERS, toPublicPath, deleteUpload } = require('../../utils/files')
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

// ---------- Recuperación de contraseña ----------

// Solo se recupera la contraseña de un usuario que ya la tiene y está ACTIVE o BLOCKED (a PENDING y DELETED, nada)
const RESET_ALLOWED_STATES = [USER_STATES.ACTIVE, USER_STATES.BLOCKED]
const canResetPassword = (user) => Boolean(user?.password) && RESET_ALLOWED_STATES.includes(user.userStateId)

// El aviso de cambio de contraseña no corta la operación si falla (el sender ya lo registra como MAIL_ERROR)
function notifyPasswordChanged(user) {
    sendPasswordChangedNotice(user).catch(() => {})
}

async function sendRecoveryLink(user) {
    await logger({ clubId: user.clubId, userId: user.id, roleId: null }, LOG_ACTIONS.PASSWORD_RECOVERY, `Link enviado a ${user.email}`)
    await sendRecoveryEmail(user, generatePasswordResetToken(user))
}

// Responde siempre lo mismo, exista o no la cuenta, para no revelar qué usuarios existen
async function forgotPassword(identifier) {
    const user = await User.findOne({ where: { [Op.or]: [{ username: identifier }, { email: identifier }] } })

    if (canResetPassword(user)) {
        // No se espera el envío: así la respuesta tarda lo mismo haya o no email. Si falla, queda MAIL_ERROR en la bitácora
        sendRecoveryLink(user).catch(() => {})
    }

    return { message: auth.forgotPasswordSent }
}

// Usuario del link de recuperación. El link no sirve si venció, si es de otra contraseña (ya se usó) o si la cuenta no puede recuperarse
async function findUserByResetToken(token, options = {}) {
    const userId = getPasswordResetUserId(token)
    const user = userId ? await User.findByPk(userId, options) : null

    if (!canResetPassword(user) || !verifyPasswordResetToken(token, user).valid) {
        throw createError(auth.resetTokenInvalid, 400, 'RESET_TOKEN_INVALID')
    }

    return user
}

async function validateResetToken(token) {
    await findUserByResetToken(token)
    return { valid: true }
}

// Guarda la contraseña nueva y desbloquea la cuenta si estaba bloqueada por intentos fallidos
async function resetPassword({ token, password }) {
    const user = await findUserByResetToken(token)

    if (await comparePassword(password, user.password)) throw createError(auth.samePassword, 400)

    const hashedPassword = await hashPassword(password)

    const wasBlocked = await sequelize.transaction(async (transaction) => {
        // Se vuelve a leer con bloqueo: si llegan dos pedidos con el mismo link, el segundo ve la contraseña ya cambiada
        const locked = await findUserByResetToken(token, { transaction, lock: transaction.LOCK.UPDATE })
        const blocked = locked.userStateId === USER_STATES.BLOCKED

        await locked.update({
            password: hashedPassword,
            failedAttempts: 0,
            ...(blocked && { userStateId: USER_STATES.ACTIVE })
        }, { transaction })

        return blocked
    })

    const actor = { clubId: user.clubId, userId: user.id, roleId: null }
    await logger(actor, LOG_ACTIONS.PASSWORD_CHANGE, 'Restablecida con el link de recuperación')

    if (wasBlocked) {
        await logger(actor, LOG_ACTIONS.USER_UNBLOCKED, 'Desbloqueado al restablecer la contraseña')
    }

    notifyPasswordChanged(user)

    return { username: user.username }
}

// ---------- Mi cuenta ----------
// El usuario solo modifica email, teléfono, foto y contraseña. Nombre, apellido, DNI, fecha de nacimiento y usuario
// los modifica el Admin (la fecha de nacimiento define los permisos de los menores).

async function getAccount(userId) {
    const user = await User.findByPk(userId, {
        attributes: ['id', 'name', 'lastName', 'dni', 'birthDate', 'username', 'email', 'phone', 'photo'],
        include: [{ model: Member, as: 'member', attributes: ['numMember'] }]
    })

    if (!user) throw createError(auth.userNotFound, 401)

    return {
        name: user.name,
        lastName: user.lastName,
        dni: user.dni,
        birthDate: user.birthDate,
        username: user.username,
        email: user.email,
        phone: user.phone,
        photo: user.photo,
        numMember: user.member?.numMember ?? null   // Solo si es socio
    }
}

// Solo email y teléfono: cualquier otro campo que llegue en el body se ignora
async function updateAccount({ id: userId, clubId, activeRoleId }, { email, phone }) {
    const emailTaken = await User.findOne({ where: { email, id: { [Op.ne]: userId } }, attributes: ['id'] })
    if (emailTaken) throw createError(auth.emailTaken, 409)

    const user = await User.findByPk(userId)
    const changes = { email, phone: phone || null }
    const changedFields = Object.keys(changes).filter(field => user[field] !== changes[field])

    if (changedFields.length > 0) {
        try {
            await user.update(changes)

        } catch (error) {
            if (error instanceof UniqueConstraintError) throw createError(auth.emailTaken, 409)
            throw error
        }

        await logger({ clubId, userId, roleId: activeRoleId }, LOG_ACTIONS.USER_UPDATE, `Mi cuenta: ${changedFields.join(', ')}`)
    }

    return getAccount(userId)
}

// Guarda la foto nueva (ya subida por multer) y borra la anterior del disco
async function updatePhoto({ id: userId, clubId, activeRoleId }, file) {
    if (!file) throw createError(auth.photoRequired, 400)

    const photo = toPublicPath(UPLOAD_FOLDERS.AVATARS, file.filename)
    const user = await User.findByPk(userId)
    const previousPhoto = user.photo

    try {
        await user.update({ photo })

    } catch (error) {
        await deleteUpload(photo)   // Si no se pudo guardar, no queda el archivo suelto
        throw error
    }

    await deleteUpload(previousPhoto)
    await logger({ clubId, userId, roleId: activeRoleId }, LOG_ACTIONS.USER_UPDATE, 'Mi cuenta: foto')

    return { photo }
}

// Cambio de contraseña con la sesión iniciada. Una contraseña actual incorrecta no suma intentos fallidos
async function changePassword({ id: userId, clubId, activeRoleId }, { currentPassword, newPassword }) {
    const user = await User.findByPk(userId)

    if (!await comparePassword(currentPassword, user.password)) throw createError(auth.currentPasswordWrong, 400)
    if (await comparePassword(newPassword, user.password)) throw createError(auth.samePassword, 400)

    await user.update({ password: await hashPassword(newPassword) })

    await logger({ clubId, userId, roleId: activeRoleId }, LOG_ACTIONS.PASSWORD_CHANGE, 'Desde Mi cuenta')
    notifyPasswordChanged(user)
}

module.exports = {
    buildSession,
    login,
    switchRole,
    getMe,
    logout,
    registerMember,
    forgotPassword,
    validateResetToken,
    resetPassword,
    getAccount,
    updateAccount,
    updatePhoto,
    changePassword
}

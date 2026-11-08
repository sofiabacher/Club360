// Service de inscriptions: inscripción y baja a un deporte, y su aprobación.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
//
// Reglas (contexto 3.3 y 3.3.1): pide la inscripción un socio ACTIVE, en un deporte activo del club, sin otra Pendiente o
// Aprobada en ese deporte. La aprueba o la rechaza quien tiene inscriptions.approve, con el alcance por deporte de
// getSportScope; aprobar da el rol Jugadora. La baja de un deporte es inmediata y la hace el propio socio.
const { Op } = require('sequelize')

const sequelize = require('../../config/db')
const { Inscription, Member, User, ClubSport, Sport, Staff, Citation, Game, Category, League, Log } = require('../../models')
const { getActiveSports } = require('../clubs/clubs.service')
const { getSportScope, getStaffRolesOfUsers } = require('../staff/staff.service')
const { getAvailableRoles, assignBaseRole, removeBaseRole } = require('../access/access.service')
const { removeMemberFromSportCategories, getActiveStaffOfCategory } = require('../leagues/leagues.service')
const { notify } = require('../notifications/notifications.service')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { generateLoginToken } = require('../../utils/token')
const { getSeasonAge, dateTimeParts } = require('../../utils/dates')
const { INSCRIPTION_STATES, MEMBER_STATES, CITATION_STATES, BASE_ROLES, LOG_ACTIONS } = require('../../utils/constants')
const { inscriptions: m } = require('../../utils/messages')

const INSCRIPTIONS_PAGE_SIZE = 20

// Estados que bloquean pedir otra inscripción en el mismo deporte
const OPEN_STATES = [INSCRIPTION_STATES.PENDING, INSCRIPTION_STATES.APPROVED]

// Filtro "Historial" del listado: todo lo que no está Pendiente
const HISTORY_FILTER = 'history'

const actorOf = ({ id: userId, clubId, activeRoleId }) => ({ clubId, userId, roleId: activeRoleId })

const fullNameOf = (user) => `${user.name} ${user.lastName}`

const unique = (values) => [...new Set(values)]

const includeSport = { model: ClubSport, as: 'clubSport', attributes: ['id', 'isActive', 'priceFee'], include: [{ model: Sport, as: 'sport', attributes: ['name'] }] }

const includeMemberUser = { model: User, as: 'user', attributes: ['id', 'name', 'lastName', 'birthDate'] }

const memberLabel = (member) => `${fullNameOf(member.user)} (Nº ${member.numMember})`

// El socio del usuario logueado (con su usuario). Si no es socio, 404
async function findOwnMember(user, { transaction, lock } = {}) {
    const member = await Member.findOne({ where: { userId: user.id, clubId: user.clubId }, include: [includeMemberUser], transaction, lock })
    if (!member) throw createError(m.notMember, 404)
    return member
}

// Usuarios con rol Representante (staff activo) del deporte clubSportId
async function getSportRepresentatives(clubId, clubSportId, { transaction } = {}) {
    const staff = await Staff.findAll({ where: { clubId, clubSportId }, attributes: ['userId'], raw: true, transaction })
    const rolesByUser = await getStaffRolesOfUsers(clubId, staff.map(item => item.userId), { transaction })
    return unique(staff.map(item => item.userId).filter(userId => rolesByUser.get(userId)?.includes(BASE_ROLES.REPRESENTATIVE)))
}

// Motivo de rechazo de cada inscripción (está solo en la bitácora): Map inscriptionId → motivo
async function getRejectionReasons(clubId, memberId) {
    const logs = await Log.findAll({
        where: { clubId, action: LOG_ACTIONS.INSCRIPTION_REJECTED.message, details: { [Op.like]: `%"memberId":${memberId},%` } },
        attributes: ['details']
    })

    const reasons = new Map()
    for (const log of logs) {
        try {
            const details = JSON.parse(log.details)
            if (details.memberId === memberId) reasons.set(details.inscriptionId, details.reason ?? null)
        } catch {
            // Registro con otro formato: se ignora
        }
    }
    return reasons
}

function formatInscription(inscription) {
    return {
        id: inscription.id,
        clubSportId: inscription.clubSportId,
        inscriptionState: inscription.inscriptionState,
        createdAt: inscription.createdAt,
        updatedAt: inscription.updatedAt
    }
}

// ---------- Socio (inscriptions.request y inscriptions.withdraw) ----------

// Los deportes activos del club, cada uno con la última inscripción del socio (o null), su cuota deportiva y qué puede
// hacer: pedirla (request), cancelar la solicitud (cancel) o darse de baja (withdraw)
async function listMine(user) {
    const member = await findOwnMember(user)

    const [sports, inscriptions, reasons] = await Promise.all([
        getActiveSports(user.clubId),
        Inscription.findAll({ where: { clubId: user.clubId, memberId: member.id }, order: [['id', 'DESC']] }),
        getRejectionReasons(user.clubId, member.id)
    ])

    const latestOf = new Map()
    for (const inscription of inscriptions) {
        if (!latestOf.has(inscription.clubSportId)) latestOf.set(inscription.clubSportId, inscription)
    }

    const isActiveMember = member.memberStateId === MEMBER_STATES.ACTIVE

    return {
        memberStateId: member.memberStateId,
        items: sports.map(sport => {
            const inscription = latestOf.get(sport.clubSportId) ?? null
            const state = inscription?.inscriptionState
            const open = OPEN_STATES.includes(state)

            return {
                clubSportId: sport.clubSportId,
                name: sport.name,
                priceFee: sport.priceFee,
                inscription: inscription && {
                    ...formatInscription(inscription),
                    reason: state === INSCRIPTION_STATES.REJECTED ? reasons.get(inscription.id) ?? null : null
                },
                actions: {
                    request: !open && isActiveMember,
                    cancel: state === INSCRIPTION_STATES.PENDING,
                    withdraw: state === INSCRIPTION_STATES.APPROVED
                }
            }
        })
    }
}

// Regla 1: socio ACTIVE, deporte activo del club y sin otra Pendiente o Aprobada en ese deporte. Avisa a los
// Representantes del deporte (INSCRIPTION_REQUEST, in-app)
async function requestInscription(actor, { clubSportId }) {
    const { inscription, member, sportName } = await sequelize.transaction(async (transaction) => {
        // El bloqueo del socio evita dos pedidos simultáneos del mismo deporte
        const member = await findOwnMember(actor, { transaction, lock: transaction.LOCK.UPDATE })
        if (member.memberStateId === MEMBER_STATES.SUSPENDED) throw createError(m.memberSuspended, 403, 'MEMBER_SUSPENDED')
        if (member.memberStateId !== MEMBER_STATES.ACTIVE) throw createError(m.memberNotActive, 403)

        const clubSport = await ClubSport.findOne({
            where: { id: clubSportId, clubId: actor.clubId, isActive: true },
            include: [{ model: Sport, as: 'sport', attributes: ['name'], where: { isActive: true } }],
            transaction
        })
        if (!clubSport) throw createError(m.sportNotFound, 404)

        const open = await Inscription.count({ where: { memberId: member.id, clubSportId: clubSport.id, inscriptionState: OPEN_STATES }, transaction })
        if (open > 0) throw createError(m.alreadyRequested, 409)

        const inscription = await Inscription.create({
            clubId: actor.clubId,
            clubSportId: clubSport.id,
            memberId: member.id,
            inscriptionState: INSCRIPTION_STATES.PENDING
        }, { transaction })

        const sportName = clubSport.sport.name
        const representatives = await getSportRepresentatives(actor.clubId, clubSport.id, { transaction })
        if (representatives.length > 0) {
            await notify({
                clubId: actor.clubId,
                type: 'INSCRIPTION_REQUEST',
                recipientUserIds: representatives,
                title: `Nueva solicitud de inscripción a ${sportName}`,
                message: `Nueva solicitud de inscripción a ${sportName}: ${memberLabel(member)}.`
            }, { transaction })
        }

        return { inscription, member, sportName }
    })

    await logger(actorOf(actor), LOG_ACTIONS.INSCRIPTION_REQUESTED, `${memberLabel(member)} en ${sportName} (inscripción ${inscription.id})`)

    return { inscription: formatInscription(inscription) }
}

// Citaciones de la baja: las Pendientes, Confirmadas y Confirmadas automáticamente de la socia en partidos futuros del
// deporte (contexto 3.3.1). Las Rechazadas y las de partidos que ya pasaron no se tocan
const WITHDRAW_CANCELLED_STATES = [CITATION_STATES.PENDING, CITATION_STATES.CONFIRMED, CITATION_STATES.AUTO_CONFIRMED]
const CONFIRMED_STATES = [CITATION_STATES.CONFIRMED, CITATION_STATES.AUTO_CONFIRMED]

async function futureCitationsOfSport(clubId, memberId, clubSportId, transaction) {
    return Citation.findAll({
        where: { clubId, memberId, citationState: WITHDRAW_CANCELLED_STATES },
        include: [{
            model: Game,
            as: 'game',
            attributes: ['id', 'rival', 'dateTime', 'categoryId'],
            where: { dateTime: { [Op.gt]: new Date() } },
            include: [{ model: Category, as: 'category', attributes: ['id', 'name'], include: [{ model: League, as: 'league', attributes: ['id'], where: { clubSportId } }] }]
        }],
        transaction
    })
}

// Por cada citación Confirmada que se cancela, aviso CITATION_RESPONSE (in-app) a las entrenadoras activas de la categoría
async function notifyCoachesOfCancelledConfirmation(clubId, playerName, sportName, game, transaction) {
    const staff = await getActiveStaffOfCategory(clubId, game.categoryId, { transaction })
    const coaches = [...new Set(staff.filter(item => item.roles.includes(BASE_ROLES.COACH)).map(item => item.userId))]
    if (coaches.length === 0) return

    const { weekdayShort, dayMonth } = dateTimeParts(game.dateTime)
    await notify({
        clubId,
        type: 'CITATION_RESPONSE',
        recipientUserIds: coaches,
        title: `${playerName} se dio de baja de ${sportName}`,
        message: `${playerName} se dio de baja de ${sportName}: se canceló su citación confirmada para ${game.category.name} vs. ${game.rival} (${weekdayShort} ${dayMonth}).`
    }, { transaction })
}

// Si el socio perdió el rol con el que estaba trabajando, la sesión vieja deja de valer (isAuth): se arma una nueva,
// como en el login (con un solo rol disponible entra directo; con más, tiene que elegir)
async function sessionAfterRoleLoss(actor) {
    const roles = await getAvailableRoles(actor.id)
    if (actor.activeRoleId === null || roles.some(role => role.id === actor.activeRoleId)) return null

    const { buildSession } = require('../auth/auth.service')   // Se requiere acá para no cargar auth al iniciar el módulo
    const activeRoleId = roles.length === 1 ? roles[0].id : null

    return {
        token: generateLoginToken({ id: actor.id, clubId: actor.clubId, activeRoleId }),
        requiresRoleSelection: activeRoleId === null,
        session: await buildSession(actor.id, activeRoleId)
    }
}

// El socio, sobre su propia inscripción: con una Pendiente cancela la solicitud (regla 4); con una Aprobada se da de
// baja del deporte (regla 5), en una transacción. Devuelve lo que cambió y, si perdió el rol activo, una sesión nueva
async function withdraw(actor, inscriptionId) {
    const result = await sequelize.transaction(async (transaction) => {
        const member = await findOwnMember(actor, { transaction })
        const inscription = await Inscription.findOne({
            where: { id: inscriptionId, clubId: actor.clubId, memberId: member.id },
            include: [includeSport],
            transaction,
            lock: transaction.LOCK.UPDATE
        })
        if (!inscription) throw createError(m.inscriptionNotFound, 404)

        const sportName = inscription.clubSport.sport.name
        const base = { inscription, member, sportName }

        if (inscription.inscriptionState === INSCRIPTION_STATES.PENDING) {
            await inscription.update({ inscriptionState: INSCRIPTION_STATES.CANCELLED }, { transaction })
            return { ...base, withdrawn: false, categories: [], citations: 0, confirmed: 0, lostPlayerRole: false }
        }

        if (inscription.inscriptionState !== INSCRIPTION_STATES.APPROVED) throw createError(m.cannotWithdraw, 409)

        await inscription.update({ inscriptionState: INSCRIPTION_STATES.CANCELLED }, { transaction })

        const categories = await removeMemberFromSportCategories(actor.clubId, member.id, inscription.clubSportId, { transaction })

        const citations = await futureCitationsOfSport(actor.clubId, member.id, inscription.clubSportId, transaction)
        let confirmed = 0
        for (const citation of citations) {
            const wasConfirmed = CONFIRMED_STATES.includes(citation.citationState)
            await citation.update({ citationState: CITATION_STATES.CANCELLED }, { transaction })

            if (wasConfirmed) {
                confirmed++
                await notifyCoachesOfCancelledConfirmation(actor.clubId, fullNameOf(member.user), sportName, citation.game, transaction)
            }
        }

        const stillApproved = await Inscription.count({ where: { memberId: member.id, inscriptionState: INSCRIPTION_STATES.APPROVED }, transaction })
        const lostPlayerRole = stillApproved === 0 && await removeBaseRole(member.userId, BASE_ROLES.PLAYER, { transaction })

        const representatives = await getSportRepresentatives(actor.clubId, inscription.clubSportId, { transaction })
        if (representatives.length > 0) {
            await notify({
                clubId: actor.clubId,
                type: 'SPORT_WITHDRAWAL',
                recipientUserIds: representatives,
                title: `Baja de ${sportName}: ${fullNameOf(member.user)}`,
                message: `${memberLabel(member)} se dio de baja de ${sportName}.`
            }, { transaction })
        }

        return { ...base, withdrawn: true, categories, citations: citations.length, confirmed, lostPlayerRole }
    })

    const { inscription, member, sportName, withdrawn, categories, citations, confirmed, lostPlayerRole } = result

    if (withdrawn) {
        await logger(actorOf(actor), LOG_ACTIONS.SPORT_WITHDRAWN,
            `${memberLabel(member)} en ${sportName} (inscripción ${inscription.id}). Categorías: ${categories.length > 0 ? categories.map(category => `${category.name} (${category.league})`).join(', ') : 'ninguna'}. `
            + `Citaciones de partidos futuros canceladas: ${citations} (${confirmed} confirmadas). ${lostPlayerRole ? 'Pierde el rol Jugadora.' : 'Conserva el rol Jugadora.'}`)
    } else {
        await logger(actorOf(actor), LOG_ACTIONS.INSCRIPTION_CANCELLED, `${memberLabel(member)} en ${sportName} (inscripción ${inscription.id})`)
    }

    return {
        inscription: formatInscription(inscription),
        withdrawn,
        removedCategories: categories.length,
        cancelledCitations: citations,
        cancelledConfirmedCitations: confirmed,
        lostPlayerRole,
        newSession: lostPlayerRole ? await sessionAfterRoleLoss(actor) : null
    }
}

// ---------- Representante (inscriptions.approve) ----------

const scopeWhere = (scope) => ({ clubId: scope.clubId, ...(scope.clubSportId && { clubSportId: scope.clubSportId }) })

// Una inscripción dentro del alcance. Si es de otro deporte (o no existe), 404
async function findScopedInscription(scope, inscriptionId, { transaction } = {}) {
    const inscription = await Inscription.findOne({
        where: { id: inscriptionId, ...scopeWhere(scope) },
        include: [includeSport, { model: Member, as: 'member', include: [includeMemberUser] }],
        transaction,
        lock: transaction?.LOCK.UPDATE
    })
    if (!inscription) throw createError(m.inscriptionNotFound, 404)
    return inscription
}

// Inscripciones del alcance de a INSCRIPTIONS_PAGE_SIZE, con el socio y el deporte. state: un INSCRIPTION_STATES o
// 'history' (todas menos las Pendientes). Sin state, todas, con las Pendientes primero. Cada palabra de la búsqueda
// tiene que aparecer en el nombre, el apellido, el DNI o el número de socio. sports: los deportes del alcance (filtro)
async function listInscriptions(user, { state, clubSportId, search = '', page = 1 }) {
    page = Number(page) || 1   // Con Express 5 req.query es de solo lectura: el toInt del validator no llega hasta acá
    const scope = await getSportScope(user)
    const words = String(search).trim().split(/\s+/).filter(Boolean)
    const fields = ['$member.user.name$', '$member.user.lastName$', '$member.user.dni$', '$member.numMember$']

    let stateWhere = {}
    if (state === HISTORY_FILTER) stateWhere = { inscriptionState: { [Op.ne]: INSCRIPTION_STATES.PENDING } }
    else if (state) stateWhere = { inscriptionState: Number(state) }

    const where = {
        ...scopeWhere(scope),
        // Un deporte fuera del alcance no trae nada (-1 no es un id válido)
        ...(clubSportId && { clubSportId: scope.clubSportId && scope.clubSportId !== Number(clubSportId) ? -1 : Number(clubSportId) }),
        ...stateWhere,
        ...(words.length > 0 && {
            [Op.and]: words.map(word => ({ [Op.or]: fields.map(field => ({ [field]: { [Op.like]: `%${word}%` } })) }))
        })
    }

    const [{ count, rows }, sports] = await Promise.all([
        Inscription.findAndCountAll({
            where,
            include: [
                { model: ClubSport, as: 'clubSport', attributes: ['id'], include: [{ model: Sport, as: 'sport', attributes: ['name'] }] },
                { model: Member, as: 'member', attributes: ['id', 'numMember', 'memberStateId'], include: [includeMemberUser] }
            ],
            order: [
                [sequelize.literal(`CASE WHEN \`Inscription\`.\`inscriptionState\` = ${INSCRIPTION_STATES.PENDING} THEN 0 ELSE 1 END`), 'ASC'],
                ['createdAt', 'DESC'],
                ['id', 'DESC']
            ],
            limit: INSCRIPTIONS_PAGE_SIZE,
            offset: (page - 1) * INSCRIPTIONS_PAGE_SIZE
        }),
        getActiveSports(user.clubId)
    ])

    return {
        items: rows.map(inscription => ({
            ...formatInscription(inscription),
            sport: inscription.clubSport.sport.name,
            member: {
                id: inscription.member.id,
                name: fullNameOf(inscription.member.user),
                numMember: inscription.member.numMember,
                seasonAge: getSeasonAge(inscription.member.user.birthDate),
                memberStateId: inscription.member.memberStateId
            }
        })),
        sports: sports
            .filter(sport => !scope.clubSportId || sport.clubSportId === scope.clubSportId)
            .map(({ clubSportId, name }) => ({ clubSportId, name })),
        total: count,
        page,
        pageSize: INSCRIPTIONS_PAGE_SIZE,
        totalPages: Math.max(1, Math.ceil(count / INSCRIPTIONS_PAGE_SIZE))
    }
}

// Regla 2: Pendiente → Aprobada, rol Jugadora y aviso al socio. Si el socio ya no está ACTIVE, 409
async function approveInscription(actor, inscriptionId) {
    const scope = await getSportScope(actor)

    const { inscription, member, sportName } = await sequelize.transaction(async (transaction) => {
        const inscription = await findScopedInscription(scope, inscriptionId, { transaction })
        if (inscription.inscriptionState !== INSCRIPTION_STATES.PENDING) throw createError(m.notPending, 409)

        const { member } = inscription
        if (member.memberStateId !== MEMBER_STATES.ACTIVE) throw createError(m.memberNoLongerActive, 409)

        await inscription.update({ inscriptionState: INSCRIPTION_STATES.APPROVED }, { transaction })
        await assignBaseRole(member.userId, BASE_ROLES.PLAYER, { transaction })

        const sportName = inscription.clubSport.sport.name
        await notify({
            clubId: actor.clubId,
            type: 'INSCRIPTION_RESULT',
            recipientUserIds: [member.userId],
            title: `Se aprobó tu inscripción a ${sportName}`,
            message: `¡Se aprobó tu inscripción a ${sportName}! Ya sos jugadora del club. Desde el menú podés cambiar al rol Jugadora.`
        }, { transaction })

        return { inscription, member, sportName }
    })

    await logger(actorOf(actor), LOG_ACTIONS.INSCRIPTION_APPROVED, `${memberLabel(member)} en ${sportName} (inscripción ${inscription.id})`)

    return { inscription: formatInscription(inscription) }
}

// Regla 3: Pendiente → Rechazada, con un motivo opcional que va en la bitácora (JSON, para mostrárselo al socio) y en el aviso
async function rejectInscription(actor, inscriptionId, { reason }) {
    const scope = await getSportScope(actor)
    const cleanReason = reason?.trim().replace(/\.+$/, '') || null   // Sin el punto final: el aviso agrega el suyo

    const { inscription, member, sportName } = await sequelize.transaction(async (transaction) => {
        const inscription = await findScopedInscription(scope, inscriptionId, { transaction })
        if (inscription.inscriptionState !== INSCRIPTION_STATES.PENDING) throw createError(m.notPending, 409)

        await inscription.update({ inscriptionState: INSCRIPTION_STATES.REJECTED }, { transaction })

        const { member } = inscription
        const sportName = inscription.clubSport.sport.name
        await notify({
            clubId: actor.clubId,
            type: 'INSCRIPTION_RESULT',
            recipientUserIds: [member.userId],
            title: `Tu inscripción a ${sportName} no fue aprobada`,
            message: `Tu inscripción a ${sportName} no fue aprobada.${cleanReason ? ` Motivo: ${cleanReason}.` : ''}`
        }, { transaction })

        return { inscription, member, sportName }
    })

    await logger(actorOf(actor), LOG_ACTIONS.INSCRIPTION_REJECTED, JSON.stringify({
        inscriptionId: inscription.id,
        memberId: member.id,
        member: memberLabel(member),
        sport: sportName,
        reason: cleanReason
    }))

    return { inscription: formatInscription(inscription) }
}

module.exports = {
    listMine,
    requestInscription,
    withdraw,
    listInscriptions,
    approveInscription,
    rejectInscription
}

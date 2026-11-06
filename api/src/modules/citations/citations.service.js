// Service de citations: generación, respuesta y confirmación automática de citaciones.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
//
// Reglas (contexto, sección 6): la entrenadora cita en los partidos Programados de sus categorías, con al menos 48 horas
// de anticipación, a jugadoras sin mora y sin un conflicto resuelto a favor del otro partido. La jugadora responde
// dentro de las 24 horas; si no, el job autoConfirmCitations la confirma sola.
const { Op } = require('sequelize')

const sequelize = require('../../config/db')
const { Citation, Game, Category, League, Member, Staff, User, Club } = require('../../models')
const { getActivePlayersOfCategory, getCategoriesOfStaff, isStaffAssignedToCategory } = require('../leagues/leagues.service')
const { formatGame, getNotPlayingGames, conflictMarkOf } = require('../games/games.service')
const { getOverdueDays } = require('../fees/fees.service')
const { notify } = require('../notifications/notifications.service')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { dateTimeParts } = require('../../utils/dates')
const {
    CITATION_STATES,
    GAME_STATES,
    MEMBER_STATES,
    CITATION_MIN_HOURS_BEFORE_GAME,
    CITATION_RESPONSE_HOURS,
    LOG_ACTIONS
} = require('../../utils/constants')
const { citations: m } = require('../../utils/messages')

const HOUR_MS = 60 * 60 * 1000

// Estados que la entrenadora puede cancelar (antes del partido)
const CANCELLABLE_STATES = [CITATION_STATES.PENDING, CITATION_STATES.CONFIRMED, CITATION_STATES.AUTO_CONFIRMED]

// Motivos por los que una jugadora de la categoría no se puede citar (para la lista de la entrenadora)
const NOT_CITABLE = { OVERDUE: 'OVERDUE', CONFLICT_RESOLVED: 'CONFLICT_RESOLVED', TOO_LATE: 'TOO_LATE' }

const actorOf = ({ id: userId, clubId, activeRoleId }) => ({ clubId, userId, roleId: activeRoleId })

const fullNameOf = (user) => `${user.name} ${user.lastName}`

const unique = (values) => [...new Set(values)]

// "sábado 7/11 a las 18:30"
function whenText(dateTime) {
    const { weekday, dayMonth, time } = dateTimeParts(dateTime)
    return `${weekday} ${dayMonth} a las ${time}`
}

// Categoría y liga del partido, solo las activas
const includeGameCategory = {
    model: Category,
    as: 'category',
    attributes: ['id', 'name', 'leagueId'],
    where: { isActive: true },
    include: [{ model: League, as: 'league', attributes: ['id', 'name'], where: { isActive: true } }]
}

// Si todavía se puede citar para el partido: Programado y con al menos 48 horas por delante
const isTooLate = (game) => new Date(game.dateTime).getTime() - Date.now() < CITATION_MIN_HOURS_BEFORE_GAME * HOUR_MS
const canCiteFor = (game) => game.gameState === GAME_STATES.SCHEDULED && !isTooLate(game)

function formatCitation(citation) {
    return {
        id: citation.id,
        gameId: citation.gameId,
        memberId: citation.memberId,
        citationState: citation.citationState,
        dateMaxResponse: citation.dateMaxResponse,
        dateResponse: citation.dateResponse,
        justification: citation.justification,
        createdAt: citation.createdAt
    }
}

// Mora para citar: socio Suspendido o cuota impaga más vieja con más días de atraso que el plazo del club.
// player: { memberId, memberStateId }
async function hasOverdue(player, delayFee, transaction) {
    if (player.memberStateId === MEMBER_STATES.SUSPENDED) return true
    return (await getOverdueDays(player.memberId, { transaction })) > delayFee
}

async function getDelayFee(clubId, transaction) {
    const club = await Club.findByPk(clubId, { attributes: ['delayFee'], transaction })
    return club.delayFee
}

// ---------- Entrenadora (citations.create) ----------

async function staffOf(user, transaction) {
    return Staff.findOne({ where: { userId: user.id, clubId: user.clubId }, attributes: ['id'], transaction })
}

// Un partido de una categoría de la entrenadora logueada. Si no es suyo (o no existe), 404
async function findCoachGame(user, gameId, { transaction, lock } = {}) {
    const staff = await staffOf(user, transaction)
    const game = staff && await Game.findOne({ where: { id: gameId, clubId: user.clubId }, include: [includeGameCategory], transaction, lock })

    if (!game || !await isStaffAssignedToCategory(user.clubId, staff.id, game.categoryId, { transaction })) {
        throw createError(m.gameNotFound, 404)
    }

    return { staff, game }
}

// Cantidad de citaciones por estado de cada partido: Map gameId → { cited, confirmed, pending, rejected, cancelled }.
// "cited" son las no canceladas
async function summariesOf(gameIds) {
    const rows = gameIds.length === 0 ? [] : await Citation.findAll({
        where: { gameId: gameIds },
        attributes: ['gameId', 'citationState', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
        group: ['gameId', 'citationState'],
        raw: true
    })

    const summaries = new Map(gameIds.map(id => [id, { cited: 0, confirmed: 0, pending: 0, rejected: 0, cancelled: 0 }]))
    const keyOf = {
        [CITATION_STATES.CONFIRMED]: 'confirmed',
        [CITATION_STATES.AUTO_CONFIRMED]: 'confirmed',
        [CITATION_STATES.PENDING]: 'pending',
        [CITATION_STATES.REJECTED]: 'rejected',
        [CITATION_STATES.CANCELLED]: 'cancelled'
    }

    for (const row of rows) {
        const summary = summaries.get(row.gameId)
        const total = Number(row.total)
        summary[keyOf[row.citationState]] += total
        if (row.citationState !== CITATION_STATES.CANCELLED) summary.cited += total
    }

    return summaries
}

// Próximos partidos Programados de las categorías de la entrenadora (desde ahora, o desde la fecha from), con si todavía
// se puede citar y el resumen de sus citaciones
async function listCoachGames(user, { from } = {}) {
    const staff = await staffOf(user)
    const categories = staff ? await getCategoriesOfStaff(user.clubId, staff.id) : []
    if (categories.length === 0) return { items: [] }

    const start = from ? new Date(`${from}T00:00:00.000-03:00`) : new Date()
    const games = await Game.findAll({
        where: {
            clubId: user.clubId,
            categoryId: categories.map(category => category.id),
            gameState: GAME_STATES.SCHEDULED,
            dateTime: { [Op.gte]: new Date(Math.max(start.getTime(), Date.now())) }
        },
        include: [includeGameCategory],
        order: [['dateTime', 'ASC'], ['id', 'ASC']]
    })

    const summaries = await summariesOf(games.map(game => game.id))

    return {
        items: games.map(game => ({ ...formatGame(game), canCite: canCiteFor(game), summary: summaries.get(game.id) }))
    }
}

// El partido y la lista de su categoría: cada jugadora activa con su citación (la última) o, si no tiene una vigente,
// si se la puede citar y por qué no. reason: OVERDUE, CONFLICT_RESOLVED (con chosenGame) o TOO_LATE
async function getGameRoster(user, gameId) {
    const { game } = await findCoachGame(user, gameId)
    const canCite = canCiteFor(game)

    const [players, citations, delayFee] = await Promise.all([
        getActivePlayersOfCategory(user.clubId, game.categoryId),
        Citation.findAll({ where: { gameId: game.id }, order: [['id', 'DESC']] }),
        getDelayFee(user.clubId)
    ])

    // La citación vigente (no cancelada) de cada jugadora o, si no tiene, la última cancelada
    const citationOf = new Map()
    for (const citation of citations) {
        const current = citationOf.get(citation.memberId)
        if (!current || (current.citationState === CITATION_STATES.CANCELLED && citation.citationState !== CITATION_STATES.CANCELLED)) {
            citationOf.set(citation.memberId, citation)
        }
    }

    const items = await Promise.all(players.map(async (player) => {
        const citation = citationOf.get(player.memberId) ?? null
        const base = { memberId: player.memberId, name: player.name, numMember: player.numMember, memberStateId: player.memberStateId, citation: citation && formatCitation(citation) }

        // Con una citación vigente (Pendiente, Confirmada o Rechazada) no se la vuelve a citar
        if (citation && citation.citationState !== CITATION_STATES.CANCELLED) return { ...base, citable: false, reason: null }

        if (await hasOverdue(player, delayFee)) return { ...base, citable: false, reason: NOT_CITABLE.OVERDUE }

        const chosenGame = (await getNotPlayingGames(user.clubId, player.memberId)).get(game.id)
        if (chosenGame) return { ...base, citable: false, reason: NOT_CITABLE.CONFLICT_RESOLVED, chosenGame }

        if (!canCite) return { ...base, citable: false, reason: NOT_CITABLE.TOO_LATE }
        return { ...base, citable: true, reason: null }
    }))

    return { game: { ...formatGame(game), canCite }, players: items }
}

// Motivo por el que una jugadora no se puede citar, o null si se puede (reglas 1.3 a 1.5)
async function citationProblem(player, { game, delayFee, existing, transaction }) {
    if (!player.inCategory) return m.notInCategory(player.name)

    if (existing?.citationState === CITATION_STATES.REJECTED) return m.alreadyRejected(player.name)
    if (existing) return m.alreadyCited(player.name)

    if (await hasOverdue(player, delayFee, transaction)) return m.overdue(player.name)

    const chosenGame = (await getNotPlayingGames(game.clubId, player.memberId, { transaction })).get(game.id)
    if (chosenGame) return m.conflictResolved(player.name, chosenGame.categoryName, chosenGame.rival)

    return null
}

// Cita a una o varias jugadoras: o todas o ninguna. Si alguna no cumple, 400 con el nombre y el motivo de cada una.
// Plazo para responder: 24 horas desde ahora. Avisa CITATION_NEW (in-app y email) a las citadas y a sus familias
async function createCitations(actor, gameId, { memberIds }) {
    const ids = unique(memberIds)

    const { game, created, deadline } = await sequelize.transaction(async (transaction) => {
        const { staff, game } = await findCoachGame(actor, gameId, { transaction, lock: transaction.LOCK.UPDATE })
        if (game.gameState !== GAME_STATES.SCHEDULED) throw createError(m.notScheduled, 400)
        if (isTooLate(game)) throw createError(m.tooLate, 400)

        const [players, members, citations, delayFee] = await Promise.all([
            getActivePlayersOfCategory(actor.clubId, game.categoryId, { transaction }),
            Member.findAll({ where: { id: ids, clubId: actor.clubId }, include: [{ model: User, as: 'user', attributes: ['id', 'name', 'lastName'] }], transaction }),
            Citation.findAll({ where: { gameId: game.id, memberId: ids, citationState: { [Op.ne]: CITATION_STATES.CANCELLED } }, transaction }),
            getDelayFee(actor.clubId, transaction)
        ])

        if (members.length !== ids.length) throw createError(m.membersNotFound, 400)

        const inCategory = new Set(players.map(player => player.memberId))
        const existingOf = new Map(citations.map(citation => [citation.memberId, citation]))
        const candidates = members.map(member => ({
            memberId: member.id,
            userId: member.user.id,
            name: fullNameOf(member.user),
            memberStateId: member.memberStateId,
            inCategory: inCategory.has(member.id)
        }))

        const problems = []
        for (const player of candidates) {
            const message = await citationProblem(player, { game, delayFee, existing: existingOf.get(player.memberId), transaction })
            if (message) problems.push({ memberId: player.memberId, name: player.name, message })
        }
        if (problems.length > 0) throw createError(problems.map(problem => problem.message).join(' '), 400, 'PLAYERS_NOT_CITABLE', { problems })

        const deadline = new Date(Date.now() + CITATION_RESPONSE_HOURS * HOUR_MS)
        for (const player of candidates) {
            await Citation.create({
                clubId: actor.clubId,
                gameId: game.id,
                memberId: player.memberId,
                staffId: staff.id,
                dateMaxResponse: deadline,
                citationState: CITATION_STATES.PENDING
            }, { transaction })
        }

        await notify({
            clubId: actor.clubId,
            type: 'CITATION_NEW',
            recipientUserIds: candidates.map(player => player.userId),
            title: `Te citaron para ${game.category.name} vs. ${game.rival}`,
            message: `Te citaron para ${game.category.name} vs. ${game.rival}, ${whenText(game.dateTime)}. `
                + `Tenés tiempo de responder hasta el ${whenText(deadline)}.`,
            includeFamily: true
        }, { transaction })

        return { game, created: candidates, deadline }
    })

    await logger(actorOf(actor), LOG_ACTIONS.CITATION_CREATED,
        `${game.category.name} vs. ${game.rival} (id ${game.id}): ${created.length} citadas (${created.map(player => player.name).join(', ')}). Responden hasta el ${whenText(deadline)}`)

    return getGameRoster(actor, game.id)
}

// La entrenadora cancela una citación de sus categorías antes del partido (regla 1.10). Aviso solo in-app
async function cancelCitation(actor, citationId) {
    const { citation, game, member } = await sequelize.transaction(async (transaction) => {
        const citation = await Citation.findOne({ where: { id: citationId, clubId: actor.clubId }, transaction, lock: transaction.LOCK.UPDATE })
        if (!citation) throw createError(m.citationNotFound, 404)

        const { game } = await findCoachGame(actor, citation.gameId, { transaction }).catch(() => {
            throw createError(m.citationNotFound, 404)
        })

        const startsLater = new Date(game.dateTime) > new Date()
        if (!CANCELLABLE_STATES.includes(citation.citationState) || game.gameState !== GAME_STATES.SCHEDULED || !startsLater) {
            throw createError(m.cannotCancel, 409)
        }

        await citation.update({ citationState: CITATION_STATES.CANCELLED }, { transaction })

        const member = await Member.findByPk(citation.memberId, { include: [{ model: User, as: 'user', attributes: ['id', 'name', 'lastName'] }], transaction })
        const { weekday, dayMonth } = dateTimeParts(game.dateTime)
        await notify({
            clubId: actor.clubId,
            type: 'CITATION_CANCELLED',
            recipientUserIds: [member.user.id],
            title: `Se canceló tu citación para ${game.category.name}`,
            message: `Se canceló tu citación para ${game.category.name} vs. ${game.rival} del ${weekday} ${dayMonth}.`,
            includeFamily: true
        }, { transaction })

        return { citation, game, member }
    })

    await logger(actorOf(actor), LOG_ACTIONS.CITATION_CANCELLED,
        `${fullNameOf(member.user)} en ${game.category.name} vs. ${game.rival} (partido ${game.id}, citación ${citation.id})`)

    return { citation: formatCitation(citation) }
}

// Al resolver un conflicto de horario (games.service, resolveConflict): las citaciones no canceladas de la jugadora en
// el partido no elegido pasan a Cancelada. No avisa: el aviso es el de CONFLICT_RESOLVED. Devuelve cuántas canceló
async function cancelCitationsForResolvedConflict(clubId, memberId, notChosenGameId, { transaction } = {}) {
    const citations = await Citation.findAll({
        where: { clubId, memberId, gameId: notChosenGameId, citationState: { [Op.ne]: CITATION_STATES.CANCELLED } },
        transaction
    })

    for (const citation of citations) await citation.update({ citationState: CITATION_STATES.CANCELLED }, { transaction })
    return citations.length
}

// ---------- Jugadora y Familia ----------

// Citaciones de una socia, con el partido, la categoría y la liga. scope: 'upcoming' (partidos desde ahora, las
// Pendientes primero) o 'history' (partidos que ya pasaron, del más nuevo al más viejo). Cada una lleva canRespond y,
// si el partido no lo juega por un conflicto resuelto, conflict: { notPlaying, chosenGame }
async function citationsOf(clubId, memberId, scope) {
    const upcoming = scope !== 'history'

    const [citations, notPlaying] = await Promise.all([
        Citation.findAll({
            where: { clubId, memberId },
            include: [{
                model: Game,
                as: 'game',
                where: { dateTime: upcoming ? { [Op.gte]: new Date() } : { [Op.lt]: new Date() } },
                include: [includeGameCategory]
            }]
        }),
        getNotPlayingGames(clubId, memberId)
    ])

    const now = new Date()
    const items = citations.map(citation => ({
        ...formatCitation(citation),
        game: formatGame(citation.game),
        canRespond: citation.citationState === CITATION_STATES.PENDING && new Date(citation.dateMaxResponse) > now,
        conflict: conflictMarkOf(notPlaying, citation.gameId)
    }))

    const byDate = (a, b) => new Date(a.game.dateTime) - new Date(b.game.dateTime)
    return upcoming
        ? items.sort((a, b) => Number(b.canRespond) - Number(a.canRespond) || byDate(a, b))
        : items.sort((a, b) => byDate(b, a))
}

async function listMine(user, { scope = 'upcoming' } = {}) {
    const member = await Member.findOne({ where: { userId: user.id, clubId: user.clubId }, attributes: ['id'] })
    if (!member) throw createError(m.notMember, 404)

    return { items: await citationsOf(user.clubId, member.id, scope) }
}

// La jugadora responde su citación (regla 1.8): solo una Pendiente y antes del plazo. Rechazar exige la justificación
// (el validator controla que venga y su largo). La respuesta no se cambia
async function respond(user, citationId, { response, justification }) {
    const member = await Member.findOne({ where: { userId: user.id, clubId: user.clubId }, attributes: ['id'] })
    if (!member) throw createError(m.citationNotFound, 404)

    const confirmed = response === 'confirm'

    const { citation, game } = await sequelize.transaction(async (transaction) => {
        const citation = await Citation.findOne({ where: { id: citationId, clubId: user.clubId, memberId: member.id }, transaction, lock: transaction.LOCK.UPDATE })
        if (!citation) throw createError(m.citationNotFound, 404)
        if (citation.citationState !== CITATION_STATES.PENDING) throw createError(m.alreadyAnswered, 409)
        if (new Date(citation.dateMaxResponse) <= new Date()) throw createError(m.responseExpired, 400)

        await citation.update({
            citationState: confirmed ? CITATION_STATES.CONFIRMED : CITATION_STATES.REJECTED,
            justification: confirmed ? null : justification,
            dateResponse: new Date()
        }, { transaction })

        const game = await Game.findByPk(citation.gameId, { include: [{ model: Category, as: 'category', attributes: ['name'] }], transaction })
        return { citation, game }
    })

    await logger(actorOf(user), confirmed ? LOG_ACTIONS.CITATION_CONFIRMED : LOG_ACTIONS.CITATION_REJECTED,
        `${game.category.name} vs. ${game.rival} (partido ${game.id}, citación ${citation.id})${confirmed ? '' : `. Justificación: ${justification}`}`)

    return { citation: formatCitation(citation) }
}

// Las citaciones de cada jugadora vinculada al adulto logueado (o solo una, con memberId), agrupadas por jugadora
async function listLinked(user, { memberId, scope = 'upcoming' } = {}) {
    const members = await Member.findAll({
        where: { clubId: user.clubId, adultUserId: user.id, linkStatus: true, ...(memberId && { id: Number(memberId) }) },
        include: [{ model: User, as: 'user', attributes: ['name', 'lastName'] }],
        order: [[{ model: User, as: 'user' }, 'name', 'ASC']]
    })

    if (memberId && members.length === 0) throw createError(m.linkedMemberNotFound, 404)

    return {
        players: await Promise.all(members.map(async (member) => ({
            member: { id: member.id, name: fullNameOf(member.user), memberStateId: member.memberStateId },
            items: await citationsOf(user.clubId, member.id, scope)
        })))
    }
}

// ---------- Job ----------

// Confirmación automática (job autoConfirmCitations): las Pendientes con el plazo vencido pasan a Confirmada
// automáticamente. Se registra cada una en la bitácora, sin usuario ni rol. Devuelve cuántas confirmó
async function autoConfirmExpired() {
    const expired = await Citation.findAll({
        where: { citationState: CITATION_STATES.PENDING, dateMaxResponse: { [Op.lte]: new Date() } },
        include: [
            { model: Game, as: 'game', attributes: ['id', 'rival'], include: [{ model: Category, as: 'category', attributes: ['name'] }] },
            { model: Member, as: 'member', attributes: ['id'], include: [{ model: User, as: 'user', attributes: ['name', 'lastName'] }] }
        ]
    })

    for (const citation of expired) {
        await citation.update({ citationState: CITATION_STATES.AUTO_CONFIRMED })
        await logger({ clubId: citation.clubId, userId: null, roleId: null }, LOG_ACTIONS.CITATION_AUTO_CONFIRMED,
            `${fullNameOf(citation.member.user)} en ${citation.game.category.name} vs. ${citation.game.rival} (partido ${citation.game.id}, citación ${citation.id}): sin respuesta dentro del plazo`)
    }

    return expired.length
}

module.exports = {
    listCoachGames,
    getGameRoster,
    createCitations,
    cancelCitation,
    cancelCitationsForResolvedConflict,
    listMine,
    respond,
    listLinked,
    autoConfirmExpired
}

// Service de games: partidos (fixture), detección de superposiciones de horario y su resolución.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
//
// Las superposiciones NO se guardan (contexto, sección 6): se calculan cada vez con findConflictsForGame y listConflicts.
// La resolución de un conflicto se registra solo en la bitácora (CONFLICT_RESOLVED) y se consulta con
// getConflictResolutions.
const { Op } = require('sequelize')

const sequelize = require('../../config/db')
const { Game, Category, League, Club, Citation, Member, Staff, User, Log } = require('../../models')
const {
    getLeagueScope,
    leagueWhere,
    getActivePlayersOfCategory,
    getCategoriesOfMember,
    getCategoriesOfStaff,
    getActiveStaffOfCategory
} = require('../leagues/leagues.service')
const { notify } = require('../notifications/notifications.service')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { today, dateTimeParts } = require('../../utils/dates')
const { GAME_STATES, CITATION_STATES, MEMBER_STATES, BASE_ROLES, GAME_DURATION_MINUTES, LOG_ACTIONS } = require('../../utils/constants')
const { games: m } = require('../../utils/messages')

const GAMES_PAGE_SIZE = 20
const MINUTE_MS = 60 * 1000

// Argentina no tiene horario de verano: el día empieza a las 00:00 -03:00
const AR_OFFSET = '-03:00'
const startOfDay = (date) => new Date(`${date}T00:00:00.000${AR_OFFSET}`)
const endOfDay = (date) => new Date(`${date}T23:59:59.999${AR_OFFSET}`)

const actorOf = ({ id: userId, clubId, activeRoleId }) => ({ clubId, userId, roleId: activeRoleId })

const unique = (values) => [...new Set(values)]

// ---------- Formatos y textos ----------

// Categoría y liga del partido (solo las activas: un partido de una categoría dada de baja no se lista)
const includeActiveCategory = (scope) => ({
    model: Category,
    as: 'category',
    attributes: ['id', 'name', 'isActive', 'leagueId', 'ageGroup'],
    where: { isActive: true },
    include: [{ model: League, as: 'league', attributes: ['id', 'name', 'clubSportId', 'isActive'], where: { isActive: true, ...(scope && leagueWhere(scope)) } }]
})

function formatGame(game) {
    return {
        id: game.id,
        categoryId: game.categoryId,
        category: game.category ? { id: game.category.id, name: game.category.name } : null,
        league: game.category?.league ? { id: game.category.league.id, name: game.category.league.name } : null,
        rival: game.rival,
        dateTime: game.dateTime,
        address: game.address,
        isHome: game.isHome,
        season: game.season,
        gameState: game.gameState
    }
}

const homeText = (isHome) => (isHome ? 'Local' : 'Visitante')

// "sábado 7/11 a las 18:30"
function whenText(dateTime) {
    const { weekday, dayMonth, time } = dateTimeParts(dateTime)
    return `${weekday} ${dayMonth} a las ${time}`
}

// "sáb. 10:00"
function shortWhen(dateTime) {
    const { weekdayShort, time } = dateTimeParts(dateTime)
    return `${weekdayShort} ${time}`
}

// Temporada: el año de la fecha del partido, en Argentina
const seasonOf = (dateTime) => String(dateTimeParts(dateTime).year)

// ---------- Superposiciones ----------

// Clave de un conflicto: "{memberId}:{idMenor}-{idMayor}". No cambia si se mueve la fecha de uno de los partidos
const conflictKeyOf = (memberId, gameIdA, gameIdB) => (gameIdA && gameIdB
    ? `${memberId}:${Math.min(gameIdA, gameIdB)}-${Math.max(gameIdA, gameIdB)}`
    : null)

// Dos partidos de una misma jugadora chocan si entre el fin del primero (inicio + GAME_DURATION_MINUTES) y el inicio
// del segundo hay menos minutos que el margen del club. Devuelve los partidos en orden y esos minutos (negativos si se
// pisan), o null si no chocan
function overlapBetween(gameA, gameB, margin) {
    const [first, second] = new Date(gameA.dateTime) <= new Date(gameB.dateTime) ? [gameA, gameB] : [gameB, gameA]
    const gapMinutes = Math.round((new Date(second.dateTime) - new Date(first.dateTime)) / MINUTE_MS) - GAME_DURATION_MINUTES
    return gapMinutes < margin ? { games: [first, second], gapMinutes } : null
}

async function getConflictMargin(clubId, transaction) {
    const club = await Club.findByPk(clubId, { attributes: ['conflictMargin'], transaction })
    return club.conflictMargin
}

// Resoluciones registradas en la bitácora para esas claves: Map conflictKey → { chosenGameId, note, resolvedBy, resolvedAt }.
// La usa también el P12, para avisar al citar a una jugadora en el partido que no se eligió
async function getConflictResolutions(clubId, conflictKeys, { transaction } = {}) {
    const keys = new Set(conflictKeys.filter(Boolean))
    const resolutions = new Map()
    if (keys.size === 0) return resolutions

    const logs = await Log.findAll({
        where: { clubId, action: LOG_ACTIONS.CONFLICT_RESOLVED.message },
        include: [{ model: User, as: 'user', attributes: ['name', 'lastName'] }],
        order: [['id', 'ASC']],
        transaction
    })

    for (const log of logs) {
        let details
        try {
            details = JSON.parse(log.details)
        } catch {
            continue
        }

        if (keys.has(details.conflictKey) && !resolutions.has(details.conflictKey)) {
            resolutions.set(details.conflictKey, {
                chosenGameId: details.chosenGameId,
                note: details.note ?? null,
                resolvedBy: log.user ? `${log.user.name} ${log.user.lastName}` : null,
                resolvedAt: log.createdAt
            })
        }
    }

    return resolutions
}

// Resoluciones de una jugadora, de la bitácora (CONFLICT_RESOLVED): [{ gameIds, chosenGameId, note, resolvedBy, resolvedAt }].
// Si un mismo conflicto se registró dos veces, vale la primera
async function getResolutionsForMember(clubId, memberId, { transaction } = {}) {
    const logs = await Log.findAll({
        where: { clubId, action: LOG_ACTIONS.CONFLICT_RESOLVED.message },
        include: [{ model: User, as: 'user', attributes: ['name', 'lastName'] }],
        order: [['id', 'ASC']],
        transaction
    })

    const seen = new Set()
    const resolutions = []

    for (const log of logs) {
        let details
        try {
            details = JSON.parse(log.details)
        } catch {
            continue
        }

        if (details.memberId !== memberId || seen.has(details.conflictKey)) continue
        seen.add(details.conflictKey)

        resolutions.push({
            gameIds: details.gameIds,
            chosenGameId: details.chosenGameId,
            note: details.note ?? null,
            resolvedBy: log.user ? `${log.user.name} ${log.user.lastName}` : null,
            resolvedAt: log.createdAt
        })
    }

    return resolutions
}

// Partidos que una jugadora NO juega por un conflicto resuelto: Map gameId (el no elegido) → el partido elegido
// { id, categoryName, rival, dateTime }. Una resolución vale mientras el conflicto exista: ninguno de los dos partidos
// está Cancelado y siguen superponiéndose con el margen actual del club. Si dejan de chocar, la jugadora puede jugar
// (y ser citada en) los dos
async function getNotPlayingGames(clubId, memberId, { transaction } = {}) {
    const notPlaying = new Map()
    const resolutions = await getResolutionsForMember(clubId, memberId, { transaction })
    if (resolutions.length === 0) return notPlaying

    const games = await Game.findAll({
        where: { id: unique(resolutions.flatMap(resolution => resolution.gameIds)), clubId, gameState: { [Op.ne]: GAME_STATES.CANCELLED } },
        include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
        transaction
    })
    const byId = new Map(games.map(game => [game.id, game]))
    const margin = await getConflictMargin(clubId, transaction)

    for (const { gameIds, chosenGameId } of resolutions) {
        const chosen = byId.get(chosenGameId)
        const other = byId.get(gameIds.find(id => id !== chosenGameId))
        if (!chosen || !other || !overlapBetween(chosen, other, margin)) continue

        notPlaying.set(other.id, { id: chosen.id, categoryName: chosen.category.name, rival: chosen.rival, dateTime: chosen.dateTime })
    }

    return notPlaying
}

// Marca de "no lo jugás" para las respuestas de la jugadora y la familia: { notPlaying: true, chosenGame } o null
const conflictMarkOf = (notPlaying, gameId) => (notPlaying.has(gameId) ? { notPlaying: true, chosenGame: notPlaying.get(gameId) } : null)

// Arma la respuesta de cada conflicto, con si está resuelto
async function withResolutions(clubId, conflicts, transaction) {
    const resolutions = await getConflictResolutions(clubId, conflicts.map(conflict => conflict.conflictKey), { transaction })

    return conflicts.map(conflict => {
        const resolution = resolutions.get(conflict.conflictKey) ?? null
        return { ...conflict, resolved: Boolean(resolution), resolution }
    })
}

const conflictOf = (player, overlap) => ({
    member: { id: player.memberId, name: player.name },
    games: overlap.games.map(formatGame),
    gapMinutes: overlap.gapMinutes,
    conflictKey: conflictKeyOf(player.memberId, overlap.games[0].id, overlap.games[1].id)
})

// Conflictos que genera (o generaría) un partido: game es un id o los datos { id?, categoryId, dateTime }.
// excludeGameId: un partido que no se compara (el mismo que se está editando, si todavía no se guardó).
// Solo cuentan los partidos Programados de las categorías activas en las que está cada jugadora.
async function findConflictsForGame(clubId, game, { excludeGameId, transaction } = {}) {
    let target = game

    if (typeof game === 'number') {
        target = await Game.findOne({ where: { id: game, clubId }, transaction })
        if (!target || target.gameState !== GAME_STATES.SCHEDULED) return []
    }

    const category = await Category.findOne({ where: { id: target.categoryId, clubId }, include: [{ model: League, as: 'league', attributes: ['id', 'name'] }], transaction })
    if (!category) return []

    const players = await getActivePlayersOfCategory(clubId, target.categoryId, { transaction })
    if (players.length === 0) return []

    const margin = await getConflictMargin(clubId, transaction)
    const windowMs = (GAME_DURATION_MINUTES + margin) * MINUTE_MS
    const start = new Date(target.dateTime)

    const categoriesByPlayer = await Promise.all(players.map(player => getCategoriesOfMember(clubId, player.memberId, { transaction })))
    const categoryIds = unique(categoriesByPlayer.flat().map(item => item.id))

    const excluded = [target.id, excludeGameId].filter(Boolean)
    const candidates = await Game.findAll({
        where: {
            clubId,
            categoryId: categoryIds,
            gameState: GAME_STATES.SCHEDULED,
            dateTime: { [Op.gt]: new Date(start.getTime() - windowMs), [Op.lt]: new Date(start.getTime() + windowMs) },
            ...(excluded.length > 0 && { id: { [Op.notIn]: excluded } })
        },
        include: [includeActiveCategory()],
        transaction
    })

    const targetGame = { ...(target.get ? target.get() : target), id: target.id ?? null, category, isHome: target.isHome ?? true }
    const conflicts = []

    players.forEach((player, index) => {
        const ids = new Set(categoriesByPlayer[index].map(item => item.id))
        for (const other of candidates.filter(candidate => ids.has(candidate.categoryId))) {
            const overlap = overlapBetween(targetGame, other, margin)
            if (overlap) conflicts.push(conflictOf(player, overlap))
        }
    })

    return withResolutions(clubId, conflicts, transaction)
}

// Todos los conflictos actuales de partidos futuros Programados, dentro de un alcance: las categorías de un staff
// (categoryIds) o un deporte (clubSportId). Un conflicto entra si alguno de sus dos partidos está en el alcance.
// Devuelve { conflictMargin, conflicts }
async function listConflicts({ clubId, categoryIds = null, clubSportId = null }, { transaction } = {}) {
    const margin = await getConflictMargin(clubId, transaction)
    const games = await Game.findAll({
        where: { clubId, gameState: GAME_STATES.SCHEDULED, dateTime: { [Op.gte]: new Date() } },
        include: [includeActiveCategory()],
        order: [['dateTime', 'ASC'], ['id', 'ASC']],
        transaction
    })

    // Partidos de cada jugadora, según las categorías en las que está
    const gamesByCategory = new Map()
    games.forEach(game => gamesByCategory.set(game.categoryId, [...(gamesByCategory.get(game.categoryId) ?? []), game]))

    const playersByMember = new Map()
    const gamesByMember = new Map()
    for (const [categoryId, categoryGames] of gamesByCategory) {
        for (const player of await getActivePlayersOfCategory(clubId, categoryId, { transaction })) {
            playersByMember.set(player.memberId, player)
            gamesByMember.set(player.memberId, [...(gamesByMember.get(player.memberId) ?? []), ...categoryGames])
        }
    }

    const inScope = (game) => (!categoryIds || categoryIds.includes(game.categoryId))
        && (!clubSportId || game.category.league.clubSportId === clubSportId)

    const conflicts = []
    for (const [memberId, memberGames] of gamesByMember) {
        const sorted = memberGames.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime) || a.id - b.id)

        for (let i = 0; i < sorted.length; i++) {
            for (let j = i + 1; j < sorted.length; j++) {
                const overlap = overlapBetween(sorted[i], sorted[j], margin)
                if (!overlap) break   // Ordenados por fecha: los siguientes empiezan todavía más tarde
                if (inScope(sorted[i]) || inScope(sorted[j])) conflicts.push(conflictOf(playersByMember.get(memberId), overlap))
            }
        }
    }

    return { conflictMargin: margin, conflicts: await withResolutions(clubId, conflicts, transaction) }
}

// ---------- Notificaciones ----------

// Fixture publicado o modificado: a las jugadoras activas de la categoría y a sus adultos, si son menores
async function notifyFixture(clubId, game, categoryName, { changed = false, transaction }) {
    const players = await getActivePlayersOfCategory(clubId, game.categoryId, { transaction })
    if (players.length === 0) return

    const label = `${categoryName} vs. ${game.rival}`
    const message = changed
        ? `Cambió el partido de ${label}: ahora es el ${whenText(game.dateTime)} (${homeText(game.isHome)}), en ${game.address}.`
        : `Nuevo partido: ${label}, ${whenText(game.dateTime)} (${homeText(game.isHome)}). Dirección: ${game.address}.`

    await notify({
        clubId,
        type: 'FIXTURE_PUBLISHED',
        recipientUserIds: players.map(player => player.userId),
        title: changed ? `Cambió un partido de ${categoryName}` : `Nuevo partido de ${categoryName}`,
        message,
        includeFamily: true
    }, { transaction })
}

// Conflicto nuevo: a las entrenadoras de las dos categorías
async function notifyConflicts(clubId, conflicts, transaction) {
    for (const conflict of conflicts) {
        const [first, second] = conflict.games
        const staff = [
            ...await getActiveStaffOfCategory(clubId, first.categoryId, { transaction }),
            ...await getActiveStaffOfCategory(clubId, second.categoryId, { transaction })
        ]
        const coaches = unique(staff.filter(item => item.roles.includes(BASE_ROLES.COACH)).map(item => item.userId))
        if (coaches.length === 0) continue

        await notify({
            clubId,
            type: 'SCHEDULE_CONFLICT',
            recipientUserIds: coaches,
            title: `Partidos superpuestos: ${conflict.member.name}`,
            message: `${conflict.member.name} tiene dos partidos superpuestos: ${first.category.name} (${shortWhen(first.dateTime)}) y ${second.category.name} (${shortWhen(second.dateTime)}).`
        }, { transaction })
    }
}

// ---------- Partidos (games.manage) ----------

async function findScopedGame(scope, gameId, options = {}) {
    const game = await Game.findOne({
        where: { id: gameId, clubId: scope.clubId },
        include: [{
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'isActive', 'leagueId'],
            include: [{ model: League, as: 'league', attributes: ['id', 'name', 'clubSportId', 'isActive'], where: leagueWhere(scope) }]
        }],
        ...options
    })

    if (!game) throw createError(m.gameNotFound, 404)
    return game
}

// La categoría tiene que estar en el alcance y activa (también su liga)
async function findScopedActiveCategory(scope, categoryId) {
    const category = await Category.findOne({
        where: { id: categoryId, clubId: scope.clubId },
        include: [{ model: League, as: 'league', attributes: ['id', 'name', 'clubSportId', 'isActive'], where: leagueWhere(scope) }]
    })

    if (!category) throw createError(m.categoryNotFound, 404)
    if (!category.isActive || !category.league.isActive) throw createError(m.categoryInactive, 409)
    return category
}

const assertFuture = (dateTime) => {
    if (new Date(dateTime) <= new Date()) throw createError(m.mustBeFuture, 400)
}

// Categorías activas del alcance (para el formulario y los filtros) y las canchas del club (para los partidos de local)
async function getOptions(user) {
    const scope = await getLeagueScope(user)
    const [categories, club] = await Promise.all([
        Category.findAll({
            where: { clubId: scope.clubId, isActive: true },
            attributes: ['id', 'name'],
            include: [{ model: League, as: 'league', attributes: ['id', 'name'], where: { isActive: true, ...leagueWhere(scope) } }],
            order: [[{ model: League, as: 'league' }, 'name', 'ASC'], ['name', 'ASC']]
        }),
        Club.findByPk(scope.clubId, { attributes: ['extraInfo', 'conflictMargin'] })
    ])

    return {
        categories: categories.map(category => ({ id: category.id, name: category.name, league: { id: category.league.id, name: category.league.name } })),
        courts: (club.extraInfo?.courts ?? []).map(({ name, address }) => ({ name, address, label: `${name} · ${address}` })),
        conflictMargin: club.conflictMargin
    }
}

// Partidos del alcance ordenados por fecha, con cuántas jugadoras tienen conflicto y si tienen citaciones
async function listGames(user, { categoryId, state, from, to, page = 1 }) {
    page = Number(page) || 1   // Con Express 5 req.query es de solo lectura: el toInt del validator no llega hasta acá
    const scope = await getLeagueScope(user)

    const dateTime = {
        ...(from && { [Op.gte]: startOfDay(from) }),
        ...(to && { [Op.lte]: endOfDay(to) })
    }

    const { count, rows } = await Game.findAndCountAll({
        where: {
            clubId: scope.clubId,
            ...(categoryId && { categoryId: Number(categoryId) }),
            ...(state && { gameState: Number(state) }),
            ...((from || to) && { dateTime })
        },
        include: [includeActiveCategory(scope)],
        order: [['dateTime', 'ASC'], ['id', 'ASC']],
        limit: GAMES_PAGE_SIZE,
        offset: (page - 1) * GAMES_PAGE_SIZE
    })

    const ids = rows.map(game => game.id)
    const [{ conflicts }, citations] = await Promise.all([
        listConflicts({ clubId: scope.clubId, clubSportId: scope.clubSportId }),
        Citation.findAll({
            where: { gameId: ids, citationState: { [Op.ne]: CITATION_STATES.CANCELLED } },
            attributes: ['gameId', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
            group: ['gameId'],
            raw: true
        })
    ])

    // Jugadoras distintas con conflicto en cada partido
    const membersByGame = new Map()
    for (const conflict of conflicts) {
        for (const game of conflict.games) {
            membersByGame.set(game.id, new Set([...(membersByGame.get(game.id) ?? []), conflict.member.id]))
        }
    }

    const citationsByGame = new Map(citations.map(row => [row.gameId, Number(row.total)]))

    return {
        items: rows.map(game => ({
            ...formatGame(game),
            conflictCount: membersByGame.get(game.id)?.size ?? 0,
            citationCount: citationsByGame.get(game.id) ?? 0
        })),
        total: count,
        page,
        pageSize: GAMES_PAGE_SIZE,
        totalPages: Math.max(1, Math.ceil(count / GAMES_PAGE_SIZE))
    }
}

// Conflictos que generaría un partido, sin guardar nada. Con gameId (al editar), se calcula como ese mismo partido
async function checkConflicts(user, { categoryId, dateTime, gameId }) {
    const scope = await getLeagueScope(user)

    if (gameId) {
        const game = await findScopedGame(scope, gameId)
        return { conflicts: await findConflictsForGame(scope.clubId, { id: game.id, categoryId: game.categoryId, dateTime, isHome: game.isHome, rival: game.rival, address: game.address }) }
    }

    await findScopedActiveCategory(scope, categoryId)
    return { conflicts: await findConflictsForGame(scope.clubId, { id: null, categoryId, dateTime }) }
}

// Alta: categoría activa del alcance, fecha futura y la temporada sale del año. No se bloquea por conflictos: se
// avisan en la respuesta y se notifican a las entrenadoras
async function createGame(actor, { categoryId, rival, dateTime, isHome, address }) {
    const scope = await getLeagueScope(actor)
    const category = await findScopedActiveCategory(scope, categoryId)
    assertFuture(dateTime)

    const { game, conflicts } = await sequelize.transaction(async (transaction) => {
        const game = await Game.create({
            clubId: scope.clubId,
            categoryId: category.id,
            season: seasonOf(dateTime),
            rival,
            dateTime,
            isHome,
            address,
            gameState: GAME_STATES.SCHEDULED
        }, { transaction })

        const conflicts = await findConflictsForGame(scope.clubId, game.id, { transaction })
        await notifyFixture(scope.clubId, game, category.name, { transaction })
        await notifyConflicts(scope.clubId, conflicts, transaction)

        return { game, conflicts }
    })

    await logger(actorOf(actor), LOG_ACTIONS.GAME_CREATED,
        `${category.name} (${category.league.name}) vs. ${rival}, ${whenText(dateTime)} (${homeText(isHome)})${conflicts.length > 0 ? `. Con ${conflicts.length} conflictos de horario` : ''}`)

    game.category = category
    return { game: formatGame(game), conflicts }
}

// Campos que se pueden cambiar, con su nombre para la bitácora
const EDITABLE_FIELDS = { rival: 'rival', dateTime: 'fecha y hora', isHome: 'local o visitante', address: 'dirección' }

// Solo los Programados, y todo salvo la categoría. Si cambia la fecha, tiene que ser futura. Se notifican los
// conflictos nuevos (los que ya existían antes no se vuelven a avisar) y, si cambió cuándo o dónde, a las jugadoras
async function updateGame(actor, gameId, { rival, dateTime, isHome, address }) {
    const scope = await getLeagueScope(actor)
    const current = await findScopedGame(scope, gameId)
    if (current.gameState !== GAME_STATES.SCHEDULED) throw createError(m.notScheduled, 409)

    const dateChanged = new Date(dateTime).getTime() !== new Date(current.dateTime).getTime()
    if (dateChanged) assertFuture(dateTime)

    const wanted = { rival, dateTime: new Date(dateTime), isHome, address }
    const changed = Object.keys(wanted).filter(field => field === 'dateTime' ? dateChanged : current[field] !== wanted[field])
    const before = new Set((await findConflictsForGame(scope.clubId, current.id)).map(conflict => conflict.conflictKey))

    const { game, conflicts } = await sequelize.transaction(async (transaction) => {
        const game = await findScopedGame(scope, gameId, { transaction, lock: transaction.LOCK.UPDATE })
        if (game.gameState !== GAME_STATES.SCHEDULED) throw createError(m.notScheduled, 409)

        if (changed.length > 0) await game.update({ ...wanted, season: seasonOf(dateTime) }, { transaction })

        const conflicts = await findConflictsForGame(scope.clubId, game.id, { transaction })
        await notifyConflicts(scope.clubId, conflicts.filter(conflict => !before.has(conflict.conflictKey)), transaction)

        if (changed.some(field => ['dateTime', 'address', 'isHome'].includes(field))) {
            await notifyFixture(scope.clubId, game, game.category.name, { changed: true, transaction })
        }

        return { game, conflicts }
    })

    if (changed.length > 0) {
        await logger(actorOf(actor), LOG_ACTIONS.GAME_UPDATED,
            `${game.category.name} vs. ${game.rival} (id ${game.id}): ${changed.map(field => EDITABLE_FIELDS[field]).join(', ')}`)
    }

    return { game: formatGame(game), conflicts }
}

// Jugado: a mano, solo un Programado cuya fecha y hora ya pasaron
async function markPlayed(actor, gameId) {
    const scope = await getLeagueScope(actor)
    const game = await findScopedGame(scope, gameId)

    if (game.gameState !== GAME_STATES.SCHEDULED) throw createError(m.notScheduled, 409)
    if (new Date(game.dateTime) > new Date()) throw createError(m.notPlayedYet, 400)

    await game.update({ gameState: GAME_STATES.PLAYED })
    await logger(actorOf(actor), LOG_ACTIONS.GAME_PLAYED, `${game.category.name} vs. ${game.rival} (id ${game.id}), ${whenText(game.dateTime)}`)

    return { game: formatGame(game) }
}

// Cancelado: un Programado. Sus citaciones que no estaban canceladas pasan a Cancelada y se avisa a esas jugadoras
// (y a sus adultos, si son menores). No se vuelve a programar: si se reprograma, se crea otro partido
async function cancelGame(actor, gameId, { reason }) {
    const scope = await getLeagueScope(actor)

    const { game, cancelled } = await sequelize.transaction(async (transaction) => {
        const game = await findScopedGame(scope, gameId, { transaction, lock: transaction.LOCK.UPDATE })
        if (game.gameState !== GAME_STATES.SCHEDULED) throw createError(m.notScheduled, 409)

        await game.update({ gameState: GAME_STATES.CANCELLED }, { transaction })

        const citations = await Citation.findAll({
            where: { gameId: game.id, citationState: { [Op.ne]: CITATION_STATES.CANCELLED } },
            include: [{ model: Member, as: 'member', attributes: ['userId'] }],
            transaction
        })

        for (const citation of citations) await citation.update({ citationState: CITATION_STATES.CANCELLED }, { transaction })

        if (citations.length > 0) {
            const { dayMonth, weekday } = dateTimeParts(game.dateTime)
            await notify({
                clubId: scope.clubId,
                type: 'GAME_CANCELLED',
                recipientUserIds: citations.map(citation => citation.member.userId),
                title: `Se canceló el partido de ${game.category.name}`,
                message: `Se canceló el partido de ${game.category.name} vs. ${game.rival} del ${weekday} ${dayMonth}. Tu citación quedó cancelada.`,
                includeFamily: true
            }, { transaction })
        }

        return { game, cancelled: citations.length }
    })

    await logger(actorOf(actor), LOG_ACTIONS.GAME_CANCELLED,
        `${game.category.name} vs. ${game.rival} (id ${game.id}), ${whenText(game.dateTime)}. Motivo: ${reason || 'sin motivo'}. Citaciones canceladas: ${cancelled}`)

    return { game: formatGame(game), cancelledCitations: cancelled }
}

// ---------- Staff: partidos asignados y conflictos ----------

async function staffOf(user) {
    return Staff.findOne({ where: { userId: user.id, clubId: user.clubId }, attributes: ['id'] })
}

// Partidos de las categorías de un conjunto, en un rango (por defecto, desde hoy)
async function gamesOfCategories(clubId, categoryIds, { from, to }) {
    if (categoryIds.length === 0) return []

    const games = await Game.findAll({
        where: {
            clubId,
            categoryId: categoryIds,
            dateTime: { [Op.gte]: startOfDay(from || today()), ...(to && { [Op.lte]: endOfDay(to) }) }
        },
        include: [includeActiveCategory()],
        order: [['dateTime', 'ASC'], ['id', 'ASC']]
    })

    return games.map(formatGame)
}

// Partidos de las categorías del staff logueado
async function listAssigned(user, { from, to }) {
    const staff = await staffOf(user)
    if (!staff) return { items: [] }

    const categories = await getCategoriesOfStaff(user.clubId, staff.id)
    return { items: await gamesOfCategories(user.clubId, categories.map(category => category.id), { from, to }) }
}

// Conflictos actuales en las categorías de la entrenadora logueada, pendientes y resueltos
async function listMyConflicts(user) {
    const staff = await staffOf(user)
    const categories = staff ? await getCategoriesOfStaff(user.clubId, staff.id) : []

    if (categories.length === 0) {
        return { conflictMargin: await getConflictMargin(user.clubId), conflicts: [] }
    }

    return listConflicts({ clubId: user.clubId, categoryIds: categories.map(category => category.id) })
}

// La resuelve una entrenadora de alguna de las dos categorías, eligiendo en qué partido juega la jugadora. Se registra
// solo en la bitácora (CONFLICT_RESOLVED). El conflicto tiene que existir hoy; si ya estaba resuelto, 409
async function resolveConflict(actor, { memberId, gameIds, chosenGameId, note }) {
    const { clubId } = actor
    const ids = unique(gameIds)
    if (ids.length !== 2 || !ids.includes(chosenGameId)) throw createError(m.chosenGameInvalid, 400)

    const staff = await staffOf(actor)
    const staffCategoryIds = staff ? (await getCategoriesOfStaff(clubId, staff.id)).map(category => category.id) : []

    const games = await Game.findAll({ where: { id: ids, clubId, gameState: GAME_STATES.SCHEDULED }, include: [includeActiveCategory()] })
    if (games.length !== 2) throw createError(m.conflictNotFound, 404)
    if (!games.some(game => staffCategoryIds.includes(game.categoryId))) throw createError(m.conflictNotYours, 403)

    // La jugadora tiene que seguir activa y en las dos categorías, y los partidos tienen que seguir superponiéndose
    const member = await Member.findOne({ where: { id: memberId, clubId }, include: [{ model: User, as: 'user', attributes: ['name', 'lastName'] }] })
    const memberCategoryIds = member && member.memberStateId !== MEMBER_STATES.INACTIVE
        ? (await getCategoriesOfMember(clubId, member.id)).map(category => category.id)
        : []
    const overlap = games.every(game => memberCategoryIds.includes(game.categoryId))
        ? overlapBetween(games[0], games[1], await getConflictMargin(clubId))
        : null
    if (!overlap) throw createError(m.conflictNotFound, 404)

    const conflictKey = conflictKeyOf(member.id, ids[0], ids[1])
    const existing = await getConflictResolutions(clubId, [conflictKey])
    if (existing.has(conflictKey)) throw createError(m.conflictAlreadyResolved, 409)

    const details = { conflictKey, memberId: member.id, gameIds: [...ids].sort((a, b) => a - b), chosenGameId, note: note || null }
    const chosen = games.find(game => game.id === chosenGameId)
    const other = games.find(game => game.id !== chosenGameId)

    // Se requiere acá adentro: citations.service usa este service (dependencia circular)
    const { cancelCitationsForResolvedConflict } = require('../citations/citations.service')

    // En una sola transacción: el registro en la bitácora, la cancelación de la citación del partido no elegido y el
    // aviso a la jugadora (y a su familia, si es menor). No se manda además CITATION_CANCELLED, para no duplicar avisos
    await sequelize.transaction(async (transaction) => {
        await logger(actorOf(actor), LOG_ACTIONS.CONFLICT_RESOLVED, JSON.stringify(details), { transaction })
        await cancelCitationsForResolvedConflict(clubId, member.id, other.id, { transaction })

        const { weekday, dayMonth, time } = dateTimeParts(chosen.dateTime)
        await notify({
            clubId,
            type: 'CONFLICT_RESOLVED',
            recipientUserIds: [member.userId],
            title: 'Se resolvió un conflicto de horario',
            message: `Tenías dos partidos superpuestos el ${weekday} ${dayMonth}. Se decidió que juegues ${chosen.category.name} vs. ${chosen.rival} (${time}). `
                + `No jugás ${other.category.name} vs. ${other.rival} (${dateTimeParts(other.dateTime).time}).`,
            includeFamily: true
        }, { transaction })
    })

    const player = { memberId: member.id, name: `${member.user.name} ${member.user.lastName}` }
    const [conflict] = await withResolutions(clubId, [conflictOf(player, overlap)])
    return conflict
}

// ---------- Jugadora y Familia ----------

// Partidos de cada categoría activa de una socia (sin las inactivas), agrupados por categoría con su liga
async function gamesByCategoryOf(clubId, member, { from, to }) {
    if (member.memberStateId === MEMBER_STATES.INACTIVE) return []

    const categories = await getCategoriesOfMember(clubId, member.id)
    const [games, notPlaying] = await Promise.all([
        gamesOfCategories(clubId, categories.map(category => category.id), { from, to }),
        getNotPlayingGames(clubId, member.id)
    ])

    return categories.map(category => ({
        category: { id: category.id, name: category.name, ageGroup: category.ageGroup.label },
        league: { id: category.league.id, name: category.league.name, sport: category.league.sport },
        games: games
            .filter(game => game.categoryId === category.id)
            .map(game => ({ ...game, conflict: conflictMarkOf(notPlaying, game.id) }))
    }))
}

// Mis partidos: los de las categorías de la jugadora logueada (por defecto, desde hoy)
async function listMine(user, { from, to }) {
    const member = await Member.findOne({ where: { userId: user.id, clubId: user.clubId } })
    if (!member) throw createError(m.notMember, 404)

    return { categories: await gamesByCategoryOf(user.clubId, member, { from, to }) }
}

// Lo mismo para cada socia menor vinculada al adulto logueado (o solo una, con memberId)
async function listLinked(user, { memberId, from, to }) {
    const members = await Member.findAll({
        where: { clubId: user.clubId, adultUserId: user.id, linkStatus: true, ...(memberId && { id: Number(memberId) }) },
        include: [{ model: User, as: 'user', attributes: ['name', 'lastName'] }],
        order: [[{ model: User, as: 'user' }, 'name', 'ASC']]
    })

    if (memberId && members.length === 0) throw createError(m.linkedMemberNotFound, 404)

    return {
        players: await Promise.all(members.map(async (member) => ({
            member: { id: member.id, name: `${member.user.name} ${member.user.lastName}`, memberStateId: member.memberStateId },
            categories: await gamesByCategoryOf(user.clubId, member, { from, to })
        })))
    }
}

module.exports = {
    formatGame,
    findConflictsForGame,
    listConflicts,
    getConflictResolutions,
    getResolutionsForMember,
    getNotPlayingGames,
    conflictMarkOf,
    getOptions,
    listGames,
    checkConflicts,
    createGame,
    updateGame,
    markPlayed,
    cancelGame,
    listAssigned,
    listMyConflicts,
    resolveConflict,
    listMine,
    listLinked
}

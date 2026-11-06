// Service de leagues: ligas, categorías y asignación de jugadoras y staff.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
const { Op } = require('sequelize')

const sequelize = require('../../config/db')
const { League, Category, CategoryPlayer, CategoryStaff, ClubSport, Sport, Member, Inscription, Staff, User } = require('../../models')
const { getActiveSports } = require('../clubs/clubs.service')
const { isActiveStaff, getStaffRolesOfUsers } = require('../staff/staff.service')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { currentYear, getSeasonAge } = require('../../utils/dates')
const {
    MEMBER_STATES,
    INSCRIPTION_STATES,
    CATEGORY_STAFF_ROLES,
    AGE_SCALE_LABELS,
    findAgeGroup,
    LOG_ACTIONS
} = require('../../utils/constants')
const { leagues: m } = require('../../utils/messages')

// Socias que pueden jugar: la mora (SUSPENDED) impide ser citada, no jugar
const PLAYING_MEMBER_STATES = [MEMBER_STATES.ACTIVE, MEMBER_STATES.SUSPENDED]

const ELIGIBLE_PLAYERS_LIMIT = 100

const actorOf = ({ id: userId, clubId, activeRoleId }) => ({ clubId, userId, roleId: activeRoleId })

const fullNameOf = (user) => `${user.name} ${user.lastName}`

const unique = (values) => [...new Set(values)]

const includeSport = { model: ClubSport, as: 'clubSport', attributes: ['id', 'isActive'], include: [{ model: Sport, as: 'sport', attributes: ['name'] }] }

// ---------- Edad ----------

// Grupo de edad de una categoría con su edad máxima: { code, label, maxAge }. Si el code no está en la escala
// (no debería pasar), se muestra el code sin límite de edad.
const ageGroupOf = (league, category) => findAgeGroup(league.ageScale, category.ageGroup) ?? { code: category.ageGroup, label: category.ageGroup, maxAge: null }

// true si con su edad de temporada supera la edad máxima del grupo (Mayores no tiene límite)
const exceedsAge = (birthDate, group, year = currentYear()) => group.maxAge !== null && getSeasonAge(birthDate, year) > group.maxAge

// ---------- Alcance ----------

// Un staff activo con permisos de leagues trabaja solo con las ligas del deporte de su registro staff (el Representante).
// Un usuario con esos permisos que no es staff (rol nuevo o permiso directo) ve todas las ligas del club.
// Es la única regla de alcance: la usan todas las consultas del módulo.
async function getLeagueScope(user, { transaction } = {}) {
    if (await isActiveStaff(user.id, { transaction })) {
        const staff = await Staff.findOne({ where: { userId: user.id, clubId: user.clubId }, attributes: ['clubSportId'], transaction })
        return { clubId: user.clubId, clubSportId: staff.clubSportId }
    }

    return { clubId: user.clubId, clubSportId: null }
}

// Condición de las ligas dentro del alcance (la usan también los partidos)
const leagueWhere = (scope) => ({ clubId: scope.clubId, ...(scope.clubSportId && { clubSportId: scope.clubSportId }) })

async function findScopedLeague(scope, leagueId, options = {}) {
    const league = await League.findOne({ where: { id: leagueId, ...leagueWhere(scope) }, include: [includeSport], ...options })
    if (!league) throw createError(m.leagueNotFound, 404)
    return league
}

async function findScopedCategory(scope, categoryId, options = {}) {
    const category = await Category.findOne({
        where: { id: categoryId, clubId: scope.clubId },
        include: [{ model: League, as: 'league', where: leagueWhere(scope), include: [includeSport] }],
        ...options
    })

    if (!category) throw createError(m.categoryNotFound, 404)
    return category
}

// ---------- Formatos ----------

// includeInactive: si se muestran también las categorías dadas de baja. hasCategories las cuenta siempre, porque
// cualquier categoría (incluso dada de baja) bloquea el cambio de escala
function formatLeague(league, counts = {}, { includeInactive = true } = {}) {
    const all = league.categories ?? []
    const categories = all
        .filter(category => includeInactive || category.isActive)
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
        .map(category => {
            const group = ageGroupOf(league, category)
            return {
                id: category.id,
                name: category.name,
                ageGroup: group.code,
                ageGroupLabel: group.label,
                maxAge: group.maxAge,
                isActive: category.isActive,
                playerCount: counts.players?.get(category.id) ?? 0,
                staffCount: counts.staff?.get(category.id) ?? 0
            }
        })

    return {
        id: league.id,
        name: league.name,
        isActive: league.isActive,
        ageScale: league.ageScale,
        ageScaleLabel: AGE_SCALE_LABELS[league.ageScale],
        clubSport: { id: league.clubSport.id, name: league.clubSport.sport.name },
        categories,
        hasCategories: all.length > 0
    }
}

// Jugadoras asignadas y activas por categoría (sin las socias INACTIVE) y staff asignado que sigue siendo staff activo
async function countAssignments(categoryIds) {
    const players = new Map()
    const staff = new Map()
    if (categoryIds.length === 0) return { players, staff }

    const [playerRows, staffRows] = await Promise.all([
        CategoryPlayer.findAll({
            where: { categoryId: categoryIds, isActive: true },
            attributes: ['categoryId'],
            include: [{ model: Member, as: 'member', attributes: [], where: { memberStateId: PLAYING_MEMBER_STATES } }],
            raw: true
        }),
        CategoryStaff.findAll({
            where: { categoryId: categoryIds, isActive: true },
            attributes: ['categoryId'],
            include: [{ model: Staff, as: 'staff', attributes: ['userId', 'clubId'] }]
        })
    ])

    playerRows.forEach(row => players.set(row.categoryId, (players.get(row.categoryId) ?? 0) + 1))

    if (staffRows.length > 0) {
        const rolesByUser = await getStaffRolesOfUsers(staffRows[0].staff.clubId, unique(staffRows.map(row => row.staff.userId)))
        staffRows
            .filter(row => rolesByUser.get(row.staff.userId).length > 0)
            .forEach(row => staff.set(row.categoryId, (staff.get(row.categoryId) ?? 0) + 1))
    }

    return { players, staff }
}

// ---------- Ligas ----------

async function listLeagues(user, { includeInactive = false } = {}) {
    const scope = await getLeagueScope(user)

    const leagues = await League.findAll({
        where: { ...leagueWhere(scope), ...(!includeInactive && { isActive: true }) },
        include: [includeSport, { model: Category, as: 'categories', required: false }],
        order: [['isActive', 'DESC'], ['name', 'ASC']]
    })

    const counts = await countAssignments(leagues.flatMap(league => league.categories.map(category => category.id)))

    return {
        leagues: leagues.map(league => formatLeague(league, counts, { includeInactive })),
        // Para el formulario: los deportes activos del alcance (las escalas están en las constantes del front)
        sports: (await getActiveSports(user.clubId))
            .filter(sport => !scope.clubSportId || sport.clubSportId === scope.clubSportId)
            .map(sport => ({ id: sport.clubSportId, name: sport.name })),
        year: currentYear()
    }
}

// Una liga con todas sus categorías (también las dadas de baja), con sus cantidades
async function getLeague(scope, leagueId) {
    const league = await findScopedLeague(scope, leagueId, {
        include: [includeSport, { model: Category, as: 'categories', required: false }]
    })

    return formatLeague(league, await countAssignments(league.categories.map(category => category.id)))
}

// El nombre no se repite entre las ligas activas del mismo deporte
async function assertLeagueNameFree(clubId, clubSportId, name, exceptId, transaction) {
    const taken = await League.findOne({
        where: { clubId, clubSportId, name, isActive: true, ...(exceptId && { id: { [Op.ne]: exceptId } }) },
        attributes: ['id'],
        transaction
    })

    if (taken) throw createError(m.leagueNameTaken, 409)
}

// El deporte tiene que estar activo en el club y dentro del alcance
async function assertSportAvailable(scope, clubSportId) {
    if (scope.clubSportId && scope.clubSportId !== clubSportId) throw createError(m.sportOutOfScope, 400)

    const sports = await getActiveSports(scope.clubId)
    if (!sports.some(sport => sport.clubSportId === clubSportId)) throw createError(m.sportNotActive, 400)
}

async function createLeague(actor, { name, clubSportId, ageScale }) {
    const scope = await getLeagueScope(actor)
    await assertSportAvailable(scope, clubSportId)

    // Con el deporte bloqueado, dos altas simultáneas con el mismo nombre no pasan las dos
    const league = await sequelize.transaction(async (transaction) => {
        await ClubSport.findByPk(clubSportId, { transaction, lock: transaction.LOCK.UPDATE })
        await assertLeagueNameFree(scope.clubId, clubSportId, name, null, transaction)
        return League.create({ clubId: scope.clubId, clubSportId, name, ageScale, isActive: true }, { transaction })
    })

    await logger(actorOf(actor), LOG_ACTIONS.LEAGUE_CREATED, `Liga "${name}" (id ${league.id}), ${AGE_SCALE_LABELS[ageScale]}`)
    return getLeague(scope, league.id)
}

// El deporte no se cambia. La escala, solo mientras la liga no tenga categorías (ni dadas de baja)
async function updateLeague(actor, leagueId, { name, ageScale }) {
    const scope = await getLeagueScope(actor)

    const changes = await sequelize.transaction(async (transaction) => {
        const league = await findScopedLeague(scope, leagueId, { transaction, lock: transaction.LOCK.UPDATE })
        const details = []

        if (ageScale !== league.ageScale) {
            const categories = await Category.count({ where: { leagueId: league.id }, transaction })
            if (categories > 0) throw createError(m.ageScaleLocked, 409)
            details.push(`escala: ${league.ageScale} → ${ageScale}`)
        }

        if (name !== league.name) {
            if (league.isActive) await assertLeagueNameFree(scope.clubId, league.clubSportId, name, league.id, transaction)
            details.push(`nombre: "${league.name}" → "${name}"`)
        }

        if (details.length > 0) await league.update({ name, ageScale }, { transaction })
        return { league, details }
    })

    if (changes.details.length > 0) {
        await logger(actorOf(actor), LOG_ACTIONS.LEAGUE_UPDATED, `Liga "${changes.league.name}" (id ${changes.league.id}): ${changes.details.join(', ')}`)
    }

    return getLeague(scope, leagueId)
}

// Da de baja la liga y sus categorías activas
async function deactivateLeague(actor, leagueId) {
    const scope = await getLeagueScope(actor)

    const { league, categories } = await sequelize.transaction(async (transaction) => {
        const league = await findScopedLeague(scope, leagueId, { transaction, lock: transaction.LOCK.UPDATE })
        if (!league.isActive) throw createError(m.leagueAlreadyInactive, 409)

        const categories = await Category.findAll({ where: { leagueId: league.id, isActive: true }, transaction })
        await league.update({ isActive: false }, { transaction })
        for (const category of categories) await category.update({ isActive: false }, { transaction })

        return { league, categories }
    })

    await logger(actorOf(actor), LOG_ACTIONS.LEAGUE_DEACTIVATED,
        `Liga "${league.name}" (id ${league.id})${categories.length > 0 ? `, con sus categorías: ${categories.map(category => category.name).join(', ')}` : ''}`)

    return getLeague(scope, leagueId)
}

// Reactivar la liga no reactiva sus categorías: se reactivan una por una
async function reactivateLeague(actor, leagueId) {
    const scope = await getLeagueScope(actor)

    const league = await sequelize.transaction(async (transaction) => {
        const league = await findScopedLeague(scope, leagueId, { transaction, lock: transaction.LOCK.UPDATE })
        if (league.isActive) throw createError(m.leagueAlreadyActive, 409)
        if (!league.clubSport.isActive) throw createError(m.sportNotActive, 400)

        await assertLeagueNameFree(scope.clubId, league.clubSportId, league.name, league.id, transaction)
        await league.update({ isActive: true }, { transaction })
        return league
    })

    await logger(actorOf(actor), LOG_ACTIONS.LEAGUE_REACTIVATED, `Liga "${league.name}" (id ${league.id})`)
    return getLeague(scope, leagueId)
}

// ---------- Categorías ----------

// El nombre no se repite entre las categorías activas de la liga
async function assertCategoryNameFree(leagueId, name, exceptId, transaction) {
    const taken = await Category.findOne({
        where: { leagueId, name, isActive: true, ...(exceptId && { id: { [Op.ne]: exceptId } }) },
        attributes: ['id'],
        transaction
    })

    if (taken) throw createError(m.categoryNameTaken, 409)
}

const categoryLabel = (category, league) => `Categoría "${category.name}" (id ${category.id}) de la liga "${league.name}"`

// name es opcional: sin nombre, se usa la etiqueta del grupo ("Sub-18"). Puede haber dos del mismo grupo con nombres distintos
async function createCategory(actor, leagueId, { ageGroup, name }) {
    const scope = await getLeagueScope(actor)

    const { category, league } = await sequelize.transaction(async (transaction) => {
        const league = await findScopedLeague(scope, leagueId, { transaction, lock: transaction.LOCK.UPDATE })
        if (!league.isActive) throw createError(m.leagueInactive, 409)

        const group = findAgeGroup(league.ageScale, ageGroup)
        if (!group) throw createError(m.ageGroupInvalid, 400)

        const finalName = name || group.label
        await assertCategoryNameFree(league.id, finalName, null, transaction)

        const category = await Category.create({ clubId: scope.clubId, leagueId: league.id, name: finalName, ageGroup: group.code, isActive: true }, { transaction })
        return { category, league }
    })

    await logger(actorOf(actor), LOG_ACTIONS.CATEGORY_CREATED, categoryLabel(category, league))
    return getCategory(actor, category.id)
}

// Solo el nombre: el grupo de edad no se cambia
async function updateCategory(actor, categoryId, { name }) {
    const scope = await getLeagueScope(actor)

    const result = await sequelize.transaction(async (transaction) => {
        const category = await findScopedCategory(scope, categoryId, { transaction, lock: transaction.LOCK.UPDATE })
        const previous = category.name
        if (name === previous) return null

        if (category.isActive) await assertCategoryNameFree(category.leagueId, name, category.id, transaction)
        await category.update({ name }, { transaction })
        return { category, previous }
    })

    if (result) {
        await logger(actorOf(actor), LOG_ACTIONS.CATEGORY_UPDATED, `${categoryLabel(result.category, result.category.league)}: nombre "${result.previous}" → "${name}"`)
    }

    return getCategory(actor, categoryId)
}

// La baja conserva las asignaciones (historial); una categoría dada de baja no acepta asignaciones nuevas
async function deactivateCategory(actor, categoryId) {
    const scope = await getLeagueScope(actor)

    const category = await sequelize.transaction(async (transaction) => {
        const category = await findScopedCategory(scope, categoryId, { transaction, lock: transaction.LOCK.UPDATE })
        if (!category.isActive) throw createError(m.categoryAlreadyInactive, 409)
        await category.update({ isActive: false }, { transaction })
        return category
    })

    await logger(actorOf(actor), LOG_ACTIONS.CATEGORY_DEACTIVATED, categoryLabel(category, category.league))
    return getCategory(actor, categoryId)
}

// Para reactivar una categoría, su liga tiene que estar activa
async function reactivateCategory(actor, categoryId) {
    const scope = await getLeagueScope(actor)

    const category = await sequelize.transaction(async (transaction) => {
        const category = await findScopedCategory(scope, categoryId, { transaction, lock: transaction.LOCK.UPDATE })
        if (category.isActive) throw createError(m.categoryAlreadyActive, 409)
        if (!category.league.isActive) throw createError(m.leagueInactive, 409)

        await assertCategoryNameFree(category.leagueId, category.name, category.id, transaction)
        await category.update({ isActive: true }, { transaction })
        return category
    })

    await logger(actorOf(actor), LOG_ACTIONS.CATEGORY_REACTIVATED, categoryLabel(category, category.league))
    return getCategory(actor, categoryId)
}

// ---------- Detalle de una categoría ----------

const includeMemberUser = { model: User, as: 'user', attributes: ['id', 'name', 'lastName', 'birthDate'] }

// Jugadora de una categoría para mostrar: con su edad de temporada y si supera la edad del grupo
function formatPlayer(member, group, year) {
    return {
        memberId: member.id,
        name: fullNameOf(member.user),
        numMember: member.numMember,
        seasonAge: getSeasonAge(member.user.birthDate, year),
        memberStateId: member.memberStateId,
        exceedsAge: exceedsAge(member.user.birthDate, group, year)
    }
}

const byName = (a, b) => a.name.localeCompare(b.name, 'es')

// Staff asignado a la categoría (activo en la asignación), con sus roles de staff y si sigue siendo staff activo
async function getAssignedStaff(clubId, categoryId, { transaction } = {}) {
    const rows = await CategoryStaff.findAll({
        where: { categoryId, isActive: true },
        include: [{ model: Staff, as: 'staff', where: { clubId }, include: [{ model: User, as: 'user', attributes: ['id', 'name', 'lastName'] }] }],
        transaction
    })

    const rolesByUser = await getStaffRolesOfUsers(clubId, rows.map(row => row.staff.userId), { transaction })

    return rows
        .map(row => {
            const roles = rolesByUser.get(row.staff.userId)
            return { staffId: row.staff.id, userId: row.staff.userId, name: fullNameOf(row.staff.user), roles, isActiveStaff: roles.length > 0 }
        })
        .sort(byName)
}

// options.year: año para calcular la edad de temporada (por defecto, el actual; las pruebas usan otro para simular el cambio de año)
async function getCategory(user, categoryId, { year = currentYear() } = {}) {
    const scope = await getLeagueScope(user)
    const category = await findScopedCategory(scope, categoryId)
    const { league } = category
    const group = ageGroupOf(league, category)

    const playerRows = await CategoryPlayer.findAll({
        where: { categoryId: category.id, isActive: true },
        include: [{ model: Member, as: 'member', where: { clubId: scope.clubId }, include: [includeMemberUser] }]
    })

    return {
        id: category.id,
        name: category.name,
        isActive: category.isActive,
        ageGroup: group,
        year,
        league: { id: league.id, name: league.name, isActive: league.isActive, ageScale: league.ageScale },
        sport: { id: league.clubSport.id, name: league.clubSport.sport.name },
        players: playerRows.map(row => formatPlayer(row.member, group, year)).sort(byName),
        staff: await getAssignedStaff(scope.clubId, category.id)
    }
}

// ---------- Jugadoras ----------

// Socias del club que pueden jugar en el deporte: ACTIVE o SUSPENDED con inscripción Aprobada en ese deporte
function eligibleMembersQuery(clubId, clubSportId, extraWhere = {}) {
    return {
        where: { clubId, memberStateId: PLAYING_MEMBER_STATES, ...extraWhere },
        include: [
            includeMemberUser,
            { model: Inscription, as: 'inscriptions', attributes: [], where: { clubSportId, inscriptionState: INSCRIPTION_STATES.APPROVED } }
        ]
    }
}

const activeMemberIdsOf = async (categoryId) => (await CategoryPlayer.findAll({ where: { categoryId, isActive: true }, attributes: ['memberId'], raw: true })).map(row => row.memberId)

// Jugadoras que se pueden asignar a la categoría y todavía no están, con su edad de temporada.
// La edad se filtra en la base: edad de temporada <= maxAge ⇔ nació en el año (actual − maxAge) o después.
async function getEligiblePlayers(user, categoryId, { search = '' } = {}) {
    const scope = await getLeagueScope(user)
    const category = await findScopedCategory(scope, categoryId)
    if (!category.isActive) throw createError(m.categoryInactive, 409)

    const year = currentYear()
    const group = ageGroupOf(category.league, category)
    const assigned = await activeMemberIdsOf(category.id)
    const words = String(search).trim().split(/\s+/).filter(Boolean)
    const fields = ['$user.name$', '$user.lastName$', '$user.dni$', 'numMember']

    const conditions = [
        ...(assigned.length > 0 ? [{ id: { [Op.notIn]: assigned } }] : []),
        ...(group.maxAge !== null ? [{ '$user.birthDate$': { [Op.gte]: `${year - group.maxAge}-01-01` } }] : []),
        ...words.map(word => ({ [Op.or]: fields.map(field => ({ [field]: { [Op.like]: `%${word}%` } })) }))
    ]

    const query = eligibleMembersQuery(scope.clubId, category.league.clubSportId, conditions.length > 0 ? { [Op.and]: conditions } : {})
    const members = await Member.findAll({
        ...query,
        order: [[{ model: User, as: 'user' }, 'lastName', 'ASC'], [{ model: User, as: 'user' }, 'name', 'ASC']],
        limit: ELIGIBLE_PLAYERS_LIMIT,
        subQuery: false
    })

    return {
        ageGroup: group,
        year,
        players: members.map(member => ({
            memberId: member.id,
            name: fullNameOf(member.user),
            numMember: member.numMember,
            seasonAge: getSeasonAge(member.user.birthDate, year),
            memberStateId: member.memberStateId
        }))
    }
}

// Motivo por el que una socia no se puede asignar a la categoría, o null si se puede (regla 4)
function playerProblem(member, { group, sportName, year, approvedIds }) {
    const name = fullNameOf(member.user)
    if (!PLAYING_MEMBER_STATES.includes(member.memberStateId)) return m.memberInactive(name)
    if (!approvedIds.has(member.id)) return m.noInscription(name, sportName)
    if (exceedsAge(member.user.birthDate, group, year)) return m.exceedsAge(name, group.label, getSeasonAge(member.user.birthDate, year), year)
    return null
}

// Asigna una o varias jugadoras: o todas o ninguna. Si alguna no cumple, 400 con el nombre y el motivo de cada una.
// Una asignación quitada antes se reutiliza (vuelve a isActive = true).
async function assignPlayers(actor, categoryId, { memberIds }) {
    const scope = await getLeagueScope(actor)
    const ids = unique(memberIds)
    const year = currentYear()

    const { category, assigned } = await sequelize.transaction(async (transaction) => {
        const category = await findScopedCategory(scope, categoryId, { transaction, lock: transaction.LOCK.UPDATE })
        if (!category.isActive) throw createError(m.categoryInactive, 409)

        const { league } = category
        const members = await Member.findAll({ where: { id: ids, clubId: scope.clubId }, include: [includeMemberUser], transaction })
        if (members.length !== ids.length) throw createError(m.membersNotFound, 400)

        const approved = await Inscription.findAll({
            where: { memberId: ids, clubSportId: league.clubSportId, inscriptionState: INSCRIPTION_STATES.APPROVED },
            attributes: ['memberId'],
            raw: true,
            transaction
        })

        const context = { group: ageGroupOf(league, category), sportName: league.clubSport.sport.name, year, approvedIds: new Set(approved.map(row => row.memberId)) }
        const problems = members.map(member => playerProblem(member, context)).filter(Boolean)
        if (problems.length > 0) throw createError(problems.join(' '), 400, 'PLAYERS_NOT_ELIGIBLE', { problems })

        const assigned = []
        for (const member of members) {
            const [row, created] = await CategoryPlayer.findOrCreate({
                where: { memberId: member.id, categoryId: category.id },
                defaults: { memberId: member.id, categoryId: category.id, isActive: true },
                transaction
            })

            if (created || !row.isActive) {
                if (!created) await row.update({ isActive: true }, { transaction })
                assigned.push(member)
            }
        }

        return { category, assigned }
    })

    if (assigned.length > 0) {
        await logger(actorOf(actor), LOG_ACTIONS.PLAYER_ASSIGNED,
            `${categoryLabel(category, category.league)}: ${assigned.map(member => `${fullNameOf(member.user)} (Nº ${member.numMember})`).join(', ')}`)
    }

    return getCategory(actor, category.id)
}

async function unassignPlayer(actor, categoryId, memberId) {
    const scope = await getLeagueScope(actor)

    const { category, member } = await sequelize.transaction(async (transaction) => {
        const category = await findScopedCategory(scope, categoryId, { transaction })
        const row = await CategoryPlayer.findOne({
            where: { categoryId: category.id, memberId, isActive: true },
            include: [{ model: Member, as: 'member', include: [includeMemberUser] }],
            transaction,
            lock: transaction.LOCK.UPDATE
        })

        if (!row) throw createError(m.playerNotAssigned, 404)
        await row.update({ isActive: false }, { transaction })
        return { category, member: row.member }
    })

    await logger(actorOf(actor), LOG_ACTIONS.PLAYER_UNASSIGNED, `${categoryLabel(category, category.league)}: ${fullNameOf(member.user)} (Nº ${member.numMember})`)
    return getCategory(actor, category.id)
}

// ---------- Staff ----------

const isCategoryStaff = (roles) => roles.some(role => CATEGORY_STAFF_ROLES.includes(role))

// Staff que se puede asignar (regla 5): staff activo con rol Entrenadora o Preparadora física, del deporte de la liga,
// que todavía no está en la categoría
async function getEligibleStaff(user, categoryId) {
    const scope = await getLeagueScope(user)
    const category = await findScopedCategory(scope, categoryId)
    if (!category.isActive) throw createError(m.categoryInactive, 409)

    const assigned = (await CategoryStaff.findAll({ where: { categoryId: category.id, isActive: true }, attributes: ['staffId'], raw: true })).map(row => row.staffId)

    const candidates = await Staff.findAll({
        where: { clubId: scope.clubId, clubSportId: category.league.clubSportId, ...(assigned.length > 0 && { id: { [Op.notIn]: assigned } }) },
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'lastName'] }]
    })

    const rolesByUser = await getStaffRolesOfUsers(scope.clubId, candidates.map(staff => staff.userId))

    return {
        staff: candidates
            .filter(staff => isCategoryStaff(rolesByUser.get(staff.userId)))
            .map(staff => ({ staffId: staff.id, name: fullNameOf(staff.user), roles: rolesByUser.get(staff.userId) }))
            .sort(byName)
    }
}

async function assignStaff(actor, categoryId, { staffIds }) {
    const scope = await getLeagueScope(actor)
    const ids = unique(staffIds)

    const { category, assigned } = await sequelize.transaction(async (transaction) => {
        const category = await findScopedCategory(scope, categoryId, { transaction, lock: transaction.LOCK.UPDATE })
        if (!category.isActive) throw createError(m.categoryInactive, 409)

        const people = await Staff.findAll({ where: { id: ids, clubId: scope.clubId }, include: [{ model: User, as: 'user', attributes: ['id', 'name', 'lastName'] }], transaction })
        if (people.length !== ids.length) throw createError(m.staffNotFound, 400)

        const rolesByUser = await getStaffRolesOfUsers(scope.clubId, people.map(staff => staff.userId), { transaction })

        const problems = people.map(staff => {
            const name = fullNameOf(staff.user)
            const roles = rolesByUser.get(staff.userId)
            if (roles.length === 0) return m.notStaff(name)
            if (staff.clubSportId !== category.league.clubSportId) return m.otherSport(name)
            if (!isCategoryStaff(roles)) return m.notCategoryStaff(name)
            return null
        }).filter(Boolean)

        if (problems.length > 0) throw createError(problems.join(' '), 400, 'STAFF_NOT_ELIGIBLE', { problems })

        const assigned = []
        for (const staff of people) {
            const [row, created] = await CategoryStaff.findOrCreate({
                where: { staffId: staff.id, categoryId: category.id },
                defaults: { staffId: staff.id, categoryId: category.id, isActive: true },
                transaction
            })

            if (created || !row.isActive) {
                if (!created) await row.update({ isActive: true }, { transaction })
                assigned.push(staff)
            }
        }

        return { category, assigned }
    })

    if (assigned.length > 0) {
        await logger(actorOf(actor), LOG_ACTIONS.STAFF_ASSIGNED,
            `${categoryLabel(category, category.league)}: ${assigned.map(staff => fullNameOf(staff.user)).join(', ')}`)
    }

    return getCategory(actor, category.id)
}

async function unassignStaff(actor, categoryId, staffId) {
    const scope = await getLeagueScope(actor)

    const { category, staff } = await sequelize.transaction(async (transaction) => {
        const category = await findScopedCategory(scope, categoryId, { transaction })
        const row = await CategoryStaff.findOne({
            where: { categoryId: category.id, staffId, isActive: true },
            include: [{ model: Staff, as: 'staff', include: [{ model: User, as: 'user', attributes: ['name', 'lastName'] }] }],
            transaction,
            lock: transaction.LOCK.UPDATE
        })

        if (!row) throw createError(m.staffNotAssigned, 404)
        await row.update({ isActive: false }, { transaction })
        return { category, staff: row.staff }
    })

    await logger(actorOf(actor), LOG_ACTIONS.STAFF_UNASSIGNED, `${categoryLabel(category, category.league)}: ${fullNameOf(staff.user)}`)
    return getCategory(actor, category.id)
}

// ---------- Funciones para otros módulos ----------
// Las usan partidos, citaciones, rutinas, notificaciones y la baja de un deporte, en lugar de consultar categoryPlayer
// y categoryStaff por su cuenta. Reciben el clubId (filtran siempre por club) y { transaction } opcional.

// Jugadoras asignadas y activas de la categoría, sin las socias INACTIVE (las SUSPENDED sí: la mora no impide jugar)
async function getActivePlayersOfCategory(clubId, categoryId, { transaction } = {}) {
    const rows = await CategoryPlayer.findAll({
        where: { categoryId, isActive: true },
        include: [
            { model: Category, as: 'category', attributes: [], where: { clubId } },
            { model: Member, as: 'member', where: { clubId, memberStateId: PLAYING_MEMBER_STATES }, include: [includeMemberUser] }
        ],
        transaction
    })

    return rows
        .map(({ member }) => ({
            memberId: member.id,
            userId: member.user.id,
            name: fullNameOf(member.user),
            numMember: member.numMember,
            birthDate: member.user.birthDate,
            memberStateId: member.memberStateId
        }))
        .sort(byName)
}

const includeActiveCategory = (clubId) => ({
    model: Category,
    as: 'category',
    where: { clubId, isActive: true },
    include: [{ model: League, as: 'league', where: { isActive: true }, include: [includeSport] }]
})

const formatAssignedCategory = ({ category }) => {
    const group = ageGroupOf(category.league, category)
    return {
        id: category.id,
        name: category.name,
        ageGroup: group,
        league: { id: category.league.id, name: category.league.name, clubSportId: category.league.clubSportId, sport: category.league.clubSport.sport.name }
    }
}

const byLeagueAndName = (a, b) => a.league.name.localeCompare(b.league.name, 'es') || a.name.localeCompare(b.name, 'es')

// Staff asignado a la categoría que sigue siendo staff activo: [{ staffId, userId, name, roles }]
async function getActiveStaffOfCategory(clubId, categoryId, { transaction } = {}) {
    const staff = await getAssignedStaff(clubId, categoryId, { transaction })
    return staff.filter(item => item.isActiveStaff).map(({ staffId, userId, name, roles }) => ({ staffId, userId, name, roles }))
}

// Categorías activas en las que está una socia, con su liga
async function getCategoriesOfMember(clubId, memberId, { transaction } = {}) {
    const rows = await CategoryPlayer.findAll({ where: { memberId, isActive: true }, include: [includeActiveCategory(clubId)], transaction })
    return rows.map(formatAssignedCategory).sort(byLeagueAndName)
}

// Categorías activas asignadas a un staff, con su liga
async function getCategoriesOfStaff(clubId, staffId, { transaction } = {}) {
    const rows = await CategoryStaff.findAll({ where: { staffId, isActive: true }, include: [includeActiveCategory(clubId)], transaction })
    return rows.map(formatAssignedCategory).sort(byLeagueAndName)
}

// true si el staff está asignado y activo en esa categoría (y la categoría está activa)
async function isStaffAssignedToCategory(clubId, staffId, categoryId, { transaction } = {}) {
    const count = await CategoryStaff.count({
        where: { staffId, categoryId, isActive: true },
        include: [{ model: Category, as: 'category', where: { clubId, isActive: true } }],
        transaction
    })

    return count > 0
}

// Baja de un deporte (contexto 3.3.1): quita a la socia de todas las categorías de ese deporte. Devuelve las categorías
// de las que se la quitó, para que el módulo que la llama lo registre en la bitácora
async function removeMemberFromSportCategories(clubId, memberId, clubSportId, { transaction } = {}) {
    const rows = await CategoryPlayer.findAll({
        where: { memberId, isActive: true },
        include: [{ model: Category, as: 'category', where: { clubId }, include: [{ model: League, as: 'league', where: { clubSportId } }] }],
        transaction
    })

    for (const row of rows) await row.update({ isActive: false }, { transaction })
    return rows.map(row => ({ id: row.category.id, name: row.category.name, league: row.category.league.name }))
}

// ---------- Mis categorías ----------

// Categorías activas del staff logueado, con sus jugadoras activas y el resto del staff. Si no es staff, lista vacía
async function getMyCategories(user, { year = currentYear() } = {}) {
    const staff = await Staff.findOne({ where: { userId: user.id, clubId: user.clubId }, attributes: ['id'] })
    if (!staff) return { year, categories: [] }

    const categories = await getCategoriesOfStaff(user.clubId, staff.id)

    return {
        year,
        categories: await Promise.all(categories.map(async (category) => {
            const [players, assignedStaff] = await Promise.all([
                getActivePlayersOfCategory(user.clubId, category.id),
                getAssignedStaff(user.clubId, category.id)
            ])

            return {
                ...category,
                players: players.map(player => ({
                    memberId: player.memberId,
                    name: player.name,
                    numMember: player.numMember,
                    seasonAge: getSeasonAge(player.birthDate, year),
                    memberStateId: player.memberStateId,
                    exceedsAge: exceedsAge(player.birthDate, category.ageGroup, year)
                })),
                otherStaff: assignedStaff.filter(item => item.staffId !== staff.id && item.isActiveStaff)
            }
        }))
    }
}

module.exports = {
    getLeagueScope,
    leagueWhere,
    listLeagues,
    createLeague,
    updateLeague,
    deactivateLeague,
    reactivateLeague,
    createCategory,
    updateCategory,
    deactivateCategory,
    reactivateCategory,
    getCategory,
    getEligiblePlayers,
    assignPlayers,
    unassignPlayer,
    getEligibleStaff,
    assignStaff,
    unassignStaff,
    getMyCategories,
    getActivePlayersOfCategory,
    getCategoriesOfMember,
    getCategoriesOfStaff,
    getActiveStaffOfCategory,
    isStaffAssignedToCategory,
    removeMemberFromSportCategories
}

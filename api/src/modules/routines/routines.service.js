// Service de routines: rutinas semanales.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
//
// Reglas (contexto, sección 6, "Rutinas"): una rutina por categoría y día, de lunes a viernes (weekStart lunes +
// dayOfWeek de 1 a 5, ROUTINE_DAYS). Se cargan,
// editan y borran solo en la semana actual o en las futuras; las pasadas quedan como historial de solo lectura.
// Crear o editar avisa ROUTINE_PUBLISHED (in-app) a las jugadoras activas de la categoría; borrar no avisa.
const { Op, UniqueConstraintError } = require('sequelize')

const sequelize = require('../../config/db')
const { Routine, Category, League, ClubSport, Sport, Game, Member, Staff } = require('../../models')
const { getEffectivePermissions } = require('../access/access.service')
const { isActiveStaff } = require('../staff/staff.service')
const { getCategoriesOfStaff, getCategoriesOfMember, getActivePlayersOfCategory } = require('../leagues/leagues.service')
const { formatGame } = require('../games/games.service')
const { notify } = require('../notifications/notifications.service')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { today: todayAR, addDays, getCurrentWeekStart } = require('../../utils/dates')
const { deleteUpload } = require('../../utils/files')
const { DAYS_OF_WEEK, ROUTINE_DAYS, GAME_STATES, MEMBER_STATES, LOG_ACTIONS } = require('../../utils/constants')
const { PERMISSIONS } = require('../../utils/permissions')
const { routines: m } = require('../../utils/messages')

const actorOf = ({ id: userId, clubId, activeRoleId }) => ({ clubId, userId, roleId: activeRoleId })

const dayOf = (dayOfWeek) => DAYS_OF_WEEK.find(day => day.value === dayOfWeek)

// Fecha de un día de la semana: weekStart + (dayOfWeek − 1)
const dateOf = (weekStart, dayOfWeek) => addDays(weekStart, dayOfWeek - 1)

// '2026-11-10' → '10/11'
const dayMonthOf = (date) => `${date.slice(8, 10)}/${date.slice(5, 7)}`

// Semana actual o futura: se puede cargar, editar y borrar
const isEditableWeek = (weekStart) => weekStart >= getCurrentWeekStart()

// ---------- Alcance ----------

const includeLeague = {
    model: League,
    as: 'league',
    attributes: ['id', 'name', 'clubSportId'],
    where: { isActive: true },
    include: [{ model: ClubSport, as: 'clubSport', attributes: ['id'], include: [{ model: Sport, as: 'sport', attributes: ['name'] }] }]
}

// Todas las categorías activas del club, con el mismo formato que getCategoriesOfStaff
async function allClubCategories(clubId) {
    const categories = await Category.findAll({
        where: { clubId, isActive: true },
        include: [includeLeague],
        order: [[{ model: League, as: 'league' }, 'name', 'ASC'], ['name', 'ASC']]
    })

    return categories.map(category => ({
        id: category.id,
        name: category.name,
        league: { id: category.league.id, name: category.league.name, clubSportId: category.league.clubSportId, sport: category.league.clubSport.sport.name }
    }))
}

// Categorías asignadas al staff logueado (vacío si no tiene registro staff)
async function staffCategories(user) {
    const staff = await Staff.findOne({ where: { userId: user.id, clubId: user.clubId }, attributes: ['id'] })
    return staff ? getCategoriesOfStaff(user.clubId, staff.id) : []
}

// Categorías en las que se cargan rutinas (routines.manage): un staff activo (la preparadora física), las suyas; quien
// no es staff (por ejemplo, un rol nuevo del Admin), todas las activas del club, como el alcance de las ligas
async function manageCategories(user) {
    return (await isActiveStaff(user.id)) ? staffCategories(user) : allClubCategories(user.clubId)
}

// Ids de las categorías del alcance de routines.manage
async function getRoutineScope(user) {
    return (await manageCategories(user)).map(category => category.id)
}

// Categorías que el usuario puede consultar: con routines.manage, su alcance; si no (routines.viewAssigned, la
// entrenadora), las categorías asignadas. canManage: si puede cargar rutinas
async function viewCategories(user) {
    const permissions = await getEffectivePermissions(user.id, user.activeRoleId)
    const canManage = permissions.includes(PERMISSIONS.ROUTINES_MANAGE)
    return { canManage, categories: canManage ? await manageCategories(user) : await staffCategories(user) }
}

// Una categoría del alcance de consulta, o 404
async function findViewCategory(user, categoryId) {
    const { canManage, categories } = await viewCategories(user)
    const category = categories.find(item => item.id === Number(categoryId))
    if (!category) throw createError(m.categoryNotFound, 404)
    return { canManage, category }
}

// ---------- Formatos ----------

function formatRoutine(routine) {
    return {
        id: routine.id,
        categoryId: routine.categoryId,
        weekStart: routine.weekStart,
        dayOfWeek: routine.dayOfWeek,
        date: dateOf(routine.weekStart, routine.dayOfWeek),
        title: routine.title,
        description: routine.description,
        imageUrl: routine.imageUrl,
        videoUrl: routine.videoUrl,
        updatedAt: routine.updatedAt
    }
}

// Los días con rutina de la semana (lunes a viernes, ROUTINE_DAYS), cada uno con su rutina o null
function weekDays(weekStart, routines) {
    return ROUTINE_DAYS.map(day => {
        const routine = routines.find(item => item.dayOfWeek === day.value)
        return { dayOfWeek: day.value, date: dateOf(weekStart, day.value), routine: routine ? formatRoutine(routine) : null }
    })
}

const weekOf = (weekStart) => ({ weekStart, weekEnd: addDays(weekStart, 6) })

// Rutinas de una semana para varias categorías: Map categoryId → [rutinas]
async function routinesOfWeek(clubId, categoryIds, weekStart) {
    const routines = categoryIds.length === 0 ? [] : await Routine.findAll({ where: { clubId, categoryId: categoryIds, weekStart } })
    const byCategory = new Map(categoryIds.map(id => [id, []]))
    routines.forEach(routine => byCategory.get(routine.categoryId)?.push(routine))
    return byCategory
}

// Partidos de la categoría en la semana (sin los cancelados), para que la preparadora ajuste las rutinas
async function gamesOfWeek(clubId, categoryId, weekStart) {
    const games = await Game.findAll({
        where: {
            clubId,
            categoryId,
            gameState: { [Op.ne]: GAME_STATES.CANCELLED },
            dateTime: { [Op.gte]: new Date(`${weekStart}T00:00:00.000-03:00`), [Op.lt]: new Date(`${addDays(weekStart, 7)}T00:00:00.000-03:00`) }
        },
        order: [['dateTime', 'ASC'], ['id', 'ASC']]
    })
    return games.map(formatGame)
}

// ---------- Consulta: preparadora y entrenadora ----------

// Categorías del alcance, con su liga y su deporte
async function listCategories(user) {
    const { canManage, categories } = await viewCategories(user)
    return { canManage, categories }
}

// La semana de una categoría (por defecto, la actual): los días de lunes a viernes, si se puede editar y los partidos de
// toda la semana (también los del fin de semana)
async function getWeek(user, { categoryId, weekStart = getCurrentWeekStart() }) {
    const { canManage, category } = await findViewCategory(user, categoryId)
    const [byCategory, games] = await Promise.all([
        routinesOfWeek(user.clubId, [category.id], weekStart),
        gamesOfWeek(user.clubId, category.id, weekStart)
    ])

    return {
        category,
        ...weekOf(weekStart),
        today: todayAR(),
        currentWeekStart: getCurrentWeekStart(),
        editable: canManage && isEditableWeek(weekStart),
        days: weekDays(weekStart, byCategory.get(category.id)),
        games
    }
}

// Historial: las semanas con rutinas cargadas de una categoría, de la más reciente a la más vieja
async function listWeeks(user, { categoryId }) {
    const { category } = await findViewCategory(user, categoryId)
    const rows = await Routine.findAll({
        where: { clubId: user.clubId, categoryId: category.id },
        attributes: ['weekStart', [sequelize.fn('COUNT', sequelize.col('id')), 'days']],
        group: ['weekStart'],
        order: [['weekStart', 'DESC']],
        raw: true
    })

    return { items: rows.map(row => ({ ...weekOf(row.weekStart), days: Number(row.days) })) }
}

// ---------- Carga (routines.manage) ----------

// Aviso ROUTINE_PUBLISHED a las jugadoras activas de la categoría (sin la familia)
async function notifyPlayers(clubId, category, routine, created, transaction) {
    const players = await getActivePlayersOfCategory(clubId, category.id, { transaction })
    if (players.length === 0) return

    const day = dayOf(routine.dayOfWeek).name
    const date = dayMonthOf(dateOf(routine.weekStart, routine.dayOfWeek))
    await notify({
        clubId,
        type: 'ROUTINE_PUBLISHED',
        recipientUserIds: players.map(player => player.userId),
        title: created ? `Nueva rutina de ${category.name}` : `Rutina actualizada de ${category.name}`,
        message: `Se ${created ? 'publicó' : 'actualizó'} la rutina del ${day} ${date} de ${category.name}.`
    }, { transaction })
}

const describe = (category, routine) =>
    `${category.name} (${category.league.name}), semana del ${dayMonthOf(routine.weekStart)}, ${dayOf(routine.dayOfWeek).name}`

const cleanUrl = (value) => (value?.trim() ? value.trim() : null)

// Una categoría del alcance de carga, o 404
async function findManageCategory(user, categoryId) {
    const category = (await manageCategories(user)).find(item => item.id === Number(categoryId))
    if (!category) throw createError(m.categoryNotFound, 404)
    return category
}

// Una rutina de una categoría del alcance de carga, de una semana editable
async function findEditableRoutine(user, routineId, transaction) {
    const routine = await Routine.findOne({ where: { id: routineId, clubId: user.clubId }, transaction, lock: transaction.LOCK.UPDATE })
    const category = routine && (await manageCategories(user)).find(item => item.id === routine.categoryId)
    if (!category) throw createError(m.routineNotFound, 404)
    if (!isEditableWeek(routine.weekStart)) throw createError(m.pastWeek, 400)
    return { routine, category }
}

// Crear la rutina de un día. Si ese día ya tiene una, 409. file: la imagen (opcional, middleware upload)
async function createRoutine(actor, { categoryId, weekStart, dayOfWeek, title, description, videoUrl }, file) {
    const imageUrl = file?.url ?? null

    try {
        const category = await findManageCategory(actor, categoryId)
        if (!isEditableWeek(weekStart)) throw createError(m.pastWeek, 400)

        const routine = await sequelize.transaction(async (transaction) => {
            const existing = await Routine.count({ where: { categoryId: category.id, weekStart, dayOfWeek }, transaction })
            if (existing > 0) throw createError(m.dayTaken, 409)

            const created = await Routine.create({
                clubId: actor.clubId,
                categoryId: category.id,
                userId: actor.id,
                weekStart,
                dayOfWeek,
                title: title.trim(),
                description: description.trim(),
                imageUrl,
                videoUrl: cleanUrl(videoUrl)
            }, { transaction })

            await logger(actorOf(actor), LOG_ACTIONS.ROUTINE_CREATED, `${describe(category, created)}: ${created.title}`, { transaction })
            await notifyPlayers(actor.clubId, category, created, true, transaction)
            return created
        })

        return { routine: formatRoutine(routine) }

    } catch (error) {
        await deleteUpload(imageUrl)   // Si no se guardó, no queda la imagen suelta
        if (error instanceof UniqueConstraintError) throw createError(m.dayTaken, 409)
        throw error
    }
}

// Editar una rutina: título, descripción, video y la imagen (una nueva la reemplaza; removeImage la quita).
// La imagen anterior se borra después de guardar
async function updateRoutine(actor, routineId, { title, description, videoUrl, removeImage }, file) {
    const newImage = file?.url ?? null
    let previousImage = null

    try {
        const routine = await sequelize.transaction(async (transaction) => {
            const { routine: current, category } = await findEditableRoutine(actor, routineId, transaction)

            const changes = { title: title.trim(), description: description.trim(), videoUrl: cleanUrl(videoUrl) }
            if (newImage || removeImage) {
                previousImage = current.imageUrl
                changes.imageUrl = newImage
            }

            await current.update(changes, { transaction })
            await logger(actorOf(actor), LOG_ACTIONS.ROUTINE_UPDATED, `${describe(category, current)}: ${current.title}`, { transaction })
            await notifyPlayers(actor.clubId, category, current, false, transaction)
            return current
        })

        await deleteUpload(previousImage)
        return { routine: formatRoutine(routine) }

    } catch (error) {
        await deleteUpload(newImage)
        throw error
    }
}

// Borrar la rutina de un día (semana actual o futura). Borrado físico: nada depende de routine. No se avisa
async function deleteRoutine(actor, routineId) {
    const imageUrl = await sequelize.transaction(async (transaction) => {
        const { routine, category } = await findEditableRoutine(actor, routineId, transaction)
        const image = routine.imageUrl

        await logger(actorOf(actor), LOG_ACTIONS.ROUTINE_DELETED, `${describe(category, routine)}: ${routine.title}`, { transaction })
        await routine.destroy({ transaction })
        return image
    })

    await deleteUpload(imageUrl)
    return { deleted: true }
}

// ---------- Jugadora (routines.viewOwn) ----------

// La semana de la jugadora logueada (por defecto, la actual), agrupada por categoría con su liga: de lunes a viernes
async function getMine(user, { weekStart = getCurrentWeekStart() } = {}) {
    const member = await Member.findOne({ where: { userId: user.id, clubId: user.clubId }, attributes: ['id', 'memberStateId'] })
    if (!member) throw createError(m.notMember, 404)

    const categories = member.memberStateId === MEMBER_STATES.INACTIVE ? [] : await getCategoriesOfMember(user.clubId, member.id)
    const byCategory = await routinesOfWeek(user.clubId, categories.map(category => category.id), weekStart)

    return {
        ...weekOf(weekStart),
        today: todayAR(),
        currentWeekStart: getCurrentWeekStart(),
        categories: categories.map(category => ({
            category: { id: category.id, name: category.name },
            league: { id: category.league.id, name: category.league.name, sport: category.league.sport },
            days: weekDays(weekStart, byCategory.get(category.id))
        }))
    }
}

module.exports = {
    getRoutineScope,
    listCategories,
    getWeek,
    listWeeks,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    getMine
}

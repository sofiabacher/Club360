// Service de routines: rutinas semanales.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
//
// Reglas (contexto, sección 6, "Rutinas"): una rutina por categoría y día, de lunes a viernes (weekStart lunes +
// dayOfWeek de 1 a 5, ROUTINE_DAYS). Se cargan,
// editan y borran solo en la semana actual o en las futuras; las pasadas quedan como historial de solo lectura.
// Crear o editar avisa ROUTINE_PUBLISHED (in-app) a las jugadoras activas de la categoría; borrar no avisa. Una rutina
// que alguna jugadora ya registró no se borra (409).
//
// Seguimiento personal (P20, contexto sección 6): la jugadora (routines.trackOwn) registra cada rutina de sus categorías
// desde el día de la rutina hasta ROUTINE_LOG_WINDOW_DAYS después, carga sus objetivos y ve su progreso (getProgress, se
// calcula y no se guarda). La preparadora física (routines.viewTracking) lo consulta para las jugadoras activas de las
// categorías de getRoutineScope. Sin bitácora ni avisos: es información personal de la jugadora.
const { Op, UniqueConstraintError } = require('sequelize')

const sequelize = require('../../config/db')
const { Routine, RoutineLog, Goal, Category, League, ClubSport, Sport, Game, Member, Staff, User } = require('../../models')
const { getEffectivePermissions } = require('../access/access.service')
const { isActiveStaff } = require('../staff/staff.service')
const { getCategoriesOfStaff, getCategoriesOfMember, getActivePlayersOfCategory } = require('../leagues/leagues.service')
const { formatGame } = require('../games/games.service')
const { notify } = require('../notifications/notifications.service')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { today: todayAR, addDays, getCurrentWeekStart } = require('../../utils/dates')
const { deleteUpload } = require('../../utils/files')
const {
    DAYS_OF_WEEK, ROUTINE_DAYS, GAME_STATES, MEMBER_STATES, LOG_ACTIONS, ROUTINE_LOG_STATUS, GOAL_STATES, ROUTINE_LOG_WINDOW_DAYS,
    MAX_GOALS_IN_PROGRESS, EFFORT_MIN, EFFORT_MAX
} = require('../../utils/constants')
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

// Borrar la rutina de un día (semana actual o futura). Borrado físico, salvo que alguna jugadora ya la haya registrado
// (routineLog): entonces 409 y se puede editar. No se avisa
async function deleteRoutine(actor, routineId) {
    const imageUrl = await sequelize.transaction(async (transaction) => {
        const { routine, category } = await findEditableRoutine(actor, routineId, transaction)
        const image = routine.imageUrl

        if (await RoutineLog.count({ where: { routineId: routine.id }, transaction }) > 0) throw createError(m.routineHasLogs, 409)

        await logger(actorOf(actor), LOG_ACTIONS.ROUTINE_DELETED, `${describe(category, routine)}: ${routine.title}`, { transaction })
        await routine.destroy({ transaction })
        return image
    })

    await deleteUpload(imageUrl)
    return { deleted: true }
}

// ---------- Jugadora (routines.viewOwn) ----------

// La semana de la jugadora logueada (por defecto, la actual), agrupada por categoría con su liga: de lunes a viernes.
// Con routines.trackOwn, cada rutina suma myLog (su registro o null) y canLog (si está dentro de la ventana)
async function getMine(user, { weekStart = getCurrentWeekStart() } = {}) {
    const member = await findOwnMember(user)
    const categories = await activeCategoriesOf(user.clubId, member)
    const byCategory = await routinesOfWeek(user.clubId, categories.map(category => category.id), weekStart)

    const canTrack = (await getEffectivePermissions(user.id, user.activeRoleId)).includes(PERMISSIONS.ROUTINES_TRACK_OWN)
    const routineIds = [...byCategory.values()].flat().map(routine => routine.id)
    const logs = canTrack && routineIds.length > 0
        ? await RoutineLog.findAll({ where: { clubId: user.clubId, memberId: member.id, routineId: routineIds } })
        : []
    const logByRoutine = new Map(logs.map(log => [log.routineId, formatLog(log)]))
    const today = todayAR()

    return {
        ...weekOf(weekStart),
        today,
        currentWeekStart: getCurrentWeekStart(),
        canTrack,
        categories: categories.map(category => ({
            category: { id: category.id, name: category.name },
            league: { id: category.league.id, name: category.league.name, sport: category.league.sport },
            days: weekDays(weekStart, byCategory.get(category.id)).map(day => ({
                ...day,
                routine: day.routine && (canTrack
                    ? { ...day.routine, myLog: logByRoutine.get(day.routine.id) ?? null, canLog: logWindowOf(day.routine.date, today) === 'OPEN' }
                    : day.routine)
            }))
        }))
    }
}

// ---------- Seguimiento personal: registro de cumplimiento (routines.trackOwn) ----------

async function findOwnMember(user) {
    const member = await Member.findOne({ where: { userId: user.id, clubId: user.clubId }, attributes: ['id', 'memberStateId'] })
    if (!member) throw createError(m.notMember, 404)
    return member
}

// Categorías activas de una socia (ninguna si está dada de baja)
async function activeCategoriesOf(clubId, member) {
    return member.memberStateId === MEMBER_STATES.INACTIVE ? [] : getCategoriesOfMember(clubId, member.id)
}

// Ventana para registrar una rutina: desde su fecha hasta ROUTINE_LOG_WINDOW_DAYS después, en hora de Argentina.
// 'NOT_YET' (día futuro), 'OPEN' o 'EXPIRED'. Las fechas son 'AAAA-MM-DD': se comparan como texto
function logWindowOf(date, today = todayAR()) {
    if (today < date) return 'NOT_YET'
    if (today > addDays(date, ROUTINE_LOG_WINDOW_DAYS)) return 'EXPIRED'
    return 'OPEN'
}

function formatLog(log) {
    return { id: log.id, routineId: log.routineId, status: log.status, effort: log.effort, note: log.note, updatedAt: log.updatedAt }
}

// Registrar (o editar) cómo le fue con la rutina de un día. Solo rutinas de sus categorías activas y dentro de la
// ventana. effort obligatorio si es Completada o Parcial, vacío si es No completada. Un registro por rutina: si ya
// existe, se actualiza. No se borra, no se registra en la bitácora ni avisa
async function saveLog(user, routineId, { status, effort, note }) {
    const member = await findOwnMember(user)
    const categoryIds = (await activeCategoriesOf(user.clubId, member)).map(category => category.id)

    const routine = await Routine.findOne({ where: { id: routineId, clubId: user.clubId } })
    if (!routine || !categoryIds.includes(routine.categoryId)) throw createError(m.routineNotFound, 404)

    const window = logWindowOf(dateOf(routine.weekStart, routine.dayOfWeek))
    if (window === 'NOT_YET') throw createError(m.logNotYet, 400)
    if (window === 'EXPIRED') throw createError(m.logExpired, 400)

    const statusValue = Number(status)
    const hasEffort = effort !== null && effort !== undefined && effort !== ''
    if (statusValue === ROUTINE_LOG_STATUS.NOT_COMPLETED) {
        if (hasEffort) throw createError(m.effortNotAllowed, 400)
    } else {
        const value = Number(effort)
        if (!hasEffort || !Number.isInteger(value) || value < EFFORT_MIN || value > EFFORT_MAX) throw createError(m.effortRequired, 400)
    }

    const values = {
        status: statusValue,
        effort: statusValue === ROUTINE_LOG_STATUS.NOT_COMPLETED ? null : Number(effort),
        note: note?.trim() ? note.trim() : null
    }

    const log = await sequelize.transaction(async (transaction) => {
        const existing = await RoutineLog.findOne({ where: { routineId: routine.id, memberId: member.id }, transaction, lock: transaction.LOCK.UPDATE })
        if (existing) return existing.update(values, { transaction })
        return RoutineLog.create({ clubId: user.clubId, routineId: routine.id, memberId: member.id, ...values }, { transaction })
    })

    return { log: formatLog(log) }
}

// ---------- Seguimiento personal: objetivos (routines.trackOwn) ----------

const isOverdue = (goal, today = todayAR()) => goal.goalState === GOAL_STATES.IN_PROGRESS && goal.dueDate < today

function formatGoal(goal, today = todayAR()) {
    return {
        id: goal.id,
        text: goal.text,
        dueDate: goal.dueDate,
        goalState: goal.goalState,
        closedAt: goal.closedAt,
        overdue: isOverdue(goal, today),
        createdAt: goal.createdAt
    }
}

// Primero los En curso por fecha límite; después los cerrados, del más reciente al más viejo
function sortGoals(goals) {
    const open = goals.filter(goal => goal.goalState === GOAL_STATES.IN_PROGRESS).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id - b.id)
    const closed = goals.filter(goal => goal.goalState !== GOAL_STATES.IN_PROGRESS).sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt) || b.id - a.id)
    return [...open, ...closed]
}

async function goalsOf(clubId, memberId, { state } = {}) {
    const goals = await Goal.findAll({ where: { clubId, memberId, ...(state && { goalState: Number(state) }) } })
    const today = todayAR()
    return sortGoals(goals).map(goal => formatGoal(goal, today))
}

async function listMyGoals(user, { state }) {
    const member = await findOwnMember(user)
    return { items: await goalsOf(user.clubId, member.id, { state }) }
}

// Un objetivo de la jugadora logueada; si es de otra (o no existe), 404
async function findOwnGoal(user, goalId, transaction) {
    const member = await findOwnMember(user)
    const goal = await Goal.findOne({ where: { id: goalId, clubId: user.clubId, memberId: member.id }, transaction, ...(transaction && { lock: transaction.LOCK.UPDATE }) })
    if (!goal) throw createError(m.goalNotFound, 404)
    return { member, goal }
}

const assertFutureDueDate = (dueDate) => {
    if (dueDate < todayAR()) throw createError(m.goalDueDatePast, 400)
}

async function assertGoalRoom(clubId, memberId, transaction) {
    const open = await Goal.count({ where: { clubId, memberId, goalState: GOAL_STATES.IN_PROGRESS }, transaction })
    if (open >= MAX_GOALS_IN_PROGRESS) throw createError(m.goalTooMany, 400)
}

async function createGoal(user, { text, dueDate }) {
    const member = await findOwnMember(user)
    assertFutureDueDate(dueDate)

    const goal = await sequelize.transaction(async (transaction) => {
        await assertGoalRoom(user.clubId, member.id, transaction)
        return Goal.create({ clubId: user.clubId, memberId: member.id, text: text.trim(), dueDate, goalState: GOAL_STATES.IN_PROGRESS }, { transaction })
    })

    return { goal: formatGoal(goal) }
}

// Solo los En curso: el texto y la fecha (de hoy en adelante)
async function updateGoal(user, goalId, { text, dueDate }) {
    const goal = await sequelize.transaction(async (transaction) => {
        const { goal: current } = await findOwnGoal(user, goalId, transaction)
        if (current.goalState !== GOAL_STATES.IN_PROGRESS) throw createError(m.goalNotInProgress, 400)
        assertFutureDueDate(dueDate)
        return current.update({ text: text.trim(), dueDate }, { transaction })
    })

    return { goal: formatGoal(goal) }
}

// Cerrar (Cumplido o Abandonado, completa closedAt) o reabrir (En curso, closedAt en NULL). Al reabrir uno con la fecha
// pasada, pide una nueva (dueDate); reabrir respeta el máximo de En curso
async function setGoalState(user, goalId, { goalState, dueDate }) {
    const state = Number(goalState)

    const goal = await sequelize.transaction(async (transaction) => {
        const { member, goal: current } = await findOwnGoal(user, goalId, transaction)

        if (state !== GOAL_STATES.IN_PROGRESS) {
            if (current.goalState !== GOAL_STATES.IN_PROGRESS) throw createError(m.goalAlreadyClosed, 400)
            return current.update({ goalState: state, closedAt: new Date() }, { transaction })
        }

        if (current.goalState === GOAL_STATES.IN_PROGRESS) throw createError(m.goalAlreadyInProgress, 400)
        const newDueDate = dueDate || current.dueDate
        if (newDueDate < todayAR()) throw createError(dueDate ? m.goalDueDatePast : m.goalReopenNeedsDate, 400)
        await assertGoalRoom(user.clubId, member.id, transaction)

        return current.update({ goalState: GOAL_STATES.IN_PROGRESS, closedAt: null, dueDate: newDueDate }, { transaction })
    })

    return { goal: formatGoal(goal) }
}

// ---------- Seguimiento personal: progreso ----------

const DONE_STATUSES = [ROUTINE_LOG_STATUS.COMPLETED, ROUTINE_LOG_STATUS.PARTIAL]

const average = (values) => (values.length > 0 ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null)

// Cumplimiento: (completadas + parciales × 0,5) / programadas, en porcentaje (null sin rutinas programadas)
const complianceOf = ({ scheduled, completed, partial }) => (scheduled > 0 ? Math.round(((completed + partial * 0.5) / scheduled) * 100) : null)

// Cuenta los registros de un conjunto de rutinas (ya filtradas a hoy o antes)
function tally(routines, logByRoutine) {
    const result = { scheduled: routines.length, completed: 0, partial: 0, notCompleted: 0, unlogged: 0 }
    const efforts = []

    for (const routine of routines) {
        const log = logByRoutine.get(routine.id)
        if (!log) result.unlogged++
        else if (log.status === ROUTINE_LOG_STATUS.COMPLETED) result.completed++
        else if (log.status === ROUTINE_LOG_STATUS.PARTIAL) result.partial++
        else result.notCompleted++
        if (log?.effort) efforts.push(log.effort)
    }

    return { ...result, compliance: complianceOf(result), effort: average(efforts) }
}

// Racha: rutinas seguidas, de la más reciente hacia atrás, con Completada o Parcial. Una sin registrar todavía dentro de
// la ventana no corta (ni suma); una No completada o una sin registrar con la ventana vencida, sí
function streakOf(routines, logByRoutine, today) {
    let streak = 0
    for (const routine of routines) {
        const log = logByRoutine.get(routine.id)
        if (log && DONE_STATUSES.includes(log.status)) streak++
        else if (!log && logWindowOf(routine.date, today) === 'OPEN') continue
        else break
    }
    return streak
}

// Progreso de una jugadora (se calcula, no se guarda): por semana, de las últimas `weeks` (incluida la actual hasta hoy),
// las rutinas programadas de sus categorías con fecha de hoy o anterior y cómo las registró; los totales del período
// (cumplimiento, esfuerzo promedio y la racha, que mira todo el historial y no solo el período) y sus objetivos
async function getProgress(memberId, { weeks = 8, clubId } = {}) {
    const member = await Member.findOne({ where: { id: memberId, clubId }, attributes: ['id', 'memberStateId'] })
    if (!member) throw createError(m.notMember, 404)

    const today = todayAR()
    const currentWeek = getCurrentWeekStart()
    const firstWeek = addDays(currentWeek, -7 * (Number(weeks) - 1))
    const categoryIds = (await activeCategoriesOf(clubId, member)).map(category => category.id)

    // Todas las rutinas de sus categorías hasta hoy (para la racha), de la más reciente a la más vieja
    const routines = categoryIds.length === 0 ? [] : (await Routine.findAll({
        where: { clubId, categoryId: categoryIds, weekStart: { [Op.lte]: currentWeek } },
        attributes: ['id', 'categoryId', 'weekStart', 'dayOfWeek']
    }))
        .map(routine => ({ id: routine.id, categoryId: routine.categoryId, weekStart: routine.weekStart, date: dateOf(routine.weekStart, routine.dayOfWeek) }))
        .filter(routine => routine.date <= today)
        .sort((a, b) => b.date.localeCompare(a.date) || a.categoryId - b.categoryId)

    const logs = routines.length === 0 ? [] : await RoutineLog.findAll({ where: { clubId, memberId, routineId: routines.map(routine => routine.id) } })
    const logByRoutine = new Map(logs.map(log => [log.routineId, log]))

    const inPeriod = routines.filter(routine => routine.weekStart >= firstWeek)
    const weekList = Array.from({ length: Number(weeks) }, (_, index) => addDays(firstWeek, 7 * index))

    const goals = await Goal.findAll({ where: { clubId, memberId }, attributes: ['goalState', 'dueDate'] })

    return {
        weeks: weekList.map(weekStart => ({ weekStart, ...tally(inPeriod.filter(routine => routine.weekStart === weekStart), logByRoutine) })),
        totals: { ...tally(inPeriod, logByRoutine), streak: streakOf(routines, logByRoutine, today) },
        goals: {
            inProgress: goals.filter(goal => goal.goalState === GOAL_STATES.IN_PROGRESS).length,
            overdue: goals.filter(goal => isOverdue(goal, today)).length,
            achieved: goals.filter(goal => goal.goalState === GOAL_STATES.ACHIEVED).length,
            abandoned: goals.filter(goal => goal.goalState === GOAL_STATES.ABANDONED).length
        }
    }
}

async function getMyProgress(user, { weeks }) {
    const member = await findOwnMember(user)
    return getProgress(member.id, { weeks: weeks || 8, clubId: user.clubId })
}

// ---------- Vista de la preparadora (routines.viewTracking) ----------

// Una categoría del alcance de getRoutineScope, o 404
async function findTrackingCategory(user, categoryId) {
    const category = (await manageCategories(user)).find(item => item.id === Number(categoryId))
    if (!category) throw createError(m.categoryNotFound, 404)
    return category
}

// La semana de una categoría (sin categoryId, la primera del alcance): cada jugadora activa con su registro de cada
// rutina, su cumplimiento y su esfuerzo de esa semana (sobre las rutinas con fecha de hoy o anterior). categories: las del
// alcance, para el selector
async function getTracking(user, { categoryId, weekStart = getCurrentWeekStart() }) {
    const categories = await manageCategories(user)
    const today = todayAR()
    if (categories.length === 0) {
        return { categories: [], category: null, ...weekOf(weekStart), today, currentWeekStart: getCurrentWeekStart(), routines: [], players: [] }
    }

    const category = categoryId ? await findTrackingCategory(user, categoryId) : categories[0]

    const [byCategory, players] = await Promise.all([
        routinesOfWeek(user.clubId, [category.id], weekStart),
        getActivePlayersOfCategory(user.clubId, category.id)
    ])
    const routines = byCategory.get(category.id)
        .map(routine => ({ id: routine.id, dayOfWeek: routine.dayOfWeek, date: dateOf(routine.weekStart, routine.dayOfWeek), title: routine.title }))
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek)

    const logs = routines.length === 0 || players.length === 0 ? [] : await RoutineLog.findAll({
        where: { clubId: user.clubId, routineId: routines.map(routine => routine.id), memberId: players.map(player => player.memberId) }
    })
    const due = routines.filter(routine => routine.date <= today)

    return {
        categories,
        category,
        ...weekOf(weekStart),
        today,
        currentWeekStart: getCurrentWeekStart(),
        routines,
        players: players.map(player => {
            const own = new Map(logs.filter(log => log.memberId === player.memberId).map(log => [log.routineId, log]))
            const { compliance, effort } = tally(due, own)
            return {
                member: { id: player.memberId, name: player.name },
                logs: Object.fromEntries(routines.map(routine => [routine.id, own.has(routine.id) ? formatLog(own.get(routine.id)) : null])),
                compliance,
                effort
            }
        })
    }
}

// El progreso y los objetivos (solo lectura) de una jugadora activa en alguna categoría del alcance; si no, 404
async function getMemberTracking(user, memberId, { weeks }) {
    const scope = await getRoutineScope(user)
    const member = await Member.findOne({
        where: { id: memberId, clubId: user.clubId },
        attributes: ['id', 'memberStateId'],
        include: [{ model: User, as: 'user', attributes: ['name', 'lastName'] }]
    })
    const categories = member ? (await activeCategoriesOf(user.clubId, member)).filter(category => scope.includes(category.id)) : []
    if (categories.length === 0) throw createError(m.playerNotFound, 404)

    const [progress, goals] = await Promise.all([
        getProgress(member.id, { weeks: weeks || 8, clubId: user.clubId }),
        goalsOf(user.clubId, member.id)
    ])

    return {
        member: { id: member.id, name: `${member.user.name} ${member.user.lastName}` },
        categories: categories.map(category => ({ id: category.id, name: category.name, league: { id: category.league.id, name: category.league.name } })),
        progress,
        goals
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
    getMine,
    logWindowOf,
    saveLog,
    listMyGoals,
    createGoal,
    updateGoal,
    setGoalState,
    getProgress,
    getMyProgress,
    getTracking,
    getMemberTracking
}

// Service de fees: cuotas sociales y deportivas, y pagos simulados.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
//
// Reglas (D12, contexto sección 6): la cuota del mes se genera el día 1 y vence el 10, a los socios ACTIVE o SUSPENDED
// dados de alta antes del día 1. Los montos se fijan al generarla. Las funciones de los jobs reciben la fecha de
// referencia (today, 'AAAA-MM-DD') para poder probarlas con cualquier fecha. La mora se calcula con getOverdueDays.
const crypto = require('crypto')
const { Op } = require('sequelize')

const sequelize = require('../../config/db')
const { Fee, Payment, Member, User, Club, Inscription, ClubSport, Sport, Notification } = require('../../models')
const { getEffectivePermissions } = require('../access/access.service')
const { getSportScope } = require('../staff/staff.service')
const { notify } = require('../notifications/notifications.service')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { today: todayAR, daysBetween, dateTimeParts, getAge } = require('../../utils/dates')
const {
    FEE_STATES,
    TRANSACTION_STATES,
    MEMBER_STATES,
    INSCRIPTION_STATES,
    FEE_DUE_DAY,
    FEE_DUE_SOON_DAYS,
    FEE_OVERDUE_REMINDER_DAYS,
    LOG_ACTIONS
} = require('../../utils/constants')
const { PERMISSIONS } = require('../../utils/permissions')
const { fees: m } = require('../../utils/messages')

const FEES_PAGE_SIZE = 20

// Socios a los que se les genera la cuota (la deuda sigue corriendo aunque estén suspendidos)
const BILLABLE_MEMBER_STATES = [MEMBER_STATES.ACTIVE, MEMBER_STATES.SUSPENDED]

const UNPAID_STATES = [FEE_STATES.PENDING, FEE_STATES.OVERDUE]

// Situación de una jugadora en la vista del Representante
const PLAYER_STATUS = { OK: 'ok', PENDING: 'pending', OVERDUE: 'overdue' }

// Tarjetas que el pago simulado rechaza (para poder mostrar un rechazo)
const REJECTED_CARD_SUFFIX = '0000'

const SYSTEM = (clubId) => ({ clubId, userId: null, roleId: null })

const actorOf = ({ id: userId, clubId, activeRoleId }) => ({ clubId, userId, roleId: activeRoleId })

const fullNameOf = (user) => `${user.name} ${user.lastName}`

const toAmount = (value) => Math.round(Number(value) * 100) / 100

const totalOf = (fee) => toAmount(Number(fee.socialAmount) + Number(fee.sportAmount))

// $40.000 (sin decimales si no los tiene)
const money = (value) => `$${Number(value).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`

// ---------- Fechas ----------

const pad = (number) => String(number).padStart(2, '0')

// '2026-11-07' + 3 días → '2026-11-10'
function addDays(date, days) {
    const [year, month, day] = date.split('-').map(Number)
    const result = new Date(Date.UTC(year, month - 1, day + days))
    return `${result.getUTCFullYear()}-${pad(result.getUTCMonth() + 1)}-${pad(result.getUTCDate())}`
}

const periodOf = (date) => date.slice(0, 7)

// Mediodía de una fecha en Argentina (para sacar el día de la semana sin problemas de zona)
const noonOf = (date) => new Date(`${date}T12:00:00.000-03:00`)

// '2026-11' → 'noviembre'
const monthNameOf = (period) => new Intl.DateTimeFormat('es-AR', { month: 'long', timeZone: 'America/Argentina/Buenos_Aires' }).format(noonOf(`${period}-15`))

const expirationOf = (period) => `${period}-${pad(FEE_DUE_DAY)}`

// Días de atraso de una cuota impaga ya vencida (0 si está paga o todavía no venció)
function overdueDaysOf(fee, today) {
    if (fee.feeState === FEE_STATES.PAID || fee.expirationDate >= today) return 0
    return daysBetween(fee.expirationDate, today)
}

// ---------- Mora ----------

// Días de atraso de un socio: los días entre hoy y el vencimiento de su cuota no Pagada más vieja que ya venció.
// 0 si no tiene cuotas vencidas. La mora no es un estado: se calcula desde expirationDate (contexto, sección 6).
// Es la única cuenta de la mora: la usan las citaciones, el chequeo diario, la recuperación y las pantallas.
// options.today: fecha de referencia (por defecto, hoy en Argentina)
async function getOverdueDays(memberId, { transaction, today = todayAR() } = {}) {
    const oldest = await Fee.findOne({
        where: { memberId, feeState: { [Op.ne]: FEE_STATES.PAID }, expirationDate: { [Op.lt]: today } },
        attributes: ['expirationDate'],
        order: [['expirationDate', 'ASC']],
        transaction
    })

    return oldest ? daysBetween(oldest.expirationDate, today) : 0
}

// ---------- Generación ----------

// Genera las cuotas de un período (AAAA-MM) para un club. Es idempotente: única por (memberId, period), lo que ya existe
// no se toca. Devuelve { created, existing }
async function generateFeesForPeriod(clubId, period) {
    const club = await Club.findByPk(clubId, { attributes: ['id', 'socialFee'] })
    const periodStart = new Date(`${period}-01T00:00:00.000-03:00`)

    const members = await Member.findAll({
        where: { clubId, memberStateId: BILLABLE_MEMBER_STATES, createdAt: { [Op.lt]: periodStart } },
        attributes: ['id'],
        include: [{
            model: Inscription,
            as: 'inscriptions',
            attributes: ['id'],
            required: false,
            where: { inscriptionState: INSCRIPTION_STATES.APPROVED },
            include: [{ model: ClubSport, as: 'clubSport', attributes: ['priceFee'] }]
        }]
    })

    let created = 0
    for (const member of members) {
        const sportAmount = member.inscriptions.reduce((sum, inscription) => sum + Number(inscription.clubSport.priceFee), 0)

        const [, isNew] = await Fee.findOrCreate({
            where: { memberId: member.id, period },
            defaults: {
                clubId,
                expirationDate: expirationOf(period),
                socialAmount: club.socialFee,
                sportAmount: toAmount(sportAmount),
                feeState: FEE_STATES.PENDING
            }
        })
        if (isNew) created++
    }

    return { created, existing: members.length - created }
}

// Job generateFees (día 1): genera las cuotas del mes para cada club
async function generateMonthlyFees(today = todayAR()) {
    const period = periodOf(today)
    const clubs = await Club.findAll({ attributes: ['id'] })
    const results = []

    for (const club of clubs) {
        const result = await generateFeesForPeriod(club.id, period)
        await logger(SYSTEM(club.id), LOG_ACTIONS.FEES_GENERATED, `Período ${period}: ${result.created} cuotas generadas, ${result.existing} ya existían (automático)`)
        results.push({ clubId: club.id, ...result })
    }

    return results
}

// Generación a mano (fees.manage), para la demo o si el job no corrió. No se genera un período futuro
async function generateFees(actor, { period }) {
    if (period > periodOf(todayAR())) throw createError(m.futurePeriod, 400)

    const result = await generateFeesForPeriod(actor.clubId, period)
    await logger(actorOf(actor), LOG_ACTIONS.FEES_GENERATED, `Período ${period}: ${result.created} cuotas generadas, ${result.existing} ya existían`)
    return { period, ...result }
}

// ---------- Chequeo diario (job feeStatus) ----------

const includeMemberUser = { model: Member, as: 'member', attributes: ['id', 'userId', 'memberStateId'], include: [{ model: User, as: 'user', attributes: ['id', 'name', 'lastName'] }] }

// Para no repetir un aviso si el chequeo corre dos veces el mismo día (o por el mismo atraso)
async function alreadyNotified(clubId, userId, type, title) {
    return (await Notification.count({ where: { clubId, recipientId: userId, type, title } })) > 0
}

// 1. Cuotas Pendientes que vencen dentro de FEE_DUE_SOON_DAYS días exactos: aviso FEE_DUE_SOON (in-app)
async function notifyDueSoon(today) {
    const dueDate = addDays(today, FEE_DUE_SOON_DAYS)
    const fees = await Fee.findAll({ where: { feeState: FEE_STATES.PENDING, expirationDate: dueDate }, include: [includeMemberUser] })

    let sent = 0
    for (const fee of fees) {
        const month = monthNameOf(fee.period)
        const title = `Tu cuota de ${month} ${fee.period.slice(0, 4)} vence pronto`
        if (await alreadyNotified(fee.clubId, fee.member.userId, 'FEE_DUE_SOON', title)) continue

        const { weekday, dayMonth } = dateTimeParts(noonOf(fee.expirationDate))
        await notify({
            clubId: fee.clubId,
            type: 'FEE_DUE_SOON',
            recipientUserIds: [fee.member.userId],
            title,
            message: `Tu cuota de ${month} vence el ${weekday} ${dayMonth} (${money(totalOf(fee))}).`,
            includeFamily: true
        })
        sent++
    }
    return sent
}

// 2. Cuotas Pendientes con el vencimiento ya pasado: pasan a Vencida y se avisa FEE_OVERDUE (in-app y email)
async function markOverdue(today) {
    const fees = await Fee.findAll({ where: { feeState: FEE_STATES.PENDING, expirationDate: { [Op.lt]: today } }, include: [includeMemberUser] })

    for (const fee of fees) {
        const month = monthNameOf(fee.period)
        const { dayMonth } = dateTimeParts(noonOf(fee.expirationDate))

        await sequelize.transaction(async (transaction) => {
            await fee.update({ feeState: FEE_STATES.OVERDUE }, { transaction })
            await notify({
                clubId: fee.clubId,
                type: 'FEE_OVERDUE',
                recipientUserIds: [fee.member.userId],
                title: `Tu cuota de ${month} ${fee.period.slice(0, 4)} venció`,
                message: `Tu cuota de ${month} venció el ${dayMonth}. Regularizá tu situación desde Mis cuotas.`,
                includeFamily: true
            }, { transaction })
        })
    }
    return fees.length
}

// Cuotas Vencidas agrupadas por socio: Map memberId → { member, fees }
async function overdueFeesByMember() {
    const fees = await Fee.findAll({ where: { feeState: FEE_STATES.OVERDUE }, include: [includeMemberUser] })
    const byMember = new Map()

    for (const fee of fees) {
        if (!BILLABLE_MEMBER_STATES.includes(fee.member.memberStateId)) continue
        if (!byMember.has(fee.memberId)) byMember.set(fee.memberId, { member: fee.member, clubId: fee.clubId, fees: [] })
        byMember.get(fee.memberId).fees.push(fee)
    }
    return byMember
}

// 3. Recordatorio de mora: a los socios cuyo atraso es múltiplo de FEE_OVERDUE_REMINDER_DAYS, un FEE_OVERDUE con el resumen
async function sendReminders(today, delayFeeOf) {
    let sent = 0

    for (const { member, clubId, fees } of (await overdueFeesByMember()).values()) {
        const days = await getOverdueDays(member.id, { today })
        if (days === 0 || days % FEE_OVERDUE_REMINDER_DAYS !== 0) continue

        const title = `Recordatorio: ${days} días de atraso en tus cuotas`
        if (await alreadyNotified(clubId, member.userId, 'FEE_OVERDUE', title)) continue

        const total = fees.reduce((sum, fee) => sum + totalOf(fee), 0)
        const count = fees.length === 1 ? '1 cuota vencida' : `${fees.length} cuotas vencidas`
        await notify({
            clubId,
            type: 'FEE_OVERDUE',
            recipientUserIds: [member.userId],
            title,
            message: `Tenés ${count} por ${money(total)}. La más vieja tiene ${days} días de atraso. `
                + `Si superás los ${delayFeeOf.get(clubId)} días, perdés tu condición de socio.`,
            includeFamily: true
        })
        sent++
    }
    return sent
}

// 4. Suspensión: los socios ACTIVE con más días de atraso que el plazo del club pasan a SUSPENDED (con aviso por email)
async function suspendOverdueMembers(today, delayFeeOf) {
    const members = await Member.findAll({
        where: { memberStateId: MEMBER_STATES.ACTIVE },
        attributes: ['id', 'clubId', 'userId', 'numMember', 'memberStateId'],
        include: [
            { model: User, as: 'user', attributes: ['name', 'lastName'] },
            { model: Fee, as: 'fees', attributes: [], required: true, where: { feeState: { [Op.ne]: FEE_STATES.PAID }, expirationDate: { [Op.lt]: today } } }
        ]
    })

    let suspended = 0
    for (const member of members) {
        const delayFee = delayFeeOf.get(member.clubId)
        const days = await getOverdueDays(member.id, { today })
        if (days <= delayFee) continue

        await sequelize.transaction(async (transaction) => {
            await member.update({ memberStateId: MEMBER_STATES.SUSPENDED }, { transaction })
            await notify({
                clubId: member.clubId,
                type: 'MEMBER_SUSPENDED',
                recipientUserIds: [member.userId],
                title: 'Perdiste tu condición de socio',
                message: `Por tener cuotas impagas hace más de ${delayFee} días, perdiste tu condición de socio. `
                    + 'Mientras tanto no podés ser citada ni inscribirte a deportes. Se recupera sola cuando regularices tus cuotas.',
                includeFamily: true
            }, { transaction })
            await logger(SYSTEM(member.clubId), LOG_ACTIONS.MEMBER_SUSPENDED,
                `${fullNameOf(member.user)} (Nº ${member.numMember}): ${days} días de atraso (plazo del club: ${delayFee})`, { transaction })
        })
        suspended++
    }
    return suspended
}

// Job feeStatus (todos los días): por vencer, vencidas, recordatorios y suspensiones, en ese orden. Idempotente
async function runDailyFeeCheck(today = todayAR()) {
    const clubs = await Club.findAll({ attributes: ['id', 'delayFee'] })
    const delayFeeOf = new Map(clubs.map(club => [club.id, club.delayFee]))

    const dueSoon = await notifyDueSoon(today)
    const overdue = await markOverdue(today)
    const reminders = await sendReminders(today, delayFeeOf)
    const suspended = await suspendOverdueMembers(today, delayFeeOf)

    return { today, dueSoon, overdue, reminders, suspended }
}

// ---------- Estado de cuenta ----------

function formatFee(fee, today) {
    return {
        id: fee.id,
        period: fee.period,
        socialAmount: toAmount(fee.socialAmount),
        sportAmount: toAmount(fee.sportAmount),
        total: totalOf(fee),
        expirationDate: fee.expirationDate,
        feeState: fee.feeState,
        overdueDays: overdueDaysOf(fee, today)
    }
}

function formatPayment(payment) {
    return {
        id: payment.id,
        feeId: payment.feeId,
        period: payment.fee?.period ?? null,
        amount: toAmount(payment.amount),
        transactionState: payment.transactionState,
        confirmationCode: payment.confirmationCode,
        createdAt: payment.createdAt
    }
}

// Estado de cuenta de un socio: sus cuotas (la más reciente primero), el total adeudado, los días de atraso y los pagos
async function accountOf(member, { canPay }) {
    const today = todayAR()
    const [fees, payments, club] = await Promise.all([
        Fee.findAll({ where: { memberId: member.id }, order: [['period', 'DESC']] }),
        Payment.findAll({
            include: [{ model: Fee, as: 'fee', attributes: ['period'], where: { memberId: member.id } }],
            order: [['createdAt', 'DESC'], ['id', 'DESC']]
        }),
        Club.findByPk(member.clubId, { attributes: ['delayFee'] })
    ])

    const items = fees.map(fee => formatFee(fee, today))
    const unpaid = items.filter(fee => fee.feeState !== FEE_STATES.PAID)

    return {
        member: {
            id: member.id,
            name: fullNameOf(member.user),
            numMember: member.numMember,
            memberStateId: member.memberStateId,
            isAdult: getAge(member.user.birthDate) >= 18
        },
        totalDue: toAmount(unpaid.reduce((sum, fee) => sum + fee.total, 0)),
        overdueDays: await getOverdueDays(member.id, { today }),
        delayFee: club.delayFee,
        canPay,
        fees: items,
        payments: payments.map(formatPayment)
    }
}

const includeUser = { model: User, as: 'user', attributes: ['id', 'name', 'lastName', 'birthDate'] }

async function getMine(user) {
    const member = await Member.findOne({ where: { userId: user.id, clubId: user.clubId }, include: [includeUser] })
    if (!member) throw createError(m.notMember, 404)

    const permissions = await getEffectivePermissions(user.id, user.activeRoleId)
    return accountOf(member, { canPay: permissions.includes(PERMISSIONS.FEES_PAY_OWN) })
}

// Estado de cuenta de cada socia vinculada al adulto logueado (o solo una, con memberId)
async function getLinked(user, { memberId } = {}) {
    const members = await Member.findAll({
        where: { clubId: user.clubId, adultUserId: user.id, linkStatus: true, ...(memberId && { id: Number(memberId) }) },
        include: [includeUser],
        order: [[{ model: User, as: 'user' }, 'name', 'ASC']]
    })
    if (memberId && members.length === 0) throw createError(m.linkedMemberNotFound, 404)

    return { accounts: await Promise.all(members.map(member => accountOf(member, { canPay: true }))) }
}

// Estado de cuenta de un socio del club (fees.manage)
async function getMemberAccount(user, memberId) {
    const member = await Member.findOne({ where: { id: memberId, clubId: user.clubId }, include: [includeUser] })
    if (!member) throw createError(m.memberNotFound, 404)
    return accountOf(member, { canPay: false })
}

// ---------- Pagos ----------

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

async function newConfirmationCode(prefix, transaction) {
    for (;;) {
        const bytes = crypto.randomBytes(8)
        const code = `${prefix}-${[...bytes].map(byte => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('')}`
        if (!await Payment.findOne({ where: { confirmationCode: code }, attributes: ['id'], transaction })) return code
    }
}

// Recuperación automática: un SUSPENDED sin cuotas impagas por encima del plazo vuelve a ACTIVE. Devuelve true si se recuperó
async function recoverIfRegularized(member, actor, transaction) {
    if (member.memberStateId !== MEMBER_STATES.SUSPENDED) return false

    const club = await Club.findByPk(member.clubId, { attributes: ['delayFee'], transaction })
    const days = await getOverdueDays(member.id, { transaction })
    if (days > club.delayFee) return false

    await member.update({ memberStateId: MEMBER_STATES.ACTIVE }, { transaction })
    await logger(actor, LOG_ACTIONS.MEMBER_RECOVERED,
        `${fullNameOf(member.user)} (Nº ${member.numMember}): regularizó sus cuotas (atraso actual: ${days} días, plazo: ${club.delayFee})`, { transaction })
    return true
}

// Una cuota del club con su socio, bloqueada para pagarla. Solo Pendientes o Vencidas (si no, 409)
async function lockUnpaidFee(feeWhere, transaction) {
    const fee = await Fee.findOne({
        where: feeWhere,
        include: [{ model: Member, as: 'member', include: [includeUser] }],
        transaction,
        lock: transaction.LOCK.UPDATE
    })
    if (!fee) throw createError(m.feeNotFound, 404)
    if (!UNPAID_STATES.includes(fee.feeState)) throw createError(m.alreadyPaid, 409)
    return fee
}

// Pago simulado (fees.payOwn o fees.manageLinked). La cuota tiene que ser del socio logueado (con payOwn) o de una socia
// vinculada (con manageLinked); si no, 404. No se guarda ningún dato de la tarjeta: en la bitácora, solo los últimos 4
async function payFee(user, feeId, { cardNumber }) {
    const permissions = await getEffectivePermissions(user.id, user.activeRoleId)
    const own = permissions.includes(PERMISSIONS.FEES_PAY_OWN)
    const linked = permissions.includes(PERMISSIONS.FEES_MANAGE_LINKED)

    const memberConditions = []
    if (own) memberConditions.push({ userId: user.id })
    if (linked) memberConditions.push({ adultUserId: user.id, linkStatus: true })
    const allowed = await Member.findAll({ where: { clubId: user.clubId, [Op.or]: memberConditions }, attributes: ['id'], raw: true })

    const last4 = String(cardNumber).slice(-4)
    const approved = !String(cardNumber).endsWith(REJECTED_CARD_SUFFIX)

    const result = await sequelize.transaction(async (transaction) => {
        const fee = await lockUnpaidFee({ id: feeId, clubId: user.clubId, memberId: allowed.map(member => member.id) }, transaction)

        const payment = await Payment.create({
            clubId: user.clubId,
            userId: user.id,
            feeId: fee.id,
            amount: totalOf(fee),
            transactionState: TRANSACTION_STATES.PENDING,
            confirmationCode: await newConfirmationCode('PAY', transaction)
        }, { transaction })

        // Se resuelve al instante: sin pasarela real (contexto, sección 7)
        await payment.update({ transactionState: approved ? TRANSACTION_STATES.APPROVED : TRANSACTION_STATES.REJECTED }, { transaction })

        let recovered = false
        if (approved) {
            await fee.update({ feeState: FEE_STATES.PAID }, { transaction })
            recovered = await recoverIfRegularized(fee.member, actorOf(user), transaction)
        }

        await logger(actorOf(user), approved ? LOG_ACTIONS.PAYMENT_APPROVED : LOG_ACTIONS.PAYMENT_REJECTED,
            `Cuota ${fee.period} de ${fullNameOf(fee.member.user)} (Nº ${fee.member.numMember}), ${money(payment.amount)}, `
            + `tarjeta terminada en ${last4}, código ${payment.confirmationCode}`, { transaction })

        return { fee, payment, recovered }
    })

    return {
        payment: { ...formatPayment(result.payment), period: result.fee.period },
        feeState: result.fee.feeState,
        recovered: result.recovered
    }
}

// Pago en secretaría (fees.manage): pago Aprobado a nombre del Admin, con código SEC- y una nota opcional en la bitácora
async function registerPayment(actor, feeId, { note }) {
    const cleanNote = note?.trim() || null

    const result = await sequelize.transaction(async (transaction) => {
        const fee = await lockUnpaidFee({ id: feeId, clubId: actor.clubId }, transaction)

        const payment = await Payment.create({
            clubId: actor.clubId,
            userId: actor.id,
            feeId: fee.id,
            amount: totalOf(fee),
            transactionState: TRANSACTION_STATES.APPROVED,
            confirmationCode: await newConfirmationCode('SEC', transaction)
        }, { transaction })

        await fee.update({ feeState: FEE_STATES.PAID }, { transaction })
        const recovered = await recoverIfRegularized(fee.member, actorOf(actor), transaction)

        await logger(actorOf(actor), LOG_ACTIONS.FEE_PAID_MANUAL,
            `Cuota ${fee.period} de ${fullNameOf(fee.member.user)} (Nº ${fee.member.numMember}), ${money(payment.amount)}, `
            + `código ${payment.confirmationCode}. Nota: ${cleanNote ?? 'sin nota'}`, { transaction })

        return { fee, payment, recovered }
    })

    return {
        payment: { ...formatPayment(result.payment), period: result.fee.period },
        feeState: result.fee.feeState,
        recovered: result.recovered
    }
}

// ---------- Gestión del Admin (fees.manage) ----------

// Cuotas del club de a FEES_PAGE_SIZE, con el socio. Filtros: período (por defecto, el actual), estado y búsqueda (cada
// palabra en el nombre, el apellido, el DNI o el número de socio). summary: cantidad y monto por estado del período
async function listFees(user, { period, state, search = '', page = 1 }) {
    page = Number(page) || 1   // Con Express 5 req.query es de solo lectura: el toInt del validator no llega hasta acá
    const today = todayAR()
    const selected = period || periodOf(today)
    const words = String(search).trim().split(/\s+/).filter(Boolean)
    const fields = ['$member.user.name$', '$member.user.lastName$', '$member.user.dni$', '$member.numMember$']

    const where = {
        clubId: user.clubId,
        period: selected,
        ...(state && { feeState: Number(state) }),
        ...(words.length > 0 && {
            [Op.and]: words.map(word => ({ [Op.or]: fields.map(field => ({ [field]: { [Op.like]: `%${word}%` } })) }))
        })
    }

    const [{ count, rows }, totals] = await Promise.all([
        Fee.findAndCountAll({
            where,
            include: [{ model: Member, as: 'member', attributes: ['id', 'numMember', 'memberStateId'], include: [{ model: User, as: 'user', attributes: ['name', 'lastName'] }] }],
            order: [[{ model: Member, as: 'member' }, { model: User, as: 'user' }, 'lastName', 'ASC'], [{ model: Member, as: 'member' }, { model: User, as: 'user' }, 'name', 'ASC'], ['id', 'ASC']],
            limit: FEES_PAGE_SIZE,
            offset: (page - 1) * FEES_PAGE_SIZE
        }),
        Fee.findAll({
            where: { clubId: user.clubId, period: selected },
            attributes: ['feeState', [sequelize.fn('COUNT', sequelize.col('id')), 'count'], [sequelize.fn('SUM', sequelize.literal('socialAmount + sportAmount')), 'amount']],
            group: ['feeState'],
            raw: true
        })
    ])

    const summaryOf = (feeState) => {
        const row = totals.find(item => item.feeState === feeState)
        return { count: Number(row?.count ?? 0), amount: toAmount(row?.amount ?? 0) }
    }

    return {
        period: selected,
        summary: { paid: summaryOf(FEE_STATES.PAID), pending: summaryOf(FEE_STATES.PENDING), overdue: summaryOf(FEE_STATES.OVERDUE) },
        items: rows.map(fee => ({
            ...formatFee(fee, today),
            member: { id: fee.member.id, name: fullNameOf(fee.member.user), numMember: fee.member.numMember, memberStateId: fee.member.memberStateId }
        })),
        total: count,
        page,
        pageSize: FEES_PAGE_SIZE,
        totalPages: Math.max(1, Math.ceil(count / FEES_PAGE_SIZE))
    }
}

// ---------- Representante (fees.viewPlayers) ----------

// Jugadoras con una inscripción Aprobada en los deportes del alcance (getSportScope), con su situación: al día, con
// cuotas pendientes o con cuotas vencidas, y los días de atraso. Sin montos. canBeCited: false si tiene mora (la misma
// regla de las citaciones: Suspendida o atraso mayor al plazo del club). status: filtro por situación
async function listPlayers(user, { status, search = '' }) {
    const today = todayAR()
    const scope = await getSportScope(user)
    const words = String(search).trim().toLowerCase().split(/\s+/).filter(Boolean)

    const [members, club] = await Promise.all([
        Member.findAll({
            where: { clubId: user.clubId, memberStateId: BILLABLE_MEMBER_STATES },
            include: [
                { model: User, as: 'user', attributes: ['name', 'lastName', 'dni'] },
                {
                    model: Inscription,
                    as: 'inscriptions',
                    attributes: ['clubSportId'],
                    where: { inscriptionState: INSCRIPTION_STATES.APPROVED, ...(scope.clubSportId && { clubSportId: scope.clubSportId }) },
                    include: [{ model: ClubSport, as: 'clubSport', attributes: ['id'], include: [{ model: Sport, as: 'sport', attributes: ['name'] }] }]
                },
                { model: Fee, as: 'fees', attributes: ['feeState', 'expirationDate'], required: false, where: { feeState: { [Op.ne]: FEE_STATES.PAID } } }
            ],
            order: [[{ model: User, as: 'user' }, 'lastName', 'ASC'], [{ model: User, as: 'user' }, 'name', 'ASC']]
        }),
        Club.findByPk(user.clubId, { attributes: ['delayFee'] })
    ])

    const items = members.map(member => {
        const overdueDays = Math.max(0, ...member.fees.map(fee => overdueDaysOf(fee, today)))
        let playerStatus = PLAYER_STATUS.OK
        if (overdueDays > 0 || member.fees.some(fee => fee.feeState === FEE_STATES.OVERDUE)) playerStatus = PLAYER_STATUS.OVERDUE
        else if (member.fees.length > 0) playerStatus = PLAYER_STATUS.PENDING

        return {
            memberId: member.id,
            name: fullNameOf(member.user),
            numMember: member.numMember,
            memberStateId: member.memberStateId,
            sports: member.inscriptions.map(inscription => inscription.clubSport.sport.name),
            status: playerStatus,
            overdueDays,
            canBeCited: member.memberStateId !== MEMBER_STATES.SUSPENDED && overdueDays <= club.delayFee,
            searchText: `${member.user.name} ${member.user.lastName} ${member.user.dni} ${member.numMember}`.toLowerCase()
        }
    })

    return {
        delayFee: club.delayFee,
        items: items
            .filter(item => !status || item.status === status)
            .filter(item => words.every(word => item.searchText.includes(word)))
            .map(({ searchText, ...item }) => item)
    }
}

module.exports = {
    getOverdueDays,
    generateFeesForPeriod,
    generateMonthlyFees,
    generateFees,
    runDailyFeeCheck,
    getMine,
    getLinked,
    getMemberAccount,
    payFee,
    registerPayment,
    listFees,
    listPlayers,
    PLAYER_STATUS
}

// Service de fees: cuotas sociales y deportivas, y pagos simulados.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
//
// Reglas (D12, contexto sección 6): la cuota del mes se genera el día 1 y vence el 10, a los socios ACTIVE o SUSPENDED
// dados de alta antes del día 1. Los montos se fijan al generarla. Las funciones de los jobs reciben la fecha de
// referencia (today, 'AAAA-MM-DD') para poder probarlas con cualquier fecha. La mora se calcula con getOverdueDays.
// Medios de pago (P14b): tarjeta (simulada, PAY-), transferencia con comprobante que revisa el club (TRF-) y pago en
// secretaría (SEC-). Todo pago Aprobado tiene un comprobante de pago (getVoucher).
// Lo que se paga (payable) es una cuota (fee) o un cargo eventual de un socio (chargeMember, ver fees.charges.service.js):
// los pagos, las transferencias, la revisión y los comprobantes son los mismos para los dos. Solo las cuotas son mora.
const crypto = require('crypto')
const fs = require('fs/promises')
const path = require('path')
const { Op } = require('sequelize')

const sequelize = require('../../config/db')
const {
    Fee, Payment, Member, User, Club, Inscription, ClubSport, Sport, Notification, Charge, ChargeMember
} = require('../../models')
const { getEffectivePermissions, getActiveUsersWithPermission } = require('../access/access.service')
const { getBankInfo } = require('../clubs/clubs.service')
const { getSportScope } = require('../staff/staff.service')
const { notify } = require('../notifications/notifications.service')
const { itemsInReview, markOverdueCharges } = require('./fees.charges.service')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { today: todayAR, daysBetween, dateTimeParts, getAge, TIME_ZONE } = require('../../utils/dates')
const { resolveUploadPath, cloudinaryRefOf, deleteUpload, downloadPrivateFile } = require('../../utils/files')
const {
    FEE_STATES,
    CHARGE_STATES,
    TRANSACTION_STATES,
    PAYMENT_METHODS,
    MEMBER_STATES,
    INSCRIPTION_STATES,
    FEE_DUE_DAY,
    FEE_DUE_SOON_DAYS,
    FEE_OVERDUE_REMINDER_DAYS,
    LOG_ACTIONS
} = require('../../utils/constants')
const { PERMISSIONS } = require('../../utils/permissions')
const { fees: m, upload: uploadMessages, notificationTexts: texts } = require('../../utils/messages')

const FEES_PAGE_SIZE = 20
const PAYMENTS_PAGE_SIZE = 20

// Socios a los que se les genera la cuota (la deuda sigue corriendo aunque estén suspendidos)
const BILLABLE_MEMBER_STATES = [MEMBER_STATES.ACTIVE, MEMBER_STATES.SUSPENDED]

const UNPAID_STATES = [FEE_STATES.PENDING, FEE_STATES.OVERDUE]
const UNPAID_CHARGE_STATES = [CHARGE_STATES.PENDING, CHARGE_STATES.OVERDUE]

// Lo que se paga: una cuota o un cargo eventual de un socio (el :kind de las rutas)
const PAYABLE = { FEE: 'fee', CHARGE: 'charge' }

// Situación de una jugadora en la vista del Representante
const PLAYER_STATUS = { OK: 'ok', PENDING: 'pending', OVERDUE: 'overdue' }

// Tarjetas que el pago simulado rechaza (para poder mostrar un rechazo)
const REJECTED_CARD_SUFFIX = '0000'

const SYSTEM = (clubId) => ({ clubId, userId: null, roleId: null })

// Filtro de los jobs por club: clubIds null → todos los clubes
const clubScope = (clubIds, field = 'clubId') => (clubIds ? { [field]: clubIds } : {})

const actorOf = ({ id: userId, clubId, activeRoleId }) => ({ clubId, userId, roleId: activeRoleId })

const fullNameOf = (user) => `${user.name} ${user.lastName}`

const toAmount = (value) => Math.round(Number(value) * 100) / 100

const totalOf = (fee) => toAmount(Number(fee.socialAmount) + Number(fee.sportAmount))

// $40.000 (sin decimales si no los tiene; con centavos, $9.500,50)
const money = (value) => `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2, maximumFractionDigits: 2 })}`

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
const monthNameOf = (period) => new Intl.DateTimeFormat('es-AR', { month: 'long', timeZone: TIME_ZONE }).format(noonOf(`${period}-15`))

const expirationOf = (period) => `${period}-${pad(FEE_DUE_DAY)}`

// Días de atraso de una cuota impaga ya vencida (0 si está paga o todavía no venció)
function overdueDaysOf(fee, today) {
    if (fee.feeState === FEE_STATES.PAID || fee.expirationDate >= today) return 0
    return daysBetween(fee.expirationDate, today)
}

// ---------- Mora ----------

// Transferencia en revisión: un pago por transferencia todavía Pendiente
const IN_REVIEW = { method: PAYMENT_METHODS.TRANSFER, transactionState: TRANSACTION_STATES.PENDING }

// Ids de las cuotas (de feeIds) que tienen una transferencia en revisión
async function feesInReview(feeIds, { transaction } = {}) {
    if (feeIds.length === 0) return new Set()
    const rows = await Payment.findAll({ where: { feeId: feeIds, ...IN_REVIEW }, attributes: ['feeId'], raw: true, transaction })
    return new Set(rows.map(row => row.feeId))
}

// Días de atraso de un socio: los días entre hoy y el vencimiento de su cuota no Pagada más vieja que ya venció.
// 0 si no tiene cuotas vencidas. La mora no es un estado: se calcula desde expirationDate (contexto, sección 6).
// Es la única cuenta de la mora: la usan las citaciones, el chequeo diario, la recuperación y las pantallas.
// Una cuota con una transferencia en revisión (Pendiente) NO cuenta: así una demora del club en revisarla no suspende
// al socio ni le impide ser citado (P14b). Igual puede pasar a Vencida si llega al vencimiento sin aprobarse.
// options.today: fecha de referencia (por defecto, hoy en Argentina)
async function getOverdueDays(memberId, { transaction, today = todayAR() } = {}) {
    const expired = await Fee.findAll({
        where: { memberId, feeState: { [Op.ne]: FEE_STATES.PAID }, expirationDate: { [Op.lt]: today } },
        attributes: ['id', 'expirationDate'],
        order: [['expirationDate', 'ASC']],
        transaction
    })

    const inReview = await feesInReview(expired.map(fee => fee.id), { transaction })
    const oldest = expired.find(fee => !inReview.has(fee.id))
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
// clubIds: los clubes en los que corre (el job saltea los bloqueados por integridad); por defecto, todos
async function generateMonthlyFees(today = todayAR(), { clubIds = null } = {}) {
    const period = periodOf(today)
    const clubs = await Club.findAll({ where: clubScope(clubIds, 'id'), attributes: ['id'] })
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
async function notifyDueSoon(today, clubIds) {
    const dueDate = addDays(today, FEE_DUE_SOON_DAYS)
    const fees = await Fee.findAll({ where: { ...clubScope(clubIds), feeState: FEE_STATES.PENDING, expirationDate: dueDate }, include: [includeMemberUser] })

    let sent = 0
    for (const fee of fees) {
        const { weekday, dayMonth } = dateTimeParts(noonOf(fee.expirationDate))
        const text = texts.feeDueSoon({ month: monthNameOf(fee.period), year: fee.period.slice(0, 4), weekday, dayMonth, amount: money(totalOf(fee)) })
        if (await alreadyNotified(fee.clubId, fee.member.userId, 'FEE_DUE_SOON', text.title)) continue

        await notify({
            clubId: fee.clubId,
            type: 'FEE_DUE_SOON',
            recipientUserIds: [fee.member.userId],
            ...text,
            includeFamily: true
        })
        sent++
    }
    return sent
}

// 2. Cuotas Pendientes con el vencimiento ya pasado: pasan a Vencida y se avisa FEE_OVERDUE (in-app y email)
async function markOverdue(today, clubIds) {
    const fees = await Fee.findAll({ where: { ...clubScope(clubIds), feeState: FEE_STATES.PENDING, expirationDate: { [Op.lt]: today } }, include: [includeMemberUser] })

    for (const fee of fees) {
        const month = monthNameOf(fee.period)
        const { dayMonth } = dateTimeParts(noonOf(fee.expirationDate))

        await sequelize.transaction(async (transaction) => {
            await fee.update({ feeState: FEE_STATES.OVERDUE }, { transaction })
            await notify({
                clubId: fee.clubId,
                type: 'FEE_OVERDUE',
                recipientUserIds: [fee.member.userId],
                ...texts.feeOverdue({ month, year: fee.period.slice(0, 4), dayMonth }),
                includeFamily: true
            }, { transaction })
        })
    }
    return fees.length
}

// Cuotas Vencidas agrupadas por socio: Map memberId → { member, fees }
async function overdueFeesByMember(clubIds) {
    const fees = await Fee.findAll({ where: { ...clubScope(clubIds), feeState: FEE_STATES.OVERDUE }, include: [includeMemberUser] })
    const byMember = new Map()

    for (const fee of fees) {
        if (!BILLABLE_MEMBER_STATES.includes(fee.member.memberStateId)) continue
        if (!byMember.has(fee.memberId)) byMember.set(fee.memberId, { member: fee.member, clubId: fee.clubId, fees: [] })
        byMember.get(fee.memberId).fees.push(fee)
    }
    return byMember
}

// 3. Recordatorio de mora: a los socios cuyo atraso es múltiplo de FEE_OVERDUE_REMINDER_DAYS, un FEE_OVERDUE con el resumen
async function sendReminders(today, delayFeeOf, clubIds) {
    let sent = 0

    for (const { member, clubId, fees } of (await overdueFeesByMember(clubIds)).values()) {
        const days = await getOverdueDays(member.id, { today })
        if (days === 0 || days % FEE_OVERDUE_REMINDER_DAYS !== 0) continue

        const total = fees.reduce((sum, fee) => sum + totalOf(fee), 0)
        const text = texts.feeOverdueReminder({ days, count: fees.length, amount: money(total), delayFee: delayFeeOf.get(clubId) })
        if (await alreadyNotified(clubId, member.userId, 'FEE_OVERDUE', text.title)) continue

        await notify({
            clubId,
            type: 'FEE_OVERDUE',
            recipientUserIds: [member.userId],
            ...text,
            includeFamily: true
        })
        sent++
    }
    return sent
}

// 4. Suspensión: los socios ACTIVE con más días de atraso que el plazo del club pasan a SUSPENDED (con aviso por email)
async function suspendOverdueMembers(today, delayFeeOf, clubIds) {
    const members = await Member.findAll({
        where: { ...clubScope(clubIds), memberStateId: MEMBER_STATES.ACTIVE },
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
                ...texts.memberSuspended({ delayFee }),
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
// clubIds: los clubes en los que corre (el job saltea los bloqueados por integridad); por defecto, todos
async function runDailyFeeCheck(today = todayAR(), { clubIds = null } = {}) {
    const clubs = await Club.findAll({ where: clubScope(clubIds, 'id'), attributes: ['id', 'delayFee'] })
    const delayFeeOf = new Map(clubs.map(club => [club.id, club.delayFee]))

    const dueSoon = await notifyDueSoon(today, clubIds)
    const overdue = await markOverdue(today, clubIds)
    const reminders = await sendReminders(today, delayFeeOf, clubIds)
    const suspended = await suspendOverdueMembers(today, delayFeeOf, clubIds)
    const chargesOverdue = await markOverdueCharges(today, clubIds)   // Cargos eventuales: no son mora

    return { today, dueSoon, overdue, reminders, suspended, chargesOverdue }
}

// ---------- Estado de cuenta ----------

// inReview: tiene una transferencia en revisión (no suma días de atraso, ver getOverdueDays)
function formatFee(fee, today, inReview = false) {
    return {
        id: fee.id,
        kind: PAYABLE.FEE,
        period: fee.period,
        socialAmount: toAmount(fee.socialAmount),
        sportAmount: toAmount(fee.sportAmount),
        total: totalOf(fee),
        expirationDate: fee.expirationDate,
        feeState: fee.feeState,
        overdueDays: inReview ? 0 : overdueDaysOf(fee, today),
        inReview
    }
}

// Cargo eventual de un socio (chargeMember con su charge). overdueDays es solo informativo: un cargo no es mora
function formatChargeItem(item, today, inReview = false) {
    const unpaid = UNPAID_CHARGE_STATES.includes(item.chargeState)
    return {
        id: item.id,
        kind: PAYABLE.CHARGE,
        chargeId: item.chargeId,
        concept: item.charge.concept,
        description: item.charge.description,
        total: toAmount(item.charge.amount),
        expirationDate: item.charge.expirationDate,
        chargeState: item.chargeState,
        overdueDays: unpaid && !inReview && item.charge.expirationDate < today ? daysBetween(item.charge.expirationDate, today) : 0,
        inReview
    }
}

const isRejectedTransfer = (payment) => payment.method === PAYMENT_METHODS.TRANSFER && payment.transactionState === TRANSACTION_STATES.REJECTED

// Pago para el socio y la Familia. hasVoucher: tiene comprobante de pago (todo pago Aprobado). La nota solo se muestra
// cuando es el motivo del rechazo de una transferencia (la del pago en secretaría es interna del club).
// kind: si es de una cuota (period) o de un cargo eventual (concept)
function formatPayment(payment) {
    return {
        id: payment.id,
        kind: payment.chargeMemberId ? PAYABLE.CHARGE : PAYABLE.FEE,
        feeId: payment.feeId,
        chargeMemberId: payment.chargeMemberId,
        period: payment.fee?.period ?? null,
        concept: payment.chargeMember?.charge?.concept ?? null,
        amount: toAmount(payment.amount),
        method: payment.method,
        transactionState: payment.transactionState,
        confirmationCode: payment.confirmationCode,
        hasReceipt: Boolean(payment.receiptUrl),
        hasVoucher: payment.transactionState === TRANSACTION_STATES.APPROVED,
        rejectionReason: isRejectedTransfer(payment) ? payment.note : null,
        createdAt: payment.createdAt
    }
}

const isInReviewPayment = (payment) => payment.method === IN_REVIEW.method && payment.transactionState === IN_REVIEW.transactionState

// Estado de cuenta de un socio: sus cuotas (la más reciente primero), sus cargos eventuales no anulados (el que vence
// último primero), el total adeudado (cuotas y cargos), los días de atraso (solo cuotas) y los pagos
async function accountOf(member, { canPay }) {
    const today = todayAR()
    const [fees, charges, payments, club] = await Promise.all([
        Fee.findAll({ where: { memberId: member.id }, order: [['period', 'DESC']] }),
        ChargeMember.findAll({
            where: { memberId: member.id, chargeState: { [Op.ne]: CHARGE_STATES.CANCELLED } },
            include: [{ model: Charge, as: 'charge' }],
            order: [[{ model: Charge, as: 'charge' }, 'expirationDate', 'DESC'], ['id', 'DESC']]
        }),
        Payment.findAll({
            where: { [Op.or]: [{ '$fee.memberId$': member.id }, { '$chargeMember.memberId$': member.id }] },
            include: [
                { model: Fee, as: 'fee', attributes: ['period', 'memberId'], required: false },
                { model: ChargeMember, as: 'chargeMember', attributes: ['id', 'memberId'], required: false, include: [{ model: Charge, as: 'charge', attributes: ['concept'] }] }
            ],
            order: [['createdAt', 'DESC'], ['id', 'DESC']]
        }),
        Club.findByPk(member.clubId, { attributes: ['delayFee'] })
    ])

    const inReview = payments.filter(isInReviewPayment)
    const feesInReviewIds = new Set(inReview.map(payment => payment.feeId).filter(Boolean))
    const chargesInReviewIds = new Set(inReview.map(payment => payment.chargeMemberId).filter(Boolean))

    const feeItems = fees.map(fee => formatFee(fee, today, feesInReviewIds.has(fee.id)))
    const chargeItems = charges.map(item => formatChargeItem(item, today, chargesInReviewIds.has(item.id)))
    const unpaidFees = feeItems.filter(fee => fee.feeState !== FEE_STATES.PAID)
    const unpaidCharges = chargeItems.filter(item => UNPAID_CHARGE_STATES.includes(item.chargeState))

    return {
        member: {
            id: member.id,
            name: fullNameOf(member.user),
            numMember: member.numMember,
            memberStateId: member.memberStateId,
            isAdult: getAge(member.user.birthDate) >= 18
        },
        totalDue: toAmount([...unpaidFees, ...unpaidCharges].reduce((sum, item) => sum + item.total, 0)),
        chargesDue: toAmount(unpaidCharges.reduce((sum, item) => sum + item.total, 0)),
        overdueDays: await getOverdueDays(member.id, { today }),
        delayFee: club.delayFee,
        canPay,
        fees: feeItems,
        charges: chargeItems,
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

// ---------- Lo que se paga: una cuota o un cargo eventual ----------

const describeFee = (fee) => `Cuota ${fee.period} de ${fullNameOf(fee.member.user)} (Nº ${fee.member.numMember})`

// Lo que necesitan los pagos de una cuota o de un cargo, igual para los dos:
//   - record: la fila (fee o chargeMember), member: su socio con el usuario, amount: el total a pagar;
//   - name y what: cómo se nombra en los avisos ("noviembre" / "la cuota de noviembre", o el concepto del cargo);
//   - describe: cómo se nombra en la bitácora; ref: la columna del pago (feeId o chargeMemberId);
//   - paidState: el cambio de estado al aprobarse el pago; countsForMora: solo las cuotas (recuperación automática)
function payableOfFee(fee) {
    const month = monthNameOf(fee.period)
    return {
        kind: PAYABLE.FEE,
        record: fee,
        member: fee.member,
        amount: totalOf(fee),
        name: month,
        what: `la cuota de ${month}`,
        describe: describeFee(fee),
        ref: { feeId: fee.id },
        paidState: { feeState: FEE_STATES.PAID },
        state: () => fee.feeState,
        countsForMora: true
    }
}

function payableOfCharge(item) {
    const { concept } = item.charge
    return {
        kind: PAYABLE.CHARGE,
        record: item,
        member: item.member,
        amount: toAmount(item.charge.amount),
        name: concept,
        what: `«${concept}»`,
        describe: `Cargo «${concept}» de ${fullNameOf(item.member.user)} (Nº ${item.member.numMember})`,
        ref: { chargeMemberId: item.id },
        paidState: { chargeState: CHARGE_STATES.PAID },
        state: () => item.chargeState,
        countsForMora: false
    }
}

// Función (y no un objeto fijo): Sequelize modifica los include, y uno compartido por dos ramas de la misma consulta falla
const includeItemMember = () => ({ model: Member, as: 'member', include: [{ ...includeUser }] })

// Lo que se paga, bloqueado para pagarlo. Solo impagos (si no, 409) y sin una transferencia en revisión (mientras
// exista, no se paga de otra forma: 409). where: { id, clubId, memberId? }
async function lockUnpaid(kind, where, transaction) {
    if (kind === PAYABLE.FEE) {
        const fee = await Fee.findOne({ where, include: [includeItemMember()], transaction, lock: transaction.LOCK.UPDATE })
        if (!fee) throw createError(m.feeNotFound, 404)
        if (!UNPAID_STATES.includes(fee.feeState)) throw createError(m.alreadyPaid, 409)
        if ((await feesInReview([fee.id], { transaction })).size > 0) throw createError(m.transferInReview, 409)
        return payableOfFee(fee)
    }

    const item = await ChargeMember.findOne({ where, include: [{ model: Charge, as: 'charge' }, includeItemMember()], transaction, lock: transaction.LOCK.UPDATE })
    if (!item) throw createError(m.chargeItemNotFound, 404)
    if (item.chargeState === CHARGE_STATES.CANCELLED) throw createError(m.chargeCancelled, 409)
    if (!UNPAID_CHARGE_STATES.includes(item.chargeState)) throw createError(m.chargeAlreadyPaid, 409)
    if ((await itemsInReview([item.id], { transaction })).size > 0) throw createError(m.chargeInReview, 409)
    return payableOfCharge(item)
}

// Lo que paga un pago ya creado (para revisar una transferencia), bloqueado
async function lockPayableOf(payment, transaction) {
    if (payment.feeId) {
        const fee = await Fee.findByPk(payment.feeId, { include: [includeItemMember()], transaction, lock: transaction.LOCK.UPDATE })
        return payableOfFee(fee)
    }
    const item = await ChargeMember.findByPk(payment.chargeMemberId, { include: [{ model: Charge, as: 'charge' }, includeItemMember()], transaction, lock: transaction.LOCK.UPDATE })
    return payableOfCharge(item)
}

// Respuesta de los pagos: el pago (con su período o su concepto), el estado de lo pagado y si el socio se recuperó
const paymentResult = ({ payment, payable, recovered = false }) => ({
    payment: {
        ...formatPayment(payment),
        period: payable.kind === PAYABLE.FEE ? payable.record.period : null,
        concept: payable.kind === PAYABLE.CHARGE ? payable.name : null
    },
    state: payable.state(),
    recovered
})

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

// Marca como pagado lo que se pagó y, si es una cuota, aplica la recuperación automática. Devuelve si se recuperó
async function markPaid(payable, actor, transaction) {
    await payable.record.update(payable.paidState, { transaction })
    return payable.countsForMora ? recoverIfRegularized(payable.member, actor, transaction) : false
}

// Socios cuyas cuotas y cargos puede pagar el usuario: el propio (con fees.payOwn) y sus vinculadas (con fees.manageLinked)
async function payableMemberIds(user) {
    const permissions = await getEffectivePermissions(user.id, user.activeRoleId)
    const conditions = []
    if (permissions.includes(PERMISSIONS.FEES_PAY_OWN)) conditions.push({ userId: user.id })
    if (permissions.includes(PERMISSIONS.FEES_MANAGE_LINKED)) conditions.push({ adultUserId: user.id, linkStatus: true })
    if (conditions.length === 0) return []

    const members = await Member.findAll({ where: { clubId: user.clubId, [Op.or]: conditions }, attributes: ['id'], raw: true })
    return members.map(member => member.id)
}

// Si paga el adulto por una vinculada, el aviso dice de quién es
const forWhomOf = (payable, user) => (payable.member.userId === user.id ? '' : ` de ${fullNameOf(payable.member.user)}`)

// Pago simulado con tarjeta (fees.payOwn o fees.manageLinked) de una cuota o un cargo (kind). Tiene que ser del socio
// logueado (con payOwn) o de una socia vinculada (con manageLinked); si no, 404. No se guarda la tarjeta: si se
// aprueba, solo los últimos 4 dígitos en payment.note ("Tarjeta ****1234"), para el comprobante; en la bitácora,
// también solo los últimos 4. Si se aprueba, avisa PAYMENT_RECEIVED (in-app) a quienes gestionan cuotas, salvo a quien pagó.
async function payItem(user, kind, id, { cardNumber }) {
    const allowed = await payableMemberIds(user)

    const last4 = String(cardNumber).slice(-4)
    const approved = !String(cardNumber).endsWith(REJECTED_CARD_SUFFIX)
    const managers = approved
        ? (await getActiveUsersWithPermission(user.clubId, PERMISSIONS.FEES_MANAGE)).filter(managerId => managerId !== user.id)
        : []

    return paymentResult(await sequelize.transaction(async (transaction) => {
        const payable = await lockUnpaid(kind, { id, clubId: user.clubId, memberId: allowed }, transaction)

        const payment = await Payment.create({
            clubId: user.clubId,
            userId: user.id,
            ...payable.ref,
            amount: payable.amount,
            method: PAYMENT_METHODS.CARD,
            transactionState: TRANSACTION_STATES.PENDING,
            confirmationCode: await newConfirmationCode('PAY', transaction)
        }, { transaction })

        // Se resuelve al instante: sin pasarela real (contexto, sección 7)
        await payment.update(approved
            ? { transactionState: TRANSACTION_STATES.APPROVED, note: `Tarjeta ****${last4}` }
            : { transactionState: TRANSACTION_STATES.REJECTED }, { transaction })

        const recovered = approved ? await markPaid(payable, actorOf(user), transaction) : false

        await logger(actorOf(user), approved ? LOG_ACTIONS.PAYMENT_APPROVED : LOG_ACTIONS.PAYMENT_REJECTED,
            `${payable.describe}, ${money(payment.amount)}, tarjeta terminada en ${last4}, código ${payment.confirmationCode}`, { transaction })

        if (approved && managers.length > 0) {
            const payer = await User.findByPk(user.id, { attributes: ['id', 'name', 'lastName'], transaction })
            await notify({
                clubId: user.clubId,
                type: 'PAYMENT_RECEIVED',
                recipientUserIds: managers,
                ...texts.paymentReceived({ payer: fullNameOf(payer), amount: money(payment.amount), what: payable.what, forWhom: forWhomOf(payable, user), recovered })
            }, { transaction })
        }

        return { payment, payable, recovered }
    }))
}

// Pago en secretaría (fees.manage) de una cuota o un cargo: pago Aprobado a nombre del Admin, con código SEC- y una
// nota opcional
async function registerPayment(actor, kind, id, { note }) {
    const cleanNote = note?.trim() || null

    return paymentResult(await sequelize.transaction(async (transaction) => {
        const payable = await lockUnpaid(kind, { id, clubId: actor.clubId }, transaction)

        const payment = await Payment.create({
            clubId: actor.clubId,
            userId: actor.id,
            ...payable.ref,
            amount: payable.amount,
            method: PAYMENT_METHODS.CASH,
            transactionState: TRANSACTION_STATES.APPROVED,
            confirmationCode: await newConfirmationCode('SEC', transaction),
            note: cleanNote
        }, { transaction })

        const recovered = await markPaid(payable, actorOf(actor), transaction)

        await logger(actorOf(actor), LOG_ACTIONS.FEE_PAID_MANUAL,
            `${payable.describe}, ${money(payment.amount)}, código ${payment.confirmationCode}. Nota: ${cleanNote ?? 'sin nota'}`, { transaction })

        return { payment, payable, recovered }
    }))
}

// ---------- Transferencias (P14b) ----------

// Datos para transferencias del club (fees.payOwn o fees.manageLinked). bankInfo: null si el club no los cargó
async function getTransferInfo(user) {
    return { bankInfo: await getBankInfo(user.clubId) }
}

// Tipo de cada comprobante, por su extensión (para devolverlo con receipt-file)
const RECEIPT_CONTENT_TYPES = { '.jpg': 'image/jpeg', '.png': 'image/png', '.pdf': 'application/pdf' }

// Informar una transferencia (fees.payOwn o fees.manageLinked) de una cuota o un cargo: lo mismo que se puede pagar
// con tarjeta, por el total. Crea un pago Pendiente con el comprobante adjunto y código TRF-; lo pagado no cambia
// hasta que lo revisa el club. Avisa PAYMENT_REVIEW_REQUEST a quienes gestionan cuotas. Si algo falla, se borra el
// archivo subido
async function reportTransfer(user, kind, id, file) {
    if (!file) throw createError(m.receiptRequired, 400)
    const receiptUrl = file.url   // Ruta local o secure_url de Cloudinary. El middleware upload ya revisó sus primeros bytes

    try {
        if (!await getBankInfo(user.clubId)) throw createError(m.noBankInfo, 409)

        const allowed = await payableMemberIds(user)
        const managers = await getActiveUsersWithPermission(user.clubId, PERMISSIONS.FEES_MANAGE)

        return paymentResult(await sequelize.transaction(async (transaction) => {
            const payable = await lockUnpaid(kind, { id, clubId: user.clubId, memberId: allowed }, transaction)
            const payer = await User.findByPk(user.id, { attributes: ['id', 'name', 'lastName'], transaction })

            const payment = await Payment.create({
                clubId: user.clubId,
                userId: user.id,
                ...payable.ref,
                amount: payable.amount,
                method: PAYMENT_METHODS.TRANSFER,
                transactionState: TRANSACTION_STATES.PENDING,
                confirmationCode: await newConfirmationCode('TRF', transaction),
                receiptUrl
            }, { transaction })

            await logger(actorOf(user), LOG_ACTIONS.TRANSFER_REPORTED,
                `${payable.describe}, ${money(payment.amount)}, código ${payment.confirmationCode}`, { transaction })

            await notify({
                clubId: user.clubId,
                type: 'PAYMENT_REVIEW_REQUEST',
                recipientUserIds: managers,
                ...texts.paymentReviewRequest({ payer: fullNameOf(payer), amount: money(payment.amount), what: payable.what, forWhom: forWhomOf(payable, user) })
            }, { transaction })

            return { payment, payable }
        }))

    } catch (error) {
        await deleteUpload(receiptUrl)
        throw error
    }
}

// Pago con lo que paga (su cuota o su cargo), su socio y quien pagó
const includePaymentDetail = () => [
    { model: Fee, as: 'fee', required: false, include: [includeItemMember()] },
    { model: ChargeMember, as: 'chargeMember', required: false, include: [{ model: Charge, as: 'charge' }, includeItemMember()] },
    { model: User, as: 'user', attributes: ['id', 'name', 'lastName'] }
]

// Socio de un pago (el de su cuota o el de su cargo), con includePaymentDetail
const memberOfPayment = (payment) => payment.fee?.member ?? payment.chargeMember?.member

// Transferencia a revisar (fees.manage), bloqueada con lo que paga. Solo las Pendientes (si no, 409)
async function lockTransferInReview(actor, paymentId, transaction) {
    const payment = await Payment.findOne({ where: { id: paymentId, clubId: actor.clubId }, transaction, lock: transaction.LOCK.UPDATE })
    if (!payment) throw createError(m.paymentNotFound, 404)
    if (!isInReviewPayment(payment)) throw createError(m.notReviewable, 409)

    return { payment, payable: await lockPayableOf(payment, transaction) }
}

// Aviso del resultado a quien pagó y al socio (con su adulto, si es menor)
const notifyTransferResult = (actor, payment, payable, { title, message }, transaction) => notify({
    clubId: actor.clubId,
    type: 'PAYMENT_RESULT',
    recipientUserIds: [...new Set([payment.userId, payable.member.userId])],
    title,
    message,
    transmitterId: actor.id,
    includeFamily: true
}, { transaction })

// Aprobar: el pago pasa a Aprobado, lo pagado a Pagado y, si es una cuota, aplica la recuperación automática
async function approveTransfer(actor, paymentId) {
    return paymentResult(await sequelize.transaction(async (transaction) => {
        const { payment, payable } = await lockTransferInReview(actor, paymentId, transaction)

        await payment.update({ transactionState: TRANSACTION_STATES.APPROVED }, { transaction })
        const recovered = await markPaid(payable, actorOf(actor), transaction)

        await logger(actorOf(actor), LOG_ACTIONS.PAYMENT_APPROVED,
            `${payable.describe}, ${money(payment.amount)}, transferencia revisada, código ${payment.confirmationCode}`, { transaction })

        await notifyTransferResult(actor, payment, payable, texts.transferApproved({ name: payable.name, what: payable.what }), transaction)

        return { payment, payable, recovered }
    }))
}

// Rechazar: con un motivo obligatorio (en payment.note). Lo pagado sigue impago y se puede volver a pagar
async function rejectTransfer(actor, paymentId, { reason }) {
    const cleanReason = reason.trim()

    return paymentResult(await sequelize.transaction(async (transaction) => {
        const { payment, payable } = await lockTransferInReview(actor, paymentId, transaction)

        await payment.update({ transactionState: TRANSACTION_STATES.REJECTED, note: cleanReason }, { transaction })

        await logger(actorOf(actor), LOG_ACTIONS.PAYMENT_REJECTED,
            `${payable.describe}, ${money(payment.amount)}, transferencia revisada, código ${payment.confirmationCode}. Motivo: ${cleanReason}`, { transaction })

        await notifyTransferResult(actor, payment, payable, texts.transferRejected({ name: payable.name, what: payable.what, reason: cleanReason }), transaction)

        return { payment, payable }
    }))
}

// ---------- Acceso a un pago: comprobante adjunto y comprobante de pago ----------

// Un pago del club si el usuario puede verlo: quien gestiona cuotas (fees.manage), quien pagó, el socio de la cuota o
// del cargo, o su adulto vinculado. Si no, 404 (no se dice que existe). extraWhere: condiciones del pago (por ejemplo,
// Aprobado)
async function findAccessiblePayment(user, paymentId, extraWhere, notFoundMessage) {
    const payment = await Payment.findOne({ where: { id: paymentId, clubId: user.clubId, ...extraWhere }, include: includePaymentDetail() })
    if (!payment) throw createError(notFoundMessage, 404)

    const member = memberOfPayment(payment)
    const isInvolved = payment.userId === user.id || member.userId === user.id || (member.adultUserId === user.id && member.linkStatus)
    if (isInvolved) return payment

    const permissions = await getEffectivePermissions(user.id, user.activeRoleId)
    if (!permissions.includes(PERMISSIONS.FEES_MANAGE)) throw createError(notFoundMessage, 404)
    return payment
}

// Archivo del comprobante adjunto de una transferencia: { filePath o buffer, contentType, filename }.
//   - en el disco (desarrollo): filePath, para mandarlo con sendFile;
//   - en Cloudinary (producción, raw privado): buffer, descargado con un link firmado de unos 60 segundos que nunca sale
//     al navegador. Si Cloudinary responde error, 404 como cuando no hay acceso
async function getReceiptFile(user, paymentId) {
    const payment = await findAccessiblePayment(user, paymentId, { receiptUrl: { [Op.ne]: null } }, m.receiptNotFound)

    const cloudRef = cloudinaryRefOf(payment.receiptUrl)
    const filePath = cloudRef ? null : resolveUploadPath(payment.receiptUrl)
    const extension = cloudRef ? cloudRef.extension : path.extname(filePath ?? '').toLowerCase()
    if ((!cloudRef && !filePath) || !RECEIPT_CONTENT_TYPES[extension]) throw createError(m.receiptNotFound, 404)

    const file = { contentType: RECEIPT_CONTENT_TYPES[extension], filename: `comprobante-${payment.confirmationCode}${extension}` }

    if (cloudRef) {
        const buffer = await downloadPrivateFile(payment.receiptUrl)
        if (!buffer) throw createError(m.receiptNotFound, 404)
        return { ...file, buffer }
    }

    try {
        await fs.access(filePath)
    } catch {
        throw createError(m.receiptNotFound, 404)
    }

    return { ...file, filePath }
}

// Medio de pago como se muestra en el comprobante. De la tarjeta, solo los últimos 4 dígitos (guardados en note)
function methodLabelOf(payment) {
    if (payment.method === PAYMENT_METHODS.TRANSFER) return 'Transferencia bancaria'
    if (payment.method === PAYMENT_METHODS.CASH) return 'Pago en secretaría'
    const last4 = /\*{4}(\d{4})/.exec(payment.note ?? '')?.[1]
    return last4 ? `Tarjeta terminada en ${last4}` : 'Tarjeta'
}

// Comprobante de pago de un pago Aprobado (cualquier medio). Pendientes y Rechazados no tienen: 404.
// approvedAt: el momento en que el pago pasó a Aprobado (su última modificación; un pago Aprobado ya no se modifica).
// De una cuota: el período y el desglose; de un cargo eventual: el concepto y su descripción
async function getVoucher(user, paymentId) {
    const payment = await findAccessiblePayment(user, paymentId, { transactionState: TRANSACTION_STATES.APPROVED }, m.voucherNotFound)
    const { fee, chargeMember } = payment
    const member = memberOfPayment(payment)
    const club = await Club.findByPk(user.clubId, { attributes: ['name', 'address', 'accentColor', 'extraInfo'] })

    // Quién pagó, si no fue el socio: su adulto responsable u otra persona. En secretaría, quién registró el pago
    let paidBy = null
    let registeredBy = null
    if (payment.method === PAYMENT_METHODS.CASH) registeredBy = fullNameOf(payment.user)
    else if (payment.userId === member.adultUserId) paidBy = `${fullNameOf(payment.user)}, adulto responsable`
    else if (payment.userId !== member.userId) paidBy = fullNameOf(payment.user)

    return {
        club: { name: club.name, address: club.address, cuit: club.extraInfo?.bankInfo?.cuit ?? null, accentColor: club.accentColor },
        kind: fee ? PAYABLE.FEE : PAYABLE.CHARGE,
        confirmationCode: payment.confirmationCode,
        approvedAt: payment.updatedAt,
        member: { name: fullNameOf(member.user), numMember: member.numMember },
        paidBy,
        registeredBy,
        period: fee?.period ?? null,
        socialAmount: fee ? toAmount(fee.socialAmount) : null,
        sportAmount: fee ? toAmount(fee.sportAmount) : null,
        concept: chargeMember?.charge.concept ?? null,
        description: chargeMember?.charge.description ?? null,
        total: toAmount(payment.amount),
        method: payment.method,
        methodLabel: methodLabelOf(payment)
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

    const [{ count, rows }, totals, pendingReview] = await Promise.all([
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
        }),
        countTransfersInReview(user.clubId)
    ])

    const summaryOf = (feeState) => {
        const row = totals.find(item => item.feeState === feeState)
        return { count: Number(row?.count ?? 0), amount: toAmount(row?.amount ?? 0) }
    }

    const inReview = await feesInReview(rows.map(fee => fee.id))

    return {
        period: selected,
        summary: { paid: summaryOf(FEE_STATES.PAID), pending: summaryOf(FEE_STATES.PENDING), overdue: summaryOf(FEE_STATES.OVERDUE) },
        pendingReview,
        items: rows.map(fee => ({
            ...formatFee(fee, today, inReview.has(fee.id)),
            member: { id: fee.member.id, name: fullNameOf(fee.member.user), numMember: fee.member.numMember, memberStateId: fee.member.memberStateId }
        })),
        total: count,
        page,
        pageSize: FEES_PAGE_SIZE,
        totalPages: Math.max(1, Math.ceil(count / FEES_PAGE_SIZE))
    }
}

// Transferencias que esperan revisión en el club, de cuotas y de cargos (para el contador de "Transferencias por revisar")
const countTransfersInReview = (clubId) => Payment.count({ where: { clubId, ...IN_REVIEW } })

// Historial de pagos del club (fees.manage), de a PAYMENTS_PAGE_SIZE: todos los medios, de cuotas y de cargos. Filtros:
// qué se pagó (kind: 'fee' o 'charge'), medio, estado, fechas (desde y hasta, días en Argentina) y búsqueda por socio
// (cada palabra en el nombre, el apellido, el DNI o el número de socio). Orden: las transferencias Pendientes primero
// (la más vieja antes, para revisarlas en orden de llegada), después el resto del más nuevo al más viejo.
// pendingReview: transferencias por revisar en todo el club
async function listPayments(user, { kind, method, state, search = '', from, to, page = 1 }) {
    page = Number(page) || 1   // Con Express 5 req.query es de solo lectura: el toInt del validator no llega hasta acá
    const words = String(search).trim().split(/\s+/).filter(Boolean)
    const fields = ['user.name$', 'user.lastName$', 'user.dni$', 'numMember$']
        .flatMap(field => [`$fee.member.${field}`, `$chargeMember.member.${field}`])

    const createdAt = {
        ...(from && { [Op.gte]: new Date(`${from}T00:00:00.000-03:00`) }),
        ...(to && { [Op.lt]: new Date(`${addDays(to, 1)}T00:00:00.000-03:00`) })
    }

    const where = {
        clubId: user.clubId,
        ...(kind === PAYABLE.FEE && { feeId: { [Op.ne]: null } }),
        ...(kind === PAYABLE.CHARGE && { chargeMemberId: { [Op.ne]: null } }),
        ...(method && { method: Number(method) }),
        ...(state && { transactionState: Number(state) }),
        ...((from || to) && { createdAt }),
        ...(words.length > 0 && {
            [Op.and]: words.map(word => ({ [Op.or]: fields.map(field => ({ [field]: { [Op.like]: `%${word}%` } })) }))
        })
    }

    const isInReview = `(\`Payment\`.\`method\` = ${PAYMENT_METHODS.TRANSFER} AND \`Payment\`.\`transactionState\` = ${TRANSACTION_STATES.PENDING})`
    const includeListMember = () => ({ model: Member, as: 'member', attributes: ['id', 'userId', 'numMember'], include: [{ model: User, as: 'user', attributes: ['name', 'lastName'] }] })

    const [{ count, rows }, pendingReview] = await Promise.all([
        Payment.findAndCountAll({
            where,
            include: [
                { model: Fee, as: 'fee', required: false, attributes: ['id', 'period', 'socialAmount', 'sportAmount', 'expirationDate', 'feeState'], include: [includeListMember()] },
                { model: ChargeMember, as: 'chargeMember', required: false, attributes: ['id', 'chargeId', 'chargeState'], include: [{ model: Charge, as: 'charge' }, includeListMember()] },
                { model: User, as: 'user', attributes: ['id', 'name', 'lastName'] }
            ],
            order: [
                [sequelize.literal(`CASE WHEN ${isInReview} THEN 0 ELSE 1 END`), 'ASC'],
                [sequelize.literal(`CASE WHEN ${isInReview} THEN \`Payment\`.\`createdAt\` END`), 'ASC'],
                ['createdAt', 'DESC'],
                ['id', 'DESC']
            ],
            limit: PAYMENTS_PAGE_SIZE,
            offset: (page - 1) * PAYMENTS_PAGE_SIZE
        }),
        countTransfersInReview(user.clubId)
    ])

    const today = todayAR()

    return {
        pendingReview,
        items: rows.map(payment => {
            const member = memberOfPayment(payment)
            return {
                ...formatPayment(payment),
                note: payment.note,
                member: { id: member.id, userId: member.userId, name: fullNameOf(member.user), numMember: member.numMember },
                payer: { id: payment.user.id, name: fullNameOf(payment.user) },
                fee: payment.fee ? formatFee(payment.fee, today) : null,
                charge: payment.chargeMember ? formatChargeItem(payment.chargeMember, today) : null
            }
        }),
        total: count,
        page,
        pageSize: PAYMENTS_PAGE_SIZE,
        totalPages: Math.max(1, Math.ceil(count / PAYMENTS_PAGE_SIZE))
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
                { model: Fee, as: 'fees', attributes: ['id', 'feeState', 'expirationDate'], required: false, where: { feeState: { [Op.ne]: FEE_STATES.PAID } } }
            ],
            order: [[{ model: User, as: 'user' }, 'lastName', 'ASC'], [{ model: User, as: 'user' }, 'name', 'ASC']]
        }),
        Club.findByPk(user.clubId, { attributes: ['delayFee'] })
    ])

    // Las cuotas con una transferencia en revisión no suman días de atraso (la misma regla de getOverdueDays)
    const inReview = await feesInReview(members.flatMap(member => member.fees.map(fee => fee.id)))

    const items = members.map(member => {
        const overdueDays = Math.max(0, ...member.fees.filter(fee => !inReview.has(fee.id)).map(fee => overdueDaysOf(fee, today)))
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
    newConfirmationCode,   // Lo usa también el script de datos de la demo (seed/demo.js)
    generateFeesForPeriod,
    generateMonthlyFees,
    generateFees,
    runDailyFeeCheck,
    getMine,
    getLinked,
    getMemberAccount,
    payItem,
    registerPayment,
    getTransferInfo,
    reportTransfer,
    approveTransfer,
    rejectTransfer,
    getReceiptFile,
    getVoucher,
    listPayments,
    listFees,
    listPlayers,
    PLAYER_STATUS,
    PAYABLE
}

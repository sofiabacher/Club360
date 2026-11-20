// Service de los cargos eventuales del módulo fees: cobros fuera de la cuota mensual (un torneo, la camiseta, un viaje).
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body).
//
// Reglas (decisión del 19/11/2026):
//   - Los crea quien tiene fees.manage, con concepto, monto, vencimiento y a quiénes: todos los socios, socios elegidos,
//     las jugadoras de una o varias categorías o los socios inscriptos en uno o varios deportes. Solo se les cobra a
//     socios ACTIVE o SUSPENDED (los INACTIVE no). El monto es el mismo para todos y se fija al crearlo;
//   - cada socio tiene su chargeMember, que se paga como la cuota (tarjeta, transferencia o secretaría: fees.service);
//   - un cargo impago NO es mora: no suma días de atraso (getOverdueDays mira solo las cuotas), no suspende y no impide
//     ser citada. Al vencer pasa a Vencido y se avisa (CHARGE_OVERDUE, in-app);
//   - el aviso del cargo nuevo (CHARGE_NEW) va por la app y por email, al socio y a su adulto si es menor;
//   - se anula entero (los impagos pasan a Anulado; los pagados quedan) o de a un socio, siempre que no haya una
//     transferencia en revisión. Avisa CHARGE_CANCELLED (in-app).
const { Op } = require('sequelize')

const sequelize = require('../../config/db')
const {
    Charge, ChargeMember, Payment, Member, User, Category, League, ClubSport, Sport, Inscription
} = require('../../models')
const { getActivePlayersOfCategory } = require('../leagues/leagues.service')
const { notify } = require('../notifications/notifications.service')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { today: todayAR, daysBetween, dateTimeParts } = require('../../utils/dates')
const {
    CHARGE_STATES,
    CHARGE_TARGETS,
    TRANSACTION_STATES,
    PAYMENT_METHODS,
    MEMBER_STATES,
    INSCRIPTION_STATES,
    LOG_ACTIONS
} = require('../../utils/constants')
const { fees: m, notificationTexts: texts } = require('../../utils/messages')

// Socios a los que se les cobra (los mismos de la cuota: la deuda sigue corriendo aunque estén suspendidos)
const BILLABLE_MEMBER_STATES = [MEMBER_STATES.ACTIVE, MEMBER_STATES.SUSPENDED]

const UNPAID_CHARGE_STATES = [CHARGE_STATES.PENDING, CHARGE_STATES.OVERDUE]

const IN_REVIEW = { method: PAYMENT_METHODS.TRANSFER, transactionState: TRANSACTION_STATES.PENDING }

const actorOf = ({ id: userId, clubId, activeRoleId }) => ({ clubId, userId, roleId: activeRoleId })
const fullNameOf = (user) => `${user.name} ${user.lastName}`
const toAmount = (value) => Math.round(Number(value) * 100) / 100
const money = (value) => `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2, maximumFractionDigits: 2 })}`
const noonOf = (date) => new Date(`${date}T12:00:00.000-03:00`)
const dayMonthOf = (date) => dateTimeParts(noonOf(date)).dayMonth
const byName = (a, b) => a.name.localeCompare(b.name, 'es')

// Función (y no un objeto fijo): Sequelize modifica los include que recibe
const includeMemberUser = () => ({ model: Member, as: 'member', attributes: ['id', 'userId', 'numMember', 'memberStateId'], include: [{ model: User, as: 'user', attributes: ['id', 'name', 'lastName'] }] })

// Ids de los cargos de socios (de itemIds) que tienen una transferencia en revisión
async function itemsInReview(itemIds, { transaction } = {}) {
    if (itemIds.length === 0) return new Set()
    const rows = await Payment.findAll({ where: { chargeMemberId: itemIds, ...IN_REVIEW }, attributes: ['chargeMemberId'], raw: true, transaction })
    return new Set(rows.map(row => row.chargeMemberId))
}

// ---------- Destinatarios ----------

// Categorías activas del club (de ligas activas), con su liga y su deporte
const findClubCategories = (clubId, ids) => Category.findAll({
    where: { clubId, isActive: true, ...(ids && { id: ids }) },
    attributes: ['id', 'name'],
    include: [{
        model: League, as: 'league', attributes: ['name'], where: { isActive: true },
        include: [{ model: ClubSport, as: 'clubSport', attributes: ['id'], include: [{ model: Sport, as: 'sport', attributes: ['name'] }] }]
    }]
})

// Deportes activos del club
const findClubSports = (clubId, ids) => ClubSport.findAll({
    where: { clubId, isActive: true, ...(ids && { id: ids }) },
    attributes: ['id'],
    include: [{ model: Sport, as: 'sport', attributes: ['name'] }]
})

const categoryLabel = (category) => `${category.league.name} · ${category.name}`

// Opciones para elegir a quiénes se les cobra: los socios que se pueden cobrar, las categorías y los deportes
async function getChargeOptions(user) {
    const [members, categories, sports] = await Promise.all([
        Member.findAll({
            where: { clubId: user.clubId, memberStateId: BILLABLE_MEMBER_STATES },
            attributes: ['id', 'numMember', 'memberStateId'],
            include: [{ model: User, as: 'user', attributes: ['name', 'lastName', 'dni'] }]
        }),
        findClubCategories(user.clubId),
        findClubSports(user.clubId)
    ])

    return {
        members: members
            .map(member => ({ id: member.id, name: fullNameOf(member.user), dni: member.user.dni, numMember: member.numMember, memberStateId: member.memberStateId }))
            .sort(byName),
        categories: categories
            .map(category => ({ id: category.id, name: categoryLabel(category), sport: category.league.clubSport.sport.name }))
            .sort(byName),
        sports: sports.map(clubSport => ({ id: clubSport.id, name: clubSport.sport.name })).sort(byName)
    }
}

// Socios a los que se les cobra según el destino: [{ memberId, userId, name, numMember }], sin repetidos y por nombre.
// Si alguno de los ids elegidos no es del club (o no está activo), 400
async function resolveRecipients(clubId, { targetType, targetIds }, { transaction } = {}) {
    const ids = [...new Set(targetIds ?? [])]
    const byMember = new Map()
    const add = (member) => byMember.set(member.memberId, member)

    const fromMember = (member) => ({ memberId: member.id, userId: member.userId, name: fullNameOf(member.user), numMember: member.numMember })
    const memberInclude = [{ model: User, as: 'user', attributes: ['name', 'lastName'] }]
    const memberAttributes = ['id', 'userId', 'numMember']

    if (targetType === CHARGE_TARGETS.ALL) {
        const members = await Member.findAll({ where: { clubId, memberStateId: BILLABLE_MEMBER_STATES }, attributes: memberAttributes, include: memberInclude, transaction })
        members.map(fromMember).forEach(add)
    }

    if (targetType === CHARGE_TARGETS.MEMBERS) {
        const members = await Member.findAll({ where: { clubId, id: ids, memberStateId: BILLABLE_MEMBER_STATES }, attributes: memberAttributes, include: memberInclude, transaction })
        if (members.length !== ids.length) throw createError(m.chargeTargetNotFound, 400)
        members.map(fromMember).forEach(add)
    }

    if (targetType === CHARGE_TARGETS.CATEGORIES) {
        const categories = await findClubCategories(clubId, ids)
        if (categories.length !== ids.length) throw createError(m.chargeTargetNotFound, 400)
        for (const category of categories) {
            const players = await getActivePlayersOfCategory(clubId, category.id, { transaction })
            players.forEach(player => add({ memberId: player.memberId, userId: player.userId, name: player.name, numMember: player.numMember }))
        }
    }

    if (targetType === CHARGE_TARGETS.SPORTS) {
        const sports = await findClubSports(clubId, ids)
        if (sports.length !== ids.length) throw createError(m.chargeTargetNotFound, 400)
        const members = await Member.findAll({
            where: { clubId, memberStateId: BILLABLE_MEMBER_STATES },
            attributes: memberAttributes,
            include: [
                ...memberInclude,
                { model: Inscription, as: 'inscriptions', attributes: [], where: { clubSportId: ids, inscriptionState: INSCRIPTION_STATES.APPROVED } }
            ],
            transaction
        })
        members.map(fromMember).forEach(add)
    }

    return [...byMember.values()].sort(byName)
}

// A quiénes se les cobró, en palabras: "Todos los socios", "3 socios elegidos", las categorías o los deportes
async function targetLabelsOf(clubId, charges) {
    const categoryIds = charges.filter(charge => charge.targetType === CHARGE_TARGETS.CATEGORIES).flatMap(charge => charge.targetIds ?? [])
    const sportIds = charges.filter(charge => charge.targetType === CHARGE_TARGETS.SPORTS).flatMap(charge => charge.targetIds ?? [])

    // Sin filtrar por activas: un cargo viejo sigue mostrando los nombres aunque la categoría o el deporte se den de baja
    const [categories, sports] = await Promise.all([
        categoryIds.length > 0
            ? Category.findAll({ where: { clubId, id: categoryIds }, attributes: ['id', 'name'], include: [{ model: League, as: 'league', attributes: ['name'] }] })
            : [],
        sportIds.length > 0
            ? ClubSport.findAll({ where: { clubId, id: sportIds }, attributes: ['id'], include: [{ model: Sport, as: 'sport', attributes: ['name'] }] })
            : []
    ])
    const categoryName = new Map(categories.map(category => [category.id, categoryLabel(category)]))
    const sportName = new Map(sports.map(clubSport => [clubSport.id, clubSport.sport.name]))

    return (charge, count) => {
        if (charge.targetType === CHARGE_TARGETS.ALL) return 'Todos los socios'
        if (charge.targetType === CHARGE_TARGETS.CATEGORIES) return (charge.targetIds ?? []).map(id => categoryName.get(id) ?? 'Categoría').join(', ')
        if (charge.targetType === CHARGE_TARGETS.SPORTS) return (charge.targetIds ?? []).map(id => sportName.get(id) ?? 'Deporte').join(', ')
        return count === 1 ? '1 socio elegido' : `${count} socios elegidos`
    }
}

// ---------- Alta ----------

// Resumen antes de crearlo: a cuántos socios (y a quiénes) se les va a cobrar
async function previewCharge(user, { targetType, targetIds }) {
    const recipients = await resolveRecipients(user.clubId, { targetType, targetIds })
    return {
        count: recipients.length,
        members: recipients.map(({ memberId, name, numMember }) => ({ id: memberId, name, numMember }))
    }
}

async function createCharge(user, { concept, description, amount, expirationDate, targetType, targetIds }) {
    if (expirationDate < todayAR()) throw createError(m.chargeExpirationPast, 400)

    const cleanConcept = concept.trim()
    const cleanDescription = description?.trim() || null
    const keepsIds = [CHARGE_TARGETS.CATEGORIES, CHARGE_TARGETS.SPORTS].includes(targetType)

    const charge = await sequelize.transaction(async (transaction) => {
        const recipients = await resolveRecipients(user.clubId, { targetType, targetIds }, { transaction })
        if (recipients.length === 0) throw createError(m.chargeNoRecipients, 400)

        const created = await Charge.create({
            clubId: user.clubId,
            userId: user.id,
            concept: cleanConcept,
            description: cleanDescription,
            amount: toAmount(amount),
            expirationDate,
            targetType,
            targetIds: keepsIds ? [...new Set(targetIds)].sort((a, b) => a - b) : null,
            isActive: true
        }, { transaction })

        for (const recipient of recipients) {
            await ChargeMember.create({ clubId: user.clubId, chargeId: created.id, memberId: recipient.memberId, chargeState: CHARGE_STATES.PENDING }, { transaction })
        }

        const label = (await targetLabelsOf(user.clubId, [created]))(created, recipients.length)
        await logger(actorOf(user), LOG_ACTIONS.CHARGE_CREATED,
            `«${cleanConcept}», ${money(created.amount)} por socio, vence el ${expirationDate}. A: ${label} (${recipients.length} socios)`, { transaction })

        await notify({
            clubId: user.clubId,
            type: 'CHARGE_NEW',
            recipientUserIds: recipients.map(recipient => recipient.userId),
            ...texts.chargeNew({ concept: cleanConcept, amount: money(created.amount), dayMonth: dayMonthOf(expirationDate) }),
            transmitterId: user.id,
            includeFamily: true
        }, { transaction })

        return created
    })

    return getCharge(user, charge.id)
}

// ---------- Consulta ----------

const countsOf = (items) => {
    const count = (state) => items.filter(item => item.chargeState === state).length
    return { total: items.length, paid: count(CHARGE_STATES.PAID), pending: count(CHARGE_STATES.PENDING), overdue: count(CHARGE_STATES.OVERDUE), cancelled: count(CHARGE_STATES.CANCELLED) }
}

function formatCharge(charge, items, labelOf) {
    const counts = countsOf(items)
    const amount = toAmount(charge.amount)
    return {
        id: charge.id,
        concept: charge.concept,
        description: charge.description,
        amount,
        expirationDate: charge.expirationDate,
        targetType: charge.targetType,
        targetLabel: labelOf(charge, counts.total),
        isActive: charge.isActive,
        createdAt: charge.createdAt,
        author: charge.author ? fullNameOf(charge.author) : null,
        counts,
        collected: toAmount(counts.paid * amount),
        due: toAmount((counts.pending + counts.overdue) * amount)
    }
}

// Cargos del club, el más nuevo primero, con cuántos socios pagaron, deben o se anularon
async function listCharges(user) {
    const charges = await Charge.findAll({
        where: { clubId: user.clubId },
        include: [
            { model: ChargeMember, as: 'items', attributes: ['id', 'chargeState'] },
            { model: User, as: 'author', attributes: ['name', 'lastName'] }
        ],
        order: [['createdAt', 'DESC'], ['id', 'DESC']]
    })

    const labelOf = await targetLabelsOf(user.clubId, charges)
    const inReview = await itemsInReview(charges.flatMap(charge => charge.items.map(item => item.id)))

    return {
        pendingReview: inReview.size,
        items: charges.map(charge => ({
            ...formatCharge(charge, charge.items, labelOf),
            inReview: charge.items.filter(item => inReview.has(item.id)).length
        }))
    }
}

// Detalle de un cargo: el resumen y cada socio con su estado, si tiene una transferencia en revisión y el pago
// Aprobado (para el comprobante)
async function getCharge(user, chargeId) {
    const charge = await Charge.findOne({
        where: { id: chargeId, clubId: user.clubId },
        include: [
            { model: ChargeMember, as: 'items', include: [includeMemberUser()] },
            { model: User, as: 'author', attributes: ['name', 'lastName'] }
        ]
    })
    if (!charge) throw createError(m.chargeNotFound, 404)

    const itemIds = charge.items.map(item => item.id)
    const [labelOf, inReview, approved] = await Promise.all([
        targetLabelsOf(user.clubId, [charge]),
        itemsInReview(itemIds),
        itemIds.length > 0
            ? Payment.findAll({ where: { chargeMemberId: itemIds, transactionState: TRANSACTION_STATES.APPROVED }, attributes: ['id', 'chargeMemberId', 'method', 'confirmationCode', 'updatedAt'] })
            : []
    ])
    const paymentOf = new Map(approved.map(payment => [payment.chargeMemberId, payment]))
    const today = todayAR()

    return {
        ...formatCharge(charge, charge.items, labelOf),
        items: charge.items
            .map(item => {
                const payment = paymentOf.get(item.id)
                const unpaid = UNPAID_CHARGE_STATES.includes(item.chargeState)
                return {
                    id: item.id,
                    member: { id: item.member.id, name: fullNameOf(item.member.user), numMember: item.member.numMember, memberStateId: item.member.memberStateId },
                    chargeState: item.chargeState,
                    overdueDays: unpaid && charge.expirationDate < today ? daysBetween(charge.expirationDate, today) : 0,
                    inReview: inReview.has(item.id),
                    payment: payment ? { id: payment.id, method: payment.method, confirmationCode: payment.confirmationCode, approvedAt: payment.updatedAt } : null
                }
            })
            .sort((a, b) => byName(a.member, b.member))
    }
}

// ---------- Anulación ----------

// Anula los cargos impagos de items (dentro de la transacción) y avisa a sus socios
async function cancelItems(actor, charge, items, transaction) {
    for (const item of items) await item.update({ chargeState: CHARGE_STATES.CANCELLED }, { transaction })

    await notify({
        clubId: actor.clubId,
        type: 'CHARGE_CANCELLED',
        recipientUserIds: items.map(item => item.member.userId),
        ...texts.chargeCancelled({ concept: charge.concept }),
        transmitterId: actor.id,
        includeFamily: true
    }, { transaction })
}

// Anula el cargo entero: los impagos pasan a Anulado (los pagados quedan). No se puede si hay transferencias en revisión
async function cancelCharge(user, chargeId) {
    await sequelize.transaction(async (transaction) => {
        const charge = await Charge.findOne({ where: { id: chargeId, clubId: user.clubId }, transaction, lock: transaction.LOCK.UPDATE })
        if (!charge) throw createError(m.chargeNotFound, 404)
        if (!charge.isActive) throw createError(m.chargeAlreadyCancelled, 409)

        const unpaid = await ChargeMember.findAll({
            where: { chargeId: charge.id, chargeState: UNPAID_CHARGE_STATES },
            include: [includeMemberUser()],
            transaction,
            lock: transaction.LOCK.UPDATE
        })
        if ((await itemsInReview(unpaid.map(item => item.id), { transaction })).size > 0) throw createError(m.chargeTransfersInReview, 409)

        await charge.update({ isActive: false }, { transaction })
        if (unpaid.length > 0) await cancelItems(user, charge, unpaid, transaction)

        await logger(actorOf(user), LOG_ACTIONS.CHARGE_CANCELLED,
            `«${charge.concept}» completo: ${unpaid.length} cargos impagos anulados`, { transaction })
    })

    return getCharge(user, chargeId)
}

// Anula el cargo de un socio (solo si está impago y sin una transferencia en revisión)
async function cancelChargeItem(user, itemId) {
    const chargeId = await sequelize.transaction(async (transaction) => {
        const item = await ChargeMember.findOne({
            where: { id: itemId, clubId: user.clubId },
            include: [{ model: Charge, as: 'charge' }, includeMemberUser()],
            transaction,
            lock: transaction.LOCK.UPDATE
        })
        if (!item) throw createError(m.chargeItemNotFound, 404)
        if (item.chargeState === CHARGE_STATES.CANCELLED) throw createError(m.chargeAlreadyCancelled, 409)
        if (!UNPAID_CHARGE_STATES.includes(item.chargeState)) throw createError(m.chargeNotCancellable, 409)
        if ((await itemsInReview([item.id], { transaction })).size > 0) throw createError(m.chargeTransferInReview, 409)

        await cancelItems(user, item.charge, [item], transaction)
        await logger(actorOf(user), LOG_ACTIONS.CHARGE_CANCELLED,
            `«${item.charge.concept}» de ${fullNameOf(item.member.user)} (Nº ${item.member.numMember})`, { transaction })

        return item.chargeId
    })

    return getCharge(user, chargeId)
}

// ---------- Chequeo diario (job feeStatus) ----------

// Cargos Pendientes de cargos activos con el vencimiento ya pasado: pasan a Vencido y se avisa CHARGE_OVERDUE (in-app).
// No es mora: no suspende ni cuenta para las citaciones. Devuelve cuántos pasaron a Vencido
async function markOverdueCharges(today = todayAR(), clubIds = null) {
    const charges = await Charge.findAll({
        where: { ...(clubIds && { clubId: clubIds }), isActive: true, expirationDate: { [Op.lt]: today } },
        include: [{ model: ChargeMember, as: 'items', where: { chargeState: CHARGE_STATES.PENDING }, include: [includeMemberUser()] }]
    })

    let overdue = 0
    for (const charge of charges) {
        await sequelize.transaction(async (transaction) => {
            for (const item of charge.items) await item.update({ chargeState: CHARGE_STATES.OVERDUE }, { transaction })
            await notify({
                clubId: charge.clubId,
                type: 'CHARGE_OVERDUE',
                recipientUserIds: charge.items.map(item => item.member.userId),
                ...texts.chargeOverdue({ concept: charge.concept, dayMonth: dayMonthOf(charge.expirationDate) }),
                includeFamily: true
            }, { transaction })
        })
        overdue += charge.items.length
    }
    return overdue
}

module.exports = {
    itemsInReview,
    getChargeOptions,
    previewCharge,
    createCharge,
    listCharges,
    getCharge,
    cancelCharge,
    cancelChargeItem,
    markOverdueCharges
}

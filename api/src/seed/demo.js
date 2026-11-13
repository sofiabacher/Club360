// Datos de la demo del club Valencia. Se corre a mano, después del seed:
//   npm run seed:demo              carga los datos (si ya están cargados, no hace nada)
//   npm run seed:demo -- --reset   pide confirmación, borra los datos del club salvo lo del seed y los vuelve a cargar
//
// Los datos están en data/demo.js. Las fechas se calculan desde hoy, en la zona horaria de Argentina (utils/dates.js),
// así siempre hay un partido dentro de la ventana de citación, cuotas vencidas y una semana de rutinas en curso.
//
// Escribe con los modelos, en una sola transacción y con { transaction } en todas las operaciones (los hooks calculan
// DVH y DVV), y con las funciones de la aplicación: número de socio, código de vínculo, contraseñas, teléfono cifrado
// por el modelo, roles base y códigos de pago. No llama a notify() ni al mailer: las notificaciones in-app se crean con
// el modelo, con los mismos tipos y textos que los módulos. No sube archivos.
// Las fechas en el pasado (altas, cuotas, pagos) se guardan en createdAt y updatedAt con silent: true; esos campos no
// entran en el DVH, así que los dígitos quedan bien calculados.
const readline = require('readline')
const crypto = require('crypto')
const { Op } = require('sequelize')

const sequelize = require('../config/db')
const { seed: seedConfig } = require('../config')
const models = require('../models')
const { updateTableDVV } = require('../models/integrityHooks')
const { CLUB_TABLES, deleteClubRows } = require('../utils/clubData')
const { hashPassword } = require('../utils/crypto')
const logger = require('../utils/logger')
const { isValidPassword } = require('../modules/auth/auth.validator')
const { assignBaseRole } = require('../modules/access/access.service')
const { generateMemberNumber, generateFamilyCode } = require('../modules/members/members.service')
const { newConfirmationCode } = require('../modules/fees/fees.service')
const { listConflicts } = require('../modules/games/games.service')
const { today: todayAR, addDays, getCurrentWeekStart, dateTimeParts, isAdult, TIME_ZONE } = require('../utils/dates')
const {
    USER_STATES, MEMBER_STATES, INSCRIPTION_STATES, FEE_STATES, TRANSACTION_STATES, PAYMENT_METHODS, CITATION_STATES,
    GAME_STATES, BASE_ROLES, AGE_SCALES, LOG_ACTIONS, LOGIN_MAX_ATTEMPTS, FEE_DUE_DAY, CITATION_RESPONSE_HOURS
} = require('../utils/constants')
const { CLUB_SEED } = require('./data/club')
const DATA = require('./data/demo')

const {
    User, Role, ClubSport, Sport, Member, Staff, Inscription, Fee, Payment, League, Category, CategoryPlayer,
    CategoryStaff, Game, Citation, Routine, Notification, Club
} = models

const DEMO_MARKER = 'ctorres'   // Si existe este usuario, los datos de la demo ya están cargados
const FIRST_DNI = 40000001
const CONFIRM_WORD = 'BORRAR'
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Personas que pueden tener un email real (las claves de los datos)
const ALL_PEOPLE = [...DATA.DEMO_STAFF, ...DATA.DEMO_MEMBERS, ...DATA.DEMO_FAMILY_ONLY, ...DATA.DEMO_FILLER_PLAYERS]

class DemoError extends Error {}   // Error con un mensaje para mostrar tal cual (corta sin escribir nada)

// ---------- Fechas (siempre en la hora de Argentina) ----------

// Momento de una fecha 'AAAA-MM-DD' y una hora 'HH:mm' de Argentina (UTC-3, sin horario de verano)
const atAR = (date, time = '12:00') => new Date(`${date}T${time}:00.000-03:00`)

// '2026-11' + n meses
function shiftPeriod(period, months) {
    const [year, month] = period.split('-').map(Number)
    const total = year * 12 + (month - 1) + months
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

const periodsBetween = (from, to) => {
    const list = []
    for (let period = from; period <= to; period = shiftPeriod(period, 1)) list.push(period)
    return list
}

// Textos de fechas como los arman los módulos (games, citations y fees)
function whenText(dateTime) {   // "sábado 7/11 a las 18:30"
    const { weekday, dayMonth, time } = dateTimeParts(dateTime)
    return `${weekday} ${dayMonth} a las ${time}`
}

function shortWhen(dateTime) {   // "sáb. 10:00"
    const { weekdayShort, time } = dateTimeParts(dateTime)
    return `${weekdayShort} ${time}`
}

const monthNameOf = (period) => new Intl.DateTimeFormat('es-AR', { month: 'long', timeZone: TIME_ZONE }).format(atAR(`${period}-15`))
const fullNameOf = (person) => `${person.name} ${person.lastName}`

// ---------- Emails ----------

// SEED_DEMO_REAL_EMAILS: 'clave=email,clave=email' → Map. Corta si una clave no existe o un email no tiene formato válido
function parseRealEmails(text) {
    const emails = new Map()
    if (!text) return emails

    const keys = new Set(ALL_PEOPLE.map(person => person.key))
    for (const item of text.split(',').map(part => part.trim()).filter(Boolean)) {
        const [key, email, ...rest] = item.split('=').map(part => part.trim())
        if (!key || !email || rest.length > 0) throw new DemoError(`SEED_DEMO_REAL_EMAILS: "${key ?? item}" no tiene el formato clave=email.`)
        if (!keys.has(key)) throw new DemoError(`SEED_DEMO_REAL_EMAILS: la clave "${key}" no existe en los datos de la demo.`)
        if (!EMAIL_FORMAT.test(email)) throw new DemoError(`SEED_DEMO_REAL_EMAILS: el email de ${key} no tiene un formato válido.`)
        if (emails.has(key)) throw new DemoError(`SEED_DEMO_REAL_EMAILS: la clave "${key}" está repetida.`)
        emails.set(key, email.toLowerCase())
    }
    return emails
}

// Alias de la casilla del equipo: club360.demo@gmail.com → club360.demo+ctorres@gmail.com. Sin casilla, @demo.example
function aliasOf(key) {
    if (!seedConfig.demo.email) return `${key}@demo.example`
    const [local, domain] = seedConfig.demo.email.split('@')
    return `${local}+${key}@${domain}`
}

// 'ctorres.real@gmail.com' → 'ct***@gmail.com'
const maskEmail = (email) => `${email.split('@')[0].slice(0, 2)}***@${email.split('@')[1]}`

// ---------- Personas ----------

// Lista de personas con los datos de su usuario: dni, teléfono, email y estado
function buildPeople(realEmails) {
    const people = []
    const push = (person, kind) => {
        const index = people.length
        const email = person.noEmail ? null : (realEmails.get(person.key) ?? aliasOf(person.key))
        people.push({
            ...person,
            kind,
            dni: String(FIRST_DNI + index),
            phone: `11 5000-${String(index + 1).padStart(4, '0')}`,
            email,
            realEmail: realEmails.has(person.key)
        })
    }

    DATA.DEMO_STAFF.forEach(person => push(person, 'staff'))
    DATA.DEMO_FAMILY_ONLY.forEach(person => push(person, 'family'))
    DATA.DEMO_MEMBERS.forEach(person => push(person, 'member'))
    DATA.DEMO_FILLER_PLAYERS.forEach(person => push({ ...person, player: true }, 'filler'))
    return people
}

// Usuarios que quedan en la base (con --reset, todos salvo los del club, menos el Admin del seed)
const remainingUsersWhere = (reset, club, admin) => (reset ? { [Op.or]: [{ clubId: { [Op.ne]: club.id } }, { id: admin.id }] } : {})

// Emails, usuarios y DNI únicos: corta antes de escribir si chocan con un usuario que va a quedar en la base
async function assertUniqueUsers(people, { reset, club, admin }) {
    const emails = people.map(person => person.email).filter(Boolean)
    const duplicated = emails.find((email, index) => emails.indexOf(email) !== index)
    if (duplicated) throw new DemoError(`Hay un email repetido en los datos de la demo (${maskEmail(duplicated)}). Revisá SEED_DEMO_REAL_EMAILS.`)

    const usernames = people.filter(person => !person.pending && person.userState !== 'PENDING').map(person => person.key)
    const existing = await User.findAll({
        where: {
            [Op.and]: [
                remainingUsersWhere(reset, club, admin),
                { [Op.or]: [{ email: emails }, { username: usernames }, { dni: people.map(person => person.dni) }] }
            ]
        },
        attributes: ['id', 'name', 'lastName', 'username', 'email', 'dni']
    })

    for (const user of existing) {
        const person = people.find(item => item.email && item.email === user.email?.toLowerCase())
        const who = user.username ?? fullNameOf(user)
        if (person?.realEmail) throw new DemoError(`El email de ${person.key} ya lo usa otro usuario (${who}). Usá otro en SEED_DEMO_REAL_EMAILS.`)
        if (person) throw new DemoError(`El email de ${person.key} (${maskEmail(person.email)}) ya lo usa otro usuario (${who}).`)
        if (usernames.includes(user.username)) throw new DemoError(`El usuario ${user.username} ya existe en la base. Para recargar la demo, corré npm run seed:demo -- --reset.`)
        throw new DemoError(`El DNI ${user.dni} ya lo usa otro usuario (${who}).`)
    }
}

// ---------- Borrado (--reset) ----------

// Borra todos los datos del club salvo lo que carga el seed: el club, sus deportes, los roles base con sus permisos y
// el Admin del seed con su rol. La bitácora no se toca (no está en CLUB_TABLES). Recalcula el DVV de cada tabla
async function wipeClub(club, admin, adminRole, transaction) {
    const baseRoles = await Role.findAll({ where: { clubId: club.id, isBase: true }, attributes: ['id'], transaction })

    const deleted = await deleteClubRows(club.id, {
        transaction,
        keep: {
            club: true,
            clubSport: true,
            role: { isBase: true },
            role_permission: { roleId: baseRoles.map(role => role.id) },
            user: { id: admin.id },
            user_role: { userId: admin.id, roleId: adminRole.id }
        }
    })

    for (const { Model } of CLUB_TABLES) {
        if (Model.rawAttributes.dvh) await updateTableDVV(Model, transaction)
    }

    return deleted
}

// ---------- Carga ----------

async function loadDemo({ club, admin, people, transaction }) {
    const now = new Date()
    const today = todayAR()
    const currentPeriod = today.slice(0, 7)
    const counts = {}

    // Crea con el modelo, con la fecha indicada en createdAt y updatedAt (silent: Sequelize no pisa updatedAt)
    async function add(Model, values, { at = now, updatedAt = at } = {}) {
        const timestamps = { createdAt: at, ...(Model.rawAttributes.updatedAt && { updatedAt }) }
        const row = await Model.create({ ...values, ...timestamps }, { transaction, silent: true })
        const table = Model.getTableName()
        counts[table] = (counts[table] ?? 0) + 1
        return row
    }

    const sport = await Sport.findOne({ where: { name: 'Vóley' }, transaction })
    const clubSport = await ClubSport.findOne({ where: { clubId: club.id, sportId: sport?.id ?? 0, isActive: true }, transaction })
    if (!clubSport) throw new DemoError('El club no tiene Vóley activo. Primero corré npm run seed.')

    const courts = club.extraInfo?.courts ?? []
    const courtLabel = (name) => {
        const court = courts.find(item => item.name === name)
        if (!court) throw new DemoError(`La cancha "${name}" no está en la información del club.`)
        return `${court.name} · ${court.address}`
    }

    // Fechas de alta: el día 15 de hace 6 meses (o de hace 10, o hoy)
    const joinedAt = {
        default: atAR(`${shiftPeriod(currentPeriod, -6)}-15`, '10:00'),
        early: atAR(`${shiftPeriod(currentPeriod, -10)}-15`, '10:00'),
        today: new Date(now.getTime() - HOUR_MS)
    }
    const staffSince = atAR(`${shiftPeriod(currentPeriod, -12)}-01`, '10:00')

    // --- Usuarios ---
    const userOf = new Map()
    for (const person of people) {
        const userState = person.pending || person.userState === 'PENDING' ? USER_STATES.PENDING : USER_STATES[person.userState ?? 'ACTIVE']
        const hasAccess = userState !== USER_STATES.PENDING
        const at = person.kind === 'staff' ? staffSince : joinedAt[person.joined ?? 'default']

        const user = await add(User, {
            clubId: club.id,
            name: person.name,
            lastName: person.lastName,
            email: person.email,
            password: hasAccess ? await hashPassword(seedConfig.demo.password) : null,
            phone: person.phone,
            dni: person.dni,
            birthDate: person.birthDate,
            userStateId: userState,
            username: hasAccess ? person.key : null,
            failedAttempts: userState === USER_STATES.BLOCKED ? LOGIN_MAX_ATTEMPTS : 0
        }, { at })
        userOf.set(person.key, user)
    }

    // --- Staff ---
    const staffOf = new Map()
    for (const person of people.filter(item => item.kind === 'staff')) {
        const user = userOf.get(person.key)
        staffOf.set(person.key, await add(Staff, { clubId: club.id, userId: user.id, clubSportId: clubSport.id }, { at: staffSince }))
        for (const role of person.roles) await assignBaseRole(user.id, BASE_ROLES[role], { transaction })
    }

    // --- Socios (con su número, el código de vínculo de los menores y el adulto Familia) ---
    const memberOf = new Map()
    const memberPeople = people.filter(item => item.kind === 'member' || item.kind === 'filler')
    for (const person of memberPeople) {
        const user = userOf.get(person.key)
        const at = joinedAt[person.joined ?? 'default']
        const minor = !isAdult(person.birthDate)
        const adult = person.adultKey ? userOf.get(person.adultKey) : null
        const memberState = MEMBER_STATES[person.memberState ?? 'ACTIVE']

        const member = await add(Member, {
            clubId: club.id,
            userId: user.id,
            numMember: await generateMemberNumber(transaction),
            memberStateId: memberState,
            codeFamily: minor ? await generateFamilyCode(transaction) : null,
            adultUserId: adult?.id ?? null,
            linkStatus: Boolean(adult)
        }, { at, updatedAt: person.memberState === 'INACTIVE' ? atAR(`${shiftPeriod(currentPeriod, -1)}-20`, '11:00') : at })
        memberOf.set(person.key, member)

        await assignBaseRole(user.id, BASE_ROLES.MEMBER, { transaction })
        if (adult) await assignBaseRole(adult.id, BASE_ROLES.FAMILY, { transaction })
    }

    // --- Inscripciones a Vóley ---
    let florenciaInscription = null
    for (const person of memberPeople) {
        const member = memberOf.get(person.key)
        const at = joinedAt[person.joined ?? 'default']

        if (person.player) {
            await add(Inscription, { clubId: club.id, clubSportId: clubSport.id, memberId: member.id, inscriptionState: INSCRIPTION_STATES.APPROVED },
                { at: new Date(at.getTime() + HOUR_MS), updatedAt: new Date(at.getTime() + DAY_MS) })
            await assignBaseRole(member.userId, BASE_ROLES.PLAYER, { transaction })
        }

        if (person.inscriptionPending) {
            florenciaInscription = await add(Inscription, { clubId: club.id, clubSportId: clubSport.id, memberId: member.id, inscriptionState: INSCRIPTION_STATES.PENDING },
                { at: atAR(addDays(today, -2), '19:40') })
        }
    }

    // --- Ligas, categorías y asignaciones ---
    const categoryOf = new Map()
    for (const league of DATA.DEMO_LEAGUES) {
        const created = await add(League, { clubId: club.id, clubSportId: clubSport.id, name: league.name, ageScale: league.ageScale }, { at: staffSince })
        for (const code of league.categories) {
            const group = AGE_SCALES[league.ageScale].find(item => item.code === code)
            categoryOf.set(code, await add(Category, { clubId: club.id, leagueId: created.id, name: group.label, ageGroup: code }, { at: staffSince }))
        }
    }

    const playersOf = new Map([...categoryOf.keys()].map(code => [code, []]))
    for (const person of memberPeople.filter(item => item.player)) {
        for (const code of person.categories) {
            await add(CategoryPlayer, { memberId: memberOf.get(person.key).id, categoryId: categoryOf.get(code).id }, { at: new Date(joinedAt[person.joined ?? 'default'].getTime() + 2 * DAY_MS) })
            playersOf.get(code).push(person)
        }
    }

    for (const person of people.filter(item => item.kind === 'staff')) {
        for (const code of person.categories) {
            await add(CategoryStaff, { staffId: staffOf.get(person.key).id, categoryId: categoryOf.get(code).id }, { at: staffSince })
        }
    }

    // --- Cuotas y pagos (D12: social = club.socialFee; deportiva = Vóley si tiene la inscripción Aprobada) ---
    const socialFee = Number(club.socialFee)
    const sportFee = Number(clubSport.priceFee)
    const unpaidFees = new Map()   // key → cuotas impagas (de la más vieja a la más nueva)
    let paymentIndex = 0

    for (const [index, person] of memberPeople.entries()) {
        if (person.joined === 'today') continue   // Se dio de alta después del día 1: este mes no tiene cuota

        const member = memberOf.get(person.key)
        const joinedPeriod = joinedAt[person.joined ?? 'default'].toISOString().slice(0, 7)
        const lastPeriod = person.memberState === 'INACTIVE' ? shiftPeriod(currentPeriod, -1) : currentPeriod
        const periods = periodsBetween(shiftPeriod(joinedPeriod, 1), lastPeriod)
        const paidCount = periods.length - (person.unpaidMonths ?? 0)
        const payer = person.adultKey ? people.find(item => item.key === person.adultKey) : (isAdult(person.birthDate) ? person : null)
        const sportAmount = person.player ? sportFee : 0

        for (const [periodIndex, period] of periods.entries()) {
            const expirationDate = `${period}-${String(FEE_DUE_DAY).padStart(2, '0')}`
            const generatedAt = atAR(`${period}-01`, '00:05')
            const paid = periodIndex < paidCount

            // Pagada entre el día 2 y el 10 del mes (nunca después de ahora)
            const day = 2 + ((index * 3 + periodIndex * 5) % 9)
            const hour = String(9 + ((index + periodIndex) % 11)).padStart(2, '0')
            let paidAt = atAR(`${period}-${String(day).padStart(2, '0')}`, `${hour}:${String((index * 7) % 60).padStart(2, '0')}`)
            if (paidAt > now) paidAt = new Date(Math.max(generatedAt.getTime() + 60 * 1000, now.getTime() - 30 * 60 * 1000))

            const overdue = !paid && expirationDate < today
            const feeState = paid ? FEE_STATES.PAID : (overdue ? FEE_STATES.OVERDUE : FEE_STATES.PENDING)
            const fee = await add(Fee, { clubId: club.id, memberId: member.id, period, expirationDate, socialAmount: socialFee, sportAmount, feeState },
                { at: generatedAt, updatedAt: paid ? paidAt : (overdue ? atAR(addDays(expirationDate, 1), '00:15') : generatedAt) })

            if (!paid) {
                unpaidFees.set(person.key, [...(unpaidFees.get(person.key) ?? []), fee])
                continue
            }

            const amount = socialFee + sportAmount
            const card = payer?.card

            // Camila: un intento rechazado (tarjeta terminada en 0000) antes del pago aprobado de la cuota de hace 2 meses
            if (person.rejectedPayment && period === shiftPeriod(currentPeriod, -2)) {
                const triedAt = new Date(paidAt.getTime() - 10 * 60 * 1000)
                await add(Payment, {
                    clubId: club.id, userId: userOf.get(payer.key).id, feeId: fee.id, amount, method: PAYMENT_METHODS.CARD,
                    transactionState: TRANSACTION_STATES.REJECTED, confirmationCode: await newConfirmationCode('PAY', transaction)
                }, { at: triedAt })
            }

            await add(Payment, card
                ? {
                    clubId: club.id, userId: userOf.get(payer.key).id, feeId: fee.id, amount, method: PAYMENT_METHODS.CARD,
                    transactionState: TRANSACTION_STATES.APPROVED, confirmationCode: await newConfirmationCode('PAY', transaction),
                    note: `Tarjeta ****${card}`
                }
                : {   // En secretaría: lo registra el Admin (como registerPayment)
                    clubId: club.id, userId: admin.id, feeId: fee.id, amount, method: PAYMENT_METHODS.CASH,
                    transactionState: TRANSACTION_STATES.APPROVED, confirmationCode: await newConfirmationCode('SEC', transaction)
                }, { at: paidAt })
            paymentIndex++
        }
    }

    // --- Partidos y citaciones ---
    const responseDeadline = new Date(now.getTime() + CITATION_RESPONSE_HOURS * HOUR_MS)
    const citable = (code) => playersOf.get(code).filter(person => person.memberState !== 'SUSPENDED')
    const gameOf = new Map()   // 'MAYORES:5' → partido
    const citationNotices = {}

    for (const plan of DATA.DEMO_GAMES) {
        const date = addDays(today, plan.day)
        const dateTime = atAR(date, plan.time ?? DATA.DEMO_DEFAULT_TIMES[plan.category])
        const state = GAME_STATES[plan.state ?? 'SCHEDULED']
        const createdAt = plan.day < 0 ? new Date(dateTime.getTime() - 20 * DAY_MS) : new Date(now.getTime() - 6 * DAY_MS)
        const updatedAt = state === GAME_STATES.PLAYED ? new Date(dateTime.getTime() + 3 * HOUR_MS)
            : state === GAME_STATES.CANCELLED ? new Date(dateTime.getTime() - DAY_MS) : createdAt

        const category = categoryOf.get(plan.category)
        const game = await add(Game, {
            clubId: club.id,
            categoryId: category.id,
            season: String(dateTimeParts(dateTime).year),
            rival: plan.rival,
            dateTime,
            address: plan.court ? courtLabel(plan.court) : plan.address,
            isHome: Boolean(plan.court),
            gameState: state
        }, { at: createdAt, updatedAt })
        game.categoryName = category.name
        gameOf.set(`${plan.category}:${plan.day}`, game)

        const coach = staffOf.get(DATA.DEMO_CATEGORY_COACH[plan.category])
        const states = plan.citations === 'ALL_PLAYED'
            ? Object.fromEntries(citable(plan.category).map(person => [person.key, person.key === plan.autoConfirmed ? 'AUTO_CONFIRMED' : (person.key === plan.rejected?.key ? 'REJECTED' : 'CONFIRMED')]))
            : plan.citations ?? {}

        for (const [key, stateName] of Object.entries(states)) {
            const citationState = CITATION_STATES[stateName]
            const pending = citationState === CITATION_STATES.PENDING
            // Las Pendientes, ahora (vencen en 24 horas); el resto, unos días antes del partido (dentro de la ventana)
            const citedAt = pending ? now
                : plan.day > 0 ? new Date(now.getTime() - 20 * HOUR_MS)
                    : new Date(dateTime.getTime() - 4 * DAY_MS)
            const dateMaxResponse = pending ? responseDeadline : new Date(citedAt.getTime() + CITATION_RESPONSE_HOURS * HOUR_MS)
            const respondedAt = [CITATION_STATES.CONFIRMED, CITATION_STATES.REJECTED].includes(citationState)
                ? new Date(citedAt.getTime() + (3 + (key.length % 6)) * HOUR_MS) : null
            const updatedAt = respondedAt
                ?? (citationState === CITATION_STATES.AUTO_CONFIRMED ? new Date(dateMaxResponse.getTime() + 5 * 60 * 1000)
                    : citationState === CITATION_STATES.CANCELLED ? new Date(dateTime.getTime() - DAY_MS) : citedAt)

            const citation = await add(Citation, {
                clubId: club.id,
                gameId: game.id,
                memberId: memberOf.get(key).id,
                staffId: coach.id,
                justification: citationState === CITATION_STATES.REJECTED ? plan.rejected.justification : null,
                dateMaxResponse,
                dateResponse: respondedAt,
                citationState
            }, { at: citedAt, updatedAt })

            if (plan.day > 0 && (pending || citationState === CITATION_STATES.REJECTED)) {
                citationNotices[key] = { citation, game, person: people.find(item => item.key === key), coach: DATA.DEMO_CATEGORY_COACH[plan.category] }
            }
        }
    }

    // El conflicto de Camila tiene que ser el único del club (lo calcula games.service, como en la aplicación)
    const { conflicts } = await listConflicts({ clubId: club.id }, { transaction })
    if (conflicts.length !== 1 || conflicts[0].member.id !== memberOf.get('ctorres').id) {
        throw new Error(`Se esperaba un solo conflicto de horario (el de Camila) y hay ${conflicts.length}. Revisá las horas de DEMO_GAMES.`)
    }

    // --- Rutinas: lunes, miércoles y viernes de las tres categorías, semana actual y las dos anteriores ---
    const trainer = userOf.get('vsosa')
    const currentWeek = getCurrentWeekStart()
    for (const weekStart of [addDays(currentWeek, -14), addDays(currentWeek, -7), currentWeek]) {
        for (const [code, days] of Object.entries(DATA.DEMO_ROUTINES)) {
            for (const [dayOfWeek, routine] of Object.entries(days)) {
                await add(Routine, {
                    clubId: club.id,
                    categoryId: categoryOf.get(code).id,
                    userId: trainer.id,
                    weekStart,
                    dayOfWeek: Number(dayOfWeek),
                    title: routine.title,
                    description: routine.description,
                    imageUrl: null,
                    videoUrl: null
                }, { at: atAR(addDays(weekStart, -2), '11:00') })
            }
        }
    }

    // --- Notificaciones in-app (sin notify(): con el modelo, con los tipos y textos de los módulos) ---
    const notice = (recipientKey, { type, title, message, isRead = false, at, transmitterId = null, batchId = null }) => add(Notification, {
        clubId: club.id, recipientId: userOf.get(recipientKey)?.id ?? recipientKey, transmitterId, type, title, message, isRead, batchId
    }, { at })

    // Citación nueva (citations.service, createCitations)
    for (const key of ['ctorres', 'mromero']) {
        const { game } = citationNotices[key]
        await notice(key, {
            type: 'CITATION_NEW',
            title: `Te citaron para ${game.categoryName} vs. ${game.rival}`,
            message: `Te citaron para ${game.categoryName} vs. ${game.rival}, ${whenText(game.dateTime)}. Tenés tiempo de responder hasta el ${whenText(responseDeadline)}.`,
            at: now
        })
    }

    // Fixture publicado (games.service, notifyFixture): el partido de Mayores
    const mayoresGame = gameOf.get('MAYORES:5')
    await notice('ctorres', {
        type: 'FIXTURE_PUBLISHED',
        title: `Nuevo partido de ${mayoresGame.categoryName}`,
        message: `Nuevo partido: ${mayoresGame.categoryName} vs. ${mayoresGame.rival}, ${whenText(mayoresGame.dateTime)} (${mayoresGame.isHome ? 'Local' : 'Visitante'}). Dirección: ${mayoresGame.address}.`,
        isRead: true,
        at: mayoresGame.createdAt
    })

    // Cuota vencida de Sofía, a su adulta (fees.service, markOverdue, con includeFamily: mismo texto)
    const sofiaOverdue = (unpaidFees.get('sromero') ?? []).filter(fee => fee.feeState === FEE_STATES.OVERDUE).pop()
    if (sofiaOverdue) {
        await notice('gromero', {
            type: 'FEE_OVERDUE',
            title: `Tu cuota de ${monthNameOf(sofiaOverdue.period)} ${sofiaOverdue.period.slice(0, 4)} venció`,
            message: `Tu cuota de ${monthNameOf(sofiaOverdue.period)} venció el ${dateTimeParts(atAR(sofiaOverdue.expirationDate)).dayMonth}. Regularizá tu situación desde Mis cuotas.`,
            at: atAR(addDays(sofiaOverdue.expirationDate, 1), '00:15')
        })
    }

    // Suspensión por mora de Abril (fees.service, suspendOverdue): el día que superó el plazo del club
    const abrilOldest = unpaidFees.get('acastro')[0]
    await notice('acastro', {
        type: 'MEMBER_SUSPENDED',
        title: 'Perdiste tu condición de socio',
        message: `Por tener cuotas impagas hace más de ${club.delayFee} días, perdiste tu condición de socio. `
            + 'Mientras tanto no podés ser citada ni inscribirte a deportes. Se recupera sola cuando regularices tus cuotas.',
        isRead: true,
        at: atAR(addDays(abrilOldest.expirationDate, club.delayFee + 1), '00:15')
    })

    // Conflicto de horario (games.service, notifyConflicts): a las entrenadoras de las dos categorías
    const [first, second] = [gameOf.get('SUB18:5'), gameOf.get('MAYORES:5')].sort((a, b) => a.dateTime - b.dateTime)
    for (const key of ['cbenitez', 'lquiroga']) {
        await notice(key, {
            type: 'SCHEDULE_CONFLICT',
            title: `Partidos superpuestos: ${conflicts[0].member.name}`,
            message: `${conflicts[0].member.name} tiene dos partidos superpuestos: ${first.categoryName} (${shortWhen(first.dateTime)}) y ${second.categoryName} (${shortWhen(second.dateTime)}).`,
            at: second.createdAt
        })
    }

    // Solicitud de inscripción de Florencia (inscriptions.service, requestInscription)
    const florencia = memberOf.get('faguirre')
    await notice('mferreyra', {
        type: 'INSCRIPTION_REQUEST',
        title: `Nueva solicitud de inscripción a ${sport.name}`,
        message: `Nueva solicitud de inscripción a ${sport.name}: Florencia Aguirre (Nº ${florencia.numMember}).`,
        at: florenciaInscription.createdAt
    })

    // Respuesta a la citación: el rechazo de Pilar (citations.service, notifyCoaches)
    const rejection = citationNotices['pilar.medina']
    const { weekdayShort, dayMonth } = dateTimeParts(rejection.game.dateTime)
    await notice(rejection.coach, {
        type: 'CITATION_RESPONSE',
        title: `${fullNameOf(rejection.person)} no puede ir`,
        message: `${fullNameOf(rejection.person)} no puede ir a ${rejection.game.categoryName} vs. ${rejection.game.rival} (${weekdayShort} ${dayMonth}): «${rejection.citation.justification}».`,
        isRead: true,
        at: rejection.citation.dateResponse
    })

    // Aviso general del Admin a todas las socias y las familias (con batchId); lo leyó la mitad
    const batchId = crypto.randomUUID()
    const recipients = [
        ...memberPeople.filter(person => person.memberState !== 'INACTIVE' && person.userState !== 'PENDING'),
        ...people.filter(person => person.kind === 'family')
    ]
    const sentAt = atAR(addDays(today, -3), '18:00')
    for (const [index, person] of recipients.entries()) {
        await notice(person.key, { type: 'GENERAL', ...DATA.DEMO_GENERAL_NOTICE, isRead: index % 2 === 0, at: sentAt, transmitterId: admin.id, batchId })
    }

    return {
        counts,
        payments: paymentIndex,
        rocio: memberOf.get('rfernandez').numMember,
        julietaCode: memberOf.get('jmendez').codeFamily,
        responseDeadline
    }
}

// ---------- Consola ----------

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    return new Promise(resolve => rl.question(question, (answer) => {
        rl.close()
        resolve(answer.trim())
    }))
}

function printSummary({ target, result, reset, deleted, people }) {
    console.log(`\nDatos de la demo cargados en ${target}${reset ? ' (con --reset)' : ''}`)
    if (deleted) {
        const total = Object.values(deleted).reduce((sum, value) => sum + value, 0)
        console.log(`  Borrados antes de cargar: ${total} registros (la bitácora se conserva)`)
    }

    console.log('  Cargados por tabla:')
    for (const [table, count] of Object.entries(result.counts)) console.log(`    ${table.padEnd(16)} ${count}`)

    console.log(`\n  Rocío Fernández se registra con el número de socio ${result.rocio} y su fecha de nacimiento (09/10/1990)`)
    console.log(`  Código de vínculo de Julieta Méndez: ${result.julietaCode}`)
    console.log(`  Las citaciones Pendientes vencen el ${whenText(result.responseDeadline)} (hora de Argentina); después las confirma el job`)

    const real = people.filter(person => person.realEmail)
    if (real.length > 0) console.log(`  Emails reales: ${real.map(person => `${person.key} (${maskEmail(person.email)})`).join(', ')}`)
    if (!seedConfig.demo.email) console.log('  Aviso: sin SEED_DEMO_EMAIL, los demás usuarios tienen emails @demo.example, que no llegan a nadie')

    console.log('\n  Los usuarios y los casos para mostrar están en docs/demo-usuarios.md')
}

// ---------- Principal ----------

async function run() {
    const reset = process.argv.includes('--reset')

    // 1. Variables (antes de conectarse)
    if (!seedConfig.demo.password?.trim()) throw new DemoError('Falta definir SEED_DEMO_PASSWORD en el .env (la contraseña de los usuarios de la demo).')
    if (!isValidPassword(seedConfig.demo.password)) {
        throw new DemoError('SEED_DEMO_PASSWORD no cumple la política de contraseñas: al menos 8 caracteres, con una mayúscula, una minúscula, un número y un carácter especial.')
    }
    const realEmails = parseRealEmails(seedConfig.demo.realEmails)
    if (!seedConfig.demo.email) console.warn('Aviso: falta SEED_DEMO_EMAIL. Los usuarios de la demo van a tener emails @demo.example y esos emails no van a llegar a nadie.')

    // 2. Base: dónde corre (sin usuario ni contraseña)
    await sequelize.authenticate()
    const target = `${sequelize.config.host}:${sequelize.config.port ?? 3306} / ${sequelize.getDatabaseName()}`
    console.log(`Base de datos: ${target}`)

    // 3. El seed tiene que haber corrido
    let club
    let admin
    try {
        club = await Club.findOne({ where: { name: CLUB_SEED.club.name } })
        admin = club && await User.findOne({ where: { clubId: club.id, username: seedConfig.admin.username } })
    } catch (error) {
        if (error.original?.code === 'ER_NO_SUCH_TABLE') throw new DemoError('Primero corré npm run seed.')
        throw error
    }
    const adminRole = club && await Role.findOne({ where: { clubId: club.id, name: BASE_ROLES.ADMIN, isBase: true } })
    if (!club || !admin || !adminRole) throw new DemoError('Primero corré npm run seed.')

    // 4. Una sola carga
    const loaded = await User.findOne({ where: { username: DEMO_MARKER }, attributes: ['id'] })
    if (loaded && !reset) throw new DemoError('Ya hay datos de la demo cargados. Para recargarlos, corré npm run seed:demo -- --reset.')

    // 5. Emails, usuarios y DNI únicos (con --reset, contra lo que queda después del borrado)
    const people = buildPeople(realEmails)
    await assertUniqueUsers(people, { reset, club, admin })

    // 6. Confirmación del borrado
    if (reset) {
        console.log(`\nSe van a borrar TODOS los datos de ${club.name} salvo lo que carga el seed (el club, sus deportes, los roles base y el usuario ${admin.username}).`)
        console.log('La bitácora no se borra. No se tocan otros clubes.')
        const answer = await ask(`Para confirmar, escribí ${CONFIRM_WORD}: `)
        if (answer !== CONFIRM_WORD) throw new DemoError('Cancelado: no se borró ni se cargó nada.')
    }

    // 7. Todo en una transacción: si algo falla, no queda nada a medias
    let deleted = null
    const result = await sequelize.transaction(async (transaction) => {
        if (reset) deleted = await wipeClub(club, admin, adminRole, transaction)

        const loadedData = await loadDemo({ club, admin, people, transaction })

        const details = Object.entries(loadedData.counts).map(([table, count]) => `${table}: ${count}`).join(', ')
        await logger({ clubId: club.id, userId: null, roleId: null }, LOG_ACTIONS.DEMO_DATA_LOADED,
            `${reset ? 'Con --reset. ' : ''}${details}`, { transaction })
        return loadedData
    })

    printSummary({ target, result, reset, deleted, people })
}

run()
    .then(async () => {
        await sequelize.close()
        process.exit(0)
    })
    .catch(async (error) => {
        console.error(error instanceof DemoError ? error.message : `Error al cargar los datos de la demo: ${error.message}`)
        if (!(error instanceof DemoError)) console.error('No se guardó nada: la carga corre en una sola transacción.')
        await sequelize.close().catch(() => {})
        process.exit(1)
    })

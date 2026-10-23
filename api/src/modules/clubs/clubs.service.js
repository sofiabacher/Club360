// Service de clubs: parámetros del club y activación de deportes.
// Lógica de negocio y acceso a modelos. Filtra siempre por el clubId del usuario logueado (nunca el del body),
// registra las acciones relevantes en la bitácora (utils/logger) y lanza los errores con createError (utils/errors).
const { UniqueConstraintError } = require('sequelize')

const sequelize = require('../../config/db')
const { Club, Sport, ClubSport, Inscription } = require('../../models')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { stableStringify } = require('../../utils/integrity')
const { INSCRIPTION_STATES, LOG_ACTIONS } = require('../../utils/constants')
const { clubs: m } = require('../../utils/messages')

const actorOf = ({ id: userId, clubId, activeRoleId }) => ({ clubId, userId, roleId: activeRoleId })

// Los DECIMAL vuelven de MySQL como texto ("15000.00"): al front van como número
const toAmount = (value) => (value === null || value === undefined ? null : Number(value))

// Inscripciones que impiden desactivar un deporte
const BLOCKING_INSCRIPTION_STATES = [INSCRIPTION_STATES.PENDING, INSCRIPTION_STATES.APPROVED]

// extraInfo con todas sus claves (las que no vienen quedan vacías), así el front no tiene que preguntar si existen
function normalizeExtraInfo(extraInfo) {
    const info = extraInfo ?? {}

    return {
        whatsapp: info.whatsapp || null,
        secretaryHours: info.secretaryHours ?? [],
        courts: (info.courts ?? []).map(({ name, address }) => ({ name, address })),
        trainingSchedule: (info.trainingSchedule ?? []).map(({ sport, schedule }) => ({ sport, schedule }))
    }
}

async function findClub(clubId, options = {}) {
    const club = await Club.findByPk(clubId, options)
    if (!club) throw createError(m.clubNotFound, 404)
    return club
}

// ---------- Información pública ----------

// Deportes activos del club con su cuota deportiva: [{ clubSportId, sportId, name, priceFee }]
async function getActiveSports(clubId) {
    const clubSports = await ClubSport.findAll({
        where: { clubId, isActive: true },
        include: [{ model: Sport, as: 'sport', attributes: ['id', 'name'], where: { isActive: true } }],
        order: [[{ model: Sport, as: 'sport' }, 'name', 'ASC']]
    })

    return clubSports.map(clubSport => ({
        clubSportId: clubSport.id,
        sportId: clubSport.sport.id,
        name: clubSport.sport.name,
        priceFee: toAmount(clubSport.priceFee)
    }))
}

// Pantalla "El club": lo que puede ver cualquier usuario con clubs.viewInfo
async function getInfo({ clubId }) {
    const club = await findClub(clubId)

    return {
        name: club.name,
        address: club.address,
        phone: club.phone,
        email: club.email,
        accentColor: club.accentColor,
        extraInfo: normalizeExtraInfo(club.extraInfo),
        sports: await getActiveSports(clubId)
    }
}

// ---------- Configuración ----------

const settingsOf = (club) => ({
    name: club.name,   // Solo de lectura: el nombre del club no se edita
    socialFee: toAmount(club.socialFee),
    delayFee: club.delayFee,
    conflictMargin: club.conflictMargin,
    address: club.address,
    phone: club.phone,
    email: club.email,
    accentColor: club.accentColor,
    extraInfo: normalizeExtraInfo(club.extraInfo)
})

async function getSettings({ clubId }) {
    return settingsOf(await findClub(clubId))
}

// Campos de la configuración que se comparan para la bitácora, con cómo se muestran
const SETTINGS_FIELDS = {
    socialFee: { label: 'cuota social', format: toAmount },
    delayFee: { label: 'días de atraso', format: Number },
    conflictMargin: { label: 'margen de conflicto', format: Number },
    address: { label: 'dirección' },
    phone: { label: 'teléfono' },
    email: { label: 'email' },
    accentColor: { label: 'color del club' },
    extraInfo: { label: 'información general', format: (value) => stableStringify(normalizeExtraInfo(value)), hideValues: true }
}

// El nombre del club no se edita: si llega en el body, se ignora
async function updateSettings(actor, { socialFee, delayFee, conflictMargin, address, phone, email, accentColor, extraInfo }) {
    const changes = {
        socialFee,
        delayFee,
        conflictMargin,
        address,
        phone: phone || null,
        email,
        accentColor: accentColor.toUpperCase(),
        extraInfo: normalizeExtraInfo(extraInfo)
    }

    const club = await findClub(actor.clubId)

    const changed = Object.entries(SETTINGS_FIELDS).filter(([field, { format = (value) => value }]) =>
        format(club[field]) !== format(changes[field])
    )

    if (changed.length === 0) return settingsOf(club)

    const details = changed.map(([field, { label, format = (value) => value, hideValues }]) =>
        hideValues ? label : `${label}: ${format(club[field]) ?? '—'} → ${format(changes[field]) ?? '—'}`
    )

    try {
        await club.update(changes)

    } catch (error) {
        if (error instanceof UniqueConstraintError) throw createError(m.emailTaken, 409)   // club.email es único en la plataforma
        throw error
    }

    await logger(actorOf(actor), LOG_ACTIONS.CLUB_SETTINGS_UPDATED, details.join('. '))

    return settingsOf(club)
}

// ---------- Deportes del club ----------

// Catálogo maestro (solo los deportes activos de la plataforma) con el estado de cada uno en el club
async function listSports({ clubId }) {
    const [sports, clubSports] = await Promise.all([
        Sport.findAll({ where: { isActive: true }, attributes: ['id', 'name'], order: [['name', 'ASC']] }),
        ClubSport.findAll({ where: { clubId } })
    ])

    return sports.map(sport => {
        const clubSport = clubSports.find(item => item.sportId === sport.id)

        return {
            sportId: sport.id,
            name: sport.name,
            clubSportId: clubSport?.id ?? null,
            isActive: clubSport?.isActive ?? false,
            priceFee: toAmount(clubSport?.priceFee)
        }
    })
}

// Activa (crea o reactiva el clubSport), desactiva o cambia la cuota deportiva.
// No se desactiva un deporte con inscripciones Pendientes o Aprobadas.
async function updateSport(actor, sportId, { isActive, priceFee }) {
    const { clubId } = actor

    const result = await sequelize.transaction(async (transaction) => {
        const sport = await Sport.findOne({ where: { id: sportId, isActive: true }, transaction })
        if (!sport) throw createError(m.sportNotFound, 404)

        const clubSport = await ClubSport.findOne({ where: { clubId, sportId: sport.id }, transaction, lock: transaction.LOCK.UPDATE })
        const details = []

        if (isActive) {
            const newPrice = priceFee ?? toAmount(clubSport?.priceFee)   // Al reactivarlo, si no llega la cuota, conserva la anterior
            if (!newPrice) throw createError(m.priceFeeInvalid, 400)

            if (!clubSport) {
                await ClubSport.create({ clubId, sportId: sport.id, priceFee: newPrice, isActive: true }, { transaction })
                details.push(`activado con cuota deportiva ${newPrice}`)
            } else {
                const oldPrice = toAmount(clubSport.priceFee)
                if (!clubSport.isActive) details.push('reactivado')
                if (oldPrice !== newPrice) details.push(`cuota deportiva: ${oldPrice} → ${newPrice}`)
                if (details.length > 0) await clubSport.update({ isActive: true, priceFee: newPrice }, { transaction })
            }

        } else if (clubSport?.isActive) {
            const inscriptions = await Inscription.count({
                where: { clubSportId: clubSport.id, inscriptionState: BLOCKING_INSCRIPTION_STATES },
                transaction
            })

            if (inscriptions > 0) throw createError(m.sportHasInscriptions, 409)

            await clubSport.update({ isActive: false }, { transaction })
            details.push('desactivado')
        }

        return { sport, details }
    })

    if (result.details.length > 0) {
        await logger(actorOf(actor), LOG_ACTIONS.CLUB_SPORT_UPDATED, `${result.sport.name}: ${result.details.join(', ')}`)
    }

    const sports = await listSports(actor)
    return sports.find(item => item.sportId === result.sport.id)
}

module.exports = {
    getInfo,
    getSettings,
    updateSettings,
    listSports,
    updateSport
}

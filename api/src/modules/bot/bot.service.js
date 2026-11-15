// Service del bot de consultas (P21, contexto sección 9). Información general sobre el club y sobre cómo usar la
// plataforma: nunca datos personales, partidos, días de mora, margen de conflicto ni montos.
//
// - El conocimiento (knowledge/intents.json) se valida y se entrena al arrancar (initBot, desde server.js): si no valida,
//   el servidor no arranca.
// - El grupo del menú se calcula por permisos, nunca por el nombre del rol: citations.respond → jugadora; si no,
//   fees.manageLinked → familia; si no, socio.
// - Los datos del club (contacto, horarios, dirección y canchas) salen de club y club.extraInfo.
// - Privacidad: un texto con 7 o más dígitos seguidos o un email se bloquea y no se guarda. BOT_INTERACTION va a la
//   bitácora sin el texto; BOT_UNANSWERED (solo los fallbacks) guarda el texto sin userId ni roleId.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { Op } = require('sequelize')

const { Club, User, Log } = require('../../models')
const { getEffectivePermissions } = require('../access/access.service')
const { train, normalize } = require('./bot.classifier')

const logger = require('../../utils/logger')
const { createError } = require('../../utils/errors')
const { PERMISSIONS } = require('../../utils/permissions')
const {
    LOG_ACTIONS, BOT_GROUPS, BOT_THRESHOLD, BOT_SUGGEST_THRESHOLD, BOT_MAX_SUGGESTIONS, BOT_AMBIGUITY_MARGIN
} = require('../../utils/constants')
const { bot: m } = require('../../utils/messages')

const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge/intents.json')

// Intenciones de sistema: no se sugieren ni van en el menú
const SYSTEM_INTENTS = ['saludo', 'despedida', 'fuera_de_tema']
const FALLBACK_INTENT = 'fuera_de_tema'
const CONTACT_INTENT = 'club_contacto'

const MARKERS = ['club_nombre', 'club_contacto', 'club_horarios', 'club_direccion', 'club_canchas']
const MARKER_PATTERN = /\{([a-z_]+)\}/g

const actorOf = ({ id: userId, clubId, activeRoleId }) => ({ clubId, userId, roleId: activeRoleId })

let state = null   // { categories, screenPriority, intents, byTag, classifier }

// ---------- Conocimiento ----------

// Revisa el conocimiento y devuelve la lista de problemas (vacía si está bien)
function validateKnowledge(data) {
    const problems = []
    const categoryIds = new Set((data.categories ?? []).map(category => category.id))
    const tags = (data.intents ?? []).map(intent => intent.tag)
    const tagSet = new Set(tags)

    if (!Array.isArray(data.intents) || data.intents.length === 0) problems.push('no hay intenciones')
    tags.filter((tag, index) => tags.indexOf(tag) !== index).forEach(tag => problems.push(`el tag "${tag}" está repetido`))
    SYSTEM_INTENTS.filter(tag => !tagSet.has(tag)).forEach(tag => problems.push(`falta la intención de sistema "${tag}"`))
    if (!tagSet.has(CONTACT_INTENT)) problems.push(`falta la intención "${CONTACT_INTENT}"`)

    for (const [screen, category] of Object.entries(data.screenPriority ?? {})) {
        if (!categoryIds.has(category)) problems.push(`screenPriority: la pantalla "${screen}" apunta a la categoría "${category}", que no existe`)
    }

    for (const intent of data.intents ?? []) {
        const name = `intención "${intent.tag}"`
        if (!intent.tag || !/^[a-z_]+$/.test(intent.tag)) problems.push(`${name}: el tag tiene que tener solo minúsculas y guiones bajos`)
        if (intent.category !== null && !categoryIds.has(intent.category)) problems.push(`${name}: la categoría "${intent.category}" no existe`)
        if (intent.button && intent.category === null) problems.push(`${name}: una intención con botón necesita una categoría`)
        if (intent.button && !intent.label) problems.push(`${name}: tiene botón y no tiene label`)
        if (!Array.isArray(intent.groups) || intent.groups.length === 0) problems.push(`${name}: no tiene grupos`)
        ;(intent.groups ?? []).filter(group => !BOT_GROUPS.includes(group)).forEach(group => problems.push(`${name}: el grupo "${group}" no existe`))
        if (!Array.isArray(intent.patterns) || intent.patterns.length === 0) problems.push(`${name}: no tiene patrones`)
        ;(intent.followUps ?? []).filter(tag => !tagSet.has(tag)).forEach(tag => problems.push(`${name}: el followUp "${tag}" no existe`))
        Object.keys(intent.responsesByGroup ?? {}).filter(group => !BOT_GROUPS.includes(group)).forEach(group => problems.push(`${name}: responsesByGroup tiene el grupo "${group}", que no existe`))

        const texts = [intent.response, ...(intent.responses ?? []), ...Object.values(intent.responsesByGroup ?? {})].filter(text => typeof text === 'string')
        if (intent.tag !== FALLBACK_INTENT && !texts.some(Boolean)) problems.push(`${name}: no tiene respuesta`)
        for (const text of texts) {
            for (const [, marker] of text.matchAll(MARKER_PATTERN)) {
                if (!MARKERS.includes(marker)) problems.push(`${name}: el marcador {${marker}} no es válido`)
            }
        }
    }

    return problems
}

// Lee, valida y entrena. Si el conocimiento no valida, lanza un error con todos los problemas
function loadKnowledge(file = KNOWLEDGE_FILE) {
    let data
    try {
        data = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (error) {
        throw new Error(`El conocimiento del bot (${path.basename(file)}) no se pudo leer: ${error.message}`)
    }

    const problems = validateKnowledge(data)
    if (problems.length > 0) {
        throw new Error(`El conocimiento del bot (${path.basename(file)}) no es válido:\n  - ${problems.join('\n  - ')}`)
    }

    return {
        categories: [...data.categories].sort((a, b) => a.order - b.order),
        screenPriority: data.screenPriority ?? {},
        intents: data.intents,
        byTag: new Map(data.intents.map(intent => [intent.tag, intent])),
        classifier: train(data.intents)
    }
}

// Al arrancar el servidor. Devuelve un resumen para la consola
function initBot() {
    state = loadKnowledge()
    return { intents: state.intents.length, patterns: state.classifier.patternCount, vocabulary: state.classifier.vocabularySize }
}

const knowledge = () => state ?? (state = loadKnowledge())

// ---------- Grupo, datos del club y textos ----------

// Grupo del menú, por permisos (nunca por el nombre del rol)
async function groupOf(user) {
    const permissions = await getEffectivePermissions(user.id, user.activeRoleId)
    if (permissions.includes(PERMISSIONS.CITATIONS_RESPOND)) return 'jugadora'
    if (permissions.includes(PERMISSIONS.FEES_MANAGE_LINKED)) return 'familia'
    return 'socio'
}

const isVisible = (intent, group) => Boolean(intent) && intent.groups.includes(group)

// "a, b y c"
const listText = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`)

// Valor de cada marcador con los datos del club, o null si el dato no está cargado
async function clubMarkers(clubId) {
    const club = await Club.findByPk(clubId, { attributes: ['name', 'address', 'phone', 'email', 'extraInfo'] })
    const extra = club?.extraInfo ?? {}

    const contact = [
        club?.phone && `teléfono ${club.phone}`,
        extra.whatsapp && `WhatsApp ${extra.whatsapp}`,
        club?.email && `email ${club.email}`
    ].filter(Boolean)

    const hours = [
        extra.secretaryHours?.length > 0 && `Secretaría: ${extra.secretaryHours.join('; ')}.`,
        ...(extra.trainingSchedule ?? []).map(({ sport, schedule }) => `Entrenamientos de ${sport}: ${schedule}.`)
    ].filter(Boolean)

    const courts = (extra.courts ?? []).map(({ name, address }) => `${name} (${address})`)

    return {
        club_nombre: club?.name ?? null,
        club_contacto: contact.length > 0 ? `${listText(contact)}.` : null,
        club_horarios: hours.length > 0 ? hours.join(' ') : null,
        club_direccion: club?.address ?? null,
        club_canchas: courts.length > 0 ? `${courts.join('; ')}.` : null
    }
}

// Reemplaza los marcadores. Si a alguno le falta el dato, devuelve el aviso de dato faltante
function render(text, markers) {
    const used = [...text.matchAll(MARKER_PATTERN)].map(([, marker]) => marker)
    if (used.some(marker => !markers[marker])) return m.missingData
    return text.replace(MARKER_PATTERN, (match, marker) => markers[marker])
}

// La respuesta fija de una intención (la del grupo, si tiene una propia; saludo y despedida varían)
function responseOf(intent, group) {
    if (intent.responses?.length > 0) return intent.responses[Math.floor(Math.random() * intent.responses.length)]
    return intent.responsesByGroup?.[group] ?? intent.response
}

const menuButton = () => ({ type: 'menu', value: 'menu', label: m.backToMenu })
const contactButton = () => ({ type: 'intent', value: CONTACT_INTENT, label: m.contactClub })
const intentButton = (intent) => ({ type: 'intent', value: intent.tag, label: intent.label })

// Botones después de una respuesta: los de seguimiento visibles para el grupo, "Volver al menú" y "Contactar al club"
function answerButtons(intent, group) {
    const { byTag } = knowledge()
    const followUps = (intent.followUps ?? []).map(tag => byTag.get(tag)).filter(item => isVisible(item, group) && item.label).map(intentButton)
    return [...followUps, menuButton(), ...(intent.tag === CONTACT_INTENT ? [] : [contactButton()])]
}

// Un texto con 7 o más dígitos seguidos (también con puntos, espacios o guiones entre ellos, como un DNI "40.123.456")
// o con un email
function hasPersonalData(text) {
    const digits = String(text).replace(/(\d)[.\s-](?=\d)/g, '$1')
    return /\d{7,}/.test(digits) || /[^\s@]+@[^\s@]+\.[^\s@]+/.test(text)
}

// ---------- Menú ----------

// Categoría que va primero según la pantalla: la ruta más larga que coincide en screenPriority ("family/fees" antes que
// "family"); el front manda la ruta sin la barra inicial
function priorityCategory(screen) {
    const { screenPriority } = knowledge()
    const parts = String(screen ?? '').split('/').filter(Boolean)
    for (let length = parts.length; length > 0; length--) {
        const category = screenPriority[parts.slice(0, length).join('/')]
        if (category) return category
    }
    return null
}

// Categorías del grupo (solo las que tienen al menos una intención con botón visible), con sus preguntas. La de la
// pantalla va primero
function menuOf(group, screen) {
    const { categories, intents } = knowledge()
    const items = categories
        .map(category => ({
            id: category.id,
            label: category.label,
            questions: intents
                .filter(intent => intent.button && intent.category === category.id && isVisible(intent, group))
                .map(intent => ({ intent: intent.tag, label: intent.label }))
        }))
        .filter(category => category.questions.length > 0)

    const first = priorityCategory(screen)
    return [...items.filter(category => category.id === first), ...items.filter(category => category.id !== first)]
}

async function getMenu(user, { screen }) {
    const [group, me, markers] = await Promise.all([
        groupOf(user),
        User.findByPk(user.id, { attributes: ['name'] }),
        clubMarkers(user.clubId)
    ])

    return { group, greeting: m.greeting(me?.name ?? '', markers.club_nombre ?? 'tu club'), categories: menuOf(group, screen) }
}

// ---------- Chat ----------

// POST /bot/chat: un botón va directo a la intención; el texto libre pasa por el clasificador. Responde
// { responseType, response, intent, confidence, buttons, interactionId }
async function chat(user, { type, message, intent: requestedTag, screen }) {
    const { byTag, classifier } = knowledge()
    const group = await groupOf(user)
    const interactionId = crypto.randomUUID()
    const cleanScreen = String(screen ?? '').slice(0, 100) || null

    let result

    if (type === 'button') {
        const intent = byTag.get(requestedTag)
        result = isVisible(intent, group) && intent.tag !== FALLBACK_INTENT
            ? await answerOf(intent, group, user.clubId, null)
            : otherProfile(requestedTag)
    } else if (hasPersonalData(message)) {
        result = { responseType: 'blocked', response: m.blocked, intent: null, confidence: null, buttons: [menuButton()] }
    } else {
        result = await classifyText(message, group, user.clubId, classifier, byTag)
    }

    await logger(actorOf(user), LOG_ACTIONS.BOT_INTERACTION, JSON.stringify({
        interactionId,
        group,
        screen: cleanScreen,
        type,
        intent: result.intent,
        confidence: result.confidence,
        responseType: result.responseType
    }))

    // Solo los textos sin respuesta, sin identificar al usuario, para mejorar la base de conocimiento
    if (result.responseType === 'fallback') {
        await logger({ clubId: user.clubId, userId: null, roleId: null }, LOG_ACTIONS.BOT_UNANSWERED, String(message).trim())
    }

    return { ...result, interactionId }
}

async function answerOf(intent, group, clubId, confidence) {
    const response = render(responseOf(intent, group), await clubMarkers(clubId))
    const buttons = intent.tag === 'saludo' || intent.tag === 'despedida' ? [menuButton()] : answerButtons(intent, group)
    return { responseType: 'answer', response, intent: intent.tag, confidence, buttons }
}

const otherProfile = (tag, confidence = null) => ({
    responseType: 'other_profile', response: m.otherProfile, intent: tag ?? null, confidence, buttons: [menuButton()]
})

async function fallback(clubId, confidence, tag = null) {
    const { club_contacto: contact } = await clubMarkers(clubId)
    return { responseType: 'fallback', response: m.fallback(contact ?? m.missingData), intent: tag, confidence, buttons: [menuButton(), contactButton()] }
}

// Decide qué hacer con la clasificación de un texto: 'answer', 'suggestions' o 'fallback'. La usa también npm run bot:eval
function decide(text, ranked) {
    const [top, second] = ranked
    if (top.tag === FALLBACK_INTENT || top.confidence < BOT_SUGGEST_THRESHOLD) return 'fallback'
    if (top.confidence < BOT_THRESHOLD) return 'suggestions'

    // Una sola palabra que comparten dos intenciones casi por igual ("citación"): ambigua
    const ambiguous = normalize(text).length === 1 && !SYSTEM_INTENTS.includes(top.tag) && second && top.confidence - second.confidence < BOT_AMBIGUITY_MARGIN
    return ambiguous ? 'suggestions' : 'answer'
}

async function classifyText(message, group, clubId, classifier, byTag) {
    const ranked = classifier.classify(message)
    const top = ranked[0]
    const decision = decide(message, ranked)

    if (decision === 'fallback') return fallback(clubId, top.confidence, top.tag === FALLBACK_INTENT ? top.tag : null)

    if (decision === 'answer') {
        const intent = byTag.get(top.tag)
        return isVisible(intent, group) ? answerOf(intent, group, clubId, top.confidence) : otherProfile(top.tag, top.confidence)
    }

    // Confianza media: hasta 3 intenciones visibles para el grupo, sin las de sistema
    const suggestions = ranked
        .filter(({ tag, confidence }) => confidence >= BOT_SUGGEST_THRESHOLD && !SYSTEM_INTENTS.includes(tag))
        .map(({ tag }) => byTag.get(tag))
        .filter(intent => isVisible(intent, group) && intent.label)
        .slice(0, BOT_MAX_SUGGESTIONS)

    if (suggestions.length === 0) return fallback(clubId, top.confidence)

    return {
        responseType: 'suggestions',
        response: m.suggestions,
        intent: top.tag,
        confidence: top.confidence,
        buttons: [...suggestions.map(intentButton), menuButton()]
    }
}

// ---------- Feedback ----------

// 👍/👎 de una respuesta: un registro aparte en la bitácora (la bitácora no se edita). La consulta tiene que ser del
// usuario logueado; si no, 404
async function saveFeedback(user, { interactionId, useful }) {
    const interaction = await Log.findOne({
        where: { clubId: user.clubId, userId: user.id, action: LOG_ACTIONS.BOT_INTERACTION.message, details: { [Op.like]: `%"interactionId":"${interactionId}"%` } },
        attributes: ['id']
    })
    if (!interaction) throw createError(m.interactionIdInvalid, 404)

    await logger(actorOf(user), LOG_ACTIONS.BOT_FEEDBACK, JSON.stringify({ interactionId, useful }))
    return { saved: true, message: m.feedbackSaved }
}

module.exports = {
    initBot,
    loadKnowledge,
    validateKnowledge,
    hasPersonalData,
    decide,
    groupOf,
    getMenu,
    chat,
    saveFeedback
}

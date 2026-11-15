// Evaluación del bot de consultas (P21): clasifica el set de prueba (knowledge/test-questions.json, preguntas distintas de
// los patrones) con el mismo clasificador y los mismos umbrales del back, y guarda el informe en
// docs/pruebas/bot-evaluacion.txt (evidencia de la etapa de Prueba). No usa la base de datos.
//
// Cómo se cuenta un acierto (con decide(), la misma regla del back):
//   - una pregunta de una intención: el bot respondería (no sugiere ni cae en el fallback) y la intención ganadora es la
//     esperada;
//   - una frase fuera de tema: termina en fallback o en sugerencias.
// Además informa la precisión "top-1" (la intención ganadora, sin mirar el umbral).
//
// Uso: npm run bot:eval
const fs = require('fs')
const path = require('path')

const { loadKnowledge, decide } = require('../src/modules/bot/bot.service')
const { normalize } = require('../src/modules/bot/bot.classifier')
const { BOT_THRESHOLD, BOT_SUGGEST_THRESHOLD, BOT_AMBIGUITY_MARGIN } = require('../src/utils/constants')

const TEST_FILE = path.join(__dirname, '../src/modules/bot/knowledge/test-questions.json')
const REPORT_FILE = path.join(__dirname, '../../docs/pruebas/bot-evaluacion.txt')
const OFF_TOPIC = 'fuera_de_tema'
const HISTORY_TITLE = 'HISTORIAL DE CORRIDAS'

const percent = (value, total) => (total === 0 ? '—' : `${(Math.round((value / total) * 1000) / 10).toFixed(1).replace('.', ',')} %`)
const pad = (text, length) => String(text).padEnd(length)

// Fecha y hora de Argentina: "15/11/2026 10:30"
const nowText = () => new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
}).format(new Date()).replace(',', '')

// Las líneas del historial del informe anterior (si existe), para no perderlas
function previousHistory() {
    if (!fs.existsSync(REPORT_FILE)) return []
    const text = fs.readFileSync(REPORT_FILE, 'utf8')
    const start = text.indexOf(HISTORY_TITLE)
    if (start === -1) return []
    return text.slice(start).split('\n').filter(line => line.startsWith('- '))
}

function evaluate() {
    const { intents, classifier } = loadKnowledge()
    const { questions } = JSON.parse(fs.readFileSync(TEST_FILE, 'utf8'))
    const tags = new Set(intents.map(intent => intent.tag))

    // Las preguntas no pueden ser patrones de entrenamiento (tampoco una vez normalizadas)
    const trained = new Set(intents.flatMap(intent => intent.patterns.map(pattern => normalize(pattern).join(' '))))
    const repeated = questions.filter(question => trained.has(normalize(question.text).join(' ')))
    const unknown = questions.filter(question => !tags.has(question.intent))

    const perIntent = new Map()
    const confusion = new Map()   // "esperada → obtenida" → cantidad
    const errors = []
    let correct = 0
    let top1 = 0
    let offTopicTotal = 0
    let offTopicFallback = 0
    let offTopicSuggestions = 0

    for (const { text, intent: expected } of questions) {
        const ranked = classifier.classify(text)
        const [best] = ranked
        const decision = decide(text, ranked)
        const answers = decision === 'answer'
        let ok

        if (expected === OFF_TOPIC) {
            offTopicTotal++
            if (decision === 'fallback') offTopicFallback++
            if (decision === 'suggestions') offTopicSuggestions++
            ok = !answers
        } else {
            ok = best.tag === expected && answers
        }

        if (best.tag === expected) top1++
        if (ok) correct++

        const stats = perIntent.get(expected) ?? { total: 0, correct: 0 }
        perIntent.set(expected, { total: stats.total + 1, correct: stats.correct + (ok ? 1 : 0) })

        const obtained = expected === OFF_TOPIC
            ? (ok ? OFF_TOPIC : best.tag)
            : (answers ? best.tag : `(${decision === 'suggestions' ? 'sugerencias' : 'fallback'})`)
        if (obtained !== expected) {
            const key = `${expected} → ${obtained}`
            confusion.set(key, (confusion.get(key) ?? 0) + 1)
        }
        if (!ok) errors.push({ text, expected, obtained, best })
    }

    return { questions, intents, perIntent, confusion, errors, correct, top1, offTopicTotal, offTopicFallback, offTopicSuggestions, repeated, unknown }
}

function report(result) {
    const { questions, perIntent, confusion, errors, correct, top1, offTopicTotal, offTopicFallback, offTopicSuggestions, repeated, unknown } = result
    const total = questions.length
    const date = nowText()
    const summary = `${date} · umbrales ${BOT_THRESHOLD} / ${BOT_SUGGEST_THRESHOLD} · precisión ${percent(correct, total)} (${correct}/${total}) · top-1 ${percent(top1, total)} · fuera de tema sin respuesta ${offTopicFallback + offTopicSuggestions}/${offTopicTotal}`

    const lines = []
    lines.push('EVALUACIÓN DEL BOT DE CONSULTAS (P21)')
    lines.push('======================================================================')
    lines.push('')
    lines.push(`Fecha: ${date} (hora de Argentina). Generado con npm run bot:eval.`)
    lines.push(`Umbrales: BOT_THRESHOLD = ${BOT_THRESHOLD} (responde), BOT_SUGGEST_THRESHOLD = ${BOT_SUGGEST_THRESHOLD} (sugiere) y BOT_AMBIGUITY_MARGIN = ${BOT_AMBIGUITY_MARGIN} (una palabra ambigua).`)
    lines.push(`Conocimiento: ${result.intents.length} intenciones, ${result.intents.reduce((sum, intent) => sum + intent.patterns.length, 0)} patrones.`)
    lines.push(`Set de prueba: ${total} preguntas (${total - offTopicTotal} de intenciones y ${offTopicTotal} fuera de tema), distintas de los patrones.`)
    lines.push('Acierto: el bot responde (con la misma regla del back) y la intención ganadora es la esperada. Fuera de tema:')
    lines.push('termina en fallback o en sugerencias. "Top-1": la intención ganadora, sin mirar los umbrales.')
    lines.push('')
    lines.push('RESULTADO')
    lines.push('----------------------------------------------------------------------')
    lines.push(`Precisión total:        ${percent(correct, total)} (${correct} de ${total})  — meta: 90 % o más`)
    lines.push(`Precisión top-1:        ${percent(top1, total)}`)
    lines.push(`Fuera de tema:          ${offTopicFallback} en fallback, ${offTopicSuggestions} en sugerencias, ${offTopicTotal - offTopicFallback - offTopicSuggestions} respondidas (de ${offTopicTotal})  — meta: ninguna respondida`)
    if (repeated.length > 0) lines.push(`ATENCIÓN: ${repeated.length} preguntas son iguales a un patrón: ${repeated.map(question => `"${question.text}"`).join(', ')}`)
    if (unknown.length > 0) lines.push(`ATENCIÓN: ${unknown.length} preguntas esperan una intención que no existe`)
    lines.push('')
    lines.push('PRECISIÓN POR INTENCIÓN')
    lines.push('----------------------------------------------------------------------')
    for (const [tag, stats] of [...perIntent].sort((a, b) => a[0].localeCompare(b[0]))) {
        lines.push(`${pad(tag, 26)} ${pad(`${stats.correct}/${stats.total}`, 6)} ${percent(stats.correct, stats.total)}`)
    }
    lines.push('')
    lines.push('MATRIZ DE CONFUSIÓN (solo las celdas fuera de la diagonal: esperada → obtenida)')
    lines.push('----------------------------------------------------------------------')
    if (confusion.size === 0) lines.push('Sin confusiones.')
    for (const [key, count] of [...confusion].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) lines.push(`${pad(count, 3)} ${key}`)
    lines.push('')
    lines.push('ERRORES')
    lines.push('----------------------------------------------------------------------')
    if (errors.length === 0) lines.push('Sin errores.')
    for (const { text, expected, obtained, best } of errors) {
        lines.push(`"${text}"`)
        lines.push(`    esperada: ${expected} · obtenida: ${obtained} (ganadora ${best.tag}, confianza ${String(best.confidence).replace('.', ',')})`)
    }
    lines.push('')
    lines.push(HISTORY_TITLE)
    lines.push('----------------------------------------------------------------------')
    lines.push(...previousHistory(), `- ${summary}`)
    lines.push('')

    fs.writeFileSync(REPORT_FILE, lines.join('\n'))
    return summary
}

const result = evaluate()
const summary = report(result)
console.log(summary)
console.log(`Informe: ${path.relative(process.cwd(), REPORT_FILE)}`)
if (result.errors.length > 0) {
    console.log(`\n${result.errors.length} errores:`)
    result.errors.forEach(({ text, expected, obtained, best }) => console.log(`  "${text}" → esperada ${expected}, obtenida ${obtained} (${best.tag} ${best.confidence})`))
}

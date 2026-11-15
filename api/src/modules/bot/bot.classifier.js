// Clasificador del bot de consultas (P21): similitud de coseno con TF-IDF sobre los patrones de cada intención, en
// JavaScript, sin red neuronal ni servicios externos. Se entrena al arrancar (milisegundos) y no se guarda ningún modelo.
//
// normalize() es la misma para los patrones y para el texto del usuario: minúsculas, sin tildes ni signos, tokens, sin
// stopwords en español (salvo "no" y "si", que cambian el sentido) y con stemming en español (PorterStemmerEs de natural).
//
// Dos espacios TF-IDF sobre esas raíces: palabras y trigramas de caracteres (para los errores de tipeo, como
// "trasferencia"). La similitud con un patrón es el promedio ponderado de los dos cosenos (CHAR_WEIGHT).
// Del paquete natural se cargan solo el stemmer y las stopwords: su índice completo trae módulos que no cargan en Node 20.
const stemmer = require('natural/lib/natural/stemmers/porter_stemmer_es')
const { words: naturalStopwords } = require('natural/lib/natural/util/stopwords_es')

// Saca las tildes pero conserva la ñ ("campaña" no es "campana"): se descompone, se borran las marcas salvo la tilde de
// la ñ (U+0303) y se vuelve a componer
const stripAccents = (text) => text.normalize('NFD').replace(/[̀-̂̄-ͯ]/g, '').normalize('NFC')

const KEEP = new Set(['no', 'si'])
const CHAR_WEIGHT = 0.5   // Peso de los trigramas de caracteres en la similitud (el resto, las palabras)
const STOPWORDS = new Set(naturalStopwords.map(word => stripAccents(word.toLowerCase())).filter(word => !KEEP.has(word)))

// Texto → lista de raíces
function normalize(text) {
    return stripAccents(String(text).toLowerCase())
        .replace(/[^a-z0-9ñ\s]/g, ' ')
        .split(/\s+/)
        .filter(token => token && !STOPWORDS.has(token))
        .map(token => stemmer.stem(token))
        .filter(Boolean)
}

// Trigramas de caracteres de cada raíz, con marcas de inicio y fin ("#pag#" → "#pa", "pag", "ag#")
function charGrams(terms) {
    return terms.flatMap(term => {
        const word = `#${term}#`
        return Array.from({ length: Math.max(word.length - 2, 0) }, (_, index) => word.slice(index, index + 3))
    })
}

// Frecuencia de cada término de una lista
function termCounts(terms) {
    const counts = new Map()
    terms.forEach(term => counts.set(term, (counts.get(term) ?? 0) + 1))
    return counts
}

// Vector TF-IDF (Map término → peso), normalizado (norma 1) para que el coseno sea el producto escalar.
// unknownWeight (solo para el texto del usuario): las palabras que no están en ningún patrón también cuentan, con el
// peso de la palabra más rara. Así "cómo se hace un asado" no se parece a "cómo se hace socia" solo por "hace": las
// palabras desconocidas bajan la similitud
function vectorOf(terms, idf, unknownWeight = 0) {
    const vector = new Map()
    for (const [term, count] of termCounts(terms)) {
        const weight = idf.get(term) ?? unknownWeight
        if (weight) vector.set(term, count * weight)
    }

    const norm = Math.sqrt([...vector.values()].reduce((sum, value) => sum + value * value, 0))
    if (norm > 0) vector.forEach((value, term) => vector.set(term, value / norm))
    return vector
}

function dot(a, b) {
    const [small, large] = a.size <= b.size ? [a, b] : [b, a]
    let sum = 0
    small.forEach((value, term) => { sum += value * (large.get(term) ?? 0) })
    return sum
}

// Un espacio TF-IDF entrenado con los términos de cada patrón: el IDF, el peso de las palabras desconocidas y un vector
// por patrón. El IDF se calcula por intención (cada intención, con todos sus patrones, es un documento): así una palabra
// que caracteriza a una intención ("liga") pesa mucho aunque esté en muchos de sus patrones, y una que aparece en muchas
// intenciones ("puedo") pesa poco. IDF suavizado: log((1 + N) / (1 + df)) + 1
function buildSpace(documentsTerms, documentTags) {
    const termsByTag = new Map()
    documentsTerms.forEach((terms, index) => {
        const tag = documentTags[index]
        termsByTag.set(tag, new Set([...(termsByTag.get(tag) ?? []), ...terms]))
    })

    const df = new Map()
    termsByTag.forEach(terms => terms.forEach(term => df.set(term, (df.get(term) ?? 0) + 1)))
    const idf = new Map([...df].map(([term, count]) => [term, Math.log((1 + termsByTag.size) / (1 + count)) + 1]))
    const unknownWeight = Math.log(1 + termsByTag.size) + 1   // El IDF de un término que no aparece en ninguna intención

    return {
        idf,
        vectors: documentsTerms.map(terms => vectorOf(terms, idf)),
        query: (terms) => vectorOf(terms, idf, unknownWeight)
    }
}

// Entrena con [{ tag, patterns }]. Devuelve { classify(text) → [{ tag, confidence }] ordenadas de mayor a menor }.
// La confianza de cada intención es la mayor similitud entre el texto y sus patrones
function train(intents) {
    const documents = intents.flatMap(({ tag, patterns }) => patterns.map(pattern => ({ tag, terms: normalize(pattern) })))
    const tagsOfDocuments = documents.map(({ tag }) => tag)
    const words = buildSpace(documents.map(({ terms }) => terms), tagsOfDocuments)
    const chars = buildSpace(documents.map(({ terms }) => charGrams(terms)), tagsOfDocuments)
    const tags = [...new Set(intents.map(({ tag }) => tag))]

    function classify(text) {
        const terms = normalize(text)
        const wordQuery = words.query(terms)
        const charQuery = chars.query(charGrams(terms))
        const best = new Map(tags.map(tag => [tag, 0]))

        if (wordQuery.size > 0) {
            documents.forEach(({ tag }, index) => {
                const similarity = (1 - CHAR_WEIGHT) * dot(wordQuery, words.vectors[index]) + CHAR_WEIGHT * dot(charQuery, chars.vectors[index])
                if (similarity > best.get(tag)) best.set(tag, similarity)
            })
        }

        return [...best]
            .map(([tag, confidence]) => ({ tag, confidence: Math.round(confidence * 1000) / 1000 }))
            .sort((a, b) => b.confidence - a.confidence)
    }

    return { classify, vocabularySize: words.idf.size, patternCount: documents.length }
}

module.exports = {
    normalize,
    train
}

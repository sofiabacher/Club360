// CSV para Excel en español: UTF-8 con BOM (para que respete tildes y ñ), separador ';' y fin de línea CRLF.
// Lo usan la bitácora y el informe de integridad.
const BOM = '﻿'
const SEPARATOR = ';'

// Un valor de una celda: si tiene el separador, comillas o saltos de línea, va entre comillas y las comillas se duplican
function cell(value) {
    if (value === null || value === undefined) return ''
    const text = String(value)
    return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// headers: ['Fecha', ...]; rows: [[valor, ...], ...]. Devuelve el texto del archivo
function toCsv(headers, rows) {
    return BOM + [headers, ...rows].map(row => row.map(cell).join(SEPARATOR)).join('\r\n') + '\r\n'
}

// AAAAMMDD-HHmm en la hora de Argentina (para los nombres de archivo)
function fileStamp(date = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(date).map(part => [part.type, part.value]))
    return { minutes: `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}`, seconds: `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}${parts.second}` }
}

// 'Club Valencia' → 'club-valencia' (para los nombres de archivo)
const slugOf = (text) => String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

module.exports = { toCsv, fileStamp, slugOf }

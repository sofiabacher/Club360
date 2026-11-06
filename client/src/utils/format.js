// Formatos de fechas y montos para mostrar en pantalla
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale/es'

// '2026-10-21' o '2026-10-21T15:00:00.000Z' → '21/10/2026'
export function formatDate(value) {
  if (!value) return ''
  return format(typeof value === 'string' ? parseISO(value) : value, 'dd/MM/yyyy')
}

const moneyFormat = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 })

// 15000 → '$ 15.000'
export function formatMoney(value) {
  if (value === null || value === undefined) return ''
  return moneyFormat.format(value)
}

// Link de WhatsApp a partir de un número argentino como '11 5000-0000' → 'https://wa.me/5491150000000'.
// Se sacan los símbolos y el 0 del código de área; si ya trae el 54 (o el 549), no se repite.
export function getWhatsAppUrl(number) {
  let digits = String(number ?? '').replace(/\D/g, '')
  if (!digits) return null

  if (digits.startsWith('54')) digits = digits.slice(2)
  if (digits.startsWith('9')) digits = digits.slice(1)
  if (digits.startsWith('0')) digits = digits.slice(1)

  return `https://wa.me/549${digits}`
}

// Fecha y hora completas: 'sábado 1 de noviembre, 16:44'
export function formatDateTimeLong(value) {
  if (!value) return ''
  return format(typeof value === 'string' ? parseISO(value) : value, "EEEE d 'de' MMMM, HH:mm", { locale: es })
}

const toDate = (value) => (typeof value === 'string' ? parseISO(value) : value)
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

// Encabezado de un día del fixture: 'Sábado 7 de noviembre'
export function formatDayHeader(value) {
  return capitalize(format(toDate(value), "EEEE d 'de' MMMM", { locale: es }))
}

// Hora: '18:30'
export function formatTime(value) {
  return format(toDate(value), 'HH:mm')
}

// Fecha de un partido en grande: 'SÁB 7/11 · 18:30'
export function formatGameDate(value) {
  const date = toDate(value)
  return `${format(date, 'EEE', { locale: es }).replace('.', '').toUpperCase()} ${format(date, 'd/M')} · ${format(date, 'HH:mm')}`
}

// Día y hora cortos: 'sáb. 7/11 18:30'
export function formatShortDateTime(value) {
  const date = toDate(value)
  return `${format(date, 'EEE', { locale: es })} ${format(date, 'd/M HH:mm')}`
}

// Link de Google Maps para una dirección
export function getMapsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

// Fecha relativa: 'hace 2 horas', 'hace 3 días'
export function formatRelative(value) {
  if (!value) return ''
  return formatDistanceToNow(typeof value === 'string' ? parseISO(value) : value, { addSuffix: true, locale: es })
}

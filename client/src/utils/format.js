// Formatos de fechas y montos para mostrar en pantalla
import { format, parseISO } from 'date-fns'

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

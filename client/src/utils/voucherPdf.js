// PDF del comprobante de pago, generado en el navegador con jsPDF (se carga solo al descargar).
// Mismo diseño que la pantalla: encabezado Pizarra con el club, franja del color propio, código, detalle y total.
// Los colores llegan del tema (palette), no se escriben acá
import { formatDateTimeLong, formatMoney, formatPeriod } from './format.js'

const PAGE_MARGIN = 20
const ROW_HEIGHT = 9

export async function downloadVoucherPdf(voucher, palette) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const contentWidth = width - PAGE_MARGIN * 2
  const left = PAGE_MARGIN
  const right = width - PAGE_MARGIN

  // Encabezado del club
  doc.setFillColor(palette.navy.main)
  doc.rect(left, PAGE_MARGIN, contentWidth, 22, 'F')
  doc.setTextColor(palette.navy.contrastText)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(voucher.club.name.toUpperCase(), left + 8, PAGE_MARGIN + 10, { charSpace: 1 })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const clubLine = `${voucher.club.address ?? ''}${voucher.club.cuit ? ` · CUIT ${voucher.club.cuit}` : ''}`
  if (clubLine) doc.text(clubLine, left + 8, PAGE_MARGIN + 16)

  // Franja del color propio del club
  doc.setFillColor(voucher.club.accentColor || palette.secondary.main)
  doc.rect(left, PAGE_MARGIN + 22, contentWidth, 2, 'F')

  // Detalle
  const rows = [
    ['Socio', `${voucher.member.name} · Nº ${voucher.member.numMember}`],
    voucher.paidBy && ['Pagó', voucher.paidBy],
    voucher.registeredBy && ['Registró', voucher.registeredBy],
    ['Período', formatPeriod(voucher.period)],
    ['Medio de pago', voucher.methodLabel],
    ['Cuota social', formatMoney(voucher.socialAmount)],
    ['Cuota deportiva', formatMoney(voucher.sportAmount)]
  ].filter(Boolean)

  // Cuerpo blanco con borde fino, con el alto justo para el contenido (encabezado, filas, total y pie)
  const bodyTop = PAGE_MARGIN + 24
  const bodyHeight = 40 + rows.length * ROW_HEIGHT + 16 + 22
  doc.setDrawColor(palette.divider)
  doc.setLineWidth(0.3)
  doc.rect(left, bodyTop, contentWidth, bodyHeight, 'S')

  let y = bodyTop + 14
  doc.setTextColor(palette.text.secondary)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('COMPROBANTE DE PAGO', left + 8, y, { charSpace: 1 })

  y += 11
  doc.setTextColor(palette.navy.main)
  doc.setFontSize(24)
  doc.text(voucher.confirmationCode, left + 8, y)

  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(palette.text.secondary)
  doc.text(`Aprobado el ${formatDateTimeLong(voucher.approvedAt)}`, left + 8, y)

  y += 8
  doc.setDrawColor(palette.divider)
  for (const [label, value] of rows) {
    y += ROW_HEIGHT
    doc.setTextColor(palette.text.secondary)
    doc.text(label, left + 8, y)
    doc.setTextColor(palette.navy.main)
    doc.text(doc.splitTextToSize(String(value), contentWidth * 0.55)[0], left + 8 + contentWidth * 0.38, y)
    doc.line(left + 8, y + 3, right - 8, y + 3)
  }

  // Total
  y += 16
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(palette.navy.main)
  doc.text('Total pagado', left + 8, y)
  doc.setFontSize(22)
  doc.text(formatMoney(voucher.total), right - 8, y, { align: 'right' })

  // Pie
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(palette.text.secondary)
  doc.text('Pago simulado — proyecto escolar Club360', width / 2, bodyTop + bodyHeight - 6, { align: 'center' })

  doc.save(`comprobante-${voucher.confirmationCode}.pdf`)
}

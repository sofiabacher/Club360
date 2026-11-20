// Llamadas a la API del módulo fees: estado de cuenta del socio y de la Familia, pago simulado con tarjeta o por
// transferencia, comprobantes, gestión de cuotas y pagos del Admin y cuotas de las jugadoras del Representante. Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'

// ---------- Socio y Familia ----------

// Estado de cuenta. data: { member: { id, name, numMember, memberStateId, isAdult }, totalDue, overdueDays, delayFee,
//         canPay, fees: [{ id, period, socialAmount, sportAmount, total, expirationDate, feeState, overdueDays }], payments }
export const getMyFees = () => axiosClient.get('/fees/mine').then((res) => res.data)

// data: { accounts: [estado de cuenta de cada socia vinculada] }
export const getLinkedFees = () => axiosClient.get('/fees/linked').then((res) => res.data)

// Lo que se paga es una cuota (kind 'fee') o un cargo eventual de un socio (kind 'charge'): cada uno tiene su ruta
const payablePath = (item) => (item.kind === 'charge' ? `/fees/charge-items/${item.id}` : `/fees/${item.id}`)

// item: la cuota o el cargo ({ id, kind }). card: { cardNumber, cardHolder, cardExpiry, cardCvv } (no se guarda).
// data: { payment, state, recovered }
export const payFee = (item, card) => axiosClient.post(`${payablePath(item)}/pay`, card).then((res) => res.data)

// ---------- Transferencias y comprobantes ----------

// data: { bankInfo: { holder, cuit, bank, cbu, alias } | null }
export const getTransferInfo = () => axiosClient.get('/fees/transfer-info').then((res) => res.data)

// Informa una transferencia de la cuota o el cargo (item) con el comprobante (JPG, PNG o PDF, hasta 5 MB).
// data: { payment, state }
export function reportTransfer(item, file) {
  const formData = new FormData()
  formData.append('receipt', file)
  return axiosClient.post(`${payablePath(item)}/transfer`, formData, { timeout: 60000 }).then((res) => res.data)
}

// Comprobante de pago de un pago Aprobado. data: { club, kind, confirmationCode, approvedAt, member, paidBy, registeredBy,
//         period, socialAmount, sportAmount (cuotas), concept, description (cargos), total, method, methodLabel }
export const getPaymentVoucher = (paymentId) => axiosClient.get(`/fees/payments/${paymentId}/voucher`).then((res) => res.data)

// Archivo del comprobante adjunto de una transferencia, como Blob (con axios, así viaja con el token).
// Si falla, el cuerpo del error también llega como Blob: se lee el JSON para que getErrorMessage encuentre el mensaje
export async function getReceiptFile(paymentId) {
  try {
    const res = await axiosClient.get(`/fees/payments/${paymentId}/receipt-file`, { responseType: 'blob', timeout: 60000 })
    return res.data
  } catch (error) {
    const body = error.response?.data
    if (body instanceof Blob) {
      try {
        error.response.data = JSON.parse(await body.text())
      } catch {
        // No era JSON: queda el mensaje general
      }
    }
    throw error
  }
}

// ---------- Admin (fees.manage) ----------

// params: { period, state, search, page }. data: { period, summary: { paid, pending, overdue }, items, total, page, totalPages }
export const getFees = (params) => axiosClient.get('/fees', { params }).then((res) => res.data)

export const getMemberFees = (memberId) => axiosClient.get(`/fees/members/${memberId}`).then((res) => res.data)

// data: { period, created, existing }
export const generateFees = (period) => axiosClient.post('/fees/generate', { period }).then((res) => res.data)

// Pago en secretaría de la cuota o el cargo (item)
export const registerFeePayment = (item, note) => axiosClient.post(`${payablePath(item)}/register-payment`, { note }).then((res) => res.data)

// Historial de pagos. params: { kind ('fee' o 'charge'), method, state, search, from, to, page }.
// data: { pendingReview, items, total, page, totalPages }
export const getPayments = (params) => axiosClient.get('/fees/payments', { params }).then((res) => res.data)

export const approveTransfer = (paymentId) => axiosClient.post(`/fees/payments/${paymentId}/approve`).then((res) => res.data)

export const rejectTransfer = (paymentId, reason) => axiosClient.post(`/fees/payments/${paymentId}/reject`, { reason }).then((res) => res.data)

// ---------- Cargos eventuales (fees.manage) ----------

// data: { pendingReview, items: [{ id, concept, description, amount, expirationDate, targetType, targetLabel, isActive,
//         createdAt, author, counts: { total, paid, pending, overdue, cancelled }, collected, due, inReview }] }
export const getCharges = () => axiosClient.get('/fees/charges').then((res) => res.data)

// Para elegir a quiénes. data: { members: [{ id, name, dni, numMember, memberStateId }], categories: [{ id, name, sport }],
//         sports: [{ id, name }] }
export const getChargeOptions = () => axiosClient.get('/fees/charges/options').then((res) => res.data)

// target: { targetType, targetIds }. data: { count, members: [{ id, name, numMember }] }
export const previewCharge = (target) => axiosClient.post('/fees/charges/preview', target).then((res) => res.data)

// charge: { concept, description, amount, expirationDate, targetType, targetIds }. data: el detalle del cargo
export const createCharge = (charge) => axiosClient.post('/fees/charges', charge).then((res) => res.data)

// data: el cargo con items: [{ id, member, chargeState, overdueDays, inReview, payment }]
export const getCharge = (chargeId) => axiosClient.get(`/fees/charges/${chargeId}`).then((res) => res.data)

export const cancelCharge = (chargeId) => axiosClient.post(`/fees/charges/${chargeId}/cancel`).then((res) => res.data)

// Anula el cargo de un socio. data: el detalle del cargo
export const cancelChargeItem = (itemId) => axiosClient.post(`/fees/charge-items/${itemId}/cancel`).then((res) => res.data)

// ---------- Representante (fees.viewPlayers) ----------

// params: { status ('ok', 'pending' u 'overdue'), search }. data: { delayFee, items: [{ memberId, name, numMember, sports,
//         status, overdueDays, canBeCited }] }
export const getPlayersFees = (params) => axiosClient.get('/fees/players', { params }).then((res) => res.data)

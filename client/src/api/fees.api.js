// Llamadas a la API del módulo fees: estado de cuenta del socio y de la Familia, pago simulado con tarjeta o por
// transferencia, comprobantes, gestión de cuotas y pagos del Admin y cuotas de las jugadoras del Representante. Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'

// ---------- Socio y Familia ----------

// Estado de cuenta. data: { member: { id, name, numMember, memberStateId, isAdult }, totalDue, overdueDays, delayFee,
//         canPay, fees: [{ id, period, socialAmount, sportAmount, total, expirationDate, feeState, overdueDays }], payments }
export const getMyFees = () => axiosClient.get('/fees/mine').then((res) => res.data)

// data: { accounts: [estado de cuenta de cada socia vinculada] }
export const getLinkedFees = () => axiosClient.get('/fees/linked').then((res) => res.data)

// card: { cardNumber, cardHolder, cardExpiry, cardCvv } (no se guarda). data: { payment, feeState, recovered }
export const payFee = (feeId, card) => axiosClient.post(`/fees/${feeId}/pay`, card).then((res) => res.data)

// ---------- Transferencias y comprobantes ----------

// data: { bankInfo: { holder, cuit, bank, cbu, alias } | null }
export const getTransferInfo = () => axiosClient.get('/fees/transfer-info').then((res) => res.data)

// Informa una transferencia con el comprobante (JPG, PNG o PDF, hasta 5 MB). data: { payment, feeState }
export function reportTransfer(feeId, file) {
  const formData = new FormData()
  formData.append('receipt', file)
  return axiosClient.post(`/fees/${feeId}/transfer`, formData, { timeout: 60000 }).then((res) => res.data)
}

// Comprobante de pago de un pago Aprobado. data: { club, confirmationCode, approvedAt, member, paidBy, registeredBy,
//         period, socialAmount, sportAmount, total, method, methodLabel }
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

export const registerFeePayment = (feeId, note) => axiosClient.post(`/fees/${feeId}/register-payment`, { note }).then((res) => res.data)

// Historial de pagos. params: { method, state, search, from, to, page }. data: { pendingReview, items, total, page, totalPages }
export const getPayments = (params) => axiosClient.get('/fees/payments', { params }).then((res) => res.data)

export const approveTransfer = (paymentId) => axiosClient.post(`/fees/payments/${paymentId}/approve`).then((res) => res.data)

export const rejectTransfer = (paymentId, reason) => axiosClient.post(`/fees/payments/${paymentId}/reject`, { reason }).then((res) => res.data)

// ---------- Representante (fees.viewPlayers) ----------

// params: { status ('ok', 'pending' u 'overdue'), search }. data: { delayFee, items: [{ memberId, name, numMember, sports,
//         status, overdueDays, canBeCited }] }
export const getPlayersFees = (params) => axiosClient.get('/fees/players', { params }).then((res) => res.data)

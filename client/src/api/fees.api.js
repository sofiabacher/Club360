// Llamadas a la API del módulo fees: estado de cuenta del socio y de la Familia, pago simulado, gestión de cuotas del
// Admin y cuotas de las jugadoras del Representante. Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'

// ---------- Socio y Familia ----------

// Estado de cuenta. data: { member: { id, name, numMember, memberStateId, isAdult }, totalDue, overdueDays, delayFee,
//         canPay, fees: [{ id, period, socialAmount, sportAmount, total, expirationDate, feeState, overdueDays }], payments }
export const getMyFees = () => axiosClient.get('/fees/mine').then((res) => res.data)

// data: { accounts: [estado de cuenta de cada socia vinculada] }
export const getLinkedFees = () => axiosClient.get('/fees/linked').then((res) => res.data)

// card: { cardNumber, cardHolder, cardExpiry, cardCvv } (no se guarda). data: { payment, feeState, recovered }
export const payFee = (feeId, card) => axiosClient.post(`/fees/${feeId}/pay`, card).then((res) => res.data)

// ---------- Admin (fees.manage) ----------

// params: { period, state, search, page }. data: { period, summary: { paid, pending, overdue }, items, total, page, totalPages }
export const getFees = (params) => axiosClient.get('/fees', { params }).then((res) => res.data)

export const getMemberFees = (memberId) => axiosClient.get(`/fees/members/${memberId}`).then((res) => res.data)

// data: { period, created, existing }
export const generateFees = (period) => axiosClient.post('/fees/generate', { period }).then((res) => res.data)

export const registerFeePayment = (feeId, note) => axiosClient.post(`/fees/${feeId}/register-payment`, { note }).then((res) => res.data)

// ---------- Representante (fees.viewPlayers) ----------

// params: { status ('ok', 'pending' u 'overdue'), search }. data: { delayFee, items: [{ memberId, name, numMember, sports,
//         status, overdueDays, canBeCited }] }
export const getPlayersFees = (params) => axiosClient.get('/fees/players', { params }).then((res) => res.data)

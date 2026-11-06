// Llamadas a la API del módulo inscriptions: deportes del socio (pedir, cancelar, darse de baja) y solicitudes del
// Representante. Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'

// ---------- Socio ----------

// data: { memberStateId, items: [{ clubSportId, name, priceFee, inscription: { id, inscriptionState, reason, ... } | null,
//         actions: { request, cancel, withdraw } }] }
export const getMySports = () => axiosClient.get('/inscriptions/mine').then((res) => res.data)

export const requestInscription = (clubSportId) => axiosClient.post('/inscriptions', { clubSportId }).then((res) => res.data)

// Cancela una solicitud Pendiente o da de baja una Aprobada.
// data: { withdrawn, removedCategories, cancelledCitations, lostPlayerRole, newSession: { token, session, requiresRoleSelection } | null }
export const withdrawInscription = (id) => axiosClient.post(`/inscriptions/${id}/withdraw`).then((res) => res.data)

// ---------- Representante (inscriptions.approve) ----------

// params: { state (un INSCRIPTION_STATES o 'history'), clubSportId, search, page }.
// data: { items: [inscripción + { sport, member: { id, name, numMember, seasonAge, memberStateId } }], sports, total, page, totalPages }
export const getInscriptions = (params) => axiosClient.get('/inscriptions', { params }).then((res) => res.data)

export const approveInscription = (id) => axiosClient.post(`/inscriptions/${id}/approve`).then((res) => res.data)

export const rejectInscription = (id, reason) => axiosClient.post(`/inscriptions/${id}/reject`, { reason }).then((res) => res.data)

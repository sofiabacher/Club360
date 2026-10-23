// Llamadas a la API del módulo members: alta, consulta, modificación, baja, reactivación y desbloqueo de socios.
// Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'

// data: { items: [{ id, numMember, fullName, dni, age, isMinor, memberStateId, userStateId, hasUnusedFamilyCode }],
//         total, page, pageSize, totalPages }
export const getMembers = ({ search, state, registration, page }) =>
  axiosClient.get('/members', {
    params: { search: search || undefined, state: state || undefined, registration: registration || undefined, page }
  }).then((res) => res.data)

// data: { id, numMember, memberStateId, createdAt, user: {...}, family: { code, linked, adult }, roles }
export const getMember = (id) => axiosClient.get(`/members/${id}`).then((res) => res.data)

// payload: { name, lastName, dni, birthDate, email, phone, existingUserId? }. data: los datos del comprobante.
// Si la persona ya tiene usuario en el club, responde 409 con code 'EXISTING_USER' y data con ese usuario
export const createMember = (payload) => axiosClient.post('/members', payload).then((res) => res.data)

// payload: { name, lastName, dni, birthDate, email, phone, username }. data: el socio actualizado
export const updateMember = (id, payload) => axiosClient.put(`/members/${id}`, payload).then((res) => res.data)

export const deactivateMember = (id) => axiosClient.post(`/members/${id}/deactivate`).then((res) => res.data)

export const reactivateMember = (id) => axiosClient.post(`/members/${id}/reactivate`).then((res) => res.data)

export const unblockMember = (id) => axiosClient.post(`/members/${id}/unblock`).then((res) => res.data)

// data: { id, club: { name, accentColor }, fullName, numMember, createdAt, isPendingRegistration, familyCode, registerUrl }
export const getMemberReceipt = (id) => axiosClient.get(`/members/${id}/receipt`).then((res) => res.data)

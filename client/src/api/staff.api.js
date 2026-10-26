// Llamadas a la API del módulo staff: alta, consulta, modificación, baja, reactivación, desbloqueo y reenvío de la activación.
// Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'

// data: { roles: ['Representante', ...], sports: [{ id (clubSportId), name }] }
export const getStaffOptions = () => axiosClient.get('/staff/options').then((res) => res.data)

// state: 'active' | 'pending' | 'inactive'. data: { items: [{ id, fullName, email, staffRoles, sport, userStateId,
// isActiveStaff }], total, page, pageSize, totalPages }
export const getStaffList = ({ search, role, state, page }) =>
  axiosClient.get('/staff', {
    params: { search: search || undefined, role: role || undefined, state: state || undefined, page }
  }).then((res) => res.data)

// data: { id, createdAt, isActiveStaff, staffRoles, otherRoles, clubSport: { id, name }, user: {...} }
export const getStaff = (id) => axiosClient.get(`/staff/${id}`).then((res) => res.data)

// payload: { name, lastName, dni, birthDate, email, phone, roles, clubSportId, existingUserId? }.
// data: el detalle + usedExistingUser y activation: { required, sent, email }.
// Si la persona ya tiene usuario en el club, responde 409 con code 'EXISTING_USER' y data con ese usuario
export const createStaff = (payload) => axiosClient.post('/staff', payload).then((res) => res.data)

// payload: { name, lastName, dni, birthDate, email, phone, username, roles, clubSportId }. data: el detalle
export const updateStaff = (id, payload) => axiosClient.put(`/staff/${id}`, payload).then((res) => res.data)

export const deactivateStaff = (id) => axiosClient.post(`/staff/${id}/deactivate`).then((res) => res.data)

// data: el detalle + activation: { required, sent, email }
export const reactivateStaff = (id, roles) => axiosClient.post(`/staff/${id}/reactivate`, { roles }).then((res) => res.data)

export const unblockStaff = (id) => axiosClient.post(`/staff/${id}/unblock`).then((res) => res.data)

// data: { email }
export const resendActivation = (id) => axiosClient.post(`/staff/${id}/resend-activation`).then((res) => res.data)

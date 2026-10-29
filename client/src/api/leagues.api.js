// Llamadas a la API del módulo leagues: ligas, categorías, asignación de jugadoras y staff, y Mis categorías.
// Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'

// ---------- Ligas ----------

// data: { leagues: [{ id, name, isActive, ageScale, ageScaleLabel, clubSport: { id, name }, hasCategories,
//         categories: [{ id, name, ageGroup, ageGroupLabel, maxAge, isActive, playerCount, staffCount }] }],
//         sports: [{ id (clubSportId), name }], year }
export const getLeagues = ({ includeInactive } = {}) =>
  axiosClient.get('/leagues', { params: { includeInactive: includeInactive ? 'true' : undefined } }).then((res) => res.data)

// payload: { name, clubSportId, ageScale }. data: la liga
export const createLeague = (payload) => axiosClient.post('/leagues', payload).then((res) => res.data)

// payload: { name, ageScale }. La escala solo se cambia si la liga no tiene categorías
export const updateLeague = (id, payload) => axiosClient.put(`/leagues/${id}`, payload).then((res) => res.data)

export const deactivateLeague = (id) => axiosClient.post(`/leagues/${id}/deactivate`).then((res) => res.data)

export const reactivateLeague = (id) => axiosClient.post(`/leagues/${id}/reactivate`).then((res) => res.data)

// ---------- Categorías ----------

// payload: { ageGroup, name? }. data: el detalle de la categoría
export const createCategory = (leagueId, payload) => axiosClient.post(`/leagues/${leagueId}/categories`, payload).then((res) => res.data)

// data: { id, name, isActive, ageGroup: { code, label, maxAge }, year, league, sport,
//         players: [{ memberId, name, numMember, seasonAge, memberStateId, exceedsAge }],
//         staff: [{ staffId, name, roles, isActiveStaff }] }
export const getCategory = (id) => axiosClient.get(`/leagues/categories/${id}`).then((res) => res.data)

export const updateCategory = (id, name) => axiosClient.put(`/leagues/categories/${id}`, { name }).then((res) => res.data)

export const deactivateCategory = (id) => axiosClient.post(`/leagues/categories/${id}/deactivate`).then((res) => res.data)

export const reactivateCategory = (id) => axiosClient.post(`/leagues/categories/${id}/reactivate`).then((res) => res.data)

// ---------- Asignaciones ----------

// data: { ageGroup, year, players: [{ memberId, name, numMember, seasonAge, memberStateId }] }
export const getEligiblePlayers = (id, search) =>
  axiosClient.get(`/leagues/categories/${id}/eligible-players`, { params: { search: search || undefined } }).then((res) => res.data)

// Si alguna no se puede asignar, responde 400 con el nombre y el motivo de cada una
export const assignPlayers = (id, memberIds) => axiosClient.post(`/leagues/categories/${id}/players`, { memberIds }).then((res) => res.data)

export const unassignPlayer = (id, memberId) => axiosClient.delete(`/leagues/categories/${id}/players/${memberId}`).then((res) => res.data)

// data: { staff: [{ staffId, name, roles }] }
export const getEligibleStaff = (id) => axiosClient.get(`/leagues/categories/${id}/eligible-staff`).then((res) => res.data)

export const assignStaff = (id, staffIds) => axiosClient.post(`/leagues/categories/${id}/staff`, { staffIds }).then((res) => res.data)

export const unassignStaff = (id, staffId) => axiosClient.delete(`/leagues/categories/${id}/staff/${staffId}`).then((res) => res.data)

// ---------- Mis categorías ----------

// data: { year, categories: [{ id, name, ageGroup: { code, label, maxAge }, league: { id, name, sport },
//         players: [{ memberId, name, numMember, seasonAge, memberStateId, exceedsAge }], otherStaff: [{ staffId, name, roles }] }] }
export const getMyCategories = () => axiosClient.get('/leagues/my-categories').then((res) => res.data)

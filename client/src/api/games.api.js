// Llamadas a la API del módulo games: fixture, superposiciones de horario y vistas de partidos.
// Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'

// ---------- Fixture (games.manage) ----------

// data: { categories: [{ id, name, league: { id, name } }], courts: [{ name, address, label }], conflictMargin }
export const getGameOptions = () => axiosClient.get('/games/options').then((res) => res.data)

// data: { items: [{ id, categoryId, category, league, rival, dateTime, address, isHome, season, gameState, conflictCount,
//         citationCount }], total, page, pageSize, totalPages }
export const getGames = ({ categoryId, state, from, to, page }) =>
  axiosClient.get('/games', {
    params: { categoryId: categoryId || undefined, state: state || undefined, from: from || undefined, to: to || undefined, page }
  }).then((res) => res.data)

// payload: { categoryId, dateTime, gameId? }. data: { conflicts }, sin guardar nada
export const checkConflicts = (payload) => axiosClient.post('/games/check-conflicts', payload).then((res) => res.data)

// payload: { categoryId, rival, dateTime, isHome, address }. data: { game, conflicts }
export const createGame = (payload) => axiosClient.post('/games', payload).then((res) => res.data)

// payload: { rival, dateTime, isHome, address }. data: { game, conflicts }
export const updateGame = (id, payload) => axiosClient.put(`/games/${id}`, payload).then((res) => res.data)

export const markGamePlayed = (id) => axiosClient.post(`/games/${id}/played`).then((res) => res.data)

// data: { game, cancelledCitations }
export const cancelGame = (id, reason) => axiosClient.post(`/games/${id}/cancel`, { reason }).then((res) => res.data)

// ---------- Staff ----------

// data: { items: [partidos] } de las categorías del staff logueado, por defecto desde hoy
export const getAssignedGames = ({ from, to } = {}) =>
  axiosClient.get('/games/assigned', { params: { from: from || undefined, to: to || undefined } }).then((res) => res.data)

// data: { conflictMargin, conflicts: [{ member, games: [a, b], gapMinutes, conflictKey, resolved, resolution }] }
export const getConflicts = () => axiosClient.get('/games/conflicts').then((res) => res.data)

// payload: { memberId, gameIds: [a, b], chosenGameId, note? }. data: el conflicto, ya resuelto
export const resolveConflict = (payload) => axiosClient.post('/games/conflicts/resolve', payload).then((res) => res.data)

// ---------- Jugadora y Familia ----------

// data: { categories: [{ category, league, games }] }
export const getMyGames = () => axiosClient.get('/games/mine').then((res) => res.data)

// data: { players: [{ member: { id, name }, categories: [{ category, league, games }] }] }
export const getLinkedGames = () => axiosClient.get('/games/linked').then((res) => res.data)

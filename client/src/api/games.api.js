// Llamadas a la API del módulo games: fixture, superposiciones de horario y vistas de partidos.
// Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'

// ---------- Fixture (games.manage) ----------

// data: { categories: [{ id, name, league: { id, name } }], courts: [{ name, address, label }], conflictMargin }
export const getGameOptions = () => axiosClient.get('/games/options').then((res) => res.data)

// data: { items: [{ id, categoryId, category, league, rival, dateTime, address, isHome, season, gameState, ownScore,
//         rivalScore, setScores, outcome, conflictCount, citationCount }], total, page, pageSize, totalPages, unresolvedConflicts }
// withoutResult: solo los Jugados sin resultado
export const getGames = ({ categoryId, state, from, to, withoutResult, page }) =>
  axiosClient.get('/games', {
    params: {
      categoryId: categoryId || undefined,
      state: state || undefined,
      from: from || undefined,
      to: to || undefined,
      withoutResult: withoutResult ? 'true' : undefined,
      page
    }
  }).then((res) => res.data)

// payload: { categoryId, dateTime, gameId? }. data: { conflicts }, sin guardar nada
export const checkConflicts = (payload) => axiosClient.post('/games/check-conflicts', payload).then((res) => res.data)

// payload: { categoryId, rival, dateTime, isHome, address }. data: { game, conflicts }
export const createGame = (payload) => axiosClient.post('/games', payload).then((res) => res.data)

// payload: { rival, dateTime, isHome, address }. data: { game, conflicts }
export const updateGame = (id, payload) => axiosClient.put(`/games/${id}`, payload).then((res) => res.data)

// result: { ownScore, rivalScore, setScores? } (setScores: [{ own, rival }] por set). data: { game }
export const markGamePlayed = (id, result) => axiosClient.post(`/games/${id}/played`, result).then((res) => res.data)

// Cargar o corregir el resultado de un partido Jugado. data: { game }
export const saveGameResult = (id, result) => axiosClient.put(`/games/${id}/result`, result).then((res) => res.data)

// data: { category, league, season, games: { played, won, lost, winPercentage }, sets: { for, against, difference },
//         points: { for, against, gamesWithDetail }, home, away, streak: ['W' | 'L'], lastGame, withoutResult }
export const getCampaign = (categoryId, season) =>
  axiosClient.get('/games/campaign', { params: { categoryId, season: season || undefined } }).then((res) => res.data)

// data: { game, cancelledCitations }
export const cancelGame = (id, reason) => axiosClient.post(`/games/${id}/cancel`, { reason }).then((res) => res.data)

// ---------- Staff ----------

// data: { items: [partidos], categories: [{ id, name, league }] } de las categorías del staff logueado, por defecto desde hoy
export const getAssignedGames = ({ from, to } = {}) =>
  axiosClient.get('/games/assigned', { params: { from: from || undefined, to: to || undefined } }).then((res) => res.data)

// data: { conflictMargin, conflicts: [{ member, games: [a, b], gapMinutes, conflictKey, resolved, resolution }] }
export const getConflicts = () => axiosClient.get('/games/conflicts').then((res) => res.data)

// payload: { memberId, gameIds: [a, b], chosenGameId, note? }. data: el conflicto, ya resuelto
export const resolveConflict = (payload) => axiosClient.post('/games/conflicts/resolve', payload).then((res) => res.data)

// ---------- Jugadora y Familia ----------

// data: { categories: [{ category, league, campaign, games }] }. campaign: el resumen de la temporada
// { season, played, won, lost, winPercentage, streak, lastGame, withoutResult }
export const getMyGames = () => axiosClient.get('/games/mine').then((res) => res.data)

// data: { players: [{ member: { id, name }, categories: [{ category, league, campaign, games }] }] }
export const getLinkedGames = () => axiosClient.get('/games/linked').then((res) => res.data)

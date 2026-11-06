// Llamadas a la API del módulo citations: citaciones de la entrenadora, respuesta de la jugadora y vista de la Familia.
// Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'

// ---------- Entrenadora (citations.create) ----------

// data: { items: [partido + { canCite, citationWindow: { opensAt, closesAt, status }, summary: { cited, confirmed, pending,
//         rejected, cancelled } }] }. status: 'NOT_YET_OPEN', 'OPEN' o 'CLOSED'
export const getCoachGames = () => axiosClient.get('/citations/games').then((res) => res.data)

// data: { game: partido + { canCite, citationWindow }, players: [{ memberId, name, numMember, memberStateId, citation,
//         citable, reason, chosenGame? }] }. reason: 'OVERDUE', 'CONFLICT_RESOLVED', 'NOT_YET_OPEN' o 'TOO_LATE'
export const getGameRoster = (gameId) => axiosClient.get(`/citations/games/${gameId}`).then((res) => res.data)

// data: la lista del partido actualizada. Si alguna no se puede citar: 400 con data.problems [{ memberId, name, message }]
export const createCitations = (gameId, memberIds) => axiosClient.post(`/citations/games/${gameId}`, { memberIds }).then((res) => res.data)

export const cancelCitation = (id) => axiosClient.post(`/citations/${id}/cancel`).then((res) => res.data)

// ---------- Jugadora y Familia ----------

// data: { items: [citación + { game, canRespond, conflict }] }. scope: 'upcoming' (por defecto) o 'history'
export const getMyCitations = (scope = 'upcoming') => axiosClient.get('/citations/mine', { params: { scope } }).then((res) => res.data)

// response: 'confirm' o 'reject' (con justification, de 10 a 300 caracteres)
export const respondCitation = (id, response, justification) =>
  axiosClient.post(`/citations/${id}/respond`, { response, justification }).then((res) => res.data)

// data: { players: [{ member: { id, name }, items: [citaciones] }] }
export const getLinkedCitations = (scope = 'upcoming') => axiosClient.get('/citations/linked', { params: { scope } }).then((res) => res.data)

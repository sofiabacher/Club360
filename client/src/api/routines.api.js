// Llamadas a la API del módulo routines: carga de la preparadora física, consulta de la entrenadora y rutina de la
// jugadora. Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'

// Arma el multipart de una rutina: los campos de texto y la imagen (si se eligió una nueva)
function toFormData(fields, image) {
  const formData = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, String(value))
  })
  if (image) formData.append('image', image)
  return formData
}

// ---------- Preparadora física y entrenadora ----------

// data: { canManage, categories: [{ id, name, league: { id, name, sport } }] }
export const getRoutineCategories = () => axiosClient.get('/routines/categories').then((res) => res.data)

// data: { category, weekStart, weekEnd, today, currentWeekStart, editable, days: [{ dayOfWeek, date, routine | null }], games }
export const getRoutineWeek = (categoryId, weekStart) =>
  axiosClient.get('/routines', { params: { categoryId, weekStart } }).then((res) => res.data)

// data: { items: [{ weekStart, weekEnd, days }] }
export const getRoutineWeeks = (categoryId) => axiosClient.get('/routines/weeks', { params: { categoryId } }).then((res) => res.data)

// fields: { categoryId, weekStart, dayOfWeek, title, description, videoUrl }. image: File o null
export const createRoutine = (fields, image) =>
  axiosClient.post('/routines', toFormData(fields, image), { timeout: 60000 }).then((res) => res.data)

// fields: { title, description, videoUrl, removeImage }. image: File o null
export const updateRoutine = (id, fields, image) =>
  axiosClient.put(`/routines/${id}`, toFormData(fields, image), { timeout: 60000 }).then((res) => res.data)

export const deleteRoutine = (id) => axiosClient.delete(`/routines/${id}`).then((res) => res.data)

// ---------- Jugadora ----------

// data: { weekStart, weekEnd, today, currentWeekStart, canTrack, categories: [{ category, league, days }] }. Con
// routines.trackOwn, cada rutina trae myLog ({ status, effort, note } o null) y canLog
export const getMyRoutine = (weekStart) => axiosClient.get('/routines/mine', { params: { weekStart } }).then((res) => res.data)

// ---------- Seguimiento personal (routines.trackOwn) ----------

// payload: { status, effort?, note? }. Crea o edita el registro. data: { log }
export const saveRoutineLog = (routineId, payload) => axiosClient.put(`/routines/${routineId}/log`, payload).then((res) => res.data)

// data: { weeks: [{ weekStart, scheduled, completed, partial, notCompleted, unlogged, compliance, effort }], totals, goals }
export const getMyProgress = (weeks) => axiosClient.get('/routines/progress/mine', { params: { weeks } }).then((res) => res.data)

// data: { items: [{ id, text, dueDate, goalState, closedAt, overdue }] }
export const getMyGoals = () => axiosClient.get('/routines/goals/mine').then((res) => res.data)

// payload: { text, dueDate }
export const createGoal = (payload) => axiosClient.post('/routines/goals', payload).then((res) => res.data)

export const updateGoal = (id, payload) => axiosClient.put(`/routines/goals/${id}`, payload).then((res) => res.data)

// payload: { goalState, dueDate? } (dueDate: al reabrir uno con la fecha pasada)
export const setGoalState = (id, payload) => axiosClient.patch(`/routines/goals/${id}/state`, payload).then((res) => res.data)

// ---------- Seguimiento de las jugadoras (routines.viewTracking) ----------

// data: { category, weekStart, weekEnd, today, currentWeekStart, routines: [{ id, dayOfWeek, date, title }],
//         players: [{ member, logs: { [routineId]: log | null }, compliance, effort }] }
export const getTracking = (categoryId, weekStart) =>
  axiosClient.get('/routines/tracking', { params: { categoryId, weekStart } }).then((res) => res.data)

// data: { member, categories, progress, goals }
export const getMemberTracking = (memberId, weeks) =>
  axiosClient.get(`/routines/tracking/members/${memberId}`, { params: { weeks } }).then((res) => res.data)

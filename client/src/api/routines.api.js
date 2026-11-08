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

// data: { weekStart, weekEnd, today, currentWeekStart, categories: [{ category, league, days }] }
export const getMyRoutine = (weekStart) => axiosClient.get('/routines/mine', { params: { weekStart } }).then((res) => res.data)

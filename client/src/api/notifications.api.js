// Llamadas a la API del módulo notifications: notificaciones del usuario y envío de avisos generales.
// Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'

// data: { items: [{ id, type, title, message, isRead, createdAt, transmitter }], total, page, pageSize, totalPages }.
// transmitter es null si la generó el sistema
export const getNotifications = ({ unread, page } = {}) =>
  axiosClient.get('/notifications', { params: { unread: unread ? 'true' : undefined, page } }).then((res) => res.data)

// data: { count }
export const getUnreadCount = () => axiosClient.get('/notifications/unread-count').then((res) => res.data)

export const markAsRead = (id) => axiosClient.post(`/notifications/${id}/read`).then((res) => res.data)

export const markAllAsRead = () => axiosClient.post('/notifications/read-all').then((res) => res.data)

// ---------- Avisos generales ----------

// data: { club?, segments?: { segments, staffRoles }, sport?: { name, groups }, categories?: [{ id, name, league, ageGroup }] }.
// Solo vienen las opciones que permiten los permisos de envío del usuario
export const getSendOptions = () => axiosClient.get('/notifications/send-options').then((res) => res.data)

// audience: { scope: 'club' } | { scope: 'segments', segments, staffRoles, includeFamilies } |
//           { scope: 'sport', groups } | { scope: 'categories', categoryIds, includeFamilies }.
// data: { recipients, withEmail }
export const previewNotice = (audience) => axiosClient.post('/notifications/preview', { audience }).then((res) => res.data)

// payload: { audience, title, message, sendEmail }. data: { recipients, emails }
export const sendNotice = (payload) => axiosClient.post('/notifications/send', payload).then((res) => res.data)

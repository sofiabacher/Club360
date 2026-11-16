// Llamadas a la API del módulo bot (asistente de consultas). Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'

// screen: la ruta del front sin la barra inicial ("my-fees"), para poner primero la categoría de esa pantalla.
// data: { group, greeting, categories: [{ id, label, questions: [{ intent, label }] }] }
export const getBotMenu = (screen) => axiosClient.get('/bot/menu', { params: { screen: screen || undefined } }).then((res) => res.data)

// payload: { type: 'text' | 'button', message?, intent?, screen? }.
// data: { responseType, response, intent, confidence, buttons: [{ type, value, label }], interactionId }
export const sendBotMessage = (payload) => axiosClient.post('/bot/chat', payload).then((res) => res.data)

// payload: { interactionId, useful }
export const sendBotFeedback = (payload) => axiosClient.post('/bot/feedback', payload).then((res) => res.data)

// Asistente público (bienvenida e inicio de sesión, sin sesión): mismas respuestas, sin interactionId (no hay opinión)
export const getPublicBotMenu = (screen) => axiosClient.get('/bot/public/menu', { params: { screen: screen || undefined } }).then((res) => res.data)

export const sendPublicBotMessage = (payload) => axiosClient.post('/bot/public/chat', payload).then((res) => res.data)

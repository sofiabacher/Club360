// Llamadas a la API del módulo auth.
// Cada módulo tiene su <módulo>.api.js: las páginas nunca usan axios directamente, llaman a estas funciones.
// Devuelven el cuerpo de la respuesta: { success, data }.
import axiosClient from './axiosClient.js'

// data: { token, requiresRoleSelection, session }
export const login = (credentials) => axiosClient.post('/auth/login', credentials).then((res) => res.data)

// data: { username }. No inicia sesión: después se va al login
export const registerMember = (payload) => axiosClient.post('/auth/register-member', payload).then((res) => res.data)

// data: { token, session }. El token nuevo trae el rol activo elegido
export const switchRole = (roleId) => axiosClient.post('/auth/switch-role', { roleId }).then((res) => res.data)

// data: { session }
export const getMe = () => axiosClient.get('/auth/me').then((res) => res.data)

export const logout = () => axiosClient.post('/auth/logout').then((res) => res.data)

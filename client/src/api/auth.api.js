// Llamadas a la API del módulo auth.
// Cada módulo tiene su <módulo>.api.js: las páginas nunca usan axios directamente, llaman a estas funciones.
import axiosClient from './axiosClient.js'

export const login = (credentials) => axiosClient.post('/auth/login', credentials).then((res) => res.data)

export const switchRole = (roleId) => axiosClient.post('/auth/switch-role', { roleId }).then((res) => res.data)

export const getMe = () => axiosClient.get('/auth/me').then((res) => res.data)

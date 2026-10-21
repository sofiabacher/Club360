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

// ---------- Recuperación de contraseña ----------

// data: { message }. Responde siempre lo mismo, exista o no la cuenta
export const forgotPassword = (identifier) => axiosClient.post('/auth/forgot-password', { identifier }).then((res) => res.data)

// data: { valid: true }. Si el link venció o ya se usó, responde 400 con el mensaje
export const validateResetToken = (token) =>
  axiosClient.get('/auth/reset-password/validate', { params: { token } }).then((res) => res.data)

// data: { username }
export const resetPassword = (payload) => axiosClient.post('/auth/reset-password', payload).then((res) => res.data)

// ---------- Mi cuenta ----------

// data: { name, lastName, dni, birthDate, username, email, phone, photo, numMember }
export const getAccount = () => axiosClient.get('/auth/account').then((res) => res.data)

// Solo email y teléfono. data: la cuenta actualizada
export const updateAccount = ({ email, phone }) => axiosClient.put('/auth/account', { email, phone }).then((res) => res.data)

// data: { photo }
export const uploadAccountPhoto = (file) => {
  const form = new FormData()
  form.append('photo', file)
  return axiosClient.post('/auth/account/photo', form).then((res) => res.data)
}

export const changePassword = (payload) => axiosClient.put('/auth/account/password', payload).then((res) => res.data)

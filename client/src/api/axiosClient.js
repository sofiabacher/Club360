import axios from 'axios'

export const TOKEN_KEY = 'club360_token'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000
})

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
}

// Agrega el token de sesión a cada petición
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const MAINTENANCE_PATH = '/maintenance'

let redirecting = false   // Evita redirigir varias veces si fallan varias peticiones juntas

// Sesión vencida o inválida (401) o usuario dado de baja (423): limpia la sesión y vuelve al login.
// Club bloqueado por integridad (503 INTEGRITY_LOCK): a la pantalla de mantenimiento
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const isLogin = error.config?.url?.includes('/auth/login')

    // Club bloqueado por integridad (503 INTEGRITY_LOCK): a la pantalla de mantenimiento, salvo en el login (el formulario
    // muestra el mensaje) y si ya se está ahí. El token no se borra: cuando se repare, la sesión sigue
    if (status === 503 && error.response?.data?.code === 'INTEGRITY_LOCK' && !isLogin) {
      if (!redirecting && window.location.pathname !== MAINTENANCE_PATH) {
        redirecting = true
        window.location.assign(MAINTENANCE_PATH)
      }
      return Promise.reject(error)
    }

    if ((status === 401 && !isLogin) || status === 423) {
      clearSession()

      if (!redirecting && window.location.pathname !== '/login') {
        redirecting = true
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  }
)

export default axiosClient

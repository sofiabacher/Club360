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

let redirecting = false   // Evita redirigir varias veces si fallan varias peticiones juntas

// Sesión vencida o inválida (401) o usuario dado de baja (423): limpia la sesión y vuelve al login
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const isLogin = error.config?.url?.includes('/auth/login')

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

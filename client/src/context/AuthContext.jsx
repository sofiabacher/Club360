import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { jwtDecode } from 'jwt-decode'

import { TOKEN_KEY, clearSession } from '../api/axiosClient.js'
import { getMe, logout } from '../api/auth.api.js'

export const AuthContext = createContext(null)

// La sesión la arma siempre el back (buildSession): { user, club, roles, activeRole, permissions }
const emptySession = { user: null, club: null, roles: [], activeRole: null, permissions: [] }

// Mínimo entre dos pedidos automáticos de la sesión al volver a la pestaña
const REFRESH_INTERVAL_MS = 60 * 1000

function hasValidToken() {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return false

  try {
    return jwtDecode(token).exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(emptySession)
  const [loading, setLoading] = useState(hasValidToken)   // true mientras se recupera la sesión guardada
  const lastRefresh = useRef(0)   // Cuándo se pidió la sesión por última vez

  // Después del login y del cambio de rol activo (que devuelve un token nuevo)
  const startSession = useCallback(({ token, session: newSession }) => {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    lastRefresh.current = Date.now()
    setSession({ ...emptySession, ...newSession })
  }, [])

  // Vuelve a pedir la sesión al back (por ejemplo, si cambiaron sus roles o permisos)
  const refreshSession = useCallback(async () => {
    lastRefresh.current = Date.now()
    const { data } = await getMe()
    setSession({ ...emptySession, ...data.session })
    return data.session
  }, [])

  // Registra el logout en el back (si falla, igual se cierra la sesión) y limpia todo
  const endSession = useCallback(async () => {
    if (hasValidToken()) {
      try {
        await logout()
      } catch {
        // Se ignora: el token se borra igual
      }
    }

    clearSession()
    setSession(emptySession)
  }, [])

  // Al cargar la app con un token guardado, se recupera la sesión (por ejemplo, después de recargar la página)
  useEffect(() => {
    if (!hasValidToken()) {
      clearSession()
      return
    }

    lastRefresh.current = Date.now()
    getMe()
      .then(({ data }) => setSession({ ...emptySession, ...data.session }))
      .catch(() => {
        clearSession()
        setSession(emptySession)
      })
      .finally(() => setLoading(false))
  }, [])

  // Los cambios de roles y permisos rigen en el back desde la siguiente request. Para que el menú también se actualice,
  // la sesión se vuelve a pedir cuando la pestaña recupera el foco (como mucho una vez cada REFRESH_INTERVAL_MS).
  // Si la sesión ya no vale (por ejemplo, le quitaron el rol activo), axiosClient la cierra con el 401.
  const isAuthenticated = session.user !== null

  useEffect(() => {
    if (!isAuthenticated) return

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastRefresh.current < REFRESH_INTERVAL_MS) return

      refreshSession().catch(() => {
        // Sin conexión: se reintenta la próxima vez que vuelva a la pestaña
      })
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isAuthenticated, refreshSession])

  const value = useMemo(() => ({
    ...session,
    isAuthenticated,
    loading,
    startSession,
    refreshSession,
    endSession
  }), [session, isAuthenticated, loading, startSession, refreshSession, endSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

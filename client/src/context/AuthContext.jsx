import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { jwtDecode } from 'jwt-decode'

import { TOKEN_KEY, clearSession } from '../api/axiosClient.js'
import { getMe, logout } from '../api/auth.api.js'

export const AuthContext = createContext(null)

// La sesión la arma siempre el back (buildSession): { user, club, roles, activeRole, permissions }
const emptySession = { user: null, club: null, roles: [], activeRole: null, permissions: [] }

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

  // Después del login y del cambio de rol activo (que devuelve un token nuevo)
  const startSession = useCallback(({ token, session: newSession }) => {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    setSession({ ...emptySession, ...newSession })
  }, [])

  // Vuelve a pedir la sesión al back (por ejemplo, si cambiaron sus roles o permisos)
  const refreshSession = useCallback(async () => {
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

    getMe()
      .then(({ data }) => setSession({ ...emptySession, ...data.session }))
      .catch(() => {
        clearSession()
        setSession(emptySession)
      })
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo(() => ({
    ...session,
    isAuthenticated: session.user !== null,
    loading,
    startSession,
    refreshSession,
    endSession
  }), [session, loading, startSession, refreshSession, endSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

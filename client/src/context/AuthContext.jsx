import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { jwtDecode } from 'jwt-decode'

import { TOKEN_KEY, clearSession } from '../api/axiosClient.js'
import { getMe } from '../api/auth.api.js'

export const AuthContext = createContext(null)

const emptySession = { user: null, roles: [], activeRole: null, permissions: [] }

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

  // Se llama después del login y del cambio de rol activo (que devuelve un token nuevo).
  // permissions: nombres de los permisos efectivos (rol activo + directos del usuario)
  const startSession = useCallback(({ token, user, roles, activeRole, permissions }) => {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    setSession({ user, roles: roles ?? [], activeRole, permissions: permissions ?? [] })
  }, [])

  const endSession = useCallback(() => {
    clearSession()
    setSession(emptySession)
  }, [])

  // Al cargar la app con un token guardado, se recuperan los datos de la sesión
  useEffect(() => {
    if (!hasValidToken()) {
      clearSession()
      return
    }

    getMe()
      .then(({ data }) => startSession(data))
      .catch(() => endSession())
      .finally(() => setLoading(false))
  }, [startSession, endSession])

  const value = useMemo(() => ({
    ...session,
    isAuthenticated: session.user !== null,
    loading,
    startSession,
    endSession
  }), [session, loading, startSession, endSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

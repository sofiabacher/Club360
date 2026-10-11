import { Navigate } from 'react-router-dom'

import useAuth from '../hooks/useAuth.js'
import usePermission from '../hooks/usePermission.js'

// Protege una ruta por sesión y, si se pasa `permission`, también por permiso (nunca por rol).
export default function PermissionRoute({ permission, children }) {
  const { isAuthenticated, loading } = useAuth()
  const { hasPermission } = usePermission()

  if (loading) return null   // Todavía se está recuperando la sesión guardada

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (permission && !hasPermission(permission)) return <Navigate to="/" replace />

  return children
}

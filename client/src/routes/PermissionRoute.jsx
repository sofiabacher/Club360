import { Navigate } from 'react-router-dom'

import FullScreenLoader from '../components/common/FullScreenLoader.jsx'
import useAuth from '../hooks/useAuth.js'
import usePermission from '../hooks/usePermission.js'

// Protege una ruta por sesión, por rol activo y, si se pasa `permission`, también por permiso (nunca por nombre de rol).
// requireActiveRole={false} es solo para /select-role: exige sesión pero no un rol elegido.
export default function PermissionRoute({ permission, requireActiveRole = true, children }) {
  const { isAuthenticated, activeRole, loading } = useAuth()
  const { hasPermission } = usePermission()

  if (loading) return <FullScreenLoader />

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (requireActiveRole && !activeRole) return <Navigate to="/select-role" replace />

  if (permission && !hasPermission(permission)) return <Navigate to="/" replace />

  return children
}

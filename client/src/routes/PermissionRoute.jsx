import { Navigate } from 'react-router-dom'

import FullScreenLoader from '../components/common/FullScreenLoader.jsx'
import useAuth from '../hooks/useAuth.js'
import usePermission from '../hooks/usePermission.js'

// Protege una ruta por sesión, por rol activo y, si se pasa `permission`, también por permiso (nunca por nombre de rol).
// `permission` puede ser un string o un array: con un array alcanza con tener uno de los permisos.
// requireActiveRole={false} es solo para /select-role: exige sesión pero no un rol elegido.
export default function PermissionRoute({ permission, requireActiveRole = true, children }) {
  const { isAuthenticated, activeRole, loading } = useAuth()
  const { hasAnyPermission } = usePermission()

  const required = [].concat(permission ?? [])

  if (loading) return <FullScreenLoader />

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (requireActiveRole && !activeRole) return <Navigate to="/select-role" replace />

  if (required.length > 0 && !hasAnyPermission(required)) return <Navigate to="/" replace />

  return children
}

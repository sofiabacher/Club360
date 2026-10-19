import { Navigate } from 'react-router-dom'

import FullScreenLoader from '../components/common/FullScreenLoader.jsx'
import useAuth from '../hooks/useAuth.js'

// Rutas públicas (login y registro): si ya hay sesión, se va al inicio
export default function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <FullScreenLoader />

  if (isAuthenticated) return <Navigate to="/" replace />

  return children
}

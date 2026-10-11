import { useCallback } from 'react'
import useAuth from './useAuth.js'

// Uso: const { hasPermission } = usePermission(); hasPermission('fees.manage')
// Se verifican siempre permisos, nunca nombres de rol.
export default function usePermission() {
  const { permissions } = useAuth()

  const hasPermission = useCallback((name) => permissions.includes(name), [permissions])

  return { hasPermission }
}

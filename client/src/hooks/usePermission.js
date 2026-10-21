import { useCallback } from 'react'
import useAuth from './useAuth.js'

// Uso: const { hasPermission, hasAnyPermission } = usePermission()
//   hasPermission('fees.manage')
//   hasAnyPermission(['notifications.sendAll', 'notifications.sendSport'])   // alcanza con uno
// Se verifican siempre permisos, nunca nombres de rol.
export default function usePermission() {
  const { permissions } = useAuth()

  const hasPermission = useCallback((name) => permissions.includes(name), [permissions])

  const hasAnyPermission = useCallback(
    (names) => [].concat(names).some((name) => permissions.includes(name)),
    [permissions]
  )

  return { hasPermission, hasAnyPermission }
}

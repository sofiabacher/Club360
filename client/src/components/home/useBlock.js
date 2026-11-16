import { useCallback, useEffect, useState } from 'react'

import { initialBlock } from './homeData.js'
import { getErrorMessage } from '../../utils/apiErrors.js'

// Carga un bloque del panel de inicio con su propia llamada: { data, error, loading, reload }.
// Cada bloque carga y falla por separado. `request` tiene que ser estable (definida fuera del componente o con useCallback).
// Con enabled = false no llama (por ejemplo, si el rol no tiene el permiso del endpoint) y queda sin datos ni error
export default function useBlock(request, enabled = true) {
  const [block, setBlock] = useState(enabled ? initialBlock : { data: null, error: '', loading: false })

  const reload = useCallback(() => {
    if (!enabled) return
    request()
      .then(({ data }) => setBlock({ data, error: '', loading: false }))
      .catch((err) => setBlock({ data: null, error: getErrorMessage(err), loading: false }))
  }, [request, enabled])

  useEffect(() => { reload() }, [reload])
  return { ...block, reload }
}

import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'

import { getMyFees } from '../../api/fees.api.js'
import FeeAccount from '../../components/fees/FeeAccount.jsx'
import PayFeeDialog from '../../components/fees/PayFeeDialog.jsx'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import LoadingSkeleton from '../../components/common/LoadingSkeleton.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'

// Mis cuotas (fees.viewOwn): estado de cuenta del socio logueado. Pagar solo con fees.payOwn (mayores); los menores ven
// que el pago lo hace su adulto responsable
export default function MyFeesPage() {
  const { refreshSession } = useAuth()
  const [account, setAccount] = useState(null)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(null)   // cuota que se está pagando

  const load = useCallback(() => {
    getMyFees()
      .then(({ data }) => setAccount(data))
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  useEffect(() => { load() }, [load])

  const handleClose = (changed) => {
    setPaying(null)
    if (changed) {
      load()
      refreshSession().catch(() => {})   // Si recuperó la condición de socio, vuelven sus roles de socio
    }
  }

  if (error) return <Alert severity="error">{error}</Alert>

  if (!account) {
    return <LoadingSkeleton />
  }

  return (
    <>
      <PageHeader title="Mis cuotas" description="La cuota de cada mes se genera el día 1 y vence el 10: cuota social más la cuota deportiva de cada deporte." />

      <FeeAccount account={account} onPay={setPaying} />

      {paying && <PayFeeDialog fee={paying} onClose={handleClose} />}
    </>
  )
}

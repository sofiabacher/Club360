import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import FamilyRestroomRounded from '@mui/icons-material/FamilyRestroomRounded'

import { getLinkedFees } from '../../api/fees.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import FeeAccount from '../../components/fees/FeeAccount.jsx'
import PayFeeDialog from '../../components/fees/PayFeeDialog.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import LoadingSkeleton from '../../components/common/LoadingSkeleton.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'

// Estado de cuenta de la Familia (fees.manageLinked): las cuotas de cada jugadora vinculada, con el pago simulado.
// Con más de una jugadora, un selector. ?memberId= elige una al entrar (el botón "Pagar" del inicio)
export default function FamilyFeesPage() {
  const [searchParams] = useSearchParams()
  const [accounts, setAccounts] = useState(null)
  const [selectedId, setSelectedId] = useState(() => Number(searchParams.get('memberId')) || '')
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(null)   // cuota que se está pagando

  const load = useCallback(() => {
    getLinkedFees()
      .then(({ data }) => {
        setAccounts(data.accounts)
        setSelectedId((current) => current || data.accounts[0]?.member.id || '')
      })
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  useEffect(() => { load() }, [load])

  const handleClose = (changed) => {
    setPaying(null)
    if (changed) load()
  }

  if (error) return <Alert severity="error">{error}</Alert>

  if (!accounts) {
    return <LoadingSkeleton />
  }

  const account = accounts.find((item) => item.member.id === selectedId) ?? accounts[0]

  return (
    <>
      <PageHeader
        title="Estado de cuenta"
        description={account ? `Las cuotas de ${account.member.name}.` : 'Las cuotas de tus jugadoras vinculadas.'}
        action={
          <>
            {accounts.length > 1 && (
              <TextField select label="Jugadora" value={account.member.id} onChange={(event) => setSelectedId(event.target.value)} size="small" sx={{ minWidth: 220 }}>
                {accounts.map((item) => <MenuItem key={item.member.id} value={item.member.id}>{item.member.name}</MenuItem>)}
              </TextField>
            )}
          </>
        }
      />

      {account ? (
        <FeeAccount account={account} onPay={setPaying} />
      ) : (
        <EmptyState icon={FamilyRestroomRounded} title="Sin jugadoras vinculadas" description="Todavía no tenés ninguna jugadora vinculada." />
      )}

      {paying && <PayFeeDialog fee={paying} memberName={account.member.name} onClose={handleClose} />}
    </>
  )
}

import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import FamilyRestroomRounded from '@mui/icons-material/FamilyRestroomRounded'

import { getLinkedFees } from '../../api/fees.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import FeeAccount from '../../components/fees/FeeAccount.jsx'
import PayFeeDialog from '../../components/fees/PayFeeDialog.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'

// Estado de cuenta de la Familia (fees.manageLinked): las cuotas de cada jugadora vinculada, con el pago simulado.
// Con más de una jugadora, un selector
export default function FamilyFeesPage() {
  const [accounts, setAccounts] = useState(null)
  const [selectedId, setSelectedId] = useState('')
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
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>
  }

  const account = accounts.find((item) => item.member.id === selectedId) ?? accounts[0]

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Estado de cuenta</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {account ? `Las cuotas de ${account.member.name}.` : 'Las cuotas de tus jugadoras vinculadas.'}
          </Typography>
        </Box>
        {accounts.length > 1 && (
          <TextField select label="Jugadora" value={account.member.id} onChange={(event) => setSelectedId(event.target.value)} size="small" sx={{ minWidth: 220 }}>
            {accounts.map((item) => <MenuItem key={item.member.id} value={item.member.id}>{item.member.name}</MenuItem>)}
          </TextField>
        )}
      </Stack>

      {account ? (
        <FeeAccount account={account} onPay={setPaying} />
      ) : (
        <EmptyState icon={FamilyRestroomRounded} title="Sin jugadoras vinculadas" description="Todavía no tenés ninguna jugadora vinculada." />
      )}

      {paying && <PayFeeDialog fee={paying} memberName={account.member.name} onClose={handleClose} />}
    </>
  )
}

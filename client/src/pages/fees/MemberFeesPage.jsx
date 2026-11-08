import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'

import { getMemberFees } from '../../api/fees.api.js'
import FeeAccount from '../../components/fees/FeeAccount.jsx'
import RegisterPaymentDialog from '../../components/fees/RegisterPaymentDialog.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'

// Estado de cuenta de un socio para el Admin (fees.manage): la misma vista que "Mis cuotas", con el pago en secretaría
export default function MemberFeesPage() {
  const { memberId } = useParams()
  const [account, setAccount] = useState(null)
  const [error, setError] = useState('')
  const [registering, setRegistering] = useState(null)   // cuota a registrar
  const [notice, setNotice] = useState('')

  const load = useCallback(() => {
    getMemberFees(memberId)
      .then(({ data }) => setAccount(data))
      .catch((err) => setError(getErrorMessage(err)))
  }, [memberId])

  useEffect(() => { load() }, [load])

  const handleDone = (result) => {
    setRegistering(null)
    setNotice(`Pago registrado (${result.payment.confirmationCode}).${result.recovered ? ' El socio recuperó su condición.' : ''}`)
    load()
  }

  if (error) return <Alert severity="error">{error}</Alert>

  if (!account) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>
  }

  return (
    <>
      <Button component={RouterLink} to="/fees" startIcon={<ArrowBackRounded />} color="secondary" sx={{ mb: 2 }}>Cuotas</Button>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ color: 'navy.main', overflowWrap: 'anywhere' }}>{account.member.name}</Typography>
        <Typography variant="numeric" sx={{ fontSize: '1.3rem', color: 'text.secondary' }}>Nº {account.member.numMember}</Typography>
      </Box>

      <FeeAccount
        account={account}
        renderAction={(fee) => (
          <Button variant="outlined" color="secondary" onClick={() => setRegistering(fee)} sx={{ flexShrink: 0 }}>Registrar pago en secretaría</Button>
        )}
      />

      {registering && (
        <RegisterPaymentDialog fee={registering} memberName={account.member.name} onClose={() => setRegistering(null)} onDone={handleDone} />
      )}

      <Snackbar open={Boolean(notice)} autoHideDuration={6000} onClose={() => setNotice('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setNotice('')}>{notice}</Alert>
      </Snackbar>
    </>
  )
}

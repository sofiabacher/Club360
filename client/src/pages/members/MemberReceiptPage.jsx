import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import FamilyRestroomRounded from '@mui/icons-material/FamilyRestroomRounded'
import PrintRounded from '@mui/icons-material/PrintRounded'

import { getMemberReceipt } from '../../api/members.api.js'
import MemberCard from '../../components/members/MemberCard.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { formatDate } from '../../utils/format.js'

// Comprobante imprimible del alta: carnet, instrucciones de primer ingreso y, si es menor, el código de vínculo.
// Al imprimir se esconden el menú, la barra superior (DashboardLayout) y los botones.
export default function MemberReceiptPage() {
  const { id } = useParams()
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getMemberReceipt(id)
      .then(({ data }) => setReceipt(data))
      .catch((err) => setError(getErrorMessage(err)))
  }, [id])

  if (error) return <Alert severity="error">{error}</Alert>

  if (!receipt) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress color="secondary" />
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap', mb: 3, displayPrint: 'none' }}>
        <Button variant="contained" color="primary" startIcon={<PrintRounded />} onClick={() => window.print()}>
          Imprimir
        </Button>
        <Button component={RouterLink} to={`/members/${id}`} color="secondary" startIcon={<ArrowBackRounded />}>
          Volver al socio
        </Button>
      </Stack>

      <Stack spacing={3}>
        <MemberCard
          clubName={receipt.club.name}
          accentColor={receipt.club.accentColor}
          fullName={receipt.fullName}
          numMember={receipt.numMember}
          subtitle={`Alta: ${formatDate(receipt.createdAt)}`}
        />

        {receipt.isPendingRegistration && (
          <Box sx={{ px: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'navy.main' }}>Primer ingreso</Typography>
            <Typography variant="body2">
              Entrá a <Box component="strong" sx={{ overflowWrap: 'anywhere' }}>{receipt.registerUrl}</Box> y registrate con tu número de socio y tu fecha de nacimiento.
            </Typography>
          </Box>
        )}

        {receipt.familyCode && (
          <Paper variant="outlined" sx={{ p: 3, borderStyle: 'dashed', borderWidth: 2, borderColor: 'burgundy.main', breakInside: 'avoid' }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
              <FamilyRestroomRounded sx={{ color: 'burgundy.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'navy.main' }}>Para el adulto responsable</Typography>
            </Stack>
            <Typography variant="numeric" component="p" sx={{ fontSize: '2.6rem', color: 'navy.main', letterSpacing: '0.1em', textAlign: 'center', my: 1 }}>
              {receipt.familyCode}
            </Typography>
            <Typography variant="body2">
              Con este código, el adulto responsable se vincula como Familia desde la pantalla de inicio de sesión
              (opción 'Vincularme como Familia'). Se puede usar una sola vez.
            </Typography>
          </Paper>
        )}
      </Stack>
    </Box>
  )
}

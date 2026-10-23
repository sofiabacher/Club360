import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputAdornment from '@mui/material/InputAdornment'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { getClubSports, updateClubSport } from '../../api/clubs.api.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { formatMoney } from '../../utils/format.js'

// Borrador de cada fila: lo que se está editando antes de guardar
const toDraft = (sport) => ({ isActive: sport.isActive, priceFee: sport.priceFee === null ? '' : String(sport.priceFee) })

function SportRow({ sport, onSaved, onError }) {
  const [draft, setDraft] = useState(toDraft(sport))
  const [saving, setSaving] = useState(false)

  useEffect(() => setDraft(toDraft(sport)), [sport])

  const changed = draft.isActive !== sport.isActive || (draft.isActive && Number(draft.priceFee) !== sport.priceFee)

  const handleSave = async () => {
    setSaving(true)

    try {
      const payload = { isActive: draft.isActive, priceFee: draft.isActive ? Number(draft.priceFee) || null : null }
      const { data } = await updateClubSport(sport.sportId, payload)
      onSaved(data)
    } catch (err) {
      onError(getErrorMessage(err))
      setDraft(toDraft(sport))   // Vuelve a lo que está guardado
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, gap: 2, px: { xs: 2, sm: 3 }, py: 2 }}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>{sport.name}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {sport.isActive ? `Activo · cuota deportiva ${formatMoney(sport.priceFee)}` : 'No se ofrece en el club'}
        </Typography>
      </Box>

      <FormControlLabel
        control={<Switch color="secondary" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />}
        label={draft.isActive ? 'Activo' : 'Inactivo'}
        sx={{ mr: 0 }}
      />

      {draft.isActive && (
        <TextField
          label="Cuota deportiva"
          type="number"
          size="small"
          value={draft.priceFee}
          onChange={(event) => setDraft({ ...draft, priceFee: event.target.value })}
          sx={{ width: { xs: '100%', sm: 180 } }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }}
        />
      )}

      <Button variant="outlined" color="secondary" onClick={handleSave} disabled={!changed} loading={saving} sx={{ flexShrink: 0 }}>
        Guardar
      </Button>
    </Stack>
  )
}

// Deportes del catálogo maestro: el club activa los que ofrece y fija su cuota deportiva. Pantalla de clubs.manageSports
export default function ClubSportsPage() {
  const [sports, setSports] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })   // Snackbar
  const showNotice = (severity, message) => setNotice({ open: true, severity, message })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  useEffect(() => {
    getClubSports()
      .then(({ data }) => setSports(data))
      .catch((err) => setLoadError(getErrorMessage(err)))
  }, [])

  const handleSaved = (updated) => {
    setSports((current) => current.map((sport) => (sport.sportId === updated.sportId ? updated : sport)))
    showNotice('success', `Guardamos ${updated.name}.`)
  }

  if (loadError) return <Alert severity="error">{loadError}</Alert>

  if (!sports) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress color="secondary" />
      </Box>
    )
  }

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Deportes del club</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Activá los deportes que ofrece el club y fijá la cuota deportiva de cada uno. Un deporte con inscripciones
          pendientes o aprobadas no se puede desactivar.
        </Typography>
      </Box>

      <Card>
        {sports.map((sport, index) => (
          <Box key={sport.sportId}>
            {index > 0 && <Divider />}
            <SportRow sport={sport} onSaved={handleSaved} onError={(message) => showNotice('error', message)} />
          </Box>
        ))}
      </Card>

      <Snackbar open={notice.open} autoHideDuration={6000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={closeNotice}>{notice.message}</Alert>
      </Snackbar>
    </>
  )
}

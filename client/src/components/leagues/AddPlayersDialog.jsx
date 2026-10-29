import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import InputAdornment from '@mui/material/InputAdornment'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SearchRounded from '@mui/icons-material/SearchRounded'

import { assignPlayers, getEligiblePlayers } from '../../api/leagues.api.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { MEMBER_STATES } from '../../utils/constants.js'
import StatusChip from '../common/StatusChip.jsx'

// Agregar varias jugadoras a la vez. Solo se listan las que se pueden asignar (inscripción Aprobada en el deporte y edad
// de la categoría) y todavía no están. category: el detalle de la categoría
export default function AddPlayersDialog({ open, category, onClose, onSaved }) {
  const [search, setSearch] = useState('')
  const [players, setPlayers] = useState(null)
  const [selected, setSelected] = useState([])
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setSearch('')
    setSelected([])
    setError('')
  }, [open])

  // La búsqueda se manda cuando se deja de escribir
  useEffect(() => {
    if (!open) return undefined

    const timer = setTimeout(() => {
      getEligiblePlayers(category.id, search.trim())
        .then(({ data }) => {
          setPlayers(data.players)
          setLoadError('')
        })
        .catch((err) => setLoadError(getErrorMessage(err)))
    }, 300)

    return () => clearTimeout(timer)
  }, [open, search, category.id])

  const toggle = (memberId) => setSelected((current) => (
    current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
  ))

  const handleSave = async () => {
    setError('')
    setSaving(true)

    try {
      const { data } = await assignPlayers(category.id, selected)
      onSaved(data, selected.length === 1 ? 'Agregamos la jugadora.' : `Agregamos ${selected.length} jugadoras.`)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const { ageGroup, year } = category
  const note = ageGroup.maxAge === null
    ? 'Mayores: todas las edades.'
    : `Solo aparecen las jugadoras de hasta ${ageGroup.maxAge} años en ${year}.`

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Agregar jugadoras a {category.name}</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          {note} Tienen que tener la inscripción Aprobada en {category.sport.name}.
        </Alert>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

        <TextField
          placeholder="Buscar por nombre, DNI o número de socio"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          size="small"
          fullWidth
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> },
            htmlInput: { maxLength: 100, 'aria-label': 'Buscar jugadoras' }
          }}
        />

        {!players && !loadError && (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
            <CircularProgress color="secondary" />
          </Box>
        )}

        {players && players.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>
            {search.trim() ? 'No encontramos jugadoras con esa búsqueda.' : 'No hay jugadoras para agregar a esta categoría.'}
          </Typography>
        )}

        {players && players.length > 0 && (
          <List dense sx={{ mt: 1, maxHeight: 360, overflowY: 'auto' }}>
            {players.map((player) => (
              <ListItemButton key={player.memberId} onClick={() => toggle(player.memberId)} sx={{ borderRadius: 2 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Checkbox edge="start" checked={selected.includes(player.memberId)} tabIndex={-1} disableRipple color="secondary" />
                </ListItemIcon>
                <ListItemText
                  primary={player.name}
                  secondary={`Nº ${player.numMember} · ${player.seasonAge} años en ${year}`}
                  slotProps={{ primary: { sx: { color: 'navy.main', fontWeight: 500 } } }}
                />
                {player.memberStateId === MEMBER_STATES.SUSPENDED && <StatusChip status="urgent" label="Suspendida" />}
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" color="secondary" onClick={handleSave} loading={saving} disabled={selected.length === 0}>
          {selected.length > 1 ? `Agregar ${selected.length}` : 'Agregar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

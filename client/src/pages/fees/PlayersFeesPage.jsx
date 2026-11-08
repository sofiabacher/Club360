import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import RequestQuoteRounded from '@mui/icons-material/RequestQuoteRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'

import { getPlayersFees } from '../../api/fees.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import StatusChip from '../../components/common/StatusChip.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { MEMBER_STATES } from '../../utils/constants.js'

const STATUS_CHIPS = {
  ok: { status: 'ok', label: 'Al día' },
  pending: { status: 'pending', label: 'Pendiente' },
  overdue: { status: 'overdue', label: 'Vencida' }
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'ok', label: 'Al día' },
  { value: 'pending', label: 'Con cuotas pendientes' },
  { value: 'overdue', label: 'Con cuotas vencidas' }
]

// Cuotas de jugadoras (fees.viewPlayers): la situación de las jugadoras de los deportes del Representante, sin montos.
// Solo lectura. "No se puede citar" cuando tiene mora (suspendida o más días de atraso que el plazo del club)
export default function PlayersFeesPage() {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState({ status: '', search: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setQuery((current) => (current.search === search.trim() ? current : { ...current, search: search.trim() })), 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setLoading(true)
    getPlayersFees(query)
      .then(({ data }) => {
        setResult(data)
        setError('')
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [query])

  const players = result?.items ?? []

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Cuotas de jugadoras</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          La situación de cada jugadora con sus cuotas.{result ? ` Con más de ${result.delayFee} días de atraso no se la puede citar.` : ''}
        </Typography>
      </Box>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="Buscar por nombre, DNI o número de socio"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> },
            htmlInput: { maxLength: 100, 'aria-label': 'Buscar jugadoras' }
          }}
        />
        <TextField select label="Situación" value={query.status} onChange={(event) => setQuery((current) => ({ ...current, status: event.target.value }))} size="small" sx={{ minWidth: 220 }}>
          {STATUS_OPTIONS.map((option) => <MenuItem key={option.label} value={option.value}>{option.label}</MenuItem>)}
        </TextField>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!result && loading && <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>}

      {result && players.length === 0 && (
        query.search || query.status
          ? <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>No encontramos jugadoras con esa búsqueda.</Typography>
          : <EmptyState icon={RequestQuoteRounded} title="Sin jugadoras" description="Todavía no hay jugadoras con inscripción aprobada." />
      )}

      {players.length > 0 && (
        <Stack spacing={1.5} sx={{ opacity: loading ? 0.6 : 1 }}>
          {players.map((player) => {
            const chip = STATUS_CHIPS[player.status]
            return (
              <Card key={player.memberId} variant="outlined">
                <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, alignItems: { sm: 'center' }, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 600, color: 'navy.main', overflowWrap: 'anywhere' }}>{player.name}</Typography>
                      <Typography variant="numeric" sx={{ color: 'text.secondary' }}>Nº {player.numMember}</Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {player.sports.join(', ')}
                      {player.overdueDays > 0 ? ` · ${player.overdueDays} ${player.overdueDays === 1 ? 'día' : 'días'} de atraso` : ''}
                    </Typography>
                  </Box>
                  <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
                    <StatusChip status={chip.status} label={chip.label} />
                    {player.memberStateId === MEMBER_STATES.SUSPENDED && <StatusChip status="overdue" label="Suspendida" />}
                    {!player.canBeCited && <StatusChip status="urgent" label="No se puede citar" />}
                  </Stack>
                </CardContent>
              </Card>
            )
          })}
        </Stack>
      )}
    </>
  )
}

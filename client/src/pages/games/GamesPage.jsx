import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddRounded from '@mui/icons-material/AddRounded'
import EventRounded from '@mui/icons-material/EventRounded'
import MoreVertRounded from '@mui/icons-material/MoreVertRounded'

import { cancelGame, getGameOptions, getGames } from '../../api/games.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import GameFormDialog from '../../components/games/GameFormDialog.jsx'
import GameListItem from '../../components/games/GameListItem.jsx'
import GameResultForm from '../../components/games/GameResultForm.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { GAME_STATES } from '../../utils/constants.js'
import { formatDayHeader } from '../../utils/format.js'

// Filtro de los Jugados sin resultado (no es un estado: se manda como withoutResult)
const NO_RESULT = 'noResult'

const STATE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: GAME_STATES.SCHEDULED, label: 'Programados' },
  { value: GAME_STATES.PLAYED, label: 'Jugados' },
  { value: NO_RESULT, label: 'Jugados sin resultado' },
  { value: GAME_STATES.CANCELLED, label: 'Cancelados' }
]

// Hoy como 'AAAA-MM-DD' (hora de la computadora)
const todayKey = () => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

// Agrupa los partidos por día: [{ day, games }]
function groupByDay(games) {
  const groups = new Map()
  for (const game of games) {
    const day = formatDayHeader(game.dateTime)
    groups.set(day, [...(groups.get(day) ?? []), game])
  }
  return [...groups].map(([day, items]) => ({ day, games: items }))
}

// Fixture del Representante (games.manage): partidos del alcance con filtros, alta, edición, jugado con su resultado,
// corrección del resultado y cancelación. Con ?withoutResult=true (desde el panel de inicio) abre con los Jugados sin
// resultado
export default function GamesPage() {
  const [searchParams] = useSearchParams()
  const [options, setOptions] = useState(null)
  const [query, setQuery] = useState(() => (searchParams.get('withoutResult') === 'true'
    ? { categoryId: '', state: NO_RESULT, from: '', to: '', page: 1 }
    : { categoryId: '', state: '', from: todayKey(), to: '', page: 1 }))
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ open: false, game: null })
  const [menu, setMenu] = useState(null)   // { anchor, game }
  const [cancelling, setCancelling] = useState(null)   // { game, reason }
  const [resultForm, setResultForm] = useState(null)   // { game, mode: 'played' | 'result' }
  const [running, setRunning] = useState(false)
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })   // Snackbar
  const showNotice = (severity, message) => setNotice({ open: true, severity, message })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  useEffect(() => {
    getGameOptions()
      .then(({ data }) => setOptions(data))
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  const load = useCallback(() => {
    setLoading(true)
    const { state, ...rest } = query
    getGames({ ...rest, state: state === NO_RESULT ? '' : state, withoutResult: state === NO_RESULT })
      .then(({ data }) => {
        setResult(data)
        setError('')
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [query])

  useEffect(() => {
    load()
  }, [load])

  // Los Jugados sin resultado son del pasado: al elegir ese filtro se quita el "Desde hoy"
  const setFilter = (field) => (event) => setQuery((current) => ({
    ...current,
    [field]: event.target.value,
    ...(field === 'state' && event.target.value === NO_RESULT && current.from === todayKey() && { from: '' }),
    page: 1
  }))

  const handleSaved = ({ conflicts }) => {
    setForm({ open: false, game: null })
    const players = new Set(conflicts.map((conflict) => conflict.member.id)).size
    showNotice(players > 0 ? 'warning' : 'success', players > 0
      ? `Guardamos el partido. ${players} ${players === 1 ? 'jugadora tiene' : 'jugadoras tienen'} partidos superpuestos: les avisamos a las entrenadoras.`
      : 'Guardamos el partido.')
    load()
  }

  const openResult = (game, mode) => {
    setMenu(null)
    setResultForm({ game, mode })
  }

  const handleResultSaved = () => {
    showNotice('success', resultForm.mode === 'played' ? 'Marcamos el partido como jugado y guardamos el resultado.' : 'Guardamos el resultado.')
    setResultForm(null)
    load()
  }

  const handleCancel = async () => {
    setRunning(true)
    try {
      const { data } = await cancelGame(cancelling.game.id, cancelling.reason)
      showNotice('success', data.cancelledCitations > 0
        ? `Cancelamos el partido y sus ${data.cancelledCitations} citaciones. Les avisamos a las jugadoras.`
        : 'Cancelamos el partido.')
      setCancelling(null)
      load()
    } catch (err) {
      showNotice('error', getErrorMessage(err))
    } finally {
      setRunning(false)
    }
  }

  const games = result?.items ?? []
  const filtered = query.categoryId || query.state || query.to || query.from !== todayKey()
  const isPast = (game) => new Date(game.dateTime) <= new Date()

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Partidos</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            El fixture de tus categorías. Te avisamos si alguna jugadora queda con partidos superpuestos.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddRounded />} onClick={() => setForm({ open: true, game: null })} disabled={!options} sx={{ flexShrink: 0 }}>
          Nuevo partido
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField select label="Categoría" value={query.categoryId} onChange={setFilter('categoryId')} size="small" sx={{ minWidth: 220, flexGrow: 1 }}>
          <MenuItem value="">Todas</MenuItem>
          {(options?.categories ?? []).map((category) => <MenuItem key={category.id} value={category.id}>{category.name} · {category.league.name}</MenuItem>)}
        </TextField>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
          <TextField select label="Estado" value={query.state} onChange={setFilter('state')} size="small" sx={{ minWidth: 150, flexGrow: 1 }}>
            {STATE_OPTIONS.map((option) => <MenuItem key={option.label} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <TextField type="date" label="Desde" value={query.from} onChange={setFilter('from')} size="small" sx={{ flexGrow: 1 }} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField type="date" label="Hasta" value={query.to} onChange={setFilter('to')} size="small" sx={{ flexGrow: 1 }} slotProps={{ inputLabel: { shrink: true } }} />
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!result && loading && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress color="secondary" />
        </Box>
      )}

      {result && games.length === 0 && (
        <EmptyState
          icon={EventRounded}
          title="Sin partidos"
          description={query.state === NO_RESULT
            ? 'Todos los partidos jugados tienen su resultado.'
            : filtered ? 'No hay partidos con esos filtros.' : 'Todavía no hay partidos programados. Cargá el primero con "Nuevo partido".'}
        />
      )}

      <Stack spacing={2.5} sx={{ opacity: loading ? 0.6 : 1 }}>
        {groupByDay(games).map(({ day, games: dayGames }) => (
          <Box key={day}>
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, color: 'navy.main', mb: 1 }}>{day}</Typography>
            <Card>
              <CardContent sx={{ py: 0.5, '&:last-child': { pb: 0.5 } }}>
                <Stack divider={<Divider flexItem />}>
                  {dayGames.map((game) => (
                    <GameListItem
                      key={game.id}
                      game={game}
                      onLoadResult={(item) => openResult(item, 'result')}
                      action={(game.gameState === GAME_STATES.SCHEDULED || game.outcome) && (
                        <IconButton aria-label={`Acciones del partido vs. ${game.rival}`} onClick={(event) => setMenu({ anchor: event.currentTarget, game })}>
                          <MoreVertRounded />
                        </IconButton>
                      )}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Stack>

      {result && result.totalPages > 1 && (
        <Stack sx={{ alignItems: 'center', mt: 3 }}>
          <Pagination count={result.totalPages} page={result.page} onChange={(event, page) => setQuery((current) => ({ ...current, page }))} color="secondary" />
        </Stack>
      )}

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {menu && menu.game.gameState === GAME_STATES.PLAYED && (
          <MenuItem onClick={() => openResult(menu.game, 'result')}>Corregir resultado</MenuItem>
        )}
        {menu && menu.game.gameState === GAME_STATES.SCHEDULED && [
          <MenuItem key="edit" onClick={() => { setForm({ open: true, game: menu.game }); setMenu(null) }}>Editar</MenuItem>,
          isPast(menu.game) && <MenuItem key="played" onClick={() => openResult(menu.game, 'played')}>Marcar como jugado</MenuItem>,
          <MenuItem key="cancel" onClick={() => { setCancelling({ game: menu.game, reason: '' }); setMenu(null) }} sx={{ color: 'error.main' }}>Cancelar partido</MenuItem>
        ].filter(Boolean)}
      </Menu>

      {options && (
        <GameFormDialog
          open={form.open}
          game={form.game}
          options={options}
          onClose={() => setForm({ open: false, game: null })}
          onSaved={handleSaved}
        />
      )}

      <GameResultForm
        open={Boolean(resultForm)}
        game={resultForm?.game}
        mode={resultForm?.mode}
        onClose={() => setResultForm(null)}
        onSaved={handleResultSaved}
      />

      <Dialog open={Boolean(cancelling)} onClose={running ? undefined : () => setCancelling(null)} fullWidth maxWidth="xs">
        {cancelling && (
          <>
            <DialogTitle>Cancelar el partido</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>
                {cancelling.game.category?.name} vs. {cancelling.game.rival}. Se van a cancelar las citaciones y se les va a
                avisar a las jugadoras. Un partido cancelado no se vuelve a programar: si se reprograma, se carga otro.
              </DialogContentText>
              <TextField
                label="Motivo (opcional)"
                value={cancelling.reason}
                onChange={(event) => setCancelling((current) => ({ ...current, reason: event.target.value }))}
                multiline
                minRows={2}
                fullWidth
                slotProps={{ htmlInput: { maxLength: 300 } }}
                helperText="Queda en la bitácora."
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button color="secondary" onClick={() => setCancelling(null)} disabled={running}>Volver</Button>
              <Button variant="contained" color="error" onClick={handleCancel} loading={running}>Cancelar partido</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar open={notice.open} autoHideDuration={6000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={closeNotice}>{notice.message}</Alert>
      </Snackbar>
    </>
  )
}

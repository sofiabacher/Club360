import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import GroupsRounded from '@mui/icons-material/GroupsRounded'

import { cancelCitation, createCitations, getGameRoster } from '../../api/citations.api.js'
import CitationStateChip from '../../components/citations/CitationStateChip.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import StatusChip from '../../components/common/StatusChip.jsx'
import { HomeChip } from '../../components/games/GameChips.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { CITATION_MIN_HOURS, CITATION_STATES, GAME_STATES } from '../../utils/constants.js'
import { formatDeadline, formatGameDate } from '../../utils/format.js'

// Estados que la entrenadora puede cancelar, antes del partido
const CANCELLABLE_STATES = [CITATION_STATES.PENDING, CITATION_STATES.CONFIRMED, CITATION_STATES.AUTO_CONFIRMED]

// Motivo por el que una jugadora no se puede citar (los de la API), como chip
function ReasonChip({ player }) {
  if (player.reason === 'OVERDUE') return <StatusChip status="urgent" label="Mora" />
  if (player.reason === 'CONFLICT_RESOLVED') {
    return <Chip label={`Juega en ${player.chosenGame?.categoryName}: conflicto resuelto`} size="small" sx={{ fontWeight: 600, maxWidth: '100%' }} />
  }
  return null
}

// Una jugadora de la lista: casilla (si se la puede citar), nombre, estado de su citación o motivo, y "Cancelar citación"
function PlayerRow({ player, checked, onToggle, canCancel, onCancel }) {
  const [showJustification, setShowJustification] = useState(false)
  const { citation } = player
  const rejected = citation?.citationState === CITATION_STATES.REJECTED

  return (
    <Box sx={{ py: 1.25 }}>
      <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1 }}>
        <Checkbox checked={checked} onChange={onToggle} disabled={!player.citable} color="secondary" sx={{ mt: -0.75, ml: -1 }} slotProps={{ input: { 'aria-label': `Citar a ${player.name}` } }} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>{player.name}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Nº {player.numMember}</Typography>
          <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', mt: 0.75 }}>
            {citation && (
              <CitationStateChip
                citation={citation}
                withDeadline
                onClick={rejected ? () => setShowJustification((value) => !value) : undefined}
              />
            )}
            <ReasonChip player={player} />
          </Stack>
          {rejected && showJustification && (
            <Typography variant="body2" sx={{ mt: 0.75, color: 'text.secondary', fontStyle: 'italic', overflowWrap: 'anywhere' }}>
              "{citation.justification}"
            </Typography>
          )}
        </Box>
        {canCancel && (
          <Button size="small" color="secondary" onClick={onCancel} sx={{ flexShrink: 0 }}>Cancelar citación</Button>
        )}
      </Stack>
    </Box>
  )
}

// Aviso de la ventana para citar cuando no está abierta: todavía no abrió (con la fecha) o ya cerró
function WindowAlert({ game }) {
  if (game.citationWindow?.status === 'NOT_YET_OPEN') {
    return <Alert severity="info" sx={{ mb: 2 }}>Las citaciones para este partido se habilitan el {formatDeadline(game.citationWindow.opensAt)}.</Alert>
  }
  if (!game.canCite) return <Alert severity="info" sx={{ mb: 2 }}>Ya no se pueden generar citaciones para este partido.</Alert>
  return null
}

// Citaciones de un partido (citations.create): la lista de la categoría para citar a varias a la vez y cancelar
// citaciones. Fuera de la ventana para citar (desde 7 días hasta 48 horas antes), solo se consulta
export default function GameCitationsPage() {
  const { gameId } = useParams()
  const [data, setData] = useState(null)   // { game, players }
  const [error, setError] = useState('')
  const [selected, setSelected] = useState([])
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(null)   // jugadora con la citación a cancelar
  const [running, setRunning] = useState(false)
  const [problems, setProblems] = useState([])
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  const load = useCallback(() => {
    getGameRoster(gameId)
      .then(({ data: roster }) => {
        setData(roster)
        setSelected([])
      })
      .catch((err) => setError(getErrorMessage(err)))
  }, [gameId])

  useEffect(() => { load() }, [load])

  const handleCite = async () => {
    setRunning(true)
    setProblems([])
    try {
      const { data: roster } = await createCitations(gameId, selected)
      setNotice({ open: true, severity: 'success', message: selected.length === 1 ? 'Citaste a 1 jugadora.' : `Citaste a ${selected.length} jugadoras.` })
      setData(roster)
      setSelected([])
    } catch (err) {
      setProblems(err.response?.data?.data?.problems ?? [])
      setNotice({ open: true, severity: 'error', message: err.response?.data?.code === 'PLAYERS_NOT_CITABLE' ? 'No se citó a nadie: revisá los motivos.' : getErrorMessage(err) })
      load()
    } finally {
      setRunning(false)
      setConfirming(false)
    }
  }

  const handleCancel = async () => {
    setRunning(true)
    try {
      await cancelCitation(cancelling.citation.id)
      setNotice({ open: true, severity: 'success', message: `Cancelaste la citación de ${cancelling.name}. Le avisamos.` })
      setCancelling(null)
      load()
    } catch (err) {
      setNotice({ open: true, severity: 'error', message: getErrorMessage(err) })
    } finally {
      setRunning(false)
    }
  }

  if (error) return <Alert severity="error">{error}</Alert>

  if (!data) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>
  }

  const { game, players } = data
  const citable = players.filter((player) => player.citable)
  const gameOpen = game.gameState === GAME_STATES.SCHEDULED && new Date(game.dateTime) > new Date()
  const allSelected = citable.length > 0 && selected.length === citable.length

  const toggle = (memberId) => setSelected((current) => (
    current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
  ))

  return (
    <>
      <Button component={RouterLink} to="/citations" startIcon={<ArrowBackRounded />} color="secondary" sx={{ mb: 2 }}>
        Citaciones
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{game.category?.name} · {game.league?.name}</Typography>
          <Typography variant="numeric" component="p" sx={{ fontSize: { xs: '1.9rem', sm: '2.3rem' }, color: 'navy.main' }}>{formatGameDate(game.dateTime)}</Typography>
          <Typography sx={{ fontWeight: 600, color: 'navy.main', overflowWrap: 'anywhere' }}>vs. {game.rival}</Typography>
          <Stack direction="row" sx={{ gap: 0.75, mt: 1 }}><HomeChip isHome={game.isHome} /></Stack>
        </CardContent>
      </Card>

      <WindowAlert game={game} />

      {problems.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setProblems([])}>
          No se citó a nadie:
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {problems.map((problem) => <li key={problem.memberId}>{problem.message}</li>)}
          </Box>
        </Alert>
      )}

      {players.length === 0 ? (
        <EmptyState icon={GroupsRounded} title="Sin jugadoras" description="La categoría todavía no tiene jugadoras asignadas." />
      ) : (
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Typography variant="h6" component="h3" sx={{ color: 'navy.main' }}>Jugadoras de {game.category?.name}</Typography>
              {citable.length > 0 && (
                <FormControlLabel
                  control={(
                    <Checkbox
                      color="secondary"
                      checked={allSelected}
                      indeterminate={selected.length > 0 && !allSelected}
                      onChange={() => setSelected(allSelected ? [] : citable.map((player) => player.memberId))}
                    />
                  )}
                  label="Todas las que se pueden citar"
                />
              )}
            </Stack>

            <Stack divider={<Divider flexItem />}>
              {players.map((player) => (
                <PlayerRow
                  key={player.memberId}
                  player={player}
                  checked={selected.includes(player.memberId)}
                  onToggle={() => toggle(player.memberId)}
                  canCancel={gameOpen && Boolean(player.citation) && CANCELLABLE_STATES.includes(player.citation.citationState)}
                  onCancel={() => setCancelling(player)}
                />
              ))}
            </Stack>

            {game.canCite && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button variant="contained" color="primary" disabled={selected.length === 0} onClick={() => setConfirming(true)} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  Citar a las seleccionadas{selected.length > 0 ? ` (${selected.length})` : ''}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={confirming} onClose={running ? undefined : () => setConfirming(false)} fullWidth maxWidth="xs">
        <DialogTitle>¿Citar a {selected.length === 1 ? '1 jugadora' : `${selected.length} jugadoras`}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Les va a llegar el aviso (y a su familia, si son menores). Tienen 24 horas para responder; si no, la citación queda confirmada.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={() => setConfirming(false)} disabled={running}>Volver</Button>
          <Button variant="contained" color="secondary" onClick={handleCite} loading={running}>Citar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(cancelling)} onClose={running ? undefined : () => setCancelling(null)} fullWidth maxWidth="xs">
        {cancelling && (
          <>
            <DialogTitle>¿Cancelar la citación de {cancelling.name}?</DialogTitle>
            <DialogContent>
              <DialogContentText>Le va a llegar un aviso. Después la podés volver a citar mientras falten al menos {CITATION_MIN_HOURS / 24} días para el partido.</DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button color="secondary" onClick={() => setCancelling(null)} disabled={running}>Volver</Button>
              <Button variant="contained" color="secondary" onClick={handleCancel} loading={running}>Cancelar citación</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar open={notice.open} autoHideDuration={5000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={closeNotice}>{notice.message}</Alert>
      </Snackbar>
    </>
  )
}

import { useCallback, useEffect, useState } from 'react'
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
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import EventAvailableRounded from '@mui/icons-material/EventAvailableRounded'
import EventRounded from '@mui/icons-material/EventRounded'

import { getAssignedGames, getConflicts, resolveConflict } from '../../api/games.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import ConflictCard from '../../components/games/ConflictCard.jsx'
import GameListItem from '../../components/games/GameListItem.jsx'
import usePermission from '../../hooks/usePermission.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { formatDayHeader } from '../../utils/format.js'
import { gameSummary } from '../../utils/games.js'

const TABS = { GAMES: 'games', CONFLICTS: 'conflicts' }

function groupByDay(games) {
  const groups = new Map()
  for (const game of games) {
    const day = formatDayHeader(game.dateTime)
    groups.set(day, [...(groups.get(day) ?? []), game])
  }
  return [...groups].map(([day, items]) => ({ day, games: items }))
}

// Partidos del staff (games.viewAssigned): los próximos partidos de sus categorías y, con games.resolveConflicts,
// los conflictos de horario de sus jugadoras para resolverlos con la otra entrenadora
export default function AssignedGamesPage() {
  const { hasPermission } = usePermission()
  const canResolve = hasPermission('games.resolveConflicts')

  const [tab, setTab] = useState(TABS.GAMES)
  const [games, setGames] = useState(null)
  const [conflictData, setConflictData] = useState(null)   // { conflictMargin, conflicts }
  const [error, setError] = useState('')
  const [resolving, setResolving] = useState(null)   // { conflict, chosenGameId, note }
  const [running, setRunning] = useState(false)
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })   // Snackbar
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  const loadConflicts = useCallback(() => {
    if (!canResolve) return
    getConflicts()
      .then(({ data }) => setConflictData(data))
      .catch((err) => setError(getErrorMessage(err)))
  }, [canResolve])

  useEffect(() => {
    getAssignedGames()
      .then(({ data }) => setGames(data.items))
      .catch((err) => setError(getErrorMessage(err)))
    loadConflicts()
  }, [loadConflicts])

  const handleResolve = async () => {
    setRunning(true)
    try {
      const { conflict, chosenGameId, note } = resolving
      await resolveConflict({ memberId: conflict.member.id, gameIds: conflict.games.map((game) => game.id), chosenGameId, note })
      setNotice({ open: true, severity: 'success', message: 'Resolvimos el conflicto. Quedó registrado en la bitácora.' })
      setResolving(null)
      loadConflicts()
    } catch (err) {
      setNotice({ open: true, severity: 'error', message: getErrorMessage(err) })
    } finally {
      setRunning(false)
    }
  }

  const pending = conflictData?.conflicts.filter((conflict) => !conflict.resolved).length ?? 0

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Partidos</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Los partidos de tus categorías.</Typography>
      </Box>

      {canResolve && (
        <Tabs value={tab} onChange={(event, value) => setTab(value)} textColor="secondary" indicatorColor="secondary" sx={{ mb: 2 }}>
          <Tab value={TABS.GAMES} label="Próximos partidos" />
          <Tab value={TABS.CONFLICTS} label={pending > 0 ? `Conflictos (${pending})` : 'Conflictos'} />
        </Tabs>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {tab === TABS.GAMES && (
        <>
          {!games && !error && (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>
          )}
          {games && games.length === 0 && (
            <EmptyState icon={EventRounded} title="Sin partidos" description="No hay partidos próximos en tus categorías." />
          )}
          <Stack spacing={2.5}>
            {groupByDay(games ?? []).map(({ day, games: dayGames }) => (
              <Box key={day}>
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, color: 'navy.main', mb: 1 }}>{day}</Typography>
                <Card>
                  <CardContent sx={{ py: 0.5, '&:last-child': { pb: 0.5 } }}>
                    <Stack divider={<Divider flexItem />}>
                      {dayGames.map((game) => <GameListItem key={game.id} game={game} />)}
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Stack>
        </>
      )}

      {tab === TABS.CONFLICTS && (
        <>
          {!conflictData && !error && (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>
          )}
          {conflictData && conflictData.conflicts.length === 0 && (
            <EmptyState icon={EventAvailableRounded} title="Sin conflictos" description="No hay conflictos de horario en tus categorías." />
          )}
          <Stack spacing={2}>
            {(conflictData?.conflicts ?? []).map((conflict) => (
              <ConflictCard
                key={conflict.conflictKey}
                conflict={conflict}
                margin={conflictData.conflictMargin}
                onResolve={(item) => setResolving({ conflict: item, chosenGameId: item.games[0].id, note: '' })}
              />
            ))}
          </Stack>
        </>
      )}

      <Dialog open={Boolean(resolving)} onClose={running ? undefined : () => setResolving(null)} fullWidth maxWidth="sm">
        {resolving && (
          <>
            <DialogTitle>¿En qué partido juega {resolving.conflict.member.name}?</DialogTitle>
            <DialogContent>
              <DialogContentText sx={{ mb: 2 }}>Acordalo con la otra entrenadora antes de confirmar.</DialogContentText>
              <RadioGroup
                value={resolving.chosenGameId}
                onChange={(event) => setResolving((current) => ({ ...current, chosenGameId: Number(event.target.value) }))}
              >
                {resolving.conflict.games.map((game) => (
                  <FormControlLabel key={game.id} value={game.id} control={<Radio color="secondary" />} label={`${gameSummary(game)} · ${game.league?.name}`} />
                ))}
              </RadioGroup>
              <TextField
                label="Nota (opcional)"
                value={resolving.note}
                onChange={(event) => setResolving((current) => ({ ...current, note: event.target.value }))}
                multiline
                minRows={2}
                fullWidth
                sx={{ mt: 2 }}
                slotProps={{ htmlInput: { maxLength: 300 } }}
                helperText={`${resolving.note.length}/300`}
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button color="secondary" onClick={() => setResolving(null)} disabled={running}>Cancelar</Button>
              <Button variant="contained" color="secondary" onClick={handleResolve} loading={running}>Confirmar</Button>
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

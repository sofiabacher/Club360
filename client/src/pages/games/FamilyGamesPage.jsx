import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import SportsVolleyballRounded from '@mui/icons-material/SportsVolleyballRounded'

import { getLinkedGames } from '../../api/games.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import PlayerGamesList from '../../components/games/PlayerGamesList.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'

// Partidos de las jugadoras vinculadas al adulto (games.viewLinked), de solo lectura. Con más de una jugadora, un
// selector arriba
export default function FamilyGamesPage() {
  const [players, setPlayers] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getLinkedGames()
      .then(({ data }) => {
        setPlayers(data.players)
        setSelectedId(data.players[0]?.member.id ?? '')
      })
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  if (error) return <Alert severity="error">{error}</Alert>

  if (!players) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>
  }

  if (players.length === 0) {
    return <EmptyState icon={SportsVolleyballRounded} title="Sin jugadoras" description="Todavía no tenés jugadoras vinculadas." />
  }

  const selected = players.find((player) => player.member.id === selectedId) ?? players[0]
  const hasGames = selected.categories.some((item) => item.games.length > 0)

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Partidos</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {players.length === 1 ? `Los próximos partidos de ${selected.member.name}.` : 'Los próximos partidos de tus jugadoras vinculadas.'}
        </Typography>
      </Box>

      {players.length > 1 && (
        <TextField select label="Jugadora" value={selected.member.id} onChange={(event) => setSelectedId(event.target.value)} size="small" sx={{ minWidth: 240, mb: 3 }}>
          {players.map((player) => <MenuItem key={player.member.id} value={player.member.id}>{player.member.name}</MenuItem>)}
        </TextField>
      )}

      {!hasGames
        ? <EmptyState icon={SportsVolleyballRounded} title="Sin partidos" description={`Todavía no hay partidos en las categorías de ${selected.member.name}.`} />
        : <PlayerGamesList categories={selected.categories} />}
    </>
  )
}

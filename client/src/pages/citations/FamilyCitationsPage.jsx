import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AssignmentIndRounded from '@mui/icons-material/AssignmentIndRounded'

import { getLinkedCitations } from '../../api/citations.api.js'
import CitationSections from '../../components/citations/CitationSections.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'

// Citaciones de las jugadoras vinculadas al adulto (citations.viewLinked), de solo lectura: la citación la responde
// siempre la jugadora. Con más de una jugadora, un selector arriba
export default function FamilyCitationsPage() {
  const [players, setPlayers] = useState(null)   // [{ member, upcoming, history }]
  const [selectedId, setSelectedId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getLinkedCitations('upcoming'), getLinkedCitations('history')])
      .then(([upcoming, history]) => {
        const historyOf = new Map(history.data.players.map((player) => [player.member.id, player.items]))
        const list = upcoming.data.players.map((player) => ({ member: player.member, upcoming: player.items, history: historyOf.get(player.member.id) ?? [] }))
        setPlayers(list)
        setSelectedId(list[0]?.member.id ?? '')
      })
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  if (error) return <Alert severity="error">{error}</Alert>

  if (!players) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>
  }

  if (players.length === 0) {
    return <EmptyState icon={AssignmentIndRounded} title="Sin jugadoras" description="Todavía no tenés jugadoras vinculadas." />
  }

  const selected = players.find((player) => player.member.id === selectedId) ?? players[0]

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Citaciones</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {players.length === 1 ? `Las citaciones de ${selected.member.name}.` : 'Las citaciones de tus jugadoras vinculadas.'}
        </Typography>
      </Box>

      {players.length > 1 && (
        <TextField select label="Jugadora" value={selected.member.id} onChange={(event) => setSelectedId(event.target.value)} size="small" sx={{ minWidth: 240, mb: 3 }}>
          {players.map((player) => <MenuItem key={player.member.id} value={player.member.id}>{player.member.name}</MenuItem>)}
        </TextField>
      )}

      <CitationSections
        upcoming={selected.upcoming}
        history={selected.history}
        emptyText={`${selected.member.name} no tiene citaciones por ahora.`}
        cardProps={() => ({ readOnly: true })}
      />
    </>
  )
}

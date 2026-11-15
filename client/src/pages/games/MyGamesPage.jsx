import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import SportsVolleyballRounded from '@mui/icons-material/SportsVolleyballRounded'

import { getMyGames } from '../../api/games.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import GameHistory from '../../components/games/GameHistory.jsx'
import GamesTabs, { useGamesTab } from '../../components/games/GamesTabs.jsx'
import PlayerGamesList from '../../components/games/PlayerGamesList.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'

const TABS = [{ value: 'proximos', label: 'Próximos' }, { value: 'jugados', label: 'Jugados' }]

// Mis partidos (games.viewOwn): pestaña "Próximos" (los próximos partidos de sus categorías, separados por liga y
// categoría, con la campaña arriba) y "Jugados" (el historial, con su citación en cada partido)
export default function MyGamesPage() {
  const [tab, setTab] = useGamesTab(TABS.map((item) => item.value))
  const [categories, setCategories] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getMyGames()
      .then(({ data }) => setCategories(data.categories))
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  if (error) return <Alert severity="error">{error}</Alert>

  if (!categories) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>
  }


  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Mis partidos</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>La campaña, los próximos partidos y los ya jugados de tus categorías.</Typography>
      </Box>

      <GamesTabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'jugados' && <GameHistory kind="mine" />}
      {tab === 'proximos' && (categories.length === 0
        ? <EmptyState icon={SportsVolleyballRounded} title="Sin partidos" description="Todavía no estás en ninguna categoría." />
        : <PlayerGamesList categories={categories} showCampaign />)}
    </>
  )
}

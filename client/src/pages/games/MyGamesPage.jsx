import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import SportsVolleyballRounded from '@mui/icons-material/SportsVolleyballRounded'

import { getMyGames } from '../../api/games.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import PlayerGamesList from '../../components/games/PlayerGamesList.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'

// Mis partidos (games.viewOwn): los próximos partidos de las categorías de la jugadora, separados por liga y categoría
export default function MyGamesPage() {
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

  const hasGames = categories.some((item) => item.games.length > 0)

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Mis partidos</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Los próximos partidos de tus categorías.</Typography>
      </Box>

      {!hasGames
        ? <EmptyState icon={SportsVolleyballRounded} title="Sin partidos" description="Todavía no hay partidos en tus categorías." />
        : <PlayerGamesList categories={categories} />}
    </>
  )
}

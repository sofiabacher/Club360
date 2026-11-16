import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import SportsVolleyballRounded from '@mui/icons-material/SportsVolleyballRounded'

import { getMyGames } from '../../api/games.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import GameHistory from '../../components/games/GameHistory.jsx'
import GamesTabs, { useGamesTab } from '../../components/games/GamesTabs.jsx'
import PlayerGamesList from '../../components/games/PlayerGamesList.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import LoadingSkeleton from '../../components/common/LoadingSkeleton.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'

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
    return <LoadingSkeleton />
  }


  return (
    <>
      <PageHeader title="Mis partidos" description="La campaña, los próximos partidos y los ya jugados de tus categorías." />

      <GamesTabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'jugados' && <GameHistory kind="mine" />}
      {tab === 'proximos' && (categories.length === 0
        ? <EmptyState icon={SportsVolleyballRounded} title="Sin partidos" description="Todavía no estás en ninguna categoría." />
        : <PlayerGamesList categories={categories} showCampaign />)}
    </>
  )
}

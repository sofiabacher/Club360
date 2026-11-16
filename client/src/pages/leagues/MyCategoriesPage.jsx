import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CategoryRounded from '@mui/icons-material/CategoryRounded'

import { getMyCategories } from '../../api/leagues.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import PlayerStatusChips from '../../components/leagues/PlayerStatusChips.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import LoadingSkeleton from '../../components/common/LoadingSkeleton.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'

// Categorías asignadas a la Entrenadora o la Preparadora física logueada, con sus jugadoras y el resto del staff.
// Pantalla de leagues.viewAssigned
export default function MyCategoriesPage() {
  const [data, setData] = useState(null)   // { year, categories }
  const [error, setError] = useState('')

  useEffect(() => {
    getMyCategories()
      .then(({ data: result }) => setData(result))
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  if (error) return <Alert severity="error">{error}</Alert>

  if (!data) {
    return (
      <LoadingSkeleton />
    )
  }

  const { year, categories } = data

  if (categories.length === 0) {
    return (
      <EmptyState
        icon={CategoryRounded}
        title="Sin categorías"
        description="Todavía no tenés categorías asignadas. El Representante del deporte te las va a asignar."
      />
    )
  }

  return (
    <>
      <PageHeader title="Mis categorías" description={<>Edades de la temporada {year}. Las jugadoras con mora no pueden ser citadas hasta regularizar sus cuotas.</>} />

      <Grid container spacing={3}>
        {categories.map((category) => (
          <Grid key={category.id} size={{ xs: 12, lg: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="h6" component="h3" sx={{ color: 'navy.main' }}>{category.name}</Typography>
                  <Chip label={category.ageGroup.label} size="small" variant="outlined" color="secondary" />
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {category.league.name} · {category.league.sport}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" sx={{ color: 'navy.main', mb: 1 }}>
                  Jugadoras ({category.players.length})
                </Typography>

                {category.players.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Todavía no tiene jugadoras.</Typography>
                ) : (
                  <Stack divider={<Divider flexItem />}>
                    {category.players.map((player) => (
                      <Stack key={player.memberId} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, py: 1, flexWrap: 'wrap' }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 500, color: 'navy.main' }}>{player.name}</Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            <Typography component="span" variant="numeric" sx={{ fontSize: '1rem', color: 'navy.main' }}>{player.numMember}</Typography>
                            {' · '}{player.seasonAge} años
                          </Typography>
                        </Box>
                        <PlayerStatusChips memberStateId={player.memberStateId} exceedsAge={player.exceedsAge} suspendedLabel="Mora" />
                      </Stack>
                    ))}
                  </Stack>
                )}

                {category.otherStaff.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" sx={{ color: 'navy.main', mb: 1 }}>También en el staff</Typography>
                    <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
                      {category.otherStaff.map((person) => (
                        <Chip key={person.staffId} label={`${person.name} · ${person.roles.join(', ')}`} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  )
}

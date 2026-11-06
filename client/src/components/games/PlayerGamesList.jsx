import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import PlaceRounded from '@mui/icons-material/PlaceRounded'

import { GameStateChip, HomeChip } from './GameChips.jsx'
import { GAME_STATES } from '../../utils/constants.js'
import { formatGameDate, formatShortDateTime, getMapsUrl } from '../../utils/format.js'

// Un partido de la jugadora. Si no lo juega por un conflicto de horario resuelto (conflict.notPlaying), se muestra
// atenuado, con el chip "No lo jugás" y el partido que sí juega
function PlayerGame({ game }) {
  const cancelled = game.gameState === GAME_STATES.CANCELLED
  const notPlaying = Boolean(game.conflict?.notPlaying)

  return (
    <Box sx={{ py: 1.5, opacity: cancelled || notPlaying ? 0.7 : 1 }}>
      <Typography variant="numeric" component="p" sx={{ fontSize: '1.5rem', color: 'navy.main', textDecoration: cancelled ? 'line-through' : 'none' }}>
        {formatGameDate(game.dateTime)}
      </Typography>
      <Typography sx={{ fontWeight: 600, color: 'navy.main', textDecoration: cancelled ? 'line-through' : 'none', overflowWrap: 'anywhere' }}>
        vs. {game.rival}
      </Typography>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, color: 'text.secondary', mt: 0.25, flexWrap: 'wrap' }}>
        <PlaceRounded sx={{ fontSize: 16 }} />
        <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{game.address}</Typography>
        {!cancelled && (
          <Link href={getMapsUrl(game.address)} target="_blank" rel="noopener noreferrer" variant="body2" color="secondary" underline="hover" sx={{ ml: 0.5 }}>
            Cómo llegar
          </Link>
        )}
      </Stack>
      <Stack direction="row" sx={{ gap: 0.75, mt: 1, flexWrap: 'wrap' }}>
        <HomeChip isHome={game.isHome} />
        {game.gameState !== GAME_STATES.SCHEDULED && <GameStateChip gameState={game.gameState} />}
        {notPlaying && <Chip label="No lo jugás" size="small" sx={{ fontWeight: 600 }} />}
      </Stack>
      {notPlaying && (
        <Typography variant="body2" sx={{ mt: 1, color: 'navy.main' }}>
          Por superposición de horario, jugás {game.conflict.chosenGame.categoryName} vs. {game.conflict.chosenGame.rival} ({formatShortDateTime(game.conflict.chosenGame.dateTime)}).
        </Typography>
      )}
    </Box>
  )
}

// Partidos de una jugadora: un módulo por liga y, adentro, una sección por categoría (contexto: si juega en dos ligas,
// se ven separadas). categories: [{ category, league, games }]
export default function PlayerGamesList({ categories }) {
  const leagues = new Map()
  for (const item of categories) {
    leagues.set(item.league.id, { league: item.league, items: [...(leagues.get(item.league.id)?.items ?? []), item] })
  }

  return (
    <Stack spacing={3}>
      {[...leagues.values()].map(({ league, items }) => (
        <Card key={league.id}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" component="h3" sx={{ color: 'navy.main' }}>{league.name}</Typography>
            {league.sport && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{league.sport}</Typography>}

            {items.map(({ category, games }) => (
              <Box key={category.id} sx={{ mt: 2 }}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'navy.main' }}>{category.name}</Typography>
                  {category.ageGroup && <Chip label={category.ageGroup} size="small" variant="outlined" color="secondary" />}
                </Stack>
                {games.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>No hay partidos próximos en esta categoría.</Typography>
                ) : (
                  <Stack divider={<Divider flexItem />}>
                    {games.map((game) => <PlayerGame key={game.id} game={game} />)}
                  </Stack>
                )}
              </Box>
            ))}
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}

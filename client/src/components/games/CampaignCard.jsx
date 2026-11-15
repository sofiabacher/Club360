import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import StatusChip from '../common/StatusChip.jsx'
import { getCampaign } from '../../api/games.api.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { formatGameDate } from '../../utils/format.js'
import { outcomeChip, setsText } from '../../utils/results.js'

// Racha: un círculo por resultado, del más nuevo al más viejo (verde "G" o rojo "P")
export function StreakDots({ streak, size = 26 }) {
  return (
    <Stack direction="row" sx={{ gap: 0.75 }} aria-label={`Racha: ${streak.map((item) => (item === 'W' ? 'ganado' : 'perdido')).join(', ')}`}>
      {streak.map((item, index) => (
        <Box
          key={index}
          sx={(theme) => ({
            width: size,
            height: size,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontSize: size * 0.48,
            fontWeight: 700,
            bgcolor: item === 'W' ? theme.status.ok.fg : theme.status.overdue.fg,
            color: '#FFFFFF'
          })}
        >
          {item === 'W' ? 'G' : 'P'}
        </Box>
      ))}
    </Stack>
  )
}

// Último partido: "3 - 1  SÁB 25/10 · 18:30", vs. rival y los sets
function LastGame({ game, compact }) {
  const chip = outcomeChip(game.outcome)
  const sets = setsText(game.setScores)

  return (
    <Box>
      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.5 }}>Último partido</Typography>
      <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap' }}>
        <Typography variant="numeric" sx={{ fontSize: compact ? '1.4rem' : '1.7rem', color: 'navy.main' }}>{game.ownScore} - {game.rivalScore}</Typography>
        <Typography variant="numeric" sx={{ fontSize: compact ? '1rem' : '1.15rem', color: 'text.secondary' }}>{formatGameDate(game.dateTime)}</Typography>
        <StatusChip status={chip.status} label={chip.label} />
      </Stack>
      <Typography variant="body2" sx={{ color: 'navy.main', overflowWrap: 'anywhere' }}>
        vs. {game.rival} · {game.isHome ? 'Local' : 'Visitante'}
      </Typography>
      {sets && !compact && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{sets}</Typography>}
    </Box>
  )
}

// Un dato chico de la fila de datos ("Sets 12 – 7")
function Stat({ label, value, hint }) {
  return (
    <Box sx={{ minWidth: 92 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{label}</Typography>
      <Typography variant="numeric" sx={{ fontSize: '1.2rem', color: 'navy.main' }}>{value}</Typography>
      {hint && <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{hint}</Typography>}
    </Box>
  )
}

// Contenido de la campaña. campaign: la respuesta de GET /games/campaign o el resumen de /games/mine y /games/linked
// ({ season, played, won, lost, winPercentage, streak, lastGame, withoutResult }). compact: solo ganados – perdidos, la
// racha y el último resultado (panel de la Jugadora)
export function CampaignContent({ campaign, compact = false, showPending = false }) {
  const record = campaign.games ?? campaign
  const pendingNote = showPending && campaign.withoutResult > 0 && (
    <Typography variant="body2" sx={{ color: 'warning.dark', mt: 1.5 }}>
      {campaign.withoutResult === 1 ? 'Hay 1 partido jugado sin resultado: no cuenta.' : `Hay ${campaign.withoutResult} partidos jugados sin resultado: no cuentan.`}
    </Typography>
  )

  if (record.played === 0) {
    return (
      <>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Todavía no hay partidos jugados esta temporada.</Typography>
        {pendingNote}
      </>
    )
  }

  return (
    <>
      <Stack direction="row" sx={{ alignItems: 'center', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="numeric" component="p" sx={{ fontSize: compact ? '2rem' : '2.6rem', color: 'navy.main' }}>
            {record.won} – {record.lost}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Ganados – perdidos · {record.winPercentage}% de victorias
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>Racha</Typography>
          <StreakDots streak={campaign.streak} size={compact ? 22 : 26} />
        </Box>
      </Stack>

      {!compact && (
        <Stack direction="row" sx={{ gap: { xs: 2, sm: 3 }, flexWrap: 'wrap', mt: 2 }}>
          <Stat label="Sets" value={`${campaign.sets.for} – ${campaign.sets.against}`} hint={`Diferencia ${campaign.sets.difference > 0 ? '+' : ''}${campaign.sets.difference}`} />
          {campaign.points.gamesWithDetail > 0 && (
            <Stat label="Puntos" value={`${campaign.points.for} – ${campaign.points.against}`} hint={`De ${campaign.points.gamesWithDetail} de ${record.played} partidos`} />
          )}
          <Stat label="De local" value={`${campaign.home.won} – ${campaign.home.lost}`} />
          <Stat label="De visitante" value={`${campaign.away.won} – ${campaign.away.lost}`} />
        </Stack>
      )}

      {campaign.lastGame && <Box sx={{ mt: 2 }}><LastGame game={campaign.lastGame} compact={compact} /></Box>}
      {pendingNote}
    </>
  )
}

// Tarjeta de la campaña de una categoría: el nombre de la categoría y de la liga, la temporada y la campaña
export default function CampaignCard({ category, league, campaign, compact = false, showPending = false }) {
  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="overline" component="h3" sx={{ color: 'text.secondary', letterSpacing: 1.5, display: 'block' }}>
          Campaña {campaign?.season ?? ''}
        </Typography>
        <Typography sx={{ fontWeight: 600, color: 'navy.main', mb: 1.5 }}>{category.name} · {league.name}</Typography>
        <CampaignContent campaign={campaign} compact={compact} showPending={showPending} />
      </CardContent>
    </Card>
  )
}

// La campaña completa de una categoría, pedida a GET /games/campaign (season: la temporada; sin ella, la actual). Carga y
// falla por separado
export function CategoryCampaign({ categoryId, season, showPending = false }) {
  const [state, setState] = useState({ data: null, error: '' })

  useEffect(() => {
    let active = true
    getCampaign(categoryId, season)
      .then(({ data }) => active && setState({ data, error: '' }))
      .catch((err) => active && setState({ data: null, error: getErrorMessage(err) }))
    return () => { active = false }
  }, [categoryId, season])

  if (state.error) return <Alert severity="error">No pudimos cargar la campaña: {state.error}</Alert>
  if (!state.data) return <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3 }} />

  return <CampaignCard category={state.data.category} league={state.data.league} campaign={state.data} showPending={showPending} />
}

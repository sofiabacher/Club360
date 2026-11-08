import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import FamilyRestroomRounded from '@mui/icons-material/FamilyRestroomRounded'

import { getLinkedCitations } from '../../api/citations.api.js'
import { getLinkedFees } from '../../api/fees.api.js'
import { getLinkedGames } from '../../api/games.api.js'
import EmptyState from '../common/EmptyState.jsx'
import StatusChip from '../common/StatusChip.jsx'
import { HomeChip } from '../games/GameChips.jsx'
import QuickAccess from './QuickAccess.jsx'
import {
  citationChipOf, citationForGame, feeStatusOf, hasFeeInReview, hasOverdueFee, initialBlock, nextGameOf, oldestPayableFee
} from './homeData.js'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { formatGameDate, formatMoney, formatWeekdayDay } from '../../utils/format.js'

function useBlock(request) {
  const [block, setBlock] = useState(initialBlock)

  const load = useCallback(() => {
    request()
      .then(({ data }) => setBlock({ data, error: '', loading: false }))
      .catch((err) => setBlock({ data: null, error: getErrorMessage(err), loading: false }))
  }, [request])

  useEffect(() => { load() }, [load])
  return block
}

const upcomingLinkedCitations = () => getLinkedCitations('upcoming')

// Frase de lo más urgente entre todas las jugadoras: una cuota vencida, una citación pendiente o "Todo al día"
function urgentPhrase(accounts, citationPlayers) {
  const overdue = accounts.find(hasOverdueFee)
  if (overdue) return `La cuota de ${overdue.member.name} está vencida.`

  for (const player of citationPlayers) {
    const pending = player.items.find((citation) => citation.canRespond)
    if (pending) return `${player.member.name} tiene una citación pendiente para el ${formatWeekdayDay(pending.game.dateTime)}.`
  }
  return 'Todo al día.'
}

function SectionSkeleton({ height = 70 }) {
  return <Skeleton variant="rounded" height={height} />
}

// Tarjeta de una jugadora vinculada: el carnet chico, el próximo partido con el estado de su citación (solo lectura) y
// la cuota. payFirst: la jugadora con la cuota impaga más vieja lleva el botón naranja "Pagar"
function PlayerCard({ member, account, gamesOf, citationsOf, games, citations, fees, payFirst }) {
  const categories = gamesOf?.categories ?? []
  const next = nextGameOf(categories)
  const citation = next ? citationForGame(citationsOf?.items ?? [], next.id) : null
  const chip = citation && citationChipOf(citation)
  const feeStatus = account && feeStatusOf(account)
  const debt = account && account.totalDue > 0

  return (
    <Card sx={{ height: '100%' }}>
      <Box sx={{ bgcolor: 'burgundy.main', color: 'burgundy.contrastText', px: 2.5, py: 1.25 }}>
        <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{member.name}</Typography>
        <Typography variant="numeric" sx={{ fontSize: '1.1rem', opacity: 0.9 }}>
          {account ? `SOCIO Nº ${account.member.numMember}` : ''}
          {categories.length > 0 ? `${account ? ' · ' : ''}${categories.map((item) => item.category.name).join(' / ')}` : ''}
        </Typography>
      </Box>

      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.5 }}>Próximo partido</Typography>
        {games.loading && <SectionSkeleton />}
        {!games.loading && games.error && <Alert severity="error">{games.error}</Alert>}
        {!games.loading && !games.error && (next ? (
          <Box>
            <Typography variant="numeric" component="p" sx={{ fontSize: '1.9rem', color: 'navy.main', lineHeight: 1.1 }}>{formatGameDate(next.dateTime)}</Typography>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontWeight: 600, color: 'navy.main', overflowWrap: 'anywhere' }}>vs. {next.rival}</Typography>
              <HomeChip isHome={next.isHome} />
            </Stack>
            <Box sx={{ mt: 1 }}>
              {citations.loading && <Skeleton variant="text" width={160} />}
              {!citations.loading && citations.error && <Typography variant="body2" sx={{ color: 'error.main' }}>{citations.error}</Typography>}
              {!citations.loading && !citations.error && (next.conflict?.notPlaying
                ? <Chip label="No juega este partido" size="small" sx={{ fontWeight: 600 }} />
                : chip
                  ? (
                    <>
                      <StatusChip status={chip.status} label={chip.label} />
                      {citation.canRespond && (
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>La responde {member.name}.</Typography>
                      )}
                    </>
                  )
                  : <Typography variant="body2" sx={{ color: 'text.secondary' }}>Todavía sin citación</Typography>)}
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>No hay partidos programados.</Typography>
        ))}

        <Divider sx={{ my: 2 }} />

        <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.5 }}>Cuota</Typography>
        {fees.loading && <SectionSkeleton height={40} />}
        {!fees.loading && fees.error && <Alert severity="error">{fees.error}</Alert>}
        {!fees.loading && !fees.error && account && (
          <Box>
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <StatusChip status={feeStatus.status} label={feeStatus.label} />
              {hasFeeInReview(account) && <StatusChip status="pending" label="Transferencia en revisión" />}
              {debt && <Typography variant="numeric" sx={{ fontSize: '1.4rem', color: 'navy.main' }}>{formatMoney(account.totalDue)}</Typography>}
            </Stack>
            {payFirst && (
              <Button component={RouterLink} to={`/family/fees?memberId=${member.id}`} variant="contained" color="primary" sx={{ mt: 1.5 }}>
                Pagar
              </Button>
            )}
            {!payFirst && debt && (
              <Link component={RouterLink} to={`/family/fees?memberId=${member.id}`} color="secondary" sx={{ display: 'inline-block', mt: 1.5, fontWeight: 600 }}>
                Ver cuotas
              </Link>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

// Panel de inicio de la Familia: la frase de lo más urgente y una tarjeta por cada jugadora vinculada, con su próximo
// partido, su citación (la responde la jugadora) y su cuota. El único botón naranja, "Pagar", va en la jugadora con la
// cuota impaga más vieja. Cada bloque carga por separado
export default function FamilyHome() {
  const { user } = useAuth()
  const games = useBlock(getLinkedGames)
  const citations = useBlock(upcomingLinkedCitations)
  const fees = useBlock(getLinkedFees)

  const accounts = fees.data?.accounts ?? []
  const gamePlayers = games.data?.players ?? []
  const citationPlayers = citations.data?.players ?? []

  // Las jugadoras vinculadas salen de la primera respuesta que llegó (si una falla, las otras alcanzan)
  const members = accounts.length > 0
    ? accounts.map((account) => ({ id: account.member.id, name: account.member.name }))
    : (gamePlayers.length > 0 ? gamePlayers : citationPlayers).map((player) => ({ id: player.member.id, name: player.member.name }))

  const allLoaded = !games.loading && !citations.loading && !fees.loading
  const noneLoaded = games.loading && citations.loading && fees.loading

  // La jugadora con la cuota impaga más vieja (que se pueda pagar)
  const payFirstId = accounts
    .map((account) => ({ memberId: account.member.id, fee: oldestPayableFee(account) }))
    .filter((item) => item.fee)
    .sort((a, b) => a.fee.period.localeCompare(b.fee.period) || a.memberId - b.memberId)[0]?.memberId

  if (allLoaded && members.length === 0 && !fees.error && !games.error) {
    return (
      <Stack spacing={3}>
        <Typography variant="h4" component="h2" sx={{ color: 'navy.main' }}>Hola, {user.name}</Typography>
        <EmptyState
          icon={FamilyRestroomRounded}
          title="Sin jugadoras vinculadas"
          description="Todavía no tenés jugadoras vinculadas."
          action={<Button component={RouterLink} to="/account" color="secondary" variant="outlined">Ir a Mi cuenta para vincular una</Button>}
        />
        <QuickAccess />
      </Stack>
    )
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h2" sx={{ color: 'navy.main' }}>Hola, {user.name}</Typography>
        {allLoaded
          ? <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>{urgentPhrase(accounts, citationPlayers)}</Typography>
          : <Skeleton variant="text" width={260} />}
      </Box>

      {noneLoaded && (
        <Grid container spacing={3}>
          {[0, 1].map((key) => <Grid key={key} size={{ xs: 12, md: 6 }}><Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} /></Grid>)}
        </Grid>
      )}

      {!noneLoaded && members.length === 0 && (fees.error || games.error) && (
        <Alert severity="error">{fees.error || games.error}</Alert>
      )}

      {members.length > 0 && (
        <Grid container spacing={3}>
          {members.map((member) => (
            <Grid key={member.id} size={{ xs: 12, md: 6 }}>
              <PlayerCard
                member={member}
                account={accounts.find((account) => account.member.id === member.id)}
                gamesOf={gamePlayers.find((player) => player.member.id === member.id)}
                citationsOf={citationPlayers.find((player) => player.member.id === member.id)}
                games={games}
                citations={citations}
                fees={fees}
                payFirst={member.id === payFirstId}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <QuickAccess />
    </Stack>
  )
}

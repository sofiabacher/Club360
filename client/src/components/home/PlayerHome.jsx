import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import PlaceRounded from '@mui/icons-material/PlaceRounded'

import { getMyCitations, respondCitation } from '../../api/citations.api.js'
import { getMyFees } from '../../api/fees.api.js'
import { getMyGames } from '../../api/games.api.js'
import { getMyRoutine } from '../../api/routines.api.js'
import RejectCitationDialog from '../citations/RejectCitationDialog.jsx'
import StatusChip from '../common/StatusChip.jsx'
import SuspensionAlert from '../fees/SuspensionAlert.jsx'
import { HomeChip } from '../games/GameChips.jsx'
import MemberCard from '../members/MemberCard.jsx'
import { DayPills } from '../routines/RoutineWeekView.jsx'
import HomeBlock from './HomeBlock.jsx'
import QuickAccess from './QuickAccess.jsx'
import {
  citationChipOf, citationForGame, feeStatusOf, hasFeeInReview, hasOverdueFee, initialBlock, isSuspended, upcomingGames
} from './homeData.js'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { formatDeadline, formatGameDate, formatMoney, formatShortDateTime, formatTime, formatWeekdayDay } from '../../utils/format.js'
import { getUploadUrl } from '../../utils/media.js'

// Carga un bloque del panel con su propia llamada: { data, error, loading, reload }
function useBlock(request) {
  const [block, setBlock] = useState(initialBlock)

  const reload = useCallback(() => {
    request()
      .then(({ data }) => setBlock({ data, error: '', loading: false }))
      .catch((err) => setBlock({ data: null, error: getErrorMessage(err), loading: false }))
  }, [request])

  useEffect(() => { reload() }, [reload])
  return { ...block, reload }
}

const upcomingCitations = () => getMyCitations('upcoming')
const myRoutine = () => getMyRoutine()

// Frase de lo más urgente: citación pendiente, cuota vencida, próximo partido o "Estás al día"
function urgentPhrase({ citations, fees, games }) {
  const pending = citations.data?.items.find((citation) => citation.canRespond)
  if (pending) return `Tenés una citación pendiente para el ${formatWeekdayDay(pending.game.dateTime)}.`
  if (fees.data && hasOverdueFee(fees.data)) return 'Tenés una cuota vencida.'

  const next = games.data?.categories
    .flatMap(upcomingGames)
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))[0]
  if (next) return `Tu próximo partido es el ${formatWeekdayDay(next.dateTime)} a las ${formatTime(next.dateTime)}.`
  return 'Estás al día. ¡A entrenar!'
}

// Estado de la citación del próximo partido: Pendiente con la fecha límite y los botones; si no, su chip; "No jugás
// este partido" si un conflicto resuelto lo dejó afuera; "Todavía sin citación" si no la citaron
function CitationStatus({ game, citation, primary, busy, onConfirm, onReject }) {
  if (game.conflict?.notPlaying) {
    return (
      <Box sx={{ mt: 1.5 }}>
        <Chip label="No jugás este partido" size="small" sx={{ fontWeight: 600 }} />
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Por superposición de horario jugás {game.conflict.chosenGame.categoryName} vs. {game.conflict.chosenGame.rival} ({formatShortDateTime(game.conflict.chosenGame.dateTime)}).
        </Typography>
      </Box>
    )
  }

  if (!citation) return <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>Todavía sin citación</Typography>

  const chip = citationChipOf(citation)
  return (
    <Box sx={{ mt: 1.5 }}>
      <StatusChip status={chip.status} label={chip.label} />
      {citation.canRespond && (
        <>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>Respondé antes del {formatDeadline(citation.dateMaxResponse)}.</Typography>
          <Stack direction="row" sx={{ gap: 1.5, mt: 1.5, flexWrap: 'wrap' }}>
            <Button variant="contained" color={primary ? 'primary' : 'secondary'} onClick={() => onConfirm(citation)} loading={busy}>Confirmo</Button>
            <Button variant="outlined" color="secondary" onClick={() => onReject(citation)} disabled={busy}>No puedo ir</Button>
          </Stack>
        </>
      )}
    </Box>
  )
}

// Próximo partido de una categoría ("módulos diferenciados" si juega en dos ligas) y los 2 siguientes
function NextGameCard({ category, citations, primaryCitationId, busyId, onConfirm, onReject }) {
  const games = upcomingGames(category)
  const [next, ...rest] = games
  const citation = next ? citationForGame(citations, next.id) : null

  return (
    <HomeBlock title={`${category.league.name} · ${category.category.name}`}>
      {!next ? (
        <Typography sx={{ color: 'text.secondary' }}>No hay partidos programados.</Typography>
      ) : (
        <>
          <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.18em', color: 'burgundy.main' }}>PRÓXIMO PARTIDO</Typography>
          <Typography variant="numeric" component="p" sx={{ fontSize: { xs: '2.2rem', sm: '2.6rem' }, color: 'navy.main', lineHeight: 1.1 }}>
            {formatGameDate(next.dateTime)}
          </Typography>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
            <Typography sx={{ fontWeight: 600, color: 'navy.main', overflowWrap: 'anywhere' }}>vs. {next.rival}</Typography>
            <HomeChip isHome={next.isHome} />
          </Stack>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, color: 'text.secondary', mt: 0.5 }}>
            <PlaceRounded sx={{ fontSize: 16 }} />
            <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>{next.address}</Typography>
          </Stack>

          <CitationStatus
            game={next}
            citation={citation}
            primary={citation?.id === primaryCitationId}
            busy={busyId === citation?.id}
            onConfirm={onConfirm}
            onReject={onReject}
          />

          {rest.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1}>
                {rest.slice(0, 2).map((game) => (
                  <Stack key={game.id} direction="row" sx={{ gap: 1.5, alignItems: 'baseline' }}>
                    <Typography variant="numeric" sx={{ fontSize: '1.1rem', color: 'navy.main', flexShrink: 0 }}>{formatGameDate(game.dateTime)}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>vs. {game.rival} · {game.isHome ? 'Local' : 'Visitante'}</Typography>
                  </Stack>
                ))}
              </Stack>
            </>
          )}
        </>
      )}
      <Link component={RouterLink} to="/my-games" color="secondary" sx={{ display: 'inline-block', mt: 2, fontWeight: 600 }}>Ver fixture</Link>
    </HomeBlock>
  )
}

// Panel de inicio de la Jugadora (moodboard, "Panel de la Jugadora"): la frase de lo más urgente, el próximo partido
// de cada categoría con su citación, el carnet, la cuota y la rutina de la semana. Cada bloque carga por separado.
// Un solo botón naranja: "Confirmo" de la citación pendiente más próxima
export default function PlayerHome() {
  const { user, club } = useAuth()
  const games = useBlock(getMyGames)
  const citations = useBlock(upcomingCitations)
  const fees = useBlock(getMyFees)
  const routine = useBlock(myRoutine)

  const [busyId, setBusyId] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  const respond = async (citation, response, justification) => {
    setBusyId(citation.id)
    try {
      await respondCitation(citation.id, response, justification)
      setNotice({ open: true, severity: 'success', message: response === 'confirm' ? '¡Listo! Confirmaste la citación.' : 'Listo, quedó registrado que no podés ir.' })
      setRejecting(null)
      citations.reload()
    } catch (err) {
      setNotice({ open: true, severity: 'error', message: getErrorMessage(err) })
    } finally {
      setBusyId(null)
    }
  }

  const headerReady = !games.loading && !citations.loading && !fees.loading
  const citationItems = citations.data?.items ?? []
  const categories = games.data?.categories ?? []
  // La citación pendiente más próxima lleva el único botón naranja (citations/mine las trae primero)
  const primaryCitationId = citationItems.find((citation) => citation.canRespond)?.id

  const firstCategory = categories[0]
  const cardSubtitle = firstCategory
    ? categories.map((item) => `${item.league.sport} · ${item.category.name}`).join(' / ')
    : null

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h2" sx={{ color: 'navy.main' }}>Hola, {user.name}</Typography>
        {headerReady
          ? <Typography sx={{ color: 'text.secondary', mt: 0.5 }}>{urgentPhrase({ citations, fees, games })}</Typography>
          : <Skeleton variant="text" width={280} />}
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={3}>
            {(games.loading || games.error) && <HomeBlock title="Próximo partido" loading={games.loading} error={games.error} height={180} />}
            {games.data && categories.length === 0 && (
              <HomeBlock title="Próximo partido">
                <Typography sx={{ color: 'text.secondary' }}>No hay partidos programados.</Typography>
              </HomeBlock>
            )}
            {categories.map((category) => (
              <NextGameCard
                key={category.category.id}
                category={category}
                citations={citationItems}
                primaryCitationId={primaryCitationId}
                busyId={busyId}
                onConfirm={(citation) => respond(citation, 'confirm')}
                onReject={setRejecting}
              />
            ))}
            {citations.error && <Alert severity="error">No pudimos cargar tus citaciones: {citations.error}</Alert>}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={3}>
            {fees.loading
              ? <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3 }} />
              : fees.data && (
                <MemberCard
                  clubName={club?.name}
                  accentColor={club?.accentColor}
                  fullName={`${user.name} ${user.lastName}`}
                  numMember={fees.data.member.numMember}
                  subtitle={cardSubtitle}
                  photoUrl={getUploadUrl(user.photo)}
                  size="small"
                />
              )}

            <HomeBlock title="Cuota" loading={fees.loading} error={fees.error} height={60}>
              {fees.data && (() => {
                const status = feeStatusOf(fees.data)
                return (
                  <>
                    <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      <StatusChip status={status.status} label={status.label} />
                      {hasFeeInReview(fees.data) && <StatusChip status="pending" label="Transferencia en revisión" />}
                    </Stack>
                    {fees.data.totalDue > 0 && (
                      <Typography variant="numeric" component="p" sx={{ fontSize: '1.8rem', color: 'navy.main', mt: 1 }}>
                        {formatMoney(fees.data.totalDue)}
                      </Typography>
                    )}
                    {isSuspended(fees.data) && <SuspensionAlert delayFee={fees.data.delayFee} sx={{ mt: 1.5 }} />}
                    <Link component={RouterLink} to="/my-fees" color="secondary" sx={{ display: 'inline-block', mt: 1.5, fontWeight: 600 }}>Ver mis cuotas</Link>
                  </>
                )
              })()}
            </HomeBlock>

            <HomeBlock title="Rutina de la semana" loading={routine.loading} error={routine.error} height={60}>
              {routine.data && (
                <>
                  {routine.data.categories.length === 0 && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Todavía no estás en ninguna categoría.</Typography>
                  )}
                  <Stack spacing={2}>
                    {routine.data.categories.map((item) => {
                      const today = item.days.find((day) => day.date === routine.data.today)
                      return (
                        <Box key={item.category.id}>
                          {routine.data.categories.length > 1 && (
                            <Typography variant="body2" sx={{ fontWeight: 600, color: 'navy.main', mb: 1 }}>{item.league.name} · {item.category.name}</Typography>
                          )}
                          <DayPills days={item.days} today={routine.data.today} size="small" />
                          <Typography variant="body2" sx={{ color: today?.routine ? 'navy.main' : 'text.secondary', mt: 0.5, fontWeight: today?.routine ? 600 : 400 }}>
                            {today?.routine ? `Hoy: ${today.routine.title}` : 'Hoy no hay rutina cargada.'}
                          </Typography>
                        </Box>
                      )
                    })}
                  </Stack>
                  <Link component={RouterLink} to="/my-routine" color="secondary" sx={{ display: 'inline-block', mt: 1.5, fontWeight: 600 }}>Ver rutina</Link>
                </>
              )}
            </HomeBlock>
          </Stack>
        </Grid>
      </Grid>

      <QuickAccess />

      {rejecting && (
        <RejectCitationDialog
          citation={rejecting}
          busy={busyId === rejecting.id}
          onClose={() => setRejecting(null)}
          onSend={(justification) => respond(rejecting, 'reject', justification)}
        />
      )}

      <Snackbar open={notice.open} autoHideDuration={5000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={closeNotice}>{notice.message}</Alert>
      </Snackbar>
    </Stack>
  )
}

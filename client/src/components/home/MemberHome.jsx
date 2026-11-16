import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded'
import PhoneRounded from '@mui/icons-material/PhoneRounded'
import PlaceRounded from '@mui/icons-material/PlaceRounded'

import ActionLink from '../common/ActionLink.jsx'
import { getClubInfo } from '../../api/clubs.api.js'
import { getMyFees } from '../../api/fees.api.js'
import { getMySports } from '../../api/inscriptions.api.js'
import StatusChip from '../common/StatusChip.jsx'
import SuspensionAlert from '../fees/SuspensionAlert.jsx'
import MemberCard from '../members/MemberCard.jsx'
import HomeBlock from './HomeBlock.jsx'
import HomeHeader from './HomeHeader.jsx'
import QuickAccess from './QuickAccess.jsx'
import { feeStatusOf, hasFeeInReview, hasOverdueFee, isSuspended, oldestPayableFee } from './homeData.js'
import useBlock from './useBlock.js'
import useAuth from '../../hooks/useAuth.js'
import usePermission from '../../hooks/usePermission.js'
import { INSCRIPTION_STATES } from '../../utils/constants.js'
import { formatMoney, formatPeriod, formatWeekdayDay } from '../../utils/format.js'
import { getUploadUrl } from '../../utils/media.js'

// Estado de una inscripción en el inicio, como en Mis deportes
const INSCRIPTION_CHIPS = {
  [INSCRIPTION_STATES.PENDING]: { status: 'pending', label: 'Pendiente' },
  [INSCRIPTION_STATES.APPROVED]: { status: 'ok', label: 'Aprobada' },
  [INSCRIPTION_STATES.REJECTED]: { status: 'overdue', label: 'Rechazada' }
}

// Frase de lo más urgente: cuota vencida, cuota por pagar, inscripción pendiente o "Estás al día"
function urgentPhrase({ fees, sports }) {
  if (fees.data && isSuspended(fees.data)) return 'Perdiste la condición de socio por cuotas impagas. Se recupera cuando las regularices.'
  if (fees.data && hasOverdueFee(fees.data)) return 'Tenés una cuota vencida.'
  const payable = fees.data && oldestPayableFee(fees.data)
  if (payable) return `Tu cuota de ${formatPeriod(payable.period).toLowerCase()} vence el ${formatWeekdayDay(payable.expirationDate)}.`
  const pending = (sports.data?.items ?? []).find((item) => item.inscription?.inscriptionState === INSCRIPTION_STATES.PENDING)
  if (pending) return `Tu inscripción a ${pending.name} está esperando la aprobación del club.`
  return 'Estás al día. ¡Gracias por ser parte del club!'
}

// Panel de inicio del Socio (fees.viewOwn, sin el panel de la Jugadora): el carnet, la cuota, sus deportes y los datos
// útiles del club. El único botón Naranja, "Pagar cuota", aparece si hay una cuota para pagar y puede pagarla
export default function MemberHome() {
  const { user, club } = useAuth()
  const { hasPermission } = usePermission()
  const canSports = hasPermission('inscriptions.request')
  const canClub = hasPermission('clubs.viewInfo')

  const fees = useBlock(getMyFees)
  const sports = useBlock(getMySports, canSports)
  const clubInfo = useBlock(getClubInfo, canClub)

  const payable = fees.data && fees.data.canPay ? oldestPayableFee(fees.data) : null
  const approvedSports = (sports.data?.items ?? []).filter((item) => item.inscription?.inscriptionState === INSCRIPTION_STATES.APPROVED)
  const action = payable && (
    <Button component={RouterLink} to="/my-fees" variant="contained" color="primary">Pagar cuota</Button>
  )

  return (
    <Stack spacing={3}>
      <HomeHeader ready={!fees.loading && !sports.loading} phrase={urgentPhrase({ fees, sports })} action={action} />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={3}>
            {fees.loading
              ? <Skeleton variant="rounded" height={160} sx={{ borderRadius: 1 }} />
              : fees.data && (
                <MemberCard
                  clubName={club?.name}
                  accentColor={club?.accentColor}
                  fullName={`${user.name} ${user.lastName}`}
                  numMember={fees.data.member.numMember}
                  subtitle={approvedSports.length > 0 ? approvedSports.map((item) => item.name).join(' · ') : 'Socio'}
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
                    <ActionLink to="/my-fees" sx={{ mt: 1.5 }}>Ver mis cuotas</ActionLink>
                  </>
                )
              })()}
            </HomeBlock>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Stack spacing={3}>
            {canSports && (
              <HomeBlock title="Mis deportes" loading={sports.loading} error={sports.error} height={80}>
                {sports.data && sports.data.items.length === 0 && (
                  <Typography sx={{ color: 'text.secondary' }}>El club todavía no tiene deportes para inscribirse.</Typography>
                )}
                <Stack divider={<Divider flexItem />}>
                  {(sports.data?.items ?? []).map((item) => {
                    const chip = item.inscription && INSCRIPTION_CHIPS[item.inscription.inscriptionState]
                    return (
                      <Stack key={item.clubSportId} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 1.25 }}>
                        <Box>
                          <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>{item.name}</Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Cuota deportiva {formatMoney(item.priceFee)}</Typography>
                        </Box>
                        {chip
                          ? <StatusChip status={chip.status} label={chip.label} />
                          : <Typography variant="body2" sx={{ color: 'text.secondary' }}>Sin inscripción</Typography>}
                      </Stack>
                    )
                  })}
                </Stack>
                <ActionLink to="/my-sports" sx={{ mt: 1.5 }}>Ver deportes e inscribirme</ActionLink>
              </HomeBlock>
            )}

            {canClub && (
              <HomeBlock title="El club" loading={clubInfo.loading} error={clubInfo.error} height={80}>
                {clubInfo.data && (
                  <Stack spacing={1.25}>
                    {clubInfo.data.address && (
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                        <PlaceRounded fontSize="small" sx={{ color: 'text.secondary', mt: 0.25 }} />
                        <Typography variant="body2">{clubInfo.data.address}</Typography>
                      </Stack>
                    )}
                    {clubInfo.data.phone && (
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <PhoneRounded fontSize="small" sx={{ color: 'text.secondary' }} />
                        <Typography variant="body2">{clubInfo.data.phone}</Typography>
                      </Stack>
                    )}
                    {(clubInfo.data.extraInfo?.secretaryHours ?? []).length > 0 && (
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                        <AccessTimeRounded fontSize="small" sx={{ color: 'text.secondary', mt: 0.25 }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>Secretaría</Typography>
                          {clubInfo.data.extraInfo.secretaryHours.map((line) => (
                            <Typography key={line} variant="body2" sx={{ color: 'text.secondary' }}>{line}</Typography>
                          ))}
                        </Box>
                      </Stack>
                    )}
                    <ActionLink to="/club">Ver toda la información del club</ActionLink>
                  </Stack>
                )}
              </HomeBlock>
            )}
          </Stack>
        </Grid>
      </Grid>

      <QuickAccess />
    </Stack>
  )
}

import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import GroupsRounded from '@mui/icons-material/GroupsRounded'
import PersonOffRounded from '@mui/icons-material/PersonOffRounded'
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded'
import RequestQuoteRounded from '@mui/icons-material/RequestQuoteRounded'

import ActionLink from '../common/ActionLink.jsx'
import { getFees } from '../../api/fees.api.js'
import { getIntegrityStatus } from '../../api/integrity.api.js'
import { getLogs } from '../../api/logs.api.js'
import { getMembers } from '../../api/members.api.js'
import StatusChip from '../common/StatusChip.jsx'
import HomeBlock from './HomeBlock.jsx'
import HomeHeader from './HomeHeader.jsx'
import QuickAccess from './QuickAccess.jsx'
import StatCard from './StatCard.jsx'
import useBlock from './useBlock.js'
import usePermission from '../../hooks/usePermission.js'
import { CRITICITY_CHIPS, CRITICITY_LABELS, MEMBER_STATES } from '../../utils/constants.js'
import { formatDateTimeLong, formatMoney, formatPeriod, formatRelative } from '../../utils/format.js'

const RECENT_LOGS = 6

// Cada bloque con su llamada a un endpoint que ya existe
const allMembers = () => getMembers({ page: 1 })
const suspendedMembers = () => getMembers({ state: MEMBER_STATES.SUSPENDED, page: 1 })
const monthFees = () => getFees({ page: 1 })   // Trae el resumen del mes y las transferencias por revisar
const recentLogs = () => getLogs({ page: 1 })

const plural = (count, one, many) => (count === 1 ? one : many)

// Frase de lo más urgente: integridad, transferencias por revisar, cuotas vencidas, suspendidos o "Todo al día"
function urgentPhrase({ integrity, fees, suspended }) {
  if (integrity.data?.status === 'ERROR') return 'Hay errores de integridad en los datos del club: los demás usuarios no pueden entrar.'
  const review = fees.data?.pendingReview ?? 0
  if (review > 0) return `Tenés ${review} ${plural(review, 'transferencia por revisar', 'transferencias por revisar')}.`
  const overdue = fees.data?.summary.overdue.count ?? 0
  if (overdue > 0) return `Hay ${overdue} ${plural(overdue, 'cuota vencida', 'cuotas vencidas')} este mes.`
  const total = suspended.data?.total ?? 0
  if (total > 0) return `Hay ${total} ${plural(total, 'socio suspendido', 'socios suspendidos')} por mora.`
  return 'Todo al día en el club.'
}

// Una fila del resumen de cuotas: chip de estado, cantidad e importe
function FeeRow({ status, label, count, amount }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <StatusChip status={status} label={label} />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{count} {plural(count, 'cuota', 'cuotas')}</Typography>
      </Stack>
      <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>{formatMoney(amount)}</Typography>
    </Stack>
  )
}

// Panel de inicio del Admin del Club (members.manage + fees.manage): lo que hay que atender (transferencias, cuotas
// vencidas, suspendidos), el resumen de las cuotas del mes, el estado de la integridad y los últimos movimientos de la
// bitácora. La integridad y la bitácora aparecen solo con su permiso. Un solo botón Naranja, según lo más urgente
export default function AdminHome() {
  const { hasPermission } = usePermission()
  const canIntegrity = hasPermission('integrity.manage')
  const canLogs = hasPermission('logs.view')

  const members = useBlock(allMembers)
  const suspended = useBlock(suspendedMembers)
  const fees = useBlock(monthFees)
  const integrity = useBlock(getIntegrityStatus, canIntegrity)
  const logs = useBlock(recentLogs, canLogs)

  const headerReady = !fees.loading && !suspended.loading && !integrity.loading
  const review = fees.data?.pendingReview ?? 0
  const summary = fees.data?.summary
  const monthTotal = summary ? summary.paid.amount + summary.pending.amount + summary.overdue.amount : 0
  const collected = monthTotal > 0 ? Math.round((summary.paid.amount / monthTotal) * 100) : 0

  let action = null
  if (integrity.data?.status === 'ERROR') {
    action = <Button component={RouterLink} to="/integrity" variant="contained" color="primary">Revisar integridad</Button>
  } else if (review > 0) {
    action = <Button component={RouterLink} to="/fees/payments" variant="contained" color="primary">Revisar transferencias</Button>
  }

  return (
    <Stack spacing={3}>
      <HomeHeader ready={headerReady} phrase={urgentPhrase({ integrity, fees, suspended })} action={action} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Socios" value={members.data?.total ?? 0} to="/members" block={members} icon={GroupsRounded} highlight={false} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Transferencias por revisar" value={review} to="/fees/payments" block={fees} icon={ReceiptLongRounded} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Cuotas vencidas del mes" value={summary?.overdue.count ?? 0} to="/fees" block={fees} icon={RequestQuoteRounded} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Socios suspendidos" value={suspended.data?.total ?? 0} to="/members" block={suspended} icon={PersonOffRounded} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={3}>
            <HomeBlock title={fees.data ? `Cuotas de ${formatPeriod(fees.data.period)}` : 'Cuotas del mes'} loading={fees.loading} error={fees.error} height={120}>
              {summary && (
                <>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Cobrado</Typography>
                    <Typography variant="numeric" sx={{ fontSize: '1.6rem', color: 'navy.main' }}>{collected} %</Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={collected} color="secondary" sx={{ height: 8, borderRadius: 4, mb: 1.5 }} />
                  <Stack divider={<Divider flexItem />}>
                    <FeeRow status="ok" label="Pagadas" count={summary.paid.count} amount={summary.paid.amount} />
                    <FeeRow status="pending" label="Pendientes" count={summary.pending.count} amount={summary.pending.amount} />
                    <FeeRow status="overdue" label="Vencidas" count={summary.overdue.count} amount={summary.overdue.amount} />
                  </Stack>
                  <ActionLink to="/fees" sx={{ mt: 1.5 }}>Ver cuotas</ActionLink>
                </>
              )}
            </HomeBlock>

            {canIntegrity && (
              <HomeBlock title="Integridad de los datos" loading={integrity.loading} error={integrity.error} height={40}>
                {integrity.data && (
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Box>
                      <StatusChip status={integrity.data.status === 'OK' ? 'ok' : 'overdue'} label={integrity.data.status === 'OK' ? 'Todo correcto' : 'Con errores'} />
                      {integrity.data.checkedAt && (
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                          Última verificación: {formatDateTimeLong(integrity.data.checkedAt)}
                        </Typography>
                      )}
                    </Box>
                    <ActionLink to="/integrity">Ver detalle</ActionLink>
                  </Stack>
                )}
              </HomeBlock>
            )}
          </Stack>
        </Grid>

        {canLogs && (
          <Grid size={{ xs: 12, md: 6 }}>
            <HomeBlock title="Últimos movimientos" loading={logs.loading} error={logs.error} height={220}>
              {logs.data && logs.data.items.length === 0 && <Typography sx={{ color: 'text.secondary' }}>Todavía no hay movimientos.</Typography>}
              <Stack divider={<Divider flexItem />}>
                {(logs.data?.items ?? []).slice(0, RECENT_LOGS).map((log) => (
                  <Stack key={log.id} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1.5, py: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'navy.main' }} noWrap>{log.action}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {log.user ? `${log.user.name} ${log.user.lastName}` : 'Sistema'} · {formatRelative(log.createdAt)}
                      </Typography>
                    </Box>
                    <StatusChip status={CRITICITY_CHIPS[log.criticity]} label={CRITICITY_LABELS[log.criticity]} />
                  </Stack>
                ))}
              </Stack>
              <ActionLink to="/logs" sx={{ mt: 1.5 }}>Ver bitácora</ActionLink>
            </HomeBlock>
          </Grid>
        )}
      </Grid>

      <QuickAccess />
    </Stack>
  )
}

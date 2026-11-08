import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ReceiptLongRounded from '@mui/icons-material/ReceiptLongRounded'

import EmptyState from '../common/EmptyState.jsx'
import StatusChip from '../common/StatusChip.jsx'
import FeeStateChip from './FeeStateChip.jsx'
import { FEE_STATES, MEMBER_STATES, TRANSACTION_STATES } from '../../utils/constants.js'
import { formatDate, formatDayMonth, formatMoney, formatPeriod } from '../../utils/format.js'

const PAYMENT_CHIPS = {
  [TRANSACTION_STATES.APPROVED]: { status: 'ok', label: 'Aprobado' },
  [TRANSACTION_STATES.PENDING]: { status: 'pending', label: 'Pendiente' },
  [TRANSACTION_STATES.REJECTED]: { status: 'overdue', label: 'Rechazado' }
}

// Situación general: al día, con cuotas pendientes o con cuotas vencidas
function accountStatus(fees) {
  if (fees.some((fee) => fee.feeState === FEE_STATES.OVERDUE || fee.overdueDays > 0)) return { status: 'overdue', label: 'Tenés cuotas vencidas' }
  if (fees.some((fee) => fee.feeState === FEE_STATES.PENDING)) return { status: 'pending', label: 'Tenés cuotas pendientes' }
  return { status: 'ok', label: 'Al día' }
}

function FeeRow({ fee, action }) {
  const unpaid = fee.feeState !== FEE_STATES.PAID

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1.5, alignItems: { sm: 'center' }, py: 2 }}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>{formatPeriod(fee.period)}</Typography>
          <FeeStateChip feeState={fee.feeState} />
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Cuota social {formatMoney(fee.socialAmount)} · Cuota deportiva {formatMoney(fee.sportAmount)}
        </Typography>
        {unpaid && (
          <Typography variant="body2" sx={{ color: fee.overdueDays > 0 ? 'error.main' : 'text.secondary', fontWeight: fee.overdueDays > 0 ? 600 : 400 }}>
            {fee.overdueDays > 0 ? `${fee.overdueDays} ${fee.overdueDays === 1 ? 'día' : 'días'} de atraso` : `Vence el ${formatDayMonth(fee.expirationDate)}`}
          </Typography>
        )}
      </Box>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
        <Typography variant="numeric" sx={{ fontSize: '1.5rem', color: 'navy.main' }}>{formatMoney(fee.total)}</Typography>
        {unpaid && action}
      </Stack>
    </Stack>
  )
}

// Estado de cuenta de un socio (Mis cuotas, la Familia y el Admin): resumen con el total adeudado, aviso de suspensión,
// cuotas (la más reciente primero) e historial de pagos.
//   - onPay(fee): muestra "Pagar" en las impagas si account.canPay; si no puede porque es menor, una nota;
//   - renderAction(fee): acción propia en cada impaga (por ejemplo, el pago en secretaría del Admin);
//   - payButtonColor: 'primary' (naranja, la acción principal de la pantalla) o 'secondary'
export default function FeeAccount({ account, onPay, renderAction, payButtonColor = 'primary', minorNote = 'El pago lo hace tu adulto responsable.' }) {
  const { fees, payments, member } = account
  const status = accountStatus(fees)
  const suspended = member.memberStateId === MEMBER_STATES.SUSPENDED

  // Un solo botón naranja por vista: el de la impaga más vieja (la que conviene pagar primero); el resto, en azul
  const oldestUnpaid = [...fees].reverse().find((fee) => fee.feeState !== FEE_STATES.PAID)

  const actionFor = (fee) => {
    if (renderAction) return renderAction(fee)
    if (onPay && account.canPay) {
      const main = fee.id === oldestUnpaid?.id
      return (
        <Button variant={main ? 'contained' : 'outlined'} color={main ? payButtonColor : 'secondary'} onClick={() => onPay(fee)} sx={{ flexShrink: 0 }}>
          Pagar
        </Button>
      )
    }
    return null
  }

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Total adeudado</Typography>
          <Typography variant="numeric" component="p" sx={{ fontSize: { xs: '2.6rem', sm: '3rem' }, color: 'navy.main', lineHeight: 1.1 }}>{formatMoney(account.totalDue)}</Typography>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', mt: 1, alignItems: 'center' }}>
            <StatusChip status={status.status} label={status.label} />
            {account.overdueDays > 0 && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                La más vieja tiene {account.overdueDays} días de atraso (plazo del club: {account.delayFee}).
              </Typography>
            )}
          </Stack>
          {!account.canPay && !member.isAdult && onPay && fees.some((fee) => fee.feeState !== FEE_STATES.PAID) && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>{minorNote}</Typography>
          )}
        </CardContent>
      </Card>

      {suspended && (
        <Alert severity="error">
          Por tener cuotas impagas hace más de {account.delayFee} días, se perdió la condición de socio. Mientras tanto no se
          puede ser citada ni inscribirse a deportes. Se recupera sola al regularizar las cuotas.
        </Alert>
      )}

      {fees.length === 0 ? (
        <EmptyState icon={ReceiptLongRounded} title="Sin cuotas" description="Todavía no se generó ninguna cuota." />
      ) : (
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 1, sm: 2 } } }}>
            <Typography variant="h6" component="h3" sx={{ color: 'navy.main' }}>Cuotas</Typography>
            <Stack divider={<Divider flexItem />}>
              {fees.map((fee) => <FeeRow key={fee.id} fee={fee} action={actionFor(fee)} />)}
            </Stack>
          </CardContent>
        </Card>
      )}

      {payments.length > 0 && (
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" component="h3" sx={{ color: 'navy.main', mb: 1 }}>Pagos</Typography>
            <Stack divider={<Divider flexItem />}>
              {payments.map((payment) => {
                const chip = PAYMENT_CHIPS[payment.transactionState]
                return (
                  <Stack key={payment.id} direction="row" sx={{ alignItems: 'center', gap: 1.5, py: 1.25, flexWrap: 'wrap' }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'navy.main' }}>
                        {formatPeriod(payment.period)} · {formatMoney(payment.amount)}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
                        {formatDate(payment.createdAt)} · {payment.confirmationCode}
                      </Typography>
                    </Box>
                    <StatusChip status={chip.status} label={chip.label} />
                  </Stack>
                )
              })}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  )
}

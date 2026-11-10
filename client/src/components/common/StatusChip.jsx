import Chip from '@mui/material/Chip'

// Chip de estado de todo el sistema. Los colores salen de theme.status.
// status: 'ok' (verde: al día, confirmada, aprobada), 'pending' (ámbar), 'overdue' (rojo: vencida, rechazada, cancelada)
// 'urgent' (naranja: requiere acción ya), 'critical' (Bordó relleno: crítico) o 'neutral' (gris).
export default function StatusChip({ status = 'pending', label, size = 'small', sx, ...props }) {
  return (
    <Chip
      label={label}
      size={size}
      sx={[
        (theme) => ({
          bgcolor: theme.status[status].bg,
          color: theme.status[status].fg,
          fontWeight: 600
        }),
        ...(Array.isArray(sx) ? sx : [sx])
      ]}
      {...props}
    />
  )
}

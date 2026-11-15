import { useTheme } from '@mui/material/styles'
import { BarChart } from '@mui/x-charts/BarChart'

import { formatDayMonth } from '../../utils/format.js'

// Barras apiladas por semana: completadas, parciales, no completadas y sin registrar, con los colores de estado del
// tema. weeks: los de getProgress ([{ weekStart, completed, partial, notCompleted, unlogged }]). Lo usan "Mi progreso"
// y la vista de la preparadora
export default function ComplianceChart({ weeks, height = 260 }) {
  const theme = useTheme()
  const series = [
    { key: 'completed', label: 'Completadas', color: theme.status.ok.fg },
    { key: 'partial', label: 'Parciales', color: theme.status.pending.fg },
    { key: 'notCompleted', label: 'No completadas', color: theme.status.overdue.fg },
    { key: 'unlogged', label: 'Sin registrar', color: theme.status.neutral.fg }
  ]

  return (
    <BarChart
      height={height}
      xAxis={[{ scaleType: 'band', data: weeks.map((week) => formatDayMonth(week.weekStart)), label: 'Semana del' }]}
      yAxis={[{ tickMinStep: 1, label: 'Rutinas' }]}
      series={series.map(({ key, label, color }) => ({ data: weeks.map((week) => week[key]), label, color, stack: 'total' }))}
      margin={{ left: 8, right: 8 }}
    />
  )
}

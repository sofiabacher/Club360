import { useTheme } from '@mui/material/styles'
import { LineChart } from '@mui/x-charts/LineChart'

import { formatDayMonth } from '../../utils/format.js'

// Línea del esfuerzo promedio por semana (de 1 a 5). Las semanas sin esfuerzo registrado quedan sin punto. weeks: los de
// getProgress. Lo usan "Mi progreso" y la vista de la preparadora
export default function EffortChart({ weeks, height = 220 }) {
  const theme = useTheme()

  return (
    <LineChart
      height={height}
      xAxis={[{ scaleType: 'point', data: weeks.map((week) => formatDayMonth(week.weekStart)), label: 'Semana del' }]}
      yAxis={[{ min: 0, max: 5, tickMinStep: 1, label: 'Esfuerzo' }]}
      series={[{ data: weeks.map((week) => week.effort), label: 'Esfuerzo promedio', color: theme.palette.secondary.main, connectNulls: true }]}
      margin={{ left: 8, right: 8 }}
    />
  )
}

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import ComplianceChart from './ComplianceChart.jsx'
import EffortChart from './EffortChart.jsx'
import { effortText, percentText } from '../../utils/tracking.js'

function SummaryCard({ label, value, hint }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Typography variant="overline" component="p" sx={{ color: 'text.secondary' }}>{label}</Typography>
        <Typography variant="numeric" component="p" sx={{ fontSize: { xs: '2.2rem', sm: '2.6rem' }, color: 'navy.main' }}>{value}</Typography>
        {hint && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{hint}</Typography>}
      </CardContent>
    </Card>
  )
}

// Progreso de una jugadora (respuesta de getProgress): las tarjetas de resumen del período (cumplimiento, esfuerzo
// promedio y racha) y los dos gráficos por semana. Lo usan "Mi progreso" y el detalle de la preparadora
export default function ProgressOverview({ progress, weeks }) {
  const { totals } = progress
  const streak = totals.streak

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryCard
            label="Cumplimiento"
            value={percentText(totals.compliance)}
            hint={`Últimas ${weeks} semanas · ${totals.scheduled} ${totals.scheduled === 1 ? 'rutina' : 'rutinas'}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryCard label="Esfuerzo promedio" value={effortText(totals.effort)} hint="Del 1 (muy liviano) al 5 (al máximo)" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <SummaryCard label="Racha" value={streak} hint={streak === 1 ? '1 rutina seguida' : `${streak} rutinas seguidas`} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, color: 'navy.main' }}>Rutinas por semana</Typography>
              <ComplianceChart weeks={progress.weeks} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, color: 'navy.main' }}>Esfuerzo por semana</Typography>
              <EffortChart weeks={progress.weeks} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}

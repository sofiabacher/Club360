import Typography from '@mui/material/Typography'

// Resumen de las citaciones de un partido: "8 citadas · 5 confirmadas · 2 pendientes · 1 rechazada"
const plural = (count, singular, pluralText) => `${count} ${count === 1 ? singular : pluralText}`

export default function CitationSummary({ summary }) {
  if (!summary || summary.cited === 0) {
    return <Typography variant="body2" sx={{ color: 'text.secondary' }}>Todavía no citaste a nadie.</Typography>
  }

  const parts = [
    plural(summary.cited, 'citada', 'citadas'),
    plural(summary.confirmed, 'confirmada', 'confirmadas'),
    plural(summary.pending, 'pendiente', 'pendientes'),
    plural(summary.rejected, 'rechazada', 'rechazadas'),
    ...(summary.cancelled > 0 ? [plural(summary.cancelled, 'cancelada', 'canceladas')] : [])
  ]

  return <Typography variant="body2" sx={{ color: 'text.secondary' }}>{parts.join(' · ')}</Typography>
}

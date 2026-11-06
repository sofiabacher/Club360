import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AssignmentIndRounded from '@mui/icons-material/AssignmentIndRounded'

import PlayerCitationCard from './PlayerCitationCard.jsx'
import EmptyState from '../common/EmptyState.jsx'

function Section({ title, items, cardProps }) {
  if (items.length === 0) return null

  return (
    <Box>
      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, color: 'navy.main', mb: 1 }}>{title}</Typography>
      <Stack spacing={2}>
        {items.map((citation) => <PlayerCitationCard key={citation.id} citation={citation} {...cardProps(citation)} />)}
      </Stack>
    </Box>
  )
}

// Citaciones de una jugadora en tres bloques: las que hay que responder (arriba), las próximas ya respondidas y el
// historial. upcoming e history: las listas de la API. cardProps(citation): props extra de cada tarjeta
export default function CitationSections({ upcoming, history, emptyText, cardProps = () => ({}) }) {
  const toRespond = upcoming.filter((citation) => citation.canRespond)
  const rest = upcoming.filter((citation) => !citation.canRespond)

  if (upcoming.length === 0 && history.length === 0) {
    return <EmptyState icon={AssignmentIndRounded} title="Sin citaciones" description={emptyText} />
  }

  return (
    <Stack spacing={3}>
      <Section title="Para responder" items={toRespond} cardProps={cardProps} />
      <Section title="Próximas" items={rest} cardProps={cardProps} />
      <Section title="Historial" items={history} cardProps={cardProps} />
    </Stack>
  )
}

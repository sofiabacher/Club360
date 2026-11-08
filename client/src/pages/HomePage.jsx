import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import FamilyHome from '../components/home/FamilyHome.jsx'
import PlayerHome from '../components/home/PlayerHome.jsx'
import QuickAccess from '../components/home/QuickAccess.jsx'
import useAuth from '../hooks/useAuth.js'
import usePermission from '../hooks/usePermission.js'

// Inicio. El panel se elige por permisos, nunca por el nombre del rol:
//   - citations.respond y games.viewOwn → panel de la Jugadora;
//   - si no, games.viewLinked y fees.manageLinked → panel de la Familia;
//   - si no, el saludo y los accesos rápidos.
export default function HomePage() {
  const { user, club, activeRole } = useAuth()
  const { hasPermission } = usePermission()

  if (hasPermission('citations.respond') && hasPermission('games.viewOwn')) return <PlayerHome />
  if (hasPermission('games.viewLinked') && hasPermission('fees.manageLinked')) return <FamilyHome />

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h2" sx={{ color: 'navy.main' }}>
          Hola, {user.name}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={{ color: 'text.secondary' }}>Estás en el club {club?.name} como</Typography>
          <Chip size="small" label={activeRole?.name} sx={{ fontWeight: 600 }} />
        </Stack>
      </Box>

      <QuickAccess />
    </Stack>
  )
}

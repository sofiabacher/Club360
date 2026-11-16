import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import AdminHome from '../components/home/AdminHome.jsx'
import CoachHome from '../components/home/CoachHome.jsx'
import FamilyHome from '../components/home/FamilyHome.jsx'
import MemberHome from '../components/home/MemberHome.jsx'
import PlayerHome from '../components/home/PlayerHome.jsx'
import QuickAccess from '../components/home/QuickAccess.jsx'
import RepresentativeHome from '../components/home/RepresentativeHome.jsx'
import TrainerHome from '../components/home/TrainerHome.jsx'
import useAuth from '../hooks/useAuth.js'
import usePermission from '../hooks/usePermission.js'

// Inicio. El panel se elige por permisos, nunca por el nombre del rol (el primero que corresponda):
//   - citations.respond y games.viewOwn → panel de la Jugadora;
//   - games.viewLinked y fees.manageLinked → panel de la Familia;
//   - games.manage e inscriptions.approve → panel del Representante;
//   - members.manage y fees.manage → panel del Admin del Club;
//   - citations.create → panel de la Entrenadora;
//   - routines.manage → panel de la Preparadora física;
//   - fees.viewOwn → panel del Socio;
//   - si no (por ejemplo, un rol nuevo con otros permisos), el saludo y los accesos rápidos.
export default function HomePage() {
  const { user, club, activeRole } = useAuth()
  const { hasPermission } = usePermission()

  if (hasPermission('citations.respond') && hasPermission('games.viewOwn')) return <PlayerHome />
  if (hasPermission('games.viewLinked') && hasPermission('fees.manageLinked')) return <FamilyHome />
  if (hasPermission('games.manage') && hasPermission('inscriptions.approve')) return <RepresentativeHome />
  if (hasPermission('members.manage') && hasPermission('fees.manage')) return <AdminHome />
  if (hasPermission('citations.create')) return <CoachHome />
  if (hasPermission('routines.manage')) return <TrainerHome />
  if (hasPermission('fees.viewOwn')) return <MemberHome />

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

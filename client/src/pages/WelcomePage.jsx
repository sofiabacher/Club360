import { Link as RouterLink } from 'react-router-dom'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AdminPanelSettingsRounded from '@mui/icons-material/AdminPanelSettingsRounded'
import AssignmentIndRounded from '@mui/icons-material/AssignmentIndRounded'
import BadgeRounded from '@mui/icons-material/BadgeRounded'
import EmojiEventsRounded from '@mui/icons-material/EmojiEventsRounded'
import FamilyRestroomRounded from '@mui/icons-material/FamilyRestroomRounded'
import HowToRegRounded from '@mui/icons-material/HowToRegRounded'
import LoginRounded from '@mui/icons-material/LoginRounded'
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded'
import PaymentsRounded from '@mui/icons-material/PaymentsRounded'
import SportsVolleyballRounded from '@mui/icons-material/SportsVolleyballRounded'

import ChatBot from '../components/bot/ChatBot.jsx'
import BrandLogo from '../components/common/BrandLogo.jsx'
import NetIllustration from '../components/common/NetIllustration.jsx'

// Qué hace cada perfil en la plataforma
const PROFILES = [
  { icon: PaymentsRounded, title: 'Socios', text: 'Consultá tu estado de cuenta, pagá la cuota con tarjeta o transferencia y descargá el comprobante.' },
  { icon: SportsVolleyballRounded, title: 'Jugadoras', text: 'Mirá tus partidos, confirmá las citaciones, seguí tu rutina y registrá cómo te fue en cada entrenamiento.' },
  { icon: FamilyRestroomRounded, title: 'Familias', text: 'Acompañá a tus jugadoras menores: partidos, citaciones y el pago de sus cuotas, todo en un lugar.' },
  { icon: AssignmentIndRounded, title: 'Entrenadoras', text: 'Citá a tus jugadoras para cada partido, seguí sus respuestas y resolvé los choques de horario.' },
  { icon: EmojiEventsRounded, title: 'Representantes', text: 'Organizá ligas, categorías y el fixture, cargá los resultados y aprobá las inscripciones.' },
  { icon: AdminPanelSettingsRounded, title: 'Administración', text: 'Socios, staff, cuotas, avisos, roles y permisos, con bitácora, integridad de datos y copias de seguridad.' }
]

// Cómo entra cada uno la primera vez
const FIRST_STEPS = [
  { icon: HowToRegRounded, title: 'Soy socio', text: 'Registrate con el número de socio que te dieron en la secretaría y tu fecha de nacimiento.', to: '/register', action: 'Registrarme' },
  { icon: FamilyRestroomRounded, title: 'Soy familia de una jugadora', text: 'Vinculate con el código que figura en el comprobante del alta de tu jugadora menor.', to: '/family-link', action: 'Vincularme' },
  { icon: MarkEmailReadRounded, title: 'Soy parte del staff', text: 'Activá tu cuenta desde el email que te mandó el club cuando te dio de alta.', to: null, action: null }
]

function SectionTitle({ overline, title }) {
  return (
    <Box sx={{ textAlign: 'center', mb: 4 }}>
      <Typography variant="overline" sx={{ color: 'secondary.main' }}>{overline}</Typography>
      <Typography variant="h4" component="h2" sx={{ color: 'navy.main' }}>{title}</Typography>
    </Box>
  )
}

// Página de inicio al sistema: la ven quienes entran a la plataforma sin sesión. Presenta Club360, lo que hace cada
// perfil y cómo se entra por primera vez, con el asistente público para las dudas. Con sesión, PublicRoute manda al inicio
export default function WelcomePage() {
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Box component="header" sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5 }}>
          <BrandLogo fontSize="1.6rem" />
          <Button component={RouterLink} to="/login" variant="outlined" color="secondary" startIcon={<LoginRounded />}>
            Iniciar sesión
          </Button>
        </Container>
      </Box>

      <Box component="main" sx={{ flexGrow: 1 }}>
        <Container maxWidth="lg" sx={{ pt: { xs: 2, sm: 4 } }}>
          <Box
            sx={{
              bgcolor: 'navy.main',
              color: 'navy.contrastText',
              borderRadius: 1.5,
              px: { xs: 3, sm: 6 },
              py: { xs: 5, sm: 7 },
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 6fr) minmax(0, 5fr)' },
              alignItems: 'center',
              gap: 4
            }}
          >
            <Box>
              <Typography variant="overline" sx={{ color: 'primary.light' }}>
                Plataforma de gestión deportiva
              </Typography>
              <Typography variant="h3" component="h1" sx={{ mt: 0.5 }}>
                Todo tu club, en un solo lugar
              </Typography>
              <Typography sx={{ opacity: 0.8, mt: 2, fontSize: { sm: '1.1rem' }, maxWidth: 520 }}>
                Cuotas, partidos, citaciones, rutinas y avisos para socios, jugadoras, familias y staff. Desde la compu o
                desde el celular.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
                <Button component={RouterLink} to="/login" variant="contained" color="primary" size="large">
                  Iniciar sesión
                </Button>
                <Button
                  component={RouterLink}
                  to="/login?primera=1"
                  variant="outlined"
                  size="large"
                  sx={{ color: 'common.white', borderColor: 'common.white', '&:hover': { borderColor: 'common.white', bgcolor: 'action.hover' } }}
                >
                  Es mi primer ingreso
                </Button>
              </Stack>
            </Box>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <NetIllustration />
            </Box>
          </Box>
        </Container>

        <Container maxWidth="lg" component="section" aria-labelledby="perfiles" sx={{ py: { xs: 6, sm: 8 } }}>
          <SectionTitle overline="Para cada uno" title="Qué podés hacer" />
          <Grid container spacing={2.5}>
            {PROFILES.map(({ icon: Icon, title, text }) => (
              <Grid key={title} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Avatar sx={{ bgcolor: 'tint.main', color: 'navy.main', width: 48, height: 48, mb: 2 }}>
                      <Icon />
                    </Avatar>
                    <Typography variant="h6" component="h3" sx={{ color: 'navy.main' }}>{title}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>{text}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>

        <Box component="section" sx={{ bgcolor: 'background.paper', borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Container maxWidth="lg" sx={{ py: { xs: 6, sm: 8 } }}>
            <SectionTitle overline="Primer ingreso" title="Cómo entro por primera vez" />
            <Grid container spacing={2.5}>
              {FIRST_STEPS.map(({ icon: Icon, title, text, to, action }) => (
                <Grid key={title} size={{ xs: 12, md: 4 }}>
                  <Stack spacing={1.5} sx={{ height: '100%', p: 3, borderRadius: 1, bgcolor: 'background.default' }}>
                    <Icon sx={{ color: 'secondary.main', fontSize: 32 }} />
                    <Typography variant="h6" component="h3" sx={{ color: 'navy.main' }}>{title}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', flexGrow: 1 }}>{text}</Typography>
                    {to && (
                      <Box>
                        <Button component={RouterLink} to={to} color="secondary" sx={{ ml: -1 }}>{action}</Button>
                      </Box>
                    )}
                  </Stack>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      </Box>

      <Box component="footer" sx={{ pt: 4, pb: 12 }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <BadgeRounded sx={{ color: 'text.secondary', fontSize: 18 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Club360 · Proyecto integrador · Sofía Bacher, Thiago Chaile, Ignacio Jericó y Julián Prol
              </Typography>
            </Stack>
            <Link component={RouterLink} to="/login" color="secondary" variant="body2">
              Ir al inicio de sesión
            </Link>
          </Stack>
        </Container>
      </Box>

      <ChatBot publicMode />
    </Box>
  )
}

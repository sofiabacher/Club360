import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded'
import ContactPhoneRounded from '@mui/icons-material/ContactPhoneRounded'
import EmailRounded from '@mui/icons-material/EmailRounded'
import EventRounded from '@mui/icons-material/EventRounded'
import LocationOnRounded from '@mui/icons-material/LocationOnRounded'
import PhoneRounded from '@mui/icons-material/PhoneRounded'
import SportsVolleyballRounded from '@mui/icons-material/SportsVolleyballRounded'
import StadiumRounded from '@mui/icons-material/StadiumRounded'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'

import { getClubInfo } from '../../api/clubs.api.js'
import AccentStripe from '../../components/common/AccentStripe.jsx'
import CourtBackground from '../../components/common/CourtBackground.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { formatMoney, getWhatsAppUrl } from '../../utils/format.js'

// Encabezado de la página: versión baja de CourtBackground con el nombre del club y su franja de acento
function ClubHeader({ name, accentColor }) {
  return (
    <CourtBackground compact sx={{ mb: 3 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', px: { xs: 2.5, sm: 4 }, py: { xs: 3, sm: 4 } }}>
        <AccentStripe color={accentColor} size={6} sx={{ minHeight: 48 }} />
        <Box>
          <Typography variant="overline" sx={{ color: 'navy.contrastText', opacity: 0.7, letterSpacing: '0.2em' }}>El club</Typography>
          <Typography variant="h4" component="h2" sx={{ color: 'navy.contrastText' }}>{name}</Typography>
        </Box>
      </Stack>
    </CourtBackground>
  )
}

function InfoCard({ icon: Icon, title, children }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: 'cream.main', color: 'navy.main', width: 40, height: 40 }}>
            <Icon />
          </Avatar>
          <Typography variant="h6" component="h3" sx={{ color: 'navy.main' }}>{title}</Typography>
        </Stack>
        {children}
      </CardContent>
    </Card>
  )
}

function ContactLine({ icon: Icon, children }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
      <Icon fontSize="small" sx={{ color: 'text.secondary', mt: 0.25 }} />
      <Typography variant="body2" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>{children}</Typography>
    </Stack>
  )
}

const Empty = ({ children }) => <Typography variant="body2" sx={{ color: 'text.secondary' }}>{children}</Typography>

// "El club": contacto, horarios, canchas y deportes. Pantalla de clubs.viewInfo
export default function ClubInfoPage() {
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getClubInfo()
      .then(({ data }) => setInfo(data))
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  if (error) return <Alert severity="error">{error}</Alert>

  if (!info) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress color="secondary" />
      </Box>
    )
  }

  const { extraInfo } = info
  const whatsappUrl = getWhatsAppUrl(extraInfo.whatsapp)

  return (
    <>
      <ClubHeader name={info.name} accentColor={info.accentColor} />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <InfoCard icon={ContactPhoneRounded} title="Contacto">
            <Stack spacing={1.5}>
              <ContactLine icon={LocationOnRounded}>{info.address}</ContactLine>
              {info.phone && <ContactLine icon={PhoneRounded}>{info.phone}</ContactLine>}
              <ContactLine icon={EmailRounded}>
                <Link href={`mailto:${info.email}`} color="secondary">{info.email}</Link>
              </ContactLine>
              {whatsappUrl && (
                <ContactLine icon={WhatsAppIcon}>
                  <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer" color="secondary">{extraInfo.whatsapp}</Link>
                </ContactLine>
              )}
            </Stack>
          </InfoCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <InfoCard icon={AccessTimeRounded} title="Horarios de secretaría">
            {extraInfo.secretaryHours.length > 0 ? (
              <Stack component="ul" spacing={1} sx={{ m: 0, pl: 2.5 }}>
                {extraInfo.secretaryHours.map((line, index) => (
                  <Typography key={index} component="li" variant="body2">{line}</Typography>
                ))}
              </Stack>
            ) : <Empty>Todavía no se cargaron los horarios.</Empty>}
          </InfoCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <InfoCard icon={StadiumRounded} title="Canchas">
            {extraInfo.courts.length > 0 ? (
              <Stack spacing={1.5}>
                {extraInfo.courts.map((court, index) => (
                  <Box key={index}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'navy.main' }}>{court.name}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{court.address}</Typography>
                  </Box>
                ))}
              </Stack>
            ) : <Empty>Todavía no se cargaron las canchas.</Empty>}
          </InfoCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <InfoCard icon={EventRounded} title="Horarios de entrenamiento">
            {extraInfo.trainingSchedule.length > 0 ? (
              <Stack spacing={1.5}>
                {extraInfo.trainingSchedule.map((item, index) => (
                  <Box key={index}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'navy.main' }}>{item.sport}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{item.schedule}</Typography>
                  </Box>
                ))}
              </Stack>
            ) : <Empty>Todavía no se cargaron los horarios de entrenamiento.</Empty>}
          </InfoCard>
        </Grid>

        <Grid size={12}>
          <InfoCard icon={SportsVolleyballRounded} title="Deportes que ofrece el club">
            {info.sports.length > 0 ? (
              <Grid container spacing={2}>
                {info.sports.map((sport) => (
                  <Grid key={sport.clubSportId} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'cream.main' }}>
                      <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>{sport.name}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Cuota deportiva: {formatMoney(sport.priceFee)} por mes
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            ) : <Empty>El club todavía no activó ningún deporte.</Empty>}
          </InfoCard>
        </Grid>
      </Grid>
    </>
  )
}

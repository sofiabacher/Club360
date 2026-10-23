import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddRounded from '@mui/icons-material/AddRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'

import { getClubSettings, updateClubSettings } from '../../api/clubs.api.js'
import AccentStripe from '../../components/common/AccentStripe.jsx'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage, getFieldErrors } from '../../utils/apiErrors.js'

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/

// Lo que devuelve la API, como textos para los campos del formulario
function toForm(settings) {
  return {
    socialFee: String(settings.socialFee ?? ''),
    delayFee: String(settings.delayFee ?? ''),
    conflictMargin: String(settings.conflictMargin ?? ''),
    address: settings.address ?? '',
    phone: settings.phone ?? '',
    email: settings.email ?? '',
    accentColor: settings.accentColor ?? '',
    whatsapp: settings.extraInfo.whatsapp ?? '',
    secretaryHours: settings.extraInfo.secretaryHours,
    courts: settings.extraInfo.courts,
    trainingSchedule: settings.extraInfo.trainingSchedule
  }
}

// El formulario como lo espera la API. Las filas que quedaron completamente vacías no se mandan
function toPayload(form) {
  const filled = (row) => Object.values(row).some((value) => value.trim() !== '')

  return {
    socialFee: form.socialFee,
    delayFee: form.delayFee,
    conflictMargin: form.conflictMargin,
    address: form.address,
    phone: form.phone,
    email: form.email,
    accentColor: form.accentColor,
    extraInfo: {
      whatsapp: form.whatsapp,
      secretaryHours: form.secretaryHours.filter((line) => line.trim() !== ''),
      courts: form.courts.filter(filled),
      trainingSchedule: form.trainingSchedule.filter(filled)
    }
  }
}

function SectionCard({ title, description, children }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Typography variant="h6" component="h3" sx={{ color: 'navy.main' }}>{title}</Typography>
        {description && <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>{description}</Typography>}
        <Box sx={{ mt: description ? 0 : 2 }}>{children}</Box>
      </CardContent>
    </Card>
  )
}

// Lista editable de filas (horarios, canchas, entrenamientos). `fields`: [{ key, label }]; sin key, la fila es un texto
function EditableList({ items, fields, onChange, addLabel, error, emptyRow }) {
  const update = (index, value) => onChange(items.map((item, i) => (i === index ? value : item)))
  const remove = (index) => onChange(items.filter((_, i) => i !== index))

  return (
    <Stack spacing={1.5}>
      {items.map((item, index) => (
        <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexGrow: 1 }}>
            {fields.map(({ key, label }) => (
              <TextField
                key={key ?? 'value'}
                label={label}
                value={key ? item[key] : item}
                onChange={(event) => update(index, key ? { ...item, [key]: event.target.value } : event.target.value)}
                size="small"
                fullWidth
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
            ))}
          </Stack>
          <IconButton onClick={() => remove(index)} aria-label="Quitar" sx={{ mt: 0.25 }}>
            <DeleteOutlineRounded />
          </IconButton>
        </Stack>
      ))}

      {error && <Typography variant="caption" sx={{ color: 'error.main' }}>{error}</Typography>}

      <Box>
        <Button color="secondary" size="small" startIcon={<AddRounded />} onClick={() => onChange([...items, emptyRow])}>
          {addLabel}
        </Button>
      </Box>
    </Stack>
  )
}

// Primer error de validación de una lista (los campos llegan como 'extraInfo.courts[0].name')
const listError = (errors, field) => Object.entries(errors).find(([key]) => key.startsWith(`extraInfo.${field}`))?.[1]

// Configuración del club: cuotas y plazos, contacto, información general y color. Pantalla de clubs.manageSettings
export default function ClubSettingsPage() {
  const { refreshSession } = useAuth()

  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })   // Snackbar
  const showNotice = (severity, message) => setNotice({ open: true, severity, message })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  const show = (data) => {
    setSettings(data)
    setForm(toForm(data))
  }

  useEffect(() => {
    getClubSettings()
      .then(({ data }) => show(data))
      .catch((err) => setLoadError(getErrorMessage(err)))
  }, [])

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const setList = (field) => (value) => setForm((current) => ({ ...current, [field]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrors({})
    setSaving(true)

    try {
      const { data } = await updateClubSettings(toPayload(form))
      show(data)
      showNotice('success', 'Guardamos la configuración del club.')
      await refreshSession()   // El color del club se ve en el menú lateral
    } catch (err) {
      setErrors(getFieldErrors(err))
      showNotice('error', getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loadError) return <Alert severity="error">{loadError}</Alert>

  if (!form) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress color="secondary" />
      </Box>
    )
  }

  const validColor = HEX_COLOR.test(form.accentColor)

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Configuración del club</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Los cambios rigen para todo el club desde que los guardás.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title="Cuotas y plazos">
            <Stack spacing={2}>
              <TextField
                label="Cuota social"
                type="number"
                value={form.socialFee}
                onChange={setField('socialFee')}
                error={Boolean(errors.socialFee)}
                helperText={errors.socialFee ?? 'Lo que paga cada socio por mes, en pesos. La cuota deportiva se fija en cada deporte.'}
                required
                fullWidth
                slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }}
              />
              <TextField
                label="Días de atraso para la mora"
                type="number"
                value={form.delayFee}
                onChange={setField('delayFee')}
                error={Boolean(errors.delayFee)}
                helperText={errors.delayFee ?? 'Con más días de atraso que estos, el socio queda suspendido por mora.'}
                required
                fullWidth
                slotProps={{ input: { endAdornment: <InputAdornment position="end">días</InputAdornment> }, htmlInput: { min: 1, step: 1 } }}
              />
              <TextField
                label="Margen de conflicto"
                type="number"
                value={form.conflictMargin}
                onChange={setField('conflictMargin')}
                error={Boolean(errors.conflictMargin)}
                helperText={errors.conflictMargin ?? 'Tiempo mínimo entre dos partidos de una jugadora para no avisar un conflicto de horario.'}
                required
                fullWidth
                slotProps={{ input: { endAdornment: <InputAdornment position="end">minutos</InputAdornment> }, htmlInput: { min: 0, step: 1 } }}
              />
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title="Datos de contacto">
            <Stack spacing={2}>
              <TextField label="Dirección" value={form.address} onChange={setField('address')} error={Boolean(errors.address)} helperText={errors.address} required fullWidth slotProps={{ htmlInput: { maxLength: 100 } }} />
              <TextField label="Teléfono" value={form.phone} onChange={setField('phone')} error={Boolean(errors.phone)} helperText={errors.phone} fullWidth slotProps={{ htmlInput: { maxLength: 30 } }} />
              <TextField label="Email" type="email" value={form.email} onChange={setField('email')} error={Boolean(errors.email)} helperText={errors.email} required fullWidth slotProps={{ htmlInput: { maxLength: 100 } }} />
              <TextField
                label="WhatsApp"
                value={form.whatsapp}
                onChange={setField('whatsapp')}
                error={Boolean(errors['extraInfo.whatsapp'])}
                helperText={errors['extraInfo.whatsapp'] ?? 'Con código de área, por ejemplo 11 5000-0000.'}
                fullWidth
                slotProps={{ htmlInput: { maxLength: 30 } }}
              />
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard title="Información general" description='Se muestra en la pantalla "El club".'>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" sx={{ color: 'navy.main', mb: 1 }}>Horarios de secretaría</Typography>
                <EditableList
                  items={form.secretaryHours}
                  fields={[{ label: 'Horario' }]}
                  onChange={setList('secretaryHours')}
                  addLabel="Agregar horario"
                  emptyRow=""
                  error={listError(errors, 'secretaryHours')}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ color: 'navy.main', mb: 1 }}>Canchas</Typography>
                <EditableList
                  items={form.courts}
                  fields={[{ key: 'name', label: 'Nombre' }, { key: 'address', label: 'Dirección' }]}
                  onChange={setList('courts')}
                  addLabel="Agregar cancha"
                  emptyRow={{ name: '', address: '' }}
                  error={listError(errors, 'courts')}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ color: 'navy.main', mb: 1 }}>Horarios de entrenamiento</Typography>
                <EditableList
                  items={form.trainingSchedule}
                  fields={[{ key: 'sport', label: 'Deporte' }, { key: 'schedule', label: 'Horario' }]}
                  onChange={setList('trainingSchedule')}
                  addLabel="Agregar horario de entrenamiento"
                  emptyRow={{ sport: '', schedule: '' }}
                  error={listError(errors, 'trainingSchedule')}
                />
              </Box>
            </Stack>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard title="Color del club" description="Un acento propio del club, junto a su nombre en el menú y en el carnet de socio.">
            <Stack spacing={2}>
              <TextField
                label="Color (hex)"
                value={form.accentColor}
                onChange={setField('accentColor')}
                error={Boolean(errors.accentColor) || !validColor}
                helperText={errors.accentColor ?? (validColor ? 'Formato #RRGGBB.' : 'Tiene que tener el formato #RRGGBB.')}
                required
                fullWidth
                slotProps={{
                  htmlInput: { maxLength: 7 },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box sx={{ width: 24, height: 24, borderRadius: 1, border: 1, borderColor: 'divider', bgcolor: validColor ? form.accentColor : 'transparent' }} />
                      </InputAdornment>
                    )
                  }
                }}
              />

              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Vista previa</Typography>
                <Box sx={{ mt: 0.5, p: 2, borderRadius: 2, bgcolor: 'navy.main' }}>
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                    <AccentStripe color={validColor ? form.accentColor : null} size={4} sx={{ height: 22 }} />
                    <Typography variant="body2" sx={{ color: 'navy.contrastText', fontWeight: 500 }}>{settings.name}</Typography>
                  </Stack>
                </Box>
              </Box>
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Button type="submit" variant="contained" color="primary" loading={saving}>
          Guardar cambios
        </Button>
      </Box>

      <Snackbar open={notice.open} autoHideDuration={5000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={closeNotice}>{notice.message}</Alert>
      </Snackbar>
    </Box>
  )
}

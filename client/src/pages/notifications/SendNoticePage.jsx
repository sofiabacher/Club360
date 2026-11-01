import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import FormLabel from '@mui/material/FormLabel'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import CampaignRounded from '@mui/icons-material/CampaignRounded'
import ManageHistoryRounded from '@mui/icons-material/ManageHistoryRounded'

import { getSendOptions, previewNotice, sendNotice } from '../../api/notifications.api.js'
import { getErrorMessage, getFieldErrors } from '../../utils/apiErrors.js'

const TITLE_MAX = 150
const MESSAGE_MAX = 2000
const EMAIL_WARNING = 100   // Gmail tiene un límite diario de envíos

// Modos de envío según el permiso: el Admin (todo el club o grupos), el Representante (su deporte) y la Entrenadora
// (sus categorías). Solo se muestran los que vienen en send-options
const MODES = { CLUB: 'club', SPORT: 'sport', CATEGORIES: 'categories' }

const SEGMENTS = [
  { value: 'members', label: 'Socios' },
  { value: 'staff', label: 'Staff' },
  { value: 'overdue', label: 'Socios con cuotas vencidas' },
  { value: 'families', label: 'Familias' }
]

// Chips para filtrar el staff por rol (sin elegir ninguno, va a todo el staff)
const STAFF_ROLE_LABELS = { Representante: 'Representantes', Entrenadora: 'Entrenadoras', 'Preparadora física': 'Preparadoras' }

const SPORT_GROUPS = [
  { value: 'players', label: 'Jugadoras' },
  { value: 'families', label: 'Familias' },
  { value: 'coaches', label: 'Entrenadoras y preparadoras' }
]

const emptyTarget = { clubScope: 'club', segments: [], staffRoles: [], groups: [], categoryIds: [], includeFamilies: false }
const emptyMessage = { title: '', message: '', sendEmail: false }

const toggleIn = (list, value) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value])

// Arma el audience que espera el back con lo elegido, o null si todavía falta elegir algo
function buildAudience(mode, target) {
  if (mode === MODES.CLUB) {
    if (target.clubScope === 'club') return { scope: 'club' }
    if (target.segments.length === 0) return null
    const familiesApply = target.segments.includes('members') || target.segments.includes('overdue')
    return {
      scope: 'segments',
      segments: target.segments,
      staffRoles: target.segments.includes('staff') ? target.staffRoles : [],
      includeFamilies: familiesApply && target.includeFamilies
    }
  }

  if (mode === MODES.SPORT) return target.groups.length > 0 ? { scope: 'sport', groups: target.groups } : null

  return target.categoryIds.length > 0 ? { scope: 'categories', categoryIds: target.categoryIds, includeFamilies: target.includeFamilies } : null
}

// "Enviar avisos": a quién le llega según los permisos de envío, el mensaje, el email opcional y el resumen en vivo.
// Pantalla de notifications.sendAll, sendSport o sendCategory
export default function SendNoticePage() {
  const navigate = useNavigate()
  const [options, setOptions] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [mode, setMode] = useState(null)
  const [target, setTarget] = useState(emptyTarget)
  const [form, setForm] = useState(emptyMessage)
  const [errors, setErrors] = useState({})
  const [preview, setPreview] = useState(null)   // { recipients, withEmail } o null
  const [previewError, setPreviewError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })   // Snackbar
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  useEffect(() => {
    getSendOptions()
      .then(({ data }) => {
        setOptions(data)
        setMode(data.club ? MODES.CLUB : data.sport ? MODES.SPORT : MODES.CATEGORIES)
      })
      .catch((err) => setLoadError(getErrorMessage(err)))
  }, [])

  const audience = useMemo(() => (mode ? buildAudience(mode, target) : null), [mode, target])

  // Resumen en vivo: cuántos lo reciben y cuántos por email (se pide cuando se deja de cambiar la selección)
  useEffect(() => {
    setPreview(null)
    setPreviewError('')
    if (!audience) return undefined

    const timer = setTimeout(() => {
      previewNotice(audience)
        .then(({ data }) => setPreview(data))
        .catch((err) => setPreviewError(getErrorMessage(err)))
    }, 400)

    return () => clearTimeout(timer)
  }, [audience])

  const setTargetField = (field, value) => setTarget((current) => ({ ...current, [field]: value }))
  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const changeMode = (value) => {
    if (!value) return
    setMode(value)
    setTarget(emptyTarget)
  }

  const canSend = Boolean(audience) && preview?.recipients > 0 && form.title.trim().length >= 3 && form.message.trim().length > 0

  const handleSend = async () => {
    setSending(true)

    try {
      const { data } = await sendNotice({ audience, ...form })
      setForm(emptyMessage)
      setTarget(emptyTarget)
      setErrors({})
      setNotice({
        open: true,
        severity: 'success',
        message: `Enviamos el aviso a ${data.recipients} ${data.recipients === 1 ? 'persona' : 'personas'}${data.emails > 0 ? ` (${data.emails} por email)` : ''}.`,
        batchId: data.batchId
      })
    } catch (err) {
      setErrors(getFieldErrors(err))
      setNotice({ open: true, severity: 'error', message: getErrorMessage(err) })
    } finally {
      setSending(false)
      setConfirmOpen(false)
    }
  }

  if (loadError) return <Alert severity="error">{loadError}</Alert>

  if (!options) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress color="secondary" />
      </Box>
    )
  }

  const availableModes = [
    options.club && { value: MODES.CLUB, label: 'Club' },
    options.sport && { value: MODES.SPORT, label: options.sport.name ? `Mi deporte (${options.sport.name})` : 'Deportes' },
    options.categories && { value: MODES.CATEGORIES, label: 'Mis categorías' }
  ].filter(Boolean)

  const familiesEnabled = target.segments.includes('members') || target.segments.includes('overdue')

  return (
    <Box sx={{ maxWidth: 820 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 1, mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Enviar avisos</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Llegan como notificación en Club360 y, si lo elegís, también por email.
          </Typography>
        </Box>
        <Button component={RouterLink} to="/notifications/sent" color="secondary" startIcon={<ManageHistoryRounded />} sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'center' } }}>
          Ver avisos enviados
        </Button>
      </Stack>

      <Card>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Typography variant="h6" component="h3" sx={{ color: 'navy.main', mb: 2 }}>Destinatarios</Typography>

          {availableModes.length > 1 && (
            <ToggleButtonGroup value={mode} exclusive onChange={(event, value) => changeMode(value)} color="secondary" size="small" sx={{ mb: 2, flexWrap: 'wrap' }}>
              {availableModes.map((item) => <ToggleButton key={item.value} value={item.value}>{item.label}</ToggleButton>)}
            </ToggleButtonGroup>
          )}

          {mode === MODES.CLUB && (
            <Stack spacing={2}>
              <TextField select label="Enviar a" value={target.clubScope} onChange={(event) => setTarget({ ...emptyTarget, clubScope: event.target.value })} size="small" sx={{ maxWidth: 320 }}>
                <MenuItem value="club">Todo el club</MenuItem>
                <MenuItem value="segments">Elegir grupos</MenuItem>
              </TextField>

              {target.clubScope === 'segments' && (
                <Box>
                  <FormGroup>
                    {SEGMENTS.map((segment) => (
                      <Box key={segment.value}>
                        <FormControlLabel
                          control={<Checkbox checked={target.segments.includes(segment.value)} onChange={() => setTargetField('segments', toggleIn(target.segments, segment.value))} color="secondary" />}
                          label={segment.label}
                        />
                        {segment.value === 'staff' && target.segments.includes('staff') && (
                          <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', ml: 4, mb: 1 }}>
                            {options.segments.staffRoles.map((role) => (
                              <Chip
                                key={role}
                                label={STAFF_ROLE_LABELS[role] ?? role}
                                color="secondary"
                                variant={target.staffRoles.includes(role) ? 'filled' : 'outlined'}
                                onClick={() => setTargetField('staffRoles', toggleIn(target.staffRoles, role))}
                              />
                            ))}
                            <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'center' }}>
                              {target.staffRoles.length === 0 ? 'Sin elegir ninguno, va a todo el staff.' : ''}
                            </Typography>
                          </Stack>
                        )}
                      </Box>
                    ))}
                  </FormGroup>
                  <Divider sx={{ my: 1 }} />
                  <FormControlLabel
                    control={<Checkbox checked={familiesEnabled && target.includeFamilies} onChange={(event) => setTargetField('includeFamilies', event.target.checked)} color="secondary" />}
                    label="Incluir a las familias de los socios menores"
                    disabled={!familiesEnabled}
                  />
                </Box>
              )}
            </Stack>
          )}

          {mode === MODES.SPORT && (
            <FormGroup>
              {SPORT_GROUPS.map((group) => (
                <FormControlLabel
                  key={group.value}
                  control={<Checkbox checked={target.groups.includes(group.value)} onChange={() => setTargetField('groups', toggleIn(target.groups, group.value))} color="secondary" />}
                  label={group.label}
                />
              ))}
            </FormGroup>
          )}

          {mode === MODES.CATEGORIES && (
            options.categories.length === 0 ? (
              <Alert severity="info">Todavía no tenés categorías asignadas.</Alert>
            ) : (
              <Box>
                <FormLabel component="legend" sx={{ mb: 0.5 }}>Tus categorías</FormLabel>
                <FormGroup>
                  {options.categories.map((category) => (
                    <FormControlLabel
                      key={category.id}
                      control={<Checkbox checked={target.categoryIds.includes(category.id)} onChange={() => setTargetField('categoryIds', toggleIn(target.categoryIds, category.id))} color="secondary" />}
                      label={`${category.name} · ${category.league}`}
                    />
                  ))}
                </FormGroup>
                <Divider sx={{ my: 1 }} />
                <FormControlLabel
                  control={<Checkbox checked={target.includeFamilies} onChange={(event) => setTargetField('includeFamilies', event.target.checked)} color="secondary" />}
                  label="Incluir a las familias"
                />
              </Box>
            )
          )}

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" component="h3" sx={{ color: 'navy.main', mb: 2 }}>Mensaje</Typography>
          <Stack spacing={2}>
            <TextField
              label="Título"
              value={form.title}
              onChange={(event) => setField('title', event.target.value)}
              error={Boolean(errors.title)}
              helperText={errors.title ?? `${form.title.length}/${TITLE_MAX}`}
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: TITLE_MAX } }}
            />
            <TextField
              label="Mensaje"
              value={form.message}
              onChange={(event) => setField('message', event.target.value)}
              error={Boolean(errors.message)}
              helperText={errors.message ?? `${form.message.length}/${MESSAGE_MAX}`}
              required
              fullWidth
              multiline
              minRows={4}
              slotProps={{ htmlInput: { maxLength: MESSAGE_MAX } }}
            />
            <FormControlLabel
              control={<Checkbox checked={form.sendEmail} onChange={(event) => setField('sendEmail', event.target.checked)} color="secondary" />}
              label="Enviar también por email"
            />
          </Stack>

          <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'background.default' }}>
            {!audience && <Typography variant="body2" sx={{ color: 'text.secondary' }}>Elegí a quién le llega el aviso.</Typography>}
            {audience && !preview && !previewError && <Typography variant="body2" sx={{ color: 'text.secondary' }}>Calculando destinatarios…</Typography>}
            {previewError && <Typography variant="body2" sx={{ color: 'error.main' }}>{previewError}</Typography>}
            {preview && (
              <Typography variant="body2" sx={{ color: 'navy.main', fontWeight: 600 }}>
                {preview.recipients === 0
                  ? 'No hay destinatarios para esta opción.'
                  : `Lo van a recibir ${preview.recipients} ${preview.recipients === 1 ? 'persona' : 'personas'}${form.sendEmail ? ` · ${preview.withEmail} por email` : ''}`}
              </Typography>
            )}
            {preview && form.sendEmail && preview.withEmail > EMAIL_WARNING && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                Gmail tiene un límite diario de envíos: usalo para avisos importantes.
              </Typography>
            )}
          </Box>

          <Box sx={{ mt: 3 }}>
            <Button variant="contained" color="primary" startIcon={<CampaignRounded />} disabled={!canSend} onClick={() => setConfirmOpen(true)}>
              Enviar aviso
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onClose={sending ? undefined : () => setConfirmOpen(false)}>
        <DialogTitle>Enviar el aviso</DialogTitle>
        <DialogContent>
          <DialogContentText>
            "{form.title}" les va a llegar a {preview?.recipients} {preview?.recipients === 1 ? 'persona' : 'personas'}
            {form.sendEmail ? `, ${preview?.withEmail} también por email` : ''}. No se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={() => setConfirmOpen(false)} disabled={sending}>Cancelar</Button>
          <Button variant="contained" color="secondary" onClick={handleSend} loading={sending}>Enviar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={notice.open} autoHideDuration={6000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert
          severity={notice.severity}
          variant="filled"
          onClose={closeNotice}
          action={notice.batchId && (
            <Button color="inherit" size="small" onClick={() => navigate(`/notifications/sent?batch=${notice.batchId}`)}>
              Ver en el historial
            </Button>
          )}
        >
          {notice.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

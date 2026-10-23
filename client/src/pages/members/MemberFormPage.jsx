import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { differenceInYears, format, isValid, parseISO } from 'date-fns'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'

import { createMember, getMember, updateMember } from '../../api/members.api.js'
import { getErrorMessage, getFieldErrors } from '../../utils/apiErrors.js'

const ADULT_AGE = 18

const emptyForm = { name: '', lastName: '', dni: '', birthDate: null, email: '', phone: '', username: '' }

const isMinorOn = (birthDate) => isValid(birthDate) && differenceInYears(new Date(), birthDate) < ADULT_AGE

// Alta (/members/new) y modificación (/members/:id/edit) de un socio. Al terminar un alta va directo al comprobante.
export default function MemberFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [form, setForm] = useState(emptyForm)
  const [member, setMember] = useState(null)   // Solo en la modificación
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [existingUser, setExistingUser] = useState(null)   // Respuesta EXISTING_USER del alta

  useEffect(() => {
    if (!isEdit) return

    getMember(id)
      .then(({ data }) => {
        setMember(data)
        setForm({
          name: data.user.name,
          lastName: data.user.lastName,
          dni: data.user.dni ?? '',
          birthDate: parseISO(data.user.birthDate),
          email: data.user.email ?? '',
          phone: data.user.phone ?? '',
          username: data.user.username ?? ''
        })
      })
      .catch((err) => setLoadError(getErrorMessage(err)))
  }, [id, isEdit])

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleChange = (event) => setField(event.target.name, event.target.value)

  const isMinor = isMinorOn(form.birthDate)
  const canEditUsername = isEdit && member?.user.isRegistered

  const save = async (existingUserId) => {
    setError('')
    setErrors({})

    if (!isValid(form.birthDate)) {
      setErrors({ birthDate: 'Ingresá la fecha de nacimiento.' })
      return
    }

    const payload = {
      name: form.name,
      lastName: form.lastName,
      dni: form.dni,
      birthDate: format(form.birthDate, 'yyyy-MM-dd'),
      email: form.email,
      phone: form.phone
    }

    setSaving(true)

    try {
      if (isEdit) {
        await updateMember(id, { ...payload, username: canEditUsername ? form.username : undefined })
        navigate(`/members/${id}`, { state: { notice: 'Guardamos los cambios del socio.' } })
      } else {
        const { data } = await createMember({ ...payload, existingUserId })
        navigate(`/members/${data.id}/receipt`, { replace: true })
      }
    } catch (err) {
      const body = err.response?.data

      if (body?.code === 'EXISTING_USER') {
        setExistingUser(body.data)
      } else {
        setErrors(getFieldErrors(err))
        setError(getErrorMessage(err))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    save()
  }

  const confirmExistingUser = () => {
    const userId = existingUser.id
    setExistingUser(null)
    save(userId)
  }

  if (loadError) return <Alert severity="error">{loadError}</Alert>

  if (isEdit && !member) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress color="secondary" />
      </Box>
    )
  }

  const backTo = isEdit ? `/members/${id}` : '/members'

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>
          {isEdit ? `Editar socio Nº ${member.numMember}` : 'Nuevo socio'}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {isEdit
            ? 'Si cambiás la fecha de nacimiento, queda registrado en la bitácora: cambia lo que puede hacer según su edad.'
            : 'Alta presencial. Al terminar vas a ver el comprobante para imprimir y entregar.'}
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Nombre" name="name" value={form.name} onChange={handleChange} error={Boolean(errors.name)} helperText={errors.name} required fullWidth autoFocus={!isEdit} slotProps={{ htmlInput: { maxLength: 100 } }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Apellido" name="lastName" value={form.lastName} onChange={handleChange} error={Boolean(errors.lastName)} helperText={errors.lastName} required fullWidth slotProps={{ htmlInput: { maxLength: 100 } }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="DNI"
                  name="dni"
                  value={form.dni}
                  onChange={(event) => setField('dni', event.target.value.replace(/\D/g, ''))}
                  error={Boolean(errors.dni)}
                  helperText={errors.dni ?? 'Sin puntos, 7 u 8 dígitos.'}
                  required
                  fullWidth
                  slotProps={{ htmlInput: { maxLength: 8, inputMode: 'numeric' } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <DatePicker
                  label="Fecha de nacimiento"
                  value={form.birthDate}
                  onChange={(value) => setField('birthDate', value)}
                  disableFuture
                  openTo="year"
                  views={['year', 'month', 'day']}
                  slotProps={{
                    textField: {
                      required: true,
                      fullWidth: true,
                      error: Boolean(errors.birthDate),
                      helperText: errors.birthDate
                    }
                  }}
                />
              </Grid>

              {isMinor && (
                <Grid size={12}>
                  <Alert severity="info">
                    {isEdit
                      ? 'Es menor de edad: el email es opcional.'
                      : 'Es menor de edad: se va a generar un código de vínculo para el adulto responsable. El email es opcional.'}
                  </Alert>
                </Grid>
              )}

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  error={Boolean(errors.email)}
                  helperText={errors.email ?? (isMinor ? 'Opcional para menores de 18.' : 'Obligatorio para mayores de 18.')}
                  required={!isMinor}
                  fullWidth
                  slotProps={{ htmlInput: { maxLength: 150 } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Teléfono" name="phone" value={form.phone} onChange={handleChange} error={Boolean(errors.phone)} helperText={errors.phone ?? 'Opcional.'} fullWidth slotProps={{ htmlInput: { maxLength: 30 } }} />
              </Grid>

              {isEdit && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Usuario"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    error={Boolean(errors.username)}
                    helperText={errors.username ?? (canEditUsername ? 'Con el que inicia sesión.' : 'Lo elige el socio al registrarse con su número.')}
                    disabled={!canEditUsername}
                    fullWidth
                    slotProps={{ htmlInput: { maxLength: 50 } }}
                  />
                </Grid>
              )}
            </Grid>

            <Stack direction="row" spacing={1.5} sx={{ mt: 4 }}>
              <Button type="submit" variant="contained" color="primary" loading={saving}>
                {isEdit ? 'Guardar cambios' : 'Dar de alta'}
              </Button>
              <Button component={RouterLink} to={backTo} color="secondary" disabled={saving}>
                Cancelar
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={Boolean(existingUser)} onClose={() => setExistingUser(null)}>
        <DialogTitle>Ya tiene usuario</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {existingUser?.fullName} ya tiene usuario en el club. ¿Querés darlo de alta como socio con ese usuario?
          </DialogContentText>
          <DialogContentText variant="body2" sx={{ mt: 1.5 }}>
            Se usan los datos que ya tiene cargados: no se cambia su usuario ni su contraseña.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={() => setExistingUser(null)}>Cancelar</Button>
          <Button variant="contained" color="secondary" onClick={confirmExistingUser}>Darlo de alta</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

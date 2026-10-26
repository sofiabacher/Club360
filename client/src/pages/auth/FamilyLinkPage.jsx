import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { differenceInYears, format, isValid, subYears } from 'date-fns'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Stepper from '@mui/material/Stepper'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'

import { linkWithExistingAccount, linkWithNewAccount, validateFamilyCode } from '../../api/members.api.js'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import PasswordField from '../../components/auth/PasswordField.jsx'
import PasswordRequirements from '../../components/auth/PasswordRequirements.jsx'
import FamilyCodeField, { isFamilyCode } from '../../components/members/FamilyCodeField.jsx'
import { getErrorMessage, getFieldErrors } from '../../utils/apiErrors.js'

const ADULT_AGE = 18
const STEPS = ['Código', 'Tu cuenta', 'Listo']
const TABS = { EXISTING: 'existing', NEW: 'new' }

const emptyExisting = { username: '', password: '' }
const emptyNew = { name: '', lastName: '', dni: '', birthDate: null, email: '', phone: '', username: '', password: '', confirmPassword: '' }

// "Vincularme como Familia" (/family-link, pública): el adulto responsable ingresa el código del socio menor y entra
// con su usuario o crea su cuenta. Al terminar queda con el rol Familia.
export default function FamilyLinkPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [code, setCode] = useState('')
  const [target, setTarget] = useState(null)   // { member: { name }, club: { name } } del código validado
  const [tab, setTab] = useState(TABS.EXISTING)
  const [existingForm, setExistingForm] = useState(emptyExisting)
  const [newForm, setNewForm] = useState(emptyNew)
  const [username, setUsername] = useState('')   // Para precargar el login al terminar
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const resetErrors = () => {
    setError('')
    setFieldErrors({})
  }

  const fail = (err) => {
    setError(getErrorMessage(err))
    setFieldErrors(getFieldErrors(err))
  }

  // ---------- Paso 1: código ----------

  const handleValidate = async (event) => {
    event.preventDefault()
    resetErrors()
    setSubmitting(true)

    try {
      const { data } = await validateFamilyCode(code)
      setTarget(data)
      setStep(1)
    } catch (err) {
      fail(err)
    } finally {
      setSubmitting(false)
    }
  }

  const changeCode = () => {
    resetErrors()
    setTarget(null)
    setStep(0)
  }

  // ---------- Paso 2: cuenta ----------

  const finish = (linkedUsername) => {
    setUsername(linkedUsername)
    setStep(2)
  }

  const handleExistingChange = (event) => {
    const { name, value } = event.target
    setExistingForm((current) => ({ ...current, [name]: value }))
  }

  const setNewField = (name, value) => {
    setNewForm((current) => ({ ...current, [name]: value }))
    setFieldErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handleNewChange = (event) => setNewField(event.target.name, event.target.value)

  const handleExistingSubmit = async (event) => {
    event.preventDefault()
    resetErrors()
    setSubmitting(true)

    try {
      const { data } = await linkWithExistingAccount({ code, ...existingForm })
      finish(data.username)
    } catch (err) {
      fail(err)
      setExistingForm((current) => ({ ...current, password: '' }))
    } finally {
      setSubmitting(false)
    }
  }

  const handleNewSubmit = async (event) => {
    event.preventDefault()
    resetErrors()

    if (!isValid(newForm.birthDate)) {
      setFieldErrors({ birthDate: 'Ingresá tu fecha de nacimiento.' })
      return
    }

    if (differenceInYears(new Date(), newForm.birthDate) < ADULT_AGE) {
      setFieldErrors({ birthDate: 'Para vincularte como Familia tenés que ser mayor de 18.' })
      return
    }

    setSubmitting(true)

    try {
      const { data } = await linkWithNewAccount({ code, ...newForm, birthDate: format(newForm.birthDate, 'yyyy-MM-dd') })
      finish(data.username)
    } catch (err) {
      fail(err)
    } finally {
      setSubmitting(false)
    }
  }

  const passwordsMatch = newForm.confirmPassword === '' || newForm.confirmPassword === newForm.password

  return (
    <AuthLayout title="Vincularme como Familia" maxWidth={step === 1 && tab === TABS.NEW ? 600 : 480}>
      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {step === 0 && (
        <Box component="form" onSubmit={handleValidate} noValidate>
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              Ingresá el código de vínculo que figura en el comprobante del alta de tu hija o hijo.
            </Typography>

            {error && <Alert severity="error">{error}</Alert>}

            <FamilyCodeField
              value={code}
              onChange={(value) => {
                setCode(value)
                resetErrors()
              }}
              error={Boolean(fieldErrors.code)}
              helperText={fieldErrors.code}
              autoFocus
              required
              fullWidth
            />

            <Button type="submit" variant="contained" color="primary" size="large" loading={submitting} disabled={!isFamilyCode(code)} fullWidth>
              Continuar
            </Button>

            <Link component={RouterLink} to="/login" variant="body2" color="secondary" underline="hover" sx={{ alignSelf: 'center' }}>
              Volver al inicio de sesión
            </Link>
          </Stack>
        </Box>
      )}

      {step === 1 && target && (
        <Stack spacing={2}>
          <Alert severity="info">
            Vas a vincularte como adulto responsable de <strong>{target.member.name}</strong>, socia de {target.club.name}.
          </Alert>

          <Tabs
            value={tab}
            onChange={(event, value) => {
              setTab(value)
              resetErrors()
            }}
            variant="fullWidth"
            textColor="secondary"
            indicatorColor="secondary"
          >
            <Tab label="Ya tengo usuario" value={TABS.EXISTING} />
            <Tab label="Crear mi cuenta" value={TABS.NEW} />
          </Tabs>

          {error && <Alert severity="error">{error}</Alert>}

          {tab === TABS.EXISTING && (
            <Box component="form" onSubmit={handleExistingSubmit} noValidate>
              <Stack spacing={2}>
                <TextField
                  label="Usuario"
                  name="username"
                  value={existingForm.username}
                  onChange={handleExistingChange}
                  autoComplete="username"
                  autoFocus
                  required
                  fullWidth
                />
                <PasswordField
                  label="Contraseña"
                  name="password"
                  value={existingForm.password}
                  onChange={handleExistingChange}
                  autoComplete="current-password"
                  required
                  fullWidth
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  loading={submitting}
                  disabled={!existingForm.username.trim() || !existingForm.password}
                  fullWidth
                >
                  Vincularme
                </Button>
              </Stack>
            </Box>
          )}

          {tab === TABS.NEW && (
            <Box component="form" onSubmit={handleNewSubmit} noValidate>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Nombre" name="name" value={newForm.name} onChange={handleNewChange} error={Boolean(fieldErrors.name)} helperText={fieldErrors.name} required fullWidth autoFocus slotProps={{ htmlInput: { maxLength: 100 } }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Apellido" name="lastName" value={newForm.lastName} onChange={handleNewChange} error={Boolean(fieldErrors.lastName)} helperText={fieldErrors.lastName} required fullWidth slotProps={{ htmlInput: { maxLength: 100 } }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="DNI"
                    name="dni"
                    value={newForm.dni}
                    onChange={(event) => setNewField('dni', event.target.value.replace(/\D/g, ''))}
                    error={Boolean(fieldErrors.dni)}
                    helperText={fieldErrors.dni ?? 'Sin puntos.'}
                    required
                    fullWidth
                    slotProps={{ htmlInput: { maxLength: 8, inputMode: 'numeric' } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <DatePicker
                    label="Fecha de nacimiento"
                    value={newForm.birthDate}
                    onChange={(value) => setNewField('birthDate', value)}
                    maxDate={subYears(new Date(), ADULT_AGE)}
                    openTo="year"
                    views={['year', 'month', 'day']}
                    slotProps={{
                      textField: {
                        required: true,
                        fullWidth: true,
                        error: Boolean(fieldErrors.birthDate),
                        helperText: fieldErrors.birthDate ?? 'Tenés que ser mayor de 18.'
                      }
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Email" name="email" type="email" value={newForm.email} onChange={handleNewChange} error={Boolean(fieldErrors.email)} helperText={fieldErrors.email} autoComplete="email" required fullWidth slotProps={{ htmlInput: { maxLength: 150 } }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Teléfono" name="phone" value={newForm.phone} onChange={handleNewChange} error={Boolean(fieldErrors.phone)} helperText={fieldErrors.phone ?? 'Opcional.'} autoComplete="tel" fullWidth slotProps={{ htmlInput: { maxLength: 30 } }} />
                </Grid>
                <Grid size={12}>
                  <TextField
                    label="Usuario"
                    name="username"
                    value={newForm.username}
                    onChange={handleNewChange}
                    error={Boolean(fieldErrors.username)}
                    helperText={fieldErrors.username ?? 'Con el que vas a iniciar sesión. Letras, números, punto y guion bajo.'}
                    autoComplete="username"
                    required
                    fullWidth
                    slotProps={{ htmlInput: { maxLength: 50 } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <PasswordField
                    label="Contraseña"
                    name="password"
                    value={newForm.password}
                    onChange={handleNewChange}
                    error={Boolean(fieldErrors.password)}
                    helperText={fieldErrors.password}
                    autoComplete="new-password"
                    required
                    fullWidth
                  />
                  <PasswordRequirements password={newForm.password} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <PasswordField
                    label="Repetí la contraseña"
                    name="confirmPassword"
                    value={newForm.confirmPassword}
                    onChange={handleNewChange}
                    error={!passwordsMatch || Boolean(fieldErrors.confirmPassword)}
                    helperText={!passwordsMatch ? 'Las contraseñas no coinciden.' : fieldErrors.confirmPassword}
                    autoComplete="new-password"
                    required
                    fullWidth
                  />
                </Grid>
                <Grid size={12}>
                  <Button type="submit" variant="contained" color="primary" size="large" loading={submitting} fullWidth>
                    Crear mi cuenta y vincularme
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}

          <Button color="secondary" onClick={changeCode} disabled={submitting} sx={{ alignSelf: 'center' }}>
            Usar otro código
          </Button>
        </Stack>
      )}

      {step === 2 && (
        <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
          <CheckCircleRounded color="success" sx={{ fontSize: 56 }} />
          <Typography variant="h6" component="p" sx={{ color: 'navy.main' }}>
            ¡Listo! Ya estás vinculado como Familia.
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Al entrar, si tenés más de un rol, elegí Familia para ver los partidos, las citaciones y las cuotas de {target?.member.name}.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            onClick={() => navigate('/login', { replace: true, state: { username, successMessage: 'Ya estás vinculado como Familia. Ingresá con tu contraseña.' } })}
          >
            Ir a iniciar sesión
          </Button>
        </Stack>
      )}
    </AuthLayout>
  )
}

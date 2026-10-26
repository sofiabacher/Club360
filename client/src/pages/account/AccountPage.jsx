import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
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
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import LinkOffRounded from '@mui/icons-material/LinkOffRounded'
import PhotoCameraRounded from '@mui/icons-material/PhotoCameraRounded'

import { changePassword, getAccount, unlinkAdult, updateAccount, uploadAccountPhoto } from '../../api/auth.api.js'
import { linkFamilyMember } from '../../api/members.api.js'
import PasswordField from '../../components/auth/PasswordField.jsx'
import PasswordRequirements from '../../components/auth/PasswordRequirements.jsx'
import UserAvatar from '../../components/common/UserAvatar.jsx'
import FamilyCodeField, { isFamilyCode } from '../../components/members/FamilyCodeField.jsx'
import { MemberStateChip } from '../../components/members/MemberStatusChips.jsx'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage, getFieldErrors } from '../../utils/apiErrors.js'

const emptyPasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' }

// Dato de solo lectura: etiqueta chica y valor
function ReadOnlyField({ label, children }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
      <Box sx={{ color: 'navy.main', fontWeight: 500 }}>{children || '—'}</Box>
    </Box>
  )
}

export default function AccountPage() {
  const { user, refreshSession } = useAuth()
  const emailRequired = user?.isAdult ?? true   // El email es obligatorio para los mayores de 18

  const [account, setAccount] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })   // Snackbar
  const showNotice = (severity, message) => setNotice({ open: true, severity, message })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  const [contact, setContact] = useState({ email: '', phone: '' })
  const [contactErrors, setContactErrors] = useState({})
  const [savingContact, setSavingContact] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm)
  const [passwordErrors, setPasswordErrors] = useState({})
  const [savingPassword, setSavingPassword] = useState(false)

  const [linkCode, setLinkCode] = useState('')
  const [linkError, setLinkError] = useState('')
  const [linking, setLinking] = useState(false)
  const [unlinkOpen, setUnlinkOpen] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  const showAccount = (data) => {
    setAccount(data)
    setContact({ email: data.email ?? '', phone: data.phone ?? '' })
  }

  useEffect(() => {
    getAccount()
      .then(({ data }) => showAccount(data))
      .catch((err) => setLoadError(getErrorMessage(err)))
  }, [])

  const handleContactSubmit = async (event) => {
    event.preventDefault()
    setContactErrors({})
    setSavingContact(true)

    try {
      const { data } = await updateAccount(contact)
      showAccount(data)
      await refreshSession()
      showNotice('success', 'Guardamos tus datos.')
    } catch (err) {
      setContactErrors(getFieldErrors(err))
      showNotice('error', getErrorMessage(err))
    } finally {
      setSavingContact(false)
    }
  }

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''   // Permite volver a elegir el mismo archivo
    if (!file) return

    setUploadingPhoto(true)

    try {
      const { data } = await uploadAccountPhoto(file)
      setAccount((current) => ({ ...current, photo: data.photo }))
      await refreshSession()
      showNotice('success', 'Actualizamos tu foto.')
    } catch (err) {
      showNotice('error', getErrorMessage(err))
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handlePasswordChange = (event) => {
    const { name, value } = event.target
    setPasswordForm((current) => ({ ...current, [name]: value }))
    setPasswordErrors((current) => ({ ...current, [name]: undefined }))
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setPasswordErrors({})
    setSavingPassword(true)

    try {
      await changePassword(passwordForm)
      setPasswordForm(emptyPasswordForm)
      showNotice('success', 'Cambiaste tu contraseña. Te mandamos un email de aviso.')
    } catch (err) {
      setPasswordErrors(getFieldErrors(err))
      showNotice('error', getErrorMessage(err))
    } finally {
      setSavingPassword(false)
    }
  }

  // Vincular a otra socia menor con su código (por ejemplo, una hermana). Puede sumar el rol Familia: se refresca la sesión
  const handleLinkSubmit = async (event) => {
    event.preventDefault()
    setLinkError('')
    setLinking(true)

    try {
      const { data } = await linkFamilyMember(linkCode)
      const [{ data: accountData }, session] = await Promise.all([getAccount(), refreshSession()])
      showAccount(accountData)
      setLinkCode('')

      const switchHint = data.familyRoleAdded && session.roles.length > 1
        ? ' Para ver sus partidos, citaciones y cuotas, cambiá al rol Familia desde el menú de tu usuario.'
        : ''
      showNotice('success', `Te vinculaste como Familia de ${data.member.name}.${switchHint}`)
    } catch (err) {
      setLinkError(getErrorMessage(err))
    } finally {
      setLinking(false)
    }
  }

  const handleUnlink = async () => {
    setUnlinking(true)

    try {
      const { data } = await unlinkAdult()
      showAccount(data)
      showNotice('success', 'Te desvinculaste de tu adulto responsable.')
    } catch (err) {
      showNotice('error', getErrorMessage(err))
    } finally {
      setUnlinking(false)
      setUnlinkOpen(false)
    }
  }

  if (loadError) return <Alert severity="error">{loadError}</Alert>

  if (!account) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress color="secondary" />
      </Box>
    )
  }

  const passwordsMatch = passwordForm.confirmPassword === '' || passwordForm.confirmPassword === passwordForm.newPassword
  const { member } = account

  return (
    <>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Card>
            <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
              <Typography variant="h5" component="h2" sx={{ color: 'navy.main', mb: 3 }}>
                Mis datos
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: { xs: 'center', sm: 'center' } }}>
                <UserAvatar user={account} size={104} />
                <Stack spacing={1} sx={{ alignItems: { xs: 'center', sm: 'flex-start' }, textAlign: { xs: 'center', sm: 'left' } }}>
                  <Typography variant="h6" sx={{ color: 'navy.main' }}>
                    {account.name} {account.lastName}
                  </Typography>
                  <Button
                    component="label"
                    variant="outlined"
                    color="secondary"
                    size="small"
                    startIcon={<PhotoCameraRounded />}
                    loading={uploadingPhoto}
                  >
                    Cambiar foto
                    <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} />
                  </Button>
                </Stack>
              </Stack>

              <Grid container spacing={2} sx={{ mt: 3 }}>
                <Grid size={{ xs: 12, sm: 6 }}><ReadOnlyField label="Nombre">{account.name}</ReadOnlyField></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><ReadOnlyField label="Apellido">{account.lastName}</ReadOnlyField></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><ReadOnlyField label="DNI">{account.dni}</ReadOnlyField></Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <ReadOnlyField label="Fecha de nacimiento">
                    {account.birthDate && format(parseISO(account.birthDate), 'dd/MM/yyyy')}
                  </ReadOnlyField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}><ReadOnlyField label="Usuario">{account.username}</ReadOnlyField></Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Box component="form" onSubmit={handleContactSubmit} noValidate>
                <Stack spacing={2}>
                  <TextField
                    label="Email"
                    type="email"
                    value={contact.email}
                    onChange={(event) => setContact({ ...contact, email: event.target.value })}
                    error={Boolean(contactErrors.email)}
                    helperText={contactErrors.email ?? (emailRequired ? undefined : 'Opcional para menores de 18.')}
                    autoComplete="email"
                    required={emailRequired}
                    fullWidth
                  />
                  <TextField
                    label="Teléfono"
                    value={contact.phone}
                    onChange={(event) => setContact({ ...contact, phone: event.target.value })}
                    error={Boolean(contactErrors.phone)}
                    helperText={contactErrors.phone}
                    autoComplete="tel"
                    fullWidth
                  />
                  <Box>
                    <Button type="submit" variant="contained" color="primary" loading={savingContact}>
                      Guardar cambios
                    </Button>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Para modificar tu nombre, DNI o fecha de nacimiento, comunicate con el club.
                  </Typography>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card>
            <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
              <Typography variant="h5" component="h2" sx={{ color: 'navy.main', mb: 3 }}>
                Cambiar contraseña
              </Typography>

              <Box component="form" onSubmit={handlePasswordSubmit} noValidate>
                <Stack spacing={2}>
                  <PasswordField
                    label="Contraseña actual"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    error={Boolean(passwordErrors.currentPassword)}
                    helperText={passwordErrors.currentPassword}
                    autoComplete="current-password"
                    required
                    fullWidth
                  />
                  <Box>
                    <PasswordField
                      label="Contraseña nueva"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      error={Boolean(passwordErrors.newPassword)}
                      helperText={passwordErrors.newPassword}
                      autoComplete="new-password"
                      required
                      fullWidth
                    />
                    <PasswordRequirements password={passwordForm.newPassword} />
                  </Box>
                  <PasswordField
                    label="Repetí la contraseña nueva"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    error={!passwordsMatch || Boolean(passwordErrors.confirmPassword)}
                    helperText={!passwordsMatch ? 'Las contraseñas no coinciden.' : passwordErrors.confirmPassword}
                    autoComplete="new-password"
                    required
                    fullWidth
                  />
                  <Box>
                    <Button type="submit" variant="contained" color="secondary" loading={savingPassword}>
                      Cambiar contraseña
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {member && (
          <Grid size={{ xs: 12, lg: 6 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
                <Typography variant="h5" component="h2" sx={{ color: 'navy.main', mb: 3 }}>
                  Mi condición de socio
                </Typography>

                <Stack direction="row" sx={{ alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <ReadOnlyField label="Número de socio">
                    <Typography variant="numeric" sx={{ fontSize: '1.8rem', color: 'navy.main' }}>
                      {member.numMember}
                    </Typography>
                  </ReadOnlyField>
                  <MemberStateChip memberStateId={member.memberStateId} />
                </Stack>

                {member.codeFamily && (
                  <Paper variant="outlined" sx={{ mt: 3, p: 2.5, bgcolor: 'cream.main', textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Código de vínculo familiar</Typography>
                    <Typography variant="numeric" component="p" sx={{ fontSize: '2.4rem', color: 'navy.main', letterSpacing: '0.1em', my: 0.5 }}>
                      {member.codeFamily}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Pasale este código a tu adulto responsable para que se vincule como Familia desde
                      'Vincularme como Familia'. Sirve una sola vez.
                    </Typography>
                  </Paper>
                )}

                {account.adult && (
                  <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ mt: 3, gap: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
                    <Typography sx={{ color: 'navy.main' }}>
                      Adulto responsable: <strong>{account.adult.name}</strong>
                    </Typography>
                    {account.canUnlink && (
                      <Button variant="outlined" color="error" startIcon={<LinkOffRounded />} onClick={() => setUnlinkOpen(true)} sx={{ flexShrink: 0 }}>
                        Desvincularme
                      </Button>
                    )}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid size={{ xs: 12, lg: member ? 6 : 12 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
              <Typography variant="h5" component="h2" sx={{ color: 'navy.main', mb: 2 }}>
                Socias vinculadas
              </Typography>

              {(account.linkedMembers ?? []).length > 0 ? (
                <List disablePadding sx={{ mb: 2 }}>
                  {account.linkedMembers?.map((linked) => (
                    <ListItem key={linked.numMember} disableGutters divider>
                      <ListItemText
                        primary={linked.name}
                        secondary={`${linked.age} años`}
                        slotProps={{ primary: { sx: { color: 'navy.main', fontWeight: 500 } } }}
                      />
                      <Typography variant="numeric" sx={{ fontSize: '1.2rem', color: 'navy.main' }}>
                        Nº {linked.numMember}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  Todavía no tenés Socias vinculadas.
                </Typography>
              )}

              <Box component="form" onSubmit={handleLinkSubmit} noValidate>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
                  <FamilyCodeField
                    label="Vincular a otra socia menor"
                    value={linkCode}
                    onChange={(value) => {
                      setLinkCode(value)
                      setLinkError('')
                    }}
                    error={Boolean(linkError)}
                    helperText={linkError || 'Con el código de su comprobante de alta.'}
                    size="small"
                    sx={{ flexGrow: 1 }}
                  />
                  <Button type="submit" variant="contained" color="secondary" loading={linking} disabled={!isFamilyCode(linkCode)} sx={{ flexShrink: 0 }}>
                    Vincular
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={unlinkOpen} onClose={unlinking ? undefined : () => setUnlinkOpen(false)}>
        <DialogTitle>Desvincularme de mi adulto responsable</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {account.adult?.name} deja de ver tus partidos, tus citaciones y tus cuotas. El código de vínculo ya no se
            puede volver a usar.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={() => setUnlinkOpen(false)} disabled={unlinking}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleUnlink} loading={unlinking}>Desvincularme</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={notice.open}
        autoHideDuration={5000}
        onClose={closeNotice}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={notice.severity} variant="filled" onClose={closeNotice}>
          {notice.message}
        </Alert>
      </Snackbar>
    </>
  )
}

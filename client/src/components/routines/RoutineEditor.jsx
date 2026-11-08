import { useEffect, useRef, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddPhotoAlternateRounded from '@mui/icons-material/AddPhotoAlternateRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'

import { createRoutine, deleteRoutine, updateRoutine } from '../../api/routines.api.js'
import ParquetBackground from '../common/ParquetBackground.jsx'
import { getErrorMessage, getFieldErrors } from '../../utils/apiErrors.js'
import { DAYS_OF_WEEK } from '../../utils/constants.js'
import { formatDayMonth } from '../../utils/format.js'
import { getUploadUrl } from '../../utils/media.js'

const TITLE_MIN = 3
const TITLE_MAX = 150
const DESCRIPTION_MAX = 3000
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const IMAGE_MAX_SIZE = 5 * 1024 * 1024   // 5 MB
const VIDEO_URL = /^https?:\/\/[^\s]+\.[^\s]+$/i

// Mensaje de cada campo con las mismas reglas que el back, o null si está bien
function fieldErrorsOf(form) {
  const title = form.title.trim()
  const video = form.videoUrl.trim()
  return {
    title: title.length < TITLE_MIN || title.length > TITLE_MAX ? `El título tiene que tener entre ${TITLE_MIN} y ${TITLE_MAX} caracteres.` : null,
    description: form.description.trim() === '' ? 'Escribí la descripción de la rutina.' : null,
    videoUrl: video && (!VIDEO_URL.test(video) || video.length > 255) ? 'Tiene que ser un link que empiece con http:// o https://.' : null
  }
}

// Edición en el lugar de la rutina de un día (preparadora física, semanas editables): título, descripción, imagen con
// vista previa y el link del video. "Publicar" (o "Guardar cambios" si el día ya tenía rutina) y "Borrar rutina".
// onSaved(message) después de guardar o borrar
export default function RoutineEditor({ categoryId, weekStart, day, onSaved }) {
  const routine = day.routine
  const [form, setForm] = useState({ title: routine?.title ?? '', description: routine?.description ?? '', videoUrl: routine?.videoUrl ?? '' })
  const [touched, setTouched] = useState({})
  const [image, setImage] = useState(null)   // File nueva
  const [removeImage, setRemoveImage] = useState(false)
  const [imageError, setImageError] = useState('')
  const [preview, setPreview] = useState(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [serverErrors, setServerErrors] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!image) {
      setPreview(null)
      return undefined
    }
    const url = URL.createObjectURL(image)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  const errors = fieldErrorsOf(form)
  const valid = Object.values(errors).every((message) => !message)
  const shownError = (field) => serverErrors[field] ?? (touched[field] ? errors[field] : null)

  const setField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setServerErrors((current) => ({ ...current, [field]: undefined }))
  }
  const touch = (field) => () => setTouched((current) => ({ ...current, [field]: true }))

  const chooseImage = (file) => {
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) return setImageError('La imagen tiene que ser JPG, PNG o WEBP.')
    if (file.size > IMAGE_MAX_SIZE) return setImageError('La imagen no puede pesar más de 5 MB.')
    setImageError('')
    setImage(file)
    setRemoveImage(false)
  }

  const quitImage = () => {
    setImage(null)
    if (routine?.imageUrl) setRemoveImage(true)
  }

  const currentImage = preview ?? (!removeImage && routine?.imageUrl ? getUploadUrl(routine.imageUrl) : null)
  const dayLabel = `${DAYS_OF_WEEK.find((item) => item.value === day.dayOfWeek).name} ${formatDayMonth(day.date)}`

  const handleSave = async () => {
    setTouched({ title: true, description: true, videoUrl: true })
    if (!valid) return

    setSending(true)
    setError('')
    const fields = { title: form.title.trim(), description: form.description.trim(), videoUrl: form.videoUrl.trim() }
    try {
      if (routine) {
        await updateRoutine(routine.id, { ...fields, removeImage }, image)
        onSaved(`Guardamos los cambios de la rutina del ${dayLabel}.`)
      } else {
        await createRoutine({ ...fields, categoryId, weekStart, dayOfWeek: day.dayOfWeek }, image)
        onSaved(`Publicaste la rutina del ${dayLabel}. Les avisamos a las jugadoras.`)
      }
    } catch (err) {
      setServerErrors(getFieldErrors(err))
      setError(getErrorMessage(err))
      setSending(false)
    }
  }

  const handleDelete = async () => {
    setSending(true)
    try {
      await deleteRoutine(routine.id)
      setConfirmDelete(false)
      onSaved(`Borraste la rutina del ${dayLabel}.`)
    } catch (err) {
      setError(getErrorMessage(err))
      setConfirmDelete(false)
      setSending(false)
    }
  }

  return (
    <ParquetBackground sx={{ borderRadius: 3, p: { xs: 1.5, sm: 3 } }}>
      <Card elevation={6} sx={{ borderRadius: 3, maxWidth: 720, mx: 'auto' }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.5 }}>
            {routine ? 'Editar la rutina del' : 'Nueva rutina para el'} {dayLabel}
          </Typography>

          {error && <Alert severity="error" sx={{ my: 1.5 }}>{error}</Alert>}

          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Título"
              value={form.title}
              onChange={setField('title')}
              onBlur={touch('title')}
              error={Boolean(shownError('title'))}
              helperText={shownError('title') ?? `${form.title.trim().length}/${TITLE_MAX}`}
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: TITLE_MAX } }}
            />
            <TextField
              label="Descripción de los ejercicios"
              value={form.description}
              onChange={setField('description')}
              onBlur={touch('description')}
              error={Boolean(shownError('description'))}
              helperText={shownError('description') ?? `${form.description.length}/${DESCRIPTION_MAX}`}
              required
              multiline
              minRows={6}
              fullWidth
              slotProps={{ htmlInput: { maxLength: DESCRIPTION_MAX } }}
            />

            <Box>
              <Typography variant="subtitle2" sx={{ color: 'navy.main', mb: 1 }}>Imagen (opcional)</Typography>
              {currentImage ? (
                <Box>
                  <Box component="img" src={currentImage} alt="Vista previa de la imagen" sx={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 2, display: 'block' }} />
                  <Stack direction="row" sx={{ gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    <Button size="small" color="secondary" onClick={() => inputRef.current?.click()} disabled={sending}>Cambiar imagen</Button>
                    <Button size="small" color="secondary" startIcon={<DeleteOutlineRounded />} onClick={quitImage} disabled={sending}>Quitar imagen</Button>
                  </Stack>
                </Box>
              ) : (
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inputRef.current?.click() } }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); chooseImage(event.dataTransfer.files?.[0]) }}
                  sx={{
                    border: 2,
                    borderStyle: 'dashed',
                    borderColor: imageError ? 'error.main' : 'divider',
                    borderRadius: 2,
                    p: 2.5,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: 'background.default',
                    '&:focus-visible': { outline: 2, outlineStyle: 'solid', outlineColor: 'secondary.main' }
                  }}
                >
                  <AddPhotoAlternateRounded sx={{ fontSize: 34, color: 'secondary.main' }} />
                  <Typography variant="body2" sx={{ color: 'navy.main', fontWeight: 500 }}>Arrastrá la imagen o tocá para elegirla</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>JPG, PNG o WEBP, hasta 5 MB</Typography>
                </Box>
              )}
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { chooseImage(event.target.files?.[0]); event.target.value = '' }} />
              {imageError && <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5 }}>{imageError}</Typography>}
            </Box>

            <TextField
              label="Link del video (opcional)"
              placeholder="https://"
              value={form.videoUrl}
              onChange={setField('videoUrl')}
              onBlur={touch('videoUrl')}
              error={Boolean(shownError('videoUrl'))}
              helperText={shownError('videoUrl') ?? ' '}
              fullWidth
              slotProps={{ htmlInput: { maxLength: 255, inputMode: 'url' } }}
            />
          </Stack>

          <Stack direction="row" sx={{ gap: 1.5, mt: 1, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <Button variant="contained" color="primary" onClick={handleSave} loading={sending && !confirmDelete}>
              {routine ? 'Guardar cambios' : 'Publicar'}
            </Button>
            {routine && (
              <Button variant="outlined" color="error" startIcon={<DeleteOutlineRounded />} onClick={() => setConfirmDelete(true)} disabled={sending}>
                Borrar rutina
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={confirmDelete} onClose={sending ? undefined : () => setConfirmDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle>¿Borrar la rutina?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Se borra la rutina del {dayLabel} ("{routine?.title}"). A las jugadoras no se les avisa.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={() => setConfirmDelete(false)} disabled={sending}>Volver</Button>
          <Button variant="contained" color="error" onClick={handleDelete} loading={sending}>Borrar</Button>
        </DialogActions>
      </Dialog>
    </ParquetBackground>
  )
}

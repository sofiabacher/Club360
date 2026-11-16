import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import Fab from '@mui/material/Fab'
import Grow from '@mui/material/Grow'
import IconButton from '@mui/material/IconButton'
import InputBase from '@mui/material/InputBase'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { keyframes } from '@mui/material/styles'
import CloseRounded from '@mui/icons-material/CloseRounded'
import SendRounded from '@mui/icons-material/SendRounded'
import ThumbDownRounded from '@mui/icons-material/ThumbDownRounded'
import ThumbUpRounded from '@mui/icons-material/ThumbUpRounded'

import { getBotMenu, getPublicBotMenu, sendBotFeedback, sendBotMessage, sendPublicBotMessage } from '../../api/bot.api.js'
import useAuth from '../../hooks/useAuth.js'
import LylaAvatar from './LylaAvatar.jsx'

const MAX_LENGTH = 300
const UNAVAILABLE = 'Lyla no está disponible en este momento. Reintentá en unos minutos.'

const blink = keyframes`
  0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-3px); }
`

let nextId = 1
const newId = () => nextId++

// La pantalla actual para el bot: la ruta sin la barra inicial ("/my-fees" → "my-fees")
const screenOf = (pathname) => pathname.replace(/^\/+/, '').toLowerCase()

// Mensaje de error de una llamada: el del back (por ejemplo, el 429), o el de "no disponible"
const errorText = (err) => (err?.response?.status === 429 && err.response.data?.message) || UNAVAILABLE

// "Escribiendo…" con tres puntos animados
function Typing() {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, px: 1.5, py: 1, bgcolor: 'background.paper', borderRadius: 1, alignSelf: 'flex-start', boxShadow: 1 }} aria-live="polite">
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>Escribiendo</Typography>
      {[0, 1, 2].map((dot) => (
        <Box key={dot} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'text.secondary', animation: `${blink} 1.2s infinite`, animationDelay: `${dot * 0.2}s` }} />
      ))}
    </Stack>
  )
}

// Burbuja de un mensaje. Las del usuario a la derecha en Azul; las del bot a la izquierda en blanco (el fallback y los
// avisos, en el tono tenue)
function Bubble({ from, warm, children }) {
  const mine = from === 'user'
  return (
    <Box
      sx={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        px: 1.5,
        py: 1,
        borderRadius: 1,
        borderBottomRightRadius: mine ? 4 : 12,
        borderBottomLeftRadius: mine ? 12 : 4,
        bgcolor: mine ? 'secondary.main' : warm ? 'tint.main' : 'background.paper',
        color: mine ? 'secondary.contrastText' : 'text.primary',
        boxShadow: mine ? 0 : 1,
        whiteSpace: 'pre-line',
        overflowWrap: 'anywhere'
      }}
    >
      {children}
    </Box>
  )
}

// Asistente de consultas (P21): Fab Pizarra abajo a la derecha y una ventana de chat (panel en la compu, pantalla completa
// en el celular). Al abrir, el saludo y las categorías del menú (la de la pantalla actual primero); los botones van
// directo a una respuesta y el texto libre lo clasifica el back. El historial vive en el estado: se pierde al recargar.
// Se monta en DashboardLayout solo con bot.use, con key del rol activo (al cambiar de rol, empieza de cero).
// publicMode (P23): el asistente público de la bienvenida y del inicio de sesión, sin sesión: usa /bot/public, se
// presenta como Lyla, la asistente de Club360 y no pide opinión de las respuestas
export default function ChatBot({ publicMode = false }) {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'))
  const location = useLocation()
  const { club } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [waiting, setWaiting] = useState(false)
  const endRef = useRef(null)

  const screen = screenOf(location.pathname)
  const push = (message) => setMessages((current) => [...current, { id: newId(), ...message }])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, waiting, open])

  // El menú (saludo y categorías), pedido con la pantalla actual
  const showMenu = async () => {
    setWaiting(true)
    try {
      const { data } = await (publicMode ? getPublicBotMenu : getBotMenu)(screen)
      push({ from: 'bot', kind: 'menu', text: data.greeting, categories: data.categories })
    } catch (err) {
      push({ from: 'bot', kind: 'error', text: errorText(err) })
    } finally {
      setWaiting(false)
    }
  }

  const handleOpen = () => {
    setOpen(true)
    if (messages.length === 0) showMenu()
  }

  const send = async (payload, userText) => {
    push({ from: 'user', text: userText })
    setWaiting(true)
    try {
      const { data } = await (publicMode ? sendPublicBotMessage : sendBotMessage)({ ...payload, screen })
      push({ from: 'bot', kind: data.responseType, text: data.response, buttons: data.buttons, interactionId: data.interactionId })
    } catch (err) {
      push({ from: 'bot', kind: 'error', text: errorText(err) })
    } finally {
      setWaiting(false)
    }
  }

  const handleButton = (button) => {
    if (waiting) return
    if (button.type === 'menu') {
      push({ from: 'user', text: button.label })
      showMenu()
      return
    }
    send({ type: 'button', intent: button.value }, button.label)
  }

  const handleCategory = (category) => {
    push({ from: 'user', text: category.label })
    push({ from: 'bot', kind: 'category', text: `Preguntas sobre ${category.label.toLowerCase()}:`, buttons: category.questions.map((question) => ({ type: 'intent', value: question.intent, label: question.label })) })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const message = text.trim()
    if (!message || waiting) return
    setText('')
    send({ type: 'text', message }, message)
  }

  const handleFeedback = async (message, useful) => {
    setMessages((current) => current.map((item) => (item.id === message.id ? { ...item, feedback: 'sent' } : item)))
    try {
      await sendBotFeedback({ interactionId: message.interactionId, useful })
    } catch {
      // Si falla, no molesta: el "¡Gracias!" ya se mostró
    }
  }

  const header = (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, px: 2, py: 1.25, bgcolor: 'navy.main', color: 'navy.contrastText', flexShrink: 0 }}>
      <LylaAvatar size={36} />
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>Lyla</Typography>
        <Typography variant="caption" sx={{ display: 'block', opacity: 0.75, lineHeight: 1.3 }} noWrap>
          Asistente de {publicMode ? 'Club360' : club?.name ?? 'tu club'}
        </Typography>
      </Box>
      <IconButton onClick={() => setOpen(false)} aria-label="Cerrar el chat con Lyla" sx={{ color: 'inherit' }}>
        <CloseRounded />
      </IconButton>
    </Stack>
  )

  const conversation = (
    <Stack spacing={1.25} sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5, bgcolor: 'background.default' }} aria-live="polite">
      {messages.map((message) => (
        <Stack key={message.id} spacing={0.75} sx={{ alignItems: message.from === 'user' ? 'flex-end' : 'flex-start' }}>
          <Bubble from={message.from} warm={['fallback', 'blocked', 'error', 'other_profile'].includes(message.kind)}>
            <Typography variant="body2">{message.text}</Typography>
          </Bubble>

          {message.kind === 'menu' && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, width: '100%' }}>
              {message.categories.map((category) => (
                <ButtonBase
                  key={category.id}
                  onClick={() => handleCategory(category)}
                  focusRipple
                  sx={{ p: 1.25, borderRadius: 1, bgcolor: 'background.paper', border: 1, borderColor: 'divider', color: 'navy.main', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center', '&:hover': { borderColor: 'secondary.main' } }}
                >
                  {category.label}
                </ButtonBase>
              ))}
            </Box>
          )}

          {message.buttons?.length > 0 && (
            <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
              {message.buttons.map((button) => (
                <Chip
                  key={`${button.type}-${button.value}`}
                  label={button.label}
                  onClick={() => handleButton(button)}
                  disabled={waiting}
                  size="small"
                  color="secondary"
                  variant={button.type === 'menu' ? 'filled' : 'outlined'}
                  sx={{ height: 'auto', py: 0.5, bgcolor: button.type === 'menu' ? undefined : 'background.paper', '& .MuiChip-label': { whiteSpace: 'normal' } }}
                />
              ))}
            </Stack>
          )}

          {message.interactionId && (
            message.feedback ? (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>¡Gracias!</Typography>
            ) : (
              <Stack direction="row" sx={{ gap: 0.25 }}>
                <Tooltip title="Me sirvió">
                  <IconButton size="small" onClick={() => handleFeedback(message, true)} aria-label="Me sirvió"><ThumbUpRounded sx={{ fontSize: 16 }} /></IconButton>
                </Tooltip>
                <Tooltip title="No me sirvió">
                  <IconButton size="small" onClick={() => handleFeedback(message, false)} aria-label="No me sirvió"><ThumbDownRounded sx={{ fontSize: 16 }} /></IconButton>
                </Tooltip>
              </Stack>
            )
          )}
        </Stack>
      ))}
      {waiting && <Typing />}
      <Box ref={endRef} />
    </Stack>
  )

  const input = (
    <Box component="form" onSubmit={handleSubmit} sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', px: 1.5, pt: 1, pb: 0.75, flexShrink: 0 }}>
      <Stack direction="row" sx={{ alignItems: 'flex-end', gap: 1 }}>
        <InputBase
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, MAX_LENGTH))}
          placeholder="Escribí tu consulta…"
          multiline
          maxRows={3}
          fullWidth
          inputProps={{ maxLength: MAX_LENGTH, 'aria-label': 'Tu consulta' }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) handleSubmit(event)
          }}
          sx={{ fontSize: '0.95rem', py: 0.5 }}
        />
        <IconButton type="submit" color="secondary" disabled={waiting || !text.trim()} aria-label="Enviar">
          <SendRounded />
        </IconButton>
      </Stack>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>No compartas datos personales.</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{text.length}/{MAX_LENGTH}</Typography>
      </Stack>
    </Box>
  )

  const chatWindow = (
    <Stack sx={{ height: '100%' }}>
      {header}
      {conversation}
      {input}
    </Stack>
  )

  return (
    <Box sx={{ displayPrint: 'none' }}>
      {!open && (
        <Tooltip title="Preguntale a Lyla" placement="left">
          <Fab
            onClick={handleOpen}
            aria-label="Abrir el chat con Lyla, la asistente"
            sx={{ position: 'fixed', right: { xs: 16, sm: 24 }, bottom: { xs: 16, sm: 24 }, zIndex: (theme) => theme.zIndex.speedDial, bgcolor: 'navy.main', color: 'navy.contrastText', '&:hover': { bgcolor: 'navy.dark' } }}
          >
            <LylaAvatar size={48} />
          </Fab>
        </Tooltip>
      )}

      {isMobile ? (
        <Dialog open={open} onClose={() => setOpen(false)} fullScreen>
          {chatWindow}
        </Dialog>
      ) : (
        <Grow in={open} style={{ transformOrigin: 'bottom right' }} unmountOnExit>
          <Paper
            elevation={12}
            role="dialog"
            aria-label="Chat con Lyla"
            sx={{ position: 'fixed', right: 24, bottom: 24, width: 380, height: 560, maxHeight: 'calc(100dvh - 48px)', borderRadius: 1.5, overflow: 'hidden', zIndex: (theme) => theme.zIndex.modal - 1 }}
          >
            {chatWindow}
          </Paper>
        </Grow>
      )}
    </Box>
  )
}

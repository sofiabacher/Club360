import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRounded from '@mui/icons-material/RadioButtonUncheckedRounded'

// Política de contraseñas. Es una copia de PASSWORD_RULES en api/src/modules/auth/auth.validator.js:
// si se cambia una, se cambia en las dos.
export const PASSWORD_REQUIREMENTS = [
  { label: 'Al menos 8 caracteres', test: (value) => /^.{8,}$/u.test(value) },
  { label: 'Una mayúscula', test: (value) => /\p{Lu}/u.test(value) },
  { label: 'Una minúscula', test: (value) => /\p{Ll}/u.test(value) },
  { label: 'Un número', test: (value) => /\d/.test(value) },
  { label: 'Un carácter especial (por ejemplo # $ % ! ?)', test: (value) => /[^\p{L}\p{N}\s]/u.test(value) }
]

export const isValidPassword = (value) => PASSWORD_REQUIREMENTS.every((requirement) => requirement.test(value))

// Lista de requisitos que se van marcando mientras se escribe la contraseña
export default function PasswordRequirements({ password }) {
  return (
    <List dense disablePadding sx={{ mt: 1 }}>
      {PASSWORD_REQUIREMENTS.map(({ label, test }) => {
        const ok = test(password)

        return (
          <ListItem key={label} disableGutters sx={{ py: 0 }}>
            <ListItemIcon sx={{ minWidth: 28, color: ok ? 'success.main' : 'text.disabled' }}>
              {ok ? <CheckCircleRounded fontSize="small" /> : <RadioButtonUncheckedRounded fontSize="small" />}
            </ListItemIcon>
            <ListItemText
              primary={label}
              slotProps={{ primary: { variant: 'body2', sx: { color: ok ? 'success.main' : 'text.secondary' } } }}
            />
          </ListItem>
        )
      })}
    </List>
  )
}

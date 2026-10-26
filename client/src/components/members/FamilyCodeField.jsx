import TextField from '@mui/material/TextField'

// Código de vínculo familiar completo: XXXX-XXXX
export const isFamilyCode = (value) => /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(value)

// Pasa lo que se tipea a mayúsculas, deja solo letras y números y agrega el guion después del cuarto carácter
export function formatFamilyCode(value) {
  const chars = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  return chars.length > 4 ? `${chars.slice(0, 4)}-${chars.slice(4)}` : chars
}

// Campo del código de vínculo familiar con el formato XXXX-XXXX. onChange recibe el valor ya formateado
export default function FamilyCodeField({ value, onChange, label = 'Código de vínculo', helperText, ...props }) {
  return (
    <TextField
      label={label}
      value={value}
      onChange={(event) => onChange(formatFamilyCode(event.target.value))}
      placeholder="XXXX-XXXX"
      helperText={helperText}
      autoComplete="off"
      slotProps={{
        htmlInput: {
          maxLength: 9,
          autoCapitalize: 'characters',
          spellCheck: false,
          style: { letterSpacing: '0.12em', fontWeight: 600 }
        }
      }}
      {...props}
    />
  )
}

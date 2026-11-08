import Alert from '@mui/material/Alert'

// Aviso de la pérdida de la condición de socio por mora (socio SUSPENDED). Lo usan el estado de cuenta y el inicio
export default function SuspensionAlert({ delayFee, sx }) {
  return (
    <Alert severity="error" sx={sx}>
      Por tener cuotas impagas hace más de {delayFee} días, se perdió la condición de socio. Mientras tanto no se
      puede ser citada ni inscribirse a deportes. Se recupera sola al regularizar las cuotas.
    </Alert>
  )
}

import { createTheme } from '@mui/material/styles'

// Colores provisorios: falta definir la paleta y el estilo visual de Club360 (decisión D10 de docs/TODO.md)
const theme = createTheme({
  palette: {
    primary: { main: '#1E40AF' },
    secondary: { main: '#F59E0B' },
    background: { default: '#F8FAFC' }
  },
  typography: {
    fontFamily: '"Poppins", "Helvetica", "Arial", sans-serif'
  }
})

export default theme

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { esES } from '@mui/x-date-pickers/locales'
import { es } from 'date-fns/locale/es'

import App from './App.jsx'
import theme from './theme.js'   // Importa también las fuentes (Poppins y Barlow Condensed)
import { AuthProvider } from './context/AuthContext.jsx'

// Textos de los selectores de fecha en español
const pickersLocaleText = esES.components.MuiLocalizationProvider.defaultProps.localeText

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es} localeText={pickersLocaleText}>
          <CssBaseline />
          <AuthProvider>
            <App />
          </AuthProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
)

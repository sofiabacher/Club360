import { createTheme } from '@mui/material/styles'

import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'

// Tema de Club360 según docs/moodboard.png (decisión D10). Todo lo visual sale de acá: no se escriben colores ni fuentes
// sueltos en los componentes. Falta el acento propio de cada club (el color de Valencia está a definir).
const FONT_FAMILY = '"Poppins", "Helvetica", "Arial", sans-serif'
const NUMERIC_FONT_FAMILY = '"Barlow Condensed", sans-serif'

const base = createTheme({
  palette: {
    primary: { main: '#EA6A1F', contrastText: '#FFFFFF' },   // Naranja: lo urgente y la acción principal (un solo botón naranja por vista)
    secondary: { main: '#1E40AF' },                          // Azul: acciones secundarias, links y selección
    success: { main: '#1F8A5B' },
    warning: { main: '#8A5300' },
    error: { main: '#A32929' },
    background: { default: '#F6F7FB', paper: '#FFFFFF' },
    text: { primary: '#0F1B3D', secondary: '#555A68' }
  }
})

const theme = createTheme(base, {
  palette: {
    // Colores propios: con augmentColor quedan con light, dark y contrastText, como los de MUI
    navy: base.palette.augmentColor({ color: { main: '#0F1B3D', contrastText: '#FFFFFF' }, name: 'navy' }),   // Marino: estructura y títulos
    cream: base.palette.augmentColor({ color: { main: '#FBF4E6' }, name: 'cream' }),                          // Crema: fondos cálidos
    burgundy: base.palette.augmentColor({ color: { main: '#8E2C3A' }, name: 'burgundy' })                     // Bordó: guiño al club de barrio
  },

  // Colores de los chips de estado (StatusChip): fondo claro y texto oscuro
  status: {
    ok: { bg: '#E3F4EB', fg: '#16683F' },        // Al día, confirmada, aprobada
    pending: { bg: '#FEF3C7', fg: '#8A5300' },   // Pendiente
    overdue: { bg: '#FCE8E8', fg: '#A32929' },   // Vencida, rechazada, cancelada
    urgent: { bg: '#FDEBDD', fg: '#B4470D' }     // Requiere acción ya (ej. citación sin responder)
  },

  typography: {
    fontFamily: FONT_FAMILY,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
    // Solo para números destacados: resultados, fecha y hora de un partido, número de socio
    numeric: { fontFamily: NUMERIC_FONT_FAMILY, fontWeight: 700, lineHeight: 1.1 }
  },

  shape: { borderRadius: 12 },

  components: {
    MuiTypography: {
      defaultProps: {
        variantMapping: { numeric: 'span' }
      }
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10 }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999 }   // Forma de píldora
      }
    }
  }
})

export default theme

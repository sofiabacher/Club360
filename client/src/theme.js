import { createTheme } from '@mui/material/styles'
import { esES } from '@mui/material/locale'

import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'

// Tema de Club360, dirección visual "Pizarra" (P23, reemplaza la paleta del moodboard): base neutra y fría, Pizarra para
// la estructura y los títulos, y un solo color de acción. Todo lo visual sale de acá: no se escriben colores ni fuentes
// sueltos en los componentes. El acento propio de cada club no está acá: llega en session.club.accentColor (D13).
const FONT_FAMILY = '"Poppins", "Helvetica", "Arial", sans-serif'
const NUMERIC_FONT_FAMILY = '"Barlow Condensed", sans-serif'

const SLATE = '#172033'    // Pizarra: menú lateral, encabezados y títulos
const DIVIDER = '#E1E4EA'
const HEAD_BG = '#F0F2F5'  // Encabezado de las tablas

const base = createTheme({
  palette: {
    primary: { main: '#DD5F1C', contrastText: '#FFFFFF' },   // Naranja: lo urgente y la acción principal (un solo botón naranja por vista)
    secondary: { main: '#2D4A86' },                          // Azul pizarra: acciones secundarias, links y selección
    success: { main: '#1F8A5B' },
    warning: { main: '#8A5300' },
    error: { main: '#A32929' },
    background: { default: '#F5F6F8', paper: '#FFFFFF' },
    text: { primary: SLATE, secondary: '#5C6475' },
    divider: DIVIDER
  },

  // La tipografía va en el primer createTheme: el segundo ya recibe las variantes calculadas y no les cambiaría la fuente.
  // Escala baja: los títulos ordenan la pantalla, no la ocupan
  typography: {
    fontFamily: FONT_FAMILY,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700, fontSize: '2.25rem', lineHeight: 1.2 },
    h4: { fontWeight: 600, fontSize: '1.75rem', lineHeight: 1.25 },
    h5: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.3 },
    h6: { fontWeight: 600, fontSize: '1.05rem', lineHeight: 1.35 },
    overline: { fontWeight: 600, letterSpacing: '0.06em', lineHeight: 2 },
    button: { textTransform: 'none', fontWeight: 600 },
    // Solo para números destacados: resultados, fecha y hora de un partido, número de socio
    numeric: { fontFamily: NUMERIC_FONT_FAMILY, fontWeight: 700, lineHeight: 1.1 }
  },

  // Radio base de 8 px: borderRadius 1 en sx = 8 px, 1.5 = 12 px (diálogos y ventanas flotantes)
  shape: { borderRadius: 8 }
})

// Títulos más chicos en el celular
base.typography.h3[base.breakpoints.down('sm')] = { fontSize: '1.75rem' }
base.typography.h4[base.breakpoints.down('sm')] = { fontSize: '1.375rem' }
base.typography.h5[base.breakpoints.down('sm')] = { fontSize: '1.15rem' }

const theme = createTheme(base, {
  palette: {
    // Colores propios: con augmentColor quedan con light, dark y contrastText, como los de MUI.
    // Se sigue llamando navy para no tocar cada componente: es el color de estructura (Pizarra)
    navy: base.palette.augmentColor({ color: { main: SLATE, contrastText: '#FFFFFF' }, name: 'navy' }),
    // Superficie tenue para íconos, bloques de datos y vistas previas (reemplaza al crema)
    tint: { main: '#EEF1F6', dark: '#DCE2EC' },
    // Pelota de vóley de las ilustraciones (paneles blanco, amarillo y azul, como las de competencia)
    volley: { white: '#FFFFFF', yellow: '#F4C430', blue: '#2C5DB5', seam: '#172033' },
    // Lyla, la asistente de consultas: el avatar de la nena (piel, pelo, mejillas y camiseta)
    lyla: { bg: '#EEF1F6', skin: '#F6D2B8', hair: '#5B3A29', cheek: '#F2A7A0', shirt: '#2D4A86', ink: '#172033' }
  },

  // Colores de los chips de estado (StatusChip): fondo claro y texto oscuro
  status: {
    ok: { bg: '#E3F4EB', fg: '#16683F' },        // Al día, confirmada, aprobada
    pending: { bg: '#FEF3C7', fg: '#8A5300' },   // Pendiente
    overdue: { bg: '#FCE8E8', fg: '#A32929' },   // Vencida, rechazada, cancelada
    urgent: { bg: '#FDEBDD', fg: '#B4470D' },    // Requiere acción ya (ej. citación sin responder)
    critical: { bg: '#A32929', fg: '#FFFFFF' },  // Crítico, relleno rojo (ej. criticidad Crítica de la bitácora)
    neutral: { bg: '#EEF0F4', fg: '#4B5563' }    // Neutro, gris (ej. criticidad Baja de la bitácora)
  },

  components: {
    MuiTypography: {
      defaultProps: {
        variantMapping: { numeric: 'span' }
      }
    },
    MuiButton: {
      defaultProps: { disableElevation: true }
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999 }   // Forma de píldora
      }
    },
    // Borde o sombra, no los dos: las tarjetas van con borde fino y sin sombra. La sombra queda para lo que flota
    // (menús, diálogos, el botón del asistente)
    MuiCard: {
      defaultProps: { variant: 'outlined' }
    },
    MuiPaper: {
      styleOverrides: {
        outlined: { borderColor: DIVIDER }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 12 }
      }
    },
    // Links: sin subrayado salvo al pasar el mouse. Las acciones de las tarjetas usan ActionLink (con flecha)
    MuiLink: {
      defaultProps: { underline: 'hover' }
    },
    // Tablas: encabezado gris claro, filas con hover y cifras tabulares (montos y fechas alineados)
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: DIVIDER, fontVariantNumeric: 'tabular-nums' },
        head: { backgroundColor: HEAD_BG, color: '#5C6475', fontWeight: 600, fontSize: '0.8125rem' }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&.MuiTableRow-hover:hover': { backgroundColor: '#F7F8FA' } }
      }
    },
    MuiTableContainer: {
      styleOverrides: {
        root: { borderRadius: 8 }
      }
    }
  }
}, esES)   // Textos propios de MUI en español (paginación, cerrar, sin opciones...)

export default theme

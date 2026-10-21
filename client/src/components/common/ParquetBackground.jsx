import Box from '@mui/material/Box'

// Textura "parquet" (moodboard): tablas de madera clara con una línea naranja y una azul, como las de la cancha.
// Se usa en las rutinas y en los estados vacíos. Hecha solo con gradientes de CSS.
export default function ParquetBackground({ children, sx }) {
  return (
    <Box
      sx={[
        (theme) => {
          const { light, main, dark } = theme.palette.parquet
          const orange = theme.palette.primary.main
          const blue = theme.palette.secondary.main

          return {
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: main,
            backgroundImage: [
              // Línea azul vertical y línea naranja horizontal (5 px)
              `linear-gradient(90deg, transparent calc(68% - 3px), ${blue} calc(68% - 3px), ${blue} calc(68% + 2px), transparent calc(68% + 2px))`,
              `linear-gradient(180deg, transparent calc(58% - 3px), ${orange} calc(58% - 3px), ${orange} calc(58% + 2px), transparent calc(58% + 2px))`,
              // Juntas horizontales entre tablas
              `repeating-linear-gradient(180deg, transparent 0 179px, ${dark} 179px 180px)`,
              // Tablas verticales en dos tonos, con su junta
              `repeating-linear-gradient(90deg, ${light} 0 69px, ${dark} 69px 70px, ${main} 70px 139px, ${dark} 139px 140px)`
            ].join(', ')
          }
        },
        ...(Array.isArray(sx) ? sx : [sx])
      ]}
    >
      {children}
    </Box>
  )
}

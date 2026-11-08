import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import FitnessCenterRounded from '@mui/icons-material/FitnessCenterRounded'
import OndemandVideoRounded from '@mui/icons-material/OndemandVideoRounded'

import EmptyState from '../common/EmptyState.jsx'
import ParquetBackground from '../common/ParquetBackground.jsx'
import { DAYS_OF_WEEK } from '../../utils/constants.js'
import { formatDayMonth } from '../../utils/format.js'
import { getUploadUrl } from '../../utils/media.js'

// 'AAAA-MM-DD' + días → 'AAAA-MM-DD' (en UTC, para que no influya la zona)
export function shiftDate(date, days) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

const dayName = (dayOfWeek) => DAYS_OF_WEEK.find((day) => day.value === dayOfWeek)?.name ?? ''
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1)

// Día que conviene elegir al abrir una semana: hoy si es de esa semana (y de lunes a viernes); si no, el primero con
// rutina o el lunes
export function defaultDayOf(week) {
  const today = week.days.find((day) => day.date === week.today)
  if (today) return today.dayOfWeek
  return week.days.find((day) => day.routine)?.dayOfWeek ?? 1
}

// Pastillas de los días de lunes a viernes (los que tienen rutina), como en el moodboard ("Rutina de la semana"): verde
// suave con rutina, borde Azul la elegida, gris las vacías y un punto debajo de hoy.
// Sin onSelect se muestran solo para ver (panel de inicio)
export function DayPills({ days, today, selectedDay, onSelect, size = 'medium' }) {
  const small = size === 'small'

  return (
    <Stack direction="row" sx={{ gap: small ? 0.75 : 1, flexWrap: 'wrap' }} role={onSelect ? 'tablist' : undefined}>
      {days.map((day) => {
        const short = DAYS_OF_WEEK.find((item) => item.value === day.dayOfWeek).short
        const selected = day.dayOfWeek === selectedDay
        const isToday = day.date === today

        return (
          <Stack key={day.dayOfWeek} sx={{ alignItems: 'center', gap: 0.5 }}>
            <ButtonBase
              component={onSelect ? 'button' : 'div'}
              disabled={!onSelect}
              onClick={onSelect ? () => onSelect(day.dayOfWeek) : undefined}
              role={onSelect ? 'tab' : undefined}
              aria-selected={onSelect ? selected : undefined}
              aria-label={`${capitalize(dayName(day.dayOfWeek))} ${formatDayMonth(day.date)}${day.routine ? `: ${day.routine.title}` : ': sin rutina'}${isToday ? ' (hoy)' : ''}`}
              focusRipple
              sx={(theme) => ({
                width: small ? 36 : 46,
                height: small ? 36 : 46,
                borderRadius: '50%',
                fontWeight: 700,
                fontSize: small ? '0.85rem' : '1rem',
                border: 2,
                borderColor: selected ? 'secondary.main' : 'transparent',
                bgcolor: day.routine ? theme.status.ok.bg : 'action.hover',
                color: day.routine ? theme.status.ok.fg : 'text.disabled',
                '&.Mui-disabled': { color: day.routine ? theme.status.ok.fg : 'text.disabled' },
                '&.Mui-focusVisible': { outline: 2, outlineStyle: 'solid', outlineColor: theme.palette.secondary.main, outlineOffset: 2 }
              })}
            >
              {short}
            </ButtonBase>
            <Box
              aria-hidden="true"
              sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: isToday ? 'primary.main' : 'transparent' }}
            />
          </Stack>
        )
      })}
    </Stack>
  )
}

// "‹ Semana del 10/11 al 16/11 ›" con el botón "Esta semana"
export function WeekNavigator({ weekStart, weekEnd, currentWeekStart, onChange, disabled = false }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <IconButton onClick={() => onChange(shiftDate(weekStart, -7))} disabled={disabled} aria-label="Semana anterior" color="secondary">
        <ChevronLeftRounded />
      </IconButton>
      <Typography sx={{ fontWeight: 600, color: 'navy.main', minWidth: 190, textAlign: 'center' }}>
        Semana del {formatDayMonth(weekStart)} al {formatDayMonth(weekEnd)}
      </Typography>
      <IconButton onClick={() => onChange(shiftDate(weekStart, 7))} disabled={disabled} aria-label="Semana siguiente" color="secondary">
        <ChevronRightRounded />
      </IconButton>
      {weekStart !== currentWeekStart && (
        <Button size="small" color="secondary" onClick={() => onChange(currentWeekStart)} disabled={disabled}>Esta semana</Button>
      )}
    </Stack>
  )
}

// Tarjeta de lectura de la rutina de un día: título, descripción con sus saltos de línea, imagen (se abre en grande) y
// el botón "Ver video". Sin rutina, el estado vacío
export function RoutineDayCard({ day }) {
  const [zoom, setZoom] = useState(false)
  const routine = day?.routine
  const heading = day ? `${capitalize(dayName(day.dayOfWeek))} ${formatDayMonth(day.date)}` : ''

  if (!routine) {
    return <EmptyState icon={FitnessCenterRounded} title={heading} description="No hay rutina cargada para este día." />
  }

  const imageSrc = getUploadUrl(routine.imageUrl)

  return (
    <ParquetBackground sx={{ borderRadius: 3, p: { xs: 1.5, sm: 3 } }}>
      <Card elevation={6} sx={{ borderRadius: 3, maxWidth: 720, mx: 'auto' }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.5 }}>{heading}</Typography>
          <Typography variant="h6" component="h3" sx={{ color: 'navy.main', overflowWrap: 'anywhere' }}>{routine.title}</Typography>
          <Typography sx={{ mt: 1.5, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{routine.description}</Typography>

          {imageSrc && (
            <ButtonBase onClick={() => setZoom(true)} aria-label="Ver la imagen en grande" sx={{ mt: 2, borderRadius: 2, overflow: 'hidden', display: 'block', width: '100%' }}>
              <Box component="img" src={imageSrc} alt={`Imagen de la rutina: ${routine.title}`} sx={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block' }} />
            </ButtonBase>
          )}

          {routine.videoUrl && (
            <Button
              href={routine.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              color="secondary"
              startIcon={<OndemandVideoRounded />}
              sx={{ mt: 2 }}
            >
              Ver video
            </Button>
          )}
        </CardContent>
      </Card>

      {imageSrc && (
        <Dialog open={zoom} onClose={() => setZoom(false)} maxWidth="lg">
          <IconButton onClick={() => setZoom(false)} aria-label="Cerrar" sx={{ position: 'absolute', right: 8, top: 8, bgcolor: 'background.paper', '&:hover': { bgcolor: 'background.paper' } }}>
            <CloseRounded />
          </IconButton>
          <Box component="img" src={imageSrc} alt={`Imagen de la rutina: ${routine.title}`} sx={{ maxWidth: '100%', maxHeight: '85vh', display: 'block' }} />
        </Dialog>
      )}
    </ParquetBackground>
  )
}

// Vista de una semana de rutinas: el navegador de semanas, las pastillas de los días y, debajo, el día elegido
// (la tarjeta de lectura, o lo que devuelva renderDay; por ejemplo, el editor de la preparadora).
//   - week: { weekStart, weekEnd, today, currentWeekStart, days } (days: de lunes a viernes)
export default function RoutineWeekView({ week, selectedDay, onSelectDay, onChangeWeek, loading = false, renderDay }) {
  const day = week.days.find((item) => item.dayOfWeek === selectedDay) ?? week.days[0]

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2, justifyContent: 'space-between', alignItems: { md: 'center' } }}>
        <WeekNavigator weekStart={week.weekStart} weekEnd={week.weekEnd} currentWeekStart={week.currentWeekStart} onChange={onChangeWeek} disabled={loading} />
        <DayPills days={week.days} today={week.today} selectedDay={day.dayOfWeek} onSelect={onSelectDay} />
      </Stack>

      <Box sx={{ opacity: loading ? 0.6 : 1 }}>
        {renderDay ? renderDay(day) : <RoutineDayCard day={day} />}
      </Box>
    </Stack>
  )
}

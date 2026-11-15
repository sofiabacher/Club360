import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import CloseRounded from '@mui/icons-material/CloseRounded'
import InsightsRounded from '@mui/icons-material/InsightsRounded'

import { getMemberTracking, getTracking } from '../../api/routines.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import GoalsList from '../../components/routines/GoalsList.jsx'
import PeriodSelector from '../../components/routines/PeriodSelector.jsx'
import ProgressOverview from '../../components/routines/ProgressOverview.jsx'
import { WeekNavigator } from '../../components/routines/RoutineWeekView.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { DAYS_OF_WEEK } from '../../utils/constants.js'
import { formatDayMonth } from '../../utils/format.js'
import { LOG_STATUS_INFO, effortText, percentText } from '../../utils/tracking.js'

const dayShort = (dayOfWeek) => DAYS_OF_WEEK.find((day) => day.value === dayOfWeek)?.short ?? ''

// Celda de un registro: el símbolo del estado con su color y el esfuerzo ("✓ 4"); la nota al pasar o tocar.
// Sin registro: "–" (o nada si la rutina todavía no llegó)
function LogCell({ log, future }) {
  if (!log) {
    return <Typography variant="body2" sx={{ color: 'text.disabled' }} aria-label={future ? 'Todavía no' : 'Sin registrar'}>{future ? '' : '–'}</Typography>
  }

  const info = LOG_STATUS_INFO[log.status]
  const content = (
    <Box
      component="span"
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: 2,
        fontWeight: 700,
        bgcolor: theme.status[info.status].bg,
        color: theme.status[info.status].fg,
        textDecoration: log.note ? 'underline dotted' : 'none'
      })}
      aria-label={`${info.label}${log.effort ? `, esfuerzo ${log.effort}` : ''}${log.note ? `. Nota: ${log.note}` : ''}`}
    >
      {info.symbol}{log.effort ? ` ${log.effort}` : ''}
    </Box>
  )

  if (!log.note) return content
  return (
    <Tooltip title={log.note} enterTouchDelay={0} arrow>
      <ButtonBase sx={{ borderRadius: 2 }}>{content}</ButtonBase>
    </Tooltip>
  )
}

// Detalle de una jugadora en un Drawer: su progreso (los mismos gráficos que "Mi progreso") y sus objetivos, solo lectura
function MemberDrawer({ memberId, name, onClose }) {
  const [weeks, setWeeks] = useState(8)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!memberId) return
    setError('')
    getMemberTracking(memberId, weeks)
      .then(({ data: result }) => setData(result))
      .catch((err) => setError(getErrorMessage(err)))
  }, [memberId, weeks])

  useEffect(() => { if (!memberId) setData(null) }, [memberId])

  return (
    <Drawer anchor="right" open={Boolean(memberId)} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', md: 760 }, bgcolor: 'background.default' } } }}>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="h6" component="h2" sx={{ color: 'navy.main' }}>{data?.member.name ?? name}</Typography>
            {data && <Typography variant="body2" sx={{ color: 'text.secondary' }}>{data.categories.map((item) => `${item.name} · ${item.league.name}`).join(' / ')}</Typography>}
          </Box>
          <IconButton onClick={onClose} aria-label="Cerrar"><CloseRounded /></IconButton>
        </Stack>

        <PeriodSelector value={weeks} onChange={setWeeks} />

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {!data && !error && <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box>}

        {data && (
          <Stack spacing={3} sx={{ mt: 2 }}>
            <ProgressOverview progress={data.progress} weeks={weeks} />
            <Card>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h6" component="h3" sx={{ color: 'navy.main', mb: 1 }}>Objetivos</Typography>
                <GoalsList goals={data.goals} />
              </CardContent>
            </Card>
          </Stack>
        )}
      </Box>
    </Drawer>
  )
}

// Seguimiento (routines.viewTracking): la semana de una categoría del alcance, con una fila por jugadora y una columna por
// rutina (en el celular, una tarjeta por jugadora). Al tocar una jugadora, su progreso y sus objetivos en un Drawer
export default function TrackingPage() {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('md'))
  const [categoryId, setCategoryId] = useState('')
  const [weekStart, setWeekStart] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)   // { id, name }

  const load = useCallback(() => {
    setLoading(true)
    getTracking(categoryId || undefined, weekStart || undefined)
      .then(({ data: result }) => { setData(result); setError('') })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [categoryId, weekStart])

  useEffect(() => { load() }, [load])

  const header = (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Seguimiento</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>Cómo les fue a las jugadoras con las rutinas de la semana.</Typography>
    </Box>
  )

  if (error && !data) return <>{header}<Alert severity="error">{error}</Alert></>
  if (!data) return <>{header}<Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress color="secondary" /></Box></>

  if (data.categories.length === 0) {
    return <>{header}<EmptyState icon={InsightsRounded} title="Sin categorías" description="Todavía no tenés categorías asignadas." /></>
  }

  const isFuture = (routine) => routine.date > data.today

  return (
    <>
      {header}

      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 2, mb: 3, alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
        <TextField select label="Categoría" value={data.category.id} onChange={(event) => setCategoryId(event.target.value)} size="small" sx={{ minWidth: 260 }}>
          {data.categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name} · {category.league.name}</MenuItem>)}
        </TextField>
        <WeekNavigator weekStart={data.weekStart} weekEnd={data.weekEnd} currentWeekStart={data.currentWeekStart} onChange={setWeekStart} disabled={loading} />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {data.routines.length === 0 || data.players.length === 0 ? (
        <EmptyState
          icon={InsightsRounded}
          title={data.routines.length === 0 ? 'Sin rutinas esta semana' : 'Sin jugadoras'}
          description={data.routines.length === 0 ? 'No hay rutinas cargadas en esta semana para la categoría.' : 'La categoría no tiene jugadoras activas.'}
        />
      ) : isMobile ? (
        <Stack spacing={1.5} sx={{ opacity: loading ? 0.6 : 1 }}>
          {data.players.map((player) => (
            <Card key={player.member.id}>
              <CardActionArea onClick={() => setSelected(player.member)}>
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
                    <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>{player.member.name}</Typography>
                    <Typography variant="numeric" sx={{ fontSize: '1.3rem', color: 'navy.main' }}>{percentText(player.compliance)}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap', mt: 1 }}>
                    {data.routines.map((routine) => (
                      <Stack key={routine.id} sx={{ alignItems: 'center', gap: 0.25 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{dayShort(routine.dayOfWeek)} {formatDayMonth(routine.date)}</Typography>
                        <LogCell log={player.logs[routine.id]} future={isFuture(routine)} />
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      ) : (
        <Card sx={{ opacity: loading ? 0.6 : 1 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Jugadora</TableCell>
                  {data.routines.map((routine) => (
                    <TableCell key={routine.id} align="center">
                      <Tooltip title={routine.title}><span>{dayShort(routine.dayOfWeek)} {formatDayMonth(routine.date)}</span></Tooltip>
                    </TableCell>
                  ))}
                  <TableCell align="right">Cumplimiento</TableCell>
                  <TableCell align="right">Esfuerzo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.players.map((player) => (
                  <TableRow key={player.member.id} hover onClick={() => setSelected(player.member)} sx={{ cursor: 'pointer' }}>
                    <TableCell sx={{ fontWeight: 600, color: 'navy.main' }}>{player.member.name}</TableCell>
                    {data.routines.map((routine) => (
                      <TableCell key={routine.id} align="center" onClick={(event) => player.logs[routine.id]?.note && event.stopPropagation()}>
                        <LogCell log={player.logs[routine.id]} future={isFuture(routine)} />
                      </TableCell>
                    ))}
                    <TableCell align="right"><Typography variant="numeric" sx={{ fontSize: '1.15rem' }}>{percentText(player.compliance)}</Typography></TableCell>
                    <TableCell align="right">{effortText(player.effort)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      <MemberDrawer memberId={selected?.id} name={selected?.name} onClose={() => setSelected(null)} />
    </>
  )
}

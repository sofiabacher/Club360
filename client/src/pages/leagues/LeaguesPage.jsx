import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import AddRounded from '@mui/icons-material/AddRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import EmojiEventsRounded from '@mui/icons-material/EmojiEventsRounded'
import MoreVertRounded from '@mui/icons-material/MoreVertRounded'

import {
  deactivateCategory,
  deactivateLeague,
  getLeagues,
  reactivateCategory,
  reactivateLeague
} from '../../api/leagues.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import CategoryFormDialog from '../../components/leagues/CategoryFormDialog.jsx'
import LeagueFormDialog from '../../components/leagues/LeagueFormDialog.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`

// Confirmaciones de las bajas (las reactivaciones no piden confirmación)
const CONFIRMS = {
  league: {
    title: 'Dar de baja la liga',
    text: (item) => `La liga ${item.name} y sus categorías quedan dadas de baja. Conservan su historial y se pueden reactivar (las categorías, una por una).`,
    request: (item) => deactivateLeague(item.id),
    done: 'Dimos de baja la liga.'
  },
  category: {
    title: 'Dar de baja la categoría',
    text: (item) => `La categoría ${item.name} deja de aceptar asignaciones y no aparece en "Mis categorías". Conserva sus jugadoras y su staff como historial.`,
    request: (item) => deactivateCategory(item.id),
    done: 'Dimos de baja la categoría.'
  }
}

// Ligas del alcance del usuario con sus categorías. Pantalla de leagues.manage
export default function LeaguesPage() {
  const navigate = useNavigate()

  const [includeInactive, setIncludeInactive] = useState(false)
  const [data, setData] = useState(null)   // { leagues, sports, year }
  const [loadError, setLoadError] = useState('')

  const [leagueDialog, setLeagueDialog] = useState({ open: false, league: null })
  const [categoryDialog, setCategoryDialog] = useState({ open: false, league: null, category: null })
  const [menu, setMenu] = useState(null)   // { anchor, type: 'league' | 'category', item, league }
  const [confirm, setConfirm] = useState(null)   // { type, item }
  const [running, setRunning] = useState(false)
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })   // Snackbar
  const showNotice = (severity, message) => setNotice({ open: true, severity, message })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  const load = useCallback(() => getLeagues({ includeInactive })
    .then(({ data: result }) => {
      setData(result)
      setLoadError('')
    })
    .catch((err) => setLoadError(getErrorMessage(err))), [includeInactive])

  useEffect(() => {
    load()
  }, [load])

  const closeMenu = () => setMenu(null)

  const handleSaved = (message) => {
    setLeagueDialog({ open: false, league: null })
    setCategoryDialog({ open: false, league: null, category: null })
    showNotice('success', message)
    load()
  }

  const reactivate = async (type, item) => {
    closeMenu()

    try {
      await (type === 'league' ? reactivateLeague(item.id) : reactivateCategory(item.id))
      showNotice('success', type === 'league' ? 'Reactivamos la liga. Sus categorías se reactivan una por una.' : 'Reactivamos la categoría.')
      load()
    } catch (err) {
      showNotice('error', getErrorMessage(err))
    }
  }

  const runConfirm = async () => {
    const { request, done } = CONFIRMS[confirm.type]
    setRunning(true)

    try {
      await request(confirm.item)
      showNotice('success', done)
      load()
    } catch (err) {
      showNotice('error', getErrorMessage(err))
    } finally {
      setRunning(false)
      setConfirm(null)
    }
  }

  if (loadError && !data) return <Alert severity="error">{loadError}</Alert>

  if (!data) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress color="secondary" />
      </Box>
    )
  }

  const { leagues, sports, year } = data

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Ligas y categorías</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Las jugadoras y el staff se asignan a cada categoría. Edades de la temporada {year}.
          </Typography>
        </Box>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={<Switch checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} color="secondary" />}
            label="Mostrar dadas de baja"
          />
          <Button variant="contained" color="primary" startIcon={<AddRounded />} onClick={() => setLeagueDialog({ open: true, league: null })}>
            Nueva liga
          </Button>
        </Stack>
      </Stack>

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      {leagues.length === 0 && (
        <EmptyState
          icon={EmojiEventsRounded}
          title="Sin ligas"
          description="Todavía no hay ligas. Creá la primera para empezar a organizar las categorías."
        />
      )}

      <Stack spacing={3}>
        {leagues.map((league) => (
          <Card key={league.id} sx={{ opacity: league.isActive ? 1 : 0.75 }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="h6" component="h3" sx={{ color: 'navy.main' }}>{league.name}</Typography>
                    {!league.isActive && <Chip label="Dada de baja" size="small" sx={{ fontWeight: 600 }} />}
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {league.clubSport.name} · {league.ageScaleLabel}
                  </Typography>
                </Box>
                <IconButton aria-label={`Acciones de ${league.name}`} onClick={(event) => setMenu({ anchor: event.currentTarget, type: 'league', item: league })}>
                  <MoreVertRounded />
                </IconButton>
              </Stack>

              <Divider sx={{ my: 2 }} />

              {league.categories.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                  {league.hasCategories ? 'Sus categorías están dadas de baja.' : 'Todavía no tiene categorías.'}
                </Typography>
              )}

              <Stack divider={<Divider flexItem />}>
                {league.categories.map((category) => (
                  <Stack
                    key={category.id}
                    direction="row"
                    sx={{ alignItems: 'center', gap: 1, py: 1.25, opacity: category.isActive ? 1 : 0.7 }}
                  >
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>{category.name}</Typography>
                        <Chip label={category.ageGroupLabel} size="small" variant="outlined" color="secondary" />
                        {!category.isActive && <Chip label="Dada de baja" size="small" sx={{ fontWeight: 600 }} />}
                      </Stack>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {plural(category.playerCount, 'jugadora', 'jugadoras')} · {category.staffCount} staff
                      </Typography>
                    </Box>
                    <IconButton
                      aria-label={`Acciones de ${category.name}`}
                      onClick={(event) => setMenu({ anchor: event.currentTarget, type: 'category', item: category, league })}
                    >
                      <MoreVertRounded />
                    </IconButton>
                    <Button color="secondary" endIcon={<ChevronRightRounded />} onClick={() => navigate(`/leagues/categories/${category.id}`)} sx={{ flexShrink: 0 }}>
                      Ver
                    </Button>
                  </Stack>
                ))}
              </Stack>

              {league.isActive && (
                <Button color="secondary" startIcon={<AddRounded />} onClick={() => setCategoryDialog({ open: true, league, category: null })} sx={{ mt: 1 }}>
                  Agregar categoría
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={closeMenu}>
        {menu?.type === 'league' && [
          <MenuItem key="edit" onClick={() => { setLeagueDialog({ open: true, league: menu.item }); closeMenu() }}>Editar</MenuItem>,
          menu.item.isActive
            ? <MenuItem key="off" onClick={() => { setConfirm({ type: 'league', item: menu.item }); closeMenu() }} sx={{ color: 'error.main' }}>Dar de baja</MenuItem>
            : <MenuItem key="on" onClick={() => reactivate('league', menu.item)}>Reactivar</MenuItem>
        ]}
        {menu?.type === 'category' && [
          <MenuItem key="edit" onClick={() => { setCategoryDialog({ open: true, league: menu.league, category: menu.item }); closeMenu() }}>Editar nombre</MenuItem>,
          menu.item.isActive
            ? <MenuItem key="off" onClick={() => { setConfirm({ type: 'category', item: menu.item }); closeMenu() }} sx={{ color: 'error.main' }}>Dar de baja</MenuItem>
            : <MenuItem key="on" onClick={() => reactivate('category', menu.item)} disabled={!menu.league.isActive}>Reactivar</MenuItem>
        ]}
      </Menu>

      <LeagueFormDialog
        open={leagueDialog.open}
        league={leagueDialog.league}
        sports={sports}
        onClose={() => setLeagueDialog({ open: false, league: null })}
        onSaved={(saved, message) => handleSaved(message)}
      />

      <CategoryFormDialog
        open={categoryDialog.open}
        league={categoryDialog.league}
        category={categoryDialog.category}
        year={year}
        onClose={() => setCategoryDialog({ open: false, league: null, category: null })}
        onSaved={(saved, message) => handleSaved(message)}
      />

      <Dialog open={Boolean(confirm)} onClose={running ? undefined : () => setConfirm(null)}>
        {confirm && (
          <>
            <DialogTitle>{CONFIRMS[confirm.type].title}</DialogTitle>
            <DialogContent>
              <DialogContentText>{CONFIRMS[confirm.type].text(confirm.item)}</DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button color="secondary" onClick={() => setConfirm(null)} disabled={running}>Cancelar</Button>
              <Button variant="contained" color="error" onClick={runConfirm} loading={running}>Dar de baja</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar open={notice.open} autoHideDuration={5000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={closeNotice}>{notice.message}</Alert>
      </Snackbar>
    </>
  )
}

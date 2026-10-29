import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import BadgeRounded from '@mui/icons-material/BadgeRounded'
import GroupAddRounded from '@mui/icons-material/GroupAddRounded'
import PersonAddRounded from '@mui/icons-material/PersonAddRounded'
import SportsVolleyballRounded from '@mui/icons-material/SportsVolleyballRounded'

import { getCategory, unassignPlayer, unassignStaff } from '../../api/leagues.api.js'
import EmptyState from '../../components/common/EmptyState.jsx'
import AddPlayersDialog from '../../components/leagues/AddPlayersDialog.jsx'
import AddStaffDialog from '../../components/leagues/AddStaffDialog.jsx'
import { ageGroupText } from '../../components/leagues/CategoryFormDialog.jsx'
import PlayerStatusChips from '../../components/leagues/PlayerStatusChips.jsx'
import usePermission from '../../hooks/usePermission.js'
import { getErrorMessage } from '../../utils/apiErrors.js'

const TABS = { PLAYERS: 'players', STAFF: 'staff' }

// Fila de la lista: contenido a la izquierda y la acción a la derecha (se apila en el celular)
function Row({ children, action }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 1, px: { xs: 2, sm: 3 }, py: 1.5 }}>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
      {action}
    </Stack>
  )
}

// Detalle de una categoría: jugadoras y staff asignados. Se ve con leagues.manage, leagues.assignPlayers o
// leagues.assignStaff; cada pestaña se edita solo con su permiso de asignación
export default function CategoryDetailPage() {
  const { id } = useParams()
  const { hasPermission } = usePermission()
  const canManage = hasPermission('leagues.manage')
  const canAssignPlayers = hasPermission('leagues.assignPlayers')
  const canAssignStaff = hasPermission('leagues.assignStaff')
  const showPlayers = canAssignPlayers || canManage
  const showStaff = canAssignStaff || canManage

  const [category, setCategory] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState(showPlayers ? TABS.PLAYERS : TABS.STAFF)
  const [dialog, setDialog] = useState(null)   // 'players' | 'staff'
  const [removal, setRemoval] = useState(null)   // { type, id, name }
  const [running, setRunning] = useState(false)
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })   // Snackbar
  const showNotice = (severity, message) => setNotice({ open: true, severity, message })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  useEffect(() => {
    getCategory(id)
      .then(({ data }) => setCategory(data))
      .catch((err) => setLoadError(getErrorMessage(err)))
  }, [id])

  const handleSaved = (data, message) => {
    setCategory(data)
    setDialog(null)
    showNotice('success', message)
  }

  const runRemoval = async () => {
    setRunning(true)

    try {
      const { data } = removal.type === TABS.PLAYERS ? await unassignPlayer(id, removal.id) : await unassignStaff(id, removal.id)
      setCategory(data)
      showNotice('success', `Quitamos a ${removal.name} de la categoría.`)
    } catch (err) {
      showNotice('error', getErrorMessage(err))
    } finally {
      setRunning(false)
      setRemoval(null)
    }
  }

  if (loadError) return <Alert severity="error">{loadError}</Alert>

  if (!category) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
        <CircularProgress color="secondary" />
      </Box>
    )
  }

  const editable = category.isActive
  const removeButton = (type, itemId, name) => (
    <Button color="error" size="small" onClick={() => setRemoval({ type, id: itemId, name })} sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, flexShrink: 0 }}>
      Quitar
    </Button>
  )

  return (
    <>
      {canManage && (
        <Button component={RouterLink} to="/leagues" color="secondary" startIcon={<ArrowBackRounded />} sx={{ mb: 2 }}>
          Ligas y categorías
        </Button>
      )}

      <Box sx={{ mb: 3 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>{category.name}</Typography>
          <Chip label={category.ageGroup.label} size="small" variant="outlined" color="secondary" />
          {!category.isActive && <Chip label="Dada de baja" size="small" sx={{ fontWeight: 600 }} />}
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {category.league.name} · {category.sport.name} · {ageGroupText(category.ageGroup, category.year)}
        </Typography>
      </Box>

      {!category.isActive && (
        <Alert severity="info" sx={{ mb: 3 }}>
          La categoría está dada de baja: conserva su historial pero no acepta asignaciones.
        </Alert>
      )}

      <Card>
        <Tabs value={tab} onChange={(event, value) => setTab(value)} textColor="secondary" indicatorColor="secondary" variant="fullWidth">
          {showPlayers && <Tab value={TABS.PLAYERS} label={`Jugadoras (${category.players.length})`} />}
          {showStaff && <Tab value={TABS.STAFF} label={`Staff (${category.staff.length})`} />}
        </Tabs>
        <Divider />

        {tab === TABS.PLAYERS && (
          <Box>
            {canAssignPlayers && editable && (
              <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2 }}>
                <Button variant="contained" color="primary" startIcon={<GroupAddRounded />} onClick={() => setDialog(TABS.PLAYERS)}>
                  Agregar jugadoras
                </Button>
              </Box>
            )}

            {category.players.length === 0 ? (
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <EmptyState icon={SportsVolleyballRounded} title="Sin jugadoras" description="Todavía no hay jugadoras en esta categoría." />
              </Box>
            ) : (
              <Stack divider={<Divider flexItem />} sx={{ py: 1 }}>
                {category.players.map((player) => (
                  <Row key={player.memberId} action={canAssignPlayers && removeButton(TABS.PLAYERS, player.memberId, player.name)}>
                    <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
                      <Typography variant="numeric" sx={{ fontSize: '1.2rem', color: 'navy.main' }}>{player.numMember}</Typography>
                      <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>{player.name}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{player.seasonAge} años en {category.year}</Typography>
                    </Stack>
                    <Box sx={{ mt: 0.5 }}>
                      <PlayerStatusChips memberStateId={player.memberStateId} exceedsAge={player.exceedsAge} />
                    </Box>
                  </Row>
                ))}
              </Stack>
            )}
          </Box>
        )}

        {tab === TABS.STAFF && (
          <Box>
            {canAssignStaff && editable && (
              <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2 }}>
                <Button variant="contained" color="primary" startIcon={<PersonAddRounded />} onClick={() => setDialog(TABS.STAFF)}>
                  Agregar staff
                </Button>
              </Box>
            )}

            {category.staff.length === 0 ? (
              <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <EmptyState icon={BadgeRounded} title="Sin staff" description="Todavía no hay entrenadoras ni preparadoras físicas en esta categoría." />
              </Box>
            ) : (
              <Stack divider={<Divider flexItem />} sx={{ py: 1 }}>
                {category.staff.map((person) => (
                  <Row key={person.staffId} action={canAssignStaff && removeButton(TABS.STAFF, person.staffId, person.name)}>
                    <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>{person.name}</Typography>
                    <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                      {person.roles.map((role) => <Chip key={role} label={role} size="small" variant="outlined" color="secondary" />)}
                      {!person.isActiveStaff && <Chip label="Ya no es staff" size="small" sx={{ fontWeight: 600 }} />}
                    </Stack>
                  </Row>
                ))}
              </Stack>
            )}
          </Box>
        )}
      </Card>

      <AddPlayersDialog open={dialog === TABS.PLAYERS} category={category} onClose={() => setDialog(null)} onSaved={handleSaved} />
      <AddStaffDialog open={dialog === TABS.STAFF} category={category} onClose={() => setDialog(null)} onSaved={handleSaved} />

      <Dialog open={Boolean(removal)} onClose={running ? undefined : () => setRemoval(null)}>
        <DialogTitle>Quitar de la categoría</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Querés quitar a {removal?.name} de {category.name}? Se puede volver a agregar cuando quieras.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={() => setRemoval(null)} disabled={running}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={runRemoval} loading={running}>Quitar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={notice.open} autoHideDuration={5000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={closeNotice}>{notice.message}</Alert>
      </Snackbar>
    </>
  )
}

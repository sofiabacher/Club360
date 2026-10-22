import { useCallback, useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import Pagination from '@mui/material/Pagination'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import SearchRounded from '@mui/icons-material/SearchRounded'

import { getPermissions, getUsers } from '../../api/access.api.js'
import UserAccessDrawer from '../../components/access/UserAccessDrawer.jsx'
import StatusChip from '../../components/common/StatusChip.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { USER_STATES } from '../../utils/constants.js'

// Estado del usuario en StatusChip (los DELETED no llegan a esta lista)
const USER_STATE_CHIPS = {
  [USER_STATES.ACTIVE]: { status: 'ok', label: 'Activo' },
  [USER_STATES.PENDING]: { status: 'pending', label: 'Pendiente' },
  [USER_STATES.BLOCKED]: { status: 'overdue', label: 'Bloqueado' }
}

function UserState({ userStateId }) {
  const chip = USER_STATE_CHIPS[userStateId]
  return chip ? <StatusChip status={chip.status} label={chip.label} /> : null
}

function RoleChips({ roles }) {
  if (roles.length === 0) return <Typography variant="body2" sx={{ color: 'text.secondary' }}>Sin roles</Typography>

  return (
    <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
      {roles.map((role) => <Chip key={role.id} label={role.name} size="small" variant="outlined" />)}
    </Stack>
  )
}

// Usuarios del club con sus roles; al tocar uno se abre el panel para asignar roles y permisos directos.
// Pantalla de access.assignRoles
export default function UsersRolesPage() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))

  const [search, setSearch] = useState('')
  const [query, setQuery] = useState({ search: '', page: 1 })   // Lo que se pidió al back
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [permissionGroups, setPermissionGroups] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' })   // Snackbar
  const showNotice = (severity, message) => setNotice({ open: true, severity, message })
  const closeNotice = () => setNotice((current) => ({ ...current, open: false }))

  // La búsqueda se manda cuando se deja de escribir y vuelve a la primera página
  useEffect(() => {
    const timer = setTimeout(() => setQuery((current) => (
      current.search === search.trim() ? current : { search: search.trim(), page: 1 }
    )), 350)

    return () => clearTimeout(timer)
  }, [search])

  const loadUsers = useCallback(() => {
    setLoading(true)
    return getUsers(query)
      .then(({ data }) => {
        setResult(data)
        setError('')
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [query])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    getPermissions()
      .then(({ data }) => setPermissionGroups(data))
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  const users = result?.items ?? []

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Usuarios y roles</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Tocá un usuario para asignarle roles o permisos directos.
          </Typography>
        </Box>
        <TextField
          placeholder="Buscar por nombre, usuario o email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          size="small"
          sx={{ width: { xs: '100%', sm: 320 } }}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> },
            htmlInput: { maxLength: 100, 'aria-label': 'Buscar usuarios' }
          }}
        />
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!result && loading && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress color="secondary" />
        </Box>
      )}

      {result && users.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          {query.search ? `No encontramos usuarios para "${query.search}".` : 'Todavía no hay usuarios en el club.'}
        </Paper>
      )}

      {users.length > 0 && (isDesktop ? (
        <TableContainer component={Paper} variant="outlined" sx={{ opacity: loading ? 0.6 : 1 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Roles</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover onClick={() => setSelectedId(user.id)} sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'navy.main' }}>{user.fullName}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{user.email}</Typography>
                  </TableCell>
                  <TableCell>{user.username ?? '—'}</TableCell>
                  <TableCell><UserState userStateId={user.userStateId} /></TableCell>
                  <TableCell><RoleChips roles={user.roles} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Stack spacing={1.5} sx={{ opacity: loading ? 0.6 : 1 }}>
          {users.map((user) => (
            <Card key={user.id} variant="outlined">
              <CardActionArea onClick={() => setSelectedId(user.id)}>
                <CardContent>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, color: 'navy.main' }} noWrap>{user.fullName}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>{user.username ?? user.email}</Typography>
                    </Box>
                    <UserState userStateId={user.userStateId} />
                  </Stack>
                  <Box sx={{ mt: 1.5 }}><RoleChips roles={user.roles} /></Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      ))}

      {result && result.totalPages > 1 && (
        <Stack sx={{ alignItems: 'center', mt: 3 }}>
          <Pagination
            count={result.totalPages}
            page={result.page}
            onChange={(event, page) => setQuery((current) => ({ ...current, page }))}
            color="secondary"
          />
        </Stack>
      )}

      <UserAccessDrawer
        userId={selectedId}
        permissionGroups={permissionGroups}
        onClose={() => setSelectedId(null)}
        onChanged={loadUsers}
        onNotice={showNotice}
      />

      <Snackbar open={notice.open} autoHideDuration={5000} onClose={closeNotice} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={notice.severity} variant="filled" onClose={closeNotice}>{notice.message}</Alert>
      </Snackbar>
    </>
  )
}

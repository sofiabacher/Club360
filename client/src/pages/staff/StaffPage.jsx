import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Paper from '@mui/material/Paper'
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
import PersonAddRounded from '@mui/icons-material/PersonAddRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'

import { getStaffList, getStaffOptions } from '../../api/staff.api.js'
import StaffStatusChip from '../../components/staff/StaffStatusChip.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'

const STATE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'pending', label: 'Pendientes de activación' },
  { value: 'inactive', label: 'Ex staff' }
]

function RoleChips({ roles }) {
  if (roles.length === 0) return <Typography variant="body2" sx={{ color: 'text.secondary' }}>—</Typography>

  return (
    <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
      {roles.map((role) => <Chip key={role} label={role} size="small" variant="outlined" color="secondary" />)}
    </Stack>
  )
}

// Staff del club con búsqueda y filtros. Tocar una persona abre su detalle. Pantalla de staff.manage
export default function StaffPage() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const navigate = useNavigate()

  const [roleOptions, setRoleOptions] = useState([])
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState({ search: '', role: '', state: '', page: 1 })   // Lo que se pidió al back
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getStaffOptions()
      .then(({ data }) => setRoleOptions(data.roles))
      .catch(() => setRoleOptions([]))
  }, [])

  // La búsqueda se manda cuando se deja de escribir y vuelve a la primera página
  useEffect(() => {
    const timer = setTimeout(() => setQuery((current) => (
      current.search === search.trim() ? current : { ...current, search: search.trim(), page: 1 }
    )), 350)

    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setLoading(true)
    getStaffList(query)
      .then(({ data }) => {
        setResult(data)
        setError('')
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [query])

  const setFilter = (field) => (event) => setQuery((current) => ({ ...current, [field]: event.target.value, page: 1 }))

  const people = result?.items ?? []
  const filtered = query.search || query.role || query.state
  const openStaff = (id) => navigate(`/staff/${id}`)

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Staff</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {result ? `${result.total} ${result.total === 1 ? 'persona' : 'personas'}` : 'Representantes, entrenadoras y preparadoras físicas del club.'}
          </Typography>
        </Box>
        <Button component={RouterLink} to="/staff/new" variant="contained" color="primary" startIcon={<PersonAddRounded />} sx={{ flexShrink: 0 }}>
          Nuevo integrante del staff
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="Buscar por nombre, DNI o email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> },
            htmlInput: { maxLength: 100, 'aria-label': 'Buscar staff' }
          }}
        />
        <Stack direction="row" spacing={2}>
          <TextField select label="Rol" value={query.role} onChange={setFilter('role')} size="small" sx={{ minWidth: 170, flexGrow: 1 }}>
            <MenuItem value="">Todos</MenuItem>
            {roleOptions.map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}
          </TextField>
          <TextField select label="Estado" value={query.state} onChange={setFilter('state')} size="small" sx={{ minWidth: 200, flexGrow: 1 }}>
            {STATE_OPTIONS.map((option) => <MenuItem key={option.label} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!result && loading && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress color="secondary" />
        </Box>
      )}

      {result && people.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          {filtered ? 'No encontramos a nadie con esa búsqueda.' : 'Todavía no hay staff. Empezá con "Nuevo integrante del staff".'}
        </Paper>
      )}

      {people.length > 0 && (isDesktop ? (
        <TableContainer component={Paper} variant="outlined" sx={{ opacity: loading ? 0.6 : 1 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Deporte</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {people.map((person) => (
                <TableRow key={person.id} hover onClick={() => openStaff(person.id)} sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'navy.main' }}>{person.fullName}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{person.email}</Typography>
                  </TableCell>
                  <TableCell><RoleChips roles={person.staffRoles} /></TableCell>
                  <TableCell>{person.sport}</TableCell>
                  <TableCell><StaffStatusChip isActiveStaff={person.isActiveStaff} userStateId={person.userStateId} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Stack spacing={1.5} sx={{ opacity: loading ? 0.6 : 1 }}>
          {people.map((person) => (
            <Card key={person.id} variant="outlined">
              <CardActionArea onClick={() => openStaff(person.id)}>
                <CardContent>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 600, color: 'navy.main', minWidth: 0 }} noWrap>{person.fullName}</Typography>
                    <StaffStatusChip isActiveStaff={person.isActiveStaff} userStateId={person.userStateId} />
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>{person.sport}</Typography>
                  <RoleChips roles={person.staffRoles} />
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
    </>
  )
}

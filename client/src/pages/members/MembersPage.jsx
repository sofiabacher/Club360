import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
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

import { getMembers } from '../../api/members.api.js'
import MemberStatusChips from '../../components/members/MemberStatusChips.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { MEMBER_STATES } from '../../utils/constants.js'

const STATE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: MEMBER_STATES.ACTIVE, label: 'Activos' },
  { value: MEMBER_STATES.SUSPENDED, label: 'Suspendidos' },
  { value: MEMBER_STATES.INACTIVE, label: 'Inactivos' }
]

const REGISTRATION_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendientes de registro' },
  { value: 'registered', label: 'Registrados' }
]

function MemberNumber({ value, size = '1.25rem' }) {
  return <Typography variant="numeric" sx={{ fontSize: size, color: 'navy.main' }}>{value}</Typography>
}

// Socios del club con búsqueda y filtros. Tocar un socio abre su detalle. Pantalla de members.manage
export default function MembersPage() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [query, setQuery] = useState({ search: '', state: '', registration: '', page: 1 })   // Lo que se pidió al back
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // La búsqueda se manda cuando se deja de escribir y vuelve a la primera página
  useEffect(() => {
    const timer = setTimeout(() => setQuery((current) => (
      current.search === search.trim() ? current : { ...current, search: search.trim(), page: 1 }
    )), 350)

    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setLoading(true)
    getMembers(query)
      .then(({ data }) => {
        setResult(data)
        setError('')
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [query])

  const setFilter = (field) => (event) => setQuery((current) => ({ ...current, [field]: event.target.value, page: 1 }))

  const members = result?.items ?? []
  const filtered = query.search || query.state || query.registration
  const openMember = (id) => navigate(`/members/${id}`)

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2" sx={{ color: 'navy.main' }}>Socios</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {result ? `${result.total} ${result.total === 1 ? 'socio' : 'socios'}` : 'Altas, datos y estado de los socios del club.'}
          </Typography>
        </Box>
        <Button component={RouterLink} to="/members/new" variant="contained" color="primary" startIcon={<PersonAddRounded />} sx={{ flexShrink: 0 }}>
          Nuevo socio
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          placeholder="Buscar por nombre, DNI o número de socio"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          size="small"
          sx={{ flexGrow: 1 }}
          slotProps={{
            input: { startAdornment: <InputAdornment position="start"><SearchRounded /></InputAdornment> },
            htmlInput: { maxLength: 100, 'aria-label': 'Buscar socios' }
          }}
        />
        <Stack direction="row" spacing={2}>
          <TextField select label="Estado" value={query.state} onChange={setFilter('state')} size="small" sx={{ minWidth: 150, flexGrow: 1 }}>
            {STATE_OPTIONS.map((option) => <MenuItem key={option.label} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <TextField select label="Registro" value={query.registration} onChange={setFilter('registration')} size="small" sx={{ minWidth: 200, flexGrow: 1 }}>
            {REGISTRATION_OPTIONS.map((option) => <MenuItem key={option.label} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!result && loading && (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress color="secondary" />
        </Box>
      )}

      {result && members.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
          {filtered ? 'No encontramos socios con esa búsqueda.' : 'Todavía no hay socios. Empezá con "Nuevo socio".'}
        </Paper>
      )}

      {members.length > 0 && (isDesktop ? (
        <TableContainer component={Paper} variant="outlined" sx={{ opacity: loading ? 0.6 : 1 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nº de socio</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>DNI</TableCell>
                <TableCell>Edad</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id} hover onClick={() => openMember(member.id)} sx={{ cursor: 'pointer' }}>
                  <TableCell><MemberNumber value={member.numMember} /></TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'navy.main' }}>{member.fullName}</Typography>
                  </TableCell>
                  <TableCell>{member.dni ?? '—'}</TableCell>
                  <TableCell>{member.age}</TableCell>
                  <TableCell>
                    <MemberStatusChips memberStateId={member.memberStateId} userStateId={member.userStateId} isMinor={member.isMinor} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Stack spacing={1.5} sx={{ opacity: loading ? 0.6 : 1 }}>
          {members.map((member) => (
            <Card key={member.id} variant="outlined">
              <CardActionArea onClick={() => openMember(member.id)}>
                <CardContent>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
                    <Typography sx={{ fontWeight: 600, color: 'navy.main', minWidth: 0 }} noWrap>{member.fullName}</Typography>
                    <MemberNumber value={member.numMember} size="1.1rem" />
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                    DNI {member.dni ?? '—'} · {member.age} años
                  </Typography>
                  <MemberStatusChips memberStateId={member.memberStateId} userStateId={member.userStateId} isMinor={member.isMinor} />
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

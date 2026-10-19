import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import BadgeRounded from '@mui/icons-material/BadgeRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import LogoutRounded from '@mui/icons-material/LogoutRounded'

import { switchRole } from '../../api/auth.api.js'
import AuthLayout from '../../components/auth/AuthLayout.jsx'
import useAuth from '../../hooks/useAuth.js'
import { getErrorMessage } from '../../utils/apiErrors.js'

export default function SelectRolePage() {
  const navigate = useNavigate()
  const { user, club, roles, activeRole, startSession, endSession } = useAuth()

  const [selectingId, setSelectingId] = useState(null)
  const [error, setError] = useState('')

  const handleSelect = async (roleId) => {
    setError('')
    setSelectingId(roleId)

    try {
      const { data } = await switchRole(roleId)
      startSession({ token: data.token, session: data.session })
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
      setSelectingId(null)
    }
  }

  const handleLogout = async () => {
    await endSession()
    navigate('/login', { replace: true })
  }

  return (
    <AuthLayout title={`Hola, ${user.name}`} subtitle="¿Con qué rol querés ingresar?">
      <Stack spacing={1.5}>
        {error && <Alert severity="error">{error}</Alert>}

        {roles.map((role) => {
          const isActive = role.id === activeRole?.id

          return (
            <Card
              key={role.id}
              variant="outlined"
              sx={{
                borderColor: isActive ? 'secondary.main' : 'divider',
                borderWidth: isActive ? 2 : 1
              }}
            >
              <CardActionArea
                onClick={() => handleSelect(role.id)}
                disabled={selectingId !== null}
                sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}
              >
                <BadgeRounded sx={{ color: 'secondary.main' }} />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>{role.name}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {isActive ? 'Rol actual' : club?.name}
                  </Typography>
                </Box>
                {selectingId === role.id
                  ? <CircularProgress size={22} color="secondary" />
                  : <ChevronRightRounded sx={{ color: 'text.secondary' }} />}
              </CardActionArea>
            </Card>
          )
        })}

        <Button
          variant="text"
          color="secondary"
          startIcon={<LogoutRounded />}
          onClick={handleLogout}
          disabled={selectingId !== null}
          sx={{ alignSelf: 'center', mt: 1 }}
        >
          Cerrar sesión
        </Button>
      </Stack>
    </AuthLayout>
  )
}

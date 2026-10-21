import Avatar from '@mui/material/Avatar'

import { getUploadUrl } from '../../utils/media.js'

// Foto del usuario o, si no tiene, sus iniciales
export default function UserAvatar({ user, size = 40, sx }) {
  const initials = `${user?.name?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <Avatar
      src={getUploadUrl(user?.photo)}
      alt={user ? `${user.name} ${user.lastName}` : ''}
      sx={[
        { width: size, height: size, fontSize: size * 0.4, fontWeight: 600, bgcolor: 'secondary.main' },
        ...(Array.isArray(sx) ? sx : [sx])
      ]}
    >
      {initials}
    </Avatar>
  )
}

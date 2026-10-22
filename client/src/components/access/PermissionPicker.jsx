import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded'

import { getModuleLabel } from '../../utils/permissionLabels.js'

// Selector de permisos agrupados por módulo, para los roles y los permisos directos.
//   groups: el catálogo de GET /access/permissions ([{ module, permissions: [{ id, name, description }] }])
//   value / onChange: ids de los permisos elegidos
//   locked: ids que se ven tildados y deshabilitados; lockedReason es el texto del tooltip que explica por qué
//   hint: texto por permiso, como { [id]: 'Ya lo tiene por el rol Representante' }
export default function PermissionPicker({ groups, value, onChange, locked = [], lockedReason, hint = {}, disabled = false }) {
  const selected = new Set([...value, ...locked])
  const isLocked = (id) => locked.includes(id)

  const toggle = (id) => {
    if (isLocked(id)) return
    onChange(selected.has(id) ? value.filter((item) => item !== id) : [...value, id])
  }

  // "Seleccionar todos" de un módulo: tilda o destilda los que no están bloqueados
  const toggleGroup = (permissions, allSelected) => {
    const ids = permissions.map((permission) => permission.id).filter((id) => !isLocked(id))
    onChange(allSelected ? value.filter((id) => !ids.includes(id)) : [...new Set([...value, ...ids])])
  }

  return (
    <Box>
      {groups.map(({ module, permissions }) => {
        const count = permissions.filter((permission) => selected.has(permission.id)).length
        const allSelected = count === permissions.length

        return (
          <Accordion key={module} disableGutters variant="outlined" sx={{ '&:not(:last-of-type)': { borderBottom: 0 } }}>
            <AccordionSummary expandIcon={<ExpandMoreRounded />}>
              <Stack direction="row" sx={{ flexGrow: 1, alignItems: 'center', gap: 1, flexWrap: 'wrap', pr: 1 }}>
                <Typography sx={{ fontWeight: 600, color: 'navy.main', flexGrow: 1 }}>{getModuleLabel(module)}</Typography>
                <Typography variant="caption" sx={{ color: count > 0 ? 'secondary.main' : 'text.secondary', fontWeight: 600 }}>
                  {count} de {permissions.length}
                </Typography>
                <FormControlLabel
                  onClick={(event) => event.stopPropagation()}   // Que tildar no abra ni cierre la sección
                  onFocus={(event) => event.stopPropagation()}
                  control={
                    <Checkbox
                      size="small"
                      color="secondary"
                      checked={allSelected}
                      indeterminate={count > 0 && !allSelected}
                      onChange={() => toggleGroup(permissions, allSelected)}
                      disabled={disabled}
                    />
                  }
                  label={<Typography variant="caption">Seleccionar todos</Typography>}
                  sx={{ mr: 0 }}
                />
              </Stack>
            </AccordionSummary>

            <AccordionDetails sx={{ pt: 0 }}>
              <Stack spacing={0.5}>
                {permissions.map((permission) => {
                  const checkbox = (
                    <Checkbox
                      color="secondary"
                      checked={selected.has(permission.id)}
                      onChange={() => toggle(permission.id)}
                      disabled={disabled || isLocked(permission.id)}
                    />
                  )

                  return (
                    <FormControlLabel
                      key={permission.id}
                      sx={{ alignItems: 'flex-start', mr: 0, '& .MuiCheckbox-root': { pt: 0.5 } }}
                      control={
                        isLocked(permission.id) && lockedReason
                          ? <Tooltip title={lockedReason}><span>{checkbox}</span></Tooltip>
                          : checkbox
                      }
                      label={
                        <Box sx={{ py: 0.75 }}>
                          <Typography variant="body2">{permission.description}</Typography>
                          <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                            {permission.name}
                          </Typography>
                          {hint[permission.id] && (
                            <Typography variant="caption" component="div" sx={{ color: 'secondary.main', fontWeight: 500 }}>
                              {hint[permission.id]}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  )
                })}
              </Stack>
            </AccordionDetails>
          </Accordion>
        )
      })}
    </Box>
  )
}

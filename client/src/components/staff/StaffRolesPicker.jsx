import Checkbox from '@mui/material/Checkbox'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import FormHelperText from '@mui/material/FormHelperText'
import FormLabel from '@mui/material/FormLabel'

// Casillas de los roles de staff (al menos uno). options: los nombres que devuelve /staff/options; value: los elegidos
export default function StaffRolesPicker({ options, value, onChange, error, disabled }) {
  const toggle = (role) => {
    // Se mantiene el orden de options, así los roles se muestran y se envían siempre igual
    const next = value.includes(role) ? value.filter((item) => item !== role) : [...value, role]
    onChange(options.filter((option) => next.includes(option)))
  }

  return (
    <FormControl component="fieldset" error={Boolean(error)} disabled={disabled}>
      <FormLabel component="legend" sx={{ mb: 0.5 }}>Roles de staff</FormLabel>
      <FormGroup row>
        {options.map((role) => (
          <FormControlLabel
            key={role}
            control={<Checkbox checked={value.includes(role)} onChange={() => toggle(role)} color="secondary" />}
            label={role}
          />
        ))}
      </FormGroup>
      <FormHelperText>{error ?? 'Elegí al menos uno. Si tiene más de uno, elige con cuál trabajar al entrar.'}</FormHelperText>
    </FormControl>
  )
}

import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

const PERIODS = [4, 8, 12]

// Selector de período: 4, 8 o 12 semanas
export default function PeriodSelector({ value, onChange, disabled }) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(event, next) => next && onChange(next)}
      size="small"
      color="secondary"
      disabled={disabled}
      aria-label="Período"
    >
      {PERIODS.map((weeks) => <ToggleButton key={weeks} value={weeks}>{weeks} semanas</ToggleButton>)}
    </ToggleButtonGroup>
  )
}

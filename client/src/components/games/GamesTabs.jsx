import { useSearchParams } from 'react-router-dom'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'

// Pestañas de las vistas de partidos ("Próximos" y "Jugados", y las que sume cada pantalla). La elegida se guarda en la
// URL (?tab=jugados), así el link se puede compartir y "Atrás" vuelve a la pestaña anterior. La primera no va en la URL
export function useGamesTab(values) {
  const [searchParams, setSearchParams] = useSearchParams()
  const current = values.includes(searchParams.get('tab')) ? searchParams.get('tab') : values[0]

  const setTab = (value) => {
    const next = new URLSearchParams(searchParams)
    if (value === values[0]) next.delete('tab')
    else next.set('tab', value)
    setSearchParams(next)
  }

  return [current, setTab]
}

// tabs: [{ value, label }]
export default function GamesTabs({ tabs, value, onChange }) {
  return (
    <Tabs value={value} onChange={(event, next) => onChange(next)} textColor="secondary" indicatorColor="secondary" variant="scrollable" allowScrollButtonsMobile sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
      {tabs.map((tab) => <Tab key={tab.value} value={tab.value} label={tab.label} />)}
    </Tabs>
  )
}

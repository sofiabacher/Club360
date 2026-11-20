import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import CircularProgress from '@mui/material/CircularProgress'
import GroupsRounded from '@mui/icons-material/GroupsRounded'

import { createCharge, getChargeOptions, previewCharge } from '../../api/fees.api.js'
import { getErrorMessage, getFieldErrors } from '../../utils/apiErrors.js'
import { CHARGE_TARGETS, MEMBER_STATES } from '../../utils/constants.js'
import { formatMoney } from '../../utils/format.js'

const CONCEPT_MAX = 100
const DESCRIPTION_MAX = 300

// Hoy en Argentina: '2026-11-19' (el vencimiento no puede ser anterior)
const todayAR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())

const TARGET_OPTIONS = [
  { value: CHARGE_TARGETS.ALL, label: 'Todos' },
  { value: CHARGE_TARGETS.MEMBERS, label: 'Socios' },
  { value: CHARGE_TARGETS.CATEGORIES, label: 'Categorías' },
  { value: CHARGE_TARGETS.SPORTS, label: 'Deportes' }
]

const TARGET_HELP = {
  [CHARGE_TARGETS.ALL]: 'Todos los socios activos y suspendidos del club.',
  [CHARGE_TARGETS.MEMBERS]: 'Elegí uno o varios socios.',
  [CHARGE_TARGETS.CATEGORIES]: 'Las jugadoras activas de las categorías que elijas.',
  [CHARGE_TARGETS.SPORTS]: 'Los socios con la inscripción aprobada en los deportes que elijas.'
}

// Monto con hasta 2 decimales, mayor a 0 (como lo valida el back)
const isAmountValid = (value) => /^\d{1,7}([.,]\d{1,2})?$/.test(value.trim()) && Number(value.replace(',', '.')) > 0

// Elegir varios de una lista (socios, categorías o deportes)
function MultiPicker({ label, options, value, onChange, getLabel, renderOption, placeholder }) {
  return (
    <Autocomplete
      multiple
      options={options}
      value={value}
      onChange={(event, selected) => onChange(selected)}
      getOptionLabel={getLabel}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      filterSelectedOptions
      renderOption={renderOption}
      noOptionsText="No hay opciones"
      renderInput={(params) => <TextField {...params} label={label} placeholder={value.length === 0 ? placeholder : ''} />}
      slotProps={{ chip: { size: 'small' } }}
    />
  )
}

// Alta de un cargo eventual (fees.manage): concepto, detalle, monto, vencimiento y a quiénes. Muestra en vivo a cuántos
// socios se les va a cobrar. onCreated(charge) con el cargo creado
export default function ChargeFormDialog({ onClose, onCreated }) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const [options, setOptions] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState({ concept: '', description: '', amount: '', expirationDate: '' })
  const [touched, setTouched] = useState({})
  const [targetType, setTargetType] = useState(CHARGE_TARGETS.ALL)
  const [selected, setSelected] = useState({ [CHARGE_TARGETS.MEMBERS]: [], [CHARGE_TARGETS.CATEGORIES]: [], [CHARGE_TARGETS.SPORTS]: [] })
  const [preview, setPreview] = useState(null)   // { count, members } o null mientras carga
  const [previewError, setPreviewError] = useState('')
  const [showList, setShowList] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    getChargeOptions()
      .then(({ data }) => setOptions(data))
      .catch((err) => setLoadError(getErrorMessage(err)))
  }, [])

  const targetIds = targetType === CHARGE_TARGETS.ALL ? [] : selected[targetType].map((item) => item.id)
  const targetKey = `${targetType}:${targetIds.join(',')}`
  const needsIds = targetType !== CHARGE_TARGETS.ALL

  // A cuántos se les cobra: se pide al back cuando cambia el destino (con una pausa corta)
  useEffect(() => {
    if (!options) return undefined
    if (needsIds && targetIds.length === 0) {
      setPreview({ count: 0, members: [] })
      return undefined
    }
    setPreview(null)
    setPreviewError('')
    const timer = setTimeout(() => {
      previewCharge({ targetType, targetIds })
        .then(({ data }) => setPreview(data))
        .catch((err) => setPreviewError(getErrorMessage(err)))
    }, 300)
    return () => clearTimeout(timer)
    // targetKey resume targetType y targetIds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, targetKey])

  const setField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  const touch = (field) => () => setTouched((current) => ({ ...current, [field]: true }))

  const checks = {
    concept: form.concept.trim().length >= 3 ? null : 'Escribí el concepto (entre 3 y 100 caracteres).',
    amount: isAmountValid(form.amount) ? null : 'Ingresá un monto mayor a 0, con hasta 2 decimales.',
    expirationDate: form.expirationDate && form.expirationDate >= todayAR() ? null : 'Elegí un vencimiento de hoy en adelante.'
  }
  const errorOf = (field) => fieldErrors[field] ?? (touched[field] ? checks[field] : null)
  const canSave = Object.values(checks).every((check) => !check) && preview?.count > 0

  const handleSave = async () => {
    setSending(true)
    setError('')
    setFieldErrors({})
    try {
      const { data } = await createCharge({
        concept: form.concept.trim(),
        description: form.description.trim() || null,
        amount: form.amount.trim().replace(',', '.'),
        expirationDate: form.expirationDate,
        targetType,
        targetIds
      })
      onCreated(data)
    } catch (err) {
      setError(getErrorMessage(err))
      setFieldErrors(getFieldErrors(err))
      setSending(false)
    }
  }

  const memberLabel = (member) => `${member.name} · Nº ${member.numMember}`

  return (
    <Dialog open onClose={sending ? undefined : onClose} fullWidth maxWidth="sm" fullScreen={fullScreen}>
      <DialogTitle>Nuevo cargo eventual</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
          Un cobro aparte de la cuota. Cada socio lo ve en sus cuotas y lo paga como la cuota. Si no lo paga, no suma días de atraso.
        </Typography>

        {loadError && <Alert severity="error">{loadError}</Alert>}
        {!options && !loadError && <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress color="secondary" /></Box>}

        {options && (
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Concepto"
              placeholder="Por ejemplo: Camiseta 2027"
              value={form.concept}
              onChange={setField('concept')}
              onBlur={touch('concept')}
              error={Boolean(errorOf('concept'))}
              helperText={errorOf('concept') ?? `${form.concept.length}/${CONCEPT_MAX}`}
              fullWidth
              autoFocus
              slotProps={{ htmlInput: { maxLength: CONCEPT_MAX } }}
            />
            <TextField
              label="Detalle (opcional)"
              placeholder="Lo que tenga que saber el socio"
              value={form.description}
              onChange={setField('description')}
              error={Boolean(fieldErrors.description)}
              helperText={fieldErrors.description ?? `${form.description.length}/${DESCRIPTION_MAX}`}
              multiline
              minRows={2}
              fullWidth
              slotProps={{ htmlInput: { maxLength: DESCRIPTION_MAX } }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Monto por socio"
                value={form.amount}
                onChange={setField('amount')}
                onBlur={touch('amount')}
                error={Boolean(errorOf('amount'))}
                helperText={errorOf('amount') ?? ' '}
                fullWidth
                slotProps={{
                  input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
                  htmlInput: { inputMode: 'decimal', maxLength: 10 }
                }}
              />
              <TextField
                type="date"
                label="Vence el"
                value={form.expirationDate}
                onChange={setField('expirationDate')}
                onBlur={touch('expirationDate')}
                error={Boolean(errorOf('expirationDate'))}
                helperText={errorOf('expirationDate') ?? ' '}
                fullWidth
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayAR() } }}
              />
            </Stack>

            <Box>
              <Typography variant="subtitle2" sx={{ color: 'navy.main', mb: 1 }}>¿A quiénes se les cobra?</Typography>
              <ToggleButtonGroup
                value={targetType}
                exclusive
                onChange={(event, value) => value && setTargetType(value)}
                color="secondary"
                size="small"
                fullWidth
                sx={{ mb: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}
              >
                {TARGET_OPTIONS.map((option) => (
                  <ToggleButton key={option.value} value={option.value} sx={{ flex: { xs: '1 1 45%', sm: 1 } }}>{option.label}</ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>{TARGET_HELP[targetType]}</Typography>

              {targetType === CHARGE_TARGETS.MEMBERS && (
                <MultiPicker
                  label="Socios"
                  placeholder="Buscá por nombre, DNI o número"
                  options={options.members}
                  value={selected[CHARGE_TARGETS.MEMBERS]}
                  onChange={(value) => setSelected((current) => ({ ...current, [CHARGE_TARGETS.MEMBERS]: value }))}
                  getLabel={(member) => `${memberLabel(member)} ${member.dni}`}
                  renderOption={({ key, ...props }, member) => (
                    <Box component="li" key={key} {...props}>
                      <Box>
                        <Typography variant="body2" sx={{ color: 'navy.main' }}>{member.name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Nº {member.numMember} · DNI {member.dni}{member.memberStateId === MEMBER_STATES.SUSPENDED ? ' · Suspendido' : ''}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              )}
              {targetType === CHARGE_TARGETS.CATEGORIES && (
                <MultiPicker
                  label="Categorías"
                  placeholder="Elegí una o varias"
                  options={options.categories}
                  value={selected[CHARGE_TARGETS.CATEGORIES]}
                  onChange={(value) => setSelected((current) => ({ ...current, [CHARGE_TARGETS.CATEGORIES]: value }))}
                  getLabel={(category) => category.name}
                />
              )}
              {targetType === CHARGE_TARGETS.SPORTS && (
                <MultiPicker
                  label="Deportes"
                  placeholder="Elegí uno o varios"
                  options={options.sports}
                  value={selected[CHARGE_TARGETS.SPORTS]}
                  onChange={(value) => setSelected((current) => ({ ...current, [CHARGE_TARGETS.SPORTS]: value }))}
                  getLabel={(sport) => sport.name}
                />
              )}
            </Box>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'tint.main' }}>
              {previewError && <Alert severity="error">{previewError}</Alert>}
              {!previewError && !preview && <Typography variant="body2" sx={{ color: 'text.secondary' }}>Calculando a quiénes…</Typography>}
              {!previewError && preview && (
                <>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
                    <GroupsRounded sx={{ color: 'secondary.main' }} />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>
                        {preview.count === 0 ? 'Todavía no hay a quién cobrarle' : `Se les cobra a ${preview.count} ${preview.count === 1 ? 'socio' : 'socios'}`}
                      </Typography>
                      {preview.count > 0 && isAmountValid(form.amount) && (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Total a cobrar: {formatMoney(preview.count * Number(form.amount.replace(',', '.')))}
                        </Typography>
                      )}
                    </Box>
                    {preview.count > 0 && (
                      <Button size="small" color="secondary" onClick={() => setShowList((current) => !current)}>
                        {showList ? 'Ocultar' : 'Ver quiénes'}
                      </Button>
                    )}
                  </Stack>
                  <Collapse in={showList && preview.count > 0}>
                    <Box sx={{ maxHeight: 180, overflowY: 'auto', mt: 1.5 }}>
                      {preview.members.map((member) => (
                        <Typography key={member.id} variant="body2" sx={{ color: 'text.secondary' }}>{memberLabel(member)}</Typography>
                      ))}
                    </Box>
                  </Collapse>
                </>
              )}
            </Paper>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="secondary" onClick={onClose} disabled={sending}>Volver</Button>
        <Button variant="contained" color="primary" onClick={handleSave} disabled={!canSave} loading={sending}>
          Crear y avisar
        </Button>
      </DialogActions>
    </Dialog>
  )
}

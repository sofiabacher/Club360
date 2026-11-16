import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import PictureAsPdfRounded from '@mui/icons-material/PictureAsPdfRounded'
import PrintRounded from '@mui/icons-material/PrintRounded'

import { getPaymentVoucher } from '../../api/fees.api.js'
import AccentStripe from '../../components/common/AccentStripe.jsx'
import { getErrorMessage } from '../../utils/apiErrors.js'
import { formatDateTimeLong, formatMoney, formatPeriod } from '../../utils/format.js'
import { downloadVoucherPdf } from '../../utils/voucherPdf.js'
import LoadingSkeleton from '../../components/common/LoadingSkeleton.jsx'

// Al imprimir, los fondos de color se mantienen (el navegador los saca por defecto)
const keepColors = { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }

function Row({ label, children }) {
  return (
    <TableRow>
      <TableCell component="th" scope="row" sx={{ color: 'text.secondary', width: '42%', pl: 0, verticalAlign: 'top' }}>{label}</TableCell>
      <TableCell sx={{ color: 'navy.main', fontWeight: 500, pr: 0, overflowWrap: 'anywhere' }}>{children}</TableCell>
    </TableRow>
  )
}

// Comprobante de pago para descargar en PDF o imprimir (todo pago Aprobado, con cualquier medio), con el estilo del comprobante del alta:
// encabezado Bordó con el nombre del club, franja del color propio y fondo Crema. El acceso lo controla el back (quien
// gestiona cuotas, quien pagó, el socio o su adulto). Al imprimir queda solo el comprobante
export default function PaymentVoucherPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [voucher, setVoucher] = useState(null)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const theme = useTheme()

  useEffect(() => {
    getPaymentVoucher(id)
      .then(({ data }) => setVoucher(data))
      .catch((err) => setError(getErrorMessage(err)))
  }, [id])

  // Descarga el PDF (se genera en el navegador, con los colores del tema)
  const handleDownload = async () => {
    setDownloading(true)
    setPdfError('')
    try {
      await downloadVoucherPdf(voucher, theme.palette)
    } catch {
      setPdfError('No se pudo generar el PDF. Probá con "Imprimir" y elegí "Guardar como PDF".')
    } finally {
      setDownloading(false)
    }
  }

  // Vuelve a la pantalla anterior; si se entró directo con el link, al inicio
  const goBack = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))

  const backButton = (
    <Button onClick={goBack} color="secondary" startIcon={<ArrowBackRounded />}>Volver</Button>
  )

  if (error) {
    return (
      <Box sx={{ maxWidth: 560, mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        {backButton}
      </Box>
    )
  }

  if (!voucher) {
    return <LoadingSkeleton />
  }

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap', mb: 3, displayPrint: 'none' }}>
        <Button variant="contained" color="primary" startIcon={<PictureAsPdfRounded />} onClick={handleDownload} loading={downloading}>
          Descargar PDF
        </Button>
        <Button variant="outlined" color="secondary" startIcon={<PrintRounded />} onClick={() => window.print()}>
          Imprimir
        </Button>
        {backButton}
      </Stack>
      {pdfError && <Alert severity="error" sx={{ mb: 2, displayPrint: 'none' }}>{pdfError}</Alert>}

      <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 1, ...keepColors }}>
        <Box sx={{ bgcolor: 'navy.main', color: 'navy.contrastText', px: 3, py: 1.5, ...keepColors }}>
          <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
            {voucher.club.name}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.85 }}>
            {voucher.club.address}{voucher.club.cuit ? ` · CUIT ${voucher.club.cuit}` : ''}
          </Typography>
        </Box>
        <AccentStripe color={voucher.club.accentColor} orientation="horizontal" size={6} sx={{ borderRadius: 0 }} />

        <Box sx={{ px: { xs: 2.5, sm: 3 }, py: 3 }}>
          <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.2em', color: 'text.secondary' }}>COMPROBANTE DE PAGO</Typography>
          <Typography variant="numeric" component="p" sx={{ fontSize: { xs: '2rem', sm: '2.4rem' }, color: 'navy.main', lineHeight: 1.1, overflowWrap: 'anywhere' }}>
            {voucher.confirmationCode}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Aprobado el {formatDateTimeLong(voucher.approvedAt)}
          </Typography>

          <Table size="small" sx={{ '& td, & th': { borderColor: 'divider' } }}>
            <TableBody>
              <Row label="Socio">{voucher.member.name} · Nº {voucher.member.numMember}</Row>
              {voucher.paidBy && <Row label="Pagó">{voucher.paidBy}</Row>}
              {voucher.registeredBy && <Row label="Registró">{voucher.registeredBy}</Row>}
              <Row label="Período">{formatPeriod(voucher.period)}</Row>
              <Row label="Medio de pago">{voucher.methodLabel}</Row>
              <Row label="Cuota social">{formatMoney(voucher.socialAmount)}</Row>
              <Row label="Cuota deportiva">{formatMoney(voucher.sportAmount)}</Row>
            </TableBody>
          </Table>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
            <Typography sx={{ fontWeight: 600, color: 'navy.main' }}>Total pagado</Typography>
            <Typography variant="numeric" sx={{ fontSize: '2.2rem', color: 'navy.main', lineHeight: 1 }}>{formatMoney(voucher.total)}</Typography>
          </Stack>
        </Box>

        <Box sx={{ px: 3, py: 1.5, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Pago simulado — proyecto escolar Club360</Typography>
        </Box>
      </Paper>
    </Box>
  )
}

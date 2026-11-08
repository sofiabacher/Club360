import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded'

import { getReceiptFile } from '../../api/fees.api.js'
import { getErrorMessage } from '../../utils/apiErrors.js'

// Comprobante adjunto de una transferencia. Se pide con axios (con el token) y se muestra desde un object URL:
// la imagen embebida o el PDF en un iframe, siempre con un link para abrirlo en otra pestaña
export default function ReceiptViewer({ paymentId }) {
  const [file, setFile] = useState(null)   // { url, type }
  const [error, setError] = useState('')

  useEffect(() => {
    let url = null
    let cancelled = false

    getReceiptFile(paymentId)
      .then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setFile({ url, type: blob.type })
      })
      .catch((err) => { if (!cancelled) setError(getErrorMessage(err)) })

    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [paymentId])

  if (error) return <Alert severity="error">{error}</Alert>
  if (!file) return <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress color="secondary" /></Box>

  const isPdf = file.type === 'application/pdf'

  return (
    <Box>
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden', bgcolor: 'background.default' }}>
        {isPdf ? (
          <Box component="iframe" src={file.url} title="Comprobante adjunto" sx={{ width: '100%', height: { xs: 360, sm: 480 }, border: 0, display: 'block' }} />
        ) : (
          <Box component="img" src={file.url} alt="Comprobante adjunto" sx={{ width: '100%', maxHeight: 480, objectFit: 'contain', display: 'block' }} />
        )}
      </Box>
      <Button href={file.url} target="_blank" rel="noopener" color="secondary" size="small" startIcon={<OpenInNewRounded />} sx={{ mt: 1 }}>
        Abrir en otra pestaña
      </Button>
    </Box>
  )
}

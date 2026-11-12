// Transporte de emails. Es el único archivo que conoce al proveedor: cambiarlo solo toca acá.
// Proveedores (MAIL_PROVIDER):
//   - brevo:   API HTTP de Brevo (POST /v3/smtp/email). Es el de producción: Render gratis bloquea los puertos SMTP
//              (25, 465 y 587), y la API va por HTTPS. El plan gratuito permite 300 emails por día: por eso solo van por
//              email los tipos de la tabla del contexto, sección 6 (NOTIFICATION_TYPES en utils/constants.js);
//   - smtp:    nodemailer con Gmail SMTP, para el desarrollo local;
//   - console: no envía; muestra el destinatario, el asunto y los links por consola.
// Sin MAIL_PROVIDER: brevo si hay BREVO_API_KEY; si no, smtp si hay SMTP_USER y SMTP_PASS; si no, console.
// Un email va siempre a una sola persona (los senders llaman una vez por destinatario): nadie ve las direcciones de otros.
const nodemailer = require('nodemailer')
const { mail, smtp } = require('./index')

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'
const BREVO_TIMEOUT_MS = 10000
const PROVIDERS = ['brevo', 'smtp', 'console']

const hasBrevo = Boolean(mail.brevoApiKey)
const hasSmtp = Boolean(smtp.user && smtp.pass)

// Proveedor elegido y, si no se puede usar, por qué (se muestra al arrancar). Sin credenciales, por consola
function resolveProvider() {
    const requested = mail.provider
    if (requested && !PROVIDERS.includes(requested)) return { provider: 'console', problem: `MAIL_PROVIDER "${requested}" no existe (brevo, smtp o console)` }
    if (requested === 'brevo' && !hasBrevo) return { provider: 'console', problem: 'Falta BREVO_API_KEY' }
    if (requested === 'brevo' && !mail.from) return { provider: 'console', problem: 'Falta MAIL_FROM' }
    if (requested === 'smtp' && !hasSmtp) return { provider: 'console', problem: 'Faltan SMTP_USER o SMTP_PASS' }
    if (requested) return { provider: requested, problem: null }

    if (hasBrevo && mail.from) return { provider: 'brevo', problem: null }
    if (hasSmtp) return { provider: 'smtp', problem: null }
    return { provider: 'console', problem: hasBrevo ? 'Falta MAIL_FROM' : 'Sin proveedor de email configurado' }
}

const { provider, problem } = resolveProvider()

// Links (href) del HTML del email, para mostrarlos por consola
const extractLinks = (html) => [...new Set([...String(html).matchAll(/href="([^"]+)"/g)].map(match => match[1]))]

function sendToConsole({ to, subject, html }) {
    console.log(`[mail] Por consola, no se envía.\n  Para: ${to}\n  Asunto: ${subject}`)
    extractLinks(html).forEach(link => console.log(`  Link: ${link}`))
    return null
}

// Envío con la API de Brevo. Si no responde 2xx (o tarda más de 10 segundos), tira un error con el código y el mensaje
// de Brevo: el sender lo registra en la bitácora (MAIL_ERROR)
async function sendWithBrevo({ to, subject, html }) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), BREVO_TIMEOUT_MS)

    try {
        const response = await fetch(BREVO_URL, {
            method: 'POST',
            headers: { 'api-key': mail.brevoApiKey, 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ sender: { name: mail.fromName, email: mail.from }, to: [{ email: to }], subject, htmlContent: html }),
            signal: controller.signal
        })

        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(`Brevo respondió ${response.status}: ${body.message || body.code || response.statusText}`)
        return { messageId: body.messageId }

    } catch (error) {
        if (error.name === 'AbortError') throw new Error(`Brevo no respondió en ${BREVO_TIMEOUT_MS / 1000} segundos`)
        throw error

    } finally {
        clearTimeout(timer)
    }
}

const smtpTransport = provider === 'smtp'
    ? nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: { user: smtp.user, pass: smtp.pass } })
    : null

const SENDERS = {
    brevo: sendWithBrevo,
    smtp: ({ to, subject, html }) => smtpTransport.sendMail({ from: `${mail.fromName} <${mail.from}>`, to, subject, html }),
    console: sendToConsole
}

module.exports = {
    provider,
    problem,   // Por qué se usa la consola cuando se pidió otro proveedor (o no hay ninguno). null si está todo bien

    // Envía un email a un destinatario: { to, subject, html }
    sendMail: (message) => SENDERS[provider](message),

    // Comprueba la conexión con el servidor SMTP (lo llama server.js al arrancar). Brevo y la consola no lo necesitan
    verify: async () => {
        if (smtpTransport) await smtpTransport.verify()
    }
}

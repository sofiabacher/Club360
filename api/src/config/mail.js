// Transporte de emails: nodemailer con Gmail SMTP. Es el único archivo que conoce al proveedor: cambiarlo solo toca acá.
const nodemailer = require('nodemailer')
const { smtp, app } = require('./index')

const hasCredentials = Boolean(smtp.user && smtp.pass)

const smtpTransport = hasCredentials
    ? nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.secure, auth: { user: smtp.user, pass: smtp.pass } })
    : null

// Links (href) del HTML del email, para mostrarlos por consola
const extractLinks = (html) => [...new Set([...String(html).matchAll(/href="([^"]+)"/g)].map(match => match[1]))]

const transporter = {
    hasCredentials,

    sendMail: async ({ to, subject, html }) => {
        if (!smtpTransport) {
            if (app.isDev) {   // En desarrollo se muestra por consola, con los links, para poder probar sin mandar mails reales
                console.log(`[mail] Sin SMTP_USER o SMTP_PASS, no se envía.\n  Para: ${to}\n  Asunto: ${subject}`)
                extractLinks(html).forEach(link => console.log(`  Link: ${link}`))
                return null
            }

            throw new Error('Faltan SMTP_USER o SMTP_PASS: el servidor no puede enviar emails')
        }

        return smtpTransport.sendMail({ from: smtp.from, to, subject, html })
    },

    // Comprueba la conexión y las credenciales con el servidor SMTP (lo llama server.js al arrancar)
    verify: async () => {
        if (!smtpTransport) throw new Error('Faltan SMTP_USER o SMTP_PASS')
        return smtpTransport.verify()
    }
}

module.exports = transporter

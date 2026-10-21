const { Resend } = require('resend')
const { email, app } = require('./index')

const resend = email.apiKey ? new Resend(email.apiKey) : null

// Links (href) del HTML del email, para mostrarlos por consola
const extractLinks = (html) => [...new Set([...String(html).matchAll(/href="([^"]+)"/g)].map(match => match[1]))]

const transporter = {
    sendMail: async ({ to, subject, html }) => {
        if (!resend) {   // Sin RESEND_API_KEY no se envía
            if (app.isDev) {   // En desarrollo se muestra por consola, con los links, para poder probar sin mandar mails reales
                console.log(`[mail] Sin RESEND_API_KEY, no se envía.\n  Para: ${to}\n  Asunto: ${subject}`)
                extractLinks(html).forEach(link => console.log(`  Link: ${link}`))
            } else {
                console.log(`[mail] Sin RESEND_API_KEY, no se envía. Para: ${to} | Asunto: ${subject}`)
            }

            return null
        }

        const { data, error } = await resend.emails.send({ from: email.from, to, subject, html })

        if (error) {
            throw new Error(error.message)
        }

        return data
    }
}

module.exports = transporter

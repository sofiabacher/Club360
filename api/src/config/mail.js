const { Resend } = require('resend')
const { email } = require('./index')

const resend = email.apiKey ? new Resend(email.apiKey) : null

const transporter = {
    sendMail: async ({ to, subject, html }) => {
        if (!resend) {   // Desarrollo sin RESEND_API_KEY: no se envía, solo se muestra
            console.log(`[mail] Sin RESEND_API_KEY, no se envía. Para: ${to} | Asunto: ${subject}`)
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

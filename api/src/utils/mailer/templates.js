// Plantillas de email. Cada una devuelve { subject, html }.

function signature(html) {   // Envuelve el contenido y agrega el pie de Club360
    return `
        <div style="font-family: Arial, sans-serif; color: #1F2937; max-width: 560px; margin: 0 auto;">
            ${html}
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
            <p style="font-size: 12px; color: #6B7280;">
                <strong>Club360</strong> · Gestión para clubes deportivos<br>
                Este es un mensaje automático, por favor no lo respondas.
            </p>
        </div>
    `
}

function buildRecoveryEmail({ name, link }) {   // Recuperación de contraseña
    const body = `
        <p>Hola ${name},</p>
        <p>Recibimos un pedido para restablecer tu contraseña en <strong>Club360</strong>. Si fuiste vos, hacé clic en el siguiente enlace:</p>
        <p><a href="${link}">Restablecer contraseña</a></p>
        <p>El enlace vence en 1 hora. Si no pediste este cambio, podés ignorar este mensaje.</p>
    `

    return { subject: 'Restablecé tu contraseña en Club360', html: signature(body) }
}

module.exports = {
    signature,
    buildRecoveryEmail
}

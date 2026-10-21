// Plantillas de email. Cada una devuelve { subject, html }.
// Los clientes de correo no leen hojas de estilo: todo va con estilos en línea y los colores de marca (moodboard).
const BRAND = {
    navy: '#0F1B3D',
    orange: '#EA6A1F',
    text: '#0F1B3D',
    muted: '#555A68',
    background: '#F6F7FB',
    border: '#E3E5EC'
}

// Escapa los datos que se insertan en el HTML (por ejemplo, un nombre con < o &)
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

// Envuelve el contenido: encabezado Marino con el logo de texto y pie con la firma de Club360
function signature(html) {
    return `
        <div style="background: ${BRAND.background}; padding: 24px 12px; font-family: Arial, Helvetica, sans-serif;">
            <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid ${BRAND.border};">
                <div style="background: ${BRAND.navy}; padding: 20px 28px;">
                    <span style="font-size: 26px; font-weight: bold; color: #FFFFFF;">Club</span><span style="font-size: 26px; font-weight: bold; color: ${BRAND.orange};">360</span>
                </div>
                <div style="padding: 28px; color: ${BRAND.text}; font-size: 15px; line-height: 1.6;">
                    ${html}
                    <hr style="border: none; border-top: 1px solid ${BRAND.border}; margin: 28px 0 16px;">
                    <p style="margin: 0; font-size: 12px; color: ${BRAND.muted};">
                        <strong>Club360</strong> · Gestión para clubes deportivos<br>
                        Este es un mensaje automático, por favor no lo respondas.
                    </p>
                </div>
            </div>
        </div>
    `
}

// Botón Naranja (acción principal del email)
function button(link, label) {
    return `
        <p style="margin: 28px 0;">
            <a href="${link}" style="display: inline-block; background: ${BRAND.orange}; color: #FFFFFF; text-decoration: none; font-weight: bold; padding: 12px 24px; border-radius: 10px;">${label}</a>
        </p>
    `
}

function buildRecoveryEmail({ name, link }) {   // Recuperación de contraseña
    const body = `
        <p style="margin-top: 0;">Hola ${escapeHtml(name)},</p>
        <p>Recibimos un pedido para restablecer tu contraseña en <strong>Club360</strong>. Si fuiste vos, tocá el botón para elegir una contraseña nueva:</p>
        ${button(link, 'Restablecer contraseña')}
        <p style="font-size: 13px; color: ${BRAND.muted};">El link vence en 1 hora y sirve una sola vez. Si el botón no funciona, copiá este link en el navegador:<br><a href="${link}" style="color: ${BRAND.navy}; word-break: break-all;">${link}</a></p>
        <p>Si no pediste este cambio, podés ignorar este mensaje: tu contraseña sigue siendo la misma.</p>
    `

    return { subject: 'Restablecé tu contraseña en Club360', html: signature(body) }
}

function buildPasswordChangedNotice({ name }) {   // Aviso después de cambiar o restablecer la contraseña
    const body = `
        <p style="margin-top: 0;">Hola ${escapeHtml(name)},</p>
        <p>Te avisamos que tu contraseña fue modificada.</p>
        <p>Si no fuiste vos, comunicate con el club.</p>
    `

    return { subject: 'Tu contraseña de Club360 fue modificada', html: signature(body) }
}

module.exports = {
    signature,
    buildRecoveryEmail,
    buildPasswordChangedNotice
}

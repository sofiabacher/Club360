// Mensajes al usuario, agrupados por módulo. Cada módulo agrega su grupo acá.

module.exports = {
    general: {
        serverError: 'Ocurrió un error interno. Probá de nuevo más tarde.',
        invalidJson: 'Los datos enviados no tienen un formato válido.'
    },

    auth: {
        tokenRequired: 'Tenés que iniciar sesión para continuar.',
        invalidToken: 'Tu sesión no es válida o venció. Iniciá sesión de nuevo.',
        userNotFound: 'No encontramos tu usuario.',
        inactiveUser: 'Tu usuario no está activo. Comunicate con el club.',
        userDeleted: 'Tu usuario fue dado de baja. Comunicate con el club.',
        accessDenied: 'No tenés permiso para hacer esta acción.'
    },

    upload: {
        invalidType: 'El archivo tiene que ser una imagen JPG, PNG o WEBP.',
        tooLarge: 'La imagen no puede pesar más de 5 MB.',
        failed: 'No pudimos subir el archivo.'
    },

    mail: {
        recoveryFailed: 'No se pudo enviar el correo de recuperación de contraseña'
    }
}

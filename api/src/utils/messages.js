// Mensajes al usuario, agrupados por módulo. Cada módulo agrega su grupo acá.

module.exports = {
    general: {
        serverError: 'Ocurrió un error interno. Probá de nuevo más tarde.',
        invalidJson: 'Los datos enviados no tienen un formato válido.',
        validationError: 'Revisá los datos ingresados.'
    },

    auth: {
        // Sesión y token
        tokenRequired: 'Tenés que iniciar sesión para continuar.',
        invalidToken: 'Tu sesión no es válida o venció. Iniciá sesión de nuevo.',
        sessionNoLongerValid: 'Tu sesión ya no es válida. Iniciá sesión de nuevo.',
        userNotFound: 'No encontramos tu usuario.',
        inactiveUser: 'Tu usuario no está activo. Comunicate con el club.',
        userDeleted: 'Tu cuenta fue dada de baja.',
        accessDenied: 'No tenés permiso para hacer esta acción.',

        // Login
        invalidCredentials: 'Usuario o contraseña incorrectos.',
        pendingUser: 'Tu cuenta todavía no está activada. Si es tu primer ingreso, registrate con tu número de socio.',
        blockedUser: 'Tu cuenta está bloqueada por intentos fallidos. Comunicate con el club.',
        noRoles: 'No tenés roles habilitados en el club. Comunicate con la administración.',

        // Rol activo
        roleSelectionRequired: 'Elegí un rol para continuar.',
        roleNotAvailable: 'No tenés ese rol habilitado.',

        // Registro con número de socio
        registerDataMismatch: 'Los datos ingresados no coinciden con ningún socio.',
        numMemberAlreadyUsed: 'Este número de socio ya fue utilizado. Iniciá sesión con tu usuario.',
        memberInactive: 'Tu condición de socio no está activa. Comunicate con el club.',
        usernameTaken: 'Ese nombre de usuario ya está en uso.',

        // Validaciones de formato
        usernameRequired: 'Ingresá tu usuario.',
        passwordRequired: 'Ingresá tu contraseña.',
        numMemberRequired: 'Ingresá tu número de socio.',
        birthDateInvalid: 'Ingresá una fecha de nacimiento válida (AAAA-MM-DD).',
        usernameLength: 'El usuario tiene que tener entre 4 y 50 caracteres.',
        usernameFormat: 'El usuario solo puede tener letras, números, punto y guion bajo.',
        passwordPolicy: 'La contraseña tiene que tener al menos 8 caracteres, con una mayúscula, una minúscula, un número y un carácter especial.',
        passwordsDontMatch: 'Las contraseñas no coinciden.',
        roleIdInvalid: 'Elegí un rol válido.',

        // Recuperación de contraseña
        forgotPasswordSent: 'Si los datos corresponden a una cuenta, te enviamos un email con los pasos para restablecer tu contraseña.',
        resetTokenInvalid: 'El link para restablecer la contraseña venció o ya fue usado. Pedí uno nuevo.',
        identifierRequired: 'Ingresá tu usuario o tu email.',
        resetTokenRequired: 'Falta el link para restablecer la contraseña. Pedí uno nuevo.',
        samePassword: 'La nueva contraseña tiene que ser distinta de la actual.',

        // Mi cuenta
        currentPasswordRequired: 'Ingresá tu contraseña actual.',
        currentPasswordWrong: 'La contraseña actual no es correcta.',
        emailInvalid: 'Ingresá un email válido.',
        emailTaken: 'Ese email ya está registrado.',
        phoneLength: 'El teléfono puede tener hasta 30 caracteres.',
        emailRequiredAdult: 'Ingresá un email: es obligatorio para los mayores de 18.',
        photoRequired: 'Elegí una imagen para tu foto.'
    },

    access: {
        // Roles
        roleNotFound: 'No encontramos el rol.',
        roleNameTaken: 'Ya existe un rol con ese nombre en el club.',
        baseRoleNotDeletable: 'Los roles base no se pueden eliminar.',
        roleHasUsers: (count) => count === 1
            ? 'Este rol está asignado a 1 usuario. Quitáselo antes de eliminarlo.'
            : `Este rol está asignado a ${count} usuarios. Quitáselo a cada uno antes de eliminarlo.`,
        adminLockedPermissions: 'El rol Admin del Club tiene que conservar los permisos de roles y permisos.',

        // Asignación a usuarios
        userNotFound: 'No encontramos el usuario.',
        circuitRole: 'Este rol se asigna desde su circuito (alta de socio, inscripción, vínculo familiar o alta de staff).',
        lastAdmin: 'No se puede quitar el rol Admin del Club: tiene que quedar al menos un Admin activo.',
        selfAdminRemoval: 'No podés quitarte a vos mismo el rol Admin del Club.',
        rolesNotFound: 'Alguno de los roles elegidos no existe.',
        permissionsNotFound: 'Alguno de los permisos elegidos no existe.',
        notCircuitRole: 'El rol indicado no es un rol de circuito.',

        // Validaciones de formato
        idInvalid: 'El identificador no es válido.',
        roleNameLength: 'El nombre tiene que tener entre 3 y 50 caracteres.',
        roleNameFormat: 'El nombre solo puede tener letras, números, espacios y guiones.',
        descriptionLength: 'La descripción puede tener hasta 200 caracteres.',
        permissionIdsInvalid: 'Elegí permisos válidos.',
        roleIdsInvalid: 'Elegí roles válidos.',
        searchLength: 'La búsqueda puede tener hasta 100 caracteres.',
        pageInvalid: 'La página no es válida.'
    },

    clubs: {
        clubNotFound: 'No encontramos el club.',
        sportNotFound: 'No encontramos el deporte.',
        sportHasInscriptions: 'Hay socios inscriptos en este deporte. No se puede desactivar.',
        emailTaken: 'Ese email ya lo usa otro club.',

        // Validaciones de formato
        socialFeeInvalid: 'La cuota social tiene que ser un número mayor a 0.',
        priceFeeInvalid: 'La cuota deportiva tiene que ser un número mayor a 0.',
        delayFeeInvalid: 'Los días de atraso tienen que ser un número entero mayor o igual a 1.',
        conflictMarginInvalid: 'El margen de conflicto tiene que ser un número entero de minutos, mayor o igual a 0.',
        addressInvalid: 'Ingresá la dirección (hasta 100 caracteres).',
        phoneInvalid: 'El teléfono puede tener hasta 30 caracteres.',
        emailInvalid: 'Ingresá un email válido (hasta 100 caracteres).',
        accentColorInvalid: 'El color tiene que tener el formato #RRGGBB.',
        extraInfoInvalid: 'La información general no tiene el formato esperado.',
        whatsappInvalid: 'El WhatsApp puede tener hasta 30 caracteres.',
        secretaryHoursInvalid: 'Cada horario de secretaría tiene que tener entre 1 y 100 caracteres (hasta 10 líneas).',
        courtsInvalid: 'Cada cancha necesita nombre y dirección (hasta 100 caracteres cada uno, hasta 20 canchas).',
        trainingScheduleInvalid: 'Cada horario de entrenamiento necesita deporte y horario (hasta 100 caracteres cada uno, hasta 20).',
        isActiveInvalid: 'Indicá si el deporte está activo.',
        idInvalid: 'El identificador no es válido.'
    },

    members: {
        memberNotFound: 'No encontramos el socio.',
        userNotFound: 'No encontramos el usuario.',
        isStaff: 'Esta persona es staff del club y no puede ser socia.',
        alreadyMember: (numMember) => `Esta persona ya es socia (Nº ${numMember}).`,
        existingUser: (name) => `${name} ya tiene usuario en el club.`,
        existingUserMismatch: 'Los datos no corresponden al usuario indicado. Volvé a cargar el alta.',
        dniTaken: 'Ese DNI ya está registrado.',
        emailTaken: 'Ese email ya está registrado.',
        usernameTaken: 'Ese nombre de usuario ya está en uso.',
        emailRequiredAdult: 'Ingresá un email: es obligatorio para los mayores de 18.',
        usernameNotRegistered: 'El socio todavía no se registró: el nombre de usuario lo elige al registrarse.',
        memberNumberFailed: 'No pudimos generar el número de socio. Probá de nuevo.',
        alreadyInactive: 'El socio ya está dado de baja.',
        notInactive: 'Solo se puede reactivar a un socio dado de baja.',
        suspendedNotReactivable: 'El socio está suspendido por mora: se reactiva solo cuando regulariza sus cuotas.',
        notBlocked: 'El usuario no está bloqueado.',

        // Validaciones de formato
        idInvalid: 'El identificador no es válido.',
        nameInvalid: 'Ingresá el nombre (hasta 100 caracteres).',
        lastNameInvalid: 'Ingresá el apellido (hasta 100 caracteres).',
        dniInvalid: 'El DNI tiene que tener 7 u 8 dígitos, sin puntos.',
        birthDateInvalid: 'Ingresá una fecha de nacimiento válida, que no sea futura.',
        emailInvalid: 'Ingresá un email válido (hasta 150 caracteres).',
        phoneInvalid: 'El teléfono puede tener hasta 30 caracteres.',
        usernameLength: 'El usuario tiene que tener entre 4 y 50 caracteres.',
        usernameFormat: 'El usuario solo puede tener letras, números, punto y guion bajo.',
        existingUserIdInvalid: 'El usuario indicado no es válido.',
        searchLength: 'La búsqueda puede tener hasta 100 caracteres.',
        stateInvalid: 'El estado no es válido.',
        registrationInvalid: 'El filtro de registro no es válido.',
        pageInvalid: 'La página no es válida.'
    },

    upload: {
        invalidType: 'El archivo tiene que ser una imagen JPG, PNG o WEBP.',
        tooLarge: 'La imagen no puede pesar más de 5 MB.',
        failed: 'No pudimos subir el archivo.'
    },

    mail: {
        recoveryFailed: 'No se pudo enviar el correo de recuperación de contraseña',
        passwordChangedFailed: 'No se pudo enviar el aviso de cambio de contraseña'
    }
}

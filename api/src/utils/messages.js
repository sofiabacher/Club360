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
        pendingUser: 'Tu cuenta todavía no está activada. Si es tu primer ingreso como socio, registrate con tu número de socio; si sos parte del staff, usá el link del email de activación.',
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
        photoRequired: 'Elegí una imagen para tu foto.',

        // Activación de la cuenta (staff)
        activationTokenInvalid: 'El link de activación venció o ya fue usado. Pedile al club que te envíe uno nuevo.',
        activationTokenRequired: 'Falta el link de activación. Pedile al club que te envíe uno nuevo.',

        // Desvincularse del adulto responsable
        notLinked: 'No tenés un adulto responsable vinculado.',
        unlinkAdultOnly: 'Solo los socios mayores de 18 pueden desvincularse del adulto responsable.'
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

        // Vínculo familiar
        codeInvalid: 'El código no es válido.',
        codeUsed: 'Este código ya fue usado.',
        familyAdultRequired: 'Para vincularte como Familia tenés que ser mayor de 18.',
        familyExistingAccount: "Ya tenés un usuario en el club. Elegí 'Ya tengo usuario' e ingresá con él.",
        familyOwnCode: 'No podés vincularte con tu propio código.',

        // Validaciones de formato
        idInvalid: 'El identificador no es válido.',
        codeFormat: 'Ingresá el código con el formato XXXX-XXXX.',
        emailRequired: 'Ingresá un email válido (hasta 150 caracteres).',
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

    staff: {
        staffNotFound: 'No encontramos a esa persona del staff.',
        isMember: 'Esta persona es socia del club y no puede ser staff.',
        alreadyStaff: 'Esta persona ya es parte del staff.',
        existingUser: (name) => `${name} ya tiene usuario en el club.`,
        existingUserMismatch: 'Los datos no corresponden al usuario indicado. Volvé a cargar el alta.',
        sportNotActive: 'Elegí uno de los deportes activos del club.',
        dniTaken: 'Ese DNI ya está registrado.',
        emailTaken: 'Ese email ya está registrado.',
        usernameTaken: 'Ese nombre de usuario ya está en uso.',
        usernameNotActivated: 'Todavía no activó su cuenta: el nombre de usuario lo elige al activarla.',
        notActiveStaff: 'Es ex staff: reactivalo para modificar sus datos.',
        alreadyInactive: 'Ya no es parte del staff.',
        alreadyActive: 'Ya es parte del staff: para cambiar sus roles, editalo.',
        notBlocked: 'El usuario no está bloqueado.',
        notPending: 'Ya activó su cuenta: no hace falta reenviar el email.',
        activationFailed: 'No pudimos enviar el email de activación. Probá reenviarlo en unos minutos.',

        // Validaciones de formato
        idInvalid: 'El identificador no es válido.',
        nameInvalid: 'Ingresá el nombre (hasta 100 caracteres).',
        lastNameInvalid: 'Ingresá el apellido (hasta 100 caracteres).',
        dniInvalid: 'El DNI tiene que tener 7 u 8 dígitos, sin puntos.',
        birthDateInvalid: 'Ingresá una fecha de nacimiento válida, que no sea futura.',
        emailInvalid: 'Ingresá un email válido (hasta 150 caracteres): es obligatorio, porque por ahí recibe la activación.',
        phoneInvalid: 'El teléfono puede tener hasta 30 caracteres.',
        rolesInvalid: 'Elegí al menos un rol de staff.',
        clubSportIdInvalid: 'Elegí el deporte.',
        usernameLength: 'El usuario tiene que tener entre 4 y 50 caracteres.',
        usernameFormat: 'El usuario solo puede tener letras, números, punto y guion bajo.',
        existingUserIdInvalid: 'El usuario indicado no es válido.',
        searchLength: 'La búsqueda puede tener hasta 100 caracteres.',
        roleInvalid: 'El rol no es válido.',
        stateInvalid: 'El estado no es válido.',
        pageInvalid: 'La página no es válida.'
    },

    leagues: {
        leagueNotFound: 'No encontramos la liga.',
        categoryNotFound: 'No encontramos la categoría.',
        sportNotActive: 'Elegí uno de los deportes activos del club.',
        sportOutOfScope: 'Solo podés gestionar las ligas de tu deporte.',
        leagueNameTaken: 'Ya hay una liga activa con ese nombre en este deporte.',
        categoryNameTaken: 'Ya hay una categoría activa con ese nombre en esta liga.',
        ageScaleLocked: 'La liga ya tiene categorías: no se puede cambiar su escala de edad.',
        ageGroupInvalid: 'Elegí un grupo de edad de la escala de la liga.',
        leagueInactive: 'La liga está dada de baja. Reactivala primero.',
        leagueAlreadyInactive: 'La liga ya está dada de baja.',
        leagueAlreadyActive: 'La liga ya está activa.',
        categoryInactive: 'La categoría está dada de baja: no acepta asignaciones.',
        categoryAlreadyInactive: 'La categoría ya está dada de baja.',
        categoryAlreadyActive: 'La categoría ya está activa.',
        membersNotFound: 'Alguna de las socias elegidas no existe.',
        staffNotFound: 'Alguna de las personas del staff elegidas no existe.',
        playerNotAssigned: 'La jugadora no está en esta categoría.',
        staffNotAssigned: 'Esa persona no está en el staff de esta categoría.',

        // Motivos por los que no se puede asignar (con el nombre)
        memberInactive: (name) => `${name} es una socia inactiva.`,
        noInscription: (name, sport) => `${name} no tiene una inscripción aprobada en ${sport}.`,
        exceedsAge: (name, label, age, year) => `${name} supera la edad de ${label} (tiene ${age} en ${year}).`,
        notStaff: (name) => `${name} ya no es parte del staff.`,
        otherSport: (name) => `${name} es staff de otro deporte.`,
        notCategoryStaff: (name) => `${name} no es Entrenadora ni Preparadora física.`,

        // Validaciones de formato
        idInvalid: 'El identificador no es válido.',
        nameInvalid: 'Ingresá el nombre (hasta 100 caracteres).',
        categoryNameInvalid: 'El nombre puede tener hasta 100 caracteres.',
        clubSportIdInvalid: 'Elegí el deporte.',
        ageScaleInvalid: 'Elegí la escala de edad.',
        ageGroupRequired: 'Elegí el grupo de edad.',
        memberIdsInvalid: 'Elegí al menos una jugadora.',
        staffIdsInvalid: 'Elegí al menos una persona del staff.',
        includeInactiveInvalid: 'El filtro no es válido.',
        searchLength: 'La búsqueda puede tener hasta 100 caracteres.'
    },

    notifications: {
        notificationNotFound: 'No encontramos la notificación.',
        sentNotFound: 'No encontramos ese envío.',
        batchIdInvalid: 'El envío no es válido.',
        senderIdInvalid: 'El remitente no es válido.',
        invalidType: 'El tipo de notificación no existe.',
        noRecipients: 'No hay destinatarios para esta opción.',
        audienceNotAllowed: 'No podés enviar avisos a esos destinatarios.',
        categoryNotAllowed: 'Solo podés enviar avisos a tus categorías.',

        // Validaciones de formato
        idInvalid: 'El identificador no es válido.',
        pageInvalid: 'La página no es válida.',
        unreadInvalid: 'El filtro no es válido.',
        titleInvalid: 'El título tiene que tener entre 3 y 150 caracteres.',
        messageInvalid: 'El mensaje tiene que tener entre 1 y 2000 caracteres.',
        sendEmailInvalid: 'Indicá si se envía también por email.',
        audienceInvalid: 'Elegí a quién le llega el aviso.',
        segmentsInvalid: 'Elegí al menos un grupo.',
        staffRolesInvalid: 'Los roles de staff no son válidos.',
        groupsInvalid: 'Elegí al menos un grupo.',
        categoryIdsInvalid: 'Elegí al menos una categoría.',
        includeFamiliesInvalid: 'Indicá si se incluye a las familias.'
    },

    games: {
        gameNotFound: 'No encontramos el partido.',
        categoryNotFound: 'No encontramos la categoría.',
        categoryInactive: 'La categoría está dada de baja: no se le pueden cargar partidos.',
        mustBeFuture: 'La fecha y hora del partido tienen que ser en el futuro.',
        notScheduled: 'Solo se pueden modificar los partidos Programados.',
        notPlayedYet: 'El partido todavía no se jugó: se puede marcar como jugado después de la fecha y hora.',
        notMember: 'No sos socia del club.',
        linkedMemberNotFound: 'No encontramos a esa jugadora entre tus vinculadas.',
        conflictNotFound: 'Ese conflicto ya no existe: los partidos no se superponen o cambiaron.',
        conflictAlreadyResolved: 'Ese conflicto ya está resuelto.',
        conflictNotYours: 'Solo lo puede resolver una entrenadora de alguna de las dos categorías.',
        chosenGameInvalid: 'Elegí uno de los dos partidos del conflicto.',

        // Validaciones de formato
        idInvalid: 'El identificador no es válido.',
        categoryIdInvalid: 'Elegí la categoría.',
        rivalInvalid: 'Ingresá el rival (hasta 100 caracteres).',
        dateTimeInvalid: 'Ingresá una fecha y hora válidas.',
        isHomeInvalid: 'Indicá si el partido es de local o de visitante.',
        addressInvalid: 'Ingresá la dirección (hasta 200 caracteres).',
        reasonInvalid: 'El motivo puede tener hasta 300 caracteres.',
        stateInvalid: 'El estado no es válido.',
        dateInvalid: 'Ingresá una fecha válida (AAAA-MM-DD).',
        pageInvalid: 'La página no es válida.',
        memberIdInvalid: 'La jugadora no es válida.',
        gameIdsInvalid: 'Indicá los dos partidos del conflicto.',
        noteInvalid: 'La nota puede tener hasta 300 caracteres.'
    },

    citations: {
        gameNotFound: 'No encontramos el partido entre los de tus categorías.',
        citationNotFound: 'No encontramos la citación.',
        notScheduled: 'Solo se puede citar para partidos Programados.',
        tooLate: 'Las citaciones se generan con al menos 2 días de anticipación.',
        notYetOpen: (when) => `Las citaciones para este partido se habilitan el ${when}.`,
        membersNotFound: 'Alguna de las jugadoras elegidas no es socia del club.',
        notInCategory: (name) => `${name} no está en la categoría del partido.`,
        overdue: (name) => `${name} tiene cuotas atrasadas: no se la puede citar hasta que regularice su situación.`,
        conflictResolved: (name, category, rival) => `${name} no se puede citar: por un conflicto de horario ya resuelto, juega ${category} vs. ${rival}.`,
        alreadyCited: (name) => `${name} ya está citada para este partido.`,
        alreadyRejected: (name) => `${name} rechazó la citación de este partido: no se la puede volver a citar.`,
        cannotCancel: 'Solo se pueden cancelar las citaciones Pendientes o Confirmadas, antes del partido.',
        notMember: 'No sos socia del club.',
        alreadyAnswered: 'Esta citación ya no está pendiente: la respuesta no se puede cambiar.',
        responseExpired: 'Se venció el plazo para responder esta citación.',
        linkedMemberNotFound: 'No encontramos a esa jugadora entre tus vinculadas.',

        // Validaciones de formato
        idInvalid: 'El identificador no es válido.',
        memberIdsInvalid: 'Elegí al menos una jugadora.',
        memberIdInvalid: 'La jugadora no es válida.',
        responseInvalid: 'La respuesta tiene que ser confirmar o rechazar.',
        justificationInvalid: 'Contá por qué no podés ir (entre 10 y 300 caracteres).',
        scopeInvalid: 'El filtro no es válido.',
        dateInvalid: 'Ingresá una fecha válida (AAAA-MM-DD).'
    },

    inscriptions: {
        notMember: 'No sos socio del club.',
        memberSuspended: 'Tenés cuotas atrasadas: regularizá tu situación para inscribirte a un deporte.',
        memberNotActive: 'Tu condición de socio no está activa: acercate a la secretaría del club.',
        sportNotFound: 'El deporte no está disponible en el club.',
        alreadyRequested: 'Ya tenés una inscripción pendiente o aprobada en este deporte.',
        inscriptionNotFound: 'No encontramos la inscripción.',
        notPending: 'La inscripción ya no está pendiente.',
        cannotWithdraw: 'Solo se puede cancelar una solicitud Pendiente o darse de baja de una inscripción Aprobada.',
        memberNoLongerActive: 'El socio ya no está activo: no se puede aprobar la inscripción.',

        // Validaciones de formato
        idInvalid: 'El identificador no es válido.',
        clubSportIdInvalid: 'Elegí un deporte.',
        stateInvalid: 'El estado no es válido.',
        reasonInvalid: 'El motivo puede tener hasta 300 caracteres.',
        searchInvalid: 'La búsqueda puede tener hasta 100 caracteres.',
        pageInvalid: 'La página no es válida.'
    },

    fees: {
        feeNotFound: 'No encontramos la cuota.',
        memberNotFound: 'No encontramos al socio.',
        notMember: 'No sos socio del club.',
        linkedMemberNotFound: 'No encontramos a esa jugadora entre tus vinculadas.',
        alreadyPaid: 'Esta cuota ya está pagada.',
        futurePeriod: 'No se pueden generar cuotas de un período que todavía no empezó.',

        // Validaciones de formato
        idInvalid: 'El identificador no es válido.',
        periodInvalid: 'Elegí un período válido (AAAA-MM).',
        stateInvalid: 'El estado no es válido.',
        statusInvalid: 'La situación no es válida.',
        searchInvalid: 'La búsqueda puede tener hasta 100 caracteres.',
        pageInvalid: 'La página no es válida.',
        noteInvalid: 'La nota puede tener hasta 300 caracteres.',
        cardNumberInvalid: 'El número de tarjeta tiene que tener entre 13 y 19 dígitos.',
        cardHolderInvalid: 'Ingresá el nombre del titular, como figura en la tarjeta.',
        cardExpiryInvalid: 'Ingresá un vencimiento válido (MM/AA).',
        cardExpired: 'La tarjeta está vencida.',
        cardCvvInvalid: 'El código de seguridad tiene 3 o 4 dígitos.'
    },

    upload: {
        invalidType: 'El archivo tiene que ser una imagen JPG, PNG o WEBP.',
        tooLarge: 'La imagen no puede pesar más de 5 MB.',
        failed: 'No pudimos subir el archivo.'
    },

    mail: {
        recoveryFailed: 'No se pudo enviar el correo de recuperación de contraseña',
        passwordChangedFailed: 'No se pudo enviar el aviso de cambio de contraseña',
        activationFailed: 'No se pudo enviar el email de activación',
        notificationFailed: 'No se pudo enviar el email de la notificación'
    }
}

// Datos del club a cargar. Para cargar otro club solo se cambian estos datos.
const CLUB_SEED = {
    club: {
        name: 'Valencia',
        address: 'Dirección a completar',        // [COMPLETAR]
        phone: null,                             // [COMPLETAR]
        email: 'contacto@valencia-club.com',     // [COMPLETAR]
        socialFee: 10000,                        // [COMPLETAR]
        delayFee: 180,                           // Días de atraso para la mora (default del contexto)
        conflictMargin: 60                       // Minutos
    },

    // Catálogo maestro de deportes de la plataforma
    sports: ['Vóley', 'Futsal', 'Básquet'],

    // Deportes que activa el club, con su cuota deportiva
    activeSports: [
        { name: 'Vóley', priceFee: 15000 }       // [COMPLETAR] el valor
    ]
}

module.exports = { CLUB_SEED }

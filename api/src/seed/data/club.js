// Datos del club a cargar. Para cargar otro club solo se cambian estos datos.
const CLUB_SEED = {
    // Nombre con el que se cargó el club antes del 21/10/2026: si existe, el seed lo renombra en lugar de crear otro club
    previousNames: ['Valencia'],

    club: {
        name: 'Club Valencia',                                   // [PROVISORIO] contexto 2.1
        address: 'Av. Ejemplo 1234, Ciudad de Buenos Aires',     // [PROVISORIO] contexto 2.1
        phone: '(011) 4000-0000',                                // [PROVISORIO] contexto 2.1
        email: 'contacto@clubvalencia.example',                  // [PROVISORIO] contexto 2.1
        socialFee: 15000,                                        // [PROVISORIO] contexto 2.1
        delayFee: 180,                                           // Días de atraso para la mora (contexto, sección 2)
        conflictMargin: 60,                                      // Minutos (contexto, sección 2)
        accentColor: '#2E9BD6',                                  // [PROVISORIO] contexto 2.1: Celeste Valencia

        // [PROVISORIO] contexto 2.1. Estructura comentada en el modelo Club
        extraInfo: {
            whatsapp: '11 5000-0000',
            secretaryHours: [
                'Lunes a viernes de 9 a 13 y de 16 a 21',
                'Sábados de 9 a 13'
            ],
            courts: [
                { name: 'Cancha 1', address: 'Av. Ejemplo 1234, Ciudad de Buenos Aires' },
                { name: 'Cancha 2', address: 'Av. Ejemplo 1234, Ciudad de Buenos Aires' },
                { name: 'Cancha Anexo', address: 'Calle Ficticia 567, Ciudad de Buenos Aires' }
            ],
            trainingSchedule: [
                { sport: 'Vóley', schedule: 'Lunes, miércoles y viernes de 18 a 22' }
            ]
        }
    },

    // Catálogo maestro de deportes de la plataforma
    sports: ['Vóley', 'Futsal', 'Básquet'],

    // Deportes que activa el club, con su cuota deportiva
    activeSports: [
        { name: 'Vóley', priceFee: 25000 }                       // [PROVISORIO] contexto 2.1
    ]
}

module.exports = { CLUB_SEED }

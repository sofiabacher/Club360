// Datos de la demo del club Valencia (npm run seed:demo). La lógica está en seed/demo.js.
// Todos los nombres son inventados. Las fechas de nacimiento son fijas (definen los casos); el resto de las fechas se
// calcula desde el día en que se corre el script. Si cambian estos datos, se actualiza docs/demo-usuarios.md.
//
// key: identifica a cada persona (es su username; Natalia y Rocío no tienen usuario todavía). Es también la clave de
// SEED_DEMO_REAL_EMAILS y el alias de su email (casilla+key@...).
// card: últimos 4 dígitos de la tarjeta con la que paga sus cuotas (o las de sus vinculadas). Sin card, en secretaría.

// ---------- Staff ----------
// roles: nombres de BASE_ROLES. categories: códigos de DEMO_CATEGORIES. pending: Pendiente de activación (sin usuario)
const DEMO_STAFF = [
    { key: 'mferreyra', name: 'Mariana', lastName: 'Ferreyra', birthDate: '1985-04-09', roles: ['REPRESENTATIVE'], categories: [] },
    { key: 'cbenitez', name: 'Carla', lastName: 'Benítez', birthDate: '1990-08-22', roles: ['COACH'], categories: ['SUB16', 'SUB18'] },
    { key: 'lquiroga', name: 'Laura', lastName: 'Quiroga', birthDate: '1987-12-03', roles: ['COACH'], categories: ['MAYORES'] },
    { key: 'vsosa', name: 'Valeria', lastName: 'Sosa', birthDate: '1992-02-15', roles: ['TRAINER', 'COACH'], categories: ['SUB16', 'SUB18', 'MAYORES'] },
    { key: 'nibanez', name: 'Natalia', lastName: 'Ibáñez', birthDate: '1994-06-30', roles: ['COACH'], categories: [], pending: true }
]

// ---------- Socias y familias (los casos de la demo) ----------
// Campos de cada caso:
//   player: inscripción Aprobada a Vóley y rol Jugadora; categories: dónde juega
//   joined: 'default' (día 15 de hace 6 meses), 'early' (hace 10 meses) o 'today'
//   unpaidMonths: cuántas cuotas impagas tiene, contando desde la del mes actual hacia atrás (0: al día)
//   memberState: 'ACTIVE' (por defecto), 'SUSPENDED' o 'INACTIVE'; userState: 'ACTIVE' (por defecto), 'PENDING' o 'BLOCKED'
//   adultKey: el adulto Familia vinculado (los menores); unusedCode: menor con su código de vínculo sin usar
//   inscriptionPending: socia con la inscripción a Vóley Pendiente; noEmail: menor sin email (lo recibe su adulto)
//   memberOnlyFamily: Familia que no es socio (no tiene member)
const DEMO_MEMBERS = [
    { key: 'ctorres', name: 'Camila', lastName: 'Torres', birthDate: '2008-03-14', player: true, categories: ['SUB18', 'MAYORES'], card: '4242', rejectedPayment: true },
    { key: 'sromero', name: 'Sofía', lastName: 'Romero', birthDate: '2011-05-22', player: true, categories: ['SUB16'], adultKey: 'gromero', unpaidMonths: 2, noEmail: true },
    { key: 'mromero', name: 'Martina', lastName: 'Romero', birthDate: '2013-09-03', player: true, categories: ['SUB16'], adultKey: 'gromero', noEmail: true },
    { key: 'gromero', name: 'Gabriela', lastName: 'Romero', birthDate: '1982-06-08', card: '5566' },
    { key: 'vruiz', name: 'Valentina', lastName: 'Ruiz', birthDate: '2009-07-30', player: true, categories: ['SUB18'], adultKey: 'rruiz' },
    { key: 'jmendez', name: 'Julieta', lastName: 'Méndez', birthDate: '2010-02-11', player: true, categories: ['SUB16'], unusedCode: true },
    { key: 'acastro', name: 'Abril', lastName: 'Castro', birthDate: '2003-08-19', player: true, categories: ['MAYORES'], joined: 'early', unpaidMonths: 8, memberState: 'SUSPENDED', card: '7310' },
    { key: 'pgimenez', name: 'Paula', lastName: 'Giménez', birthDate: '1999-04-25', player: true, categories: ['MAYORES'], unpaidMonths: 1, card: '1881' },
    { key: 'faguirre', name: 'Florencia', lastName: 'Aguirre', birthDate: '1996-12-02', inscriptionPending: true, card: '3090' },
    { key: 'rfernandez', name: 'Rocío', lastName: 'Fernández', birthDate: '1990-10-09', joined: 'today', userState: 'PENDING' },
    { key: 'mponce', name: 'Micaela', lastName: 'Ponce', birthDate: '1988-01-21', userState: 'BLOCKED' },
    { key: 'alucero', name: 'Ana', lastName: 'Lucero', birthDate: '1975-05-05', memberState: 'INACTIVE' }
]

// Familia que no es socio: solo tiene el rol Familia (de Valentina)
const DEMO_FAMILY_ONLY = [
    { key: 'rruiz', name: 'Roberto', lastName: 'Ruiz', birthDate: '1978-11-17', card: '7788' }
]

// ---------- Jugadoras de relleno (4 por categoría, cuotas al día) ----------
// Las de Sub-16 y Sub-18 son menores sin adulto vinculado: pagan en secretaría
const DEMO_FILLER_PLAYERS = [
    { key: 'lucia.paz', name: 'Lucía', lastName: 'Paz', birthDate: '2011-04-12', categories: ['SUB16'] },
    { key: 'mora.villalba', name: 'Mora', lastName: 'Villalba', birthDate: '2012-01-30', categories: ['SUB16'] },
    { key: 'pilar.medina', name: 'Pilar', lastName: 'Medina', birthDate: '2011-09-08', categories: ['SUB16'] },
    { key: 'delfina.ortiz', name: 'Delfina', lastName: 'Ortiz', birthDate: '2012-06-21', categories: ['SUB16'] },
    { key: 'agustina.rey', name: 'Agustina', lastName: 'Rey', birthDate: '2009-10-03', categories: ['SUB18'] },
    { key: 'candela.sanchez', name: 'Candela', lastName: 'Sánchez', birthDate: '2010-02-17', categories: ['SUB18'] },
    { key: 'juana.molina', name: 'Juana', lastName: 'Molina', birthDate: '2009-12-29', categories: ['SUB18'] },
    { key: 'renata.luna', name: 'Renata', lastName: 'Luna', birthDate: '2010-08-11', categories: ['SUB18'] },
    { key: 'brenda.rios', name: 'Brenda', lastName: 'Ríos', birthDate: '1998-03-05', categories: ['MAYORES'], card: '2468' },
    { key: 'lorena.vega', name: 'Lorena', lastName: 'Vega', birthDate: '2001-07-14', categories: ['MAYORES'] },
    { key: 'carolina.diaz', name: 'Carolina', lastName: 'Díaz', birthDate: '1995-11-02', categories: ['MAYORES'], card: '9012' },
    { key: 'milagros.herrera', name: 'Milagros', lastName: 'Herrera', birthDate: '2000-05-27', categories: ['MAYORES'], card: '3355' }
]

// ---------- Ligas y categorías ----------
// code: el ageGroup de AGE_SCALES (y la clave con la que se nombra la categoría en estos datos)
const DEMO_LEAGUES = [
    { name: 'Liga Metropolitana de Vóley', ageScale: 1, categories: ['SUB16', 'SUB18'] },
    { name: 'Liga Federal Femenina', ageScale: 2, categories: ['MAYORES'] }
]

// Entrenadora que cita en cada categoría
const DEMO_CATEGORY_COACH = { SUB16: 'cbenitez', SUB18: 'cbenitez', MAYORES: 'lquiroga' }

// Hora de los partidos de cada categoría en las fechas sin caso especial: no generan otros conflictos (Camila juega
// Sub-18 a las 10 y Mayores a las 16, con 4 horas entre el fin de uno y el inicio del otro)
const DEMO_DEFAULT_TIMES = { SUB16: '18:30', SUB18: '10:00', MAYORES: '16:00' }

// ---------- Partidos ----------
// day: días desde hoy (H). court: nombre de una cancha de club.extraInfo.courts (local); address: la de visitante.
// state: 'SCHEDULED' (por defecto), 'PLAYED' o 'CANCELLED'.
// citations: { key: estado } con los estados de CITATION_STATES ('ALL_PLAYED' cita a toda la categoría, salvo Abril)
const DEMO_GAMES = [
    // Jugados (H-14 y H-7), con citaciones de toda la categoría
    { category: 'SUB16', day: -14, rival: 'Unión Vecinal', court: 'Cancha 1', state: 'PLAYED', citations: 'ALL_PLAYED', autoConfirmed: 'mora.villalba' },
    { category: 'SUB18', day: -14, rival: 'Estrella del Oeste', address: 'Av. de los Pinos 2100, Ciudad de Buenos Aires', state: 'PLAYED', citations: 'ALL_PLAYED', autoConfirmed: 'renata.luna' },
    { category: 'MAYORES', day: -14, rival: 'Atlético Ribera', address: 'Calle del Río 455, Ciudad de Buenos Aires', state: 'PLAYED', citations: 'ALL_PLAYED', autoConfirmed: 'lorena.vega' },
    { category: 'SUB16', day: -7, rival: 'Náutico Sur', address: 'Costanera Sur 980, Ciudad de Buenos Aires', state: 'PLAYED', citations: 'ALL_PLAYED', autoConfirmed: 'lucia.paz',
        rejected: { key: 'delfina.ortiz', justification: 'Estoy con un esguince de tobillo y no puedo jugar.' } },
    { category: 'SUB18', day: -7, rival: 'Social Parque', court: 'Cancha 2', state: 'PLAYED', citations: 'ALL_PLAYED', autoConfirmed: 'candela.sanchez' },
    { category: 'MAYORES', day: -7, rival: 'Unión Vecinal', court: 'Cancha 1', state: 'PLAYED', citations: 'ALL_PLAYED', autoConfirmed: 'carolina.diaz' },

    // Cancelado (H-3), con sus citaciones Canceladas
    { category: 'MAYORES', day: -3, rival: 'Deportivo Lomas', address: 'Av. Lomas 3300, Ciudad de Buenos Aires', state: 'CANCELLED',
        citations: { ctorres: 'CANCELLED', pgimenez: 'CANCELLED', 'brenda.rios': 'CANCELLED', 'lorena.vega': 'CANCELLED' } },

    // Programados dentro de la ventana de citación
    { category: 'SUB16', day: 4, time: '18:30', rival: 'Atlético Ribera', court: 'Cancha 1',
        citations: { sromero: 'CONFIRMED', 'lucia.paz': 'CONFIRMED', 'mora.villalba': 'CONFIRMED', mromero: 'PENDING', 'pilar.medina': 'REJECTED' },
        rejected: { key: 'pilar.medina', justification: 'Tengo un examen ese día y no llego.' } },
    { category: 'SUB18', day: 5, time: '10:00', rival: 'Náutico Sur', address: 'Costanera Sur 980, Ciudad de Buenos Aires', citations: {} },   // Se cita en vivo
    { category: 'MAYORES', day: 5, time: '12:00', rival: 'Social Parque', court: 'Cancha Anexo', citations: { ctorres: 'PENDING', pgimenez: 'CONFIRMED' }, fixtureNotice: true },

    // Programados fuera de la ventana (H+11 y H+18), sin citaciones
    { category: 'SUB16', day: 11, rival: 'Social Parque', address: 'Av. del Parque 1500, Ciudad de Buenos Aires' },
    { category: 'SUB18', day: 11, rival: 'Deportivo Lomas', court: 'Cancha 1' },
    { category: 'MAYORES', day: 11, rival: 'Estrella del Oeste', court: 'Cancha 2' },
    { category: 'SUB16', day: 18, rival: 'Estrella del Oeste', court: 'Cancha 2' },
    { category: 'SUB18', day: 18, rival: 'Atlético Ribera', address: 'Calle del Río 455, Ciudad de Buenos Aires' },
    { category: 'MAYORES', day: 18, rival: 'Náutico Sur', address: 'Costanera Sur 980, Ciudad de Buenos Aires' }
]

// ---------- Rutinas (lunes, miércoles y viernes; semana actual y las dos anteriores) ----------
const DEMO_ROUTINES = {
    SUB16: {
        1: { title: 'Saltabilidad y core', description: 'Entrada en calor: 10 minutos de trote suave y movilidad articular de tobillos, caderas y hombros.\nBloque 1: 3 series de 8 saltos al cajón bajo, con caída controlada.\nBloque 2: 3 series de 10 sentadillas con salto, pausa de 1 minuto.\nCore: 3 series de 30 segundos de plancha frontal y lateral.\nVuelta a la calma: elongación de piernas y espalda.' },
        3: { title: 'Desplazamientos y coordinación', description: 'Entrada en calor: escalera de coordinación, 6 pasadas con distintos apoyos.\nBloque 1: desplazamientos laterales de red a red, 4 series de 30 segundos.\nBloque 2: cambios de dirección con conos, 5 pasadas por jugadora.\nCore: 3 series de 12 abdominales bicicleta.\nVuelta a la calma: elongación guiada.' },
        5: { title: 'Fuerza básica con peso corporal', description: 'Entrada en calor: 8 minutos de juegos de reacción.\nBloque 1: 3 series de 10 estocadas por pierna.\nBloque 2: 3 series de 8 flexiones de brazos (con apoyo de rodillas si hace falta).\nBloque 3: 3 series de 12 puentes de glúteo.\nVuelta a la calma: respiración y elongación de hombros.' }
    },
    SUB18: {
        1: { title: 'Potencia de salto para el bloqueo', description: 'Entrada en calor: 10 minutos de movilidad y activación con bandas elásticas.\nBloque 1: 4 series de 6 saltos al cajón medio.\nBloque 2: 4 series de 8 saltos de bloqueo en la red, con desplazamiento de dos pasos.\nCore: 3 series de 40 segundos de plancha con toque de hombros.\nVuelta a la calma: elongación de gemelos y cuádriceps.' },
        3: { title: 'Resistencia intermitente', description: 'Entrada en calor: trote y skipping, 8 minutos.\nBloque 1: 6 pasadas de 20 metros ida y vuelta, con 30 segundos de pausa.\nBloque 2: circuito de 4 estaciones (saltos, desplazamientos, abdominales y flexiones), 40 segundos de trabajo y 20 de pausa, 3 vueltas.\nVuelta a la calma: elongación completa.' },
        5: { title: 'Fuerza de tren superior y hombros', description: 'Entrada en calor: rotaciones de hombro con banda elástica, 3 series de 15.\nBloque 1: 4 series de 10 flexiones de brazos.\nBloque 2: 3 series de 12 remos con banda.\nBloque 3: 3 series de 10 lanzamientos de pelota medicinal contra la pared.\nCore: 3 series de 30 segundos de plancha lateral por lado.\nVuelta a la calma: elongación de hombros y espalda.' }
    },
    MAYORES: {
        1: { title: 'Saltabilidad y core', description: 'Entrada en calor: 12 minutos de movilidad dinámica y activación de glúteos con bandas.\nBloque 1: 5 series de 5 saltos al cajón alto, con caída controlada.\nBloque 2: 4 series de 6 saltos de ataque con carrera de tres pasos.\nCore: 4 series de 45 segundos de plancha frontal y 12 rotaciones rusas.\nVuelta a la calma: elongación y liberación con rodillo.' },
        3: { title: 'Velocidad de reacción en defensa', description: 'Entrada en calor: 10 minutos de juegos de reacción con pelota.\nBloque 1: caídas y recuperaciones de defensa, 4 series de 6 por lado.\nBloque 2: desplazamientos a la señal (visual y auditiva), 5 series de 30 segundos.\nBloque 3: 3 series de 10 sentadillas búlgaras por pierna.\nVuelta a la calma: elongación de cadera y espalda baja.' },
        5: { title: 'Fuerza y prevención de lesiones', description: 'Entrada en calor: movilidad de tobillos, rodillas y hombros, 10 minutos.\nBloque 1: 4 series de 8 peso muerto a una pierna con mancuerna liviana.\nBloque 2: 3 series de 15 rotaciones externas de hombro con banda.\nBloque 3: 3 series de 30 segundos de equilibrio en una pierna sobre superficie inestable.\nCore: 3 series de 12 abdominales con elevación de piernas.\nVuelta a la calma: elongación completa.' }
    }
}

// ---------- Aviso general del Admin ----------
const DEMO_GENERAL_NOTICE = {
    title: 'Reunión de familias',
    message: 'Recordamos que el sábado a las 10 hay reunión de familias en la sede para organizar el torneo de fin de año.'
}

module.exports = {
    DEMO_STAFF,
    DEMO_MEMBERS,
    DEMO_FAMILY_ONLY,
    DEMO_FILLER_PLAYERS,
    DEMO_LEAGUES,
    DEMO_CATEGORY_COACH,
    DEMO_DEFAULT_TIMES,
    DEMO_GAMES,
    DEMO_ROUTINES,
    DEMO_GENERAL_NOTICE
}

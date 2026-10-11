// Modelos de Sequelize.
// Se crea un modelo por archivo (PascalCase singular, ej. Member.js) y TODAS las asociaciones se definen acá,
// porque las relaciones cruzan módulos.
//
// Los 24 modelos, agrupados por módulo del DER (tabla → archivo):
//
//   1. Seguridad y acceso
//      user → User.js, role → Role.js, permission → Permission.js, user_role → UserRole.js,
//      role_permission → RolePermission.js, user_permission → UserPermission.js, dvv → Dvv.js
//
//   2. Club, deportes y auditoría
//      club → Club.js, sport → Sport.js, clubSport → ClubSport.js, log → Log.js, notification → Notification.js
//
//   3. Socios, staff e inscripciones
//      member → Member.js, staff → Staff.js, inscription → Inscription.js
//
//   4. Cuotas y pagos
//      fee → Fee.js, payment → Payment.js
//
//   5. Ligas, partidos y citaciones
//      league → League.js, category → Category.js, categoryPlayer → CategoryPlayer.js,
//      categoryStaff → CategoryStaff.js, game → Game.js, citation → Citation.js
//
//   6. Rutinas
//      routine → Routine.js

module.exports = {}

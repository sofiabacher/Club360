const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Club = sequelize.define('Club', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    address: { type: DataTypes.STRING(100), allowNull: false },
    phone: { type: DataTypes.STRING(30), allowNull: true },
    email: { type: DataTypes.STRING(100), allowNull: false },
    socialFee: { type: DataTypes.DECIMAL(10, 2), allowNull: false },   // Cuota social
    delayFee: { type: DataTypes.INTEGER, allowNull: false },   // Días de atraso para la mora
    conflictMargin: { type: DataTypes.INTEGER, allowNull: false },   // Margen de conflicto entre partidos, en minutos
    accentColor: { type: DataTypes.STRING(7), allowNull: false, defaultValue: '#0F1B3D' },   // Color propio del club, hex #RRGGBB (D13)
    // Información general que no tiene columna propia. Estructura (la valida clubs.validator):
    // {
    //     "whatsapp": "11 5000-0000",
    //     "secretaryHours": ["Lunes a viernes de 9 a 13 y de 16 a 21", "Sábados de 9 a 13"],
    //     "courts": [{ "name": "Cancha 1", "address": "Av. Ejemplo 1234" }],
    //     "trainingSchedule": [{ "sport": "Vóley", "schedule": "Lunes, miércoles y viernes de 18 a 22" }]
    // }
    // MariaDB guarda JSON como texto y lo devuelve como string: el getter lo deja siempre como objeto
    extraInfo: {
        type: DataTypes.JSON,
        allowNull: true,
        get() {
            const value = this.getDataValue('extraInfo')
            return typeof value === 'string' ? JSON.parse(value) : value
        }
    },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'club',
    indexes: [
        { name: 'club_name_unique', unique: true, fields: ['name'] },
        { name: 'club_email_unique', unique: true, fields: ['email'] }
    ]
})

module.exports = Club

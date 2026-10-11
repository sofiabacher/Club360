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
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'club',
    indexes: [
        { name: 'club_name_unique', unique: true, fields: ['name'] },
        { name: 'club_email_unique', unique: true, fields: ['email'] }
    ]
})

module.exports = Club

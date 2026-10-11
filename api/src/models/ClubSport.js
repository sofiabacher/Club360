// Deporte del catálogo activado por un club
const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const ClubSport = sequelize.define('ClubSport', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    sportId: { type: DataTypes.INTEGER, allowNull: false },
    priceFee: { type: DataTypes.DECIMAL(10, 2), allowNull: false },   // Cuota deportiva
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'clubSport'
})

module.exports = ClubSport

const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Inscription = sequelize.define('Inscription', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    clubSportId: { type: DataTypes.INTEGER, allowNull: false },
    memberId: { type: DataTypes.INTEGER, allowNull: false },
    inscriptionState: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },   // Estado: INSCRIPTION_STATES en utils/constants.js
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'inscription'
})

module.exports = Inscription

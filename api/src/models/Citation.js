const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Citation = sequelize.define('Citation', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    gameId: { type: DataTypes.INTEGER, allowNull: false },
    memberId: { type: DataTypes.INTEGER, allowNull: false },
    staffId: { type: DataTypes.INTEGER, allowNull: false },   // Quién citó: siempre Staff
    justification: { type: DataTypes.TEXT, allowNull: true },
    dateMaxResponse: { type: DataTypes.DATE, allowNull: false },
    dateResponse: { type: DataTypes.DATE, allowNull: true },
    citationState: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },   // Estado: CITATION_STATES en utils/constants.js
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'citation'
})

module.exports = Citation

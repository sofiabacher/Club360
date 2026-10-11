const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Game = sequelize.define('Game', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    season: { type: DataTypes.STRING(50), allowNull: false },
    rival: { type: DataTypes.STRING(100), allowNull: false },
    dateTime: { type: DataTypes.DATE, allowNull: false },
    address: { type: DataTypes.STRING(200), allowNull: false },
    gameState: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },   // Estado: GAME_STATES en utils/constants.js
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'game'
})

module.exports = Game

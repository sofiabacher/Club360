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
    isHome: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },   // true: de local (la dirección es una cancha del club); false: de visitante
    gameState: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },   // Estado: GAME_STATES en utils/constants.js
    // Resultado (P19): sets ganados por el club y por el rival, y los puntos de cada set en orden ([{ own, rival }], opcional).
    // Sin resultado, los tres en NULL (Programados, Cancelados y los Jugados de antes de cargar resultados)
    ownScore: { type: DataTypes.TINYINT, allowNull: true },
    rivalScore: { type: DataTypes.TINYINT, allowNull: true },
    setScores: {
        type: DataTypes.JSON,
        allowNull: true,
        get() {   // MySQL lo devuelve como texto: se lee siempre como array (igual que club.extraInfo)
            const value = this.getDataValue('setScores')
            return typeof value === 'string' ? JSON.parse(value) : value
        }
    },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'game'
})

module.exports = Game

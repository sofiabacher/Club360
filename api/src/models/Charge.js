const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

// Cargo eventual: un cobro fuera de la cuota mensual (un torneo, la camiseta, un viaje) que el Admin le asigna a todos
// los socios, a socios elegidos, a las jugadoras de categorías o a los socios de deportes. Lo que debe cada socio va en
// chargeMember. El monto es el mismo para todos y se fija al crearlo
const Charge = sequelize.define('Charge', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },   // Quién lo creó
    concept: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(300), allowNull: true },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    expirationDate: { type: DataTypes.DATEONLY, allowNull: false },
    targetType: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },   // CHARGE_TARGETS en utils/constants.js
    // Ids de las categorías (CATEGORIES) o de los clubSport (SPORTS) elegidos al crearlo. NULL con ALL y MEMBERS
    targetIds: {
        type: DataTypes.JSON,
        allowNull: true,
        get() {
            const value = this.getDataValue('targetIds')
            return typeof value === 'string' ? JSON.parse(value) : value
        }
    },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },   // false: anulado por el Admin
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'charge'
})

module.exports = Charge

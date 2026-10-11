// Dígito verificador vertical de cada tabla
const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Dvv = sequelize.define('Dvv', {
    tableName: { type: DataTypes.STRING(50), primaryKey: true },
    dvv: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'dvv',
    createdAt: false
})

module.exports = Dvv

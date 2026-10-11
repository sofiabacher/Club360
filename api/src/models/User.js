const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    lastName: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false },
    password: { type: DataTypes.STRING(255), allowNull: true },   // NULL hasta que el socio completa su registro con el número de socio
    phone: { type: DataTypes.STRING(30), allowNull: true },
    dni: { type: DataTypes.STRING(20), allowNull: true },
    birthDate: { type: DataTypes.DATEONLY, allowNull: false },
    photo: { type: DataTypes.STRING(255), allowNull: true },
    userStateId: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },   // Estado: USER_STATES en utils/constants.js
    username: { type: DataTypes.STRING(50), allowNull: true },
    failedAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    dvh: { type: DataTypes.INTEGER, allowNull: true }
}, {
    tableName: 'user',
    indexes: [
        { name: 'user_email_unique', unique: true, fields: ['email'] },
        { name: 'user_dni_unique', unique: true, fields: ['dni'] },
        { name: 'user_username_unique', unique: true, fields: ['username'] }
    ]
})

module.exports = User

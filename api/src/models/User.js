const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')
const { encrypt, decrypt } = require('../utils/crypto')

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    clubId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    lastName: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: true },   // Obligatorio para mayores de 18 y opcional para menores: la regla va en los services
    password: { type: DataTypes.STRING(255), allowNull: true },   // NULL hasta que el socio completa su registro con el número de socio
    // Cifrado con AES: el setter cifra y el getter descifra, así los services lo usan en claro.
    // IMPORTANTE: no leer phone con raw: true, porque así llega el texto cifrado. Los hooks de integridad sí usan raw: true
    // a propósito: el DVH se calcula sobre el valor cifrado que está guardado.
    phone: {
        type: DataTypes.STRING(255),
        allowNull: true,
        set(value) {
            const text = typeof value === 'string' ? value.trim() : value
            this.setDataValue('phone', text ? encrypt(text) : null)
        },
        get() {
            const stored = this.getDataValue('phone')
            return stored ? decrypt(stored) : null
        }
    },
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

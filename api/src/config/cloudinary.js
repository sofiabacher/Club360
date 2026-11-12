// Cliente de Cloudinary (v2), configurado una sola vez. Lo usan solo middlewares/upload.js y utils/files.js.
// Las subidas van a Cloudinary solo en producción y con las tres variables CLOUDINARY_* (cloudinary.isConfigured).
const { v2: cloudinary } = require('cloudinary')
const { cloudinary: config } = require('./index')

if (config.isConfigured) {
    cloudinary.config({ cloud_name: config.cloudName, api_key: config.apiKey, api_secret: config.apiSecret, secure: true })
}

module.exports = cloudinary

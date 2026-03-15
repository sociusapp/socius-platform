const Log = require('../models/Log')

const logger = {
  info: async (message, meta = {}) => {
    console.log(`[INFO] ${message}`)
    await Log.create({ level: 'info', message, ...meta }).catch(e => console.error('Log error:', e.message))
  },
  
  warn: async (message, meta = {}) => {
    console.warn(`[WARN] ${message}`)
    await Log.create({ level: 'warn', message, ...meta }).catch(e => console.error('Log error:', e.message))
  },

  error: async (message, error = {}, req = null) => {
    console.error(`[ERROR] ${message}`, error.stack || error)
    
    const meta = {
      level: 'error',
      message: message || error.message,
      stack: error.stack || null,
    }

    if (req) {
      meta.method = req.method
      meta.url = req.originalUrl
      meta.ip = req.ip
      meta.userAgent = req.get('User-Agent')
      meta.userId = req.user?._id || null
      // Don't log sensitive data like passwords
      if (req.body) {
        const body = { ...req.body }
        delete body.password
        delete body.token
        meta.body = body
      }
    }

    await Log.create(meta).catch(e => console.error('Log error:', e.message))
  }
}

module.exports = logger

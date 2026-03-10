const mongoose = require('mongoose')
const logger = require('../utils/logger')

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.DB_NAME || 'socius',
    })

    console.log(`MongoDB connected: ${conn.connection.host}`)
    
    // Connection events
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected')
    })

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected')
    })

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB error:', err)
    })

  } catch (err) {
    logger.error('MongoDB connection failed:', err)
    process.exit(1)
  }
}

const disconnectDB = async () => {
  await mongoose.connection.close()
  logger.info('MongoDB disconnected cleanly')
}

module.exports = { connectDB, disconnectDB }

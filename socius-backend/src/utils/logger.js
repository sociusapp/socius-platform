const { createLogger, format, transports } = require('winston')
const path = require('path')
const fs = require('fs')

// logs folder create karo agar nahi hai
const logDir = path.join(process.cwd(), 'logs')
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

const { combine, timestamp, printf, colorize, errors } = format

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level}: ${stack || message}`
})

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Console (development)
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
      silent: process.env.NODE_ENV === 'test',
    }),

    // Error log file
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),

    // Combined log file
    new transports.File({
      filename: path.join(logDir, 'combined.log'),
    }),
  ],
})

module.exports = logger

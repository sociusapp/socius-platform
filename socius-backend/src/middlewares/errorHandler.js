const logger = require('../utils/logger')
const { error } = require('../utils/response')

/**
 * 404 - Route not found
 */
const notFoundHandler = (req, res, next) => {
  return error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404)
}

/**
 * Global error handler — sab unhandled errors yahan aate hain
 * Express me 4 params hone chahiye (err, req, res, next)
 */
const fs = require('fs');
const path = require('path');

const errorHandler = (err, req, res, next) => {
  // Log detailed error to console for immediate visibility
  if (err.name === 'ValidationError') {
    console.error('!!! MONGOOSE VALIDATION ERROR !!!');
    console.error('Request:', req.method, req.originalUrl);
    console.error('Errors:', JSON.stringify(err.errors, null, 2));
  }

  // Log detailed error to a file for debugging
  const logPath = path.join(__dirname, '../../error_debug.log');
  const logEntry = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}\nError: ${err.message}\nStack: ${err.stack}\nDetails: ${JSON.stringify(err.errors || {}, null, 2)}\n\n`;
  fs.appendFileSync(logPath, logEntry);

  logger.error(`[${req.method}] ${req.originalUrl} — ${err.message}`, {
    stack: err.stack,
    userId: req.user?._id,
  })

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }))
    return error(res, 'Validation failed', 400, errors)
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field'
    return error(res, `${field} already exists`, 409)
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return error(res, `Invalid ${err.path}: ${err.value}`, 400)
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return error(res, 'Invalid token', 401)
  }
  if (err.name === 'TokenExpiredError') {
    return error(res, 'Token expired', 401)
  }

  // Multer errors (just in case)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return error(res, 'File too large. Maximum size is 5MB.', 400)
  }

  // Default 500
  const statusCode = err.statusCode || err.status || 500
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message || 'Something went wrong'

  return error(res, message, statusCode)
}

module.exports = { notFoundHandler, errorHandler }

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

  logger.error(`[${req.method}] ${req.originalUrl} — ${err.message}`, err, req)

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

  // Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return error(res, err.message || 'File too large', 400)
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return error(res, 'Unexpected file field. Use field name "image".', 400)
    }
    return error(res, err.message || 'Upload failed', 400)
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return error(res, err.message || 'File too large', 400)
  }

  // Multer fileFilter passes a plain Error (not MulterError) for rejected MIME types
  if (typeof err.message === 'string' && /only jpg, png, or webp images are allowed/i.test(err.message)) {
    return error(res, err.message, 400)
  }

  // Default 500
  const statusCode = err.statusCode || err.status || 500
  const message =
    statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message || 'Something went wrong'

  if (err.code || err.data) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.data ? { data: err.data } : {}),
    })
  }

  return error(res, message, statusCode)
}

module.exports = { notFoundHandler, errorHandler }

/**
 * Standard API Response Format
 * { success, message, data, meta }
 */

const success = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
  const response = {
    success: true,
    message,
    data,
  }
  if (meta) response.meta = meta
  return res.status(statusCode).json(response)
}

const created = (res, data = null, message = 'Created successfully') => {
  return success(res, data, message, 201)
}

const error = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
  }
  if (errors) response.errors = errors
  return res.status(statusCode).json(response)
}

const badRequest = (res, message = 'Bad request', errors = null) => {
  return error(res, message, 400, errors)
}

const unauthorized = (res, message = 'Unauthorized') => {
  return error(res, message, 401)
}

const forbidden = (res, message = 'Forbidden') => {
  return error(res, message, 403)
}

const notFound = (res, message = 'Not found') => {
  return error(res, message, 404)
}

const conflict = (res, message = 'Conflict') => {
  return error(res, message, 409)
}

const tooMany = (res, message = 'Too many requests, please try again later') => {
  return error(res, message, 429)
}

const paginated = (res, data, total, page, limit, message = 'Success') => {
  return success(res, data, message, 200, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit),
  })
}

module.exports = {
  success,
  created,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooMany,
  paginated,
}

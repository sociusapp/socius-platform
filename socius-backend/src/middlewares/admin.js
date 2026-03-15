const { forbidden } = require('../utils/response')

/**
 * Admin role check — authenticate ke baad lagao
 * Admin flag User model me honi chahiye
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return forbidden(res, 'Admin access required')
  }
  next()
}

const requireDeveloper = (req, res, next) => {
  if (!req.user || !req.user.isDeveloper) {
    return forbidden(res, 'Developer access required')
  }
  next()
}

const requireAdminOrDeveloper = (req, res, next) => {
  if (!req.user || (!req.user.isAdmin && !req.user.isDeveloper)) {
    return forbidden(res, 'Internal access required')
  }
  next()
}

module.exports = { requireAdmin, requireDeveloper, requireAdminOrDeveloper }

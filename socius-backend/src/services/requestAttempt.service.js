const RequestAttempt = require('../models/RequestAttempt')

const logRequestAttempt = async ({
  requesterId,
  requestKind,
  outcome,
  reason = null,
  category = null,
  situationType = null,
  description = null,
  itemReturnRequired = null,
  location = null,
  radiusMeters = null,
  helpersFound = null,
  meta = null,
}) => {
  try {
    const doc = await RequestAttempt.create({
      requesterId,
      requestKind,
      outcome,
      reason,
      category,
      situationType,
      description,
      itemReturnRequired,
      location: location
        ? {
            lng: typeof location.lng === 'number' ? location.lng : null,
            lat: typeof location.lat === 'number' ? location.lat : null,
            address: location.address || null,
            whereToFindText: location.whereToFindText || null,
          }
        : undefined,
      radiusMeters: typeof radiusMeters === 'number' ? radiusMeters : null,
      helpersFound: typeof helpersFound === 'number' ? helpersFound : null,
      meta: meta
        ? {
            ip: meta.ip || null,
            userAgent: meta.userAgent || null,
            platform: meta.platform || null,
            deviceId: meta.deviceId || null,
            appVersion: meta.appVersion || null,
          }
        : undefined,
    })
    return doc
  } catch (e) {
    return null
  }
}

module.exports = { logRequestAttempt }


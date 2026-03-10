const availabilityService = require('../services/availability.service')
const { success } = require('../utils/response')

const getStatus = async (req, res, next) => {
  try {
    const status = await availabilityService.getAvailabilityStatus(req.user._id)
    return success(res, status)
  } catch (err) {
    next(err)
  }
}

const toggleAvailability = async (req, res, next) => {
  try {
    const { isAvailable, location } = req.body
    const result = await availabilityService.toggleAvailability(req.user._id, { isAvailable, location })
    return success(res, result, `You are now ${isAvailable ? 'available' : 'unavailable'}`)
  } catch (err) {
    next(err)
  }
}

const updateLocation = async (req, res, next) => {
  try {
    const { lng, lat } = req.body
    const result = await availabilityService.updateLocation(req.user._id, { lng, lat })
    return success(res, result)
  } catch (err) {
    next(err)
  }
}

module.exports = { getStatus, toggleAvailability, updateLocation }

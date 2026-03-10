const Report = require('../models/Report')
const logger = require('../utils/logger')

const submitReport = async (reporterId, payload) => {
  const report = await Report.create({
    reporterId,
    reportedRequestId: payload.reportedRequestId || null,
    reportedRequestType: payload.reportedRequestType || null,
    reportedUserId: payload.reportedUserId || null,
    reporterRole: payload.reporterRole || null,
    category: payload.category,
    details: payload.details || null,
  })

  logger.info(`Report submitted: ${report._id} by ${reporterId}`)
  return report
}

const getMyReports = async (reporterId) => {
  return Report.find({ reporterId }).sort({ createdAt: -1 })
}

module.exports = {
  submitReport,
  getMyReports,
}


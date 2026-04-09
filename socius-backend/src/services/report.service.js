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

const getMyReports = async (reporterId, filters = {}) => {
  const query = { reporterId }
  if (filters?.reportedRequestId) query.reportedRequestId = filters.reportedRequestId
  if (filters?.reportedRequestType) query.reportedRequestType = filters.reportedRequestType
  if (filters?.reporterRole) query.reporterRole = filters.reporterRole
  return Report.find(query).sort({ createdAt: -1 })
}

const updateMyReport = async (reporterId, reportId, payload) => {
  const report = await Report.findOne({ _id: reportId, reporterId })
  if (!report) {
    const err = new Error('Report not found')
    err.statusCode = 404
    throw err
  }
  if (!['pending', 'under_review'].includes(String(report.status || '').toLowerCase())) {
    const err = new Error('Only pending reports can be edited')
    err.statusCode = 409
    throw err
  }
  if (payload.category) report.category = payload.category
  if (Object.prototype.hasOwnProperty.call(payload, 'details')) {
    report.details = payload.details || null
  }
  await report.save()
  return report
}

const deleteMyReport = async (reporterId, reportId) => {
  const report = await Report.findOne({ _id: reportId, reporterId })
  if (!report) {
    const err = new Error('Report not found')
    err.statusCode = 404
    throw err
  }
  if (!['pending', 'under_review'].includes(String(report.status || '').toLowerCase())) {
    const err = new Error('Only pending reports can be deleted')
    err.statusCode = 409
    throw err
  }
  await report.deleteOne()
  return { deleted: true, reportId: String(reportId) }
}

module.exports = {
  submitReport,
  getMyReports,
  updateMyReport,
  deleteMyReport,
}


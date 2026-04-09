const reportService = require('../services/report.service')
const { success, created } = require('../utils/response')

const submitReport = async (req, res, next) => {
  try {
    const report = await reportService.submitReport(req.user._id, req.body)
    return created(res, report, 'Report submitted. Our team will review it.')
  } catch (err) {
    next(err)
  }
}

const getMyReports = async (req, res, next) => {
  try {
    const reports = await reportService.getMyReports(req.user._id, {
      reportedRequestId: req.query?.reportedRequestId,
      reportedRequestType: req.query?.reportedRequestType,
      reporterRole: req.query?.reporterRole,
    })
    return success(res, reports)
  } catch (err) {
    next(err)
  }
}

const updateMyReport = async (req, res, next) => {
  try {
    const report = await reportService.updateMyReport(req.user._id, req.params.reportId, req.body)
    return success(res, report, 'Report updated')
  } catch (err) {
    next(err)
  }
}

const deleteMyReport = async (req, res, next) => {
  try {
    const result = await reportService.deleteMyReport(req.user._id, req.params.reportId)
    return success(res, result, 'Report deleted')
  } catch (err) {
    next(err)
  }
}

module.exports = { submitReport, getMyReports, updateMyReport, deleteMyReport }

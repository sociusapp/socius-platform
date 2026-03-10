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
    const reports = await reportService.getMyReports(req.user._id)
    return success(res, reports)
  } catch (err) {
    next(err)
  }
}

module.exports = { submitReport, getMyReports }

const mongoose = require('mongoose')

const legalExportRecordSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    legalBasis: { type: String, default: '', trim: true },
    referenceNumber: { type: String, default: '', trim: true },
    scope: { type: String, default: 'application_logs', enum: ['application_logs'] },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    anonymized: { type: Boolean, default: false },
    rowCount: { type: Number, default: 0 },
    status: { type: String, enum: ['completed', 'failed'], default: 'completed' },
  },
  { timestamps: true }
)

legalExportRecordSchema.index({ createdAt: -1 })

module.exports = mongoose.model('LegalExportRecord', legalExportRecordSchema)

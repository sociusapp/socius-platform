const Issue = require('../models/Issue')
const { success, forbidden } = require('../utils/response')
const { syncIssuesToFile } = require('../utils/issueSync')
const logger = require('../utils/logger')
const { persistLocalUpload } = require('../services/mediaStorage.service')

const getActorLabel = (req) => {
  if (req.user?.isAdmin) return 'Admin'
  return 'User'
}

const sanitizeIssueForViewer = (issue, user) => {
  const isAdmin = user?.isAdmin
  const activity = issue.activity.filter((a) => {
    if (a.visibility === 'both') return true
    if (a.visibility === 'developer' && isAdmin) return true
    return false
  })

  return {
    ...issue.toObject(),
    activity,
  }
}

const createIssue = async (req, res, next) => {
  try {
    const {
      title, description, category, priority,
      reportedByName, platform, flow, transcript,
      occurredAt, deviceInfo
    } = req.body

    await logger.info(`Client reporting issue: ${title}`, {
      method: 'POST',
      url: '/api/admin-issues',
      body: { platform, flow, category, occurredAt, deviceInfo }
    })

    // Handle uploaded files
    let screenshotPath = null;
    let voiceNotePath = null;

    if (req.files) {
      if (req.files.screenshot?.[0]) {
        const f = req.files.screenshot[0]
        screenshotPath = await persistLocalUpload(f.path, { contentType: f.mimetype })
      }
      if (req.files.voiceNote?.[0]) {
        const f = req.files.voiceNote[0]
        voiceNotePath = await persistLocalUpload(f.path, { contentType: f.mimetype })
      }
    }

    const issue = await Issue.create({
      title,
      description,
      category,
      priority,
      platform: platform || 'Mobile App',
      flow: flow || 'General',
      transcript,
      occurredAt: occurredAt || new Date(),
      deviceInfo: deviceInfo ? (typeof deviceInfo === 'string' ? JSON.parse(deviceInfo) : deviceInfo) : null,
      screenshot: screenshotPath,
      voiceNote: voiceNotePath,
      reportedBy: req.user?._id || null,
      reportedByName: reportedByName || getActorLabel(req),
      activity: [
        {
          type: 'status',
          text: 'Issue reported',
          user: reportedByName || getActorLabel(req),
          visibility: 'both',
          time: new Date(),
        },
      ],
    })

    // Auto-sync to PROJECT_ISSUES.md
    await syncIssuesToFile();

    return success(res, sanitizeIssueForViewer(issue, req.user), 'Issue created successfully')
  } catch (err) {
    next(err)
  }
}

const getIssues = async (req, res, next) => {
  try {
    const { status, category, priority } = req.query
    const query = {}
    if (status) query.status = status
    if (category) query.category = category
    if (priority) query.priority = priority

    const issues = await Issue.find(query).sort({ createdAt: -1 })
    const list = issues.map((i) => sanitizeIssueForViewer(i, req.user))
    return success(res, list, 'Issues fetched successfully')
  } catch (err) {
    next(err)
  }
}

const getAIStats = async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) {
      return forbidden(res, 'Admin access required')
    }

    const allIssues = await Issue.find({ aiEnabled: true })
    const completedIssues = allIssues.filter((i) => i.status === 'Completed')

    const totalFixed = completedIssues.length
    const totalPending = allIssues.filter((i) => i.status === 'Pending' || i.status === 'In Progress').length

    // Calculate average fix time (simplified)
    let totalFixTime = 0
    completedIssues.forEach((issue) => {
      const reportTime = issue.createdAt
      const fixTime = issue.aiLastCompletedAt || issue.updatedAt
      totalFixTime += (fixTime - reportTime)
    })

    const avgFixTimeMinutes =
      completedIssues.length > 0
        ? Math.round((totalFixTime / completedIssues.length) / (1000 * 60))
        : 0

    const successRate =
      allIssues.length > 0
        ? Math.round((totalFixed / allIssues.length) * 100)
        : 0

    return success(res, {
      totalFixed,
      totalPending,
      avgFixTimeMinutes,
      successRate,
      recentActivity: completedIssues.slice(0, 5).map(i => ({
        title: i.title,
        time: i.aiLastCompletedAt || i.updatedAt
      }))
    }, 'AI Stats fetched successfully')
  } catch (err) {
    next(err)
  }
}

const getIssueById = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id)
    if (!issue) {
      const err = new Error('Issue not found')
      err.statusCode = 404
      throw err
    }
    return success(res, sanitizeIssueForViewer(issue, req.user), 'Issue details fetched successfully')
  } catch (err) {
    next(err)
  }
}

const updateIssue = async (req, res, next) => {
  try {
    const { status, activityText, aiEnabled } = req.body
    const issue = await Issue.findById(req.params.id)
    if (!issue) {
      const err = new Error('Issue not found')
      err.statusCode = 404
      throw err
    }

    if (status && status !== issue.status) {
      const nextStatus = status
      issue.activity.push({
        type: 'status',
        text: `Status changed from ${issue.status} to ${nextStatus}`,
        user: getActorLabel(req),
        visibility: 'both',
        time: new Date(),
      })
      issue.status = nextStatus
    }

    if (activityText) {
      issue.activity.push({
        type: 'comment',
        text: activityText,
        user: getActorLabel(req),
        visibility: 'both',
        time: new Date(),
      })
    }

    if (aiEnabled !== undefined) {
      if (!req.user?.isAdmin) {
        return forbidden(res, 'Only admins can manage AI assignment')
      }

      const nextValue = !!aiEnabled
      if (issue.aiEnabled !== nextValue) {
        issue.aiEnabled = nextValue
        if (nextValue) {
          issue.aiAssignedBy = req.user._id
          issue.aiAssignedAt = new Date()
        }
        issue.activity.push({
          type: 'status',
          text: `AI automation ${nextValue ? 'enabled' : 'disabled'}`,
          user: getActorLabel(req),
          visibility: 'both',
          time: new Date(),
        })
      }
    }

    // Allow other updates if needed
    const fieldsToUpdate = ['title', 'description', 'category', 'priority', 'screenshot']
    const hasAnyFieldUpdate = fieldsToUpdate.some((field) => req.body[field] !== undefined)
    if (hasAnyFieldUpdate && !req.user?.isAdmin) {
      return forbidden(res, 'Only admins can edit issue fields')
    }
    fieldsToUpdate.forEach((field) => {
      if (req.body[field] !== undefined) {
        issue[field] = req.body[field]
      }
    })

    await issue.save()

    // Auto-sync to PROJECT_ISSUES.md
    await syncIssuesToFile();

    return success(res, sanitizeIssueForViewer(issue, req.user), 'Issue updated successfully')
  } catch (err) {
    next(err)
  }
}

const deleteIssue = async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) {
      return forbidden(res, 'Only admins can delete issues')
    }
    const issue = await Issue.findByIdAndDelete(req.params.id)
    if (!issue) {
      const err = new Error('Issue not found')
      err.statusCode = 404
      throw err
    }

    // Auto-sync to PROJECT_ISSUES.md
    await syncIssuesToFile();

    return success(res, null, 'Issue deleted successfully')
  } catch (err) {
    next(err)
  }
}

const aiCompleteIssue = async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) {
      return forbidden(res, 'Admin access required')
    }

    const { activityText } = req.body || {}
    const issue = await Issue.findById(req.params.id)
    if (!issue) {
      const err = new Error('Issue not found')
      err.statusCode = 404
      throw err
    }

    if (!issue.aiEnabled) {
      return forbidden(res, 'AI automation not enabled for this issue')
    }

    if (issue.status !== 'Completed') {
      issue.activity.push({
        type: 'status',
        text: 'AI automation completed',
        user: 'AI (Developer)',
        visibility: 'both',
        time: new Date(),
      })
      issue.status = 'Completed'
      issue.aiLastCompletedAt = new Date()
    }

    if (activityText) {
      issue.activity.push({
        type: 'comment',
        text: activityText,
        user: 'AI (Developer)',
        visibility: 'both',
        time: new Date(),
      })
    }

    await issue.save()
    await syncIssuesToFile();

    return success(res, sanitizeIssueForViewer(issue, req.user), 'Issue updated by AI')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
  getAIStats,
  aiCompleteIssue,
}

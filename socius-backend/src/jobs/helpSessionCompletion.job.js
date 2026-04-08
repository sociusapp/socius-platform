const HelpRequest = require('../models/HelpRequest')
const HelpMatch = require('../models/HelpMatch')
const { HELP_REQUEST_STATUS, HELP_MATCH_STATUS } = require('../utils/constants')
const logger = require('../utils/logger')
const {
  sendRequestCompletionPromptNotification,
  sendHelperSessionTimeEndedNotification,
} = require('../services/notification.service')

const MAX_BATCH = 50

/**
 * When sessionEndsAt has passed, send a single high-priority “completed?” prompt per window
 * (completionPromptSentAt prevents duplicates until extend clears it).
 */
const runHelpSessionCompletionPrompts = async () => {
  const now = new Date()
  let n = 0

  while (n < MAX_BATCH) {
    // eslint-disable-next-line no-await-in-loop
    const claimed = await HelpRequest.findOneAndUpdate(
      {
        status: { $in: [HELP_REQUEST_STATUS.MATCHED, HELP_REQUEST_STATUS.ACTIVE] },
        sessionEndsAt: { $lte: now, $ne: null },
        completionPromptSentAt: null,
      },
      { $set: { completionPromptSentAt: now } },
      { new: true, sort: { sessionEndsAt: 1 } }
    )

    if (!claimed) break
    n += 1

    try {
      // eslint-disable-next-line no-await-in-loop
      await sendRequestCompletionPromptNotification(claimed.requesterId, {
        requestId: claimed._id,
        sessionEndsAt: claimed.sessionEndsAt,
      })
      // eslint-disable-next-line no-await-in-loop
      const match = await HelpMatch.findOne({
        requestId: claimed._id,
        status: HELP_MATCH_STATUS.ACCEPTED,
      })
        .select('helperId')
        .lean()
      if (match?.helperId) {
        // eslint-disable-next-line no-await-in-loop
        await sendHelperSessionTimeEndedNotification(match.helperId, {
          requestId: claimed._id,
          sessionEndsAt: claimed.sessionEndsAt,
        })
      }
    } catch (e) {
      logger.error('[helpSessionCompletion] send failed, reverting flag', e)
      // eslint-disable-next-line no-await-in-loop
      await HelpRequest.findByIdAndUpdate(claimed._id, { $unset: { completionPromptSentAt: 1 } })
    }
  }

  if (n > 0) {
    logger.info(`[helpSessionCompletion] processed ${n} session(s)`)
  }
}

module.exports = {
  runHelpSessionCompletionPrompts,
}

const normalizeReason = (value) => {
  const v = String(value || '').toLowerCase()
  if (!v) return 'closed'
  if (v === 'finalized') return 'closed'
  if (v === 'closed') return 'closed'
  if (v === 'cancelled') return 'cancelled'
  if (v === 'auto_closed') return 'auto closed'
  return v.replace(/_/g, ' ')
}

const formatTimestamp = (iso) => {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleString('en-US')
  } catch (e) {
    return null
  }
}

const formatRequestLabel = ({ requestType, requestId }) => {
  const type = String(requestType || 'request').replace(/_/g, ' ').trim()
  const id = String(requestId || '').trim()
  if (!id) return type || 'Request'
  return `${type} (${id})`
}

const buildClosureInitiatedCopy = ({ requestId, requestType = 'Help request', initiatedBy, occurredAt }) => {
  const label = formatRequestLabel({ requestType, requestId })
  const when = formatTimestamp(occurredAt)
  const by =
    initiatedBy === 'requester'
      ? 'The requester'
      : initiatedBy === 'helper'
      ? 'The helper'
      : 'A participant'

  const timePart = when ? `\nTime: ${when}` : ''
  return {
    title: 'Request closure started',
    message: `${by} started closing ${label}.\nPlease complete your closure steps to finalize.${timePart}`,
  }
}

const buildRequestClosedCopy = ({ requestId, requestType = 'Help request', reason, occurredAt }) => {
  const label = formatRequestLabel({ requestType, requestId })
  const when = formatTimestamp(occurredAt)
  const normalizedReason = normalizeReason(reason)
  const timePart = when ? `\nTime: ${when}` : ''
  return {
    title: 'Request closed',
    message: `${label} has been closed.\nReason: ${normalizedReason}.${timePart}`,
  }
}

const buildChatBlockedCopy = ({ requestId, requestType = 'Help request', reason, occurredAt }) => {
  const label = formatRequestLabel({ requestType, requestId })
  const when = formatTimestamp(occurredAt)
  const normalizedReason = normalizeReason(reason)
  const timePart = when ? `\nTime: ${when}` : ''
  return `Messaging is disabled because ${label} is closed.\nReason: ${normalizedReason}.${timePart}`
}

export {
  buildClosureInitiatedCopy,
  buildRequestClosedCopy,
  buildChatBlockedCopy,
}

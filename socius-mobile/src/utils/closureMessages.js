const normalizeReason = (value) => {
  const v = String(value || '').toLowerCase()
  if (!v) return 'closed'
  if (v === 'finalized') return 'closed'
  if (v === 'closed') return 'closed'
  if (v === 'cancelled') return 'cancelled'
  if (v === 'auto_closed') return 'auto closed'
  return v.replace(/_/g, ' ')
}

const titleCase = (text) =>
  String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())

const formatRequestLabel = ({ requestType }) => {
  const type = String(requestType || 'request').replace(/_/g, ' ').trim()
  const label = titleCase(type || 'Request')
  return label.endsWith('Request') ? label : `${label} request`
}

const buildClosureInitiatedCopy = ({ requestId, requestType = 'Help request', initiatedBy, occurredAt }) => {
  const label = formatRequestLabel({ requestType })
  const by =
    initiatedBy === 'requester'
      ? 'The requester'
      : initiatedBy === 'helper'
      ? 'The helper'
      : 'A participant'

  return {
    title: 'Closure started',
    message: `${by} started closing your ${label}.\nOpen Socius to review and complete the closure.`,
  }
}

const buildRequestClosedCopy = ({ requestId, requestType = 'Help request', reason, occurredAt }) => {
  const label = formatRequestLabel({ requestType })
  const normalizedReason = normalizeReason(reason)
  const reasonPart =
    normalizedReason === 'cancelled'
      ? 'It was cancelled.'
      : normalizedReason === 'auto closed'
      ? 'It was auto-closed.'
      : 'It was closed.'
  return {
    title: 'Request closed',
    message: `Your ${label} is no longer active.\n${reasonPart}`,
  }
}

const buildChatBlockedCopy = ({ requestId, requestType = 'Help request', reason, occurredAt }) => {
  const label = formatRequestLabel({ requestType })
  const normalizedReason = normalizeReason(reason)
  const reasonPart =
    normalizedReason === 'cancelled'
      ? 'It was cancelled.'
      : normalizedReason === 'auto closed'
      ? 'It was auto-closed.'
      : 'It was closed.'
  return `Messaging is disabled because your ${label} is no longer active.\n${reasonPart}`
}

export {
  buildClosureInitiatedCopy,
  buildRequestClosedCopy,
  buildChatBlockedCopy,
}

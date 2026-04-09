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

const normalizeViewerRole = (value) => {
  const v = String(value || '').toLowerCase().trim()
  if (v === 'helper' || v === 'volunteer' || v === 'responder') return 'helper'
  if (v === 'requester' || v === 'owner') return 'requester'
  return ''
}

/**
 * Shown to the party who did NOT submit first — FCM includes recipientRole.
 * initiatedBy = who submitted closure first (requester | helper).
 */
const buildClosureInitiatedCopy = ({
  requestId,
  requestType = 'Help request',
  initiatedBy,
  occurredAt,
  recipientRole,
}) => {
  const label = formatRequestLabel({ requestType })
  let viewer = normalizeViewerRole(recipientRole)
  if (!viewer) {
    if (initiatedBy === 'helper') viewer = 'requester'
    else if (initiatedBy === 'requester') viewer = 'helper'
  }

  const ib = String(initiatedBy || '').toLowerCase()

  if (viewer === 'requester' && ib === 'helper') {
    return {
      title: 'Closure in progress',
      message: `Your helper has started closing your ${label}. Finish your part from My activity when you can—the live meeting map is no longer needed for this step.`,
    }
  }
  if (viewer === 'helper' && ib === 'requester') {
    return {
      title: 'Closure in progress',
      message: `The requester has started closing the ${label} you accepted. Complete your part from My activity when you're ready.`,
    }
  }

  const by =
    ib === 'requester' ? 'The requester' : ib === 'helper' ? 'The helper' : 'The other person'
  return {
    title: 'Closure in progress',
    message: `${by} started closing this ${label}. Use My activity to finish—you do not need the live meeting screen.`,
  }
}

const buildRequestClosedCopy = ({ requestId, requestType = 'Help request', reason, occurredAt, userRole }) => {
  const label = formatRequestLabel({ requestType })
  const normalizedReason = normalizeReason(reason)
  
  // Different message based on user role
  const isRequester = userRole === 'requester' || userRole === 'owner'
  
  const reasonPart =
    normalizedReason === 'cancelled'
      ? isRequester ? 'It was cancelled.' : 'The requester cancelled it.'
      : normalizedReason === 'auto closed'
      ? 'It was auto-closed.'
      : isRequester ? 'It was closed.' : 'The request has been closed.'
  
  const tail = 'The live meeting screen is no longer available for this request.'
  const message = isRequester
    ? `Your ${label} is fully closed.\n${reasonPart}\n${tail}`
    : `The ${label} you accepted is fully closed.\n${reasonPart}\n${tail}`
  
  return {
    title: 'Request closed',
    message,
  }
}

const buildChatBlockedCopy = ({ requestId, requestType = 'Help request', reason, occurredAt, userRole }) => {
  const label = formatRequestLabel({ requestType })
  const normalizedReason = normalizeReason(reason)
  const isRequester = userRole === 'requester' || userRole === 'owner'
  
  const reasonPart =
    normalizedReason === 'cancelled'
      ? isRequester ? 'It was cancelled.' : 'The requester cancelled it.'
      : normalizedReason === 'auto closed'
      ? 'It was auto-closed.'
      : isRequester ? 'It was closed.' : 'The request has been closed.'
  
  return `Messaging is disabled because your ${label} is no longer active.\n${reasonPart}`
}

const buildRequestAcceptedCopy = ({ requestType = 'Help request', volunteerName, userRole }) => {
  const label = formatRequestLabel({ requestType })
  const isRequester = userRole === 'requester' || userRole === 'owner'
  
  if (isRequester) {
    return {
      title: 'Request accepted',
      message: `${volunteerName || 'Someone'} has accepted your ${label} and is on their way.`,
    }
  }
  return {
    title: 'You accepted a request',
    message: `You have accepted a ${label}. Please proceed to help the requester.`,
  }
}

const buildRequestCancelledCopy = ({ requestType = 'Help request', cancelledBy, userRole }) => {
  const label = formatRequestLabel({ requestType })
  const isRequester = userRole === 'requester' || userRole === 'owner'
  const byWho = cancelledBy === 'requester' ? 'The requester' : cancelledBy === 'helper' ? 'The helper' : 'A participant'
  
  if (isRequester) {
    return {
      title: 'Request cancelled',
      message: `You cancelled your ${label}.`,
    }
  }
  return {
    title: 'Request cancelled',
    message: `${byWho} cancelled the ${label} you accepted.`,
  }
}

const buildNewRequestCopy = ({ requestType = 'Help request', requesterName, distance, area }) => {
  return {
    title: 'New help request nearby',
    message: `${requesterName || 'Someone'} needs help${distance ? ` (${Math.round(distance)}m away)` : ''}${area ? ` in ${area}` : ''}. Tap to view details.`,
  }
}

const buildRequestTakenCopy = ({ requestType = 'Help request', volunteerName }) => {
  const label = formatRequestLabel({ requestType })
  return {
    title: 'Request already accepted',
    message: `${volunteerName || 'Someone else'} has already accepted this ${label}. You can wait for other requests nearby.`,
  }
}

export {
  buildClosureInitiatedCopy,
  buildRequestClosedCopy,
  buildChatBlockedCopy,
  buildRequestAcceptedCopy,
  buildRequestCancelledCopy,
  buildNewRequestCopy,
  buildRequestTakenCopy,
}

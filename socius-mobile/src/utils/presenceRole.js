/**
 * Presence requests store requesterId as ObjectId or populated { _id, ... }.
 * Use these helpers so requester vs helper UI is driven by the real request, not only route params.
 */
export const getPresenceRequesterId = (request) => {
  if (!request?.requesterId) return '';
  const r = request.requesterId;
  return String(r?._id || r?.id || r || '').trim();
};

export const isCurrentUserPresenceRequester = (request, currentUserId) => {
  if (!request || currentUserId == null || currentUserId === '') return false;
  const rid = getPresenceRequesterId(request);
  if (!rid) return false;
  return rid === String(currentUserId).trim();
};

/** After loading a presence request + current user id: trust server identity, not navigation params. */
export const resolvePresenceScreenMode = (request, currentUserId, paramMode) => {
  if (!request || currentUserId == null || currentUserId === '') {
    return paramMode === 'requester' ? 'requester' : 'helper';
  }
  return isCurrentUserPresenceRequester(request, currentUserId) ? 'requester' : 'helper';
};

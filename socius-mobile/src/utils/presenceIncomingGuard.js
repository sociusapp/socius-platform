import { loadAuth } from '../services/storage/asyncStorage.service';

const resolveCurrentUserId = (auth) =>
  String(auth?.user?._id || auth?.user?.id || auth?.userId || '').trim();

/**
 * Presence alarm helpers should never see their own request as an incoming alert.
 * Requires `requesterId` on FCM/data (see backend sendPresenceAlarm).
 */
export const shouldIgnoreIncomingPresenceAlarm = async (data = {}) => {
  const auth = await loadAuth().catch(() => null);
  const myUserId = resolveCurrentUserId(auth);
  const requesterId = String(data?.requesterId || data?.requester_id || '').trim();
  if (!myUserId || !requesterId) return false;
  return myUserId === requesterId;
};

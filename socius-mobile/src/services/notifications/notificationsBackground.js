import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee, { AndroidStyle, EventType } from '@notifee/react-native';
import { CHANNELS, handleIncomingCallMessage, initNotifeeChannels } from './SociusNotificationService';
import { buildClosureInitiatedCopy, buildRequestClosedCopy } from '../../utils/closureMessages';
import {
  displayRequestCompletionPrompt,
  handleCompletionPromptNotifeeAction,
} from './requestCompletionPrompt';
import { handleChatMessageFcm } from '../chat/chatNotificationSync';
import { loadAuth } from '../storage/asyncStorage.service';
import { declineHelpAsVolunteer, declinePresenceAsVolunteer } from '../api/volunteer.api';

const messaging = getMessaging();

setBackgroundMessageHandler(messaging, async remoteMessage => {
  console.log('[FCM] background message', remoteMessage?.data || remoteMessage);
  const data = remoteMessage?.data || {};
  const type = String(data.type || '').toLowerCase();

  // Handle requester completion prompt first so it never gets short-circuited.
  if (type === 'request_completion_prompt' && data.requestId) {
    await initNotifeeChannels();
    await displayRequestCompletionPrompt(data);
    return;
  }

  const handledByCallKeep = await handleIncomingCallMessage(remoteMessage);
  if (handledByCallKeep) return;

  if (await handleChatMessageFcm(remoteMessage)) {
    return;
  }

  if (type !== 'request_status') return;

  const status = String(data.status || '').toLowerCase();
  const requestId = String(data.requestId || '');
  if (!status || !requestId) return;

  await initNotifeeChannels();

  let title = 'Update'
  let body = ''

  if (status === 'matched') {
    title = 'Match found'
    body = 'A volunteer accepted your request. Tap to open.'
  } else if (status === 'closing') {
    const copy = buildClosureInitiatedCopy({
      requestId,
      requestType: data.requestType || 'Help request',
      initiatedBy: data.initiatedBy,
      occurredAt: data.occurredAt,
    });
    title = copy.title
    body = copy.message
  } else if (status === 'closed') {
    const copy = buildRequestClosedCopy({
      requestId,
      requestType: data.requestType || 'Help request',
      reason: data.reason,
      occurredAt: data.occurredAt,
      userRole: data.recipientRole || data.userRole,
    });
    title = copy.title
    body = copy.message
  } else {
    title = 'Request update'
    body = 'Tap to open Socius.'
  }

  try {
    await notifee.displayNotification({
      id: `update:${status}:${requestId}`,
      title,
      body,
      android: {
        channelId: CHANNELS.UPDATES,
        pressAction: { id: 'default' },
        style: { type: AndroidStyle.BIGTEXT, text: body },
      },
      data: {
        ...data,
        type: 'request_status',
        status,
        requestId,
        recipientRole:
          data.recipientRole ||
          data.userRole ||
          (String(data.initiatedBy || '') === 'requester'
            ? 'helper'
            : String(data.initiatedBy || '') === 'helper'
              ? 'requester'
              : status === 'matched'
                ? 'requester'
                : ''),
      },
    });
  } catch (e) {}
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;
  if (!notification || !pressAction) {
    return;
  }

  if (type === EventType.ACTION_PRESS || type === EventType.PRESS) {
    const handled = await handleCompletionPromptNotifeeAction(detail);
    if (handled) return;
    const actionId = String(pressAction?.id || 'default').toLowerCase();
    const data = notification?.data || {};
    if ((actionId === 'decline_help' || actionId === 'decline_presence') && data?.requestId) {
      try {
        const auth = await loadAuth();
        if (auth?.accessToken) {
          if (actionId === 'decline_help') {
            await declineHelpAsVolunteer(auth.accessToken, data.requestId);
          } else {
            await declinePresenceAsVolunteer(auth.accessToken, data.requestId);
          }
        }
      } catch (e) {
        console.log('[Notifee] background decline action failed', e);
      }
    }
    await notifee.cancelNotification(notification.id);
  }
});

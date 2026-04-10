import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee, { AndroidStyle, EventType } from '@notifee/react-native';
import {
  CHANNELS,
  handleIncomingCallMessage,
  initNotifeeChannels,
  displayBorrowItemActionNotification,
  displayOfferItemActionNotification,
} from './SociusNotificationService';
import { buildClosureInitiatedCopy, buildRequestClosedCopy } from '../../utils/closureMessages';
import {
  displayRequestCompletionPrompt,
  handleCompletionPromptNotifeeAction,
} from './requestCompletionPrompt';
import { handleChatMessageFcm } from '../chat/chatNotificationSync';
import {
  loadAuth,
  savePendingBorrowItemOpen,
  clearPendingBorrowItemOpen,
  savePendingOfferItemOpen,
  clearPendingOfferItemOpen,
} from '../storage/asyncStorage.service';
import { declineHelpAsVolunteer, declinePresenceAsVolunteer } from '../api/volunteer.api';
import { respondBorrowItemRequest, respondOfferItemRequest } from '../api/dailyHelp.api';
import { appEvents } from '../socket/socket.service';
import { refreshActiveHelpSessionNotifications } from './activeHelpSessionSync';

const messaging = getMessaging();

setBackgroundMessageHandler(messaging, async remoteMessage => {
  console.log('[FCM] background message', remoteMessage?.data || remoteMessage);
  const data = remoteMessage?.data || {};
  const type = String(data.type || '').toLowerCase();

  // Handle requester completion prompt first so it never gets short-circuited.
  if (
    type === 'request_completion_prompt' &&
    data.requestId &&
    (!data.recipientRole || String(data.recipientRole).toLowerCase() === 'requester')
  ) {
    await initNotifeeChannels();
    await displayRequestCompletionPrompt(data);
    await refreshActiveHelpSessionNotifications().catch(() => {});
    return;
  }

  if (type === 'borrow_item_request' && data.requestId && data.borrowId) {
    await initNotifeeChannels();
    await displayBorrowItemActionNotification(data);
    return;
  }

  if (type === 'offer_item_request' && data.requestId && (data.offerId || data.borrowId)) {
    await initNotifeeChannels();
    await displayOfferItemActionNotification(data);
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
      recipientRole: data.recipientRole || data.userRole,
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

  await refreshActiveHelpSessionNotifications().catch(() => {});
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  if (type === EventType.DISMISSED && notification?.id) {
    const nid = String(notification.id);
    if (nid === 'socius_active_help_session' || nid.startsWith('socius_active_help_session_')) {
      await refreshActiveHelpSessionNotifications().catch(() => {});
    }
    return;
  }

  if (!notification || !pressAction) {
    return;
  }

  if (type === EventType.ACTION_PRESS || type === EventType.PRESS) {
    const handled = await handleCompletionPromptNotifeeAction(detail);
    if (handled) return;
    const actionId = String(pressAction?.id || 'default').toLowerCase();
    const data = notification?.data || {};
    const isBorrowTap =
      String(data.type || '').toLowerCase() === 'borrow_item_request' &&
      data.requestId &&
      data.borrowId &&
      (actionId === 'borrow_view' || actionId === 'default');
    if (isBorrowTap) {
      await savePendingBorrowItemOpen(data);
    }
    const offerOidBg = String(data.offerId || data.borrowId || '');
    const isOfferTap =
      String(data.type || '').toLowerCase() === 'offer_item_request' &&
      data.requestId &&
      offerOidBg &&
      (actionId === 'offer_view' || actionId === 'default');
    if (isOfferTap) {
      await savePendingOfferItemOpen(data);
    }
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
    if ((actionId === 'borrow_accept' || actionId === 'borrow_decline') && data?.requestId && data?.borrowId) {
      try {
        await clearPendingBorrowItemOpen();
        const auth = await loadAuth();
        if (auth?.accessToken) {
          await respondBorrowItemRequest(
            auth.accessToken,
            String(data.requestId),
            String(data.borrowId),
            actionId === 'borrow_accept' ? 'accept' : 'decline'
          );
          appEvents.emit('help:borrow_offer_items_changed', { requestId: String(data.requestId) });
        }
      } catch (e) {
        console.log('[Notifee] background borrow action failed', e);
      }
    }
    if (
      (actionId === 'offer_accept' || actionId === 'offer_decline') &&
      data?.requestId &&
      offerOidBg &&
      String(data.type || '').toLowerCase() === 'offer_item_request'
    ) {
      try {
        await clearPendingOfferItemOpen();
        const auth = await loadAuth();
        if (auth?.accessToken) {
          await respondOfferItemRequest(
            auth.accessToken,
            String(data.requestId),
            offerOidBg,
            actionId === 'offer_accept' ? 'accept' : 'decline'
          );
          appEvents.emit('help:borrow_offer_items_changed', { requestId: String(data.requestId) });
        }
      } catch (e) {
        console.log('[Notifee] background offer action failed', e);
      }
    }
    await notifee.cancelNotification(notification.id);
  }
});

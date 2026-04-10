import notifee, { AndroidImportance, AndroidStyle, AndroidVisibility } from '@notifee/react-native';
import { CHANNELS, initNotifeeChannels } from '../notifications/SociusNotificationService';
import { baseURL } from '../api/client';

/** When this matches incoming FCM `sessionId`, tray notifications are skipped (chat modal is open). */
let activeChatSessionId = null;

export const setActiveChatSessionId = (sessionId) => {
  activeChatSessionId = sessionId ? String(sessionId) : null;
};

export const getActiveChatSessionId = () => activeChatSessionId;

export const chatNotificationId = (sessionId) => `chat_summary_${String(sessionId)}`;

export async function clearChatSessionNotifications(sessionId) {
  if (!sessionId) return;
  try {
    await notifee.cancelNotification(chatNotificationId(sessionId));
  } catch (e) {}
}

/**
 * Show or suppress incoming chat FCM as a single updating tray notification per session.
 * @returns {boolean} true if this was a chat_message payload (handled or suppressed)
 */
export async function handleChatMessageFcm(remoteMessage) {
  const data = remoteMessage?.data || {};
  if (String(data.type || '').toLowerCase() !== 'chat_message') {
    return false;
  }

  const sessionId = data.sessionId;
  if (!sessionId) return true;

  const active = getActiveChatSessionId();
  if (active && String(active) === String(sessionId)) {
    await clearChatSessionNotifications(sessionId);
    return true;
  }

  await initNotifeeChannels();
  const sender = data.senderName || 'Someone';
  const preview = data.preview || 'New message';
  const requestType = String(data.requestType || '').toLowerCase();
  const contextLabel =
    requestType === 'presencerequest' || requestType === 'presence_request'
      ? 'Presence chat'
      : 'Help chat';
  const body = `${contextLabel}: ${preview}`;
  const senderImageRaw = String(data.senderImage || '').trim();
  const apiRoot = String(baseURL || '').replace(/\/api\/?$/, '');
  const senderLargeIcon =
    senderImageRaw.length > 0
      ? senderImageRaw.startsWith('http://') || senderImageRaw.startsWith('https://')
        ? senderImageRaw
        : `${apiRoot}${senderImageRaw.startsWith('/') ? '' : '/'}${senderImageRaw}`
      : null;

  try {
    await notifee.displayNotification({
      id: chatNotificationId(sessionId),
      title: `💬 ${sender}`,
      body,
      android: {
        channelId: CHANNELS.UPDATES,
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'default', launchActivity: 'default' },
        tag: chatNotificationId(sessionId),
        style: { type: AndroidStyle.BIGTEXT, text: body },
        visibility: AndroidVisibility.PUBLIC,
        ...(senderLargeIcon ? { largeIcon: senderLargeIcon } : {}),
      },
      data: {
        type: 'chat_message',
        sessionId: String(sessionId),
        requestId: String(data.requestId || ''),
        senderName: String(sender),
        preview: String(preview),
        messageType: String(data.messageType || 'text'),
        // Required for role-aware deep link when the tray notification is tapped (FCM includes this).
        recipientRole: String(data.recipientRole || ''),
        requestType: String(data.requestType || ''),
        senderImage: senderImageRaw,
      },
    });
  } catch (e) {
    console.warn('[chatNotificationSync] display failed', e);
  }
  return true;
}

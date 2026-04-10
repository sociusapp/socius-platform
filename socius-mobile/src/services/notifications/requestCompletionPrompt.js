import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform, Alert, AppState } from 'react-native';
import { CHANNELS, initNotifeeChannels } from './SociusNotificationService';
import { loadAuth } from '../storage/asyncStorage.service';
import { patchHelpSession } from '../api/incident.api';
import { stopActiveHelpSessionNotification } from './activeHelpSessionNotification';

const completionNotifId = (requestId) => `help_completion_${requestId}`;

const extendChoices = [
  { label: '15 minutes', minutes: 15 },
  { label: '30 minutes', minutes: 30 },
  { label: '60 minutes', minutes: 60 },
];

export async function runCompleteFromPrompt(requestId) {
  try {
    const auth = await loadAuth();
    if (!auth?.accessToken || !requestId) return;
    await patchHelpSession(auth.accessToken, requestId, { action: 'complete' });
    await stopActiveHelpSessionNotification(String(requestId)).catch(() => {});
    await notifee.cancelNotification(completionNotifId(requestId)).catch(() => {});
  } catch (e) {
    console.warn('[completionPrompt] complete failed', e);
  }
}

export async function runExtendFromPrompt(requestId, minutes) {
  try {
    const auth = await loadAuth();
    if (!auth?.accessToken || !requestId) return;
    await patchHelpSession(auth.accessToken, requestId, {
      action: 'extend',
      additionalMinutes: minutes,
    });
    await notifee.cancelNotification(completionNotifId(requestId)).catch(() => {});
    void import('./activeHelpSessionSync').then((m) => m.refreshActiveHelpSessionNotifications());
  } catch (e) {
    console.warn('[completionPrompt] extend failed', e);
  }
}

function showExtendPicker(requestId) {
  Alert.alert(
    'Need more time?',
    'How long should we extend your session?',
    [
      ...extendChoices.map(({ label, minutes }) => ({
        text: label,
        onPress: () => runExtendFromPrompt(requestId, minutes),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]
  );
}

/**
 * FCM / in-app: show completion question with actions (Notifee on Android, Alert on iOS).
 */
export async function displayRequestCompletionPrompt(data) {
  const requestId = data.requestId || data.request_id;
  if (!requestId) return;
  const role = String(data?.recipientRole || data?.userRole || '').toLowerCase();
  if (role && role !== 'requester') return;

  await initNotifeeChannels();

  if (Platform.OS === 'android') {
    try {
      await notifee.displayNotification({
        id: completionNotifId(requestId),
        title: 'Return time ended - complete?',
        body: 'The agreed item return time has ended. Tap Completed or Need more time.',
        android: {
          channelId: CHANNELS.HELP_ALARM,
          importance: AndroidImportance.HIGH,
          pressAction: { id: 'default', launchActivity: 'default' },
          actions: [
            { title: 'Completed', pressAction: { id: 'complete' } },
            { title: 'Need more time', pressAction: { id: 'extend' } },
          ],
        },
        data: {
          type: 'request_completion_prompt',
          requestId: String(requestId),
          sessionEndsAt: String(data.sessionEndsAt || data.session_ends_at || ''),
        },
      });
    } catch (e) {
      console.warn('[completionPrompt] notifee display failed', e);
    }
    return;
  }

  Alert.alert('Has item return been completed?', '', [
    { text: 'Completed', onPress: () => runCompleteFromPrompt(requestId) },
    { text: 'Need more time', onPress: () => showExtendPicker(requestId) },
    { text: 'Later', style: 'cancel' },
  ]);
}

/**
 * Notifee foreground/background action handler (Android).
 */
export async function handleCompletionPromptNotifeeAction(detail) {
  if (Platform.OS !== 'android') return false;
  const { notification, pressAction } = detail;
  const data = notification?.data || {};
  const t = String(data.type || '').toLowerCase();
  if (t !== 'request_completion_prompt') return false;

  const requestId = data.requestId;
  if (!requestId) return false;
  if (pressAction.id === 'default') return false;

  if (pressAction.id === 'complete') {
    await runCompleteFromPrompt(requestId);
    return true;
  }
  if (pressAction.id === 'extend') {
    if (AppState.currentState === 'active') {
      showExtendPicker(requestId);
    } else {
      await runExtendFromPrompt(requestId, 30);
    }
    return true;
  }
  return true;
}

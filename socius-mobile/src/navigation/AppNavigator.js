import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import notifee, { AndroidStyle, EventType } from '@notifee/react-native';
import { AppState, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StackNavigator from './StackNavigator';
import { onNotificationOpened, getInitialNotification, onMessageForeground } from '../services/firebase/messaging';
import {
  CHANNELS,
  handleIncomingCallMessage,
  initNotifeeChannels,
  displaySociusUpdateNotification,
  displayAndroidForegroundIncomingHeadsUp,
} from '../services/notifications/SociusNotificationService';
import { connectSocket, emitStatusUpdate, appEvents } from '../services/socket/socket.service';
import CustomAlert from '../components/common/CustomAlert';
import DailyHelpIncomingModal from '../components/DailyHelp/modals/DailyHelpIncomingModal';
import IncomingPresenceAlarmModal from '../components/notifications/IncomingPresenceAlarmModal';
import { loadAuth } from '../services/storage/asyncStorage.service';
import { declineHelpAsVolunteer, declinePresenceAsVolunteer } from '../services/api/volunteer.api';
import { markRequestDelivered } from '../services/api/incident.api';
import {
  displayRequestCompletionPrompt,
  handleCompletionPromptNotifeeAction,
} from '../services/notifications/requestCompletionPrompt';
import { stopActiveHelpSessionNotification } from '../services/notifications/activeHelpSessionNotification';
import { handleChatMessageFcm } from '../services/chat/chatNotificationSync';
import { buildClosureInitiatedCopy, buildRequestClosedCopy, buildRequestAcceptedCopy, buildRequestCancelledCopy, buildNewRequestCopy, buildRequestTakenCopy } from '../utils/closureMessages';
import NativeCallService from '../services/notifications/NativeCallService';
import { getFcmToken } from '../services/firebase/config';
import { updateDeviceToken } from '../services/api/auth.api';
import {
  navigateToHelpMeeting,
  isUserOnHelpMeetingScreen,
  shouldShowRequestStatusModal,
} from './helpNotificationNavigation';

const { SociusCallModule } = NativeModules;

export const navigationRef = createNavigationContainerRef();

/** Native full-screen incoming call UI only when the app is truly backgrounded — not `inactive` (iOS) or brief blur. */
const shouldDelegateIncomingToNativeAndroid = () =>
  Platform.OS === 'android' && AppState.currentState === 'background';

const logIncomingAlert = (phase, extra) => {
  if (__DEV__) {
    console.log('[IncomingAlert]', phase, {
      appState: AppState.currentState,
      ...extra,
    });
  }
};

const ackHelpNotificationDelivered = async (requestId, tokenOverride = null) => {
  if (!requestId) return;
  try {
    const auth = await loadAuth();
    const token = tokenOverride || auth?.accessToken;
    if (!token) return;
    await markRequestDelivered(token, requestId);
    if (__DEV__) {
      console.log('[HelpNotifyAck] delivered', { requestId });
    }
  } catch (e) {
    if (__DEV__) {
      console.log('[HelpNotifyAck] delivered failed', { requestId, error: e?.message });
    }
  }
};

const handleNotifeeNavigation = async (navRef, notification, pressAction) => {
  if (!navRef.isReady()) return;
  const nav = navRef;

  const data = notification.data || {};
  const earlyType = String(data.type || '').toLowerCase();
  if (earlyType === 'request_completion_prompt' && data.requestId) {
    await displayRequestCompletionPrompt(data);
    return;
  }
  if (
    (earlyType === 'help_session_time_ended_helper' || earlyType === 'help_session_extended_helper') &&
    data.requestId
  ) {
    await navigateToHelpMeeting(nav, { requestId: data.requestId, data });
    return;
  }
  if (earlyType === 'chat_message' && data.requestId) {
    appEvents.emit('open_chat', { requestId: data.requestId });
    await navigateToHelpMeeting(nav, { requestId: data.requestId, data, openChat: true });
    return;
  }
  if (earlyType === 'review_decision') {
    navigateAfterReviewDecision(nav, data.approved);
    return;
  }

  // Dismiss the notification when the user interacts with it
  if (notification.id) {
    try {
      await notifee.cancelNotification(notification.id);
    } catch (err) {
      console.warn('[AppNavigator] Failed to cancel notification', err);
    }
  }

  const type = data.type;

  if (type === 'PRESENCE_ALARM') {
    const requestId = data.requestId || data.presenceId || data.id;
    const distanceMetersRaw = data.distanceMeters ?? data.distance_meters ?? data.distance;
    
    // Emit sync event for requester
    loadAuth().then(auth => {
      const userId = auth?.user?._id || auth?.user?.id || auth?.userId;
      if (requestId && userId) {
        emitStatusUpdate(requestId, 'accepted', { type: 'PRESENCE_ALARM', userId });
      }
    });

    nav.navigate('SomeoneConcern', {
      requestId,
      situation: data.situation,
      distanceMeters: distanceMetersRaw ? Number(distanceMetersRaw) : 0,
      area: data.area || data.cityArea || data.locationLabel,
    });
    return;
  }

  const t = String(type || '').toLowerCase();
  if (t === 'help_request' || t === 'request_rematched') {
    const requestId = data.requestId;
    
    // Emit sync event for requester
    loadAuth().then(auth => {
      const userId = auth?.user?._id || auth?.user?.id || auth?.userId;
      if (requestId && userId) {
        emitStatusUpdate(requestId, 'accepted', { type: 'HELP_REQUEST', userId });
      }
    });

    nav.navigate('SomeoneNeedsHelp', {
      requestId: data.requestId,
      category: data.category,
      description: data.description,
      distanceMeters: data.distanceMeters,
      area: data.area,
    });
    return;
  }

  if (t === 'helper_arrived' || t === 'request_expiring_warning' || t === 'no_helpers_nearby') {
    if (data.requestId) {
      await navigateToHelpMeeting(nav, {
        requestId: data.requestId,
        data: { ...data, recipientRole: 'requester' },
      });
    }
    return;
  }

  if (t === 'request_status') {
    const status = String(data.status || '').toLowerCase();
    const requestId = data.requestId;
    if (!requestId) return;
    if (status === 'matched' || status === 'accepted' || status === 'closing') {
      await navigateToHelpMeeting(nav, { requestId, data });
      return;
    }
    if (status === 'closed') {
      navigateToActivity(requestId, status);
    }
  }
};

const navigateToActivity = (requestId, status) => {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('MainApp', {
    screen: 'CommunityTab',
    params: { initialTab: 'history', highlightRequestId: requestId, highlightStatus: status },
  });
};

/** Prefer passing `data` from FCM (includes recipientRole). Fall back loads active request as requester. */
const openHelpMeeting = (requestId, data = {}, openChat = false) => {
  void navigateToHelpMeeting(navigationRef, { requestId, data, openChat });
};

const navigateAfterReviewDecision = (navRef, approvedRaw) => {
  if (!navRef?.isReady?.()) return;
  const approved = String(approvedRaw || '').toLowerCase() === 'true';
  navRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'MainApp',
          state: {
            routes: [
              {
                name: 'HomeTab',
                params: {
                  verificationDecision: approved ? 'approved' : 'rejected',
                  verificationChangedAt: Date.now(),
                },
              },
            ],
          },
        },
      ],
    })
  );
};

const AppNavigator = () => {
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: 'bell-ring',
    iconColor: '#DC5C69',
    dismissDurationMs: 200,
  });

  const showAlert = (title, message, buttons = [], icon = 'bell-ring', iconColor = '#DC5C69', options = {}) => {
    setAlertConfig({
      title,
      message,
      buttons,
      icon,
      iconColor,
      dismissDurationMs: typeof options?.dismissDurationMs === 'number' ? options.dismissDurationMs : 200,
    });
    setAlertVisible(true);
  };

  const closeAlert = () => {
    setAlertVisible(false);
  };

  const showReviewDecisionAlert = (data = {}) => {
    const approved = String(data.approved || '').toLowerCase() === 'true';
    const title = approved ? 'Verification approved' : 'Verification update';
    const message = approved
      ? 'Your account has been approved. You can now access all available features.'
      : 'Your verification was not approved. Please review details and resubmit your documents.';
    showAlert(
      title,
      message,
      [
        {
          text: approved ? 'Continue' : 'Review now',
          onPress: () => {
            closeAlert();
            navigateAfterReviewDecision(navigationRef, approved);
          },
          style: 'primary',
        },
        { text: 'OK', onPress: closeAlert },
      ],
      approved ? 'check-circle' : 'alert-circle-outline',
      approved ? '#28C76F' : '#DC5C69'
    );
  };

  const [incomingHelpVisible, setIncomingHelpVisible] = useState(false);
  const [incomingHelpData, setIncomingHelpData] = useState(null);
  const [incomingHelpStatus, setIncomingHelpStatus] = useState('notified');
  const [incomingPresenceVisible, setIncomingPresenceVisible] = useState(false);
  const [incomingPresenceData, setIncomingPresenceData] = useState(null);
  const [incomingPresenceStatus, setIncomingPresenceStatus] = useState('notified');
  const incomingHelpDedupeRef = useRef({ id: null, t: 0 });

  // Persistence logic for Modals
  useEffect(() => {
    const persistModals = async () => {
      try {
        if (incomingHelpVisible && incomingHelpData) {
          await AsyncStorage.setItem('PENDING_HELP_MODAL', JSON.stringify(incomingHelpData));
        } else {
          await AsyncStorage.removeItem('PENDING_HELP_MODAL');
        }

        if (incomingPresenceVisible && incomingPresenceData) {
          await AsyncStorage.setItem('PENDING_PRESENCE_MODAL', JSON.stringify(incomingPresenceData));
        } else {
          await AsyncStorage.removeItem('PENDING_PRESENCE_MODAL');
        }
      } catch (e) {
        console.log('[AppNavigator] Error persisting modal state', e);
      }
    };
    persistModals();
  }, [incomingHelpVisible, incomingHelpData, incomingPresenceVisible, incomingPresenceData]);

  // Restore logic on app launch
  useEffect(() => {
    const restoreModals = async () => {
      try {
        const pendingHelp = await AsyncStorage.getItem('PENDING_HELP_MODAL');
        if (pendingHelp) {
          setIncomingHelpData(JSON.parse(pendingHelp));
          setIncomingHelpStatus('notified');
          setIncomingHelpVisible(true);
        }

        const pendingPresence = await AsyncStorage.getItem('PENDING_PRESENCE_MODAL');
        if (pendingPresence) {
          setIncomingPresenceData(JSON.parse(pendingPresence));
          setIncomingPresenceStatus('notified');
          setIncomingPresenceVisible(true);
        }
      } catch (e) {
        console.log('[AppNavigator] Error restoring modal state', e);
      }
    };
    
    // Wait for navigation to be ready or just show them
    restoreModals();
  }, []);

  useEffect(() => {
    if (SociusCallModule) {
      const eventEmitter = new NativeEventEmitter(SociusCallModule);

      const handleCallAction = async (event) => {
        const { action, uuid, payload } = event;
        console.log('[AppNavigator] Call Action:', action, uuid);

        if (action === 'decline') {
          try {
            const auth = await loadAuth();
            const token = auth?.accessToken;
            if (token && uuid) {
              const parsed = payload ? JSON.parse(payload) : {};
              const t = String(parsed?.type || '').toUpperCase();
              if (t === 'PRESENCE_ALARM' || t.includes('PRESENCE')) {
                await declinePresenceAsVolunteer(token, uuid);
              } else {
                await declineHelpAsVolunteer(token, uuid);
              }
            }
          } catch (e) {
            console.log('[AppNavigator] Decline handling failed', e);
          }
          return;
        }

        if (action === 'answer' || action === 'fullscreen') {
          try {
            const data = payload ? JSON.parse(payload) : {};
            const notification = { id: uuid, data };

            // Wait for navigationRef to be ready
            if (navigationRef.isReady()) {
              handleNotifeeNavigation(navigationRef, notification, { id: 'default' });
            } else {
              setTimeout(() => {
                if (navigationRef.isReady()) {
                  handleNotifeeNavigation(navigationRef, notification, { id: 'default' });
                }
              }, 1000);
            }
          } catch (e) {
            console.error('[AppNavigator] Error parsing call payload', e);
          }
        }
      };

      const subscription = eventEmitter.addListener('onCallAction', handleCallAction);

      SociusCallModule.getInitialCallAction().then(initialAction => {
        if (initialAction) {
          handleCallAction(initialAction);
        }
      });

      return () => {
        subscription.remove();
      };
    }
  }, []);

  useEffect(() => {
    const appStateRef = { current: AppState.currentState };
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      // Only treat true background as "dismiss"; `inactive` (e.g. brief Android focus loss) hides call UI incorrectly.
      if (nextState === 'background') {
        setIncomingHelpVisible(false);
        setIncomingPresenceVisible(false);
        NativeCallService.stopRingtone();
      }
    });

    initNotifeeChannels().catch(() => {});

    (async () => {
      try {
        const { accessToken } = await loadAuth();
        if (!accessToken) return;
        const token = await getFcmToken().catch(() => null);
        if (!token) return;
        await updateDeviceToken(accessToken, { deviceToken: token, platform: Platform.OS }).catch(() => {});
      } catch (e) {}
    })();

    const displayUpdateNotification = async ({ title, body, data }) => {
      if (Platform.OS !== 'android') return;
      try {
        const status = String(data?.status || '').toLowerCase();
        const requestId = String(data?.requestId || '');
        const id = status && requestId ? `update:${status}:${requestId}` : undefined;
        await notifee.displayNotification({
          id,
          title,
          body,
          android: {
            channelId: CHANNELS.UPDATES,
            pressAction: { id: 'default' },
            style: { type: AndroidStyle.BIGTEXT, text: body },
          },
          data,
        });
      } catch (e) {}
    };

    const unsubscribeOpened = onNotificationOpened((remoteMessage) => {
      const data = remoteMessage?.data || {};
      const run = () => {
        if (!navigationRef.isReady()) {
          setTimeout(run, 600);
          return;
        }

        const type = String(data.type || '').toLowerCase();

        if (type === 'presence_alarm' || type.includes('presence_alarm')) {
          const requestId = data.requestId || data.presenceId || data.id;
          const distanceMetersRaw = data.distanceMeters ?? data.distance_meters ?? data.distance;
          NativeCallService.startPresenceAlarmRingtone();
          setIncomingPresenceData({
            requestId,
            situation: data.description || data.situation || data.situationType || 'Safety concern',
            requesterName: data.requesterName || 'Someone',
            distanceMeters: distanceMetersRaw ? Number(distanceMetersRaw) : 0,
            area: data.area || data.cityArea || data.locationLabel || 'Nearby',
          });
          setIncomingPresenceVisible(true);
          return;
        }

        if (type === 'request_completion_prompt' && data.requestId) {
          displayRequestCompletionPrompt(data);
          return;
        }

        if (
          (type === 'help_session_time_ended_helper' || type === 'help_session_extended_helper') &&
          data.requestId
        ) {
          void navigateToHelpMeeting(navigationRef, { requestId: data.requestId, data });
          return;
        }

        if (type === 'chat_message' && data.requestId) {
          appEvents.emit('open_chat', { requestId: data.requestId });
          void navigateToHelpMeeting(navigationRef, {
            requestId: data.requestId,
            data,
            openChat: true,
          });
          return;
        }
        if (type === 'review_decision') {
          navigateAfterReviewDecision(navigationRef, data.approved);
          return;
        }

        if ((type.includes('help_request') || type === 'help_request_alert') && data.requestId) {
          loadAuth()
            .then((auth) => {
              const token = auth?.accessToken || null;
              void ackHelpNotificationDelivered(data.requestId, token);
              NativeCallService.startHelpRequestRingtone();
              setIncomingHelpData({
                requestId: data.requestId,
                category: data.category,
                categoryName: data.categoryName,
                categoryIcon: data.categoryIcon,
                requesterName: data.requesterName || 'Someone',
                description: data.description,
                distanceMeters: data.distanceMeters ? Number(data.distanceMeters) : 0,
                area: data.area,
                token,
              });
              setIncomingHelpVisible(true);
            })
            .catch(() => {});
          return;
        }

        if (type === 'help_request_alert' && data.requestId) {
          navigationRef.navigate('LocalRequest', { requestId: data.requestId });
          return;
        }

        if (type === 'request_status' && data.status) {
          const status = String(data.status || '').toLowerCase();
          const rid = data.requestId;
          if (!rid) return;
          if (status === 'matched' || status === 'accepted' || status === 'closing') {
            void navigateToHelpMeeting(navigationRef, { requestId: rid, data });
            return;
          }
          if (status === 'closed') {
            navigateToActivity(rid, status);
          }
        }
      };

      run();
    });

    const unsubscribeForeground = onMessageForeground(async remoteMessage => {
      console.log('[AppNavigator] foreground message received:', JSON.stringify(remoteMessage?.data || {}));

      const data = remoteMessage?.data || {};
      const lowerType = String(data.type || '').toLowerCase();
      if (lowerType === 'review_decision') {
        showReviewDecisionAlert(data);
        return;
      }
      if (lowerType === 'request_completion_prompt' && data.requestId) {
        await displayRequestCompletionPrompt(data);
        return;
      }

      if (
        (lowerType === 'help_session_time_ended_helper' || lowerType === 'help_session_extended_helper') &&
        data.requestId
      ) {
        if (Platform.OS === 'android') {
          await initNotifeeChannels();
          await displaySociusUpdateNotification(data);
        }
        return;
      }

      if (await handleChatMessageFcm(remoteMessage)) {
        return;
      }

      const upperType = String(data.type || '').toUpperCase();

      const isPresenceAlarm = upperType === 'PRESENCE_ALARM' || upperType.includes('PRESENCE_ALARM');
      const isHelpRequest =
        upperType.includes('HELP_REQUEST') ||
        upperType === 'HELP_REQUEST_ALERT' ||
        upperType.includes('HELP_REQUEST_ALERT') ||
        upperType.includes('REQUEST_REMATCHED');

      console.log('[AppNavigator] FCM type check:', { upperType, isPresenceAlarm, isHelpRequest, platform: Platform.OS });

      if ((isHelpRequest || isPresenceAlarm) && shouldDelegateIncomingToNativeAndroid()) {
        logIncomingAlert('FCM → native incoming UI (Android background)', { requestId: data.requestId });
        const handledByCallKeep = await handleIncomingCallMessage(remoteMessage);
        if (handledByCallKeep) {
          return;
        }
      }

      if (isPresenceAlarm) {
        logIncomingAlert('FCM presence → in-app alarm modal + tray heads-up', { requestId: data.requestId });
        try {
          NativeCallService.startPresenceAlarmRingtone();
        } catch (e) {}

        const requestId = data.requestId || data.presenceId || data.id;
        const distanceMetersRaw = data.distanceMeters ?? data.distance_meters ?? data.distance;
        setIncomingPresenceData({
          requestId,
          situation: data.description || data.situation || data.situationType || 'Safety concern',
          requesterName: data.requesterName || 'Someone',
          distanceMeters: distanceMetersRaw ? Number(distanceMetersRaw) : 0,
          area: data.area || data.cityArea || data.locationLabel || 'Nearby',
        });
        setIncomingPresenceVisible(true);
        void displayAndroidForegroundIncomingHeadsUp('presence', { ...data, requestId });
        return;
      }

      if (isHelpRequest) {
        logIncomingAlert('FCM help → in-app modal + tray heads-up', { requestId: data.requestId });
        const auth = await loadAuth().catch(() => null);
        const token = auth?.accessToken || null;
        const now = Date.now();
        if (
          incomingHelpDedupeRef.current?.id === data.requestId &&
          now - incomingHelpDedupeRef.current.t < 2500
        ) {
          return;
        }
        incomingHelpDedupeRef.current = { id: data.requestId, t: now };

        try {
          NativeCallService.startHelpRequestRingtone();
        } catch (e) {}

        setIncomingHelpData((prev) => ({
          ...(prev || {}),
          requestId: data.requestId,
          category: data.category,
          categoryName: data.categoryName,
          categoryIcon: data.categoryIcon,
          requesterName: data.requesterName || 'Someone',
          description: data.description,
          distanceMeters: data.distanceMeters ? Number(data.distanceMeters) : 0,
          area: data.area,
          token,
        }));
        setIncomingHelpVisible(true);
        void displayAndroidForegroundIncomingHeadsUp('help', data);
        return;
      }

      console.log('[AppNavigator] FCM message not handled, checking call keep');
      const handledByCallKeep = await handleIncomingCallMessage(remoteMessage);
      if (handledByCallKeep) {
        return;
      }

      const dataType = String(data.type || '').toLowerCase();
      const status = String(data.status || '').toLowerCase();
      
      // Emit foreground notification event for real-time stats updates
      if (dataType === 'request_status' || data.requestId) {
        appEvents.emit('foreground:request_update', {
          requestId: data.requestId,
          status: data.status,
          type: dataType,
          stats: data.stats,
          timestamp: new Date().toISOString()
        });
      }
      
      if (dataType === 'request_status') {
        if (['cancelled', 'closed', 'closing', 'auto_closed'].includes(status)) {
          stopActiveHelpSessionNotification().catch(() => {});
        }
        if (status === 'matched' || status === 'accepted') {
          const rid = data.requestId;
          if (!rid) return;
          if (isUserOnHelpMeetingScreen(navigationRef, rid)) {
            return;
          }
          if (!shouldShowRequestStatusModal(rid, 'matched')) {
            return;
          }
          const roleForCopy = data.recipientRole || data.userRole || data.role || 'requester';
          const copy = buildRequestAcceptedCopy({
            requestType: data.requestType || 'Help request',
            volunteerName: data.volunteerName || data.volunteer?.fullName,
            userRole: roleForCopy,
          });
          showAlert(
            copy.title,
            copy.message,
            [
              {
                text: 'View meeting',
                onPress: () => {
                  closeAlert();
                  openHelpMeeting(rid, data);
                },
                style: 'primary',
              },
              { text: 'OK', onPress: closeAlert },
            ],
            'account-heart',
            '#28C76F'
          );
          return;
        }
        if (status === 'taken' || status === 'already_accepted') {
          // Show modal when someone else accepted the request
          const copy = buildRequestTakenCopy({
            requestType: data.requestType || 'Help request',
            volunteerName: data.volunteerName || data.volunteer?.fullName,
          });
          showAlert(
            copy.title,
            copy.message,
            [
              {
                text: 'OK',
                onPress: closeAlert,
                style: 'primary',
              },
            ],
            'account-cancel',
            '#6B7280'
          );
          return;
        }
        if (status === 'cancelled') {
          const rid = data.requestId;
          if (rid && isUserOnHelpMeetingScreen(navigationRef, rid)) {
            return;
          }
          if (rid && !shouldShowRequestStatusModal(rid, 'cancelled')) {
            return;
          }
          const copy = buildRequestCancelledCopy({
            requestType: data.requestType || 'Help request',
            cancelledBy: data.cancelledBy,
            userRole: data.userRole || data.role,
          });
          showAlert(
            copy.title,
            copy.message,
            [
              {
                text: 'OK',
                onPress: closeAlert,
                style: 'primary',
              },
            ],
            'close-circle',
            '#DC5C69'
          );
          return;
        }
        if (status === 'closing') {
          const rid = data.requestId;
          if (!rid) return;
          if (isUserOnHelpMeetingScreen(navigationRef, rid)) {
            return;
          }
          if (!shouldShowRequestStatusModal(rid, 'closing')) {
            return;
          }
          const copy = buildClosureInitiatedCopy({
            requestId: rid,
            requestType: data.requestType || 'Help request',
            initiatedBy: data.initiatedBy,
            occurredAt: data.occurredAt,
          });
          showAlert(
            copy.title,
            copy.message,
            [
              {
                text: 'View meeting',
                onPress: () => {
                  closeAlert();
                  openHelpMeeting(rid, data);
                },
                style: 'primary',
              },
              { text: 'Not now', onPress: closeAlert, style: 'cancel' },
            ],
            'alert-circle-outline',
            '#DC5C69'
          );
          return;
        }
        if (status === 'closed') {
          const rid = data.requestId;
          if (!rid) return;
          if (isUserOnHelpMeetingScreen(navigationRef, rid)) {
            return;
          }
          if (!shouldShowRequestStatusModal(rid, 'closed')) {
            return;
          }
          const roleForCopy = data.recipientRole || data.userRole || data.role;
          const copy = buildRequestClosedCopy({
            requestId: rid,
            requestType: data.requestType || 'Help request',
            reason: data.reason,
            occurredAt: data.occurredAt,
            userRole: roleForCopy,
          });
          showAlert(
            copy.title,
            copy.message,
            [
              {
                text: 'Open activity',
                onPress: () => {
                  closeAlert();
                  navigateToActivity(rid, 'closed');
                },
                style: 'primary',
              },
              { text: 'OK', onPress: closeAlert },
            ],
            'check-circle',
            '#28C76F'
          );
          return;
        }
      }

      if (remoteMessage?.notification?.body) {
        // Customize alert based on content
        const title = remoteMessage?.notification?.title || '';
        const body = remoteMessage?.notification?.body || '';
        let icon = 'bell-ring';
        let iconColor = '#DC5C69';
        let buttons = [{ text: 'OK', onPress: closeAlert }];

        const lowerTitle = (title || '').toLowerCase();
        const lowerBody = (body || '').toLowerCase();

        const isMatchedLike =
          title.includes('Someone is coming') ||
          (String(data.type || '').toLowerCase() === 'request_status' && String(data.status || '').toLowerCase() === 'matched') ||
          String(data.status || '').toLowerCase() === 'matched';

      if (isMatchedLike) {
          icon = 'account-heart';
          iconColor = '#28C76F';
          buttons = [{
            text: 'OK',
            onPress: () => {
              closeAlert();
              // Screen already redirects, no need to navigate again
            }
          }];
        } else if (
          (lowerTitle.includes('verified') || lowerBody.includes('verified') ||
            lowerTitle.includes('approved') || lowerBody.includes('approved')) &&
          !lowerTitle.includes('failed') && !lowerBody.includes('failed') &&
          !lowerTitle.includes('rejected') && !lowerBody.includes('rejected')
        ) {
          icon = 'check-circle';
          iconColor = '#28C76F';
          buttons = [{
            text: 'OK',
            onPress: () => {
              closeAlert();
              if (navigationRef.isReady()) {
                navigationRef.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [
                      {
                        name: 'MainApp',
                        state: {
                          routes: [{ name: 'HomeTab' }]
                        }
                      }
                    ],
                  })
                );
              }
            }
          }];
        }

        showAlert(
          title || 'Notification',
          body,
          buttons,
          icon,
          iconColor,
          isMatchedLike ? { dismissDurationMs: 0 } : undefined
        );
      }
    });

    getInitialNotification().then((remoteMessage) => {
      const data = remoteMessage?.data || {};
      const run = () => {
        if (!navigationRef.isReady()) {
          setTimeout(run, 600);
          return;
        }

        const lt = String(data.type || '').toLowerCase();
        if (lt === 'request_completion_prompt' && data.requestId) {
          displayRequestCompletionPrompt(data);
          return;
        }

        if (
          (lt === 'help_session_time_ended_helper' || lt === 'help_session_extended_helper') &&
          data.requestId
        ) {
          void navigateToHelpMeeting(navigationRef, { requestId: data.requestId, data });
          return;
        }

        if (lt === 'chat_message' && data.requestId) {
          appEvents.emit('open_chat', { requestId: data.requestId });
          void navigateToHelpMeeting(navigationRef, {
            requestId: data.requestId,
            data,
            openChat: true,
          });
          return;
        }
        if (lt === 'review_decision') {
          navigateAfterReviewDecision(navigationRef, data.approved);
          return;
        }

        if ((lt.includes('help_request') || lt.includes('request_rematched')) && data.requestId) {
          loadAuth()
            .then((auth) => {
              const token = auth?.accessToken || null;
              void ackHelpNotificationDelivered(data.requestId, token);
              NativeCallService.startHelpRequestRingtone();
              setIncomingHelpData({
                requestId: data.requestId,
                category: data.category,
                categoryName: data.categoryName,
                categoryIcon: data.categoryIcon,
                description: data.description,
                distanceMeters: data.distanceMeters ? Number(data.distanceMeters) : 0,
                area: data.area,
                token,
              });
              setIncomingHelpVisible(true);
            })
            .catch(() => {});
          return;
        }

        if (data.type === 'HELP_REQUEST_ALERT' && data.requestId) {
          navigationRef.navigate('LocalRequest', { requestId: data.requestId });
        }

        if (data.type === 'request_status' && data.status) {
          const status = String(data.status || '').toLowerCase();
          const rid = data.requestId;
          if (!rid) return;
          if (status === 'matched' || status === 'accepted' || status === 'closing') {
            void navigateToHelpMeeting(navigationRef, { requestId: rid, data });
          } else if (status === 'cancelled' || status === 'closed') {
            navigateToActivity(rid, status);
          }
        }
      };

      run();
    });

    const unsubscribeNotifeeForeground = notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type !== EventType.ACTION_PRESS && type !== EventType.PRESS) {
        return;
      }

      const { notification, pressAction } = detail;
      const actionId = String(pressAction?.id || 'default').toLowerCase();
      const notifData = notification?.data || {};
      const handledCompletion = await handleCompletionPromptNotifeeAction(detail);
      if (handledCompletion) {
        return;
      }
      if (actionId === 'decline_help' && notifData?.requestId) {
        try {
          const auth = await loadAuth();
          if (auth?.accessToken) {
            await declineHelpAsVolunteer(auth.accessToken, notifData.requestId);
          }
          if (notification?.id) await notifee.cancelNotification(notification.id);
        } catch (e) {
          console.log('[Notifee] decline_help failed', e);
        }
        return;
      }
      if (actionId === 'decline_presence' && notifData?.requestId) {
        try {
          const auth = await loadAuth();
          if (auth?.accessToken) {
            await declinePresenceAsVolunteer(auth.accessToken, notifData.requestId);
          }
          if (notification?.id) await notifee.cancelNotification(notification.id);
        } catch (e) {
          console.log('[Notifee] decline_presence failed', e);
        }
        return;
      }
      handleNotifeeNavigation(navigationRef, notification, pressAction);
    });

    notifee.getInitialNotification().then(initialNotification => {
      if (!initialNotification) return;
      const { notification, pressAction } = initialNotification;
      handleNotifeeNavigation(navigationRef, notification, pressAction);
    });

    let socket;
    let mounted = true;

    const showUpdate = async (title, message, {
      requestId,
      status,
      requestType,
      reason,
      occurredAt,
      initiatedBy,
      userRole,
      recipientRole,
      cancelledBy,
      volunteerName,
    }) => {
      const isActive = appStateRef.current === 'active';
      const navPayload = {
        requestId: String(requestId || ''),
        requestType: requestType ? String(requestType) : '',
        reason: reason ? String(reason) : '',
        occurredAt: occurredAt ? String(occurredAt) : '',
        initiatedBy: initiatedBy ? String(initiatedBy) : '',
        recipientRole: String(recipientRole || userRole || ''),
        userRole: String(userRole || recipientRole || ''),
        type: 'request_status',
        status: String(status || ''),
      };
      if (isActive) {
        if (String(status).toLowerCase() === 'matched' || String(status).toLowerCase() === 'accepted') {
          if (!requestId) return;
          if (isUserOnHelpMeetingScreen(navigationRef, requestId)) return;
          if (!shouldShowRequestStatusModal(requestId, 'matched')) return;
          const copy = buildRequestAcceptedCopy({
            requestType,
            volunteerName,
            userRole: recipientRole || userRole,
          });
          showAlert(
            copy.title,
            copy.message,
            [
              {
                text: 'View meeting',
                onPress: () => {
                  closeAlert();
                  openHelpMeeting(requestId, navPayload);
                },
                style: 'primary',
              },
              { text: 'OK', onPress: closeAlert },
            ],
            'account-heart',
            '#28C76F'
          );
          return;
        }
        if (String(status).toLowerCase() === 'cancelled') {
          if (requestId && isUserOnHelpMeetingScreen(navigationRef, requestId)) return;
          if (requestId && !shouldShowRequestStatusModal(requestId, 'cancelled')) return;
          const copy = buildRequestCancelledCopy({
            requestType,
            cancelledBy,
            userRole,
          });
          showAlert(
            copy.title,
            copy.message,
            [
              {
                text: 'OK',
                onPress: closeAlert,
                style: 'primary',
              },
            ],
            'close-circle',
            '#DC5C69'
          );
          return;
        }
        if (String(status).toLowerCase() === 'closing') {
          if (!requestId) return;
          if (isUserOnHelpMeetingScreen(navigationRef, requestId)) return;
          if (!shouldShowRequestStatusModal(requestId, 'closing')) return;
          showAlert(
            title,
            message,
            [
              {
                text: 'View meeting',
                onPress: () => {
                  closeAlert();
                  openHelpMeeting(requestId, navPayload);
                },
                style: 'primary',
              },
              { text: 'Not now', onPress: closeAlert, style: 'cancel' },
            ],
            'alert-circle-outline',
            '#DC5C69'
          );
          return;
        }
        if (String(status).toLowerCase() === 'closed') {
          if (!requestId) return;
          if (isUserOnHelpMeetingScreen(navigationRef, requestId)) return;
          if (!shouldShowRequestStatusModal(requestId, 'closed')) return;
          const copy = buildRequestClosedCopy({
            requestId,
            requestType,
            reason,
            occurredAt,
            userRole: recipientRole || userRole,
          });
          showAlert(
            copy.title,
            copy.message,
            [
              {
                text: 'Open activity',
                onPress: () => {
                  closeAlert();
                  navigateToActivity(requestId, 'closed');
                },
                style: 'primary',
              },
              { text: 'OK', onPress: closeAlert },
            ],
            'check-circle',
            '#28C76F'
          );
          return;
        }
      }

      if (!isActive) {
        await displayUpdateNotification({
          title,
          body: message,
          data: {
            type: 'request_status',
            status,
            requestId: String(requestId || ''),
            requestType: requestType ? String(requestType) : '',
            reason: reason ? String(reason) : '',
            occurredAt: occurredAt ? String(occurredAt) : '',
            initiatedBy: initiatedBy ? String(initiatedBy) : '',
            cancelledBy: cancelledBy ? String(cancelledBy) : '',
            userRole: userRole ? String(userRole) : '',
            recipientRole: recipientRole ? String(recipientRole) : userRole ? String(userRole) : '',
          },
        });
        return;
      }

      await displayUpdateNotification({
        title,
        body: message,
        data: {
          type: 'request_status',
          status,
          requestId: String(requestId || ''),
          requestType: requestType ? String(requestType) : '',
          reason: reason ? String(reason) : '',
          occurredAt: occurredAt ? String(occurredAt) : '',
          initiatedBy: initiatedBy ? String(initiatedBy) : '',
          cancelledBy: cancelledBy ? String(cancelledBy) : '',
          userRole: userRole ? String(userRole) : '',
          recipientRole: recipientRole ? String(recipientRole) : userRole ? String(userRole) : '',
        },
      });
    };

    const setupSocket = async () => {
      const s = await connectSocket();
      if (!mounted || !s) return;
      socket = s;
      const lastOfferCallIdRef = { current: null };

      socket.on('help:closure_initiated', (payload) => {
        const requestId = payload?.requestId;
        if (!requestId) return;
        if (isUserOnHelpMeetingScreen(navigationRef, requestId)) return;
        stopActiveHelpSessionNotification().catch(() => {});
        const copy = buildClosureInitiatedCopy({
          requestId,
          requestType: payload?.requestType || 'Help request',
          initiatedBy: payload?.initiatedBy,
          occurredAt: payload?.occurredAt,
        });
        const recipientRole =
          payload?.initiatedBy === 'requester' ? 'helper' : payload?.initiatedBy === 'helper' ? 'requester' : '';
        showUpdate(copy.title, copy.message, {
          requestId,
          status: 'closing',
          requestType: payload?.requestType,
          initiatedBy: payload?.initiatedBy,
          occurredAt: payload?.occurredAt,
          userRole: recipientRole,
          recipientRole,
        });
      });

      socket.on('help:request_closed', (payload) => {
        const requestId = payload?.requestId;
        if (!requestId) return;
        if (isUserOnHelpMeetingScreen(navigationRef, requestId)) return;
        stopActiveHelpSessionNotification().catch(() => {});
        const recipientRole = payload?.userRole || payload?.role;
        const copy = buildRequestClosedCopy({
          requestId,
          requestType: payload?.requestType || 'Help request',
          reason: payload?.reason,
          occurredAt: payload?.occurredAt,
          userRole: recipientRole,
        });
        showUpdate(copy.title, copy.message, {
          requestId,
          status: 'closed',
          requestType: payload?.requestType,
          reason: payload?.reason,
          occurredAt: payload?.occurredAt,
          userRole: recipientRole,
          recipientRole,
        });
      });

      socket.on('help:request_taken', (payload) => {
        const requestId = payload?.requestId;
        if (!requestId) return;
        const copy = buildRequestTakenCopy({
          requestType: payload?.requestType || 'Help request',
          volunteerName: payload?.volunteerName || payload?.volunteer?.fullName,
        });
        showAlert(
          copy.title,
          copy.message,
          [
            {
              text: 'OK',
              onPress: closeAlert,
              style: 'primary',
            },
          ],
          'account-cancel',
          '#6B7280'
        );
      });

      socket.on('help:incoming_request', async (payload) => {
        const requestId = payload?.requestId;
        if (!requestId) return;
        const rm = {
          data: {
            type: 'help_request',
            requestId: String(requestId),
            category: payload.category || '',
            categoryName: payload.categoryName || '',
            categoryIcon: payload.categoryIcon || '',
            description: payload.description || '',
            distanceMeters: payload.distanceMeters != null ? String(payload.distanceMeters) : '0',
            area: payload.area || '',
          },
        };
        const now = Date.now();
        if (
          incomingHelpDedupeRef.current?.id === rm.data.requestId &&
          now - incomingHelpDedupeRef.current.t < 3000
        ) {
          return;
        }
        incomingHelpDedupeRef.current = { id: rm.data.requestId, t: now };

        try {
          const auth = await loadAuth();
          if (auth?.accessToken) {
            markRequestDelivered(auth.accessToken, requestId).catch(() => {});
          }
        } catch (e) {}

        if (shouldDelegateIncomingToNativeAndroid()) {
          logIncomingAlert('socket help → native incoming UI (Android background)', { requestId });
          const done = await handleIncomingCallMessage(rm);
          if (done) {
            return;
          }
        }

        try {
          NativeCallService.startHelpRequestRingtone();
        } catch (e) {}

        const auth = await loadAuth().catch(() => null);
        const token = auth?.accessToken || null;
        logIncomingAlert('socket help → in-app modal + tray heads-up', { requestId });
        setIncomingHelpData({
          requestId: rm.data.requestId,
          category: rm.data.category,
          categoryName: rm.data.categoryName,
          categoryIcon: rm.data.categoryIcon,
          requesterName: 'Someone',
          description: rm.data.description,
          distanceMeters: rm.data.distanceMeters ? Number(rm.data.distanceMeters) : 0,
          area: rm.data.area,
          token,
        });
        setIncomingHelpVisible(true);
        void displayAndroidForegroundIncomingHeadsUp('help', rm.data);
      });

      socket.on('call:signal', (payload) => {
        const type = String(payload?.type || '');
        if (type !== 'offer') return;
        const callId = payload?.callId;
        const fromUserId = payload?.fromUserId;
        const offer = payload?.data;
        if (!callId || !fromUserId || !offer) return;
        if (lastOfferCallIdRef.current === String(callId)) return;
        lastOfferCallIdRef.current = String(callId);

        const run = () => {
          if (!navigationRef.isReady()) {
            setTimeout(run, 250);
            return;
          }
          navigationRef.navigate('P2PCall', {
            callId: String(callId),
            otherUserId: String(fromUserId),
            otherUserName: 'Socius User',
            isCaller: false,
            initialOffer: offer,
          });
        };
        run();
      });
    };

    setupSocket();

    return () => {
      mounted = false;
      if (socket) {
        socket.off('help:closure_initiated');
        socket.off('help:request_closed');
        socket.off('help:request_taken');
        socket.off('help:incoming_request');
        socket.off('call:signal');
      }
      appStateSub?.remove?.();
      if (typeof unsubscribeOpened === 'function') {
        unsubscribeOpened();
      }
      if (typeof unsubscribeForeground === 'function') {
        unsubscribeForeground();
      }
      if (typeof unsubscribeNotifeeForeground === 'function') {
        unsubscribeNotifeeForeground();
      }
    };
  }, []);

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <StackNavigator />
      </NavigationContainer>
      {/* Community/Daily Help Notification Modal — remount per requestId so RN Modal animates reliably */}
      <DailyHelpIncomingModal
        key={incomingHelpData?.requestId ? `help-incoming-${incomingHelpData.requestId}` : 'help-incoming-idle'}
        visible={incomingHelpVisible && !!incomingHelpData?.requestId}
        data={incomingHelpData || {}}
        status={incomingHelpStatus}
        onDecline={() => {
          const snapshot = incomingHelpData;
          const requestId = snapshot?.requestId;
          const token = snapshot?.token;
          NativeCallService.stopRingtone();
          setIncomingHelpVisible(false);
          setIncomingHelpData(null);
          setIncomingHelpStatus('notified');
          if (requestId) {
            void (async () => {
              try {
                const auth = token ? { accessToken: token } : await loadAuth();
                const accessToken = auth?.accessToken;
                if (!accessToken) return;
                await declineHelpAsVolunteer(accessToken, requestId);
                if (__DEV__) {
                  console.log('[IncomingHelpModal] declined', { requestId });
                }
              } catch (e) {
                if (__DEV__) {
                  console.log('[IncomingHelpModal] decline failed', {
                    requestId,
                    error: e?.message,
                  });
                }
              }
            })();
          }
        }}
        onView={() => {
          setIncomingHelpStatus('accepted');
          const snapshot = incomingHelpData;
          const requestId = snapshot?.requestId;
          setTimeout(() => {
            setIncomingHelpVisible(false);
            setIncomingHelpData(null);
            setIncomingHelpStatus('notified');
            NativeCallService.stopRingtone();
            if (navigationRef.isReady() && requestId) {
              navigationRef.navigate('SomeoneNeedsHelp', {
                requestId,
                requestType: 'help',
                category: snapshot?.category,
                categoryName: snapshot?.categoryName,
                categoryIcon: snapshot?.categoryIcon,
                description: snapshot?.description,
                distanceMeters: snapshot?.distanceMeters,
                area: snapshot?.area,
              });
            }
          }, 800);
        }}
      />

      {/* Presence alarm — same visual priority as daily-help incoming (incoming-style modal) */}
      <IncomingPresenceAlarmModal
        key={
          incomingPresenceData?.requestId
            ? `presence-incoming-${incomingPresenceData.requestId}`
            : 'presence-incoming-idle'
        }
        visible={incomingPresenceVisible && !!incomingPresenceData?.requestId}
        data={incomingPresenceData || {}}
        status={incomingPresenceStatus}
        onDecline={async () => {
          try {
            NativeCallService.stopRingtone();
            const auth = await loadAuth();
            const token = auth?.accessToken;
            const rid = incomingPresenceData?.requestId;
            if (token && rid) {
              await declinePresenceAsVolunteer(token, rid);
            }
          } catch (e) {
            console.log('[AppNavigator] Failed to decline presence from modal', e);
          }
          setIncomingPresenceVisible(false);
          setIncomingPresenceData(null);
          setIncomingPresenceStatus('notified');
        }}
        onView={() => {
          NativeCallService.stopRingtone();
          const snapshot = incomingPresenceData;
          const rid = snapshot?.requestId;
          if (navigationRef.isReady() && rid) {
            navigationRef.navigate('PresenceRequestDetail', { requestId: rid });
          }
          setIncomingPresenceVisible(false);
          setIncomingPresenceData(null);
          setIncomingPresenceStatus('notified');
        }}
      />
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        onClose={closeAlert}
        dismissDurationMs={alertConfig.dismissDurationMs}
      />
    </>
  );
};

export default AppNavigator;

import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef, CommonActions, DefaultTheme } from '@react-navigation/native';

const SOCIUS_NAVIGATION_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FFFFFF',
    card: '#FFFFFF',
  },
};
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
  displayBorrowItemActionNotification,
  displayOfferItemActionNotification,
  displayAdminBroadcastNotification,
} from '../services/notifications/SociusNotificationService';
import { connectSocket, emitStatusUpdate, appEvents } from '../services/socket/socket.service';
import CustomAlert from '../components/common/CustomAlert';
import DailyHelpIncomingModal from '../features/daily-help/components/modals/DailyHelpIncomingModal';
const GlobalBorrowOfferItemModal = lazy(() => import('../features/daily-help/components/GlobalBorrowOfferItemModal'));
import IncomingPresenceAlarmModal from '../components/notifications/IncomingPresenceAlarmModal';
import {
  loadAuth,
  loadActiveHelpRequestId,
  savePendingBorrowItemOpen,
  loadPendingBorrowItemOpen,
  clearPendingBorrowItemOpen,
  savePendingOfferItemOpen,
  loadPendingOfferItemOpen,
  clearPendingOfferItemOpen,
} from '../services/storage/asyncStorage.service';
import { declinePresenceAsVolunteer } from '../services/api/volunteer.api';
import { markRequestDelivered } from '../services/api/incident.api';
import { getHelpRequestById, respondBorrowItemRequest, respondOfferItemRequest } from '../services/api/dailyHelp.api';
import {
  displayRequestCompletionPrompt,
  handleCompletionPromptNotifeeAction,
} from '../services/notifications/requestCompletionPrompt';
import { stopActiveHelpSessionNotification } from '../services/notifications/activeHelpSessionNotification';
import { refreshActiveHelpSessionNotifications } from '../services/notifications/activeHelpSessionSync';
import { handleChatMessageFcm } from '../services/chat/chatNotificationSync';
import { buildClosureInitiatedCopy, buildRequestClosedCopy, buildRequestAcceptedCopy, buildRequestCancelledCopy, buildNewRequestCopy, buildRequestTakenCopy } from '../utils/closureMessages';
import NativeCallService from '../services/notifications/NativeCallService';
import { getFcmToken } from '../services/firebase/config';
import { updateDeviceToken } from '../services/api/auth.api';
import { getNearbyHelpRequests } from '../services/api/dailyHelp.api';
import {
  navigateToHelpMeeting,
  isUserOnHelpMeetingScreen,
  shouldShowRequestStatusModal,
  normalizeRecipientRole,
  isPresenceChatNotification,
  presenceNearbyMapModeFromChatNotification,
} from './helpNotificationNavigation';
import { shouldIgnoreIncomingPresenceAlarm } from '../utils/presenceIncomingGuard';

const { SociusCallModule } = NativeModules;

export const navigationRef = createNavigationContainerRef();

function navigateFromChatMessageNotification(nav, data) {
  const requestId = data?.requestId;
  if (!nav?.isReady?.() || !requestId) return;
  appEvents.emit('open_chat', { requestId: String(requestId) });
  if (isPresenceChatNotification(data)) {
    nav.navigate('NearbyMap', {
      requestId: String(requestId),
      mode: presenceNearbyMapModeFromChatNotification(data),
    });
    return;
  }
  void navigateToHelpMeeting(nav, { requestId: String(requestId), data, openChat: true });
}

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

const resolveCurrentUserId = (auth) =>
  String(auth?.user?._id || auth?.user?.id || auth?.userId || '').trim();

const shouldIgnoreIncomingHelpAlert = async ({ requestId, data = {}, authOverride = null }) => {
  if (!requestId) return true;

  const auth = authOverride || (await loadAuth().catch(() => null));
  const myUserId = resolveCurrentUserId(auth);
  const payloadRequesterId = String(
    data?.requesterId || data?.requester_id || data?.fromUserId || data?.senderId || ''
  ).trim();
  const recipientRole = String(
    data?.recipientRole || data?.recipient_role || data?.userRole || data?.user_role || ''
  )
    .trim()
    .toLowerCase();

  if (recipientRole === 'requester') return true;
  if (myUserId && payloadRequesterId && myUserId === payloadRequesterId) return true;

  const activeRequesterRequestId = await loadActiveHelpRequestId().catch(() => null);
  if (activeRequesterRequestId && String(activeRequesterRequestId) === String(requestId)) {
    return true;
  }

  return false;
};

const handleNotifeeNavigation = async (navRef, notification, pressAction) => {
  const data = notification?.data || {};
  const earlyType = String(data.type || '').toLowerCase();
  const actionId = String(pressAction?.id || 'default').toLowerCase();

  if (earlyType === 'borrow_item_request' && data.requestId && data.borrowId) {
    if (actionId === 'borrow_accept' || actionId === 'borrow_decline') {
      return;
    }
    if (!navRef.isReady()) {
      await savePendingBorrowItemOpen(data);
      return;
    }
    appEvents.emit('help:borrow_requested_local', data);
    await clearPendingBorrowItemOpen();
    if (notification?.id) {
      try {
        await notifee.cancelNotification(notification.id);
      } catch (err) {
        console.warn('[AppNavigator] Failed to cancel borrow notification', err);
      }
    }
    return;
  }

  if (
    earlyType === 'offer_item_request' &&
    data.requestId &&
    (data.offerId || data.borrowId)
  ) {
    if (actionId === 'offer_accept' || actionId === 'offer_decline') {
      return;
    }
    if (!navRef.isReady()) {
      await savePendingOfferItemOpen(data);
      return;
    }
    appEvents.emit('help:offer_requested_local', data);
    await clearPendingOfferItemOpen();
    if (notification?.id) {
      try {
        await notifee.cancelNotification(notification.id);
      } catch (err) {
        console.warn('[AppNavigator] Failed to cancel offer notification', err);
      }
    }
    return;
  }

  if (!navRef.isReady()) {
    if (
      earlyType === 'presence_alarm' ||
      earlyType.includes('presence_alarm') ||
      earlyType === 'admin_broadcast'
    ) {
      setTimeout(() => {
        void handleNotifeeNavigation(navRef, notification, pressAction);
      }, 600);
    }
    return;
  }
  const nav = navRef;

  if (
    earlyType === 'request_completion_prompt' &&
    data.requestId &&
    (!data.recipientRole || String(data.recipientRole).toLowerCase() === 'requester')
  ) {
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
    navigateFromChatMessageNotification(nav, data);
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
  const typeLower = String(type || '').toLowerCase();

  if (typeLower === 'admin_broadcast') {
    await navigateAdminBroadcastDeepLink(nav, data);
    return;
  }

  if (
    typeLower === 'presence_alarm' ||
    typeLower.includes('presence_alarm') ||
    String(type || '').includes('PRESENCE_ALARM')
  ) {
    if (actionId === 'decline_presence') {
      return;
    }
    const requestId = data.requestId || data.presenceId || data.id;
    const distanceMetersRaw = data.distanceMeters ?? data.distance_meters ?? data.distance;
    const initialDm = distanceMetersRaw ? Number(distanceMetersRaw) : undefined;

    nav.navigate('PresenceRequestDetail', {
      requestId,
      initialDistanceMeters: Number.isFinite(initialDm) && initialDm >= 0 ? initialDm : undefined,
    });
    return;
  }

  const t = typeLower;
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
    if (status === 'matched' || status === 'accepted') {
      await navigateToHelpMeeting(nav, { requestId, data });
      return;
    }
    if (status === 'closing') {
      navigateToActivity(requestId, 'closing');
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

/**
 * Admin FCM / Notifee broadcasts carry `deepLink` in data (see admin NotificationCenter).
 * Resets to a sane stack then opens the matching tab or stack screen.
 * Skips navigation if there is no session yet (avoids blank stack / racing Splash).
 */
const navigateAdminBroadcastDeepLink = async (navRef, data = {}) => {
  if (!navRef?.isReady?.()) return;
  try {
    const auth = await loadAuth();
    if (!auth?.accessToken) return;
  } catch {
    return;
  }

  const link = String(data.deepLink || '').trim().toLowerCase() || 'home';

  const resetToMainTab = (tabName) => {
    navRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'MainApp',
            state: {
              routes: [{ name: tabName }],
            },
          },
        ],
      })
    );
  };

  const pushAfterReset = (screenName, params = {}) => {
    setTimeout(() => {
      try {
        if (navRef.isReady()) {
          navRef.navigate(screenName, params);
        }
      } catch (e) {
        if (__DEV__) console.warn('[AdminDeepLink] navigate failed', screenName, e?.message);
      }
    }, 380);
  };

  switch (link) {
    case 'home':
      resetToMainTab('HomeTab');
      return;
    case 'daily_help':
      resetToMainTab('CommunityTab');
      return;
    case 'need_presence':
      resetToMainTab('CommunityTab');
      pushAfterReset('WhatsHappening');
      return;
    case 'verification':
      resetToMainTab('HomeTab');
      pushAfterReset('VerificationReview');
      return;
    case 'profile':
      resetToMainTab('ProfileTab');
      return;
    default:
      resetToMainTab('HomeTab');
  }
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
  const appStateRef = useRef(AppState.currentState);
  const suppressedHelpAlertIdsRef = useRef(new Set());
  const SUPPRESSED_HELP_ALERTS_KEY = 'SUPPRESSED_HELP_ALERTS';
  const suppressHelpAlert = useCallback(async (requestId) => {
    try {
      if (!requestId) return;
      const id = String(requestId);
      suppressedHelpAlertIdsRef.current.add(id);
      await AsyncStorage.setItem(
        SUPPRESSED_HELP_ALERTS_KEY,
        JSON.stringify(Array.from(suppressedHelpAlertIdsRef.current))
      );
      await AsyncStorage.removeItem('PENDING_HELP_MODAL');
    } catch (e) {}
  }, []);
  const isHelpAlertSuppressed = useCallback((requestId) => {
    if (!requestId) return false;
    return suppressedHelpAlertIdsRef.current.has(String(requestId));
  }, []);
  const persistPendingHelpAlert = useCallback(async (payload) => {
    try {
      if (!payload?.requestId) return;
      await AsyncStorage.setItem(
        'PENDING_HELP_MODAL',
        JSON.stringify({ ...payload, _persistedAt: Date.now() })
      );
    } catch (e) {}
  }, []);
  const clearPendingHelpAlert = useCallback(async (requestId = null) => {
    try {
      const currentId = incomingHelpData?.requestId;
      if (requestId) {
        if (currentId && String(currentId) !== String(requestId)) return;
        if (!currentId) {
          const pendingRaw = await AsyncStorage.getItem('PENDING_HELP_MODAL');
          if (pendingRaw) {
            const pending = JSON.parse(pendingRaw);
            const pendingId = pending?.requestId;
            if (pendingId && String(pendingId) !== String(requestId)) return;
          }
        }
      }
      setIncomingHelpVisible(false);
      setIncomingHelpData(null);
      setIncomingHelpStatus('notified');
      NativeCallService.stopRingtone();
      await AsyncStorage.removeItem('PENDING_HELP_MODAL');
    } catch (e) {}
  }, [incomingHelpData?.requestId]);
  const revivePendingHelpFromNearby = useCallback(async () => {
    try {
      if (incomingHelpData?.requestId && String(incomingHelpStatus || '').toLowerCase() === 'notified') {
        return;
      }
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (!token) return;

      const nearbyRes = await getNearbyHelpRequests(token).catch(() => null);
      const list = Array.isArray(nearbyRes?.data)
        ? nearbyRes.data
        : Array.isArray(nearbyRes)
          ? nearbyRes
          : [];
      if (!list.length) return;

      const candidate = list.find((item) => !isHelpAlertSuppressed(item?._id || item?.id));
      if (!candidate) return;
      const reqId = candidate?._id || candidate?.id;
      if (!reqId) return;

      const payload = {
        requestId: String(reqId),
        category: candidate?.category || '',
        categoryName: candidate?.categoryName || '',
        categoryIcon: candidate?.categoryIcon || '',
        requesterName: candidate?.requesterId?.fullName || candidate?.requesterName || 'Someone',
        description: candidate?.description || '',
        distanceMeters: Number(candidate?.distanceMeters || 0) || 0,
        area: candidate?.location?.address || candidate?.area || '',
        token,
      };

      await persistPendingHelpAlert(payload);
      setIncomingHelpData(payload);
      setIncomingHelpStatus('notified');
      setIncomingHelpVisible(true);
      NativeCallService.startHelpRequestRingtone();
      if (appStateRef.current !== 'active') {
        void displayAndroidForegroundIncomingHeadsUp('help', payload);
      }
    } catch (e) {}
  }, [incomingHelpData?.requestId, incomingHelpStatus, persistPendingHelpAlert, isHelpAlertSuppressed]);
  const ensurePendingIncomingRingtone = useCallback(() => {
    try {
      if (incomingHelpData?.requestId && String(incomingHelpStatus || '').toLowerCase() === 'notified') {
        NativeCallService.startHelpRequestRingtone();
      } else if (incomingPresenceData?.requestId && String(incomingPresenceStatus || '').toLowerCase() === 'notified') {
        NativeCallService.startPresenceAlarmRingtone();
      }
    } catch (e) {}
  }, [incomingHelpData?.requestId, incomingHelpStatus, incomingPresenceData?.requestId, incomingPresenceStatus]);

  // Persistence logic for Modals
  useEffect(() => {
    const persistModals = async () => {
      try {
        const shouldPersistHelpPending =
          !!incomingHelpData?.requestId && String(incomingHelpStatus || '').toLowerCase() === 'notified';
        if (shouldPersistHelpPending) {
          await AsyncStorage.setItem('PENDING_HELP_MODAL', JSON.stringify(incomingHelpData));
        } else {
          await AsyncStorage.removeItem('PENDING_HELP_MODAL');
        }

        const shouldPersistPresencePending =
          !!incomingPresenceData?.requestId && String(incomingPresenceStatus || '').toLowerCase() === 'notified';
        if (shouldPersistPresencePending) {
          await AsyncStorage.setItem('PENDING_PRESENCE_MODAL', JSON.stringify(incomingPresenceData));
        } else {
          await AsyncStorage.removeItem('PENDING_PRESENCE_MODAL');
        }
      } catch (e) {
        console.log('[AppNavigator] Error persisting modal state', e);
      }
    };
    persistModals();
  }, [incomingHelpData, incomingHelpStatus, incomingPresenceData, incomingPresenceStatus]);

  const restorePendingModals = useCallback(async () => {
    try {
      const pendingHelp = await AsyncStorage.getItem('PENDING_HELP_MODAL');
      if (pendingHelp) {
        const parsed = JSON.parse(pendingHelp);
        const requestId = parsed?.requestId;
        let shouldKeep = !!requestId;
        if (requestId) {
          try {
            const auth = await loadAuth();
            const token = auth?.accessToken;
            if (!token) {
              shouldKeep = false;
            } else {
              const res = await getHelpRequestById(token, requestId, { cacheTtlMs: 0 });
              const payload = res?.data || {};
              const req = payload?.request || payload;
              const match = payload?.match || null;
              const reqStatus = String(req?.status || '').toLowerCase();
              const matchStatus = String(match?.status || '').toLowerCase();
              const closedReqStates = ['matched', 'active', 'accepted', 'in_progress', 'arrived', 'cancelled', 'closed', 'auto_closed'];
              const closedMatchStates = ['accepted', 'declined', 'not_available', 'cancelled', 'completed'];
              if (closedReqStates.includes(reqStatus) || closedMatchStates.includes(matchStatus)) {
                shouldKeep = false;
              }
            }
          } catch (e) {
            // Network/temporary failure: keep pending so user does not lose incoming alert.
            shouldKeep = true;
          }
        }
        if (shouldKeep && !isHelpAlertSuppressed(parsed?.requestId)) {
          setIncomingHelpData(parsed);
          setIncomingHelpStatus('notified');
          setIncomingHelpVisible(true);
          ensurePendingIncomingRingtone();
        } else {
          await AsyncStorage.removeItem('PENDING_HELP_MODAL');
        }
      }

      const pendingPresence = await AsyncStorage.getItem('PENDING_PRESENCE_MODAL');
      if (pendingPresence) {
        const parsed = JSON.parse(pendingPresence);
        if (await shouldIgnoreIncomingPresenceAlarm(parsed)) {
          await AsyncStorage.removeItem('PENDING_PRESENCE_MODAL');
        } else {
          setIncomingPresenceData(parsed);
          setIncomingPresenceStatus('notified');
          setIncomingPresenceVisible(true);
          ensurePendingIncomingRingtone();
        }
      }

      const pendingBorrow = await loadPendingBorrowItemOpen();
      if (pendingBorrow?.requestId && pendingBorrow?.borrowId && navigationRef.isReady()) {
        appEvents.emit('help:borrow_requested_local', pendingBorrow);
        await clearPendingBorrowItemOpen();
      }
      const pendingOffer = await loadPendingOfferItemOpen();
      if (
        pendingOffer?.requestId &&
        (pendingOffer?.offerId || pendingOffer?.borrowId) &&
        navigationRef.isReady()
      ) {
        appEvents.emit('help:offer_requested_local', pendingOffer);
        await clearPendingOfferItemOpen();
      }
    } catch (e) {
      console.log('[AppNavigator] Error restoring modal state', e);
    }
  }, [ensurePendingIncomingRingtone]);

  // Restore logic on app launch
  useEffect(() => {
    restorePendingModals();
  }, [restorePendingModals]);

  useEffect(() => {
    const loadSuppressed = async () => {
      try {
        const raw = await AsyncStorage.getItem(SUPPRESSED_HELP_ALERTS_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          suppressedHelpAlertIdsRef.current = new Set(parsed.map((v) => String(v)));
        }
      } catch (e) {}
    };
    loadSuppressed();
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
                // Product decision: "Not available" should silence alerts, but request remains in Nearby Active.
                await suppressHelpAlert(uuid);
                await clearPendingHelpAlert(uuid);
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
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;
      // Only treat true background as "dismiss"; `inactive` (e.g. brief Android focus loss) hides call UI incorrectly.
      if (nextState === 'background') {
        if (incomingHelpData?.requestId && String(incomingHelpStatus || '').toLowerCase() === 'notified') {
          void displayAndroidForegroundIncomingHeadsUp('help', incomingHelpData);
        }
        if (incomingPresenceData?.requestId && String(incomingPresenceStatus || '').toLowerCase() === 'notified') {
          void displayAndroidForegroundIncomingHeadsUp('presence', incomingPresenceData);
        }
        setIncomingHelpVisible(false);
        setIncomingPresenceVisible(false);
        const hasPendingIncoming =
          (incomingHelpData?.requestId && String(incomingHelpStatus || '').toLowerCase() === 'notified') ||
          (incomingPresenceData?.requestId && String(incomingPresenceStatus || '').toLowerCase() === 'notified');
        if (!hasPendingIncoming) {
          NativeCallService.stopRingtone();
        }
      }
      if (
        prevState !== 'active' &&
        nextState === 'active' &&
        incomingHelpData?.requestId &&
        String(incomingHelpStatus || '').toLowerCase() === 'notified'
      ) {
        setIncomingHelpVisible(true);
        ensurePendingIncomingRingtone();
      }
      if (prevState !== 'active' && nextState === 'active') {
        void restorePendingModals();
        void revivePendingHelpFromNearby();
      }
      if (
        prevState !== 'active' &&
        nextState === 'active' &&
        incomingPresenceData?.requestId &&
        String(incomingPresenceStatus || '').toLowerCase() === 'notified'
      ) {
        setIncomingPresenceVisible(true);
        ensurePendingIncomingRingtone();
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
      const run = async () => {
        if (!navigationRef.isReady()) {
          setTimeout(() => {
            void run();
          }, 600);
          return;
        }

        const type = String(data.type || '').toLowerCase();

        if (type === 'admin_broadcast') {
          void navigateAdminBroadcastDeepLink(navigationRef, data);
          return;
        }

        if (type === 'presence_alarm' || type.includes('presence_alarm')) {
          if (await shouldIgnoreIncomingPresenceAlarm(data)) {
            return;
          }
          const requestId = data.requestId || data.presenceId || data.id;
          const distanceMetersRaw = data.distanceMeters ?? data.distance_meters ?? data.distance;
          NativeCallService.startPresenceAlarmRingtone();
          setIncomingPresenceData({
            requestId,
            requesterId: data.requesterId || data.requester_id || '',
            situation: data.description || data.situation || data.situationType || 'Safety concern',
            requesterName: data.requesterName || 'Someone',
            distanceMeters: distanceMetersRaw ? Number(distanceMetersRaw) : 0,
            area: data.area || data.cityArea || data.locationLabel || 'Nearby',
          });
          setIncomingPresenceVisible(true);
          return;
        }

        if (
          type === 'request_completion_prompt' &&
          data.requestId &&
          (!data.recipientRole || String(data.recipientRole).toLowerCase() === 'requester')
        ) {
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
          navigateFromChatMessageNotification(navigationRef, data);
          return;
        }
        if (type === 'borrow_item_request' && data.requestId) {
          appEvents.emit('help:borrow_requested_local', data);
          void displayBorrowItemActionNotification(data);
          return;
        }
        if (
          type === 'offer_item_request' &&
          data.requestId &&
          (data.offerId || data.borrowId)
        ) {
          appEvents.emit('help:offer_requested_local', data);
          void displayOfferItemActionNotification(data);
          return;
        }
        if (type === 'review_decision') {
          navigateAfterReviewDecision(navigationRef, data.approved);
          return;
        }

        if ((type.includes('help_request') || type === 'help_request_alert') && data.requestId) {
          loadAuth()
            .then((auth) => {
              return shouldIgnoreIncomingHelpAlert({
                requestId: data.requestId,
                data,
                authOverride: auth,
              }).then((ignore) => ({ auth, ignore }));
            })
            .then(({ auth, ignore }) => {
              if (ignore) return;
              if (isHelpAlertSuppressed(data.requestId)) return;
              const token = auth?.accessToken || null;
              void ackHelpNotificationDelivered(data.requestId, token);
              NativeCallService.startHelpRequestRingtone();
              const pendingPayload = {
                requestId: data.requestId,
                category: data.category,
                categoryName: data.categoryName,
                categoryIcon: data.categoryIcon,
                requesterName: data.requesterName || 'Someone',
                description: data.description,
                distanceMeters: data.distanceMeters ? Number(data.distanceMeters) : 0,
                area: data.area,
                token,
              };
              void persistPendingHelpAlert(pendingPayload);
              setIncomingHelpData(pendingPayload);
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
          if (['matched', 'accepted', 'taken', 'already_accepted', 'cancelled', 'closed', 'auto_closed'].includes(status)) {
            void clearPendingHelpAlert(rid);
          }
          if (status === 'matched' || status === 'accepted') {
            void navigateToHelpMeeting(navigationRef, { requestId: rid, data });
            return;
          }
          if (status === 'closing') {
            navigateToActivity(rid, 'closing');
            return;
          }
          if (status === 'closed') {
            navigateToActivity(rid, status);
          }
        }
      };

      void run();
    });

    const unsubscribeForeground = onMessageForeground(async remoteMessage => {
      console.log('[AppNavigator] foreground message received:', JSON.stringify(remoteMessage?.data || {}));

      const data = remoteMessage?.data || {};
      const lowerType = String(data.type || '').toLowerCase();
      if (lowerType === 'cancel_alarm' && data.requestId) {
        await clearPendingHelpAlert(data.requestId);
        return;
      }
      if (lowerType === 'review_decision') {
        showReviewDecisionAlert(data);
        return;
      }
      if (lowerType === 'admin_broadcast') {
        if (Platform.OS === 'android') {
          await initNotifeeChannels();
          await displayAdminBroadcastNotification(remoteMessage);
        }
        return;
      }
      if (lowerType === 'borrow_item_request' && data.requestId && data.borrowId) {
        appEvents.emit('help:borrow_requested_local', data);
        if (Platform.OS === 'android') {
          await displayBorrowItemActionNotification(data);
        }
        return;
      }
      if (
        lowerType === 'offer_item_request' &&
        data.requestId &&
        (data.offerId || data.borrowId)
      ) {
        appEvents.emit('help:offer_requested_local', data);
        if (Platform.OS === 'android') {
          await displayOfferItemActionNotification(data);
        }
        return;
      }
      if (
        lowerType === 'request_completion_prompt' &&
        data.requestId &&
        (!data.recipientRole || String(data.recipientRole).toLowerCase() === 'requester')
      ) {
        await displayRequestCompletionPrompt(data);
        void refreshActiveHelpSessionNotifications();
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
        void refreshActiveHelpSessionNotifications();
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
        if (await shouldIgnoreIncomingPresenceAlarm(data)) {
          logIncomingAlert('FCM presence → skipped (device is requester)', { requestId: data.requestId });
          return;
        }
        try {
          NativeCallService.startPresenceAlarmRingtone();
        } catch (e) {}

        const requestId = data.requestId || data.presenceId || data.id;
        const distanceMetersRaw = data.distanceMeters ?? data.distance_meters ?? data.distance;
        setIncomingPresenceData({
          requestId,
          requesterId: data.requesterId || data.requester_id || '',
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
        if (
          await shouldIgnoreIncomingHelpAlert({
            requestId: data.requestId,
            data,
            authOverride: auth,
          })
        ) {
          return;
        }
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

      if (
        dataType === 'request_status' ||
        lowerType === 'help_session_extended_helper' ||
        lowerType === 'help_session_time_ended_helper'
      ) {
        void refreshActiveHelpSessionNotifications();
      }
      
      if (dataType === 'request_status') {
        if (data.requestId) {
          const closedStates = ['matched', 'accepted', 'taken', 'already_accepted', 'cancelled', 'closed', 'auto_closed'];
          if (closedStates.includes(status)) {
            await clearPendingHelpAlert(data.requestId);
          }
        }
        if (['cancelled', 'closed', 'closing', 'auto_closed'].includes(status)) {
          if (data.requestId) {
            stopActiveHelpSessionNotification(String(data.requestId)).catch(() => {});
          } else {
            stopActiveHelpSessionNotification().catch(() => {});
          }
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
          const recipientForCopy =
            normalizeRecipientRole(data.recipientRole) ||
            (String(data.initiatedBy || '') === 'helper'
              ? 'requester'
              : String(data.initiatedBy || '') === 'requester'
                ? 'helper'
                : '');
          const copy = buildClosureInitiatedCopy({
            requestId: rid,
            requestType: data.requestType || 'Help request',
            initiatedBy: data.initiatedBy,
            occurredAt: data.occurredAt,
            recipientRole: recipientForCopy,
          });
          showAlert(
            copy.title,
            copy.message,
            [
              {
                text: 'My activity',
                onPress: () => {
                  closeAlert();
                  navigateToActivity(rid, 'closing');
                },
                style: 'primary',
              },
              { text: 'OK', onPress: closeAlert },
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
          const roleForCopy =
            normalizeRecipientRole(data.recipientRole || data.userRole || data.role) ||
            data.recipientRole ||
            data.userRole ||
            data.role;
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
                text: 'My activity',
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
        if (lt === 'admin_broadcast') {
          void navigateAdminBroadcastDeepLink(navigationRef, data);
          return;
        }
        if (
          lt === 'request_completion_prompt' &&
          data.requestId &&
          (!data.recipientRole || String(data.recipientRole).toLowerCase() === 'requester')
        ) {
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
          navigateFromChatMessageNotification(navigationRef, data);
          return;
        }
        if (lt === 'review_decision') {
          navigateAfterReviewDecision(navigationRef, data.approved);
          return;
        }

        if (lt === 'borrow_item_request' && data.requestId && data.borrowId) {
          appEvents.emit('help:borrow_requested_local', data);
          void displayBorrowItemActionNotification(data);
          return;
        }
        if (
          lt === 'offer_item_request' &&
          data.requestId &&
          (data.offerId || data.borrowId)
        ) {
          appEvents.emit('help:offer_requested_local', data);
          void displayOfferItemActionNotification(data);
          return;
        }

        if ((lt.includes('help_request') || lt.includes('request_rematched')) && data.requestId) {
          loadAuth()
            .then((auth) => {
              return shouldIgnoreIncomingHelpAlert({
                requestId: data.requestId,
                data,
                authOverride: auth,
              }).then((ignore) => ({ auth, ignore }));
            })
            .then(({ auth, ignore }) => {
              if (ignore) return;
              if (isHelpAlertSuppressed(data.requestId)) return;
              const token = auth?.accessToken || null;
              void ackHelpNotificationDelivered(data.requestId, token);
              NativeCallService.startHelpRequestRingtone();
              const pendingPayload = {
                requestId: data.requestId,
                category: data.category,
                categoryName: data.categoryName,
                categoryIcon: data.categoryIcon,
                description: data.description,
                distanceMeters: data.distanceMeters ? Number(data.distanceMeters) : 0,
                area: data.area,
                token,
              };
              void persistPendingHelpAlert(pendingPayload);
              setIncomingHelpData(pendingPayload);
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
          if (['matched', 'accepted', 'taken', 'already_accepted', 'cancelled', 'closed', 'auto_closed'].includes(status)) {
            void clearPendingHelpAlert(rid);
          }
          if (status === 'matched' || status === 'accepted') {
            void navigateToHelpMeeting(navigationRef, { requestId: rid, data });
          } else if (status === 'closing') {
            navigateToActivity(rid, 'closing');
          } else if (status === 'cancelled' || status === 'closed') {
            navigateToActivity(rid, status);
          }
        }
      };

      run();
    });

    const unsubscribeNotifeeForeground = notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.DISMISSED && detail?.notification?.id) {
        const nid = String(detail.notification.id);
        if (nid === 'socius_active_help_session' || nid.startsWith('socius_active_help_session_')) {
          void refreshActiveHelpSessionNotifications();
        }
        return;
      }

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
          await suppressHelpAlert(notifData.requestId);
          await clearPendingHelpAlert(notifData.requestId);
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
      if (
        actionId === 'borrow_view' &&
        notifData?.requestId &&
        notifData?.borrowId &&
        String(notifData.type || '').toLowerCase() === 'borrow_item_request'
      ) {
        appEvents.emit('help:borrow_requested_local', notifData);
        if (navigationRef.isReady()) {
          await clearPendingBorrowItemOpen();
        } else {
          await savePendingBorrowItemOpen(notifData);
        }
        if (notification?.id) await notifee.cancelNotification(notification.id);
        return;
      }
      if ((actionId === 'borrow_accept' || actionId === 'borrow_decline') && notifData?.requestId && notifData?.borrowId) {
        try {
          await clearPendingBorrowItemOpen();
          const auth = await loadAuth();
          if (auth?.accessToken) {
            await respondBorrowItemRequest(
              auth.accessToken,
              String(notifData.requestId),
              String(notifData.borrowId),
              actionId === 'borrow_accept' ? 'accept' : 'decline'
            );
          }
          appEvents.emit('help:borrow_offer_items_changed', { requestId: String(notifData.requestId) });
          if (notification?.id) await notifee.cancelNotification(notification.id);
        } catch (e) {
          console.log('[Notifee] borrow action failed', e);
        }
        return;
      }
      const offerOid = String(notifData?.offerId || notifData?.borrowId || '');
      if (
        actionId === 'offer_view' &&
        notifData?.requestId &&
        offerOid &&
        String(notifData.type || '').toLowerCase() === 'offer_item_request'
      ) {
        appEvents.emit('help:offer_requested_local', { ...notifData, offerId: offerOid, borrowId: offerOid });
        if (navigationRef.isReady()) {
          await clearPendingOfferItemOpen();
        } else {
          await savePendingOfferItemOpen(notifData);
        }
        if (notification?.id) await notifee.cancelNotification(notification.id);
        return;
      }
      if (
        (actionId === 'offer_accept' || actionId === 'offer_decline') &&
        notifData?.requestId &&
        offerOid &&
        String(notifData.type || '').toLowerCase() === 'offer_item_request'
      ) {
        try {
          await clearPendingOfferItemOpen();
          const auth = await loadAuth();
          if (auth?.accessToken) {
            await respondOfferItemRequest(
              auth.accessToken,
              String(notifData.requestId),
              offerOid,
              actionId === 'offer_accept' ? 'accept' : 'decline'
            );
          }
          appEvents.emit('help:borrow_offer_items_changed', { requestId: String(notifData.requestId) });
          if (notification?.id) await notifee.cancelNotification(notification.id);
        } catch (e) {
          console.log('[Notifee] offer action failed', e);
        }
        return;
      }
      await handleNotifeeNavigation(navigationRef, notification, pressAction);
    });

    const flushPendingBorrowOpen = async () => {
      const run = async () => {
        const pending = await loadPendingBorrowItemOpen();
        if (!pending?.requestId || !pending?.borrowId) return true;
        if (!navigationRef.isReady()) return false;
        appEvents.emit('help:borrow_requested_local', pending);
        await clearPendingBorrowItemOpen();
        return true;
      };
      if (await run()) return;
      setTimeout(run, 400);
      setTimeout(run, 1600);
    };

    const flushPendingOfferOpen = async () => {
      const run = async () => {
        const pending = await loadPendingOfferItemOpen();
        const oid = pending?.offerId || pending?.borrowId;
        if (!pending?.requestId || !oid) return true;
        if (!navigationRef.isReady()) return false;
        appEvents.emit('help:offer_requested_local', { ...pending, offerId: String(oid), borrowId: String(oid) });
        await clearPendingOfferItemOpen();
        return true;
      };
      if (await run()) return;
      setTimeout(run, 400);
      setTimeout(run, 1600);
    };

    void (async () => {
      try {
        const initialNotification = await notifee.getInitialNotification();
        if (initialNotification) {
          const { notification, pressAction } = initialNotification;
          await handleNotifeeNavigation(
            navigationRef,
            notification,
            pressAction || { id: 'default' }
          );
        }
      } catch (_) {}
      await flushPendingBorrowOpen();
      await flushPendingOfferOpen();
    })();

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
          const role = normalizeRecipientRole(recipientRole || userRole);
          const copyClosing = buildClosureInitiatedCopy({
            requestId,
            requestType,
            initiatedBy,
            occurredAt,
            recipientRole: role,
          });
          showAlert(
            copyClosing.title,
            copyClosing.message,
            [
              {
                text: 'My activity',
                onPress: () => {
                  closeAlert();
                  navigateToActivity(requestId, 'closing');
                },
                style: 'primary',
              },
              { text: 'OK', onPress: closeAlert },
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
          const roleClosed =
            normalizeRecipientRole(recipientRole || userRole) || recipientRole || userRole;
          const copy = buildRequestClosedCopy({
            requestId,
            requestType,
            reason,
            occurredAt,
            userRole: roleClosed,
          });
          showAlert(
            copy.title,
            copy.message,
            [
              {
                text: 'My activity',
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
        let trayTitle = title;
        let trayBody = message;
        const st = String(status || '').toLowerCase();
        if (st === 'closing') {
          const role = normalizeRecipientRole(recipientRole || userRole);
          const c = buildClosureInitiatedCopy({
            requestId,
            requestType,
            initiatedBy,
            occurredAt,
            recipientRole: role,
          });
          trayTitle = c.title;
          trayBody = c.message;
        }
        if (st === 'closed') {
          const roleTray =
            normalizeRecipientRole(recipientRole || userRole) || recipientRole || userRole;
          const c = buildRequestClosedCopy({
            requestId,
            requestType,
            reason,
            occurredAt,
            userRole: roleTray,
          });
          trayTitle = c.title;
          trayBody = c.message;
        }
        await displayUpdateNotification({
          title: trayTitle,
          body: trayBody,
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
        stopActiveHelpSessionNotification(String(requestId)).catch(() => {});
        const recipientRole =
          payload?.initiatedBy === 'requester' ? 'helper' : payload?.initiatedBy === 'helper' ? 'requester' : '';
        const copy = buildClosureInitiatedCopy({
          requestId,
          requestType: payload?.requestType || 'Help request',
          initiatedBy: payload?.initiatedBy,
          occurredAt: payload?.occurredAt,
          recipientRole,
        });
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
        void clearPendingHelpAlert(requestId);
        if (isUserOnHelpMeetingScreen(navigationRef, requestId)) return;
        stopActiveHelpSessionNotification(String(requestId)).catch(() => {});
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
        void clearPendingHelpAlert(requestId);
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
        const auth = await loadAuth().catch(() => null);
        if (
          await shouldIgnoreIncomingHelpAlert({
            requestId,
            data: payload || {},
            authOverride: auth,
          })
        ) {
          return;
        }
        if (isHelpAlertSuppressed(requestId)) {
          return;
        }
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

        const token = auth?.accessToken || null;
        logIncomingAlert('socket help → in-app modal + tray heads-up', { requestId });
        const pendingPayload = {
          requestId: rm.data.requestId,
          category: rm.data.category,
          categoryName: rm.data.categoryName,
          categoryIcon: rm.data.categoryIcon,
          requesterName: 'Someone',
          description: rm.data.description,
          distanceMeters: rm.data.distanceMeters ? Number(rm.data.distanceMeters) : 0,
          area: rm.data.area,
          token,
        };
        void persistPendingHelpAlert(pendingPayload);
        setIncomingHelpData(pendingPayload);
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
  }, [incomingHelpData, incomingHelpStatus, incomingPresenceData, incomingPresenceStatus, clearPendingHelpAlert, ensurePendingIncomingRingtone, restorePendingModals, revivePendingHelpFromNearby]);

  // Fail-safe: if push/socket is missed, recover pending incoming from nearby list.
  useEffect(() => {
    let intervalId = null;
    const run = async () => {
      if (appStateRef.current !== 'active') return;
      await revivePendingHelpFromNearby();
    };
    run();
    intervalId = setInterval(run, 12000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [revivePendingHelpFromNearby]);

  return (
    <>
      <NavigationContainer ref={navigationRef} theme={SOCIUS_NAVIGATION_THEME}>
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
          if (requestId) {
            void suppressHelpAlert(requestId);
          }
          NativeCallService.stopRingtone();
          setIncomingHelpVisible(false);
          setIncomingHelpData(null);
          setIncomingHelpStatus('notified');
        }}
        onView={() => {
          setIncomingHelpStatus('accepted');
          const snapshot = incomingHelpData;
          const requestId = snapshot?.requestId;
          if (requestId) {
            void suppressHelpAlert(requestId);
          }
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

      <Suspense fallback={null}>
        <GlobalBorrowOfferItemModal />
      </Suspense>

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
          const run = async () => {
            if (rid && (await shouldIgnoreIncomingPresenceAlarm({ ...snapshot, requestId: rid }))) {
              setIncomingPresenceVisible(false);
              setIncomingPresenceData(null);
              setIncomingPresenceStatus('notified');
              return;
            }
            if (navigationRef.isReady() && rid) {
              const d0 = snapshot?.distanceMeters;
              const initialDm =
                typeof d0 === 'number' && Number.isFinite(d0) && d0 >= 0 ? d0 : undefined;
              navigationRef.navigate('PresenceRequestDetail', {
                requestId: rid,
                initialDistanceMeters: initialDm,
              });
            }
            setIncomingPresenceVisible(false);
            setIncomingPresenceData(null);
            setIncomingPresenceStatus('notified');
          };
          void run();
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

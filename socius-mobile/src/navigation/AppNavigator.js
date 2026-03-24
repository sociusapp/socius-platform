import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import notifee, { AndroidStyle, EventType } from '@notifee/react-native';
import { AppState, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StackNavigator from './StackNavigator';
import { onNotificationOpened, getInitialNotification, onMessageForeground } from '../services/firebase/messaging';
import { CHANNELS, handleIncomingCallMessage, initNotifeeChannels } from '../services/notifications/SociusNotificationService';
import { connectSocket, emitStatusUpdate } from '../services/socket/socket.service';
import CustomAlert from '../components/common/CustomAlert';
import DailyHelpIncomingModal from '../components/DailyHelp/modals/DailyHelpIncomingModal';
import NeedPresenceIncomingModal from '../components/NeedPresence/modals/NeedPresenceIncomingModal';
import IncomingPresenceAlarmModal from '../components/notifications/IncomingPresenceAlarmModal';
import { loadAuth } from '../services/storage/asyncStorage.service';
import { declineHelpAsVolunteer, declinePresenceAsVolunteer } from '../services/api/volunteer.api';
import { getMyActiveHelpRequest } from '../services/api/incident.api';
import { buildClosureInitiatedCopy, buildRequestClosedCopy } from '../utils/closureMessages';
import NativeCallService from '../services/notifications/NativeCallService';
import { getFcmToken } from '../services/firebase/config';
import { updateDeviceToken } from '../services/api/auth.api';

const { SociusCallModule } = NativeModules;

export const navigationRef = createNavigationContainerRef();

const handleNotifeeNavigation = async (navRef, notification, pressAction) => {
  if (!navRef.isReady()) return;
  const nav = navRef;

  // Dismiss the notification when the user interacts with it
  if (notification.id) {
    try {
      await notifee.cancelNotification(notification.id);
    } catch (err) {
      console.warn('[AppNavigator] Failed to cancel notification', err);
    }
  }

  const data = notification.data || {};
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

  if (type === 'HELP_REQUEST') {
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
  }

  if (type === 'request_status') {
    const status = String(data.status || '').toLowerCase();
    const requestId = data.requestId;
    if (status === 'matched' && requestId) {
      nav.navigate('RequesterMatchingMap', { requestId });
    } else if ((status === 'closing' || status === 'closed') && requestId) {
      nav.navigate('RequesterMatchingMap', { requestId });
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

const openRequesterMeeting = async (requestId) => {
  if (!navigationRef.isReady()) return;
  if (requestId) {
    navigationRef.navigate('RequesterMatchingMap', { requestId });
    return;
  }
  try {
    const auth = await loadAuth();
    const token = auth?.accessToken;
    if (!token) return;
    const res = await getMyActiveHelpRequest(token);
    const activeId =
      res?.data?.activeRequest?._id ||
      res?.data?.activeRequest?.id ||
      res?.activeRequest?._id ||
      res?.activeRequest?.id;
    if (activeId) {
      navigationRef.navigate('RequesterMatchingMap', { requestId: activeId });
    }
  } catch (e) {}
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

  const [incomingHelpVisible, setIncomingHelpVisible] = useState(false);
  const [incomingHelpData, setIncomingHelpData] = useState(null);
  const [incomingHelpStatus, setIncomingHelpStatus] = useState('notified');
  const [incomingPresenceVisible, setIncomingPresenceVisible] = useState(false);
  const [incomingPresenceData, setIncomingPresenceData] = useState(null);
  const [incomingPresenceStatus, setIncomingPresenceStatus] = useState('notified');

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
      if (nextState !== 'active') {
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

        if ((type.includes('help_request') || type === 'help_request_alert') && data.requestId) {
          loadAuth()
            .then((auth) => {
              const token = auth?.accessToken || null;
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
          if (status === 'matched') {
            openRequesterMeeting(data.requestId);
            return;
          }
          if (status === 'closing') {
            openRequesterMeeting(data.requestId);
            return;
          }
          if (status === 'closed') {
            navigateToActivity(data.requestId, status);
          }
        }
      };

      run();
    });

    const unsubscribeForeground = onMessageForeground(async remoteMessage => {
      console.log('[AppNavigator] foreground message', remoteMessage?.data || remoteMessage);

      const data = remoteMessage?.data || {};
      const upperType = String(data.type || '').toUpperCase();

      const isPresenceAlarm = upperType === 'PRESENCE_ALARM' || upperType.includes('PRESENCE_ALARM');
      const isHelpRequest =
        upperType.includes('HELP_REQUEST') ||
        upperType === 'HELP_REQUEST_ALERT' ||
        upperType.includes('HELP_REQUEST_ALERT');

      if (Platform.OS === 'android' && isPresenceAlarm) {
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
        return;
      }

      if (Platform.OS === 'android' && isHelpRequest) {
        const auth = await loadAuth().catch(() => null);
        const token = auth?.accessToken || null;

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
        return;
      }

      const handledByCallKeep = await handleIncomingCallMessage(remoteMessage);
      if (handledByCallKeep) {
        return;
      }

      const dataType = String(data.type || '').toLowerCase();
      const status = String(data.status || '').toLowerCase();
      if (dataType === 'request_status') {
        if (status === 'matched') {
          showAlert(
            'Match found',
            'A volunteer accepted your request.',
            [
              {
                text: 'Open',
                onPress: () => {
                  closeAlert();
                  openRequesterMeeting(data.requestId);
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
        if (status === 'closing') {
          const copy = buildClosureInitiatedCopy({
            requestId: data.requestId,
            requestType: data.requestType || 'Help request',
            initiatedBy: data.initiatedBy,
            occurredAt: data.occurredAt,
          });
          showAlert(
            copy.title,
            copy.message,
            [
              {
                text: 'Open',
                onPress: () => {
                  closeAlert();
                  openRequesterMeeting(data.requestId);
                },
                style: 'primary',
              },
              { text: 'Later', onPress: closeAlert },
            ],
            'alert-circle-outline',
            '#DC5C69'
          );
          return;
        }
        if (status === 'closed') {
          const copy = buildRequestClosedCopy({
            requestId: data.requestId,
            requestType: data.requestType || 'Help request',
            reason: data.reason,
            occurredAt: data.occurredAt,
          });
          showAlert(
            copy.title,
            copy.message,
            [
              {
                text: 'Open activity',
                onPress: () => {
                  closeAlert();
                  navigateToActivity(data.requestId, 'closed');
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

      if (data.type === 'REVIEW_DECISION') {
        showAlert(
          remoteMessage?.notification?.title || 'Notification',
          remoteMessage?.notification?.body || '',
          [{
            text: 'OK',
            onPress: () => {
              closeAlert();
              if (navigationRef.isReady()) {
                // Use reset to force refresh of the verification state in BottomTabNavigator
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
          }],
          'check-circle',
          '#28C76F'
        );
      } else if (remoteMessage?.notification?.body) {
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
              const t0 = Date.now();
              const requestId = data.requestId;
              if (navigationRef.isReady()) {
                if (requestId) {
                  navigationRef.navigate('RequesterMatchingMap', { requestId, perf: { t0, source: 'matched_alert_ok' } });
                } else {
                  openRequesterMeeting();
                }
              }
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

        if (String(data.type || '').toLowerCase().includes('help_request') && data.requestId) {
          loadAuth()
            .then((auth) => {
              const token = auth?.accessToken || null;
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
          if (status === 'matched') {
            openRequesterMeeting(data.requestId);
          } else if (status === 'closing') {
            openRequesterMeeting(data.requestId);
          } else if (status === 'closed') {
            navigateToActivity(data.requestId, status);
          }
        }
      };

      run();
    });

    const unsubscribeNotifeeForeground = notifee.onForegroundEvent(({ type, detail }) => {
      if (type !== EventType.ACTION_PRESS && type !== EventType.PRESS) {
        return;
      }

      const { notification, pressAction } = detail;
      handleNotifeeNavigation(navigationRef, notification, pressAction);
    });

    notifee.getInitialNotification().then(initialNotification => {
      if (!initialNotification) return;
      const { notification, pressAction } = initialNotification;
      handleNotifeeNavigation(navigationRef, notification, pressAction);
    });

    let socket;
    let mounted = true;

    const showUpdate = async (title, message, { requestId, status, requestType, reason, occurredAt, initiatedBy }) => {
      const isActive = appStateRef.current === 'active';
      if (isActive) {
        if (String(status).toLowerCase() === 'matched') {
          showAlert(
            'Match found',
            'A volunteer accepted your request.',
            [
              {
                text: 'Open',
                onPress: () => {
                  closeAlert();
                  openRequesterMeeting(requestId);
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
        if (String(status).toLowerCase() === 'closing') {
          showAlert(
            title,
            message,
            [
              {
                text: 'Open',
                onPress: () => {
                  closeAlert();
                  openRequesterMeeting(requestId);
                },
                style: 'primary',
              },
              { text: 'Later', onPress: closeAlert },
            ],
            'alert-circle-outline',
            '#DC5C69'
          );
          return;
        }
        if (String(status).toLowerCase() === 'closed') {
          showAlert(
            title,
            message,
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
        const copy = buildClosureInitiatedCopy({
          requestId,
          requestType: payload?.requestType || 'Help request',
          initiatedBy: payload?.initiatedBy,
          occurredAt: payload?.occurredAt,
        });
        showUpdate(
          copy.title,
          copy.message,
          { requestId, status: 'closing', requestType: payload?.requestType, initiatedBy: payload?.initiatedBy, occurredAt: payload?.occurredAt }
        );
      });

      socket.on('help:request_closed', (payload) => {
        const requestId = payload?.requestId;
        if (!requestId) return;
        const copy = buildRequestClosedCopy({
          requestId,
          requestType: payload?.requestType || 'Help request',
          reason: payload?.reason,
          occurredAt: payload?.occurredAt,
        });
        showUpdate(
          copy.title,
          copy.message,
          { requestId, status: 'closed', requestType: payload?.requestType, reason: payload?.reason, occurredAt: payload?.occurredAt }
        );
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
      {/* Community/Daily Help Notification Modal */}
      <DailyHelpIncomingModal
        visible={incomingHelpVisible}
        data={incomingHelpData}
        status={incomingHelpStatus}
        onDecline={() => {
          setIncomingHelpVisible(false);
          NativeCallService.stopRingtone();
        }}
        onView={() => {
          setIncomingHelpStatus('accepted');
          const requestId = incomingHelpData?.requestId;
          setTimeout(() => {
            setIncomingHelpVisible(false);
            setIncomingHelpStatus('notified');
            NativeCallService.stopRingtone();
            if (navigationRef.isReady() && requestId) {
              navigationRef.navigate('SomeoneNeedsHelp', {
                requestId,
                requestType: 'help',
                category: incomingHelpData.category,
                categoryName: incomingHelpData.categoryName,
                categoryIcon: incomingHelpData.categoryIcon,
                description: incomingHelpData.description,
                distanceMeters: incomingHelpData.distanceMeters,
                area: incomingHelpData.area,
              });
            }
          }, 800);
        }}
      />

      {/* Need Presence Notification Modal */}
      <NeedPresenceIncomingModal
        visible={incomingPresenceVisible}
        data={incomingPresenceData}
        onDecline={async () => {
          try {
            NativeCallService.stopRingtone();
            const auth = await loadAuth();
            const token = auth?.accessToken;
            if (token && incomingPresenceData?.requestId) {
              await declinePresenceAsVolunteer(token, incomingPresenceData.requestId);
            }
          } catch (e) {
            console.log('[AppNavigator] Failed to decline presence from modal', e);
          }
          setIncomingPresenceVisible(false);
          setIncomingPresenceData(null);
        }}
        onView={() => {
          NativeCallService.stopRingtone();
          if (navigationRef.isReady() && incomingPresenceData?.requestId) {
            navigationRef.navigate('PresenceRequestDetail', { requestId: incomingPresenceData.requestId });
          }
          setIncomingPresenceVisible(false);
          setIncomingPresenceData(null);
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

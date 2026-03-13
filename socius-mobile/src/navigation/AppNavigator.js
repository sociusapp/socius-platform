import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import notifee, { EventType } from '@notifee/react-native';
import { AppState, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import StackNavigator from './StackNavigator';
import { onNotificationOpened, getInitialNotification, onMessageForeground } from '../services/firebase/messaging';
import { CHANNELS, handleIncomingCallMessage } from '../services/notifications/SociusNotificationService';
import { connectSocket } from '../services/socket/socket.service';
import CustomAlert from '../components/common/CustomAlert';
import { loadAuth } from '../services/storage/asyncStorage.service';
import { declineHelpAsVolunteer } from '../services/api/volunteer.api';
import { getMyActiveHelpRequest } from '../services/api/incident.api';
import { buildClosureInitiatedCopy, buildRequestClosedCopy } from '../utils/closureMessages';

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
    nav.navigate('NearbyMap', {
      situation: data.situation,
      distanceMeters: data.distanceMeters ? Number(data.distanceMeters) : 0,
      area: data.area,
    });
    return;
  }

  if (type === 'HELP_REQUEST') {
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
              await declineHelpAsVolunteer(token, uuid);
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
    });

    const displayUpdateNotification = async ({ title, body, data }) => {
      if (Platform.OS !== 'android') return;
      try {
        await notifee.displayNotification({
          title,
          body,
          android: {
            channelId: CHANNELS.UPDATES,
            pressAction: { id: 'default' },
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

      const handledByCallKeep = await handleIncomingCallMessage(remoteMessage);
      if (handledByCallKeep) {
        return;
      }

      const notification = remoteMessage?.notification || {};
      const data = remoteMessage?.data || {};
      const title = notification.title || '';
      const body = notification.body || '';

      const dataType = String(data.type || '').toLowerCase();
      const status = String(data.status || '').toLowerCase();
      if (dataType === 'request_status') {
        if (status === 'matched') {
          await displayUpdateNotification({
            title: title || 'Match found',
            body: body || 'A volunteer has accepted your request. Tap to open the meeting screen.',
            data: { ...data, type: 'request_status', status: 'matched' },
          });
          return;
        }
        if (status === 'closing') {
          const copy = buildClosureInitiatedCopy({
            requestId: data.requestId,
            requestType: data.requestType || 'Help request',
            initiatedBy: data.initiatedBy,
            occurredAt: data.occurredAt,
          });
          await displayUpdateNotification({
            title: title || copy.title,
            body: body || copy.message,
            data: { ...data, type: 'request_status', status: 'closing' },
          });
          return;
        }
        if (status === 'closed') {
          const copy = buildRequestClosedCopy({
            requestId: data.requestId,
            requestType: data.requestType || 'Help request',
            reason: data.reason,
            occurredAt: data.occurredAt,
          });
          await displayUpdateNotification({
            title: title || copy.title,
            body: body || copy.message,
            data: { ...data, type: 'request_status', status: 'closed' },
          });
          return;
        }
      }

      if (data.type === 'REVIEW_DECISION') {
        showAlert(
          title || 'Notification',
          body || '',
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
      } else if (body) {
        // Customize alert based on content
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
    };

    setupSocket();

    return () => {
      mounted = false;
      if (socket) {
        socket.off('help:closure_initiated');
        socket.off('help:request_closed');
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

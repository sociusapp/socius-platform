import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import notifee, { EventType } from '@notifee/react-native';
import { NativeEventEmitter, NativeModules } from 'react-native';
import StackNavigator from './StackNavigator';
import { onNotificationOpened, getInitialNotification, onMessageForeground } from '../services/firebase/messaging';
import { handleIncomingCallMessage } from '../services/notifications/SociusNotificationService';
import CustomAlert from '../components/common/CustomAlert';

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
};

const AppNavigator = () => {
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: 'bell-ring',
    iconColor: '#DC5C69'
  });

  const showAlert = (title, message, buttons = [], icon = 'bell-ring', iconColor = '#DC5C69') => {
    setAlertConfig({
      title,
      message,
      buttons,
      icon,
      iconColor
    });
    setAlertVisible(true);
  };

  const closeAlert = () => {
    setAlertVisible(false);
  };

  useEffect(() => {
    if (SociusCallModule) {
      const eventEmitter = new NativeEventEmitter(SociusCallModule);

      const handleCallAction = (event) => {
        const { action, uuid, payload } = event;
        console.log('[AppNavigator] Call Action:', action, uuid);

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
    const unsubscribeOpened = onNotificationOpened((remoteMessage) => {
      const data = remoteMessage?.data || {};
      if (!navigationRef.isReady()) {
        return;
      }

      if (data.type === 'HELP_REQUEST_ALERT' && data.requestId) {
        navigationRef.navigate('LocalRequest', { requestId: data.requestId });
      }
    });

    const unsubscribeForeground = onMessageForeground(async remoteMessage => {
      console.log('[AppNavigator] foreground message', remoteMessage?.data || remoteMessage);

      const handledByCallKeep = await handleIncomingCallMessage(remoteMessage);
      if (handledByCallKeep) {
        return;
      }

      const notification = remoteMessage?.notification || {};
      const data = remoteMessage?.data || {};
      const title = notification.title || 'Notification';
      const body = notification.body || '';

      if (data.type === 'REVIEW_DECISION') {
        showAlert(
          title,
          body,
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

        if (title.includes('Someone is coming') || (data.type === 'REQUEST_STATUS' && data.status === 'matched')) {
          icon = 'account-heart';
          iconColor = '#28C76F';
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

        showAlert(title, body, buttons, icon, iconColor);
      }
    });

    getInitialNotification().then((remoteMessage) => {
      const data = remoteMessage?.data || {};
      if (!navigationRef.isReady()) {
        return;
      }

      if (data.type === 'HELP_REQUEST_ALERT' && data.requestId) {
        navigationRef.navigate('LocalRequest', { requestId: data.requestId });
      }
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

    return () => {
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
      />
    </>
  );
};

export default AppNavigator;

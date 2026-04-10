import React, { useEffect } from 'react';
import { StatusBar, LogBox, Platform, PermissionsAndroid, DeviceEventEmitter, Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './src/navigation/AppNavigator';
import { initNotifeeChannels } from './src/services/notifications/SociusNotificationService';
import {
  startActiveHelpSessionNotificationCoordinator,
  stopActiveHelpSessionNotificationCoordinator,
} from './src/services/notifications/activeHelpSessionSync';
import { loadAuth } from './src/services/storage/asyncStorage.service';
import { declineHelpAsVolunteer } from './src/services/api/volunteer.api';
import { getMyActiveHelpRequest, getActivePresenceRequest } from './src/services/api/incident.api';

// Global scope (Expo docs): keep native splash until SplashScreen.js calls hideAsync after first paint.
SplashScreen.preventAutoHideAsync().catch(() => {});


// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
]);

const App = () => {
  useEffect(() => {
    Appearance.setColorScheme('light');

    initNotifeeChannels().catch((e) => {
      console.error('[Notifee] init error at startup', e);
    });

    startActiveHelpSessionNotificationCoordinator();

    const subscription = DeviceEventEmitter.addListener('CallDeclined', async (data) => {
      console.log('Received CallDeclined event:', data);
      const { requestId } = data;
      if (requestId) {
        try {
          const auth = await loadAuth();
          const token = auth?.accessToken;
          if (token) {
            await declineHelpAsVolunteer(token, requestId);
            console.log('Successfully declined call from notification');
          }
        } catch (error) {
          console.error('Failed to decline call from notification:', error);
        }
      }
    });

    return () => {
      subscription.remove();
      stopActiveHelpSessionNotificationCoordinator();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent={true}
        />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;

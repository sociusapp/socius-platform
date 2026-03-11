import React, { useEffect } from 'react';
import { StatusBar, LogBox, Platform, PermissionsAndroid, DeviceEventEmitter } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';
import { initNotifeeChannels } from './src/services/notifications/SociusNotificationService';
import { loadAuth } from './src/services/storage/asyncStorage.service';
import { declineHelpAsVolunteer } from './src/services/api/volunteer.api';
import { getMyActiveHelpRequest, getActivePresenceRequest } from './src/services/api/incident.api';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();


// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
]);

const App = () => {
  useEffect(() => {
    initNotifeeChannels().catch((e) => {
      console.error('[Notifee] init error at startup', e);
    });

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
    };
  }, []);

  useEffect(() => {
    // Fail-safe to hide native splash in case JS initialization takes too long or fails
    const timer = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) { }
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
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

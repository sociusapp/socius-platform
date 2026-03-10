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
    requestPermissions();

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
    const checkActiveRequest = async () => {
      try {
        const auth = await loadAuth();
        const token = auth?.accessToken;
        if (token) {
          // 1. Check for Active Help Request (Daily Help)
          const helpResponse = await getMyActiveHelpRequest(token);
          if (helpResponse?.success && helpResponse?.data) {
            const data = helpResponse.data;
            const activeReq = data.activeRequest !== undefined ? data.activeRequest : data;
            
            if (activeReq) {
               const navigateToActive = () => {
                 if (navigationRef.isReady()) {
                    navigationRef.navigate('RequestActive');
                 } else {
                    setTimeout(() => {
                        if (navigationRef.isReady()) {
                            navigationRef.navigate('RequestActive');
                        }
                    }, 500);
                 }
               };
               navigateToActive();
               return; // Found active help request, stop here
            }
          }

          // 2. Check for Active Presence Request (Safety)
          const presenceResponse = await getActivePresenceRequest(token);
          const pData = presenceResponse?.data || presenceResponse;
          // Presence request might be returned directly or wrapped
          const activePresence = pData?._id || pData?.id || pData?.requestId || pData?.request?._id || pData?.presenceRequestId ? pData : null;

          if (activePresence) {
             const navigateToPresence = () => {
               if (navigationRef.isReady()) {
                  navigationRef.navigate('AwarenessShared', { 
                    requestId: activePresence._id || activePresence.id || activePresence.requestId 
                  });
               } else {
                  setTimeout(() => {
                      if (navigationRef.isReady()) {
                          navigationRef.navigate('AwarenessShared', { 
                            requestId: activePresence._id || activePresence.id || activePresence.requestId 
                          });
                      }
                  }, 500);
               }
             };
             navigateToPresence();
          }
        }
      } catch (error) {
        console.log('Error checking active request on App launch:', error);
      }
    };
    
    // Race between checkActiveRequest and a timeout
    const initApp = async () => {
      const minSplashTime = 2000; // Minimum time to show splash
      const maxSplashTime = 5000; // Maximum time to wait for active request check
      
      const startTime = Date.now();
      
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise((resolve) => 
          setTimeout(() => resolve('timeout'), maxSplashTime)
        );
        
        // Race the check against timeout
        const result = await Promise.race([
          checkActiveRequest(),
          timeoutPromise
        ]);

        if (result === 'timeout') {
          console.log('App initialization timed out, hiding splash screen');
        }
      } catch (e) {
        console.warn('App initialization error:', e);
      } finally {
        // Ensure we don't hide splash screen too quickly (for branding)
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < minSplashTime) {
          await new Promise(r => setTimeout(r, minSplashTime - elapsedTime));
        }
        await SplashScreen.hideAsync();
      }
    };

    initApp();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        ]);

        console.log('Permissions granted:', granted);
      } catch (err) {
        console.warn('Permission error:', err);
      }
    }
  };

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

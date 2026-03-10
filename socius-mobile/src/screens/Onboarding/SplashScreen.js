import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Animated, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useResponsive } from '../../utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadAuth } from '../../services/storage/asyncStorage.service';
import { getHome } from '../../services/api/user.api';
import { getMyActiveHelpRequest } from '../../services/api/incident.api';
import notifee from '@notifee/react-native';

import * as ExpoSplashScreen from 'expo-splash-screen';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  const navigation = useNavigation();
  const { scale, ms, spacing } = useResponsive();
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    const checkInitialNotification = async () => {
      try {
        const initialNotification = await notifee.getInitialNotification();
        if (initialNotification) {
          const { notification } = initialNotification;
          if (notification.data && (notification.data.type === 'PRESENCE_ALARM' || notification.data.type === 'HELP_REQUEST')) {
            // Let AppNavigator handle it, but we can speed up the splash
            return true;
          }
        }
      } catch (e) {
        console.warn('Error checking initial notification:', e);
      }
      return false;
    };

    const hideNativeSplash = async () => {
      try {
        await ExpoSplashScreen.hideAsync();
      } catch (e) {
        console.warn('Error hiding native splash:', e);
      }
    };
    hideNativeSplash();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    const init = async () => {
      // Check if we have a critical notification pending
      const hasCriticalNotification = await checkInitialNotification();
      
      // If we have a critical notification, we should not delay
      const delay = hasCriticalNotification ? 0 : 3000;

      const timer = setTimeout(async () => {
        try {
          const { accessToken } = await loadAuth();

          if (accessToken) {
            // Check for active help request
            try {
              const activeRequestResponse = await getMyActiveHelpRequest(accessToken);
              if (activeRequestResponse?.success && activeRequestResponse?.data) {
                let request = activeRequestResponse.data;
                // Handle nested activeRequest object if present
                if (request.activeRequest) {
                    request = request.activeRequest;
                }

                const activeStatuses = ['PENDING', 'SEARCHING', 'ACCEPTED', 'IN_PROGRESS', 'matched'];
                
                if (request && activeStatuses.includes(request.status)) {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'RequestActive' }],
                  });
                  return;
                }
              }
            } catch (e) {
              console.log('No active request or error checking:', e);
            }

            let shouldShowProfileReview = false;

            try {
              const homeResponse = await getHome(accessToken);
              const { success: homeSuccess, data: homeData } = homeResponse || {};
              if (homeSuccess && homeData?.verificationStatus) {
                const status = homeData.verificationStatus;
                const pendingStatuses = ['pending', 'review_requested', 'not_submitted'];
                if (pendingStatuses.includes(status)) {
                  shouldShowProfileReview = true;
                }
              }
            } catch (e) {
            }

            if (shouldShowProfileReview) {
              navigation.reset({
                index: 0,
                routes: [{ name: 'ProfileReview' }],
              });
            } else {
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
              });
            }
            return;
          }

          navigation.reset({
            index: 0,
            routes: [{ name: 'PhoneVerification' }],
          });
        } catch (e) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'PhoneVerification' }],
          });
        }
      }, delay);
      
      return () => clearTimeout(timer);
    };

    init();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/icons/icon-03.png')}
            style={{ width: scale(150), height: scale(150) }}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { fontSize: ms(48) }]}>
            Socius
          </Text>
          <Text style={[styles.subtitle, { fontSize: ms(20), marginTop: spacing.xs }]}>
            You're not alone.
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    // Figma looks like it's slightly above the absolute center
    marginTop: -height * 0.05,
  },
  logoContainer: {
    padding: 0,
    margin: 0,
    marginBottom: -10, // Negative margin to bring text even closer to logo
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    color: '#4A4A4A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontWeight: '400',
    color: '#000000',
    marginTop:10
  },
});

export default SplashScreen;

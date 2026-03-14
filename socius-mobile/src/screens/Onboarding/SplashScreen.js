import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Animated, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useResponsive } from '../../utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadActiveHelpRequestId, loadAuth } from '../../services/storage/asyncStorage.service';
import { getHome } from '../../services/api/user.api';
import { getMyActiveHelpRequest, getActivePresenceRequest } from '../../services/api/incident.api';
import notifee from '@notifee/react-native';

import * as ExpoSplashScreen from 'expo-splash-screen';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  const navigation = useNavigation();
  const { scale, ms, spacing } = useResponsive();
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const [logs, setLogs] = useState([]);
  const addLog = (m) => {
    setLogs((prev) => [...prev.slice(-8), `${new Date().toISOString().split('T')[1]?.slice(0,8)} ${m}`]);
    console.log('[Splash]', m);
  };

  useEffect(() => {
    const checkInitialNotification = async () => {
      try {
        const initialNotification = await notifee.getInitialNotification();
        if (initialNotification) {
          const { notification } = initialNotification;
          if (notification.data && (notification.data.type === 'PRESENCE_ALARM' || notification.data.type === 'HELP_REQUEST')) {
            // Let AppNavigator handle it, but we can speed up the splash
            addLog('initial notif present');
            return true;
          }
        }
      } catch (e) {
        addLog(`initial notif error: ${String(e?.message || e)}`);
      }
      return false;
    };

    const hideNativeSplash = async () => {
      try {
        // We will call this right before navigating, 
        // or after a fail-safe timeout
      } catch (e) { }
    };

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    let failSafeTimer = null;
    let fallbackTimer = null;

    const init = async () => {
      const startTime = Date.now();

      try {
        // Fail-safe: Hide native splash quickly (target <= 2s splash)
        failSafeTimer = setTimeout(() => {
          ExpoSplashScreen.hideAsync().catch(() => { });
        }, 2500);

        addLog('loading token');
        const { accessToken } = await loadAuth();
        addLog(`token ${accessToken ? 'present' : 'missing'}`);
        let navigated = false;
        const navigateNow = async (route, params) => {
          if (navigated) return;
          navigated = true;
          await ExpoSplashScreen.hideAsync().catch(() => { });
          if (failSafeTimer) clearTimeout(failSafeTimer);
          if (fallbackTimer) clearTimeout(fallbackTimer);
          navigation.reset({ index: 0, routes: [{ name: route, params }] });
        };
        fallbackTimer = setTimeout(() => {
          addLog('fallback navigate');
          if (accessToken) {
            navigateNow('MainApp', { screen: 'HomeTab' });
          } else {
            navigateNow('PhoneVerification');
          }
        }, 2000);

        if (accessToken) {
          try {
            const cachedActiveHelpId = await loadActiveHelpRequestId();
            if (cachedActiveHelpId) {
              addLog('cached active request present');
            }
          } catch (e) {}

          // 1. Check for active help request or presence request
          try {
            addLog('checking active requests');
            const [helpRes, presenceRes] = await Promise.allSettled([
              getMyActiveHelpRequest(accessToken),
              getActivePresenceRequest(accessToken)
            ]);

            // Handle Help Request
            if (helpRes.status === 'fulfilled' && helpRes.value?.success && helpRes.value?.data) {
              let request = helpRes.value.data;
              if (request.activeRequest) request = request.activeRequest;
              const status = String(request?.status || '').toLowerCase();
              const activeStatuses = ['open', 'matching', 'matched', 'active'];

              if (request && activeStatuses.includes(status)) {
                if (fallbackTimer) clearTimeout(fallbackTimer);
                await ExpoSplashScreen.hideAsync().catch(() => { });
                const requestId = request?._id || request?.id;
                if (requestId && ['matched', 'active'].includes(status)) {
                  navigation.reset({ index: 0, routes: [{ name: 'RequesterMatchingMap', params: { requestId } }] });
                } else {
                  navigation.reset({ index: 0, routes: [{ name: 'RequestActive' }] });
                }
                if (failSafeTimer) clearTimeout(failSafeTimer);
                return;
              }
            }

            // Handle Presence Request
            if (presenceRes.status === 'fulfilled') {
              const pData = presenceRes.value?.data || presenceRes.value;
              const activePresenceId = pData?._id || pData?.id || pData?.requestId || pData?.request?._id || pData?.presenceRequestId;

              if (activePresenceId) {
                if (fallbackTimer) clearTimeout(fallbackTimer);
                await ExpoSplashScreen.hideAsync().catch(() => { });
                navigation.reset({ index: 0, routes: [{ name: 'AwarenessShared', params: { requestId: activePresenceId } }] });
                if (failSafeTimer) clearTimeout(failSafeTimer);
                return;
              }
            }
          } catch (e) {
            addLog(`active req error: ${String(e?.message || e)}`);
          }

          // 2. Check profile review status
          let shouldShowProfileReview = false;
          try {
            addLog('fetching home');
            const homeResponse = await getHome(accessToken);
            if (homeResponse?.success && homeResponse?.data?.verificationStatus) {
              const status = homeResponse.data.verificationStatus;
              if (['pending', 'review_requested', 'not_submitted'].includes(status)) {
                shouldShowProfileReview = true;
              }
            }
          } catch (e) { addLog(`home error: ${String(e?.message || e)}`); }

          // Wait at least 2 seconds for branding
          const elapsed = Date.now() - startTime;
          if (elapsed < 2000) await new Promise(r => setTimeout(r, 2000 - elapsed));

          if (fallbackTimer) clearTimeout(fallbackTimer);
          await ExpoSplashScreen.hideAsync().catch(() => { });
          if (failSafeTimer) clearTimeout(failSafeTimer);

          if (shouldShowProfileReview) {
            addLog('navigate profile review');
            navigation.reset({ index: 0, routes: [{ name: 'ProfileReview' }] });
          } else {
            addLog('navigate main app');
            navigation.reset({ index: 0, routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }] });
          }
        } else {
          // No token, go to logic but wait for branding
          const elapsed = Date.now() - startTime;
          if (elapsed < 2000) await new Promise(r => setTimeout(r, 2000 - elapsed));

          if (fallbackTimer) clearTimeout(fallbackTimer);
          await ExpoSplashScreen.hideAsync().catch(() => { });
          if (failSafeTimer) clearTimeout(failSafeTimer);
          addLog('navigate phone verification');
          navigation.reset({ index: 0, routes: [{ name: 'PhoneVerification' }] });
        }
      } catch (e) {
        addLog(`init error: ${String(e?.message || e)}`);
        await ExpoSplashScreen.hideAsync().catch(() => { });
        navigation.reset({ index: 0, routes: [{ name: 'PhoneVerification' }] });
      }
    };

    init();
    return () => {
      if (failSafeTimer) clearTimeout(failSafeTimer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [navigation, fadeAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/icons/icon-03.png')}
            style={{ width: scale(220), height: scale(220) }}
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
      {__DEV__ && (
        <View style={styles.debugBox}>
          <ScrollView style={{ maxHeight: 120 }}>
            {logs.map((l, i) => (
              <Text key={i} style={styles.debugText}>{l}</Text>
            ))}
          </ScrollView>
          <View style={styles.debugRow}>
            <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }] })} style={styles.debugBtn}>
              <Text style={styles.debugBtnText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: 'PhoneVerification' }] })} style={styles.debugBtn}>
              <Text style={styles.debugBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    marginTop: 10
  },
  debugBox: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 8,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  debugBtn: {
    backgroundColor: '#1e88e5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  debugBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default SplashScreen;

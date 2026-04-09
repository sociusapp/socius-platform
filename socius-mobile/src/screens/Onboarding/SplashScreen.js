import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useResponsive } from '../../utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadActiveHelpRequestId, loadActivePresenceAssignmentId, loadAuth } from '../../services/storage/asyncStorage.service';
import { getHome } from '../../services/api/user.api';
import { getMyActiveHelpRequest, getActivePresenceRequest, getPresenceById } from '../../services/api/incident.api';
import notifee from '@notifee/react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';

/**
 * App bootstrap: native splash is hidden ASAP so Android 12+ doesn’t keep the tiny system icon
 * on screen for seconds; this screen shows larger branding while auth/route work runs.
 */
const SplashScreen = () => {
  const navigation = useNavigation();
  const { width, ms, vscale } = useResponsive();
  const navigatedRef = useRef(false);
  const logoSize = Math.min(width * 0.72, 420);
  const [logs, setLogs] = useState([]);
  const addLog = (m) => {
    if (!__DEV__) return;
    setLogs((prev) => [...prev.slice(-8), `${new Date().toISOString().split('T')[1]?.slice(0, 8)} ${m}`]);
    console.log('[Splash]', m);
  };

  useEffect(() => {
    ExpoSplashScreen.hideAsync().catch(() => {});

    const hideThenReset = async (routes) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      try {
        await ExpoSplashScreen.hideAsync();
      } catch (e) {
        /* already hidden */
      }
      navigation.reset({ index: 0, routes });
    };

    const init = async () => {
      const emergency = setTimeout(async () => {
        if (navigatedRef.current) return;
        addLog('emergency timeout — leaving bootstrap');
        try {
          const { accessToken } = await loadAuth();
          if (accessToken) {
            await hideThenReset([{ name: 'MainApp', params: { screen: 'HomeTab' } }]);
          } else {
            await hideThenReset([{ name: 'PhoneVerification' }]);
          }
        } catch (e) {
          await hideThenReset([{ name: 'PhoneVerification' }]);
        }
      }, 10000);

      const isPresenceAccepted = (presence) => {
        const container = presence?.data || presence;
        const data = container?.request || container?.presence || container?.activeRequest || container?.data || container;
        const status = String(data?.status || '').toLowerCase().trim();
        const acceptedStatuses = [
          'accepted',
          'matched',
          'assigned',
          'in_progress',
          'en_route',
          'arrived',
          'active_with_helper',
          'active',
        ];
        if (acceptedStatuses.includes(status)) return true;

        const isNonEmptyArray = (v) => Array.isArray(v) && v.length > 0;
        const isNonEmptyObject = (v) =>
          v && typeof v === 'object' && !Array.isArray(v) && (v._id || v.id || Object.keys(v).length > 0);
        const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

        const arrays = [
          data?.acceptedBy,
          data?.acceptedHelpers,
          data?.acceptedUsers,
          data?.acceptedVolunteers,
          data?.responders,
          data?.helpers,
          data?.accepted,
        ];
        if (arrays.some(isNonEmptyArray)) return true;

        const singleRefs = [
          data?.volunteer,
          data?.volunteerId,
          data?.helper,
          data?.helperId,
          data?.responder,
          data?.responderId,
          data?.assignedTo,
          data?.assignedUser,
          data?.assignedHelper,
          data?.assignedVolunteer,
          data?.acceptedBy,
        ];
        if (singleRefs.some(isNonEmptyObject) || singleRefs.some(isNonEmptyString)) return true;

        const numericSignals = [
          data?.acceptedCount,
          data?.acceptedUsersCount,
          data?.acceptedHelpersCount,
          data?.stats?.acceptedCount,
        ];
        if (numericSignals.some((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)) return true;

        if (
          status.includes('accept') ||
          status.includes('match') ||
          status.includes('assign') ||
          status.includes('en_route') ||
          status.includes('arriv')
        ) {
          return true;
        }

        return false;
      };

      try {
        try {
          const initialNotification = await notifee.getInitialNotification();
          if (initialNotification?.notification?.data?.type === 'PRESENCE_ALARM' || initialNotification?.notification?.data?.type === 'HELP_REQUEST') {
            addLog('initial notif present');
          }
        } catch (e) {
          addLog(`initial notif error: ${String(e?.message || e)}`);
        }

        addLog('loading token');
        const { accessToken } = await loadAuth();
        addLog(`token ${accessToken ? 'present' : 'missing'}`);

        if (!accessToken) {
          await hideThenReset([{ name: 'PhoneVerification' }]);
          clearTimeout(emergency);
          return;
        }

        try {
          await loadActiveHelpRequestId();
        } catch (e) {
          /* ignore */
        }

        try {
          addLog('checking active requests');
          const helperPresenceId = await loadActivePresenceAssignmentId().catch(() => null);
          const [helpRes, presenceRes] = await Promise.allSettled([
            getMyActiveHelpRequest(accessToken),
            helperPresenceId ? getPresenceById(accessToken, helperPresenceId) : getActivePresenceRequest(accessToken),
          ]);

          if (helpRes.status === 'fulfilled' && helpRes.value?.success && helpRes.value?.data) {
            const helpPayload = helpRes.value.data || {};
            const requesterActive = helpPayload?.activeRequest || null;
            const helperActive = helpPayload?.activeHelp || null;

            // Helper accepted flow: app reopen should land directly on helper meeting map.
            const helperRequest =
              helperActive?.request ||
              helperActive?.requestId ||
              null;
            const helperRequestId =
              helperRequest?._id ||
              helperRequest?.id ||
              helperActive?.requestId?._id ||
              helperActive?.requestId?.id ||
              helperActive?.requestId ||
              null;
            const helperStatus = String(helperActive?.status || helperRequest?.status || '').toLowerCase();
            const helperActiveStatuses = ['accepted', 'matched', 'active', 'in_progress', 'arrived', 'en_route'];
            if (helperRequestId && helperActiveStatuses.includes(helperStatus)) {
              clearTimeout(emergency);
              await hideThenReset([{ name: 'MatchingMap', params: { requestId: helperRequestId } }]);
              return;
            }

            const request = requesterActive;
            const status = String(request?.status || '').toLowerCase();
            const activeStatuses = ['open', 'matching', 'matched', 'active'];

            if (request && activeStatuses.includes(status)) {
              const requestId = request?._id || request?.id;
              if (requestId && ['matched', 'active'].includes(status)) {
                clearTimeout(emergency);
                await hideThenReset([{ name: 'RequesterMatchingMap', params: { requestId } }]);
                return;
              }
              clearTimeout(emergency);
              await hideThenReset([{ name: 'RequestActive' }]);
              return;
            }
          }

          if (presenceRes.status === 'fulfilled' && presenceRes.value) {
            const pContainer = presenceRes.value?.data || presenceRes.value;
            const pData =
              pContainer?.request || pContainer?.presence || pContainer?.activeRequest || pContainer?.data || pContainer;

            const activePresenceId = pData?._id || pData?.id || pData?.requestId || pData?.presenceRequestId;
            const pStatus = String(pData?.status || '').toLowerCase().trim();
            const liveStatuses = ['active', 'helpers_notified', 'helpers_accepted'];

            if (activePresenceId && liveStatuses.includes(pStatus)) {
              if (isPresenceAccepted(presenceRes.value)) {
                clearTimeout(emergency);
                await hideThenReset([
                  {
                    name: 'NearbyMap',
                    params: { requestId: activePresenceId, mode: helperPresenceId ? 'helper' : 'requester', lockBack: true },
                  },
                ]);
                return;
              }
              clearTimeout(emergency);
              await hideThenReset([{ name: 'NearbyMap', params: { requestId: activePresenceId, mode: 'requester' } }]);
              return;
            }
          }
        } catch (e) {
          addLog(`active req error: ${String(e?.message || e)}`);
        }

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
        } catch (e) {
          addLog(`home error: ${String(e?.message || e)}`);
        }

        clearTimeout(emergency);
        if (shouldShowProfileReview) {
          addLog('navigate profile review');
          await hideThenReset([{ name: 'ProfileReview' }]);
        } else {
          addLog('navigate main app');
          await hideThenReset([{ name: 'MainApp', params: { screen: 'HomeTab' } }]);
        }
      } catch (e) {
        addLog(`init error: ${String(e?.message || e)}`);
        clearTimeout(emergency);
        await hideThenReset([{ name: 'PhoneVerification' }]);
      }
    };

    init();
  }, [navigation]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.brandWrap} pointerEvents="none">
        <Image
          source={require('../../assets/icons/icon-03.png')}
          resizeMode="contain"
          style={{ width: logoSize, height: logoSize }}
          accessibilityIgnoresInvertColors
        />
        <Text style={[styles.brandTitle, { fontSize: ms(34), marginTop: vscale(20) }]}>Socius</Text>
        <Text style={[styles.brandTag, { fontSize: ms(18), marginTop: vscale(10) }]}>You're not alone.</Text>
      </View>
      {__DEV__ && (
        <View style={styles.debugBox} pointerEvents="box-none">
          <ScrollView style={{ maxHeight: 120 }}>
            {logs.map((l, i) => (
              <Text key={i} style={styles.debugText}>
                {l}
              </Text>
            ))}
          </ScrollView>
          <View style={styles.debugRow}>
            <TouchableOpacity
              onPress={() => {
                navigatedRef.current = true;
                ExpoSplashScreen.hideAsync().catch(() => {});
                navigation.reset({ index: 0, routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }] });
              }}
              style={styles.debugBtn}
            >
              <Text style={styles.debugBtnText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                navigatedRef.current = true;
                ExpoSplashScreen.hideAsync().catch(() => {});
                navigation.reset({ index: 0, routes: [{ name: 'PhoneVerification' }] });
              }}
              style={styles.debugBtn}
            >
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
  },
  brandWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  brandTitle: {
    fontWeight: '700',
    color: '#1A1C1E',
    textAlign: 'center',
  },
  brandTag: {
    fontWeight: '400',
    color: '#42474E',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 16,
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

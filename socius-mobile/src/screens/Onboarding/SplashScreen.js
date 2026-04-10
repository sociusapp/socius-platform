import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Image, Text, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadActiveHelpRequestId, loadActivePresenceAssignmentId, loadAuth } from '../../services/storage/asyncStorage.service';
import { getHome } from '../../services/api/user.api';
import { getMyActiveHelpRequest, getActivePresenceRequest, getPresenceById } from '../../services/api/incident.api';
import notifee from '@notifee/react-native';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { PENDING_DAILY_HELP_PICK_KEY } from '../../features/daily-help/components/DailyHelpActivePickModalHost';
import { useResponsive } from '../../utils/responsive';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const awaitNextFrames = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });

const SURFACE_READY_FALLBACK_MS = 600;

/**
 * Seamless splash: native prebuild uses the same `icon-03.png` as this screen. `hideAsync` runs only
 * after layout + `Image.onLoad` so the bitmap is painted before the system splash is removed (no flash).
 * Text appears only on JS — logo + #fff stay visually continuous from native.
 */
const SplashScreen = () => {
  const navigation = useNavigation();
  const navigatedRef = useRef(false);
  const { width, ms, vscale } = useResponsive();

  const surfaceReady = useMemo(() => {
    let layoutDone = false;
    let imageDone = false;
    let resolveFn;
    const promise = new Promise((r) => {
      resolveFn = r;
    });
    let settled = false;
    const trySettle = () => {
      if (settled || !layoutDone || !imageDone) return;
      settled = true;
      resolveFn();
      ExpoSplashScreen.hideAsync().catch(() => {});
    };
    return {
      promise,
      onLayout: () => {
        layoutDone = true;
        trySettle();
      },
      onImageLoaded: () => {
        imageDone = true;
        trySettle();
      },
    };
  }, []);

  const logoSize = Math.min(width * 0.38, 228);

  const addLog = (m) => {
    if (__DEV__) console.log('[Splash]', m);
  };

  useEffect(() => {
    const hideThenReset = async (routes) => {
      if (navigatedRef.current) return;
      await Promise.race([surfaceReady.promise, delay(SURFACE_READY_FALLBACK_MS)]);
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      navigation.reset({ index: 0, routes });
      await awaitNextFrames();
      try {
        await ExpoSplashScreen.hideAsync();
      } catch (e) {
        /* already hidden */
      }
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
        void notifee
          .getInitialNotification()
          .then((initialNotification) => {
            if (
              initialNotification?.notification?.data?.type === 'PRESENCE_ALARM' ||
              initialNotification?.notification?.data?.type === 'HELP_REQUEST'
            ) {
              addLog('initial notif present');
            }
          })
          .catch((e) => addLog(`initial notif error: ${String(e?.message || e)}`));

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

        addLog('checking active requests + home (parallel)');
        const helperPresenceId = await loadActivePresenceAssignmentId().catch(() => null);
        const [helpRes, presenceRes, homeRes] = await Promise.allSettled([
          getMyActiveHelpRequest(accessToken),
          helperPresenceId ? getPresenceById(accessToken, helperPresenceId) : getActivePresenceRequest(accessToken),
          getHome(accessToken),
        ]);

        try {
          if (helpRes.status === 'fulfilled' && helpRes.value?.success && helpRes.value?.data) {
            const helpPayload = helpRes.value.data || {};
            const reqList =
              Array.isArray(helpPayload.activeRequests) && helpPayload.activeRequests.length > 0
                ? helpPayload.activeRequests
                : helpPayload.activeRequest
                  ? [helpPayload.activeRequest]
                  : [];
            const helpList =
              Array.isArray(helpPayload.activeHelps) && helpPayload.activeHelps.length > 0
                ? helpPayload.activeHelps
                : helpPayload.activeHelp
                  ? [helpPayload.activeHelp]
                  : [];

            const pickTargets = [];

            const toIso = (d) => {
              if (!d) return null;
              try {
                return new Date(d).toISOString();
              } catch {
                return null;
              }
            };

            const buildTimeMeta = (doc) => {
              if (!doc) return null;
              const n = Number(doc.requestedDurationMinutes ?? doc.requestedMinutes ?? doc.durationMinutes ?? 0);
              return {
                requestedDurationLabel: doc.requestedDurationLabel || doc.requestedDuration || null,
                requestedDurationMinutes: Number.isFinite(n) && n > 0 ? Math.round(n) : null,
                matchedAt: toIso(doc.matchedAt),
                sessionEndsAt: toIso(doc.sessionEndsAt),
              };
            };

            for (const r of reqList) {
              const st = String(r?.status || '').toLowerCase();
              if (!['open', 'matching', 'matched', 'active'].includes(st)) continue;
              const rid = r?._id || r?.id;
              if (!rid) continue;
              const isLiveMeeting = ['matched', 'active'].includes(st);
              const title =
                r.categoryName ||
                (r.category ? String(r.category).replace(/_/g, ' ') : null) ||
                'Your help request';
              pickTargets.push({
                key: `as-requester-${rid}`,
                roleLabel: 'Your request',
                title,
                subtitle: (r.description || '').trim() || '—',
                status: st,
                categoryIcon: r.categoryIcon || null,
                category: r.category || null,
                timeMeta: buildTimeMeta(r),
                target: isLiveMeeting
                  ? { name: 'RequesterMatchingMap', params: { requestId: rid } }
                  : { name: 'RequestActive', params: { initialRequest: r } },
              });
            }

            for (const h of helpList) {
              const req = h?.request || h?.requestId;
              const rid = req?._id || req?.id;
              if (!rid) continue;
              const st = String(req?.status || '').toLowerCase();
              const hst = String(h?.status || '').toLowerCase();
              if (!['matched', 'active'].includes(st) && hst !== 'accepted') continue;

              const title =
                req.categoryName ||
                (req.category ? String(req.category).replace(/_/g, ' ') : null) ||
                'Helping nearby';
              pickTargets.push({
                key: `as-helper-${rid}`,
                roleLabel: 'Helping',
                title,
                subtitle: (req.description || '').trim() || '—',
                status: st || hst,
                categoryIcon: req.categoryIcon || null,
                category: req.category || null,
                timeMeta: buildTimeMeta(req),
                target: { name: 'MatchingMap', params: { requestId: rid } },
              });
            }

            if (pickTargets.length > 1) {
              clearTimeout(emergency);
              try {
                await AsyncStorage.setItem(PENDING_DAILY_HELP_PICK_KEY, JSON.stringify(pickTargets));
              } catch (e) {
                addLog(`pick modal storage failed: ${String(e?.message || e)}`);
              }
              await hideThenReset([{ name: 'MainApp', params: { screen: 'HomeTab' } }]);
              return;
            }

            if (pickTargets.length === 1) {
              clearTimeout(emergency);
              const t = pickTargets[0].target;
              await hideThenReset([{ name: t.name, params: t.params }]);
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
        if (homeRes.status === 'fulfilled' && homeRes.value?.success && homeRes.value?.data?.verificationStatus) {
          const status = homeRes.value.data.verificationStatus;
          if (['pending', 'review_requested', 'not_submitted'].includes(status)) {
            shouldShowProfileReview = true;
          }
        } else if (homeRes.status === 'rejected') {
          addLog(`home error: ${String(homeRes.reason?.message || homeRes.reason)}`);
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
  }, [navigation, surfaceReady]);

  return (
    <View style={styles.container}>
      <View style={styles.brandWrap} onLayout={surfaceReady.onLayout}>
        <Image
          source={require('../../assets/icons/icon-03.png')}
          resizeMode="contain"
          style={{ width: logoSize, height: logoSize, marginBottom: -vscale(14) }}
          accessibilityIgnoresInvertColors
          onLoad={surfaceReady.onImageLoaded}
        />
        <Text style={[styles.brandTitle, { fontSize: ms(32), marginTop: vscale(4) }]}>Socius</Text>
        <Text style={[styles.brandTag, { fontSize: ms(17), marginTop: vscale(5) }]}>You're not alone.</Text>
      </View>
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
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  brandTag: {
    fontWeight: '400',
    color: '#42474E',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
});

export default SplashScreen;

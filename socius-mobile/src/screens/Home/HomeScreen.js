import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image, Animated, Easing, Modal, Platform, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeHeader from '../../components/common/HomeHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../../utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFcmToken } from '../../services/firebase/config';
import { getMessaging, onTokenRefresh } from '@react-native-firebase/messaging';
import { loadAuth, loadAvailabilityPreference, loadAvailabilityUpdatedAt, saveAvailabilityPreference, loadLastKnownLocation, saveLastKnownLocation } from '../../services/storage/asyncStorage.service';
import { updateDeviceToken } from '../../services/api/auth.api';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { reverseGeocode, requestLocationPermission, getCurrentPosition, formatLocationLabel, getNearbyPlaceName } from '../../services/location/geolocation.service';
import { updateAvailabilityLocation, toggleAvailability, getMyActiveHelpRequest } from '../../services/api/incident.api';
import { getProfile } from '../../services/api/user.api';

const HomeScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [isAvailable, setIsAvailable] = useState(true);
  const [availabilityWidth, setAvailabilityWidth] = useState(0);
  const [toggleAnim] = useState(new Animated.Value(0));
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [activeEmergencyContact, setActiveEmergencyContact] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const lastLocationSyncAtRef = useRef(0);
  const locationSyncInFlightRef = useRef(false);
  const availabilityReqSeqRef = useRef(0);
  const availabilityErrorShownAtRef = useRef(0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        syncCurrentLocationToDb(true),
        fetchAvailabilityStatus(),
        checkOnboardingStatus()
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const hasCompleted = await AsyncStorage.getItem('HAS_COMPLETED_ONBOARDING');
      if (!hasCompleted) {
        navigation.navigate('AvailabilityRoles');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const checkActiveRequest = async () => {
        try {
          const auth = await loadAuth();
          const token = auth?.accessToken;
          if (token) {
            const response = await getMyActiveHelpRequest(token);
            if (response?.success && response?.data) {
              // Check both potential structures
              const data = response.data;
              const activeReq = data.activeRequest !== undefined ? data.activeRequest : data;

              if (activeReq) {
                // Redirect to Active Request screen
                // Using reset to clear history stack if needed, or navigate to push
                // Given the user wants to lock them in, navigate is fine, RequestActive handles back press
                navigation.navigate('RequestActive');
              }
            }
          }
        } catch (error) {
          console.log('Error checking active request on Home:', error);
        }
      };

      checkActiveRequest();
    }, [navigation])
  );

  const syncCurrentLocationToDb = async (force = false) => {
    const now = Date.now();
    if (locationSyncInFlightRef.current) {
      return;
    }
    if (!force && now - lastLocationSyncAtRef.current < 60000) {
      return;
    }
    lastLocationSyncAtRef.current = now;
    locationSyncInFlightRef.current = true;
    try {
      const { accessToken } = await loadAuth();
      if (!accessToken) {
        return;
      }

      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        return;
      }

      const position = await getCurrentPosition();
      const longitude = position?.coords?.longitude;
      const latitude = position?.coords?.latitude;

      if (typeof longitude !== 'number' || typeof latitude !== 'number') {
        return;
      }

      if (__DEV__) {
        console.log('[Location] coords', {
          latitude,
          longitude,
          accuracy: position?.coords?.accuracy,
          altitude: position?.coords?.altitude,
          altitudeAccuracy: position?.coords?.altitudeAccuracy,
          heading: position?.coords?.heading,
          speed: position?.coords?.speed,
          timestamp: position?.timestamp,
        });
      }

      let label = 'Location on';
      let place = null;

      try {
        place = await reverseGeocode({
          latitude,
          longitude,
        });
        const nearbyName = await getNearbyPlaceName({ latitude, longitude });
        if (nearbyName) {
          place = place ? { ...place, name: nearbyName } : { name: nearbyName };
        }
        label = formatLocationLabel(place, { fallback: label });
      } catch (e) {
      }

      if (__DEV__) {
        console.log('[Location] reverseGeocode', place);
        console.log('[Location] label', label);
      }

      setLocationLabel(label);
      saveLastKnownLocation({ label, latitude, longitude, updatedAt: now }).catch(() => {});

      await updateAvailabilityLocation(accessToken, {
        lng: longitude,
        lat: latitude,
      });
    } catch (e) {
    } finally {
      locationSyncInFlightRef.current = false;
    }
  };

  const fetchAvailabilityStatus = async ({ forceApply = false } = {}) => {
    try {
      const { accessToken } = await loadAuth();
      if (!accessToken) return;
      const response = await getProfile(accessToken);
      if (response?.success && response?.data) {
        const { isAvailable } = response.data;
        let shouldApplyServer = true;
        if (!forceApply) {
          try {
            const [localValue, updatedAt] = await Promise.all([
              loadAvailabilityPreference(),
              loadAvailabilityUpdatedAt(),
            ]);
            if (typeof localValue === 'boolean' && typeof updatedAt === 'number') {
              const recentlyChanged = Date.now() - updatedAt < 4000;
              if (recentlyChanged && localValue !== !!isAvailable) {
                shouldApplyServer = false;
              }
            }
          } catch (e) { }
        }

        if (shouldApplyServer) {
          setIsAvailable(!!isAvailable);
          try {
            await saveAvailabilityPreference(!!isAvailable);
          } catch (e) { }
          Animated.timing(toggleAnim, {
            toValue: isAvailable ? 0 : 1,
            duration: 220,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start();
        }
      }
    } catch (error) {
      console.log('Error fetching availability:', error);
    }
  };

  const applyAvailability = (value, { animate = false } = {}) => {
    const nextValue = !!value;
    setIsAvailable(nextValue);
    if (animate) {
      Animated.timing(toggleAnim, {
        toValue: nextValue ? 0 : 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    } else {
      toggleAnim.setValue(nextValue ? 0 : 1);
    }
  };

  useEffect(() => {
    checkOnboardingStatus();
    checkAndSyncDeviceToken();
    (async () => {
      try {
        const cached = await loadLastKnownLocation();
        if (cached?.label) {
          setLocationLabel(cached.label);
        }
        if (cached?.updatedAt) {
          lastLocationSyncAtRef.current = cached.updatedAt;
        }
      } catch (e) { }
      syncCurrentLocationToDb();
    })();
    (async () => {
      try {
        const localValue = await loadAvailabilityPreference();
        if (typeof localValue === 'boolean') {
          applyAvailability(localValue);
        }
      } catch (e) { }
      fetchAvailabilityStatus();
    })();
  }, []);


  useEffect(() => {
    const messaging = getMessaging();
    const unsubscribe = onTokenRefresh(messaging, async (newToken) => {
      try {
        const { accessToken } = await loadAuth();
        if (!accessToken || !newToken) return;
        await updateDeviceToken(accessToken, { deviceToken: newToken, platform: Platform.OS });
      } catch (e) {}
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const localValue = await loadAvailabilityPreference();
          if (!cancelled && typeof localValue === 'boolean') {
            applyAvailability(localValue);
          }
        } catch (e) { }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const checkAndSyncDeviceToken = async () => {
    try {
      console.log('[FCM] checkAndSyncDeviceToken: start');
      const { accessToken } = await loadAuth();
      if (!accessToken) {
        console.log('[FCM] No accessToken found, skipping device token sync');
        return;
      }

      let token = null;
      try {
        console.log('[FCM] Requesting notification permission + FCM token');
        token = await getFcmToken();
        console.log('[FCM] getFcmToken result:', token);
      } catch (e) {
        console.log('[FCM] getFcmToken error:', e?.message || e);
        token = null;
      }

      if (!token) {
        console.log('[FCM] No FCM token received, cannot update backend');
        return;
      }

      try {
        console.log('[FCM] Sending token to backend via /auth/device-token');
        let deviceId = null;
        let deviceModel = null;
        let appVersion = null;
        try {
          deviceModel = Device.modelName || null;
        } catch (e) { }
        try {
          if (Platform.OS === 'android') {
            deviceId = Application.androidId || null;
          } else if (Platform.OS === 'ios') {
            deviceId = Application.iosIdForVendor || null;
          }
        } catch (e) { }
        try {
          appVersion = Application.nativeApplicationVersion || null;
        } catch (e) { }
        const response = await updateDeviceToken(accessToken, {
          deviceToken: token,
          platform: Platform.OS,
          deviceId,
          deviceModel,
          appVersion,
        });
        console.log('[FCM] updateDeviceToken response:', response);
      } catch (e) {
        console.log('[FCM] updateDeviceToken API error:', e?.response?.data || e?.message || e);
      }
    } catch (error) {
      console.log('[FCM] checkAndSyncDeviceToken outer error:', error?.message || error);
    }
  };

  const handleAvailabilityToggle = async (value) => {
    if (value === isAvailable) return;

    const previousValue = isAvailable;

    if (value === true) {
      try {
        const hasCompleted = await AsyncStorage.getItem('HAS_COMPLETED_ONBOARDING');
        if (!hasCompleted) {
          navigation.navigate('AvailabilityRoles');
          return;
        }
      } catch (e) { }
    }

    applyAvailability(value, { animate: true });
    try {
      await saveAvailabilityPreference(value);
    } catch (e) { }

    const seq = (availabilityReqSeqRef.current || 0) + 1;
    availabilityReqSeqRef.current = seq;

    (async () => {
      try {
        const { accessToken } = await loadAuth();
        if (!accessToken) return;

        if (value === true) {
          let location = null;
          try {
            const cached = await loadLastKnownLocation();
            if (typeof cached?.latitude === 'number' && typeof cached?.longitude === 'number') {
              location = { lng: cached.longitude, lat: cached.latitude };
            }
          } catch (e) { }

          try {
            const hasPermission = await requestLocationPermission();
            if (hasPermission) {
              const pos = await getCurrentPosition({ timeoutMs: 1500, fallbackToLastKnown: true });
              if (pos && pos.coords) {
                location = {
                  lng: pos.coords.longitude,
                  lat: pos.coords.latitude,
                };
              }
            }
          } catch (e) { }

          const payload = location ? { isAvailable: true, location } : { isAvailable: true };
          const res = await toggleAvailability(accessToken, payload);
          const serverValue = res?.data?.isAvailable;
          if (availabilityReqSeqRef.current === seq && typeof serverValue === 'boolean') {
            applyAvailability(serverValue, { animate: true });
            try { await saveAvailabilityPreference(serverValue); } catch (e) { }
          }
        } else {
          const res = await toggleAvailability(accessToken, { isAvailable: false });
          const serverValue = res?.data?.isAvailable;
          if (availabilityReqSeqRef.current === seq && typeof serverValue === 'boolean') {
            applyAvailability(serverValue, { animate: true });
            try { await saveAvailabilityPreference(serverValue); } catch (e) { }
          }
        }
      } catch (error) {
        if (availabilityReqSeqRef.current !== seq) return;
        setTimeout(async () => {
          if (availabilityReqSeqRef.current !== seq) return;
          try {
            await fetchAvailabilityStatus({ forceApply: true });
            const now = Date.now();
            if (now - (availabilityErrorShownAtRef.current || 0) > 4000) {
              availabilityErrorShownAtRef.current = now;
              const apiMessage =
                error?.response?.data?.message ||
                error?.response?.data?.errors?.[0]?.message;
              Alert.alert('Unable to update', apiMessage || 'Unable to update availability. Please try again.');
            }
          } catch (e) { }
        }, 1500);
      }
    })();
  };

  const emergencyContacts = [
    { id: 1, label: 'Police', icon: require('../../assets/home_icons/2.png'), phone: '100' },
    { id: 2, label: 'Ambulance', icon: require('../../assets/home_icons/4.png'), phone: '108' },
    { id: 3, label: "Women's Safety", icon: require('../../assets/home_icons/5.png'), phone: '1091' },
    { id: 4, label: 'Local Helpline', icon: require('../../assets/home_icons/3.png'), phone: '112' }
  ];

  const quickActions = [
    { id: 1, label: 'Unsafe walk', icon: require('../../assets/home_icons/shoose.png') },
    { id: 2, label: 'Blood needed', icon: require('../../assets/home_icons/bolld.png') },
    { id: 3, label: 'Car issue', icon: require('../../assets/home_icons/car.png') }
  ];

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleQuickAction = (action) => {
    navigation.navigate('BeingFollowed', { source: 'quick_action', action: action?.label });
  };

  const handleEmergencyContact = (contact) => {
    setActiveEmergencyContact(contact);
    setCallModalVisible(true);
  };

  const handleCloseCallModal = () => {
    setCallModalVisible(false);
    setActiveEmergencyContact(null);
  };

  const handleConfirmCall = () => {
    if (!activeEmergencyContact) {
      return;
    }
    const url = `tel:${activeEmergencyContact.phone}`;
    Linking.openURL(url).finally(() => {
      setCallModalVisible(false);
      setActiveEmergencyContact(null);
    });
  };

  const handlePresence = () => {
    navigation.navigate('WhatsHappening');
  };

  return (
    <SafeAreaView style={styles.container}>
      <HomeHeader
        onSettingsPress={handleSettings}
        onLogoPress={() => console.log('Logo pressed')}
        onLocationPress={() => navigation.navigate('LocationMap')}
        locationLabel={locationLabel}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing(20), paddingTop: vscale(12) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <Text
            style={[
              styles.connectedMessage,
              { fontSize: ms(18), marginBottom: vscale(12), lineHeight: ms(26) },
            ]}
          >
            You're connected to people nearby.
          </Text>

          <View
            style={[
              styles.availabilityContainer,
              {
                padding: scale(2),
                marginBottom: vscale(15),
                borderRadius: scale(24),
                borderWidth: scale(1),
                shadowRadius: scale(8),
              },
            ]}
            onLayout={(event) => {
              setAvailabilityWidth(event.nativeEvent.layout.width);
            }}
          >
            {availabilityWidth > 0 && (
              <Animated.View
                style={[
                  styles.availabilitySlider,
                  {
                    width: availabilityWidth / 2 - scale(4),
                    transform: [
                      {
                        translateX: toggleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [scale(2), availabilityWidth / 2],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={['#EC6E63', '#D84D42']}
                  start={{ x: 0.2, y: 0.0 }}
                  end={{ x: 0.8, y: 1.0 }}
                  style={[styles.availabilitySliderGradient, { justifyContent: 'center', alignItems: 'flex-end', paddingRight: spacing(10) }]}
                >
                
                </LinearGradient>
              </Animated.View>
            )}
            <TouchableOpacity
              style={[
                styles.availabilityButton,
                {
                  paddingVertical: vscale(8),
                  paddingHorizontal: spacing(16),
                  borderRadius: scale(22),
                },
              ]}
              onPress={() => handleAvailabilityToggle(true)}
            >
              <Text
                style={[
                  styles.availabilityButtonText,
                  isAvailable && styles.availabilityButtonTextActive,
                  { fontSize: ms(14) },
                ]}
              >
                Available
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.availabilityButton,
                {
                  paddingVertical: vscale(8),
                  paddingHorizontal: spacing(16),
                  borderRadius: scale(22),
                },
              ]}
              onPress={() => handleAvailabilityToggle(false)}
            >
              <Text
                style={[
                  styles.availabilityButtonText,
                  !isAvailable && styles.availabilityButtonTextActive,
                  { fontSize: ms(14) },
                ]}
              >
                Not Available
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[{ fontSize: ms(12), marginBottom: vscale(5) }]}>
            Bookmarks
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing(10), paddingRight: spacing(20) }}
            style={[styles.quickActionsContainer, { marginBottom: vscale(12) }]}
          >
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.quickActionButton,
                  {
                    paddingHorizontal: spacing(10),
                    height: vscale(40),
                    borderRadius: scale(24),
                    borderWidth: scale(1),
                    shadowRadius: scale(6),
                  },
                ]}
                onPress={() => handleQuickAction(action)}
              >
                <Image
                  source={action.icon}
                  style={{ width: scale(22), height: scale(22) }}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.quickActionLabel,
                    { fontSize: ms(12), marginLeft: spacing(8) },
                  ]}
                  numberOfLines={1}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text
            style={[
              styles.quickActionSubtext,
              { fontSize: ms(13), marginBottom: vscale(20) },
            ]}
          >
            Quick actions based on what you face often.
          </Text>

          <View style={[styles.presenceSection, { marginBottom: vscale(40) }]}>
            <TouchableOpacity onPress={handlePresence} activeOpacity={0.9}>
              <View
                style={[
                  styles.presenceButtonContainer,
                  {
                    width: scale(180),
                    height: scale(180),
                    borderRadius: scale(90),
                    marginBottom: vscale(5),
                  },
                ]}
              >
                <Image
                  source={require('../../assets/home_icons/1.png')}
                  style={{ width: scale(180), height: scale(180) }}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>

            <Text
              style={[
                styles.presenceTitle,
                { fontSize: ms(20), marginBottom: vscale(6) },
              ]}
            >
              Need Presence
            </Text>
            <Text
              style={[
                styles.presenceSubtitle,
                { fontSize: ms(13), lineHeight: ms(22), marginBottom: vscale(8) },
              ]}
            >
              Calm local support, no escalation
            </Text>
          </View>

          <View
            style={[
              styles.emergencyContactsContainer,
              { gap: spacing(12) },
            ]}
          >
            {emergencyContacts.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                style={[
                  styles.emergencyContactButton,
                  {
                    paddingVertical: vscale(8),
                    paddingHorizontal: spacing(14),
                    borderRadius: scale(18),
                    borderWidth: scale(1),
                    shadowRadius: scale(6),
                  },
                ]}
                onPress={() => handleEmergencyContact(contact)}
              >
                <View
                  style={[
                    styles.emergencyContactIconWrapper,
                    { marginRight: spacing(12) },
                  ]}
                >
                  <Image
                    source={contact.icon}
                    style={{ width: scale(30), height: scale(30) }}
                    resizeMode="contain"
                  />
                </View>
                <Text
                  style={[
                    styles.emergencyContactLabel,
                    { fontSize: ms(13) },
                  ]}
                >
                  {contact.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.spacer, { height: vscale(20) }]} />
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={callModalVisible}
        animationType="fade"
        onRequestClose={handleCloseCallModal}
      >
        <View style={styles.callModalBackdrop}>
          <View style={styles.callModalCard}>
            {activeEmergencyContact && (
              <View style={styles.callModalIconWrapper}>
                <Image
                  source={activeEmergencyContact.icon}
                  style={{ width: scale(32), height: scale(32), tintColor: '#FFFFFF' }}
                  resizeMode="contain"
                />
              </View>
            )}
            <Text style={styles.callModalTitle}>
              {activeEmergencyContact ? activeEmergencyContact.label : 'Emergency contact'}
            </Text>
            <Text style={styles.callModalNumber}>
              {activeEmergencyContact ? activeEmergencyContact.phone : ''}
            </Text>
            <View style={styles.callModalButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.callModalSecondaryButton}
                onPress={handleCloseCallModal}
              >
                <Text style={styles.callModalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.callModalPrimaryWrapper}
                onPress={handleConfirmCall}
              >
                <LinearGradient
                  colors={['#EC6E63', '#D84D42']}
                  start={{ x: 0.1, y: 0.0 }}
                  end={{ x: 0.9, y: 1.0 }}
                  style={styles.callModalPrimaryButton}
                >
                  <Text style={styles.callModalPrimaryText}>Call</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scrollContent: {
    flexGrow: 1,
  },

  // ===== CONNECTED MESSAGE =====
  connectedMessage: {
    fontWeight: '400',
    color: '#2C3E50',
    textAlign: 'center',
  },

  // ===== AVAILABILITY TOGGLE =====
  availabilityContainer: {
    flexDirection: 'row',
    backgroundColor: '#ECEFF4',
    borderColor: '#D0D5DD',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    elevation: 3,
  },

  availabilityButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  availabilityButtonActive: {
  },
  availabilityGradientFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  availabilityButtonText: {
    fontWeight: '600',
    color: '#6B7280',
  },

  availabilityButtonTextActive: {
    color: '#FFFFFF',
  },

  availabilitySlider: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 0,
    borderRadius: 22,
    shadowColor: 'rgba(0,0,0,0.25)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },

  availabilitySliderGradient: {
    flex: 1,
    borderRadius: 22,
  },

  // ===== QUICK ACTIONS =====
  quickActionsContainer: {
  },

  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderColor: '#D0D5DD',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    elevation: 2,
  },

  quickActionLabel: {
    fontWeight: '500',
    color: '#2C3E50',
    textAlign: 'left',
  },

  quickActionSubtext: {
    fontWeight: '400',
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },

  // ===== PRESENCE SECTION =====
  presenceSection: {
    alignItems: 'center',
  },

  presenceButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },

  presenceTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },

  presenceSubtitle: {
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
  },

  // ===== EMERGENCY CONTACTS GRID =====
  emergencyContactsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  emergencyContactButton: {
    width: '48%',
    borderColor: '#D0D5DD',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    elevation: 2,
  },

  emergencyContactIconWrapper: {
    flexShrink: 0,
  },

  emergencyContactLabel: {
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },

  callModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callModalCard: {
    width: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  callModalIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DC5C69',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  callModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  callModalNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 18,
    textAlign: 'center',
  },
  callModalButtonsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    gap: 12,
  },
  callModalSecondaryButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  callModalSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  callModalPrimaryWrapper: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  callModalPrimaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callModalPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  locationModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationModalCard: {
    width: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  locationModalHeader: {
    marginBottom: 16,
  },
  locationModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  locationModalSubtitle: {
    fontSize: 14,
    color: '#4B5563',
  },
  locationPrimaryCtaWrapper: {
    marginTop: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  locationPrimaryCta: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPrimaryCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  locationSkipButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  locationSkipButtonText: {
    fontSize: 13,
    color: '#6B7280',
  },

  // ===== SPACER =====
  spacer: {
  },
});

export default HomeScreen;

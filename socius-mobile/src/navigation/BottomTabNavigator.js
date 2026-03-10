import React, { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Tab Screens
import HomeScreen from '../screens/Home/HomeScreen';
import PrepareStayReadyScreen from '../screens/Home/PrepareStayReadyScreen';
import CommunityScreen from '../screens/DailyHelp/CommunityScreen';
import ProfileScreen from '../screens/Home/ProfileScreen';
import HomeReviewScreen from '../screens/Home/HomeReviewScreen';
import { getHome, markFirstTimeFlag } from '../services/api/user.api';
import { loadAuth } from '../services/storage/asyncStorage.service';
import { requestLocationPermission, getCurrentPosition } from '../services/location/geolocation.service';
import { updateAvailabilityLocation } from '../services/api/incident.api';
import { api } from '../services/api/client';
import CustomAlert from '../components/common/CustomAlert';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  const navigation = useNavigation();
  const [isVerified, setIsVerified] = useState(true);
  const [checkedVerification, setCheckedVerification] = useState(false);
  const [showReviewAlert, setShowReviewAlert] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationFailureReasons, setVerificationFailureReasons] = useState([]);
  const [verificationAdminNote, setVerificationAdminNote] = useState(null);
  const [hasLocationPermissionFlag, setHasLocationPermissionFlag] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: 'alert-circle-outline',
    iconColor: '#DC5C69'
  });

  const showAlert = (title, message, buttons = [], icon = 'alert-circle-outline', iconColor = '#DC5C69') => {
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

  const requestNotificationPermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const { accessToken } = await loadAuth();
        if (!accessToken) {
          setIsVerified(false);
          setCheckedVerification(true);
          return;
        }
        const result = await getHome(accessToken);
        const { success, data } = result || {};
        if (success && data?.user) {
          const user = data.user;
          const status = data.verificationStatus;
          setVerificationStatus(status || null);
          setVerificationFailureReasons(data.verificationFailureReasons || []);
          setVerificationAdminNote(data.verificationAdminNote || null);
          const verified =
            user.isIdentityVerified &&
            user.accountStatus === 'active' &&
            status === 'approved';
          setIsVerified(!!verified);

          let hasLoc = !!user.hasGivenLocationPermission;

          if (!hasLoc) {
            try {
              const availabilityResponse = await api.get('/availability', {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              });
              const body = availabilityResponse?.data;
              if (body?.success && body.data?.location) {
                const loc = body.data.location;
                if (
                  typeof loc.lat === 'number' &&
                  typeof loc.lng === 'number'
                ) {
                  hasLoc = true;
                }
              }
            } catch (e) {
            }
          }

          setHasLocationPermissionFlag(hasLoc);
          if (verified && !hasLoc) {
            setShowLocationModal(true);
          }
        } else {
          setIsVerified(false);
        }
      } catch (error) {
        setIsVerified(false);
      } finally {
        setCheckedVerification(true);
      }
    };
    fetchVerification();
  }, []);

  useEffect(() => {
    if (checkedVerification && verificationStatus === 'failed') {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'VerificationAttention',
            params: {
              failureReasons: verificationFailureReasons,
              adminNote: verificationAdminNote,
            },
          },
        ],
      });
    }
  }, [checkedVerification, verificationStatus, verificationFailureReasons, verificationAdminNote, navigation]);

  const handleAllowLocation = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setShowLocationModal(false);
        return;
      }

      const { accessToken } = await loadAuth();
      if (!accessToken) {
        setShowLocationModal(false);
        return;
      }

      const position = await getCurrentPosition();
      const { longitude, latitude } = position.coords || {};
      if (typeof longitude === 'number' && typeof latitude === 'number') {
        await updateAvailabilityLocation(accessToken, {
          lng: longitude,
          lat: latitude,
        });
        await markFirstTimeFlag(accessToken, 'hasGivenLocationPermission');
        setHasLocationPermissionFlag(true);
      } else {
        Alert.alert(
          'Location error',
          'We could not read your current location. Please turn on GPS and try again.'
        );
      }
    } catch (e) {
      Alert.alert(
        'Location error',
        'We could not save your location. Please check your network and permissions and try again.'
      );
    } finally {
      setShowLocationModal(false);
    }
  };

  const handleSkipLocation = () => {
    setShowLocationModal(false);
  };

  const openReviewAlert = () => {
    setShowReviewAlert(true);
  };

  const closeReviewAlert = () => {
    setShowReviewAlert(false);
  };

  return (
    <>
      <Modal
        transparent
        visible={showLocationModal && isVerified && !hasLocationPermissionFlag}
        animationType="slide"
        onRequestClose={handleSkipLocation}
      >
        <View style={styles.fullscreenBackdrop}>
          <View style={styles.fullscreenCard}>
            <View style={styles.fullscreenHeader}>
              <Text style={styles.fullscreenTitle}>Stay aware with Socius</Text>
              <Text style={styles.fullscreenSubtitle}>
                To show nearby awareness and alerts, Socius needs a few permissions from you.
              </Text>
            </View>

            <View style={styles.permissionList}>
              <View style={styles.permissionRow}>
                <View style={[styles.permissionIconWrapper, styles.locationIconBg]}>
                  <Icon name="map-marker-radius" size={24} color="#EC6E63" />
                </View>
                <View style={styles.permissionTextBlock}>
                  <Text style={styles.permissionTitle}>Location</Text>
                  <Text style={styles.permissionDescription}>
                    Share your approximate location so we can show what is happening near you.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleAllowLocation}
                style={styles.primaryCtaWrapper}
              >
                <LinearGradient
                  colors={['#EC6E63', '#D84D42']}
                  start={{ x: 0.1, y: 0.0 }}
                  end={{ x: 0.9, y: 1.0 }}
                  style={styles.primaryCta}
                >
                  <Text style={styles.primaryCtaText}>Allow location</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.permissionList}>
              <View style={styles.permissionRow}>
                <View style={[styles.permissionIconWrapper, styles.notificationIconBg]}>
                  <Icon name="bell-ring" size={24} color="#2563EB" />
                </View>
                <View style={styles.permissionTextBlock}>
                  <Text style={styles.permissionTitle}>Notifications</Text>
                  <Text style={styles.permissionDescription}>
                    Get alerts when there is important activity nearby or when someone needs awareness.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={requestNotificationPermission}
                style={styles.secondaryCta}
              >
                <Text style={styles.secondaryCtaText}>Allow notifications</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSkipLocation}
              style={styles.skipButton}
            >
              <Text style={styles.skipButtonText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        transparent
        visible={showReviewAlert}
        animationType="fade"
        onRequestClose={closeReviewAlert}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrapper}>
              <Icon name="account-clock-outline" size={32} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>Profile under review</Text>
            <Text style={styles.modalMessage}>
              Some features will be available once verification is complete.
            </Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={closeReviewAlert}
              style={styles.modalButtonWrapper}
            >
              <LinearGradient
                colors={['#EC6E63', '#D84D42']}
                start={{ x: 0.1, y: 0.0 }}
                end={{ x: 0.9, y: 1.0 }}
                style={styles.modalButton}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            left: 10,
            right: 10,
            bottom: 6,
            height: 72,
            backgroundColor: '#FFFFFF',
            borderRadius: 28,
            borderWidth: 1,
            borderColor: '#E8EAED',
            paddingVertical: 8,
            elevation: 20,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
          },
          tabBarBackground: () => (
            <LinearGradient
              colors={['#FFFFFF', '#FFFFFF']}
              start={{ x: 0.5, y: 0.0 }}
              end={{ x: 0.5, y: 1.0 }}
              style={{ flex: 1, borderRadius: 28 }}
            />
          ),
          tabBarActiveTintColor: '#DC5C69',
          tabBarInactiveTintColor: '#6B7A8F',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 4,
          },
          tabBarIcon: ({ focused }) => {
            let iconSource;

            if (route.name === 'HomeTab') {
              iconSource = focused
                ? require('../assets/navigation_iocns/1.png')
                : require('../assets/navigation_iocns/5.png');
            } else if (route.name === 'PrepareTab') {
              iconSource = focused
                ? require('../assets/navigation_iocns/2.png')
                : require('../assets/navigation_iocns/6.png');
            } else if (route.name === 'CommunityTab') {
              iconSource = focused
                ? require('../assets/navigation_iocns/3.png')
                : require('../assets/navigation_iocns/7.png');
            } else if (route.name === 'ProfileTab') {
              iconSource = focused
                ? require('../assets/navigation_iocns/4.png')
                : require('../assets/navigation_iocns/8.png');
            }

            const isCommunity = route.name === 'CommunityTab';
            const isLocked =
              !isVerified &&
              route.name !== 'HomeTab' &&
              route.name !== 'ProfileTab';

            return (
              <Image
                source={iconSource}
                style={{
                  width: isCommunity ? 36 : 28,
                  height: isCommunity ? 36 : 28,
                  opacity: isLocked ? 0.4 : 1,
                }}
                resizeMode="contain"
              />
            );
          },
        })}
      >
        <Tab.Screen
          name="HomeTab"
          options={{
            tabBarLabel: 'Home',
          }}
        >
          {(props) => {
            if (!checkedVerification) {
              return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
                  <ActivityIndicator size="large" color="#DC5C69" />
                </View>
              );
            }
            return isVerified ? (
              <HomeScreen {...props} />
            ) : (
              <HomeReviewScreen {...props} />
            );
          }}
        </Tab.Screen>
        <Tab.Screen
          name="PrepareTab"
          component={PrepareStayReadyScreen}
          options={{
            tabBarLabel: 'Prepare',
          }}
          listeners={{
            tabPress: (e) => {
              if (checkedVerification && !isVerified) {
                e.preventDefault();
                openReviewAlert();
              }
            },
          }}
        />
        <Tab.Screen
          name="CommunityTab"
          component={CommunityScreen}
          options={{
            tabBarLabel: 'Community',
          }}
          listeners={{
            tabPress: (e) => {
              if (checkedVerification && !isVerified) {
                e.preventDefault();
                openReviewAlert();
              }
            },
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Profile',
          }}
        />
      </Tab.Navigator>
    </>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 22,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  modalIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF1F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    fontWeight: '400',
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalButtonWrapper: {
    alignSelf: 'stretch',
  },
  modalButton: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  fullscreenCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 26,
  },
  fullscreenHeader: {
    marginBottom: 20,
  },
  fullscreenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  fullscreenSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  permissionList: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  permissionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationIconBg: {
    backgroundColor: '#FEF2F2',
  },
  notificationIconBg: {
    backgroundColor: '#EFF6FF',
  },
  permissionTextBlock: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 10,
  },
  primaryCtaWrapper: {
    marginTop: 2,
  },
  primaryCta: {
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryCta: {
    marginTop: 2,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  secondaryCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  skipButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
});

export default BottomTabNavigator;


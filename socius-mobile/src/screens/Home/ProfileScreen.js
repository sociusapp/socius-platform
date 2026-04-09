import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Animated, Easing, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from '../../components/common/Button';
import { useResponsive } from '../../utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import { clearAuth, loadAuth, loadAvailabilityPreference, loadAvailabilityUpdatedAt, loadLastKnownLocation, saveAvailabilityPreference } from '../../services/storage/asyncStorage.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile, getHome, updateProfile, getEmergencyContacts, deleteEmergencyContact as apiDeleteEmergencyContact } from '../../services/api/user.api';
import { logout as logoutApi } from '../../services/api/auth.api';
import { toggleAvailability } from '../../services/api/incident.api';
import { requestLocationPermission, getCurrentPosition } from '../../services/location/geolocation.service';
import { getVerificationStatus } from '../../services/api/verification.api';
import { baseURL as apiBaseURL } from '../../services/api/client';
import CustomAlert from '../../components/common/CustomAlert';
import { getFcmToken } from '../../services/firebase/config';

const ProfileScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [isAvailable, setIsAvailable] = useState(true);
  const [availabilityWidth, setAvailabilityWidth] = useState(0);
  const [toggleAnim] = useState(new Animated.Value(0));
  const [profile, setProfile] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([
    'Calm presence',
    'Care & support',
  ]);
  const [emergencyExpanded, setEmergencyExpanded] = useState(false);
  const [associationsExpanded, setAssociationsExpanded] = useState(false);
  const [collegeAssociation, setCollegeAssociation] = useState('');
  const [worshipAssociation, setWorshipAssociation] = useState('');
  const [workAssociation, setWorkAssociation] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [addressCityArea, setAddressCityArea] = useState('');
  const [addressLandmark, setAddressLandmark] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const categories = [
    { id: 'calm_presence', label: 'Calm presence' },
    { id: 'care_support', label: 'Care & support' },
    { id: 'practical_help', label: 'Practical help' },
    { id: 'nearby_checkin', label: 'Nearby check-in' },
  ];
  const emergencyContacts = Array.isArray(profile?.emergencyContacts)
    ? profile.emergencyContacts
    : Array.isArray(profile?.emergency_contacts)
      ? profile.emergency_contacts
      : [];

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: 'logout',
    iconColor: '#DC5C69'
  });

  const showAlert = (title, message, buttons = [], icon = 'logout', iconColor = '#DC5C69') => {
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

  const applyAvailability = (value) => {
    setIsAvailable(!!value);
    toggleAnim.setValue(value ? 0 : 1);
  };

  const performLogout = async () => {
    try {
      const auth = await loadAuth();
      const accessToken = auth?.accessToken;
      if (accessToken) {
        let deviceToken = null;
        try {
          deviceToken = await getFcmToken();
        } catch (e) {
          deviceToken = null;
        }
        await logoutApi(accessToken, deviceToken).catch(() => {});
      }
      await clearAuth();
    } catch (e) {
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'PhoneVerification' }],
    });
  };

  const handleLogout = () => {
    showAlert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: performLogout, style: 'destructive' }
      ],
      'logout',
      '#DC5C69'
    );
  };

  const toggleCategory = (label) => {
    if (selectedCategories.includes(label)) {
      setSelectedCategories(selectedCategories.filter(c => c !== label));
    } else {
      setSelectedCategories([...selectedCategories, label]);
    }
  };

  const handleSettingsControls = () => {
    navigation.navigate('Settings');
  };

  const handleEditEmergencyContacts = () => {
    navigation.navigate('EmergencyContacts', {
      fromProfile: true,
      initialContacts: emergencyContacts,
    });
  };

  const handleDeleteEmergencyContact = (contactIndex) => {
    const contact = emergencyContacts[contactIndex];
    const label = contact?.name || contact?.phone || 'this contact';
    showAlert(
      'Delete contact',
      `Remove ${label} from your emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { accessToken } = await loadAuth();
              if (!accessToken) {
                showAlert('Error', 'Session expired. Please login again.', [{ text: 'OK', onPress: closeAlert }], 'alert-circle-outline', '#DC5C69');
                return;
              }

              let response = null;
              if (contact?.id || contact?._id) {
                response = await apiDeleteEmergencyContact(accessToken, contact?.id || contact?._id);
              } else {
                const nextContacts = emergencyContacts
                  .filter((_, idx) => idx !== contactIndex)
                  .map((c) => ({
                    name: c?.name?.trim() || '',
                    phone: c?.phone?.trim() || '',
                    relationship: c?.relationship?.trim() || '',
                  }))
                  .filter((c) => c.name && c.phone);
                response = await updateProfile(accessToken, { emergencyContacts: nextContacts, emergency_contacts: nextContacts });
              }
              const { success, message, data } = response || {};
              if (!success) {
                showAlert('Error', message || 'Failed to delete contact.', [{ text: 'OK', onPress: closeAlert }], 'alert-circle-outline', '#DC5C69');
                return;
              }

              if (data) {
                setProfile((prev) => (prev ? { ...prev, ...data } : data));
              } else {
                setProfile((prev) =>
                  prev
                    ? {
                      ...prev,
                      emergencyContacts: prev.emergencyContacts?.filter((_, idx) => idx !== contactIndex) || [],
                      emergency_contacts: prev.emergency_contacts?.filter((_, idx) => idx !== contactIndex) || [],
                    }
                    : prev
                );
              }
              try {
                const updated = emergencyContacts.filter((_, idx) => idx !== contactIndex);
                await AsyncStorage.setItem('USER_EMERGENCY_CONTACTS', JSON.stringify(updated));
              } catch (e) { }
              closeAlert();
            } catch (e) {
              const apiMessage =
                e?.response?.data?.message ||
                e?.response?.data?.errors?.[0]?.message;
              showAlert('Error', apiMessage || 'Failed to delete contact.', [{ text: 'OK', onPress: closeAlert }], 'alert-circle-outline', '#DC5C69');
            }
          },
        },
      ],
      'trash-can-outline',
      '#DC5C69'
    );
  };

  const handleAvailabilityToggle = async (value) => {
    if (!isVerified) {
      return;
    }

    const previousValue = isAvailable;

    // Optimistic update
    applyAvailability(value);
    try {
      await saveAvailabilityPreference(value);
    } catch (e) { }
    Animated.timing(toggleAnim, {
      toValue: value ? 0 : 1,
      duration: 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    try {
      const { accessToken } = await loadAuth();
      if (!accessToken) {
        applyAvailability(previousValue);
        try {
          await saveAvailabilityPreference(previousValue);
        } catch (e) { }
        return;
      }

      if (value) {
        // Get location if turning ON
        const hasPermission = await requestLocationPermission();
        let location = null;
        if (hasPermission) {
          const pos = await getCurrentPosition({ timeoutMs: 7000, fallbackToLastKnown: true });
          if (pos && pos.coords) {
            location = {
              lng: pos.coords.longitude,
              lat: pos.coords.latitude
            };
          }
        }
        if (!location) {
          try {
            const cached = await loadLastKnownLocation();
            if (typeof cached?.latitude === 'number' && typeof cached?.longitude === 'number') {
              location = { lng: cached.longitude, lat: cached.latitude };
            }
          } catch (e) { }
        }
        const payload = location ? { isAvailable: true, location } : { isAvailable: true };
        const res = await toggleAvailability(accessToken, payload);
        const serverValue = res?.data?.isAvailable;
        if (typeof serverValue === 'boolean') {
          applyAvailability(serverValue);
          try { await saveAvailabilityPreference(serverValue); } catch (e) { }
        }
      } else {
        const res = await toggleAvailability(accessToken, { isAvailable: false });
        const serverValue = res?.data?.isAvailable;
        if (typeof serverValue === 'boolean') {
          applyAvailability(serverValue);
          try { await saveAvailabilityPreference(serverValue); } catch (e) { }
        }
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message;
      showAlert(
        'Unable to update',
        apiMessage || 'Unable to update availability. Please try again.',
        [{ text: 'OK', onPress: closeAlert }]
      );
      // Revert on error
      applyAvailability(previousValue);
      try {
        await saveAvailabilityPreference(previousValue);
      } catch (e) { }
      Animated.timing(toggleAnim, {
        toValue: previousValue ? 0 : 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  };

  const [isSavingAssociations, setIsSavingAssociations] = useState(false);
  const handleSaveAssociations = () => {
    const save = async () => {
      try {
        setIsSavingAssociations(true);
        const { accessToken } = await loadAuth();
        if (!accessToken) {
          showAlert('Error', 'Session expired. Please login again.', [{ text: 'OK', onPress: closeAlert }], 'alert-circle-outline', '#DC5C69');
          return;
        }
        const payload = {
          associations: {
            college: collegeAssociation?.trim() || null,
            worship: worshipAssociation?.trim() || null,
            work: workAssociation?.trim() || null,
          },
        };
        const response = await updateProfile(accessToken, payload);
        const { success, message, data } = response || {};
        if (!success) {
          showAlert('Error', message || 'Failed to save associations.', [{ text: 'OK', onPress: closeAlert }], 'alert-circle-outline', '#DC5C69');
          return;
        }
        if (data && data.associations) {
          const assoc = data.associations || {};
          setCollegeAssociation(assoc.college || '');
          setWorshipAssociation(assoc.worship || '');
          setWorkAssociation(assoc.work || '');
        }
        setAssociationsExpanded(false);
        showAlert('Saved', 'Associations updated successfully.', [{ text: 'OK', onPress: closeAlert }], 'check-circle', '#4CAF50');
      } catch (e) {
        const apiMessage =
          e?.response?.data?.message ||
          e?.response?.data?.errors?.[0]?.message;
        showAlert('Error', apiMessage || 'Something went wrong while saving.', [{ text: 'OK', onPress: closeAlert }], 'alert-circle-outline', '#DC5C69');
      } finally {
        setIsSavingAssociations(false);
      }
    };
    save();
  };

  const fetchProfile = useCallback(async () => {
    try {
      const { accessToken } = await loadAuth();
      if (!accessToken) return;
      const result = await getProfile(accessToken);
      const { success, data } = result || {};
      if (success && data) {
        setProfile(data);
        if (typeof data.isAvailable === 'boolean') {
          let shouldApplyServer = true;
          try {
            const [localValue, updatedAt] = await Promise.all([
              loadAvailabilityPreference(),
              loadAvailabilityUpdatedAt(),
            ]);
            if (typeof localValue === 'boolean' && typeof updatedAt === 'number') {
              const recentlyChanged = Date.now() - updatedAt < 4000;
              if (recentlyChanged && localValue !== data.isAvailable) {
                shouldApplyServer = false;
              }
            }
          } catch (e) { }

          if (shouldApplyServer) {
            applyAvailability(data.isAvailable);
            try {
              await saveAvailabilityPreference(!!data.isAvailable);
            } catch (e) { }
          }
        }
        if (data.associations) {
          const assoc = data.associations || {};
          setCollegeAssociation(assoc.college || '');
          setWorshipAssociation(assoc.worship || '');
          setWorkAssociation(assoc.work || '');
        }
        if (data.profileImage) {
          const filePath = data.profileImage;
          const apiRoot = apiBaseURL.replace(/\/api\/?$/, '');
          let fullUrl = null;
          if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            fullUrl = filePath;
          } else if (filePath.startsWith('/')) {
            fullUrl = `${apiRoot}${filePath}`;
          } else {
            fullUrl = `${apiRoot}/${filePath}`;
          }
          setProfileImageUri(fullUrl);
        }
      }

      let contactsResult = null;
      try {
        contactsResult = await getEmergencyContacts(accessToken);
      } catch (e) {
        contactsResult = null;
      }
      if (contactsResult?.success && Array.isArray(contactsResult?.data)) {
        const list = contactsResult.data.map((c) => ({
          id: c?.id || c?._id || c?.phone,
          name: c?.name || '',
          phone: c?.phone || '',
          relationship: c?.relationship || '',
        }));
        setProfile((prev) => (prev ? { ...prev, emergencyContacts: list, emergency_contacts: list } : { emergencyContacts: list, emergency_contacts: list }));
        try {
          await AsyncStorage.setItem('USER_EMERGENCY_CONTACTS', JSON.stringify(list));
        } catch (e) { }
      } else {
        const serverList =
          Array.isArray(result?.data?.emergencyContacts)
            ? result.data.emergencyContacts
            : Array.isArray(result?.data?.emergency_contacts)
              ? result.data.emergency_contacts
              : [];
        if (!serverList || serverList.length === 0) {
          try {
            const cached = await AsyncStorage.getItem('USER_EMERGENCY_CONTACTS');
            const list = cached ? JSON.parse(cached) : [];
            if (Array.isArray(list) && list.length > 0) {
              setProfile((prev) => (prev ? { ...prev, emergencyContacts: list, emergency_contacts: list } : { emergencyContacts: list, emergency_contacts: list }));
            }
          } catch (e) { }
        }
      }

      const homeResult = await getHome(accessToken);
      const { success: homeSuccess, data: homeData } = homeResult || {};
      if (homeSuccess && homeData) {
        const status = homeData.verificationStatus || null;
        setVerificationStatus(status || null);
        const userData = homeData.user;
        const fullyVerified =
          userData?.isIdentityVerified &&
          userData?.accountStatus === 'active' &&
          status === 'approved';
        setIsVerified(!!fullyVerified);
      } else {
        setIsVerified(false);
      }

      const verificationResult = await getVerificationStatus(accessToken);
      const { success: verSuccess, data: verData } = verificationResult || {};
      if (verSuccess && verData?.selfie?.fileUrl) {
        const filePath = verData.selfie.fileUrl;
        const apiRoot = apiBaseURL.replace(/\/api\/?$/, '');
        let fullUrl = null;
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
          fullUrl = filePath;
        } else if (filePath.startsWith('/')) {
          fullUrl = `${apiRoot}${filePath}`;
        } else {
          fullUrl = `${apiRoot}/${filePath}`;
        }
        setProfileImageUri(fullUrl);
      } else {
        // keep existing profileImageUri if set from profile; otherwise null
        setProfileImageUri((prev) => prev || null);
      }
    } catch (e) {
    }
  }, [toggleAnim]);

  useEffect(() => {
    (async () => {
      try {
        const localValue = await loadAvailabilityPreference();
        if (typeof localValue === 'boolean') {
          applyAvailability(localValue);
        }
      } catch (e) { }
      fetchProfile();
    })();
  }, [fetchProfile]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const localValue = await loadAvailabilityPreference();
          if (typeof localValue === 'boolean') {
            applyAvailability(localValue);
          }
        } catch (e) { }
        fetchProfile();
      })();
    }, [fetchProfile])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, [fetchProfile]);

  const displayName = profile?.fullName?.trim() || null;
  const roleLabel = isAvailable ? 'Volunteer' : 'User';
  const verificationLabel =
    verificationStatus === 'approved'
      ? 'Verification: Approved'
      : verificationStatus === 'failed'
        ? 'Verification: Rejected'
        : verificationStatus === 'pending' || verificationStatus === 'review_requested'
          ? 'Verification: Under review'
          : verificationStatus === 'not_submitted'
            ? 'Verification: Not submitted'
            : 'Verification: Checking status';

  let verificationBadgeIcon = 'check-circle';
  let verificationBadgeColor = '#4CAF50';
  let verificationBadgeText = 'Verified';

  if (verificationStatus === 'failed') {
    verificationBadgeIcon = 'alert-circle';
    verificationBadgeColor = '#E53935';
    verificationBadgeText = 'Rejected';
  } else if (verificationStatus === 'pending' || verificationStatus === 'review_requested') {
    verificationBadgeIcon = 'clock-outline';
    verificationBadgeColor = '#FB8C00';
    verificationBadgeText = 'Under review';
  } else if (verificationStatus === 'not_submitted') {
    verificationBadgeIcon = 'information-outline';
    verificationBadgeColor = '#757575';
    verificationBadgeText = 'Not submitted';
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingVertical: vscale(10),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image
            source={require('../../assets/icons/icon-03.png')}
            style={{
              width: scale(35),
              height: scale(35),
              resizeMode: 'contain',
              marginRight: spacing(8),
            }}
          />
          <Text style={[styles.headerTitle, { fontSize: ms(28) }]}>Socius</Text>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
          activeOpacity={0.8}
        >
          <Icon name="logout" size={scale(22)} color="#999999" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing(16), paddingBottom: vscale(80) }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          {/* Profile Card */}
          <View style={[styles.profileCard, { paddingHorizontal: spacing(20), paddingVertical: vscale(16), borderRadius: scale(20) }]}>
            <View style={[styles.profileHeader, { marginBottom: vscale(14) }]}>
              <View style={[styles.avatarContainer, { width: scale(60), height: scale(60), borderRadius: scale(30), marginRight: spacing(12) }]}>
                {profileImageUri ? (
                  <Image
                    source={{ uri: profileImageUri }}
                    style={{ width: scale(60), height: scale(60), borderRadius: scale(30), resizeMode: 'cover' }}
                  />
                ) : (
                  <View style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: scale(30),
                    backgroundColor: '#F0F2F5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#E5E7EB'
                  }}>
                    <Icon name="account" size={ms(28)} color="#9CA3AF" />
                  </View>
                )}
              </View>
              <View style={styles.profileInfo}>
                {displayName ? (
                  <Text style={[styles.profileName, { fontSize: ms(20), marginBottom: vscale(2) }]}>{displayName}</Text>
                ) : null}
                <Text style={[styles.profileRole, { fontSize: ms(14), marginBottom: vscale(6) }]}>Role: {roleLabel}</Text>
                <View style={styles.verifiedBadge}>
                  <Icon name={verificationBadgeIcon} size={ms(16)} color={verificationBadgeColor} />
                  <Text style={[styles.verifiedText, { fontSize: ms(13) }]}>{verificationBadgeText}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.divider, { height: scale(1), marginVertical: vscale(12) }]} />

            <Text style={[styles.profileNotice, { fontSize: ms(11), lineHeight: ms(20) }]}>Your profile is visible only when you choose to share presence.</Text>
          </View>

          {/* Availability Card */}
          <View style={[styles.availabilityCard, { paddingHorizontal: spacing(20), paddingVertical: vscale(16), borderRadius: scale(20) }]}>
            <View style={styles.availabilityHeader}>
              <Text style={[styles.availabilityTitle, { fontSize: ms(16), marginBottom: vscale(4) }]}>Available to be aware</Text>
              <Text style={[styles.availabilitySubtext, { fontSize: ms(13) }]}>You can change this anytime.</Text>
            </View>
            <View
              style={[styles.availabilityToggleContainer, { padding: scale(2), borderRadius: scale(24), borderWidth: scale(1), marginTop: vscale(10) }]}
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
                    style={styles.availabilitySliderGradient}
                  />
                </Animated.View>
              )}
              <TouchableOpacity
                style={[
                  styles.availabilityToggleButton,
                  {
                    paddingVertical: vscale(6),
                    paddingHorizontal: spacing(14),
                    borderRadius: scale(22),
                    opacity: isVerified ? 1 : 0.4,
                  },
                ]}
                disabled={!isVerified}
                onPress={() => handleAvailabilityToggle(true)}
              >
                <Text
                  style={[
                    styles.availabilityToggleText,
                    isAvailable && styles.availabilityToggleTextActive,
                    { fontSize: ms(13) },
                  ]}
                >
                  Available
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.availabilityToggleButton,
                  {
                    paddingVertical: vscale(6),
                    paddingHorizontal: spacing(14),
                    borderRadius: scale(22),
                    opacity: isVerified ? 1 : 0.4,
                  },
                ]}
                disabled={!isVerified}
                onPress={() => handleAvailabilityToggle(false)}
              >
                <Text
                  style={[
                    styles.availabilityToggleText,
                    !isAvailable && styles.availabilityToggleTextActive,
                    { fontSize: ms(13) },
                  ]}
                >
                  Not Available
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* What I'm Open To */}
          <View style={[styles.categoriesCard, { paddingHorizontal: spacing(20), paddingVertical: vscale(20), borderRadius: scale(20) }]}>
            <Text style={[styles.categoriesTitle, { fontSize: ms(16), marginBottom: vscale(14) }]}>What I'm open to</Text>

            <View style={[styles.categoryGrid, { gap: spacing(8), marginBottom: vscale(14) }]}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategories.includes(category.label) && styles.categoryButtonSelected,
                    { paddingVertical: vscale(10), paddingHorizontal: spacing(12), borderRadius: scale(22) }
                  ]}
                  onPress={() => toggleCategory(category.label)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    selectedCategories.includes(category.label) && styles.categoryButtonTextSelected,
                    { fontSize: ms(13) }
                  ]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.categoriesHint, { fontSize: ms(12), lineHeight: ms(20) }]}>This helps filter what you may see. Nothing is required.</Text>
          </View>

          <View style={[styles.verificationCard, { paddingHorizontal: spacing(20), paddingVertical: vscale(20), borderRadius: scale(20) }]}>
            <Text style={[styles.verificationTitle, { fontSize: ms(16), marginBottom: vscale(8) }]}>Verification</Text>
            <Text style={[styles.verificationText, { fontSize: ms(14), marginBottom: vscale(10) }]}>
              {verificationLabel}
            </Text>
            <View style={[styles.verificationRow, { marginBottom: vscale(12) }]}>
              <View style={[styles.verificationItem, { flex: 1, marginRight: spacing(8), gap: spacing(6) }]}>
                <Icon name="check-circle" size={ms(18)} color="#4CAF50" />
                <Text style={[styles.verificationText, { fontSize: ms(14) }]}>Identity</Text>
              </View>

              <View style={[styles.verificationItem, { flex: 1, marginLeft: spacing(8), gap: spacing(6) }]}>
                <Icon name="check-circle" size={ms(18)} color="#4CAF50" />
                <Text style={[styles.verificationText, { fontSize: ms(14) }]}>Phone</Text>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: spacing(0), marginBottom: vscale(16) }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setEmergencyExpanded(prev => !prev)}
              style={[
                styles.emergencyHeaderButton,
                {
                  borderTopLeftRadius: scale(8),
                  borderTopRightRadius: scale(8),
                  borderBottomLeftRadius: emergencyExpanded ? 0 : scale(8),
                  borderBottomRightRadius: emergencyExpanded ? 0 : scale(8),
                  paddingVertical: vscale(12),
                  paddingHorizontal: spacing(16),
                  marginBottom: 0,
                },
              ]}
            >
              <View style={{ flex: 1, marginRight: spacing(12) }}>
                <Text style={[styles.emergencyTitle, { fontSize: ms(16) }]}>Emergency contacts</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(8), paddingRight: spacing(4) }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleEditEmergencyContacts}
                  style={styles.emergencyHeaderIconButton}
                >
                  <Icon name="square-edit-outline" size={ms(16)} color="#4B5563" />
                </TouchableOpacity>
                <Icon
                  name={emergencyExpanded ? 'chevron-up' : 'chevron-down'}
                  size={ms(20)}
                  color="#999999"
                />
              </View>
            </TouchableOpacity>

            {emergencyExpanded && (
              <View
                style={[
                  styles.emergencyPanel,
                  {
                    paddingHorizontal: spacing(16),
                    paddingVertical: vscale(12),
                    borderBottomLeftRadius: scale(8),
                    borderBottomRightRadius: scale(8),
                  },
                ]}
              >
                {emergencyContacts.length > 0 ? (
                  <View style={{ marginBottom: vscale(10) }}>
                    {emergencyContacts.map((contact, index) => (
                      <View
                        key={`${contact?.id || contact?._id || contact?.phone || index}`}
                        style={[
                          styles.emergencyContactRow,
                          {
                            paddingVertical: vscale(12),
                            borderTopWidth: index === 0 ? 0 : 1
                          }
                        ]}
                      >
                        <View style={{
                          width: scale(40),
                          height: scale(40),
                          borderRadius: scale(20),
                          backgroundColor: '#F3F4F6',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: spacing(12)
                        }}>
                          <Icon name="account" size={ms(20)} color="#9CA3AF" />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={[styles.emergencyContactName, { fontSize: ms(15), marginBottom: vscale(2) }]}>
                            {contact.name}
                          </Text>
                          <Text
                            style={[
                              styles.emergencyContactMeta,
                              { fontSize: ms(13), color: '#6B7280' },
                            ]}
                          >
                            {contact.phone}
                            {contact.relationship ? ` • ${contact.relationship}` : ''}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(8) }}>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handleEditEmergencyContacts}
                            style={[
                              styles.emergencyRowIconButton,
                              {
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: '#F3F4F6',
                                borderColor: 'transparent'
                              }
                            ]}
                          >
                            <Icon name="pencil-outline" size={ms(20)} color="#4B5563" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => handleDeleteEmergencyContact(index)}
                            style={[
                              styles.emergencyRowIconButton,
                              {
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: '#FEF2F2',
                                borderColor: 'transparent'
                              }
                            ]}
                          >
                            <Icon name="trash-can-outline" size={ms(20)} color="#DC5C69" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.emergencyEmptyText,
                      { fontSize: ms(13), marginBottom: vscale(10) },
                    ]}
                  >
                    No emergency contacts added yet.
                  </Text>
                )}

                <Text
                  style={[
                    styles.emergencyHint,
                    { fontSize: ms(12), marginTop: vscale(8), lineHeight: ms(18) },
                  ]}
                >
                  These contacts are notified only if you choose to escalate a situation.
                </Text>
              </View>
            )}
          </View>

          {/* Associations Card */}
          <View style={[styles.associationsCard, { paddingHorizontal: spacing(20), paddingVertical: vscale(20), borderRadius: scale(20) }]}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setAssociationsExpanded((prev) => !prev)}
              style={[styles.associationsHeader, { paddingBottom: vscale(10), marginBottom: vscale(8) }]}
            >
              <Text style={[styles.associationsTitle, { fontSize: ms(16) }]}>
                Associations <Text style={[styles.optional, { fontSize: ms(14) }]}>({'(optional)'})</Text>
              </Text>
              <View style={styles.associationsAction}>
                <Text style={styles.associationsEditText}>Edit</Text>
                <Icon
                  name={associationsExpanded ? 'chevron-up' : 'chevron-down'}
                  size={ms(20)}
                  color="#999999"
                />
              </View>
            </TouchableOpacity>

            {associationsExpanded ? (
              <>
                <View style={[styles.associationItem, { paddingVertical: vscale(10) }]}>
                  <TextInput
                    style={[styles.associationInput, { fontSize: ms(14) }]}
                    placeholder="College / University"
                    placeholderTextColor="#B0B0B0"
                    value={collegeAssociation}
                    onChangeText={setCollegeAssociation}
                  />
                </View>

                <View style={[styles.associationItem, { paddingVertical: vscale(10) }]}>
                  <TextInput
                    style={[styles.associationInput, { fontSize: ms(14) }]}
                    placeholder="Mosque / Temple / Church"
                    placeholderTextColor="#B0B0B0"
                    value={worshipAssociation}
                    onChangeText={setWorshipAssociation}
                  />
                </View>

                <View style={[styles.associationItem, { paddingVertical: vscale(10) }]}>
                  <TextInput
                    style={[styles.associationInput, { fontSize: ms(14) }]}
                    placeholder="Workplace / Local group"
                    placeholderTextColor="#B0B0B0"
                    value={workAssociation}
                    onChangeText={setWorkAssociation}
                  />
                </View>

                <Button
                  title="Save associations"
                  onPress={handleSaveAssociations}
                  loading={isSavingAssociations}
                  disabled={isSavingAssociations}
                  style={[styles.associationSaveButton, { marginTop: vscale(12), borderRadius: scale(24), paddingVertical: vscale(10), paddingHorizontal: spacing(20) }]}
                />

                <Text style={[styles.associationHint, { fontSize: ms(13), marginTop: vscale(10), lineHeight: ms(20) }]}>
                  Used only for context. Not shown publicly.
                </Text>
              </>
            ) : (
              <>
                <View style={[styles.associationItem, { paddingVertical: vscale(10) }]}>
                  <Text style={[styles.associationText, { fontSize: ms(14) }]}>
                    {collegeAssociation || 'College / University'}
                  </Text>
                </View>

                <View style={[styles.associationItem, { paddingVertical: vscale(10) }]}>
                  <Text style={[styles.associationText, { fontSize: ms(14) }]}>
                    {worshipAssociation || 'Mosque / Temple / Church'}
                  </Text>
                </View>

                <View style={[styles.associationItem, { paddingVertical: vscale(10) }]}>
                  <Text style={[styles.associationText, { fontSize: ms(14) }]}>
                    {workAssociation || 'Workplace / Local group'}
                  </Text>
                </View>

                <Text style={[styles.associationHint, { fontSize: ms(13), marginTop: vscale(10), lineHeight: ms(20) }]}>
                  Used only for context. Not shown publicly.
                </Text>
              </>
            )}
          </View>

          {/* Settings & Controls */}
          <TouchableOpacity
            style={[
              styles.settingsButton,
              {
                paddingHorizontal: spacing(20),
                paddingVertical: vscale(10),
                borderRadius: scale(10),
                marginBottom: vscale(12),
              },
            ]}
            onPress={handleSettingsControls}
          >
            <Text style={[styles.settingsButtonText, { fontSize: ms(16) }]}>Settings & Controls</Text>
            <Icon name="chevron-right" size={ms(22)} color="#DC5C69" />
          </TouchableOpacity>



          <View style={[styles.bottomSpacer, { height: vscale(40) }]} />
        </View>
      </ScrollView>
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // ===== HEADER =====
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },

  headerTitle: {
    fontWeight: '700',
    color: '#DC5C69',
  },

  logoutButton: {
    position: 'absolute',
    right: 20,
    padding: 8,
  },

  scrollContent: {
    flexGrow: 1,
  },

  // ===== PROFILE CARD =====
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F2F5',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarContainer: {
    backgroundColor: '#E8EAED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D0D5DD',
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontWeight: '700',
    color: '#2C3E50',
  },

  profileRole: {
    fontWeight: '500',
    color: '#2C3E50',
  },

  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  verifiedText: {
    fontWeight: '600',
    color: '#4CAF50',
  },

  divider: {
    backgroundColor: '#E8EAED',
  },

  profileNotice: {
    fontWeight: '500',
    color: '#999999',
  },

  // ===== AVAILABILITY CARD =====
  availabilityCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },

  availabilityHeader: {
    alignItems: 'flex-start',
  },

  availabilityTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },

  availabilitySubtext: {
    fontWeight: '400',
    color: '#999999',
  },

  availabilityToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#ECEFF4',
    borderColor: '#D0D5DD',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    elevation: 3,
    overflow: 'hidden',
  },

  availabilityToggleButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  availabilityToggleText: {
    fontWeight: '600',
    color: '#6B7280',
  },

  availabilityToggleTextActive: {
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

  // ===== CATEGORIES CARD =====
  categoriesCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F2F5',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },

  categoriesTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  categoryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F2F5',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },

  categoryButtonSelected: {
    backgroundColor: '#DC5C69',
    borderColor: '#DC5C69',
  },

  categoryButtonText: {
    fontWeight: '600',
    color: '#2C3E50',
  },

  categoryButtonTextSelected: {
    color: '#FFFFFF',
  },

  categoriesHint: {
    fontWeight: '400',
    color: '#999999',
  },

  // ===== VERIFICATION CARD =====
  verificationCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F2F5',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },

  verificationTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },

  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  verificationText: {
    fontWeight: '500',
    color: '#2C3E50',
  },

  verificationLink: {
    fontWeight: '600',
    color: '#0066CC',
    textDecorationLine: 'underline',
  },

  // ===== EMERGENCY CARD =====
  emergencyHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D5DD',
  },

  emergencyTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },

  emergencySubtitle: {
    fontWeight: '400',
    color: '#6B7280',
  },

  emergencyHeaderIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D0D5DD',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  emergencyRowIconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  emergencyContactRow: {
    borderTopWidth: 1,
    borderTopColor: '#E8EAED',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  emergencyContactName: {
    fontWeight: '600',
    color: '#2C3E50',
  },

  emergencyContactMeta: {
    fontWeight: '400',
    color: '#6B7280',
  },

  emergencyEmptyText: {
    fontWeight: '400',
    color: '#999999',
  },

  emergencyPanel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#D0D5DD',
  },

  emergencyManageButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D5DD',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },

  emergencyHint: {
    fontWeight: '400',
    color: '#999999',
  },

  addressCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F2F5',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },

  addressTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },

  addressLabel: {
    fontWeight: '500',
    color: '#4B5563',
  },

  addressInputWrapper: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  addressInput: {
    color: '#111827',
  },

  addressHint: {
    fontWeight: '400',
    color: '#9CA3AF',
  },

  // ===== ASSOCIATIONS CARD =====
  associationsCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F2F5',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },

  associationsTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },

  optional: {
    fontWeight: '400',
    color: '#999999',
  },

  associationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },

  associationsAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  associationsEditText: {
    fontWeight: '500',
    color: '#e41e1eff',
    marginRight: 2,
  },

  associationItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },

  associationText: {
    fontWeight: '500',
    color: '#2C3E50',
  },

  associationInput: {
    fontWeight: '500',
    color: '#2C3E50',
  },

  associationHint: {
    fontWeight: '400',
    color: '#999999',
  },

  associationSaveButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#DC5C69',
    alignItems: 'center',
    justifyContent: 'center',
  },

  associationSaveText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ===== SETTINGS BUTTON =====
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0F2F5',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },

  settingsButtonText: {
    fontWeight: '700',
    color: '#2C3E50',
    flex: 1,
    textAlign: 'center',
  },

  bottomSpacer: {
  },
});

export default ProfileScreen;

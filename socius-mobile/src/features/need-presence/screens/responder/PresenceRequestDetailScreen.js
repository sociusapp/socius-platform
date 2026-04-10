import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useResponsive } from '../../../../utils/responsive';
import { getPresenceById, acceptPresence, declinePresence } from '../../../../services/api/needPresence.api';
import { loadAuth } from '../../../../services/storage/asyncStorage.service';
import { getCurrentPosition } from '../../../../services/location/geolocation.service';
import { baseURL as apiBaseURL } from '../../../../services/api/client';
import CustomAlert from '../../../../components/common/CustomAlert';
import ChatModal from '../../../../components/common/ChatModal';
import { isCurrentUserPresenceRequester } from '../../../../utils/presenceRole';
import {
  PresenceBottomMaterialBar,
  PresenceMaterialNavItem,
  presenceMaterialNavStyles,
} from '../../components/PresenceMaterialNavBar';

const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(Math.min(1, a)));
};

const formatDistance = (meters) => {
  if (typeof meters !== 'number' || !Number.isFinite(meters) || meters < 0) return '';
  if (meters < 1000) return `${Math.round(meters)} meters away`;
  return `${(meters / 1000).toFixed(1)} km away`;
};

/** Maps API `situationType` to short copy for header + fallbacks when `description` is empty. */
const SITUATION_TYPE_LABELS = {
  need_calm_presence: 'Needs calm presence nearby',
  being_followed: 'Feeling followed — needs presence',
  feeling_unsafe: 'Feeling unsafe — needs presence',
  other: 'Needs presence nearby',
};

const PresenceRequestDetailScreen = ({ navigation, route }) => {
  const { contentWidth } = useResponsive();
  const insets = useSafeAreaInsets();
  const { requestId, initialDistanceMeters } = route.params || {};
  const mapRef = useRef(null);

  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [requesterImage, setRequesterImage] = useState(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [myCoord, setMyCoord] = useState(null);
  const [distanceLabel, setDistanceLabel] = useState('');

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', message: '', buttons: [] });

  const showAlert = (title, message, buttons) => {
    setAlertConfig({ title, message, buttons });
    setAlertVisible(true);
  };

  const closeAlert = () => setAlertVisible(false);

  const loadRequestDetails = useCallback(async () => {
    try {
      const auth = await loadAuth();
      if (!auth?.accessToken || !requestId) return;

      const response = await getPresenceById(auth.accessToken, requestId);
      if (response.success) {
        const payload = response.data;
        const reqDoc = payload?.request || payload;

        const myId = auth?.user?._id || auth?.user?.id || auth?.userId;
        if (isCurrentUserPresenceRequester(reqDoc, myId)) {
          navigation.replace('NearbyMap', { requestId, mode: 'requester' });
          return;
        }

        setRequest(reqDoc);

        const requester = reqDoc?.requesterId;
        const photoPath = requester?.profileImage;
        if (photoPath) {
          const apiRoot = apiBaseURL.replace(/\/api\/?$/, '');
          const fullUrl = photoPath.startsWith('http') ? photoPath : `${apiRoot}${photoPath.startsWith('/') ? '' : '/'}${photoPath}`;
          setRequesterImage(fullUrl);
        } else {
          setRequesterImage(null);
        }
      } else {
        showAlert('Error', 'Could not load request details. It may have been cancelled.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Failed to load request details:', error);
      showAlert('Error', 'An unexpected error occurred.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [requestId, navigation]);

  useEffect(() => {
    loadRequestDetails();
  }, [loadRequestDetails]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pos = await getCurrentPosition({ timeoutMs: 8000, fallbackToLastKnown: true });
        const lat = pos?.coords?.latitude;
        const lng = pos?.coords?.longitude;
        if (!cancelled && typeof lat === 'number' && typeof lng === 'number') {
          setMyCoord({ latitude: lat, longitude: lng });
        }
      } catch {
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const coords = request?.location?.coordinates;
    if (coords && myCoord) {
      const [lng, lat] = coords;
      const m = haversineMeters(lat, lng, myCoord.latitude, myCoord.longitude);
      setDistanceLabel(formatDistance(m));
      return;
    }
    const fallback = Number(initialDistanceMeters);
    if (Number.isFinite(fallback) && fallback >= 0) {
      setDistanceLabel(formatDistance(fallback));
      return;
    }
    setDistanceLabel('');
  }, [request, myCoord, initialDistanceMeters]);

  useEffect(() => {
    const c = request?.location?.coordinates;
    if (!c) return;
    const [lng, lat] = c;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    const coords = [{ latitude: lat, longitude: lng }];
    if (myCoord) coords.push(myCoord);
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 52, right: 36, bottom: 28, left: 36 },
        animated: true,
      });
    }, 280);
    return () => clearTimeout(t);
  }, [request, myCoord]);

  const trustTags = useMemo(() => {
    const requester = request?.requesterId;
    if (!requester || typeof requester === 'string') {
      return [
        { key: 'community', icon: 'account-group-outline', color: '#64748B', label: 'Community member' },
      ];
    }
    const tags = [];
    if (requester.isIdentityVerified === true) {
      tags.push({ key: 'verified', icon: 'check-decagram', color: '#34C759', label: 'Verified user' });
    } else if (requester.isPhoneVerified === true) {
      tags.push({ key: 'phone_ok', icon: 'phone-check', color: '#0EA5E9', label: 'Phone verified' });
    }
    const role = String(requester.role || '');
    if (role === 'available_to_help' || role === 'both') {
      tags.push({ key: 'helps', icon: 'hand-heart', color: '#EA580C', label: 'Helps others' });
    }
    const createdAt = requester.createdAt ? new Date(requester.createdAt) : null;
    const accountAgeOk = createdAt && !Number.isNaN(createdAt.getTime());
    if (accountAgeOk && Date.now() - createdAt.getTime() < 90 * 86400000) {
      tags.push({ key: 'new', icon: 'alert-circle-outline', color: '#F97316', label: 'New user' });
    }
    if (tags.length === 0) {
      tags.push({
        key: 'community',
        icon: 'account-group-outline',
        color: '#64748B',
        label: 'Community member',
      });
    }
    return tags;
  }, [request]);

  const submitAccept = async (afterSuccess) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const auth = await loadAuth();
      if (!auth?.accessToken) return;

      const response = await acceptPresence(auth.accessToken, requestId);
      if (response?.success) {
        afterSuccess();
      } else {
        const msg = response?.message || 'Could not accept the request.';
        const code = response?.code;
        const isGone =
          code === 'MATCH_NOT_FOUND' ||
          code === 'REQUEST_NOT_FOUND' ||
          code === 'REQUEST_CLOSED';
        showAlert('Unable to accept', msg, [
          ...(isGone
            ? [{ text: 'Go back', onPress: () => { closeAlert(); navigation.goBack(); } }]
            : []),
          { text: 'OK', onPress: closeAlert },
        ]);
      }
    } catch (error) {
      showAlert(
        'Error',
        error?.message || 'Something went wrong while accepting. Please try again.',
        [{ text: 'OK', onPress: closeAlert }],
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoToHelp = () => {
    submitAccept(() => navigation.replace('SafetyGuidance', { requestId }));
  };

  /** Same accept API; skips full guidance — for “monitor / lighter commitment” path in the mock. */
  const handleStayAware = () => {
    submitAccept(() => navigation.replace('NearbyMap', { requestId, mode: 'helper' }));
  };

  const handleDecline = async () => {
    try {
      const auth = await loadAuth();
      if (auth?.accessToken && requestId) {
        await declinePresence(auth.accessToken, requestId);
      }
    } catch (e) {
    }
    navigation.goBack();
  };

  const handleOpenNavigation = () => {
    if (!request?.location?.coordinates) return;
    const [lng, lat] = request.location.coordinates;
    const label = request.location.address || 'Requester Location';
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
    });
    Linking.openURL(url);
  };

  const reqLat = request?.location?.coordinates?.[1];
  const reqLng = request?.location?.coordinates?.[0];

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingWrap]}>
        <ActivityIndicator size="large" color="#DC5C69" />
        <Text style={styles.loadingText}>Loading request…</Text>
      </View>
    );
  }

  if (!request || typeof reqLat !== 'number' || typeof reqLng !== 'number') {
    return (
      <View style={[styles.container, styles.loadingWrap]}>
        <Text style={styles.loadingText}>Request not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const requesterDoc = request.requesterId;
  const requesterName =
    (typeof requesterDoc === 'object' && requesterDoc?.fullName) || 'Someone nearby';

  const situationKey = request.situationType;
  const situationHeadline =
    (situationKey && SITUATION_TYPE_LABELS[situationKey]) ||
    (situationKey ? String(situationKey).replace(/_/g, ' ') : null);
  const situationBubbleText =
    (request.description && String(request.description).trim()) ||
    situationHeadline ||
    'Needs calm presence nearby.';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomAlert visible={alertVisible} {...alertConfig} onClose={closeAlert} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack} hitSlop={12}>
          <Icon name="chevron-left" size={28} color="#5A5A5A" />
        </TouchableOpacity>
        <View style={styles.headerBrand}>
          <Image source={require('../../../../assets/icons/icon-03.png')} style={styles.logo} />
          <Text style={styles.logoText}>Socius</Text>
        </View>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillText}>Nearby Request</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 28 + 100 + Math.max(insets.bottom, 8) },
        ]}
      >
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: reqLat,
              longitude: reqLng,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            showsUserLocation={false}
          >
            <Circle
              center={{ latitude: reqLat, longitude: reqLng }}
              radius={95}
              strokeColor="rgba(220, 92, 105, 0.35)"
              fillColor="rgba(220, 92, 105, 0.12)"
              strokeWidth={1}
            />
            <Marker coordinate={{ latitude: reqLat, longitude: reqLng }}>
              <View style={styles.requesterPinOuter}>
                <View style={styles.requesterPinInner}>
                  <Icon name="map-marker" size={22} color="#FFF" />
                </View>
              </View>
            </Marker>
            {myCoord ? (
              <Marker coordinate={myCoord}>
                <View style={styles.selfPin}>
                  <Icon name="account" size={16} color="#FFF" />
                </View>
              </Marker>
            ) : null}
          </MapView>
        </View>

        {distanceLabel ? (
          <Text style={styles.distanceLine}>{distanceLabel}</Text>
        ) : (
          <Text style={styles.distanceLineMuted}>Distance updates when your location is available</Text>
        )}

        <View style={[styles.detailsCard, { maxWidth: contentWidth }]}>
          <View style={styles.requesterInfo}>
            {requesterImage ? (
              <Image source={{ uri: requesterImage }} style={styles.requesterImage} />
            ) : (
              <View style={[styles.requesterImage, styles.placeholderImage]}>
                <Icon name="account" size={32} color="#CBD5E1" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.requesterName}>{requesterName}</Text>
              <Text style={styles.requesterAction}>Needs presence nearby</Text>
            </View>
          </View>

          <View style={styles.speechBubble}>
            <Text style={styles.situationText}>{situationBubbleText}</Text>
          </View>

          <View style={styles.tagsContainer}>
            {trustTags.map((t) => (
              <View key={t.key} style={styles.tag}>
                <Icon name={t.icon} color={t.color} size={14} />
                <Text style={styles.tagText}>{t.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.tagsCaption}>Signals help you understand participation.</Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleGoToHelp} disabled={isProcessing}>
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              {isProcessing ? 'Processing…' : 'Go to Help'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleStayAware} disabled={isProcessing}>
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Stay Aware</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.tertiaryButton]} onPress={handleDecline} disabled={isProcessing}>
            <Text style={[styles.buttonText, styles.tertiaryButtonText]}>Not Now</Text>
          </TouchableOpacity>
          <Text style={styles.obligationText}>You can leave anytime. No obligation.</Text>
        </View>

        <View style={styles.safetyInfo}>
          <Icon name="shield-check-outline" size={24} color="#DC5C69" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.safetyTitle}>Meet in visible public areas.</Text>
            <Text style={styles.safetySubtitle}>Avoid direct confrontation.</Text>
          </View>
        </View>
      </ScrollView>

      <PresenceBottomMaterialBar paddingBottom={Math.max(insets.bottom, 8)}>
        <PresenceMaterialNavItem
          onPress={handleOpenNavigation}
          icon="map-marker-path"
          iconColor="#0D9488"
          label="Navigate"
          accessibilityLabel="Open directions to requester"
          iconBg="rgba(13, 148, 136, 0.12)"
        />
        <PresenceMaterialNavItem
          onPress={() => setChatVisible(true)}
          icon="message-text-outline"
          iconColor="#0D9488"
          label="Message"
          accessibilityLabel="Message requester"
          iconBg="rgba(13, 148, 136, 0.12)"
        />
        <PresenceMaterialNavItem
          onPress={() => navigation.navigate('ReportConcern')}
          icon="shield-alert-outline"
          iconColor="#B3261E"
          label="Report"
          accessibilityLabel="Report concern"
          iconBg="rgba(179, 38, 30, 0.12)"
          labelStyle={presenceMaterialNavStyles.navLabelReport}
        />
      </PresenceBottomMaterialBar>

      <ChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        requestId={requestId}
        otherUserName={requesterName}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  loadingWrap: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748B' },
  backLink: { marginTop: 16, padding: 12 },
  backLinkText: { color: '#DC5C69', fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerBack: { width: 40, alignItems: 'center', justifyContent: 'center' },
  headerBrand: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  logo: { width: 32, height: 32 },
  logoText: { fontSize: 20, fontWeight: '700', marginLeft: 8, color: '#2C3E50' },
  headerPill: { backgroundColor: '#FEE2E2', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  headerPillText: { color: '#DC5C69', fontWeight: '700', fontSize: 12 },
  scrollContent: {},
  mapContainer: { height: 250 },
  map: { ...StyleSheet.absoluteFillObject },
  distanceLine: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginTop: -36,
    marginBottom: 8,
  },
  distanceLineMuted: {
    textAlign: 'center',
    fontSize: 13,
    color: '#94A3B8',
    marginTop: -36,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  requesterPinOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(220, 92, 105, 0.25)',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  requesterPinInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#DC5C69',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  selfPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EAB308',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  detailsCard: {
    alignSelf: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    marginTop: -24,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  requesterInfo: { flexDirection: 'row', alignItems: 'center' },
  requesterImage: { width: 50, height: 50, borderRadius: 25, marginRight: 12, backgroundColor: '#F0F0F0' },
  placeholderImage: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  requesterName: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  requesterAction: { fontSize: 14, color: '#DC5C69', fontWeight: '600', marginTop: 2 },
  speechBubble: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  situationText: { fontSize: 16, color: '#334155', lineHeight: 22 },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
    paddingVertical: 10,
    marginTop: 14,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: { marginLeft: 4, fontSize: 12, color: '#475569' },
  tagsCaption: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 8 },
  actionsContainer: { paddingHorizontal: 16, marginTop: 8 },
  button: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  buttonText: { fontSize: 16, fontWeight: 'bold' },
  primaryButton: { backgroundColor: '#DC5C69' },
  primaryButtonText: { color: '#FFF' },
  secondaryButton: { borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
  secondaryButtonText: { color: '#334155' },
  tertiaryButton: {},
  tertiaryButtonText: { color: '#64748B' },
  obligationText: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginBottom: 8 },
  safetyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  safetyTitle: { fontWeight: 'bold', color: '#92400E' },
  safetySubtitle: { color: '#B45309', marginTop: 2 },
});

export default PresenceRequestDetailScreen;

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../../utils/responsive';
import { getPresenceById, acceptPresence, declinePresence } from '../../../../services/api/needPresence.api';
import { loadAuth } from '../../../../services/storage/asyncStorage.service';
import { baseURL as apiBaseURL } from '../../../../services/api/client';
import CustomAlert from '../../../../components/common/CustomAlert';
import ChatModal from '../../../../components/common/ChatModal';

const PresenceRequestDetailScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const { requestId } = route.params;

  const [request, setRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [requesterImage, setRequesterImage] = useState(null);
  const [chatVisible, setChatVisible] = useState(false);

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
        const data = response.data?.request || response.data;
        setRequest(data);

        const photoPath = data.requesterId?.profileImage;
        if (photoPath) {
          const apiRoot = apiBaseURL.replace(/\/api\/?$/, '');
          const fullUrl = photoPath.startsWith('http') ? photoPath : `${apiRoot}${photoPath.startsWith('/') ? '' : '/'}${photoPath}`;
          setRequesterImage(fullUrl);
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
  }, [requestId]);

  useEffect(() => {
    loadRequestDetails();
  }, [loadRequestDetails]);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      const auth = await loadAuth();
      if (!auth?.accessToken) return;

      const response = await acceptPresence(auth.accessToken, requestId);
      if (response.success) {
        navigation.replace('SafetyGuidance', { requestId });
      } else {
        showAlert('Error', response.message || 'Could not accept the request.', [{ text: 'OK', onPress: closeAlert }]);
      }
    } catch (error) {
      showAlert('Error', 'An error occurred while accepting.', [{ text: 'OK', onPress: closeAlert }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
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

  if (isLoading) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  if (!request) {
    return <View style={styles.container}><Text>Request not found.</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <CustomAlert visible={alertVisible} {...alertConfig} onClose={closeAlert} />
      <View style={styles.header}>
        <Image source={require('../../../../assets/icons/icon-03.png')} style={styles.logo} />
        <Text style={styles.logoText}>Socius</Text>
        <View style={styles.headerPill}>
          <Text style={styles.headerPillText}>Nearby Request</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: request.location.coordinates[1],
              longitude: request.location.coordinates[0],
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            showsUserLocation
          >
            <Marker coordinate={{ latitude: request.location.coordinates[1], longitude: request.location.coordinates[0] }}>
              <View style={styles.markerContainer}>
                <Text style={styles.markerText}>{request.distanceMeters ? `${request.distanceMeters}m away` : 'Nearby'}</Text>
                <View style={styles.markerPin} />
              </View>
            </Marker>
          </MapView>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.requesterInfo}>
            {requesterImage ? (
              <Image source={{ uri: requesterImage }} style={styles.requesterImage} />
            ) : (
              <View style={[styles.requesterImage, styles.placeholderImage]}>
                <Icon name="account" size={32} color="#CBD5E1" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.requesterName}>{request.requesterId?.fullName || 'Someone'}</Text>
              <Text style={styles.requesterAction}>Needs presence nearby</Text>
            </View>
          </View>
          <Text style={styles.situationText}>{request.description}</Text>

          <View style={styles.tagsContainer}>
            <View style={styles.tag}><Icon name="check-decagram" color="#34C759" size={14} /><Text style={styles.tagText}>Verified user</Text></View>
            <View style={styles.tag}><Icon name="hand-heart" color="#FF9500" size={14} /><Text style={styles.tagText}>Helps others</Text></View>
            <View style={styles.tag}><Icon name="alert-circle" color="#FF3B30" size={14} /><Text style={styles.tagText}>New user</Text></View>
          </View>
          <Text style={styles.tagsCaption}>Signals help you understand participation.</Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleAccept} disabled={isProcessing}>
            <Text style={[styles.buttonText, styles.primaryButtonText]}>{isProcessing ? 'Processing...' : 'Go to Help'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => { /* TODO: Stay Aware Logic */ }}>
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Stay Aware</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.tertiaryButton]} onPress={handleDecline}>
            <Text style={[styles.buttonText, styles.tertiaryButtonText]}>Not Now</Text>
          </TouchableOpacity>
          <Text style={styles.obligationText}>You can leave anytime. No obligation.</Text>
        </View>

        <View style={styles.safetyInfo}>
          <Icon name="shield-check-outline" size={24} color="#DC5C69" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.safetyTitle}>Meet in visible public areas.</Text>
            <Text style={styles.safetySubtitle}>Avoid direct confrontation.</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={handleOpenNavigation}>
          <Icon name="navigation-variant" size={24} color="#DC5C69" />
          <Text style={styles.navText}>Navigate</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => setChatVisible(true)}>
          <Icon name="message-text-outline" size={24} color="#64748B" />
          <Text style={styles.navText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Icon name="flag-outline" size={24} color="#64748B" />
          <Text style={styles.navText}>Report</Text>
        </TouchableOpacity>
      </View>
      <ChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        requestId={requestId}
        otherUserName={request.requesterId?.fullName}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  logo: { width: 32, height: 32 },
  logoText: { fontSize: 20, fontWeight: '700', marginLeft: 8 },
  headerPill: { marginLeft: 'auto', backgroundColor: '#FEE2E2', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  headerPillText: { color: '#DC5C69', fontWeight: '700' },
  scrollContent: { paddingBottom: 100 },
  mapContainer: { height: 250 },
  map: { ...StyleSheet.absoluteFillObject },
  markerContainer: { alignItems: 'center' },
  markerText: { backgroundColor: 'rgba(0,0,0,0.7)', color: '#FFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, overflow: 'hidden', fontSize: 12, fontWeight: 'bold' }, 
  markerPin: { width: 10, height: 10, backgroundColor: '#DC5C69', borderRadius: 5, marginTop: 4, borderWidth: 2, borderColor: '#FFF' },
  detailsCard: { backgroundColor: '#FFF', margin: 16, borderRadius: 20, padding: 16, marginTop: -50, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  requesterInfo: { flexDirection: 'row', alignItems: 'center' },
  requesterImage: { width: 50, height: 50, borderRadius: 25, marginRight: 12, backgroundColor: '#F0F0F0' },
  placeholderImage: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  requesterName: { fontSize: 18, fontWeight: 'bold' },
  requesterAction: { fontSize: 14, color: '#64748B' },
  situationText: { fontSize: 16, marginVertical: 12, color: '#334155' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F0F0F0', paddingVertical: 10, marginVertical: 5 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4, marginRight: 8, marginBottom: 8 },
  tagText: { marginLeft: 4, fontSize: 12 },
  tagsCaption: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4 },
  actionsContainer: { paddingHorizontal: 16, marginTop: 8 },
  button: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  buttonText: { fontSize: 16, fontWeight: 'bold' },
  primaryButton: { backgroundColor: '#DC5C69' },
  primaryButtonText: { color: '#FFF' },
  secondaryButton: { borderWidth: 1.5, borderColor: '#E2E8F0' },
  secondaryButtonText: { color: '#334155' },
  tertiaryButton: {}, 
  tertiaryButtonText: { color: '#64748B' },
  obligationText: { textAlign: 'center', color: '#94A3B8', fontSize: 12 },
  safetyInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F5', margin: 16, padding: 16, borderRadius: 16 },
  safetyTitle: { fontWeight: 'bold', color: '#B91C1C' },
  safetySubtitle: { color: '#B91C1C' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 1, borderColor: '#F0F0F0' },
  navButton: { alignItems: 'center' },
  navText: { fontSize: 12, color: '#64748B', marginTop: 4 },
});

export default PresenceRequestDetailScreen;

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform, Image, BackHandler, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, Circle } from 'react-native-maps';
import Header from '../../../../components/common/Header';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../../../../utils/responsive';
import { cancelPresenceRequest, closePresenceRequest, getActivePresenceRequest, getPresenceById, updatePresenceStatus, updatePresenceRequest, declinePresence } from '../../../../services/api/needPresence.api';
import { loadAuth } from '../../../../services/storage/asyncStorage.service';
import { requestLocationPermission, getCurrentPosition } from '../../../../services/location/geolocation.service';
import { connectSocket } from '../../../../services/socket/socket.service';
import { baseURL as apiBaseURL } from '../../../../services/api/client';
import CustomAlert from '../../../../components/common/CustomAlert';

const NearbyMapScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const { requestId } = route?.params || {};
  const mode = route?.params?.mode || 'helper';
  
  const [request, setRequest] = useState(null);
  const [requester, setRequester] = useState(null);
  const [helpers, setHelpers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [situation, setSituation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Custom Alert State
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
  
  const socketRef = useRef(null);

  const loadData = async () => {
    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      const myId = auth?.user?._id || auth?.user?.id || auth?.userId;
      setCurrentUserId(myId);

      if (!token || !requestId) return;

      const response = await getPresenceById(token, requestId);
      if (response?.success) {
        const data = response?.data || response;
        const req = data?.request || data?.presence || data;
        setRequest(req);
        setRequester(req?.requesterId);
        
        // Only set situation from server if we don't have one or if it's a fresh load
        if (req?.description && (isLoading || !situation)) {
          setSituation(req.description);
        }
        
        // Process helpers
        const apiRoot = apiBaseURL.replace(/\/api\/?$/, '');
        const acceptedMatches = data?.helpers || [];
        const mappedHelpers = acceptedMatches.map(h => {
          const photoPath = h.helperId?.profileImage || h.helperId?.avatarUrl;
          let photoUrl = null;
          if (photoPath) {
            if (photoPath.startsWith('http')) {
              photoUrl = photoPath;
            } else {
              photoUrl = `${apiRoot}${photoPath.startsWith('/') ? '' : '/'}${photoPath}`;
            }
          }
          
          return {
            id: h.helperId?._id || h.helperId?.id,
            name: h.helperId?.firstName || h.helperId?.fullName || h.helperId?.name || 'Helper',
            photo: photoUrl,
            latitude: h.helperId?.location?.coordinates?.[1] || h.helperId?.lat || h.latitude,
            longitude: h.helperId?.location?.coordinates?.[0] || h.helperId?.lng || h.longitude,
            isMe: String(h.helperId?._id || h.helperId?.id) === String(myId)
          };
        });
        
        setHelpers(mappedHelpers);
      }
    } catch (e) {
      console.log('Error loading meeting details:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    let isSubscribed = true;

    // Set up socket for real-time updates
    const setupSocket = async () => {
      const socket = await connectSocket();
      if (socket && isSubscribed) {
        socketRef.current = socket;
        
        console.log('[Socket] Joining room for request:', requestId);
        // Join room for this request
        socket.emit('presence:join', { presenceRequestId: requestId });
        
        const handleUpdate = (data) => {
          console.log('[Socket] Received presence update event:', data);
          if (String(data.presenceRequestId || data.requestId || data.id) === String(requestId)) {
            loadData();
          }
        };

        // Listen to all relevant events for instant updates
        socket.on('presence:accepted', handleUpdate);
        socket.on('presence:status_updated', handleUpdate);
        socket.on('presence:helper_joined', handleUpdate);
        socket.on('presence:helper_left', handleUpdate);
        socket.on('presence:location_updated', (data) => {
          // If we receive location updates, we can update specific helper markers without full reload
          // For now, reload is safer to get full state, but we could optimize later
          handleUpdate(data);
        });

        socket.on('reconnect', () => {
          console.log('[Socket] Reconnected, re-joining room');
          socket.emit('presence:join', { presenceRequestId: requestId });
          loadData();
        });
      }
    };
    
    setupSocket();

    // Fallback interval (reduced to 10s for better reliability)
    const interval = setInterval(() => {
      if (isSubscribed) loadData();
    }, 10000);
    
    return () => {
      isSubscribed = false;
      clearInterval(interval);
      if (socketRef.current) {
        console.log('[Socket] Leaving room and cleaning up listeners');
        socketRef.current.off('presence:accepted');
        socketRef.current.off('presence:status_updated');
        socketRef.current.off('presence:helper_joined');
        socketRef.current.off('presence:helper_left');
        socketRef.current.off('presence:location_updated');
        socketRef.current.off('reconnect');
        socketRef.current.emit('presence:leave', { presenceRequestId: requestId });
      }
    };
  }, [requestId]);

  const handleOpenMaps = useCallback(async () => {
    try {
      const location = request?.location;
      const coords = location?.coordinates;
      const lat = typeof location?.lat === 'number' ? location.lat : Array.isArray(coords) ? coords[1] : null;
      const lng = typeof location?.lng === 'number' ? location.lng : Array.isArray(coords) ? coords[0] : null;
      
      if (!lat || !lng) return;

      const label = location?.address || 'Meeting Point';
      const url = Platform.select({
        ios: `maps:0,0?q=${label}@${lat},${lng}`,
        android: `geo:0,0?q=${lat},${lng}(${label})`
      });

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        await Linking.openURL(webUrl);
      }
    } catch (e) {}
  }, [request]);

  const handleNearby = async () => {
    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (!token || !requestId) return;

      const response = await updatePresenceStatus(token, requestId, 'arrived');
      if (response?.success) {
        loadData();
        showAlert('Arrived', 'Requester has been notified of your arrival.', [{ text: 'OK', onPress: closeAlert }]);
      }
    } catch (e) {
      console.log('Error updating status to arrived:', e);
    }
  };

  const handleUpdateSituation = async () => {
    if (!situation.trim()) return;
    setIsSubmitting(true);
    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (!token || !requestId) return;

      const response = await updatePresenceRequest(token, requestId, { description: situation });
      if (response?.success) {
        loadData();
        showAlert('Success', 'Situation updated successfully.', [{ text: 'OK', onPress: closeAlert }]);
      }
    } catch (e) {
      console.log('Error updating situation:', e);
      showAlert('Error', 'Unable to update situation. Please try again.', [{ text: 'OK', onPress: closeAlert }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = () => {
    showAlert(
      'Cancel Request?',
      'Are you sure you want to cancel this presence request?',
      [
        { text: 'No', style: 'cancel', onPress: closeAlert },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive', 
          onPress: async () => {
            closeAlert();
            try {
              const auth = await loadAuth();
              const token = auth?.accessToken;
              if (!token || !requestId) return;

              const response = await cancelPresenceRequest(token, requestId, { reason: 'user_cancelled' });
              if (response?.success) {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
                });
              }
            } catch (e) {
              console.log('Error cancelling request:', e);
            }
          } 
        }
      ]
    );
  };

  const handleContactAuthorities = () => {
    const url = `tel:100`;
    Linking.openURL(url);
  };

  const handleStepAway = () => {
    showAlert(
      'Step Away?',
      'If you step away, you will no longer be part of this presence request. Are you sure?',
      [
        { text: 'Stay', style: 'cancel', onPress: closeAlert },
        { 
          text: 'Yes, Step Away', 
          style: 'destructive', 
          onPress: async () => {
            closeAlert();
            try {
              const auth = await loadAuth();
              const token = auth?.accessToken;
              if (!token || !requestId) return;

              await declinePresence(token, requestId);
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
              });
            } catch (e) {
              console.log('Error stepping away:', e);
              showAlert('Error', 'Could not step away from the request. Please try again.', [{ text: 'OK', onPress: closeAlert }]);
            }
          } 
        }
      ],
      'walk',
      '#FFA500'
    );
  };

  if (isLoading && !request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading meeting details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        onClose={closeAlert}
      />
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Icon name="arrow-left" size={24} color="#5A5A5A" />
        </TouchableOpacity>
        <View style={styles.brandContainer}>
          <Image 
            source={require('../../../../assets/icons/icon-03.png')} 
            style={styles.logoIcon} 
            resizeMode="contain" 
          />
          <Text style={styles.logoText}>Socius</Text>
        </View>
        <View style={styles.presenceActivePill}>
          <Text style={styles.presenceActiveText}>Presence Active</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Map Section */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: request?.location?.coordinates[1] || 27.0,
              longitude: request?.location?.coordinates[0] || 85.0,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            {/* Nearby people (Red dots with glow) */}
            {helpers.map((h, i) => (
              <Marker key={i} coordinate={{ latitude: h.latitude || 27.001, longitude: h.longitude || 85.001 }}>
                <View style={styles.helperMarkerGlow}>
                  <View style={styles.helperMarker} />
                </View>
              </Marker>
            ))}
            {/* Fallback markers for design */}
            {!helpers.length && [1, 2, 3].map(i => (
              <Marker key={`fb-${i}`} coordinate={{ latitude: 27.0 + (i * 0.002), longitude: 85.0 + (i * 0.002) }}>
                <View style={styles.helperMarkerGlow}>
                  <View style={styles.helperMarker} />
                </View>
              </Marker>
            ))}

            {/* Requester (Blue dot with rings) */}
            <Marker coordinate={{ latitude: request?.location?.coordinates[1] || 27.0, longitude: request?.location?.coordinates[0] || 85.0 }}>
              <View style={styles.userMarkerContainer}>
                <View style={styles.userMarkerRing1} />
                <View style={styles.userMarkerRing2} />
                <View style={styles.userMarkerDot}>
                   <Icon name="map-marker" size={16} color="#FFF" />
                </View>
              </View>
            </Marker>
          </MapView>
          
          <View style={styles.topInfoOverlay}>
            <Text style={styles.topInfoTitle}>People nearby are aware</Text>
            <Text style={styles.topInfoSubtitle}>{helpers.length || 0} people nearby</Text>
          </View>
        </View>

        {/* Floating Card Section */}
        <View style={styles.cardSection}>
          <View style={styles.contentCard}>
            <Text style={styles.mainTitle}>{mode === 'requester' ? 'You are not alone' : 'Someone needs presence'}</Text>
            <Text style={styles.subtitle}>People nearby are aware of {mode === 'requester' ? 'your' : 'the'} situation</Text>
            
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{helpers.length > 0 ? `${helpers.length} person${helpers.length > 1 ? 's' : ''} nearby` : 'Waiting for helpers'}</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.avatarRow}>
              {helpers.length > 0 ? (
                helpers.map((h, i) => (
                  <View key={i} style={styles.avatarWrapper}>
                    {h.photo ? (
                      <Image source={{ uri: h.photo }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.placeholderAvatar]}>
                        <Icon name="account" size={24} color="#CBD5E1" />
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.noHelpersText}>No one has accepted yet</Text>
              )}
            </View>
            <View style={styles.nearbyLabelRow}>
              <View style={styles.smallLine} />
              <Text style={styles.nearbyLabelText}>Nearby people</Text>
              <View style={styles.smallLine} />
            </View>
          </View>
        </View>

        {/* Actions Area */}
        <View style={styles.actionsContainer}>
          {mode === 'requester' && (
            <>
              <TextInput 
                style={styles.situationInput}
                placeholder="Share your current situation"
                placeholderTextColor="#A0A0A0"
                value={situation}
                onChangeText={setSituation}
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRepliesScroll}>
                <TouchableOpacity style={styles.replyPill} onPress={() => setSituation("I'm near the gate")}><Text style={styles.replyText}>I'm near the gate</Text></TouchableOpacity>
                <TouchableOpacity style={styles.replyPill} onPress={() => setSituation("I'm inside the building")}><Text style={styles.replyText}>I'm inside the building</Text></TouchableOpacity>
                <TouchableOpacity style={styles.replyPill} onPress={() => setSituation("I need urgent help")}><Text style={styles.replyText}>I need urgent help</Text></TouchableOpacity>
              </ScrollView>

              <TouchableOpacity style={styles.authoritiesButton} onPress={handleContactAuthorities}>
                <Text style={styles.authoritiesText}>Contact Authorities</Text>
              </TouchableOpacity>

              <View style={styles.bottomButtons}>
                <TouchableOpacity 
                  style={[styles.actionButton, isSubmitting && { opacity: 0.6 }]} 
                  onPress={handleUpdateSituation}
                  disabled={isSubmitting}
                >
                  <Text style={styles.actionText}>{isSubmitting ? 'Updating...' : 'Update Situation'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleCancelRequest}>
                  <Text style={styles.actionText}>Cancel Request</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {mode === 'helper' && (
            <>
              <View style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 5 }}>Situation:</Text>
                <View style={{ backgroundColor: '#F1F5F9', padding: 15, borderRadius: 12 }}>
                  <Text style={{ fontSize: 14, color: '#475569' }}>{request?.description || 'Requesting calm presence nearby'}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.authoritiesButton} onPress={handleNearby}>
                <Text style={styles.authoritiesText}>I'm Nearby</Text>
              </TouchableOpacity>

              <View style={styles.bottomButtons}>
                <TouchableOpacity style={styles.actionButton} onPress={handleOpenMaps}>
                  <Text style={styles.actionText}>Open Maps</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleStepAway}>
                  <Text style={styles.actionText}>Step Away</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={styles.safetyBox}>
            <View style={styles.eyeIconBg}>
               <Icon name="eye" size={22} color="#8B4513" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.safetyTitle}>Stay in visible areas.</Text>
              <Text style={styles.safetySub}>Move toward people if possible.</Text>
            </View>
          </View>

          <Text style={styles.controlText}>You remain in control. Others respond voluntarily.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 64,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 32,
    height: 32,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
    letterSpacing: -0.5,
  },
  presenceActivePill: {
    backgroundColor: '#F1635C',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#F1635C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  presenceActiveText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  mapContainer: {
    height: 230,
    width: '100%',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  topInfoOverlay: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  topInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  topInfoSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  helperMarkerGlow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(241, 99, 92, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1635C',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerRing1: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  userMarkerRing2: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  userMarkerDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  cardSection: {
    paddingHorizontal: 16,
    marginTop: -45, // Overlap the map
  },
  contentCard: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#212121',
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 6,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1.2,
    backgroundColor: '#F0F0F0',
  },
  dividerText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginHorizontal: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    minHeight: 50,
    alignItems: 'center',
  },
  avatarWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: -6,
  },
  noHelpersText: {
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#FFF',
    backgroundColor: '#F1F5F9',
  },
  placeholderAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  nearbyLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  smallLine: {
    width: 14,
    height: 1,
    backgroundColor: '#EEE',
  },
  nearbyLabelText: {
    fontSize: 12,
    color: '#BBB',
    marginHorizontal: 10,
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  situationInput: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    borderRadius: 16,
    height: 50,
    paddingHorizontal: 18,
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
  },
  quickRepliesScroll: {
    paddingBottom: 10,
  },
  replyPill: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    borderRadius: 25,
    paddingHorizontal: 18,
    height: 38,
    justifyContent: 'center',
    marginRight: 5,
  },
  replyText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  authoritiesButton: {
    backgroundColor: '#F1635C',
    borderRadius: 16,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#F1635C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  authoritiesText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
  },
  actionText: {
    color: '#F1635C',
    fontSize: 14,
    fontWeight: '600',
  },
  safetyBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE082',
    marginBottom: 8
  },
  eyeIconBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFECC2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  safetyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B4513',
  },
  safetySub: {
    fontSize: 14,
    color: '#8B4513',
  },
  controlText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#AAA',
    marginTop: 8,
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NearbyMapScreen;


import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Alert, Dimensions, ScrollView, Image, Animated, NativeModules } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import { useResponsive } from '../../../utils/responsive';
import { getHelpRequestById, closeHelpRequest } from '../../../services/api/incident.api';
import { loadAuth } from '../../../services/storage/asyncStorage.service';
import { baseURL } from '../../../services/api/client';

const { width, height } = Dimensions.get('window');

import { getSocket, connectSocket } from '../../../services/socket/socket.service';
import { getSessionByRequest, getMessages, markMessagesRead } from '../../../services/api/chat.api';
import ChatModal from '../../../components/common/ChatModal';
import CustomAlert from '../../../components/common/CustomAlert';
import { buildClosureInitiatedCopy, buildRequestClosedCopy } from '../../../utils/closureMessages';

const MatchingMapScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const prefillRequest = route?.params?.prefillRequest || null;
  const [loading, setLoading] = useState(!prefillRequest);
  const [request, setRequest] = useState(prefillRequest);
  const [chatVisible, setChatVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

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
  
  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showToast = (message) => {
    if (Platform.OS === 'android') {
       try {
         NativeModules.SociusCallModule?.playMessageSound?.();
       } catch (e) {
         console.log('Sound error:', e);
       }
    }
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(1000), // Visible for 1 second
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  const mapRef = useRef(null);
  const chatVisibleRef = useRef(chatVisible);
  const requestId = route?.params?.requestId;

  // Keep ref in sync with state
  useEffect(() => {
    chatVisibleRef.current = chatVisible;
    if (chatVisible) {
      setUnreadCount(0);
    }
  }, [chatVisible]);

  const getProfileImage = (path) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('https')) return { uri: path };
    const apiRoot = baseURL.replace(/\/api\/?$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const uri = `${apiRoot}${cleanPath}`;
    console.log('Profile Image URI (Receive):', uri, 'from path:', path);
    return { uri };
  };

  const handleOpenMaps = () => {
    if (request?.location?.coordinates) {
      const [longitude, latitude] = request.location.coordinates;
      const label = request.description || 'Help Request';
      const url = Platform.select({
        ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
        android: `geo:0,0?q=${latitude},${longitude}(${label})`,
      });
      Linking.openURL(url);
    }
  };

  const handleCompleteHelp = async () => {
    // Navigate to a closure screen for feedback and completion
    navigation.navigate('ThankYouClosing', { requestId });
  };

  const handleMessage = () => {
    setChatVisible(true);
  };

  useEffect(() => {
    const loadRequest = async () => {
      if (!requestId) {
        showAlert('Error', 'No request ID provided', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        return;
      }

      try {
        if (!prefillRequest) {
          setLoading(true);
        }
        const auth = await loadAuth();
        const token = auth?.accessToken;
        if (!token) {
             showAlert('Not signed in', 'Please sign in again.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
             return;
        }

        const response = await getHelpRequestById(token, requestId);
        if (response?.success && response?.data?.request) {
          const reqData = response.data.request;
          // Merge volunteer if available (even if user is volunteer)
          if (response.data.volunteer) {
             reqData.volunteer = response.data.volunteer;
          }
          setRequest(reqData);
        } else {
           showAlert('Error', 'Could not load request details');
        }
      } catch (error) {
        console.error('Error loading request:', error);
        showAlert('Error', 'Failed to load request');
      } finally {
        setLoading(false);
      }
    };

    loadRequest();
  }, [requestId]);

  useEffect(() => {
    if (request && !loading) {
      const status = String(request.status || '').toLowerCase();
      const activeStatuses = ['accepted', 'in_progress', 'matched', 'en_route', 'arrived', 'active'];
      if (!activeStatuses.includes(status)) {
        showAlert(
          'Request Unavailable',
          'This request is no longer active.',
          [
            {
              text: 'OK',
              onPress: () => {
                closeAlert();
                navigation.goBack();
              }
            }
          ],
          'alert-circle-outline',
          '#DC5C69'
        );
      }
    }
  }, [request, loading, navigation]);

  useEffect(() => {
    const initChat = async () => {
      if (!requestId) return;
      try {
        const auth = await loadAuth();
        const token = auth?.accessToken;
        const userId = auth?.userId;
        setCurrentUserId(userId);

        if (token) {
          const sessionRes = await getSessionByRequest(token, requestId);
          if (sessionRes?.success && sessionRes?.data) {
            const session = sessionRes.data;
            setSessionId(session._id);

            const msgsRes = await getMessages(token, session._id);
            if (msgsRes?.success && Array.isArray(msgsRes.data)) {
              // Count unread messages from the other user
              const unread = msgsRes.data.filter(
                m => m.senderId !== userId && !m.isRead && !m.read
              ).length;
              console.log('Unread count calculation:', {
                total: msgsRes.data.length,
                userId,
                unread,
                sample: msgsRes.data.slice(0, 3).map(m => ({ id: m._id, sender: m.senderId, read: m.isRead }))
              });
              setUnreadCount(unread);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing chat badge:', error);
      }
    };

    initChat();
  }, [requestId]);

  useEffect(() => {
    let isMounted = true;
    let socket;

    const handleNewMessage = (data) => {
      if (data.sessionId === sessionId) {
        const message = data.message || {};
        // Only increment if message is NOT from current user
        if (currentUserId && message.senderId && message.senderId !== currentUserId) {
            if (!chatVisibleRef.current) {
               setUnreadCount(prev => prev + 1);
               // Show toast with message content
               showToast(message.content || message.text || 'New message');
            }
        }
      }
    };

    const handleReadConfirmed = (data) => {
      if (data.sessionId === sessionId) {
        // If messages are read (by me or anyone else in this session?), reset count
        // Actually, read_confirmed means the OTHER person read it?
        // No, if *I* read it on another device, I should receive something?
        // Server emits chat:read_confirmed to room.
        // If I read it, it emits to room.
        // So if I receive read_confirmed, it might be my own read action.
        // But usually we just want to reset unread count if we read it.
        // If the event implies that messages in this session are now read, we can re-evaluate or reset.
        // But wait, if the OTHER person reads MY messages, I get read_confirmed. My unread count shouldn't change (it tracks messages I haven't read).
        // So this event might be for "Your message was read".
        
        // We need an event "I read the message".
        // When ChatModal calls markRead, it emits 'chat:mark_read'.
        // Server processes it and emits 'chat:read_confirmed'.
        // So if I receive 'chat:read_confirmed', it means SOMEONE read messages.
        // The data usually contains { sessionId, userId (who read it), ... }
        // We need to check the event payload structure.
      }
    };

    const setupSocket = async () => {
      const s = await connectSocket();
      if (isMounted && s) {
        socket = s;
        socket.on('chat:new_message', handleNewMessage);
      }
    };

    if (sessionId) {
      setupSocket();
    }

    // Fixed View structure
  return () => {
      isMounted = false;
      if (socket) {
        socket.off('chat:new_message', handleNewMessage);
      }
    };
  }, [sessionId, currentUserId]);

  useEffect(() => {
    let isMounted = true;
    let socket;

    const handleClosureInitiated = (data) => {
      if (!isMounted) return;
      if (String(data?.requestId) !== String(requestId)) return;

      const initiatedBy = String(data?.initiatedBy || '');
      if (initiatedBy === 'requester') {
        const copy = buildClosureInitiatedCopy({
          requestId,
          requestType: data?.requestType || 'Help request',
          initiatedBy: data?.initiatedBy,
          occurredAt: data?.occurredAt,
        });
        showAlert(
          copy.title,
          copy.message,
          [
            {
              text: 'Complete closure',
              onPress: () => {
                closeAlert();
                navigation.navigate('ThankYouClosing', { requestId });
              },
              style: 'primary',
            },
            { text: 'Later', onPress: closeAlert, style: 'cancel' },
          ],
          'alert-circle-outline',
          '#DC5C69'
        );
      }
    };

    const handleRequestClosed = (data) => {
      if (!isMounted) return;
      if (String(data?.requestId) !== String(requestId)) return;
      const copy = buildRequestClosedCopy({
        requestId,
        requestType: data?.requestType || 'Help request',
        reason: data?.reason,
        occurredAt: data?.occurredAt,
      });
      showAlert(
        copy.title,
        copy.message,
        [
          {
            text: 'OK',
            onPress: () => {
              closeAlert();
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
              });
            },
            style: 'primary',
          },
        ],
        'check-circle',
        '#28C76F'
      );
    };

    const setupSocket = async () => {
      const s = await connectSocket();
      if (isMounted && s) {
        socket = s;
        socket.on('help:closure_initiated', handleClosureInitiated);
        socket.on('help:request_closed', handleRequestClosed);
      }
    };

    if (requestId) {
      setupSocket();
    }

    return () => {
      isMounted = false;
      if (socket) {
        socket.off('help:closure_initiated', handleClosureInitiated);
        socket.off('help:request_closed', handleRequestClosed);
      }
    };
  }, [requestId, navigation]);

  const showInitialLoading = loading && !request;

  const initialRegion = request?.location?.coordinates ? {
    latitude: request.location.coordinates[1],
    longitude: request.location.coordinates[0],
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  // Render Screen
  const statusForChat = String(request?.status || '').toLowerCase();
  const isChatAllowed = ['accepted', 'in_progress', 'matched', 'en_route', 'arrived', 'active'].includes(statusForChat);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
       <Header 
        onBackPress={() => navigation.goBack()}
        title="Meeting Details"
        style={{ borderBottomWidth: 1, borderBottomColor: '#E8EAED', backgroundColor: '#fff', zIndex: 10 }}
        rightComponent={
           sessionId && isChatAllowed && (
           <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
             <Icon name="message-text-outline" size={24} color="#DC5C69" />
             {unreadCount > 0 && (
               <View style={styles.badge}>
                 <Text style={styles.badgeText}>
                   {unreadCount > 99 ? '99+' : unreadCount}
                 </Text>
               </View>
             )}
           </TouchableOpacity>
           )
        }
      />
      <ScrollView style={{flex: 1}} contentContainerStyle={{flexGrow: 1}}>
        <View style={styles.contentContainer}>
        
        {/* Map Card */}
        <View style={styles.mapCard}>
          <View style={styles.mapPreviewContainer}>
            {showInitialLoading ? (
              <View style={[styles.mapPreview, { backgroundColor: '#E5E7EB' }]} />
            ) : (
              <MapView
                ref={mapRef}
                style={styles.mapPreview}
                provider={PROVIDER_GOOGLE}
                initialRegion={initialRegion}
                showsUserLocation={true}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
              >
                {request?.location?.coordinates && (
                  <Marker
                    coordinate={{
                      latitude: request.location.coordinates[1],
                      longitude: request.location.coordinates[0],
                    }}
                    title="Help Request"
                    description={request.description}
                  >
                    <Icon name="map-marker" size={40} color="#DC5C69" />
                  </Marker>
                )}
              </MapView>
            )}
            <View style={styles.locationOverlay}>
              <Icon name="map-marker" size={16} color="#DC5C69" style={{marginRight: 4}} />
              <Text style={styles.locationText}>
                {showInitialLoading ? 'Loading…' : (request?.location?.address || "Downtown Plaza")}
              </Text>
            </View>
          </View>
          <Text style={styles.privacyText}>
            Location shared voluntarily for this request only.
          </Text>
        </View>

        {/* Where to Find Them Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Where to Find Them</Text>
          <View style={styles.cardContentRow}>
            {showInitialLoading ? (
              <View style={{ flex: 1 }}>
                <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 8, marginBottom: 8 }} />
                <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 8, width: '70%' }} />
              </View>
            ) : (
              <Text style={styles.cardDescription}>
                {request?.description || "Standing near the main entrance, beside the security desk."}
              </Text>
            )}
            <View style={styles.illustrationContainer}>
               <Icon name="door-sliding" size={60} color="#8B6F47" />
            </View>
          </View>
        </View>

        {/* Profile Cards */}
        <View style={styles.profilesContainer}>
          <View style={styles.profileCard}>
            <View style={[styles.profileImageContainer, { backgroundColor: '#E0E0E0' }]}>
               {request?.volunteer?.profileImage ? (
                  <Image 
                    source={getProfileImage(request?.volunteer?.profileImage)} 
                    style={styles.profileImage}
                    resizeMode="cover"
                    onError={(e) => console.log('Image Load Error (Volunteer):', e.nativeEvent.error)}
                    onLoad={() => console.log('Image Loaded (Volunteer)')}
                  />
               ) : (
                  <Icon name="account-circle" size={60} color="#777" />
               )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>You</Text>
              <Text style={styles.profileRole}>You</Text>
            </View>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.profileImageContainer}>
               {request?.user?.profileImage || request?.requesterId?.profileImage ? (
                  <Image 
                    source={getProfileImage(request?.user?.profileImage || request?.requesterId?.profileImage)} 
                    style={styles.profileImage}
                    resizeMode="cover"
                    onError={(e) => console.log('Image Load Error (User):', e.nativeEvent.error)}
                    onLoad={() => console.log('Image Loaded (User)')}
                  />
               ) : (
                  <Icon name="account" size={60} color="#FFF" />
               )}
            </View>
            <View style={styles.profileInfo}>
            {showInitialLoading && !request?.user && !request?.requesterId ? (
              <>
                <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 8, marginBottom: 8 }} />
                <View style={{ height: 10, backgroundColor: '#E5E7EB', borderRadius: 8, width: '60%' }} />
              </>
            ) : (
              <>
                <Text style={styles.profileName}>
                  {request?.user?.name || request?.user?.firstName || request?.requesterId?.fullName || "Requester"}
                </Text>
                <Text style={styles.profileRole}>Needs help</Text>
              </>
            )}
          </View>
          </View>
        </View>

        <Text style={styles.sharedInfoText}>
          Names and photos are shared so you can recognize each other.
        </Text>

        {/* Safety Info Box */}
        <View style={styles.safetyInfoBox}>
          <Icon name="information" size={20} color="#8B6F47" style={{marginRight: 10}} />
          <Text style={styles.safetyInfoText}>
            You are not required to stay, speak, or proceed if you feel uncomfortable.
          </Text>
        </View>

        {/* Bottom Buttons */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleOpenMaps}
            accessibilityRole="button"
            accessibilityLabel="Open navigation"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="navigation-variant-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryButtonText}>Open Navigation</Text>
            </View>
            <Text style={styles.primaryButtonSubtext}>Opens your maps app</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleCompleteHelp}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Complete request"
            accessibilityState={{ disabled: !!submitting }}
          >
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <Icon name="check-circle-outline" size={18} color="#666" style={{ marginRight: 8 }} />
               <Text style={styles.secondaryButtonText}>{submitting ? "Completing..." : "Complete Request"}</Text>
             </View>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>
      <ChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        requestId={requestId}
        otherUserName={request?.user?.name}
      />
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        onClose={closeAlert}
      />
      {/* Toast Notification */}
      <Animated.View style={[
        styles.toastContainer,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0]
            })
          }]
        }
      ]} pointerEvents="none">
        <View style={styles.toastContent}>
          <Icon name="message-text" size={20} color="#DC5C69" style={{marginRight: 8}} />
          <Text style={styles.toastText} numberOfLines={1}>
            {toastMessage}
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50, // Below header
    right: 16,
    zIndex: 100,
    maxWidth: 250,
  },
  toastContent: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    maxWidth: 180,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 32,
  },
  mapCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 0,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  mapPreviewContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
  },
  mapPreview: {
    width: '100%',
    height: '100%',
  },
  locationOverlay: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  privacyText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#888',
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16, // Reduced from 20
    marginBottom: 16, // Reduced from 20
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16, // Reduced from 18
    fontWeight: '700',
    color: '#A83A30', // Dark Red/Brown
    marginBottom: 12, // Reduced from 16
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardDescription: {
    flex: 1,
    fontSize: 15, // Reduced from 16
    color: '#444',
    lineHeight: 22, // Reduced from 24
    marginRight: 16,
  },
  illustrationContainer: {
    width: 60, // Reduced from 80
    height: 60, // Reduced from 80
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  profilesContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16, // Reduced from 20
  },
  profileCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 10, // Reduced from 12
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileImageContainer: {
    width: '100%',
    height: 120, // Fixed height instead of aspectRatio: 1
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    marginBottom: 8, // Reduced from 12
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: 4,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
    textAlign: 'center',
  },
  profileRole: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    width: '100%',
    paddingTop: 8,
    marginTop: 4,
  },
  sharedInfoText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  safetyInfoBox: {
    backgroundColor: '#FFF8F0', // Light Beige
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#F0E6D8',
  },
  safetyInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#6B5B45', // Brownish text
    lineHeight: 20,
  },
  bottomContainer: {
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#DC5C69', // Socius Red
    borderRadius: 28,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC5C69',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  primaryButtonSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
  },
  secondaryButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF0F1',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default MatchingMapScreen;

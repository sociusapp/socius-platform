import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { resolvePresenceScreenMode } from '../../../../utils/presenceRole';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Image,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { cancelPresenceRequest, closePresenceRequest, getActivePresenceRequest, getPresenceById, updatePresenceStatus, updatePresenceRequest, declinePresence } from '../../../../services/api/needPresence.api';
import { loadAuth } from '../../../../services/storage/asyncStorage.service';
import { requestLocationPermission, getCurrentPosition } from '../../../../services/location/geolocation.service';
import { connectSocket, appEvents } from '../../../../services/socket/socket.service';
import { baseURL as apiBaseURL } from '../../../../services/api/client';
import CustomAlert from '../../../../components/common/CustomAlert';
import CancelRequestModal from './CancelRequestModal';
import ChatModal from '../../../../components/common/ChatModal';
import { getSessionByRequest } from '../../../../services/api/chat.api';
import {
  PresenceBottomMaterialBar,
  PresenceMaterialNavItem,
  presenceMaterialNavStyles,
} from '../../components/PresenceMaterialNavBar';

const NearbyMapScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { requestId } = route?.params || {};
  const paramMode = route?.params?.mode;
  
  const [request, setRequest] = useState(null);
  const [requester, setRequester] = useState(null);
  const [helpers, setHelpers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [situation, setSituation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatMinimizedUnread, setChatMinimizedUnread] = useState(0);
  const [presenceChatSessionId, setPresenceChatSessionId] = useState(null);
  
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
  const chatVisibleRef = useRef(false);
  const currentUserIdRef = useRef(null);
  const presenceToastFade = useRef(new Animated.Value(0)).current;
  const presenceToastAnimRef = useRef(null);

  const [presenceLeaveToast, setPresenceLeaveToast] = useState(null);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const showPresenceLeaveToast = useCallback((data) => {
    const fullName = String(data?.fullName || '').trim() || 'Someone';
    const reason = data?.reason === 'declined' ? 'declined' : 'stepped_away';
    const subtitle =
      reason === 'declined' ? 'Declined to help' : 'Stepped away from this presence';

    const apiRoot = apiBaseURL.replace(/\/api\/?$/, '');
    let photoUrl = null;
    const p = data?.profileImage;
    if (p) {
      photoUrl = p.startsWith('http') ? p : `${apiRoot}${p.startsWith('/') ? '' : '/'}${p}`;
    }

    setPresenceLeaveToast({ fullName, subtitle, photoUrl });

    if (presenceToastAnimRef.current?.stop) presenceToastAnimRef.current.stop();
    presenceToastFade.setValue(0);
    presenceToastAnimRef.current = Animated.sequence([
      Animated.timing(presenceToastFade, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.delay(3200),
      Animated.timing(presenceToastFade, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]);
    presenceToastAnimRef.current.start(({ finished }) => {
      if (finished) setPresenceLeaveToast(null);
    });
  }, [presenceToastFade, apiBaseURL]);

  const showPresenceLeaveToastRef = useRef(showPresenceLeaveToast);
  showPresenceLeaveToastRef.current = showPresenceLeaveToast;

  const screenMode = useMemo(
    () => resolvePresenceScreenMode(request, currentUserId, paramMode),
    [request, currentUserId, paramMode],
  );

  const subscribeChatWhileMinimized =
    (screenMode === 'requester' && helpers.length > 0) || screenMode === 'helper';

  useEffect(() => {
    chatVisibleRef.current = chatVisible;
  }, [chatVisible]);

  useEffect(() => {
    if (chatVisible) setChatMinimizedUnread(0);
  }, [chatVisible]);

  useEffect(() => {
    let cancelled = false;
    if (!requestId || !subscribeChatWhileMinimized) {
      setPresenceChatSessionId(null);
      return;
    }
    (async () => {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (!token || cancelled) return;
      try {
        const res = await getSessionByRequest(token, requestId);
        if (cancelled) return;
        const session = res?.success ? res.data : null;
        const sid = session?._id != null ? String(session._id) : null;
        setPresenceChatSessionId(sid);
      } catch {
        if (!cancelled) setPresenceChatSessionId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId, subscribeChatWhileMinimized]);

  useEffect(() => {
    if (!presenceChatSessionId || currentUserId == null || currentUserId === '') return;

    let cancelled = false;
    let activeSocket = null;
    const handler = (data) => {
      if (!data || String(data.sessionId) !== String(presenceChatSessionId)) return;
      if (chatVisibleRef.current) return;
      const msg = data.message;
      const sender = msg?.senderId?._id ?? msg?.senderId;
      if (String(sender) === String(currentUserId)) return;
      setChatMinimizedUnread((c) => Math.min(c + 1, 999));
    };

    connectSocket().then((socket) => {
      if (cancelled || !socket) return;
      activeSocket = socket;
      socket.on('chat:new_message', handler);
    });

    return () => {
      cancelled = true;
      if (activeSocket) activeSocket.off('chat:new_message', handler);
    };
  }, [presenceChatSessionId, currentUserId]);

  const chatPeerName = useMemo(() => {
    if (screenMode === 'helper') {
      const r = request?.requesterId;
      if (typeof r === 'object' && r?.fullName) return r.fullName;
      return 'Someone nearby';
    }
    if (helpers.length === 1) return helpers[0].name;
    if (helpers.length > 1) return `Nearby helpers (${helpers.length})`;
    return 'Helper';
  }, [screenMode, request, helpers]);

  const handleOpenPresenceChat = useCallback(() => {
    if (screenMode === 'requester' && helpers.length === 0) {
      showAlert(
        'Message',
        'When someone accepts your presence request, you can chat with them here.',
        [{ text: 'OK', onPress: closeAlert }],
      );
      return;
    }
    setChatVisible(true);
  }, [screenMode, helpers.length]);

  useEffect(() => {
    const onOpenChat = (payload) => {
      if (payload?.requestId != null && String(payload.requestId) === String(requestId)) {
        setChatVisible(true);
      }
    };
    appEvents.on('open_chat', onOpenChat);
    return () => appEvents.off('open_chat', onOpenChat);
  }, [requestId]);

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

        const handleHelperLeft = (data) => {
          if (String(data?.presenceRequestId || data?.requestId) !== String(requestId)) return;
          loadData();
          if (String(data?.helperId) === String(currentUserIdRef.current)) return;
          showPresenceLeaveToastRef.current?.(data);
        };

        // Listen to all relevant events for instant updates
        socket.on('presence:accepted', handleUpdate);
        socket.on('presence:status_updated', handleUpdate);
        socket.on('presence:helper_joined', handleUpdate);
        socket.on('presence:helper_left', handleHelperLeft);
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

  const executeCancelPresence = async (selectedReason) => {
    setCancelModalVisible(false);
    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (!token || !requestId) return;

      const response = await cancelPresenceRequest(token, requestId, {
        reason: selectedReason || 'user_cancelled',
      });
      if (response?.success) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
        });
      }
    } catch (e) {
      console.log('Error cancelling request:', e);
    }
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
      {presenceLeaveToast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.presenceLeaveToastWrap,
            {
              top: insets.top + 52,
              opacity: presenceToastFade,
              transform: [
                {
                  translateY: presenceToastFade.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.presenceLeaveToastCard}>
            {presenceLeaveToast.photoUrl ? (
              <Image
                source={{ uri: presenceLeaveToast.photoUrl }}
                style={styles.presenceLeaveToastAvatar}
              />
            ) : (
              <View style={[styles.presenceLeaveToastAvatar, styles.presenceLeaveToastAvatarPh]}>
                <Icon name="account" size={22} color="#64748B" />
              </View>
            )}
            <View style={styles.presenceLeaveToastTextCol}>
              <Text style={styles.presenceLeaveToastName} numberOfLines={1}>
                {presenceLeaveToast.fullName}
              </Text>
              <Text style={styles.presenceLeaveToastSub} numberOfLines={2}>
                {presenceLeaveToast.subtitle}
              </Text>
            </View>
          </View>
        </Animated.View>
      ) : null}
      <CancelRequestModal
        visible={cancelModalVisible}
        onClose={() => setCancelModalVisible(false)}
        onConfirm={(reason) => void executeCancelPresence(reason)}
      />
      {/* Header: back | centered Socius | status (matches requester "presence active" mock) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerSideBtn}>
          <Icon name="arrow-left" size={24} color="#5A5A5A" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitleCenter}>Socius</Text>
        </View>
        <View style={[styles.presenceActivePill, styles.headerSidePill]}>
          <Text style={styles.presenceActiveText}>Presence Active</Text>
        </View>
      </View>

      <ScrollView
        style={screenMode === 'requester' ? styles.scrollFlex : undefined}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
              <Marker key={h.id || i} coordinate={{ latitude: h.latitude || 27.001, longitude: h.longitude || 85.001 }}>
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
            <Text style={styles.mainTitle}>{screenMode === 'requester' ? 'You are not alone' : 'Someone needs presence'}</Text>
            <Text style={styles.subtitle}>People nearby are aware of {screenMode === 'requester' ? 'your' : 'the'} situation</Text>
            
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
                        <Icon name="account" size={22} color="#CBD5E1" />
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
          {screenMode === 'requester' && (
            <>
              <Text style={styles.situationContextLabel}>What others see</Text>
              <TextInput
                style={styles.situationInput}
                placeholder="Share your current situation"
                placeholderTextColor="#A0A0A0"
                value={situation}
                onChangeText={setSituation}
                multiline
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRepliesScroll}>
                <TouchableOpacity style={styles.replyPill} onPress={() => setSituation("I'm near the gate")}><Text style={styles.replyText}>I'm near the gate</Text></TouchableOpacity>
                <TouchableOpacity style={styles.replyPill} onPress={() => setSituation("I'm inside the building")}><Text style={styles.replyText}>I'm inside the building</Text></TouchableOpacity>
                <TouchableOpacity style={styles.replyPill} onPress={() => setSituation("I need urgent help")}><Text style={styles.replyText}>I need urgent help</Text></TouchableOpacity>
              </ScrollView>

              <TouchableOpacity
                style={[styles.actionButton, styles.updateSituationWide, isSubmitting && { opacity: 0.6 }]}
                onPress={handleUpdateSituation}
                disabled={isSubmitting}
              >
                <Text style={styles.actionText}>
                  {isSubmitting ? 'Updating...' : 'Update Situation'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {screenMode === 'helper' && (
            <>
              <View style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 5 }}>Situation:</Text>
                <View style={{ backgroundColor: '#F1F5F9', padding: 15, borderRadius: 12 }}>
                  <Text style={{ fontSize: 14, color: '#475569' }}>{request?.description || 'Requesting calm presence nearby'}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.actionButton, styles.helperMessageBtn]}
                onPress={handleOpenPresenceChat}
              >
                <Text style={styles.actionText}>Message</Text>
                {chatMinimizedUnread > 0 ? (
                  <View style={styles.helperMessageBadge} accessibilityLabel={`${chatMinimizedUnread} unread`}>
                    <Text style={styles.helperMessageBadgeText}>
                      {chatMinimizedUnread > 99 ? '99+' : String(chatMinimizedUnread)}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>

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
               <Icon name="eye" size={20} color="#8B4513" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.safetyTitle}>Stay in visible areas.</Text>
              <Text style={styles.safetySub}>Move toward people if possible.</Text>
            </View>
          </View>

          <Text style={styles.controlText}>You remain in control. Others respond voluntarily.</Text>
        </View>
      </ScrollView>

      {screenMode === 'requester' && (
        <PresenceBottomMaterialBar paddingBottom={Math.max(insets.bottom, 8)}>
          <PresenceMaterialNavItem
            onPress={() => navigation.navigate('EmergencyHelp', { returnWithBack: true })}
            icon="phone-alert"
            iconColor="#C62828"
            label="Authorities"
            accessibilityLabel="Contact authorities"
            iconBg="rgba(198, 40, 40, 0.12)"
          />
          <PresenceMaterialNavItem
            onPress={() => navigation.navigate('EmergencyContacts')}
            icon="account-multiple-outline"
            iconColor="#5C4C7C"
            label="Contacts"
            accessibilityLabel="Emergency contacts"
            iconBg="rgba(103, 80, 164, 0.10)"
          />
          <PresenceMaterialNavItem
            onPress={handleOpenPresenceChat}
            icon="message-text-outline"
            iconColor="#0D9488"
            label="Message"
            accessibilityLabel="Open chat with nearby helpers"
            iconBg="rgba(13, 148, 136, 0.12)"
            badgeCount={chatMinimizedUnread}
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
          <PresenceMaterialNavItem
            onPress={() => setCancelModalVisible(true)}
            icon="close"
            iconColor="#49454F"
            label="Close"
            accessibilityLabel="Close presence request"
            iconBg="rgba(73, 69, 79, 0.08)"
          />
        </PresenceBottomMaterialBar>
      )}

      <ChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        requestId={requestId}
        otherUserName={chatPeerName}
      />
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
    paddingHorizontal: 12,
    minHeight: 54,
    paddingVertical: 6,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  headerSideBtn: {
    padding: 4,
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleCenter: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    letterSpacing: -0.3,
  },
  headerSidePill: {
    maxWidth: '38%',
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
  scrollFlex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
    flexGrow: 1,
  },
  mapContainer: {
    height: 168,
    width: '100%',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  topInfoOverlay: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  topInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textShadowColor: 'rgba(255, 255, 255, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  topInfoSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
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
    marginTop: -38,
  },
  contentCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 17,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    color: '#212121',
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
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
    marginHorizontal: 10,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
    minHeight: 46,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
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
    marginBottom: 0,
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
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  situationContextLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  situationInput: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    borderRadius: 14,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
    textAlignVertical: 'top',
  },
  quickRepliesScroll: {
    paddingBottom: 6,
  },
  replyPill: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 34,
    justifyContent: 'center',
    marginRight: 6,
  },
  replyText: {
    fontSize: 12,
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
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 14,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
  },
  updateSituationWide: {
    flex: 0,
    width: '100%',
    marginBottom: 2,
    marginTop: 2,
  },
  helperMessageBtn: {
    flex: 0,
    width: '100%',
    marginBottom: 12,
    overflow: 'visible',
    position: 'relative',
  },
  helperMessageBadge: {
    position: 'absolute',
    top: 6,
    right: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  helperMessageBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  actionText: {
    color: '#F1635C',
    fontSize: 14,
    fontWeight: '600',
  },
  safetyBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE082',
    marginBottom: 4,
    marginTop: 4,
  },
  eyeIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFECC2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  safetyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B4513',
  },
  safetySub: {
    fontSize: 12,
    color: '#8B4513',
  },
  controlText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#AAA',
    marginTop: 4,
    marginBottom: 4,
  },
  presenceLeaveToastWrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 200,
    alignItems: 'center',
  },
  presenceLeaveToastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    maxWidth: 400,
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 6 },
    }),
  },
  presenceLeaveToastAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
  },
  presenceLeaveToastAvatarPh: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  presenceLeaveToastTextCol: {
    flex: 1,
    minWidth: 0,
  },
  presenceLeaveToastName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  presenceLeaveToastSub: {
    marginTop: 2,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NearbyMapScreen;


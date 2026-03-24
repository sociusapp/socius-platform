import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Alert, Dimensions, ScrollView, Image, Animated, NativeModules, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
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
  const [refreshing, setRefreshing] = useState(false);
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
  const perf = route?.params?.perf;
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
    console.log('Profile Image URI (Request):', uri, 'from path:', path);
    return { uri };
  };

  const handleOpenMaps = async () => {
    try {
      if (!request?.location?.coordinates) return;
      const [longitude, latitude] = request.location.coordinates;
      const label = request.description || 'Help Request';

      const lat = Number(latitude);
      const lng = Number(longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      if (Platform.OS === 'android') {
        const navUrl = `google.navigation:q=${lat},${lng}`;
        const canOpenNav = await Linking.canOpenURL(navUrl);
        if (canOpenNav) {
          await Linking.openURL(navUrl);
          return;
        }

        const web = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          `${lat},${lng}`
        )}&destination_place_id=&travelmode=walking`;
        await Linking.openURL(web);
        return;
      }

      const googleMaps = `comgooglemaps://?daddr=${encodeURIComponent(`${lat},${lng}`)}&directionsmode=walking`;
      const canOpenGoogleMaps = await Linking.canOpenURL(googleMaps);
      if (canOpenGoogleMaps) {
        await Linking.openURL(googleMaps);
        return;
      }

      const appleMaps = `http://maps.apple.com/?daddr=${encodeURIComponent(`${lat},${lng}`)}&q=${encodeURIComponent(label)}`;
      await Linking.openURL(appleMaps);
    } catch (e) {
      showAlert('Unable to open maps', 'Please install Google Maps or try again.', [{ text: 'OK', onPress: closeAlert }]);
    }
  };

  const handleCloseRequest = async () => {
    navigation.navigate('ClosingRequest', {
      requestId: request?.id || request?._id || requestId,
    });
  };

  const refreshRequestDetails = useCallback(async () => {
    if (!requestId) return false;
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );
      const auth = await loadAuth();
      if (!auth?.accessToken) return false;

      const fetchPromise = getHelpRequestById(auth.accessToken, requestId);
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!mountedRef.current) return false;
      if (response?.success && response?.data) {
        const requestData = response.data.request || response.data;
        const volunteerData = response.data.volunteer || requestData.volunteer;
        setRequest((prev) => ({
          ...prev,
          ...requestData,
          volunteer: volunteerData,
          status: requestData.status,
        }));

        getSessionByRequest(auth.accessToken, requestId)
          .then((sessionRes) => {
            if (mountedRef.current && sessionRes?.success && sessionRes?.data) {
              setSessionId(sessionRes.data._id);
            }
          })
          .catch(() => {});
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }, [requestId]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await refreshRequestDetails();
    if (mountedRef.current) setRefreshing(false);
  }, [refreshRequestDetails, refreshing]);

  const handleCancelRequest = () => {
    const rid = request?.id || request?._id || requestId;
    if (!rid) {
      showAlert('Error', 'Request ID missing.', [{ text: 'OK', onPress: closeAlert }]);
      return;
    }
    showAlert(
      'Cancel Request',
      'Are you sure you want to cancel this request?',
      [
        { text: 'Stay Here', style: 'cancel', onPress: closeAlert },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: () => {
            closeAlert();
            navigation.navigate('CancelRequest', { requestId: rid });
          },
        },
      ],
      'alert-circle-outline',
      '#DC5C69'
    );
  };

  const handleMessage = async () => {
    if (sessionId) {
      setChatVisible(true);
    } else {
      // Try to fetch session again
      try {
        const auth = await loadAuth();
        const token = auth?.accessToken;
        if (token && requestId) {
          const sessionRes = await getSessionByRequest(token, requestId);
          if (sessionRes?.success && sessionRes?.data) {
            const session = sessionRes.data;
            setSessionId(session._id);
            setChatVisible(true);
          } else {
            showAlert('Error', 'Chat session not available yet. Please try again.', [{ text: 'OK', onPress: closeAlert }]);
          }
        }
      } catch (error) {
        console.error('Error fetching session on click:', error);
        showAlert('Error', 'Failed to open chat.', [{ text: 'OK', onPress: closeAlert }]);
      }
    }
  };

  // Initial load of request details
  useEffect(() => {
    if (perf?.t0) {
      const dt = Date.now() - Number(perf.t0);
      console.log('[Perf] MeetingDetails render', `${dt}ms`, perf?.source || '');
    }
    let isMounted = true;
    
    const loadRequest = async () => {
      if (!requestId) {
        setLoading(false);
        showAlert('Error', 'Request ID missing.', [{ 
          text: 'Go Back', 
          onPress: () => navigation.navigate('MainApp', { screen: 'HomeTab' }) 
        }]);
        return;
      }
      
      try {
        setLoading(true);
        
        // Safety timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        );

        const auth = await loadAuth();
        if (!auth?.accessToken) return;
        
        const fetchPromise = getHelpRequestById(auth.accessToken, requestId);
        
        // Race between fetch and timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (isMounted && response?.success && response?.data) {
           const requestData = response.data.request || response.data;
           const volunteerData = response.data.volunteer || requestData.volunteer;
           
           setRequest(prev => ({ 
              ...prev, 
              ...requestData, 
              volunteer: volunteerData,
              status: requestData.status
           }));
           
           // Also fetch session if needed
           getSessionByRequest(auth.accessToken, requestId).then((sessionRes) => {
             if (isMounted && sessionRes?.success && sessionRes?.data) {
               setSessionId(sessionRes.data._id);
             }
           }).catch(() => {});
        }
      } catch (error) {
        console.log('Error loading initial request:', error);
        if (isMounted) {
             const errorMessage = error.message === 'Request timeout' 
                ? 'Loading timed out. Please check your connection.' 
                : 'Failed to load request details. Please check your connection.';
             
             showAlert('Error', errorMessage, [
               { text: 'Retry', onPress: () => { closeAlert(); loadRequest(); } },
               { text: 'Go Back', onPress: () => { closeAlert(); navigation.navigate('MainApp', { screen: 'HomeTab' }); } }
             ]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadRequest();
    
    return () => {
      isMounted = false;
    };
  }, [requestId]);

  // Socket listener for request updates
  useEffect(() => {
    let socket;
    const setupSocket = async () => {
      socket = await connectSocket();
      if (socket) {
        socket.on('help:accepted', async (data) => {
          if (data.requestId === requestId) {
             // Refresh request details
             const auth = await loadAuth();
             if (auth?.accessToken) {
                const response = await getHelpRequestById(auth.accessToken, requestId);
                if (response?.success && response?.data?.request) {
                   const volunteerData = response.data.volunteer || response.data.request.volunteer;
                   setRequest(prev => ({ 
                      ...prev, 
                      ...response.data.request, 
                      volunteer: volunteerData,
                      status: response.data.request.status // Ensure status is updated
                   }));
                   // Retry fetching session
                   const sessionRes = await getSessionByRequest(auth.accessToken, requestId);
                   if (sessionRes?.success && sessionRes?.data) {
                      setSessionId(sessionRes.data._id);
                   }
                }
             }
          }
        });

        socket.on('help:request_updated', async (data) => {
          if (data.requestId === requestId) {
             // Refresh request details
             const auth = await loadAuth();
             if (auth?.accessToken) {
                const response = await getHelpRequestById(auth.accessToken, requestId);
                if (response?.success && response?.data?.request) {
                   setRequest(prev => ({ ...prev, ...response.data.request }));
                   // Also retry fetching session if missing
                   if (!sessionId) {
                      const sessionRes = await getSessionByRequest(auth.accessToken, requestId);
                      if (sessionRes?.success && sessionRes?.data) {
                         setSessionId(sessionRes.data._id);
                      }
                   }
                }
             }
          }
        });
        
        socket.on('help:request_taken', async (data) => {
          if (data.requestId === requestId) {
             // Refresh request details
             const auth = await loadAuth();
             if (auth?.accessToken) {
                const response = await getHelpRequestById(auth.accessToken, requestId);
                if (response?.success && response?.data?.request) {
                   setRequest(prev => ({ ...prev, ...response.data.request, volunteer: response.data.volunteer }));
                   // Retry fetching session
                   const sessionRes = await getSessionByRequest(auth.accessToken, requestId);
                   if (sessionRes?.success && sessionRes?.data) {
                      setSessionId(sessionRes.data._id);
                   }
                }
             }
          }
        });
      }
    };
    setupSocket();
    return () => {
      if (socket) {
        socket.off('help:request_updated');
        socket.off('help:request_taken');
      }
    };
  }, [requestId, sessionId]);

  useEffect(() => {
    if (request && !loading) {
       const status = String(request.status || '').toLowerCase();
       const activeStatuses = ['accepted', 'in_progress', 'matched', 'en_route', 'arrived', 'active'];
       if (!activeStatuses.includes(status)) {
          // If request is not accepted, redirect to RequestActive
           showAlert(
             'Request Pending',
             'Your request has not been accepted yet. Please wait on the active request screen.',
             [
               { 
                 text: 'OK', 
                 onPress: () => {
                   closeAlert();
                   navigation.navigate('RequestActive');
                 },
                 style: 'primary'
               }
             ],
             'clock-alert-outline',
             '#DC5C69'
           );
       }
    }
  }, [request, loading]);

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
                m => String(m.senderId) !== String(userId) && !m.isRead && !m.read
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
      console.log('New message received via socket:', {
        incomingSessionId: data.sessionId,
        currentSessionId: sessionId,
        incomingSenderId: data.message?.senderId,
        myUserId: currentUserId,
        isChatVisible: chatVisibleRef.current
      });
      
      if (String(data.sessionId) === String(sessionId)) {
        const message = data.message || {};
        const senderId = String(message.senderId || '');
        const myId = String(currentUserId || '');
        
        // Only increment if message is NOT from current user
        if (myId && senderId && senderId !== myId) {
            if (!chatVisibleRef.current) {
               setUnreadCount(prev => prev + 1);
               // Show toast with message content
               showToast(message.content || message.text || 'New message');
            }
        }
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
              navigation.navigate('ClosingRequest', { requestId });
            },
            style: 'primary',
          },
          {
            text: 'Request again',
            onPress: () => {
              closeAlert();
              navigation.navigate('HelpType');
            },
          },
          { text: 'Later', onPress: closeAlert, style: 'cancel' },
        ],
        'alert-circle-outline',
        '#DC5C69'
      );
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

  const statusForChat = String(request?.status || '').toLowerCase();
  const isChatAllowed = ['accepted', 'in_progress', 'matched', 'en_route', 'arrived', 'active'].includes(statusForChat);

  const openCancelRequestScreen = useCallback(() => {
    const rid = request?.id || request?._id || requestId;
    if (!rid) {
      showAlert('Error', 'Request ID missing.', [{ text: 'OK', onPress: closeAlert }]);
      return;
    }
    navigation.navigate('CancelRequest', { requestId: rid });
  }, [navigation, request, requestId]);

  const showLeaveConfirm = useCallback(() => {
    showAlert(
      'Active request',
      'Your request is still active. You can cancel it if you no longer need help.\n\nDo you want to stay here?',
      [
        { text: 'Stay', style: 'cancel', onPress: closeAlert },
        {
          text: 'Cancel request',
          style: 'destructive',
          onPress: () => {
            closeAlert();
            openCancelRequestScreen();
          },
        },
      ].filter(Boolean),
      'alert-circle-outline',
      '#DC5C69'
    );
  }, [openCancelRequestScreen]);

  const handleBackPress = () => {
    showLeaveConfirm();
  };

  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        showLeaveConfirm();
        return true;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => sub.remove();
    }, [showLeaveConfirm])
  );

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (e.data.action?.type === 'GO_BACK' || e.data.action?.type === 'POP') {
        e.preventDefault();
        showLeaveConfirm();
      }
    });
    return unsub;
  }, [navigation, showLeaveConfirm]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
       <Header 
        onBackPress={handleBackPress}
        title="Meeting Details"
        style={{ borderBottomWidth: 1, borderBottomColor: '#E8EAED', backgroundColor: '#fff', zIndex: 10 }}
        rightComponent={
           isChatAllowed && (
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
      
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        alwaysBounceVertical
        bounces
        overScrollMode="always"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#DC5C69']}
            tintColor="#DC5C69"
          />
        }
      >
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
                      title="Meeting Point"
                      description={request.description}
                      pinColor="#DC5C69"
                    >
                       <Icon name="map-marker" size={40} color="#DC5C69" />
                    </Marker>
                  )}
                </MapView>
              )}
              <View style={styles.locationOverlay}>
                <Icon name="map-marker" size={16} color="#DC5C69" style={{marginRight: 4}} />
                <Text style={styles.locationText}>
                  {showInitialLoading ? 'Loading…' : (request?.location?.address || "Current Location")}
                </Text>
              </View>
            </View>
            <Text style={styles.privacyText}>
              Location shared with your volunteer.
            </Text>
          </View>

          {/* Meeting Point Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Meeting Point</Text>
            <View style={styles.cardContentRow}>
              {showInitialLoading ? (
                <View style={{ flex: 1 }}>
                  <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 8, marginBottom: 8 }} />
                  <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 8, width: '70%' }} />
                </View>
              ) : (
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {request?.description || "Waiting at the specified location."}
                </Text>
              )}
              <View style={styles.illustrationContainer}>
                 <Icon name="map-marker-radius" size={38} color="#8B6F47" />
              </View>
            </View>
          </View>

          {/* Profile Cards */}
          <View style={styles.profilesContainer}>
            <View style={styles.profileCard}>
              <View style={[styles.profileImageContainer, { backgroundColor: '#E0E0E0' }]}>
                 {request?.requesterId?.profileImage || request?.user?.profileImage ? (
                    <Image 
                      source={getProfileImage(request?.requesterId?.profileImage || request?.user?.profileImage)} 
                      style={styles.profileImage}
                      resizeMode="cover"
                      onError={(e) => console.log('Image Load Error (User):', e.nativeEvent.error)}
                      onLoad={() => console.log('Image Loaded (User)')}
                    />
                 ) : (
                    <Icon name="account" size={60} color="#777" />
                 )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName} numberOfLines={1}>You</Text>
                <Text style={styles.profileRole}>Waiting</Text>
              </View>
            </View>

            <View style={styles.profileCard}>
              <View style={[styles.profileImageContainer, { backgroundColor: '#28C76F' }]}>
                 {request?.volunteer?.profileImage ? (
                    <Image 
                      source={getProfileImage(request?.volunteer?.profileImage)} 
                      style={styles.profileImage}
                      resizeMode="cover"
                      onError={(e) => console.log('Image Load Error (Volunteer):', e.nativeEvent.error)}
                      onLoad={() => console.log('Image Loaded (Volunteer)')}
                    />
                 ) : (
                    <Icon name="account-heart" size={60} color="#FFF" />
                 )}
              </View>
              <View style={styles.profileInfo}>
            {showInitialLoading && !request?.volunteer ? (
              <>
                <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 8, marginBottom: 8 }} />
                <View style={{ height: 10, backgroundColor: '#E5E7EB', borderRadius: 8, width: '60%' }} />
              </>
            ) : (
              <>
                <Text style={styles.profileName} numberOfLines={1}>
                  {request?.volunteer?.firstName || request?.volunteer?.name || request?.volunteer?.fullName || request?.volunteer?.username || "Volunteer"}
                </Text>
                <Text style={styles.profileRole}>Coming to help</Text>
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
            <Icon name="shield-check" size={20} color="#8B6F47" style={{marginRight: 10}} />
            <Text style={styles.safetyInfoText}>
              You can cancel the request if you no longer need help or feel unsafe.
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
              style={styles.cancelButton}
              onPress={handleCancelRequest}
              accessibilityRole="button"
              accessibilityLabel="Cancel request"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="close-circle-outline" size={18} color="#DC5C69" style={{ marginRight: 8 }} />
                <Text style={styles.cancelButtonText}>Cancel Request</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleCloseRequest}
              accessibilityRole="button"
              accessibilityLabel="Close request"
            >
               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <Icon name="check-circle-outline" size={18} color="#666" style={{ marginRight: 8 }} />
                 <Text style={styles.secondaryButtonText}>Close Request</Text>
               </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <ChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        requestId={requestId}
        otherUserName={request?.volunteer?.firstName}
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
    height: 150,
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
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
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
    marginBottom: 8,
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardDescription: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginRight: 12,
  },
  illustrationContainer: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  profilesContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  profileCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileImageContainer: {
    width: '86%',
    aspectRatio: 1,
    maxWidth: 140,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    marginBottom: 8,
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
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
    textAlign: 'center',
  },
  profileRole: {
    fontSize: 13,
    lineHeight: 18,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    width: '100%',
    paddingTop: 6,
    marginTop: 2,
  },
  sharedInfoText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  safetyInfoBox: {
    backgroundColor: '#FFF8F0', // Light Beige
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
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
    gap: 14,
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
  cancelButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC5C69',
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

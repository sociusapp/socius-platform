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
import { getSocket, connectSocket, appEvents } from '../../../services/socket/socket.service';
import { getSessionByRequest, getMessages, markMessagesRead } from '../../../services/api/chat.api';
import ChatModal from '../../../components/common/ChatModal';
import CustomAlert from '../../../components/common/CustomAlert';
import { buildClosureInitiatedCopy, buildRequestClosedCopy } from '../../../utils/closureMessages';
import {
  ROUTES,
  canStayOnMeetingMap,
  isChatAllowedForStatus,
  isClosingStatus,
  isMeetingActive,
  isTerminalHelpStatus,
  normalizeHelpStatus,
} from '../../../utils/helpRequestFlow';
import {
  syncActiveHelpSessionNotification,
  stopActiveHelpSessionNotification,
} from '../../../services/notifications/activeHelpSessionNotification';

const { width, height } = Dimensions.get('window');

const getMessageSenderId = (m) => {
  const s = m?.senderId;
  if (s == null) return '';
  if (typeof s === 'object' && s._id != null) return String(s._id);
  return String(s);
};

/** Unread = from other participant and not explicitly read (API uses isRead). */
const countUnreadMessages = (messages, userId) => {
  if (!Array.isArray(messages) || userId == null) return 0;
  const uid = String(userId);
  return messages.filter((m) => {
    const sid = getMessageSenderId(m);
    if (!sid || sid === uid) return false;
    return m.isRead !== true;
  }).length;
};

const MatchingMapScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const prefillRequest = route?.params?.prefillRequest || null;
  const [loading, setLoading] = useState(!prefillRequest);
  const [request, setRequest] = useState(prefillRequest);
  const [chatVisible, setChatVisible] = useState(false);

  useEffect(() => {
    if (route?.params?.openChat) {
      setChatVisible(true);
      navigation.setParams({ openChat: undefined });
    }
  }, [route?.params?.openChat, navigation]);

  useEffect(() => {
    const requestIdParam = route?.params?.requestId;
    const handler = (payload) => {
      if (payload?.requestId && String(payload.requestId) === String(requestIdParam)) {
        setChatVisible(true);
      }
    };
    appEvents.on('open_chat', handler);
    return () => appEvents.off('open_chat', handler);
  }, [route?.params?.requestId]);
  const [prefillMessage, setPrefillMessage] = useState('');
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
    navigation.navigate(ROUTES.requesterClosure, {
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

  useFocusEffect(
    useCallback(() => {
      if (!requestId) return undefined;
      refreshRequestDetails();
      return undefined;
    }, [requestId, refreshRequestDetails])
  );

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

  const handleMessage = async (message = '') => {
    setPrefillMessage(message);
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
           // Check multiple possible fields for volunteer data
           const volunteerData = response.data.volunteer || 
                                response.data.acceptedBy || 
                                response.data.helper || 
                                response.data.responder || 
                                requestData.volunteer || 
                                requestData.acceptedBy || 
                                requestData.helper || 
                                requestData.responder;
           
           console.log('[MatchingMap] Volunteer data:', JSON.stringify(volunteerData, null, 2));
           
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
                   // Check multiple possible fields for volunteer data
                   const volunteerData = response.data.volunteer || 
                                        response.data.acceptedBy || 
                                        response.data.helper || 
                                        response.data.responder || 
                                        response.data.request.volunteer || 
                                        response.data.request.acceptedBy || 
                                        response.data.request.helper || 
                                        response.data.request.responder;
                   
                   console.log('[MatchingMap] Socket volunteer data:', JSON.stringify(volunteerData, null, 2));
                   
                   const merged = { 
                      ...response.data.request, 
                      volunteer: volunteerData,
                      status: response.data.request.status,
                   };
                   if (data.sessionEndsAt) {
                     merged.sessionEndsAt = data.sessionEndsAt;
                   }
                   setRequest(prev => ({ 
                      ...prev, 
                      ...merged,
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

        socket.on('help:session_updated', async (data) => {
          if (data.requestId === requestId && data.sessionEndsAt) {
            setRequest(prev => (prev ? { ...prev, sessionEndsAt: data.sessionEndsAt } : prev));
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
                   // Check multiple possible fields for volunteer data
                   const volunteerData = response.data.volunteer || 
                                        response.data.acceptedBy || 
                                        response.data.helper || 
                                        response.data.responder || 
                                        response.data.request.volunteer || 
                                        response.data.request.acceptedBy || 
                                        response.data.request.helper || 
                                        response.data.request.responder;
                   
                   setRequest(prev => ({ ...prev, ...response.data.request, volunteer: volunteerData }));
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
        socket.off('help:accepted');
        socket.off('help:session_updated');
        socket.off('help:request_updated');
        socket.off('help:request_taken');
      }
    };
  }, [requestId, sessionId]);

  useEffect(() => {
    if (!request || !requestId) {
      stopActiveHelpSessionNotification().catch(() => {});
      return undefined;
    }
    const status = String(request.status || '').toLowerCase();
    const active = ['matched', 'active'].includes(status);
    const reqRid = request.requesterId;
    const requesterIdStr = reqRid?._id ? String(reqRid._id) : String(reqRid || '');
    const isRequester =
      currentUserId && requesterIdStr && String(currentUserId) === requesterIdStr;

    if (!active || !isRequester || !request.sessionEndsAt) {
      stopActiveHelpSessionNotification().catch(() => {});
      return undefined;
    }

    const startAt = request.activeAt || request.matchedAt || request.updatedAt || Date.now();
    syncActiveHelpSessionNotification({
      requestId,
      sessionEndsAt: request.sessionEndsAt,
      sessionStartAt: startAt,
    });

    return () => {
      stopActiveHelpSessionNotification().catch(() => {});
    };
  }, [
    requestId,
    request?.status,
    request?.sessionEndsAt,
    request?.requesterId,
    request?.activeAt,
    request?.matchedAt,
    currentUserId,
    request,
  ]);

  useEffect(() => {
    if (request && !loading) {
      const status = normalizeHelpStatus(request.status);
      if (isClosingStatus(status)) return;

      if (isTerminalHelpStatus(status)) {
        showAlert(
          'Request ended',
          'This request is no longer active.',
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
          'alert-circle-outline',
          '#DC5C69'
        );
        return;
      }

      if (!isMeetingActive(status)) {
        showAlert(
          'Request pending',
          'Your request is not in a meeting yet. Please wait on the active request screen.',
          [
            {
              text: 'OK',
              onPress: () => {
                closeAlert();
                navigation.navigate('RequestActive');
              },
              style: 'primary',
            },
          ],
          'clock-alert-outline',
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
              const unread = countUnreadMessages(msgsRes.data, userId);
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

  useFocusEffect(
    useCallback(() => {
      if (!sessionId) return undefined;
      let alive = true;
      const refreshBadge = async () => {
        if (chatVisibleRef.current) return;
        try {
          const auth = await loadAuth();
          const token = auth?.accessToken;
          const uid = auth?.userId;
          if (!token || !uid) return;
          const res = await getMessages(token, sessionId);
          if (alive && res?.success && Array.isArray(res.data)) {
            setUnreadCount(countUnreadMessages(res.data, uid));
          }
        } catch (e) {
          /* ignore */
        }
      };
      refreshBadge();
      return () => {
        alive = false;
      };
    }, [sessionId])
  );

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
        const myId = String(currentUserId || '');
        const incomingSid =
          typeof message.senderId === 'object' && message.senderId?._id != null
            ? String(message.senderId._id)
            : String(message.senderId || '');
        if (myId && incomingSid && incomingSid !== myId) {
          if (!chatVisibleRef.current) {
            setUnreadCount((prev) => prev + 1);
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

    const handleClosureInitiated = async (data) => {
      if (!isMounted) return;
      if (String(data?.requestId) !== String(requestId)) return;
      stopActiveHelpSessionNotification().catch(() => {});
      await refreshRequestDetails();

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
              navigation.navigate(ROUTES.requesterClosure, { requestId });
            },
            style: 'primary',
          },
          { text: 'Not now', onPress: closeAlert, style: 'cancel' },
        ],
        'alert-circle-outline',
        '#DC5C69'
      );
    };

    const handleRequestClosed = (data) => {
      if (!isMounted) return;
      if (String(data?.requestId) !== String(requestId)) return;
      stopActiveHelpSessionNotification().catch(() => {});
      const copy = buildRequestClosedCopy({
        requestId,
        requestType: data?.requestType || 'Help request',
        reason: data?.reason,
        occurredAt: data?.occurredAt,
        userRole: 'requester',
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
  }, [requestId, navigation, refreshRequestDetails]);

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

  const statusForChat = normalizeHelpStatus(request?.status);
  const isChatAllowed = isChatAllowedForStatus(statusForChat);
  const showMeetingActions = canStayOnMeetingMap(statusForChat);
  const inClosure = isClosingStatus(statusForChat);

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
           <TouchableOpacity style={styles.messageButton} onPress={() => handleMessage()}>
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
        alwaysBounceVertical={false}
        bounces={false}
        overScrollMode="never"
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
          
          {/* Active Request Label */}
          <Text style={styles.activeRequestLabel}>Active Request</Text>

          {inClosure && (
            <View style={styles.closureBanner}>
              <Icon name="file-document-edit-outline" size={20} color="#92400E" style={{ marginRight: 8 }} />
              <Text style={styles.closureBannerText}>
                Closure is in progress. Use the button below to submit your part; the helper must complete theirs as well.
              </Text>
            </View>
          )}

          {/* Map Card */}
          <View style={styles.mapCard}>
            <View style={styles.mapPreviewContainer}>
              {showInitialLoading ? (
                <View style={[styles.mapPreview, { backgroundColor: '#E5E7EB' }]} />
              ) : (
                <MapView
                  ref={mapRef}
                  style={[styles.mapPreview, { backgroundColor: '#e8eaed' }]}
                  provider={PROVIDER_GOOGLE}
                  initialRegion={initialRegion}
                  showsUserLocation={true}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  toolbarEnabled={false}
                  mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
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
              {/* Distance Badge */}
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>200 m</Text>
              </View>
            </View>
            <View style={styles.meetingLocationContainer}>
              <Text style={styles.meetingLocationText}>
                Meeting near {request?.location?.address || "Bhopal Main Road"}
              </Text>
            </View>
          </View>

          {/* Profile Card */}
          <View style={styles.profileSection}>
            <View style={styles.profileImageWrapper}>
              {(() => {
                const v = request?.volunteer || request?.acceptedBy || request?.helper || request?.responder;
                const img = v?.profileImage || v?.profile?.profileImage || v?.user?.profileImage;
                return img ? (
                  <Image 
                    source={getProfileImage(img)} 
                    style={styles.profileImageLarge}
                    resizeMode="cover"
                  />
                ) : (
                  <Icon name="account" size={80} color="#9CA3AF" />
                );
              })()}
            </View>
            <Text style={styles.profileNameLarge}>
              {(() => {
                const v = request?.volunteer || request?.acceptedBy || request?.helper || request?.responder;
                return v?.fullName || v?.firstName || v?.name || "Aman Khan";
              })()}
            </Text>
            <Text style={styles.profileStatus}>Coming to help</Text>
            <Text style={styles.profileDistance}>200 meters away</Text>
          </View>

          {/* You Asked Section */}
          <View style={styles.youAskedCard}>
            <Text style={styles.youAskedText}>
              You asked: {request?.description || "Need one print copy."}
            </Text>
          </View>

          {/* Quick Message Input */}
          <TouchableOpacity
            style={[styles.quickMessageInput, !isChatAllowed && styles.quickMessageDisabled]}
            onPress={() => isChatAllowed && handleMessage()}
            disabled={!isChatAllowed}
          >
            <Text style={styles.quickMessagePlaceholder}>
              {isChatAllowed ? 'Send a quick message' : 'Chat unavailable during closure'}
            </Text>
          </TouchableOpacity>

          {/* Quick Reply Chips */}
          <View style={styles.chipsContainer}>
            <TouchableOpacity
              style={[styles.chip, !isChatAllowed && styles.chipDisabled]}
              onPress={() => isChatAllowed && handleMessage("I'm near the gate")}
              disabled={!isChatAllowed}
            >
              <Text style={styles.chipText}>I'm near the gate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, !isChatAllowed && styles.chipDisabled]}
              onPress={() => isChatAllowed && handleMessage('Inside building')}
              disabled={!isChatAllowed}
            >
              <Text style={styles.chipText}>Inside building</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, !isChatAllowed && styles.chipDisabled]}
              onPress={() => isChatAllowed && handleMessage('2 minutes')}
              disabled={!isChatAllowed}
            >
              <Text style={styles.chipText}>2 minutes</Text>
            </TouchableOpacity>
          </View>

          {/* Open Navigation Button */}
          <TouchableOpacity style={styles.openNavButton} onPress={handleOpenMaps}>
            <Text style={styles.openNavText}>Open Navigation</Text>
          </TouchableOpacity>

          {/* Complete Request — requester uses ClosingRequest (correct closure payload). */}
          <TouchableOpacity
            style={[
              styles.completeRequestButton,
              !showMeetingActions && styles.completeRequestButtonDisabled,
            ]}
            onPress={() => navigation.navigate(ROUTES.requesterClosure, { requestId })}
            disabled={!showMeetingActions}
          >
            <Text style={styles.completeRequestText}>
              {inClosure ? 'Complete closure' : 'Complete Request'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ChatModal
        visible={chatVisible}
        onClose={async () => {
          setChatVisible(false);
          setPrefillMessage('');
          if (sessionId) {
            try {
              const auth = await loadAuth();
              const token = auth?.accessToken;
              const uid = auth?.userId;
              if (token && uid) {
                const res = await getMessages(token, sessionId);
                if (res?.success && Array.isArray(res.data)) {
                  setUnreadCount(countUnreadMessages(res.data, uid));
                }
              }
            } catch (e) {
              /* keep prior count */
            }
          }
        }}
        requestId={requestId}
        otherUserName={request?.volunteer?.firstName}
        prefillMessage={prefillMessage}
        autoFocus={true}
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
  activeRequestLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC5C69',
    marginBottom: 8,
    marginLeft: 4,
  },
  closureBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  closureBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    fontWeight: '500',
  },
  distanceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#DC5C69',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  meetingLocationContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  meetingLocationText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileImageWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImageLarge: {
    width: '100%',
    height: '100%',
  },
  profileNameLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  profileStatus: {
    fontSize: 13,
    color: '#28C76F',
    fontWeight: '500',
    marginBottom: 2,
  },
  profileDistance: {
    fontSize: 12,
    color: '#888',
  },
  youAskedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#DC5C69',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  youAskedText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
  quickMessageInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quickMessagePlaceholder: {
    fontSize: 14,
    color: '#999',
  },
  quickMessageDisabled: {
    opacity: 0.5,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  chipDisabled: {
    opacity: 0.45,
  },
  completeRequestButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#DC5C69',
  },
  completeRequestText: {
    color: '#DC5C69',
    fontSize: 16,
    fontWeight: '700',
  },
  completeRequestButtonDisabled: {
    opacity: 0.45,
  },
  openNavButton: {
    backgroundColor: '#DC5C69',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#DC5C69',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  openNavText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
    borderRadius: 12,
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
    overflow: 'visible',
    zIndex: 3,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default MatchingMapScreen;

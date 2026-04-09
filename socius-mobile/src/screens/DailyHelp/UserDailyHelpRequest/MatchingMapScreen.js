import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Alert, Dimensions, ScrollView, Image, Animated, NativeModules, RefreshControl, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import { useResponsive } from '../../../utils/responsive';
import {
  createBorrowItemRequest,
  getBorrowItems,
  getHelpRequestById,
} from '../../../services/api/dailyHelp.api';
import { loadAuth } from '../../../services/storage/asyncStorage.service';
import { baseURL } from '../../../services/api/client';
import { resolveBorrowImageUri, formatBorrowDateTime } from '../../../utils/borrowDisplay';
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
import { patchHelpSession, submitReport, uploadClosureEvidence, getMyReports, updateMyReport, deleteMyReport } from '../../../services/api/incident.api';
import {
  parseMinutesFromDurationLabel,
  formatMinutesAsDurationLabel,
  MEETING_TIME_COPY,
} from '../../../utils/durationLabel';
import { sociusRefreshProps } from '../../../utils/sociusRefreshControl';

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
  const requestId = route?.params?.requestId;
  const perf = route?.params?.perf;
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
  const [activeBottomTab, setActiveBottomTab] = useState('overview');
  const [borrowItem, setBorrowItem] = useState('');
  const [borrowNote, setBorrowNote] = useState('');
  const [borrowDuration, setBorrowDuration] = useState(30);
  const [customDurationInput, setCustomDurationInput] = useState('');
  const [borrowImageUrl, setBorrowImageUrl] = useState('');
  const [borrowImagePreviewUri, setBorrowImagePreviewUri] = useState('');
  const [isUploadingBorrowImage, setIsUploadingBorrowImage] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [selectedExtendMinutes, setSelectedExtendMinutes] = useState(15);
  const [extendHistory, setExtendHistory] = useState([]);
  const extendHistoryRequestIdRef = useRef(null);
  const [isReporting, setIsReporting] = useState(false);
  const [reportCategory, setReportCategory] = useState('felt_uncomfortable');
  const [reportDetails, setReportDetails] = useState('');
  const [reportInnerTab, setReportInnerTab] = useState('new');
  const [reportHistory, setReportHistory] = useState([]);
  const [isReportHistoryLoading, setIsReportHistoryLoading] = useState(false);
  const [editingReportId, setEditingReportId] = useState('');
  const [borrowHistory, setBorrowHistory] = useState([]);
  const [borrowThumbFailed, setBorrowThumbFailed] = useState({});
  const [isBorrowSubmitting, setIsBorrowSubmitting] = useState(false);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);
  
  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: 'alert-circle-outline',
    iconColor: '#DC5C69',
    type: 'info',
  });

  const showAlert = (title, message, buttons = [], icon = 'alert-circle-outline', iconColor = '#DC5C69', type = 'info') => {
    setAlertConfig({
      title,
      message,
      buttons,
      icon,
      iconColor,
      type,
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

  const reportCategoryLabel = useCallback((value) => {
    const map = {
      felt_uncomfortable: 'Felt uncomfortable or unsafe',
      personal_boundaries_crossed: 'Personal boundaries crossed',
      misuse_of_platform: 'Misuse of the platform',
      false_unnecessary_request: 'False or unnecessary request',
      something_else: 'Something else',
    };
    return map[String(value || '')] || 'Report';
  }, []);

  const loadReportHistory = useCallback(async () => {
    try {
      if (!requestId) return;
      setIsReportHistoryLoading(true);
      const auth = await loadAuth();
      if (!auth?.accessToken) return;
      const res = await getMyReports(auth.accessToken, {
        reportedRequestId: requestId,
        reportedRequestType: 'HelpRequest',
        reporterRole: 'requester',
      });
      const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setReportHistory(rows);
    } catch (e) {
      setReportHistory([]);
    } finally {
      setIsReportHistoryLoading(false);
    }
  }, [requestId]);
  
  const mapRef = useRef(null);
  const chatVisibleRef = useRef(chatVisible);
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
    if (__DEV__ && perf?.t0) {
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
           
           if (__DEV__) console.log('[MatchingMap] Volunteer data:', JSON.stringify(volunteerData, null, 2));

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
        if (__DEV__) console.warn('Error loading initial request:', error);
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
                   
                   if (__DEV__) console.log('[MatchingMap] Socket volunteer data:', JSON.stringify(volunteerData, null, 2));

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
      if (__DEV__) {
        console.log('New message received via socket:', {
          incomingSessionId: data.sessionId,
          currentSessionId: sessionId,
          incomingSenderId: data.message?.senderId,
          myUserId: currentUserId,
          isChatVisible: chatVisibleRef.current,
        });
      }

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
        recipientRole: 'requester',
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

  const rawDistance = Number(request?.distanceMeters ?? request?.distance_meters ?? request?.distance);
  const distanceLabel = Number.isFinite(rawDistance) && rawDistance > 0
    ? rawDistance < 1000
      ? `${Math.round(rawDistance)} m`
      : `${(rawDistance / 1000).toFixed(1)} km`
    : '200 m';

  const requestedDurationMinsRaw = Number(
    request?.requestedDurationMinutes ?? request?.requestedMinutes ?? request?.durationMinutes ?? 0
  );
  const requestedDurationMins =
    requestedDurationMinsRaw > 0
      ? requestedDurationMinsRaw
      : parseMinutesFromDurationLabel(request?.requestedDurationLabel);
  const requestedDurationLabel =
    requestedDurationMins > 0
      ? formatMinutesAsDurationLabel(requestedDurationMins)
      : String(request?.requestedDurationLabel || '').trim() || '30 min';

  const handleExtendSession = useCallback(async (minutes) => {
    try {
      if (!requestId || !minutes || minutes < 1) return;
      setIsExtending(true);
      const auth = await loadAuth();
      if (!auth?.accessToken) throw new Error('No auth');
      const res = await patchHelpSession(auth.accessToken, requestId, {
        action: 'extend',
        additionalMinutes: minutes,
      });
      const endsAt = res?.data?.sessionEndsAt || res?.sessionEndsAt;
      if (endsAt) {
        setRequest((prev) => (prev ? { ...prev, sessionEndsAt: endsAt } : prev));
      }
      await refreshRequestDetails();
      setExtendHistory((prev) => [
        {
          id: `ext_${Date.now()}`,
          minutes: Number(minutes),
          at: new Date().toISOString(),
        },
        ...prev,
      ]);
      showAlert(
        'Time extended',
        `${minutes} minutes have been added. The updated timer is now visible to the helper as well.`,
        [{ text: 'OK', onPress: closeAlert, style: 'primary' }],
        'clock-fast',
        '#28C76F'
      );
    } catch (e) {
      showAlert('Unable to extend', 'Please try again in a moment.', [{ text: 'OK', onPress: closeAlert }]);
    } finally {
      setIsExtending(false);
    }
  }, [requestId, refreshRequestDetails]);

  useEffect(() => {
    if (!requestId || !request) return;
    const fromApi = Number(
      request?.requestedDurationMinutes ?? request?.requestedMinutes ?? request?.durationMinutes ?? 0
    );
    const fromLabel = parseMinutesFromDurationLabel(request?.requestedDurationLabel);
    const mins = Math.max(1, fromApi || fromLabel || 30);

    if (extendHistoryRequestIdRef.current !== requestId) {
      extendHistoryRequestIdRef.current = requestId;
      setExtendHistory([
        {
          id: 'initial_requested',
          minutes: mins,
          at: request?.createdAt || request?.matchedAt || new Date().toISOString(),
          kind: 'initial',
        },
      ]);
      return;
    }

    setExtendHistory((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: 'initial_requested',
          minutes: mins,
          at: request?.createdAt || request?.matchedAt || new Date().toISOString(),
          kind: 'initial',
        },
      ];
    });
  }, [
    requestId,
    request?._id,
    request?.createdAt,
    request?.matchedAt,
    request?.requestedDurationMinutes,
    request?.requestedMinutes,
    request?.durationMinutes,
    request?.requestedDurationLabel,
  ]);

  const handleSubmitReport = useCallback(async () => {
    try {
      if (!requestId) return;
      setIsReporting(true);
      const auth = await loadAuth();
      if (!auth?.accessToken) throw new Error('No auth');
      if (editingReportId) {
        await updateMyReport(auth.accessToken, editingReportId, {
          category: reportCategory,
          details: String(reportDetails || '').trim(),
        });
      } else {
        await submitReport(auth.accessToken, {
          reportedRequestId: requestId,
          reportedRequestType: 'HelpRequest',
          reporterRole: 'requester',
          category: reportCategory,
          details: String(reportDetails || '').trim(),
        });
      }
      setReportDetails('');
      setEditingReportId('');
      await loadReportHistory();
      showAlert(
        editingReportId ? 'Report updated' : 'Report submitted',
        editingReportId ? 'Your report has been updated.' : 'Thanks. Our safety team will review this report.',
        [{ text: 'OK', onPress: closeAlert, style: 'primary' }],
        'check-circle',
        '#28C76F'
      );
    } catch (e) {
      showAlert('Report failed', 'Could not submit report right now.', [{ text: 'OK', onPress: closeAlert }]);
    } finally {
      setIsReporting(false);
    }
  }, [requestId, reportCategory, reportDetails, editingReportId, loadReportHistory]);

  const handleDeleteReport = useCallback(async (reportId) => {
    try {
      const auth = await loadAuth();
      if (!auth?.accessToken) throw new Error('No auth');
      await deleteMyReport(auth.accessToken, reportId);
      if (editingReportId === reportId) {
        setEditingReportId('');
        setReportDetails('');
      }
      await loadReportHistory();
      showAlert('Report deleted', 'The report has been removed.', [{ text: 'OK', onPress: closeAlert }], 'check-circle', '#28C76F');
    } catch (e) {
      showAlert('Delete failed', 'Could not delete this report.', [{ text: 'OK', onPress: closeAlert }]);
    }
  }, [editingReportId, loadReportHistory]);

  const handleEditReport = useCallback((row) => {
    setReportInnerTab('new');
    setEditingReportId(String(row?._id || row?.id || ''));
    setReportCategory(String(row?.category || 'felt_uncomfortable'));
    setReportDetails(String(row?.details || ''));
  }, []);

  useEffect(() => {
    if (activeBottomTab === 'report') {
      loadReportHistory();
    }
  }, [activeBottomTab, loadReportHistory]);

  const loadBorrowHistory = useCallback(async () => {
    try {
      if (!requestId) return;
      const auth = await loadAuth();
      if (!auth?.accessToken) return;
      const res = await getBorrowItems(auth.accessToken, requestId);
      const list = Array.isArray(res?.data?.items)
        ? res.data.items
        : Array.isArray(res?.items)
          ? res.items
          : [];
      setBorrowHistory(list);
    } catch (e) {
      // ignore to keep meeting screen stable
    }
  }, [requestId]);

  useEffect(() => {
    loadBorrowHistory();
  }, [loadBorrowHistory]);

  useEffect(() => {
    let socket;
    const setup = async () => {
      socket = await connectSocket();
      if (!socket) return;
      const onBorrowResponse = (payload) => {
        if (String(payload?.requestId || '') !== String(requestId || '')) return;
        loadBorrowHistory();
      };
      const onOfferResponse = (payload) => {
        if (String(payload?.requestId || '') !== String(requestId || '')) return;
        loadBorrowHistory();
      };
      socket.on('help:borrow_response', onBorrowResponse);
      socket.on('help:offer_response', onOfferResponse);
    };
    setup();
    return () => {
      if (!socket) return;
      socket.off('help:borrow_response');
      socket.off('help:offer_response');
    };
  }, [requestId, loadBorrowHistory]);

  useEffect(() => {
    const onItemsChanged = ({ requestId: rid } = {}) => {
      if (String(rid || '') !== String(requestId || '')) return;
      loadBorrowHistory();
    };
    appEvents.on('help:borrow_offer_items_changed', onItemsChanged);
    return () => appEvents.off('help:borrow_offer_items_changed', onItemsChanged);
  }, [requestId, loadBorrowHistory]);

  const handleBorrowRequestSubmit = useCallback(async () => {
    try {
      if (!requestId) return;
      const itemLabel = String(borrowItem || '').trim();
      if (!itemLabel) {
        showAlert('Missing item', 'Please enter item name first.', [{ text: 'OK', onPress: closeAlert }]);
        return;
      }
      setIsBorrowSubmitting(true);
      const auth = await loadAuth();
      if (!auth?.accessToken) throw new Error('No auth');
      await createBorrowItemRequest(auth.accessToken, requestId, {
        itemName: itemLabel,
        note: String(borrowNote || '').trim(),
        requestedMinutes: Number(borrowDuration || 30),
        imageUrl: String(borrowImageUrl || '').trim(),
      });
      await loadBorrowHistory();
      setBorrowItem('');
      setBorrowNote('');
      setBorrowImageUrl('');
      setBorrowImagePreviewUri('');
      showAlert(
        'Request sent',
        `${itemLabel} request has been sent to your current helper.`,
        [{ text: 'OK', onPress: closeAlert, style: 'primary' }],
        'check-circle',
        '#28C76F'
      );
    } catch (e) {
      showAlert('Unable to send', 'Could not send item request right now.', [{ text: 'OK', onPress: closeAlert }]);
    } finally {
      setIsBorrowSubmitting(false);
    }
  }, [requestId, borrowItem, borrowNote, borrowDuration, borrowImageUrl, loadBorrowHistory]);

  const uploadBorrowPhoto = useCallback(async (localUri) => {
    if (!localUri) return;
    try {
      setIsUploadingBorrowImage(true);
      const auth = await loadAuth();
      if (!auth?.accessToken) throw new Error('No auth');
      const form = new FormData();
      const filename = localUri.split('/').pop() || `borrow_${Date.now()}.jpg`;
      const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      form.append('evidence', {
        uri: localUri,
        name: filename,
        type: mime,
      });
      const res = await uploadClosureEvidence(auth.accessToken, form);
      const files = Array.isArray(res?.data?.files) ? res.data.files : Array.isArray(res?.files) ? res.files : [];
      const first = files[0];
      const rawUrl = String(first || '').trim();
      if (!rawUrl) throw new Error('No image URL');
      setBorrowImageUrl(rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`);
      setBorrowImagePreviewUri(localUri);
    } catch (e) {
      showAlert('Upload failed', 'Unable to upload photo. Please try again.', [{ text: 'OK', onPress: closeAlert }]);
    } finally {
      setIsUploadingBorrowImage(false);
    }
  }, []);

  const handleOpenCameraForBorrow = useCallback(async () => {
    setPhotoPickerVisible(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      showAlert('Permission required', 'Camera permission is required.', [{ text: 'OK', onPress: closeAlert }]);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadBorrowPhoto(result.assets[0].uri);
    }
  }, [uploadBorrowPhoto]);

  const handleOpenGalleryForBorrow = useCallback(async () => {
    setPhotoPickerVisible(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      showAlert('Permission required', 'Gallery permission is required.', [{ text: 'OK', onPress: closeAlert }]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.9,
      allowsEditing: true,
      mediaTypes: ['images'],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadBorrowPhoto(result.assets[0].uri);
    }
  }, [uploadBorrowPhoto]);

  const handlePickBorrowImage = useCallback(() => {
    setPhotoPickerVisible(true);
  }, []);

  const renderBottomTabContent = () => {
    if (activeBottomTab === 'overview') {
      return (
        <>
          <Text style={styles.activeRequestLabel}>Active Request</Text>
          {inClosure && (
            <View style={styles.closureBanner}>
              <Icon name="file-document-edit-outline" size={20} color="#92400E" style={{ marginRight: 8 }} />
              <Text style={styles.closureBannerText}>
                Closure is in progress. Use the button below to submit your part; the helper must complete theirs as well.
              </Text>
            </View>
          )}
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
                      <Icon name="map-marker" size={42} color="#DC5C69" />
                    </Marker>
                  )}
                </MapView>
              )}
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>{distanceLabel}</Text>
              </View>
            </View>
            <View style={styles.meetingLocationContainer}>
              <Text style={styles.meetingLocationText}>
                Meeting near {request?.location?.address || 'Bhopal Main Road'}
              </Text>
            </View>
          </View>
          <View style={styles.profileMainCard}>
            <View style={styles.profileAvatarFloating}>
              {(() => {
                const v = request?.volunteer || request?.acceptedBy || request?.helper || request?.responder;
                const img = v?.profileImage || v?.profile?.profileImage || v?.user?.profileImage;
                return img ? (
                  <Image source={getProfileImage(img)} style={styles.profileImageLarge} resizeMode="cover" />
                ) : (
                  <Icon name="account" size={42} color="#9CA3AF" />
                );
              })()}
            </View>
            <View style={styles.profileMainBody}>
              <Text style={styles.profileNameLarge}>
                {(() => {
                  const v = request?.volunteer || request?.acceptedBy || request?.helper || request?.responder;
                  return v?.fullName || v?.firstName || v?.name || 'Aman Khan';
                })()}
              </Text>
              <Text style={styles.profileStatus}>Coming to help</Text>
              <Text style={styles.profileDistance}>{distanceLabel} away</Text>
              <View style={styles.profileMainDivider} />
              <Text style={styles.youAskedText}>You asked: {request?.description || 'Need one print copy.'}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.quickMessageInput, !isChatAllowed && styles.quickMessageDisabled]}
            onPress={() => isChatAllowed && handleMessage()}
            disabled={!isChatAllowed}
          >
            <Text style={styles.quickMessagePlaceholder}>
              {isChatAllowed ? 'Send a quick message' : 'Chat unavailable during closure'}
            </Text>
          </TouchableOpacity>
          <View style={styles.chipsContainer}>
            <TouchableOpacity style={[styles.chip, !isChatAllowed && styles.chipDisabled]} onPress={() => isChatAllowed && handleMessage("I'm near the gate")} disabled={!isChatAllowed}>
              <Text style={styles.chipText}>I'm near the gate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, !isChatAllowed && styles.chipDisabled]} onPress={() => isChatAllowed && handleMessage('Inside building')} disabled={!isChatAllowed}>
              <Text style={styles.chipText}>Inside building</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, !isChatAllowed && styles.chipDisabled]} onPress={() => isChatAllowed && handleMessage('2 minutes')} disabled={!isChatAllowed}>
              <Text style={styles.chipText}>2 minutes</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.openNavButton} onPress={handleOpenMaps}>
            <Text style={styles.openNavText}>Open Navigation</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.completeRequestButton, !showMeetingActions && styles.completeRequestButtonDisabled]}
            onPress={() => navigation.navigate(ROUTES.requesterClosure, { requestId })}
            disabled={!showMeetingActions}
          >
            <Text style={styles.completeRequestText}>{inClosure ? 'Complete closure' : 'Complete Request'}</Text>
          </TouchableOpacity>
        </>
      );
    }
    if (activeBottomTab === 'borrow') {
      return (
        <View style={styles.bottomPanelCard}>
          <Text style={styles.bottomPanelTitle}>Request Item</Text>
          <TouchableOpacity style={styles.photoBox} onPress={handlePickBorrowImage} disabled={isUploadingBorrowImage}>
            <Icon name="camera" size={22} color="#4B5563" />
            <Text style={styles.photoBoxText}>
              {isUploadingBorrowImage ? 'Uploading...' : borrowImagePreviewUri ? 'Change Photo' : 'Add Photo'}
            </Text>
          </TouchableOpacity>
          {borrowImagePreviewUri ? (
            <Image source={{ uri: borrowImagePreviewUri }} style={styles.borrowPreviewImage} resizeMode="cover" />
          ) : null}
          <TextInput
            value={borrowItem}
            onChangeText={setBorrowItem}
            placeholder="Phone charger..."
            placeholderTextColor="#9CA3AF"
            style={styles.panelInput}
          />
          <TextInput
            value={borrowNote}
            onChangeText={setBorrowNote}
            placeholder="Leave a note (optional)"
            placeholderTextColor="#9CA3AF"
            style={styles.panelInput}
          />
          <View style={styles.durationRow}>
            {[30, 60, 120].map((m) => (
              <TouchableOpacity
                key={String(m)}
                style={[styles.durationChip, borrowDuration === m && styles.durationChipActive]}
                onPress={() => setBorrowDuration(m)}
              >
                <Text style={[styles.durationChipText, borrowDuration === m && styles.durationChipTextActive]}>
                  {m < 60 ? `${m} min` : `${m / 60} hour${m === 120 ? 's' : ''}`}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.durationChip, borrowDuration > 120 && styles.durationChipActive]}
              onPress={() => {
                const parsed = Number(customDurationInput || 0);
                if (parsed > 0) setBorrowDuration(parsed);
              }}
            >
              <Text style={[styles.durationChipText, borrowDuration > 120 && styles.durationChipTextActive]}>Custom</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={customDurationInput}
            onChangeText={setCustomDurationInput}
            placeholder="Custom minutes (optional)"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            style={styles.panelInput}
          />
          <TouchableOpacity
            style={styles.requestActionButton}
            onPress={handleBorrowRequestSubmit}
            disabled={isBorrowSubmitting}
          >
            <Text style={styles.requestActionButtonText}>{isBorrowSubmitting ? 'Sending...' : 'Request'}</Text>
          </TouchableOpacity>
          <View style={styles.borrowHistoryWrap}>
            <Text style={styles.borrowSessionContext}>
              You requested help ·{' '}
              {String(request?.status || 'active')
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase())}
            </Text>
            <Text style={styles.borrowHistoryTitle}>Recent item requests</Text>
            {(borrowHistory || []).slice(0, 10).map((row, index) => {
              const hid = String(row?._id || `borrow_${index}`);
              const thumbUri = resolveBorrowImageUri(row?.imageUrl);
              const showThumb = thumbUri && !borrowThumbFailed[hid];
              const sentAt = formatBorrowDateTime(row?.createdAt);
              const actedAt = formatBorrowDateTime(row?.actedAt);
              const isPending = String(row?.status || '').toLowerCase() === 'pending';
              const by = String(row?.initiatedBy || 'requester').toLowerCase();
              const metaLead =
                by === 'helper'
                  ? `Helper offered · ${Number(row?.requestedMinutes || 0)} min`
                  : `You asked to borrow · ${Number(row?.requestedMinutes || 0)} min`;
              return (
                <View key={hid} style={styles.borrowHistoryDetailRow}>
                  {showThumb ? (
                    <Image
                      source={{ uri: thumbUri }}
                      style={styles.borrowHistoryThumb}
                      onError={() => setBorrowThumbFailed((p) => ({ ...p, [hid]: true }))}
                    />
                  ) : (
                    <View style={[styles.borrowHistoryThumb, styles.borrowHistoryThumbPlaceholder]}>
                      <Icon name="image-outline" size={22} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={styles.borrowHistoryDetailBody}>
                    <View style={styles.borrowHistoryTitleRow}>
                      <Text style={styles.borrowHistoryItemTitle} numberOfLines={2}>
                        {String(row?.itemName || 'Item')}
                      </Text>
                      <Text
                        style={[
                          styles.borrowStatusText,
                          row?.status === 'accepted' && styles.borrowStatusAccepted,
                          row?.status === 'declined' && styles.borrowStatusDeclined,
                          isPending && styles.borrowStatusPending,
                        ]}
                      >
                        {String(row?.status || 'pending')}
                      </Text>
                    </View>
                    <Text style={styles.borrowHistoryMetaLine}>
                      {metaLead}
                      {sentAt ? ` · Sent ${sentAt}` : ''}
                    </Text>
                    {row?.note ? (
                      <Text style={styles.borrowHistoryNoteLine}>Note: {String(row.note)}</Text>
                    ) : null}
                    {actedAt && !isPending ? (
                      <Text style={styles.borrowHistoryMetaSmall}>
                        {row?.status === 'accepted' ? 'Accepted' : 'Declined'} {actedAt}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
            {!(borrowHistory || []).length ? (
              <Text style={styles.bottomPanelMuted}>No item requests yet.</Text>
            ) : null}
          </View>
        </View>
      );
    }
    if (activeBottomTab === 'extend') {
      const selectedTotalMinutes = Number((request?.requestedMinutes || 0) + (selectedExtendMinutes || 0));
      const lastUpdate = extendHistory?.[0]?.at
        ? new Date(extendHistory[0].at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;
      return (
        <View style={styles.bottomPanelCard}>
          <View style={styles.extendHeroCard}>
            <View style={styles.extendHeroRow}>
              <View style={styles.extendHeroIcon}>
                <Icon name="timer-sand" size={18} color="#DC5C69" />
              </View>
              <View style={styles.extendHeroBody}>
                <Text style={styles.extendHeroLabel}>Current requested time</Text>
                <Text style={styles.extendHeroValue}>{requestedDurationLabel}</Text>
              </View>
              {lastUpdate ? (
                <View style={styles.extendUpdatedPill}>
                  <Text style={styles.extendUpdatedPillText}>Updated {lastUpdate}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.extendHeroHint}>{MEETING_TIME_COPY.extendTabRequesterLead}</Text>
          </View>

          <Text style={styles.extendSectionTitle}>Add extra minutes</Text>
          <View style={styles.extendChipRow}>
            {[15, 30, 60].map((m) => (
              <TouchableOpacity
                key={`extend_${m}`}
                style={[
                  styles.extendChip,
                  selectedExtendMinutes === m && styles.extendChipActive,
                  isExtending && styles.chipDisabled,
                ]}
                onPress={() => setSelectedExtendMinutes(m)}
                disabled={isExtending}
              >
                <Text style={[styles.extendChipTime, selectedExtendMinutes === m && styles.extendChipTimeActive]}>+{m} min</Text>
                <Text style={[styles.extendChipCaption, selectedExtendMinutes === m && styles.extendChipCaptionActive]}>
                  Total {Number((request?.requestedMinutes || 0) + m)} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.extendPreviewCard}>
            <Text style={styles.extendPreviewLabel}>After extension</Text>
            <Text style={styles.extendPreviewValue}>{selectedTotalMinutes} min total requested</Text>
          </View>

          <TouchableOpacity
            style={[styles.extendActionButton, isExtending && styles.chipDisabled]}
            onPress={() => handleExtendSession(selectedExtendMinutes)}
            disabled={isExtending}
          >
            <Icon name="clock-plus-outline" size={18} color="#FFFFFF" />
            <Text style={styles.extendActionButtonText}>{isExtending ? 'Submitting...' : 'Confirm extension'}</Text>
          </TouchableOpacity>

          <View style={styles.borrowHistoryWrap}>
            <Text style={styles.borrowHistoryTitle}>Extension history</Text>
            {extendHistory.slice(0, 6).map((row, index) => (
              <View key={String(row?.id || `ext_row_${index}`)} style={styles.borrowHistoryRow}>
                <Text style={styles.borrowHistoryText}>
                  {row?.kind === 'initial' ? 'Initial requested time' : `Extended by ${Number(row?.minutes || 0)} min`}
                </Text>
                <Text style={styles.borrowStatusText}>
                  {new Date(row?.at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
            {!extendHistory.length ? <Text style={styles.bottomPanelMuted}>No extension updates yet.</Text> : null}
          </View>
        </View>
      );
    }
    if (activeBottomTab === 'report') {
      const reportOptions = [
        { id: 'felt_uncomfortable', label: 'Felt uncomfortable or unsafe', icon: 'emoticon-sad-outline' },
        { id: 'personal_boundaries_crossed', label: 'Personal boundaries crossed', icon: 'account-off-outline' },
        { id: 'misuse_of_platform', label: 'Misuse of the platform', icon: 'alert-rhombus-outline' },
        { id: 'false_unnecessary_request', label: 'False or unnecessary request', icon: 'alert-circle-outline' },
        { id: 'something_else', label: 'Something else', icon: 'message-question-outline' },
      ];
      return (
        <View style={styles.bottomPanelCard}>
          <Text style={styles.reportScreenTitle}>Report a Concern</Text>
          <Text style={styles.reportScreenSubtitle}>Share any concerns about this interaction so we can improve safety and fairness.</Text>

          <View style={styles.reportTabSwitch}>
            <TouchableOpacity
              style={[styles.reportTabBtn, reportInnerTab === 'new' && styles.reportTabBtnActive]}
              onPress={() => setReportInnerTab('new')}
            >
              <Text style={[styles.reportTabBtnText, reportInnerTab === 'new' && styles.reportTabBtnTextActive]}>New</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reportTabBtn, reportInnerTab === 'history' && styles.reportTabBtnActive]}
              onPress={() => setReportInnerTab('history')}
            >
              <Text style={[styles.reportTabBtnText, reportInnerTab === 'history' && styles.reportTabBtnTextActive]}>Your Reports</Text>
            </TouchableOpacity>
          </View>

          {reportInnerTab === 'new' ? (
          <>
          <View style={styles.reportOptionsWrap}>
            {reportOptions.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.reportOptionCard, reportCategory === c.id && styles.reportOptionCardActive]}
                onPress={() => setReportCategory(c.id)}
                activeOpacity={0.9}
              >
                <View style={[styles.reportOptionIconWrap, reportCategory === c.id && styles.reportOptionIconWrapActive]}>
                  <Icon
                    name={c.icon}
                    size={18}
                    color={reportCategory === c.id ? '#DC5C69' : '#64748B'}
                  />
                </View>
                <Text style={[styles.reportOptionLabel, reportCategory === c.id && styles.reportOptionLabelActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            value={reportDetails}
            onChangeText={setReportDetails}
            placeholder="Add details (optional)"
            placeholderTextColor="#9CA3AF"
            style={styles.reportDetailsInput}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.reportDisclaimerText}>
            Reports are reviewed after incidents are closed. They are not monitored in real time.
          </Text>

          <TouchableOpacity style={[styles.reportSubmitButton, isReporting && styles.chipDisabled]} onPress={handleSubmitReport} disabled={isReporting}>
            <Text style={styles.reportSubmitButtonText}>
              {isReporting ? 'Submitting...' : editingReportId ? 'Update Report' : 'Submit Report'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.reportFooterText}>Reports help improve safety and accountability.</Text>
          </>
          ) : null}

          {reportInnerTab === 'history' ? (
          <View style={styles.reportHistoryWrap}>
            <Text style={styles.reportHistoryTitle}>Your report history</Text>
            {isReportHistoryLoading ? (
              <Text style={styles.reportHistoryMuted}>Loading reports...</Text>
            ) : null}
            {!isReportHistoryLoading && reportHistory.length === 0 ? (
              <Text style={styles.reportHistoryMuted}>No report submitted for this request yet.</Text>
            ) : null}
            {reportHistory.map((row, idx) => {
              const rowId = String(row?._id || row?.id || `r_${idx}`);
              const status = String(row?.status || 'pending').replace(/_/g, ' ');
              return (
                <View key={rowId} style={styles.reportHistoryCard}>
                  <View style={styles.reportHistoryTop}>
                    <Text style={styles.reportHistoryCategory}>{reportCategoryLabel(row?.category)}</Text>
                    <Text style={styles.reportHistoryStatus}>{status}</Text>
                  </View>
                  {row?.details ? <Text style={styles.reportHistoryDetails}>{String(row.details)}</Text> : null}
                  <Text style={styles.reportHistoryDate}>
                    {new Date(row?.updatedAt || row?.createdAt || Date.now()).toLocaleString()}
                  </Text>
                  <View style={styles.reportHistoryActions}>
                    <TouchableOpacity style={styles.reportHistoryBtn} onPress={() => handleEditReport(row)}>
                      <Text style={styles.reportHistoryBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.reportHistoryBtn, styles.reportHistoryBtnDanger]} onPress={() => handleDeleteReport(rowId)}>
                      <Text style={[styles.reportHistoryBtnText, styles.reportHistoryBtnDangerText]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
          ) : null}
        </View>
      );
    }
    if (activeBottomTab === 'more') {
      const volunteer = request?.volunteer || request?.acceptedBy || request?.helper || request?.responder;
      const helperName = volunteer?.fullName || volunteer?.firstName || volunteer?.name || 'Your helper';
      const helperImg = volunteer?.profileImage || volunteer?.profile?.profileImage || volunteer?.user?.profileImage;
      const ridShort = requestId ? String(requestId).slice(-6) : '—';
      const statusLabel = String(statusForChat || request?.status || 'active').replace(/_/g, ' ');
      const meetingAddr = String(request?.location?.address || 'Meeting location on map').trim();
      const canOpenNav = Boolean(request?.location?.coordinates?.length === 2);

      return (
        <View style={styles.bottomPanelCard}>
          <Text style={styles.moreScreenTitle}>More options</Text>
          <Text style={styles.moreScreenSubtitle}>Manage this meeting, message your helper, or wrap up.</Text>

          <View style={styles.moreHeroCard}>
            <View style={styles.moreHeroTop}>
              <View style={styles.moreHeroTitleRow}>
                <Icon name="handshake-outline" size={22} color="#DC5C69" />
                <Text style={styles.moreHeroHeading}>This session</Text>
              </View>
              <View style={styles.moreStatusPill}>
                <Text style={styles.moreStatusPillText}>{statusLabel}</Text>
              </View>
            </View>
            <View style={styles.moreHeroStats}>
              <View style={styles.moreHeroStat}>
                <Text style={styles.moreHeroStatLabel}>{MEETING_TIME_COPY.plannedDurationLabel}</Text>
                <Text style={styles.moreHeroStatValue}>{requestedDurationLabel}</Text>
              </View>
              <View style={styles.moreHeroStatDivider} />
              <View style={styles.moreHeroStat}>
                <Text style={styles.moreHeroStatLabel}>Request</Text>
                <Text style={styles.moreHeroStatMono}>…{ridShort}</Text>
              </View>
            </View>
            {inClosure ? (
              <View style={styles.moreClosureHint}>
                <Icon name="file-document-edit-outline" size={18} color="#92400E" />
                <Text style={styles.moreClosureHintText}>Closure in progress — finish your steps when you are ready.</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.moreSectionLabel}>Your helper</Text>
          <TouchableOpacity
            style={styles.moreHelperCard}
            onPress={() => isChatAllowed && handleMessage()}
            disabled={!isChatAllowed}
            activeOpacity={0.85}
          >
            <View style={styles.moreHelperAvatarWrap}>
              {helperImg ? (
                <Image source={getProfileImage(helperImg)} style={styles.moreHelperAvatar} resizeMode="cover" />
              ) : (
                <Icon name="account" size={36} color="#9CA3AF" />
              )}
            </View>
            <View style={styles.moreHelperBody}>
              <Text style={styles.moreHelperName}>{helperName}</Text>
              <Text style={styles.moreHelperMeta}>{distanceLabel} · {isChatAllowed ? 'Tap to chat' : 'Chat limited during closure'}</Text>
            </View>
            <Icon name="message-text-outline" size={22} color={isChatAllowed ? '#DC5C69' : '#D1D5DB'} />
          </TouchableOpacity>

          <Text style={styles.moreSectionLabel}>Shortcuts</Text>
          <View style={styles.moreShortcutGrid}>
            <TouchableOpacity
              style={[styles.moreShortcutTile, !isChatAllowed && styles.moreShortcutDisabled]}
              onPress={() => isChatAllowed && handleMessage()}
              disabled={!isChatAllowed}
            >
              <View style={[styles.moreShortcutIconBg, styles.moreShortcutIconMuted]}>
                <Icon name="message-processing-outline" size={22} color="#DC5C69" />
              </View>
              <Text style={styles.moreShortcutTitle}>Message</Text>
              <Text style={styles.moreShortcutDesc}>Quick chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.moreShortcutTile, !canOpenNav && styles.moreShortcutDisabled]}
              onPress={handleOpenMaps}
              disabled={!canOpenNav}
            >
              <View style={[styles.moreShortcutIconBg, styles.moreShortcutIconMuted]}>
                <Icon name="navigation-variant-outline" size={22} color="#DC5C69" />
              </View>
              <Text style={styles.moreShortcutTitle}>Navigate</Text>
              <Text style={styles.moreShortcutDesc} numberOfLines={2}>{meetingAddr}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreShortcutTile} onPress={() => setActiveBottomTab('borrow')}>
              <View style={[styles.moreShortcutIconBg, styles.moreShortcutIconMuted]}>
                <Icon name="package-variant-closed" size={22} color="#DC5C69" />
              </View>
              <Text style={styles.moreShortcutTitle}>Borrow</Text>
              <Text style={styles.moreShortcutDesc}>Item requests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreShortcutTile} onPress={() => setActiveBottomTab('extend')}>
              <View style={[styles.moreShortcutIconBg, styles.moreShortcutIconMuted]}>
                <Icon name="clock-plus-outline" size={22} color="#DC5C69" />
              </View>
              <Text style={styles.moreShortcutTitle}>Extend</Text>
              <Text style={styles.moreShortcutDesc}>Add time</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.moreSafetyCard} onPress={() => setActiveBottomTab('report')} activeOpacity={0.9}>
            <View style={styles.moreSafetyIconWrap}>
              <Icon name="shield-alert-outline" size={24} color="#DC5C69" />
            </View>
            <View style={styles.moreSafetyBody}>
              <Text style={styles.moreSafetyTitle}>Safety and report</Text>
              <Text style={styles.moreSafetyDesc}>Something feels off? Open the Report tab with one tap.</Text>
            </View>
            <Icon name="chevron-right" size={22} color="#9CA3AF" />
          </TouchableOpacity>

          <Text style={styles.moreSectionLabel}>Communicate</Text>
          <TouchableOpacity
            style={styles.moreListRow}
            onPress={() => isChatAllowed && handleMessage('Please call me once you arrive.')}
            disabled={!isChatAllowed}
          >
            <View style={styles.moreListIconCircle}>
              <Icon name="phone-outline" size={18} color="#374151" />
            </View>
            <View style={styles.moreListTextWrap}>
              <Text style={styles.moreListTitle}>Ask for a call on arrival</Text>
              <Text style={styles.moreListDesc}>Sends a chat message to your helper.</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#D1D5DB" />
          </TouchableOpacity>

          <Text style={styles.moreSectionLabel}>End session</Text>
          <Text style={styles.moreEndHint}>When you are done, complete closure so both sides can confirm. Cancel only if you no longer need help.</Text>
          <TouchableOpacity
            style={[styles.morePrimaryButton, !showMeetingActions && styles.morePrimaryButtonDisabled]}
            onPress={handleCloseRequest}
            disabled={!showMeetingActions}
          >
            <Icon name="check-decagram-outline" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.morePrimaryButtonText}>{inClosure ? 'Continue closure' : 'Complete request'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreDangerOutline} onPress={handleCancelRequest}>
            <Icon name="close-circle-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.moreDangerOutlineText}>Cancel this request</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  const goHomeFromMeeting = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
    });
  }, [navigation]);

  const handleBackPress = goHomeFromMeeting;

  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        goHomeFromMeeting();
        return true;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => sub.remove();
    }, [goHomeFromMeeting])
  );

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      const type = e.data.action?.type;
      if (type === 'GO_BACK' || type === 'POP') {
        e.preventDefault();
        queueMicrotask(() => goHomeFromMeeting());
      }
    });
    return unsub;
  }, [navigation, goHomeFromMeeting]);

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
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        alwaysBounceVertical={false}
        bounces={false}
        overScrollMode="never"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} {...sociusRefreshProps} />
        }
      >
        <View style={styles.contentContainer}>
          {renderBottomTabContent()}
        </View>
      </ScrollView>
      <View style={styles.bottomActionsBar}>
        <TouchableOpacity style={[styles.bottomActionItem, activeBottomTab === 'overview' && styles.bottomActionItemActive]} onPress={() => setActiveBottomTab('overview')}>
          <Icon name="map-outline" size={22} color={activeBottomTab === 'overview' ? '#DC5C69' : '#6B7280'} />
          <Text style={[styles.bottomActionText, activeBottomTab === 'overview' && styles.bottomActionTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomActionItem, activeBottomTab === 'borrow' && styles.bottomActionItemActive]} onPress={() => setActiveBottomTab('borrow')}>
          <Icon name="briefcase-outline" size={22} color={activeBottomTab === 'borrow' ? '#DC5C69' : '#6B7280'} />
          <Text style={[styles.bottomActionText, activeBottomTab === 'borrow' && styles.bottomActionTextActive]}>Borrow</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomActionItem, activeBottomTab === 'extend' && styles.bottomActionItemActive]} onPress={() => setActiveBottomTab('extend')}>
          <Icon name="clock-fast" size={22} color={activeBottomTab === 'extend' ? '#DC5C69' : '#6B7280'} />
          <Text style={[styles.bottomActionText, activeBottomTab === 'extend' && styles.bottomActionTextActive]}>Extend</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomActionItem, activeBottomTab === 'report' && styles.bottomActionItemActive]} onPress={() => setActiveBottomTab('report')}>
          <Icon name="alert-decagram-outline" size={22} color={activeBottomTab === 'report' ? '#DC5C69' : '#6B7280'} />
          <Text style={[styles.bottomActionText, activeBottomTab === 'report' && styles.bottomActionTextActive]}>Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomActionItem, activeBottomTab === 'more' && styles.bottomActionItemActive]} onPress={() => setActiveBottomTab('more')}>
          <Icon name="dots-horizontal-circle-outline" size={22} color={activeBottomTab === 'more' ? '#DC5C69' : '#6B7280'} />
          <Text style={[styles.bottomActionText, activeBottomTab === 'more' && styles.bottomActionTextActive]}>More</Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={photoPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoPickerVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.photoPickerBackdrop}
          onPress={() => setPhotoPickerVisible(false)}
        >
          <View style={styles.photoPickerCard}>
            <Text style={styles.photoPickerTitle}>Add Photo</Text>
            <Text style={styles.photoPickerSubtitle}>Choose image source</Text>
            <View style={styles.photoPickerActions}>
              <TouchableOpacity style={styles.photoPickerBtn} onPress={handleOpenCameraForBorrow}>
                <Icon name="camera-outline" size={18} color="#DC5C69" />
                <Text style={styles.photoPickerBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoPickerBtn} onPress={handleOpenGalleryForBorrow}>
                <Icon name="image-outline" size={18} color="#DC5C69" />
                <Text style={styles.photoPickerBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.photoPickerCancelBtn} onPress={() => setPhotoPickerVisible(false)}>
              <Text style={styles.photoPickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
        type={alertConfig.type}
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
  profileMainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 20,
    marginBottom: 12,
    paddingTop: 58,
    paddingHorizontal: 16,
    paddingBottom: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 9,
    elevation: 3.2,
    borderWidth: 1,
    borderColor: '#ECEFF3',
  },
  profileAvatarFloating: {
    position: 'absolute',
    top: -34,
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 0,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  profileMainBody: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 4,
  },
  profileNameLarge: {
    fontSize: 16,
    fontWeight: '800',
    color: '#202938',
    marginBottom: 4,
  },
  profileStatus: {
    fontSize: 13,
    color: '#475467',
    fontWeight: '500',
    marginBottom: 3,
  },
  profileDistance: {
    fontSize: 13,
    color: '#344054',
    fontWeight: '600',
    marginBottom: 10,
  },
  profileMainDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E4E7EC',
    marginBottom: 11,
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
    fontSize: 12,
    color: '#344054',
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '500',
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
  bottomPanelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bottomPanelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  bottomPanelLine: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
  },
  bottomPanelMuted: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
  },
  extendHeroCard: {
    backgroundColor: '#FFF5F6',
    borderWidth: 1,
    borderColor: '#FFDDE2',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  extendHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  extendHeroIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFE5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extendHeroBody: {
    flex: 1,
    minWidth: 0,
  },
  extendHeroLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  extendHeroValue: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  extendUpdatedPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FBC6CE',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  extendUpdatedPillText: {
    fontSize: 11,
    color: '#B4234F',
    fontWeight: '700',
  },
  extendHeroHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },
  extendSectionTitle: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '700',
    marginBottom: 8,
  },
  extendChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  extendChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  extendChipActive: {
    borderColor: '#DC5C69',
    backgroundColor: '#FFF1F3',
  },
  extendChipTime: {
    fontSize: 15,
    fontWeight: '800',
    color: '#374151',
  },
  extendChipTimeActive: {
    color: '#B4234F',
  },
  extendChipCaption: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  extendChipCaptionActive: {
    color: '#B4234F',
  },
  extendPreviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E7D7',
    backgroundColor: '#FFF8ED',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  extendPreviewLabel: {
    fontSize: 11,
    color: '#A16207',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  extendPreviewValue: {
    marginTop: 4,
    fontSize: 14,
    color: '#7C2D12',
    fontWeight: '700',
  },
  extendActionButton: {
    backgroundColor: '#DC5C69',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexDirection: 'row',
    gap: 8,
  },
  extendActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  photoBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  photoBoxText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  borrowPreviewImage: {
    width: '100%',
    height: 155,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#F3F4F6',
  },
  panelInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  durationChip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  durationChipActive: {
    borderColor: '#DC5C69',
    backgroundColor: '#FFF1F3',
  },
  durationChipText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  durationChipTextActive: {
    color: '#DC5C69',
  },
  requestActionButton: {
    backgroundColor: '#F04E4E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 2,
  },
  requestActionButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  borrowHistoryWrap: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF3',
    paddingTop: 10,
    gap: 8,
  },
  borrowSessionContext: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 2,
  },
  borrowHistoryTitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
  },
  borrowHistoryDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#ECEFF3',
    borderRadius: 10,
    padding: 10,
  },
  borrowHistoryThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  borrowHistoryThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  borrowHistoryDetailBody: {
    flex: 1,
    minWidth: 0,
  },
  borrowHistoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  borrowHistoryItemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  borrowHistoryMetaLine: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  borrowHistoryMetaSmall: {
    marginTop: 2,
    fontSize: 11,
    color: '#9CA3AF',
  },
  borrowHistoryNoteLine: {
    marginTop: 6,
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  borrowHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#ECEFF3',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  borrowHistoryText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    marginRight: 8,
  },
  borrowStatusText: {
    textTransform: 'capitalize',
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#EEF2F7',
  },
  borrowStatusAccepted: {
    color: '#16A34A',
    backgroundColor: '#E8F7EE',
  },
  borrowStatusDeclined: {
    color: '#DC2626',
    backgroundColor: '#FDECEC',
  },
  borrowStatusPending: {
    color: '#B45309',
    backgroundColor: '#FEF3C7',
  },
  photoPickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.40)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  photoPickerCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  photoPickerTitle: {
    fontSize: 24,
    color: '#111827',
    fontWeight: '700',
    marginBottom: 4,
  },
  photoPickerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 14,
  },
  photoPickerActions: {
    gap: 10,
    marginBottom: 12,
  },
  photoPickerBtn: {
    borderWidth: 1,
    borderColor: '#F3D5DA',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF7F8',
  },
  photoPickerBtnText: {
    fontSize: 16,
    color: '#DC5C69',
    fontWeight: '700',
  },
  photoPickerCancelBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  photoPickerCancelText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '700',
  },
  reportContextCard: {
    borderWidth: 1,
    borderColor: '#ECEFF3',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 10,
    gap: 5,
  },
  reportContextLine: {
    fontSize: 13,
    color: '#374151',
  },
  reportContextLabel: {
    fontWeight: '700',
    color: '#111827',
  },
  reportScreenTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  reportScreenSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 14,
  },
  reportTabSwitch: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  reportTabBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTabBtnActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3B6C0',
  },
  reportTabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  reportTabBtnTextActive: {
    color: '#B4234F',
    fontWeight: '800',
  },
  reportOptionsWrap: {
    gap: 10,
    marginBottom: 12,
  },
  reportOptionCard: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportOptionCardActive: {
    borderColor: '#DC5C69',
    backgroundColor: '#FFF8F9',
  },
  reportOptionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportOptionIconWrapActive: {
    backgroundColor: '#FEECEF',
  },
  reportOptionLabel: {
    flex: 1,
    fontSize: 17,
    color: '#374151',
    fontWeight: '500',
  },
  reportOptionLabelActive: {
    color: '#1F2937',
    fontWeight: '700',
  },
  reportDetailsInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    minHeight: 104,
    marginBottom: 10,
  },
  reportDisclaimerText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  reportSubmitButton: {
    backgroundColor: '#DC5C69',
    borderRadius: 999,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  reportSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  reportFooterText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#9CA3AF',
  },
  reportHistoryWrap: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF3',
    paddingTop: 10,
    gap: 8,
  },
  reportHistoryTitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
  },
  reportHistoryMuted: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  reportHistoryCard: {
    borderWidth: 1,
    borderColor: '#ECEFF3',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    padding: 10,
    gap: 6,
  },
  reportHistoryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  reportHistoryCategory: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  reportHistoryStatus: {
    fontSize: 11,
    textTransform: 'capitalize',
    fontWeight: '700',
    color: '#4B5563',
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reportHistoryDetails: {
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  reportHistoryDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  reportHistoryActions: {
    marginTop: 2,
    flexDirection: 'row',
    gap: 8,
  },
  reportHistoryBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  reportHistoryBtnText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '700',
  },
  reportHistoryBtnDanger: {
    borderColor: '#F3B6C0',
    backgroundColor: '#FFF5F7',
  },
  reportHistoryBtnDangerText: {
    color: '#B4234F',
  },
  reportButton: {
    borderRadius: 10,
    backgroundColor: '#DC5C69',
    paddingVertical: 12,
    alignItems: 'center',
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  moreScreenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  moreScreenSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 18,
  },
  moreHeroCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#FFF9FA',
    borderWidth: 1,
    borderColor: '#FCE4E8',
  },
  moreHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  moreHeroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moreHeroHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  moreStatusPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3D4DA',
  },
  moreStatusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC5C69',
    textTransform: 'capitalize',
  },
  moreHeroStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreHeroStat: {
    flex: 1,
  },
  moreHeroStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  moreHeroStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  moreHeroStatMono: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    fontVariant: ['tabular-nums'],
  },
  moreHeroStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#F3D4DA',
    marginHorizontal: 12,
  },
  moreClosureHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  moreClosureHintText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  moreSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 4,
  },
  moreHelperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEFF3',
    marginBottom: 20,
    gap: 12,
  },
  moreHelperAvatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreHelperAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  moreHelperBody: {
    flex: 1,
    minWidth: 0,
  },
  moreHelperName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  moreHelperMeta: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  moreShortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    columnGap: 10,
    marginBottom: 18,
  },
  moreShortcutTile: {
    flexGrow: 1,
    flexBasis: '47%',
    maxWidth: '48%',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEFF3',
  },
  moreShortcutDisabled: {
    opacity: 0.48,
  },
  moreShortcutIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  moreShortcutIconMuted: {
    backgroundColor: '#FFF1F3',
  },
  moreShortcutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  moreShortcutDesc: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  moreSafetyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFBFC',
    borderWidth: 1,
    borderColor: '#FCE4E8',
    marginBottom: 22,
    gap: 12,
  },
  moreSafetyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF1F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreSafetyBody: {
    flex: 1,
    minWidth: 0,
  },
  moreSafetyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  moreSafetyDesc: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
  },
  moreListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
    gap: 12,
  },
  moreListIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreListTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  moreListTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  moreListDesc: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  moreEndHint: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    marginBottom: 14,
  },
  morePrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC5C69',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  morePrimaryButtonDisabled: {
    backgroundColor: '#FCA5A5',
    opacity: 0.85,
  },
  morePrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  moreDangerOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    marginBottom: 8,
  },
  moreDangerOutlineText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  bottomActionsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  bottomActionItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    borderRadius: 10,
  },
  bottomActionItemActive: {
    backgroundColor: '#FFF1F3',
  },
  bottomActionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  bottomActionTextActive: {
    color: '#DC5C69',
  },
  offerModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  offerModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  offerModalClose: {
    position: 'absolute',
    right: 12,
    top: 10,
    zIndex: 2,
  },
  offerModalAvatarWrap: {
    alignItems: 'center',
    marginTop: 2,
  },
  offerModalAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  offerModalName: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  offerModalDivider: {
    marginTop: 8,
    marginBottom: 10,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  offerMetaLine: {
    fontSize: 17,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 4,
  },
  offerMetaLineMuted: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 8,
  },
  offerMetaQuote: {
    fontSize: 15,
    color: '#374151',
    fontStyle: 'italic',
    marginBottom: 10,
    lineHeight: 22,
  },
  offerModalItemImage: {
    width: '100%',
    height: 170,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 14,
    backgroundColor: '#F3F4F6',
  },
  offerModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  offerModalBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  offerModalAccept: {
    backgroundColor: '#E35F52',
  },
  offerModalDecline: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  offerModalAcceptText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  offerModalDeclineText: {
    color: '#1F2937',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default MatchingMapScreen;

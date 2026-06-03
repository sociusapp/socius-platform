import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, Alert, Dimensions, ScrollView, Image, Animated, NativeModules, Modal, TextInput, RefreshControl, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Header from '../../../../components/common/Header';
import Button from '../../../../components/common/Button';
import { useResponsive } from '../../../../utils/responsive';
import {
  createOfferItemRequest,
  getBorrowItems,
  getHelpRequestById,
  respondBorrowItemRequest,
} from '../../../../services/api/dailyHelp.api';
import { loadAuth } from '../../../../services/storage/asyncStorage.service';
import { baseURL } from '../../../../services/api/client';
import { resolveBorrowImageUri, formatBorrowDateTime } from '../../../../utils/borrowDisplay';
import {
  parseMinutesFromDurationLabel,
  formatMinutesAsDurationLabel,
  formatMeetingWindowCountdownTick,
  MEETING_TIME_COPY,
} from '../../../../utils/durationLabel';
import { sociusRefreshProps } from '../../../../utils/sociusRefreshControl';

const { width, height } = Dimensions.get('window');

import { getSocket, connectSocket, appEvents } from '../../../../services/socket/socket.service';
import { getSessionByRequest, getMessages, markMessagesRead } from '../../../../services/api/chat.api';
import ChatModal from '../../../../components/common/ChatModal';
import CustomAlert from '../../../../components/common/CustomAlert';
import { buildClosureInitiatedCopy, buildRequestClosedCopy } from '../../../../utils/closureMessages';
import {
  ROUTES,
  canStayOnMeetingMap,
  isChatAllowedForStatus,
  isClosingStatus,
  isMeetingActive,
  isTerminalHelpStatus,
  normalizeHelpStatus,
} from '../../../../utils/helpRequestFlow';
import { submitReport, getMyReports, updateMyReport, deleteMyReport, uploadClosureEvidence } from '../../../../services/api/incident.api';

const getMessageSenderId = (m) => {
  const s = m?.senderId;
  if (s == null) return '';
  if (typeof s === 'object' && s._id != null) return String(s._id);
  return String(s);
};

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
  const [loading, setLoading] = useState(!prefillRequest);
  const [request, setRequest] = useState(prefillRequest);
  const [chatVisible, setChatVisible] = useState(false);
  const [prefillMessage, setPrefillMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeBottomTab, setActiveBottomTab] = useState('overview');
  const [countdownText, setCountdownText] = useState('');
  const [delayHistory, setDelayHistory] = useState([]);
  const [reportCategory, setReportCategory] = useState('felt_uncomfortable');
  const [reportDetails, setReportDetails] = useState('');
  const [reportInnerTab, setReportInnerTab] = useState('new');
  const [isReporting, setIsReporting] = useState(false);
  const [reportHistory, setReportHistory] = useState([]);
  const [isReportHistoryLoading, setIsReportHistoryLoading] = useState(false);
  const [editingReportId, setEditingReportId] = useState('');
  const [offerHistory, setOfferHistory] = useState([]);
  const [offerHistoryThumbFailed, setOfferHistoryThumbFailed] = useState({});
  const [offerItemName, setOfferItemName] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [offerDuration, setOfferDuration] = useState(30);
  const [offerCustomMinutes, setOfferCustomMinutes] = useState('');
  const [offerImageUrl, setOfferImageUrl] = useState('');
  const [offerImagePreviewUri, setOfferImagePreviewUri] = useState('');
  const [isUploadingOfferImage, setIsUploadingOfferImage] = useState(false);
  const [isOfferSubmitting, setIsOfferSubmitting] = useState(false);
  const [photoPickerOfferVisible, setPhotoPickerOfferVisible] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const prevSessionEndRef = useRef(null);
  const delayHistoryRequestIdRef = useRef(null);

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
        reporterRole: 'helper',
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

  const goHomeFromMeeting = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goHomeFromMeeting();
        return true;
      });
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

  const refreshRequestDetails = useCallback(async () => {
    if (!requestId) return false;
    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (!token) return false;
      const response = await getHelpRequestById(token, requestId);
      if (!mountedRef.current) return false;
      if (response?.success && response?.data?.request) {
        const reqData = response.data.request;
        if (response.data.volunteer) {
          reqData.volunteer = response.data.volunteer;
        }
        setRequest(reqData);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [requestId]);

  useFocusEffect(
    useCallback(() => {
      if (!requestId) return undefined;
      refreshRequestDetails();
      return undefined;
    }, [requestId, refreshRequestDetails])
  );

  useEffect(() => {
    if (route?.params?.openChat) {
      setChatVisible(true);
      navigation.setParams({ openChat: undefined });
    }
  }, [route?.params?.openChat, navigation]);

  useEffect(() => {
    const handler = (payload) => {
      if (payload?.requestId && String(payload.requestId) === String(requestId)) {
        setChatVisible(true);
      }
    };
    appEvents.on('open_chat', handler);
    return () => appEvents.off('open_chat', handler);
  }, [requestId]);

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

  const handleOpenChat = (message = '') => {
    setPrefillMessage(message);
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
            },
          ],
          'alert-circle-outline',
          '#DC5C69'
        );
        return;
      }

      if (!isMeetingActive(status)) {
        showAlert(
          'Request unavailable',
          'This meeting is not active anymore.',
          [
            {
              text: 'OK',
              onPress: () => {
                closeAlert();
                navigation.goBack();
              },
            },
          ],
          'alert-circle-outline',
          '#DC5C69'
        );
      }
    }
  }, [request, loading, navigation]);

  const handleRespondToBorrow = useCallback(async (borrowId, action) => {
    try {
      if (!requestId || !borrowId) return;
      const auth = await loadAuth();
      if (!auth?.accessToken) throw new Error('No auth');
      await respondBorrowItemRequest(auth.accessToken, requestId, borrowId, action);
      await loadOfferHistory();
      showAlert(
        action === 'accept' ? 'Borrow request accepted' : 'Borrow request declined',
        action === 'accept' ? 'You have accepted the request.' : 'You have declined the request.',
        [{ text: 'OK', onPress: closeAlert, style: 'primary' }],
        'check-circle',
        '#28C76F'
      );
    } catch (e) {
      showAlert('Error', 'Unable to respond to request.', [{ text: 'OK', onPress: closeAlert }]);
    }
  }, [requestId, loadOfferHistory]);

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
              setUnreadCount(countUnreadMessages(msgsRes.data, userId));
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
      if (__DEV__) {
        console.log('New message received via socket (Receive):', {
          incomingSessionId: data.sessionId,
          currentSessionId: sessionId,
          incomingSenderId: data.message?.senderId,
          myUserId: currentUserId,
          isChatVisible: chatVisibleRef.current,
        });
      }

      if (String(data.sessionId) === String(sessionId)) {
        const message = data.message || {};
        const senderId = getMessageSenderId(message);
        const myId = String(currentUserId || '');

        if (myId && senderId && senderId !== myId) {
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

    const handleClosureInitiated = async (data) => {
      if (!isMounted) return;
      if (String(data?.requestId) !== String(requestId)) return;

      const initiatedBy = String(data?.initiatedBy || '');
      if (initiatedBy !== 'requester') return;

      await refreshRequestDetails();

      const copy = buildClosureInitiatedCopy({
        requestId,
        requestType: data?.requestType || 'Help request',
        initiatedBy: data?.initiatedBy,
        occurredAt: data?.occurredAt,
        recipientRole: 'helper',
      });
      showAlert(
        copy.title,
        copy.message,
        [
          {
            text: 'Complete closure',
            onPress: () => {
              closeAlert();
              navigation.navigate(ROUTES.helperClosure, { requestId });
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
      const copy = buildRequestClosedCopy({
        requestId,
        requestType: data?.requestType || 'Help request',
        reason: data?.reason,
        occurredAt: data?.occurredAt,
        userRole: 'helper',
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
  const requesterTrustSignals = request?.requesterTrustSignals || {};
  const trustSignalItems = [
    { key: 'returns_on_time', label: 'Returns items', icon: 'check-decagram', color: '#28C76F' },
    { key: 'also_helps_others', label: 'Helps others', icon: 'hand-heart', color: '#F5A623' },
    { key: 'new_user', label: 'New user', icon: 'alert-circle', color: '#FF9500' },
  ];
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
      : String(request?.requestedDurationLabel || '').trim() || 'Not set';
  const sessionEndsAtIso = request?.sessionEndsAt ? new Date(request.sessionEndsAt).toISOString() : null;
  const distanceLabel = (() => {
    const raw = Number(request?.distanceMeters || 0);
    if (!Number.isFinite(raw) || raw <= 0) return 'Nearby';
    if (raw < 1000) return `${Math.round(raw)} meters away`;
    return `${(raw / 1000).toFixed(1)} km away`;
  })();

  useEffect(() => {
    const tick = () => {
      const u = formatMeetingWindowCountdownTick(sessionEndsAtIso);
      setCountdownText(u.line);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sessionEndsAtIso]);

  useEffect(() => {
    if (!sessionEndsAtIso) return;
    const current = new Date(sessionEndsAtIso).getTime();
    const prev = prevSessionEndRef.current;
    if (prev && current > prev) {
      const diffMin = Math.max(1, Math.round((current - prev) / 60000));
      setDelayHistory((prevRows) => [
        { id: `ext_${Date.now()}`, text: `Requester extended by ${diffMin} min`, at: new Date().toISOString() },
        ...prevRows,
      ]);
    }
    prevSessionEndRef.current = current;
  }, [sessionEndsAtIso]);

  useEffect(() => {
    prevSessionEndRef.current = null;
  }, [requestId]);

  useEffect(() => {
    if (!requestId || !request) return;
    const fromApi = Number(
      request?.requestedDurationMinutes ?? request?.requestedMinutes ?? request?.durationMinutes ?? 0
    );
    const fromLabel = parseMinutesFromDurationLabel(request?.requestedDurationLabel);
    const mins = Math.max(1, fromApi || fromLabel || 30);
    const labelFromApi = String(request?.requestedDurationLabel || '').trim();
    const initialText = labelFromApi
      ? `Requested window: ${labelFromApi}`
      : `Requested window: ~${formatMinutesAsDurationLabel(mins)}`;

    if (delayHistoryRequestIdRef.current !== requestId) {
      delayHistoryRequestIdRef.current = requestId;
      setDelayHistory([
        {
          id: 'initial_window',
          text: initialText,
          at: request?.matchedAt || request?.createdAt || new Date().toISOString(),
        },
      ]);
      return;
    }

    setDelayHistory((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: 'initial_window',
          text: initialText,
          at: request?.matchedAt || request?.createdAt || new Date().toISOString(),
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

  const loadOfferHistory = useCallback(async () => {
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
      setOfferHistory(list);
    } catch (e) {
      // ignore
    }
  }, [requestId]);

  useEffect(() => {
    loadOfferHistory();
  }, [loadOfferHistory]);

  const handlePullRefresh = useCallback(async () => {
    setPullRefreshing(true);
    try {
      await refreshRequestDetails();
      await loadOfferHistory();
    } finally {
      setPullRefreshing(false);
    }
  }, [refreshRequestDetails, loadOfferHistory]);

  useEffect(() => {
    setOfferHistoryThumbFailed({});
  }, [requestId]);

  useEffect(() => {
    let socket;
    const setup = async () => {
      socket = await connectSocket();
      if (!socket) return;
      const onBorrowResponse = (payload) => {
        if (String(payload?.requestId || '') !== String(requestId || '')) return;
        loadOfferHistory();
      };
      const onOfferResponse = (payload) => {
        if (String(payload?.requestId || '') !== String(requestId || '')) return;
        loadOfferHistory();
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
  }, [requestId, loadOfferHistory]);

  useEffect(() => {
    const onItemsChanged = ({ requestId: rid } = {}) => {
      if (String(rid || '') !== String(requestId || '')) return;
      loadOfferHistory();
    };
    appEvents.on('help:borrow_offer_items_changed', onItemsChanged);
    return () => appEvents.off('help:borrow_offer_items_changed', onItemsChanged);
  }, [requestId, loadOfferHistory]);

  const uploadOfferPhoto = useCallback(async (localUri) => {
    if (!localUri) return;
    try {
      setIsUploadingOfferImage(true);
      const auth = await loadAuth();
      if (!auth?.accessToken) throw new Error('No auth');
      const form = new FormData();
      const filename = localUri.split('/').pop() || `offer_${Date.now()}.jpg`;
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
      setOfferImageUrl(rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`);
      setOfferImagePreviewUri(localUri);
    } catch (e) {
      showAlert('Upload failed', 'Unable to upload photo. Please try again.', [{ text: 'OK', onPress: closeAlert }]);
    } finally {
      setIsUploadingOfferImage(false);
    }
  }, []);

  const handleOpenCameraForOffer = useCallback(async () => {
    setPhotoPickerOfferVisible(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      showAlert('Permission required', 'Camera permission is required.', [{ text: 'OK', onPress: closeAlert }]);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadOfferPhoto(result.assets[0].uri);
    }
  }, [uploadOfferPhoto]);

  const handleOpenGalleryForOffer = useCallback(async () => {
    setPhotoPickerOfferVisible(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      showAlert('Permission required', 'Gallery permission is required.', [{ text: 'OK', onPress: closeAlert }]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: true,
      mediaTypes: ['images'],
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await uploadOfferPhoto(result.assets[0].uri);
    }
  }, [uploadOfferPhoto]);

  const handleOfferItemSubmit = useCallback(async () => {
    try {
      if (!requestId) return;
      const label = String(offerItemName || '').trim();
      if (!label) {
        showAlert('Missing item', 'Please enter the item name.', [{ text: 'OK', onPress: closeAlert }]);
        return;
      }
      setIsOfferSubmitting(true);
      const auth = await loadAuth();
      if (!auth?.accessToken) throw new Error('No auth');
      await createOfferItemRequest(auth.accessToken, requestId, {
        itemName: label,
        note: String(offerNote || '').trim(),
        requestedMinutes: Number(offerDuration || 30),
        imageUrl: String(offerImageUrl || '').trim(),
      });
      await loadOfferHistory();
      setOfferItemName('');
      setOfferNote('');
      setOfferImageUrl('');
      setOfferImagePreviewUri('');
      setOfferDuration(30);
      setOfferCustomMinutes('');
      showAlert(
        'Offer sent',
        'Your offer has been sent to the requester.',
        [{ text: 'OK', onPress: closeAlert, style: 'primary' }],
        'check-circle',
        '#28C76F'
      );
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Could not send offer right now.';
      showAlert('Unable to send', String(msg), [{ text: 'OK', onPress: closeAlert }]);
    } finally {
      setIsOfferSubmitting(false);
    }
  }, [requestId, offerItemName, offerNote, offerDuration, offerImageUrl, loadOfferHistory]);

  const handleSubmitRequestReport = useCallback(async () => {
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
          reporterRole: 'helper',
          category: reportCategory,
          details: String(reportDetails || '').trim(),
        });
      }
      setReportDetails('');
      setEditingReportId('');
      await loadReportHistory();
      showAlert(
        editingReportId ? 'Report updated' : 'Report submitted',
        editingReportId ? 'Your report has been updated.' : 'Your report has been sent for review.',
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

  const renderBottomTabContent = () => {
    if (activeBottomTab === 'offer') {
      return (
        <View style={[styles.bottomPanelCard, styles.bottomPanelScreen]}>
          <Text style={styles.bottomPanelTitle}>Offer Item</Text>
          <TouchableOpacity
            style={styles.photoBox}
            onPress={() => setPhotoPickerOfferVisible(true)}
            disabled={isUploadingOfferImage}
          >
            <Icon name="camera" size={22} color="#4B5563" />
            <Text style={styles.photoBoxText}>
              {isUploadingOfferImage ? 'Uploading...' : offerImagePreviewUri ? 'Change Photo' : 'Add Photo'}
            </Text>
          </TouchableOpacity>
          {offerImagePreviewUri ? (
            <Image source={{ uri: offerImagePreviewUri }} style={styles.borrowPreviewImage} resizeMode="cover" />
          ) : null}
          <TextInput
            value={offerItemName}
            onChangeText={setOfferItemName}
            placeholder="Item name"
            placeholderTextColor="#9CA3AF"
            style={styles.panelInput}
          />
          <TextInput
            value={offerNote}
            onChangeText={setOfferNote}
            placeholder="Message (optional)"
            placeholderTextColor="#9CA3AF"
            style={styles.panelInput}
          />
          <View style={styles.durationRow}>
            {[30, 60, 120].map((m) => (
              <TouchableOpacity
                key={String(m)}
                style={[styles.durationChip, offerDuration === m && styles.durationChipActive]}
                onPress={() => setOfferDuration(m)}
              >
                <Text style={[styles.durationChipText, offerDuration === m && styles.durationChipTextActive]}>
                  {m < 60 ? `${m} min` : `${m / 60} hour${m === 120 ? 's' : ''}`}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.durationChip, offerDuration > 120 && styles.durationChipActive]}
              onPress={() => {
                const parsed = Number(offerCustomMinutes || 0);
                if (parsed > 0) setOfferDuration(parsed);
              }}
            >
              <Text style={[styles.durationChipText, offerDuration > 120 && styles.durationChipTextActive]}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            value={offerCustomMinutes}
            onChangeText={setOfferCustomMinutes}
            placeholder="Custom minutes (optional)"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            style={styles.panelInput}
          />
          <TouchableOpacity
            style={styles.requestActionButton}
            onPress={handleOfferItemSubmit}
            disabled={isOfferSubmitting}
          >
            <Text style={styles.requestActionButtonText}>{isOfferSubmitting ? 'Sending...' : 'Offer'}</Text>
          </TouchableOpacity>
          <View style={styles.borrowHistoryWrap}>
            <Text style={styles.borrowHistoryTitle}>Item requests & offers</Text>
            {(offerHistory || [])
              .slice(0, 15)
              .map((row, index) => {
                const hid = String(row?._id || `offer_hist_${index}`);
                const thumbUri = resolveBorrowImageUri(row?.imageUrl);
                const showThumb = thumbUri && !offerHistoryThumbFailed[hid];
                const sentAt = formatBorrowDateTime(row?.createdAt);
                const actedAt = formatBorrowDateTime(row?.actedAt);
                const isPending = String(row?.status || '').toLowerCase() === 'pending';
                const st = String(row?.status || 'pending');
                const by = String(row?.initiatedBy || '').toLowerCase();
                const metaLead =
                  by === 'requester'
                    ? `Requester asked · ${Number(row?.requestedMinutes || 0)} min`
                    : `You offered · ${Number(row?.requestedMinutes || 0)} min`;
                return (
                  <View key={hid} style={styles.borrowHistoryDetailRow}>
                    {showThumb ? (
                      <Image
                        source={{ uri: thumbUri }}
                        style={styles.borrowHistoryThumb}
                        onError={() => setOfferHistoryThumbFailed((p) => ({ ...p, [hid]: true }))}
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
                          {st}
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
                    {by === 'requester' && (isPending || row?.status === 'declined') ? (
                      <View style={styles.historyActionRow}>
                        <TouchableOpacity
                          style={styles.historyActionBtn}
                          onPress={() => handleRespondToBorrow(hid, 'accept')}
                        >
                          <Text style={styles.historyActionBtnText}>Accept</Text>
                        </TouchableOpacity>
                        {isPending && (
                          <TouchableOpacity
                            style={[styles.historyActionBtn, styles.historyActionBtnDecline]}
                            onPress={() => handleRespondToBorrow(hid, 'decline')}
                          >
                            <Text style={styles.historyActionBtnText}>Decline</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : null}
                  </View>
                  </View>
                );
              })}
            {!(offerHistory || []).some((row) => String(row?.initiatedBy || '').toLowerCase() === 'helper') ? (
              <Text style={styles.bottomPanelMuted}>No offers sent yet.</Text>
            ) : null}
          </View>
        </View>
      );
    }
    if (activeBottomTab === 'delay') {
      const latestDelayAt = delayHistory?.[0]?.at
        ? new Date(delayHistory[0].at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : null;
      return (
        <View style={[styles.bottomPanelCard, styles.bottomPanelScreen]}>
          <View style={styles.delayHeroCard}>
            <View style={styles.delayHeroTop}>
              <View style={styles.delayHeroIcon}>
                <Icon name="clock-outline" size={18} color="#DC5C69" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.delayHeroTitle}>Time & extensions</Text>
                <Text style={styles.delayHeroSub}>{MEETING_TIME_COPY.delayTabHelperLead}</Text>
              </View>
            </View>
            <View style={styles.delayStatsRow}>
              <View style={styles.delayStatCard}>
                <Text style={styles.delayStatLabel}>{MEETING_TIME_COPY.plannedDurationLabel}</Text>
                <Text style={styles.delayStatValue}>{requestedDurationLabel}</Text>
                <Text style={styles.delayStatHint}>{MEETING_TIME_COPY.plannedDurationHint}</Text>
              </View>
              <View style={styles.delayStatCard}>
                <Text style={styles.delayStatLabel}>{MEETING_TIME_COPY.countdownLabel}</Text>
                <Text style={styles.delayStatValue}>{countdownText}</Text>
                <Text style={styles.delayStatHint}>{MEETING_TIME_COPY.countdownHint}</Text>
              </View>
            </View>
            {latestDelayAt ? (
              <Text style={styles.delayLatestText}>Last update at {latestDelayAt}</Text>
            ) : (
              <Text style={styles.delayLatestText}>No delay update yet</Text>
            )}
          </View>

          <View style={styles.delayInfoBox}>
            <Icon name="information-outline" size={16} color="#7C3AED" />
            <Text style={styles.delayInfoText}>
              Here, &quot;delay&quot; means the requester extended the meeting window (extra time before the timer ends). It is not travel delay. Use chat to coordinate arrival.
            </Text>
          </View>

          <View style={styles.borrowHistoryWrap}>
            <Text style={styles.borrowHistoryTitle}>Extension history</Text>
            {delayHistory.slice(0, 6).map((row, index) => (
              <View key={String(row?.id || `d_hist_${index}`)} style={styles.borrowHistoryRow}>
                <Text style={styles.borrowHistoryText}>{String(row?.text || 'Extension update')}</Text>
                <Text style={styles.borrowStatusText}>
                  {new Date(row?.at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
            {!delayHistory.length ? (
              <Text style={styles.bottomPanelMuted}>No extension updates yet.</Text>
            ) : null}
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
        <View style={[styles.bottomPanelCard, styles.bottomPanelScreen]}>
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
            placeholder="Add report details (optional)"
            placeholderTextColor="#9CA3AF"
            style={styles.reportDetailsInput}
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.reportDisclaimerText}>
            Reports are reviewed after incidents are closed. They are not monitored in real time.
          </Text>

          <TouchableOpacity style={[styles.reportSubmitButton, isReporting && styles.chipDisabled]} onPress={handleSubmitRequestReport} disabled={isReporting}>
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
    return (
      <View style={[styles.bottomPanelCard, styles.bottomPanelScreen]}>
        <Text style={styles.moreScreenTitle}>More options</Text>
        <Text style={styles.moreScreenSubtitle}>Quick controls for this help session.</Text>

        <View style={styles.moreHeroCard}>
          <View style={styles.moreHeroRow}>
            <Icon name="hand-heart-outline" size={20} color="#DC5C69" />
            <Text style={styles.moreHeroTitle}>Helper actions</Text>
          </View>
          <Text style={styles.moreHeroText}>
            Stay coordinated with requester, manage borrow offers, and close safely when done.
          </Text>
        </View>

        <TouchableOpacity style={styles.moreActionButton} onPress={() => setActiveBottomTab('offer')}>
          <View style={styles.moreActionLeft}>
            <Icon name="briefcase-outline" size={18} color="#DC5C69" />
            <Text style={styles.moreActionLabel}>Open Offer Item</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.moreActionButton} onPress={() => setActiveBottomTab('report')}>
          <View style={styles.moreActionLeft}>
            <Icon name="alert-decagram-outline" size={18} color="#DC5C69" />
            <Text style={styles.moreActionLabel}>Open Report tab</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.moreActionButton} onPress={() => handleOpenChat()}>
          <View style={styles.moreActionLeft}>
            <Icon name="message-text-outline" size={18} color="#DC5C69" />
            <Text style={styles.moreActionLabel}>Message requester</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.morePrimaryCta} onPress={() => navigation.navigate(ROUTES.helperClosure, { requestId })}>
          <Icon name="check-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.morePrimaryCtaText}>Complete and close session</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header 
        title="Nearby Help Request" 
        onBackPress={goHomeFromMeeting}
        style={{ borderBottomWidth: 1, borderBottomColor: '#E8EAED' }}
        rightComponent={
          <TouchableOpacity 
            onPress={() => handleOpenChat()} 
            style={{ padding: scale(8), position: 'relative' }}
          >
            <Icon name="message-text-outline" size={scale(24)} color="#DC5C69" />
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute',
                right: scale(4),
                top: scale(4),
                backgroundColor: '#EF4444',
                borderRadius: scale(10),
                minWidth: scale(18),
                height: scale(18),
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: '#FFFFFF'
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: ms(10), fontWeight: '700' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />
      <ScrollView 
        style={{flex: 1}} 
        contentContainerStyle={{flexGrow: 1, paddingBottom: scale(120)}}
        alwaysBounceVertical={true}
        bounces={true}
        overScrollMode="always"
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={pullRefreshing} onRefresh={handlePullRefresh} {...sociusRefreshProps} />
        }
      >
        <View style={styles.contentContainer}>
        {activeBottomTab === 'overview' ? (
        <>
        {inClosure && (
          <View style={styles.closureBanner}>
            <Icon name="file-document-edit-outline" size={scale(20)} color="#92400E" style={{ marginRight: scale(8) }} />
            <Text style={styles.closureBannerText}>
              The requester started closure. Use the button below to submit your part so the request can finish.
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
                    <Icon name="map-marker-radius" size={42} color="#DC5C69" />
                  </Marker>
                )}
              </MapView>
            )}
            {/* Distance Badge */}
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>{distanceLabel}</Text>
            </View>
            {/* Fullscreen Button */}
            <TouchableOpacity
              style={styles.fullscreenButton}
              onPress={() => navigation.navigate('LocationMap')}
              activeOpacity={0.8}
            >
              <Icon name="fullscreen" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Open Navigation Button */}
        <TouchableOpacity style={styles.openNavButton} onPress={handleOpenMaps}>
          <Text style={styles.openNavText}>Open Navigation</Text>
        </TouchableOpacity>

        {/* Profile + Request Card */}
        <View style={styles.helperMainCard}>
          <View style={styles.helperAvatarFloating}>
            {(() => {
              const img = request?.requesterId?.profileImage || request?.user?.profileImage;
              return img ? (
                <Image
                  source={getProfileImage(img)}
                  style={styles.profileImageLarge}
                  resizeMode="cover"
                />
              ) : (
                <Icon name="account" size={74} color="#9CA3AF" />
              );
            })()}
          </View>
          <View style={styles.helperMainBody}>
            <Text style={styles.profileNameLarge}>
              {request?.requesterId?.fullName || request?.user?.name || "Riya Sharma"}
            </Text>
            <Text style={styles.profileStatus}>Waiting nearby</Text>
            <Text style={styles.requestDescriptionText}>
              {request?.description || "I need help with one print copy."}
            </Text>
            <View style={styles.helperSignalsDivider} />
          </View>

          <View style={styles.trustSignalsContainer}>
            {trustSignalItems.map((s) => {
              const active = !!requesterTrustSignals?.[s.key];
              return (
                <View key={s.key} style={[styles.trustSignalItem, !active && styles.trustSignalItemInactive]}>
                  <Icon name={s.icon} size={22} color={active ? s.color : '#CBD5E1'} />
                  <Text style={[styles.trustSignalText, !active && styles.trustSignalTextInactive]}>{s.label}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.helperSignalsDividerBottom} />
          <Text style={styles.trustSignalInfo}>Signals help you understand past participation.</Text>
        </View>

        {/* Quick Message Input */}
        <TouchableOpacity
          style={[styles.quickMessageInput, !isChatAllowed && styles.quickMessageDisabled]}
          onPress={() => isChatAllowed && handleOpenChat()}
          disabled={!isChatAllowed}
        >
          <Text style={styles.quickMessagePlaceholder}>
            {isChatAllowed ? 'Send quick message' : 'Chat unavailable during closure'}
          </Text>
        </TouchableOpacity>

        {/* Quick Reply Chips */}
        <View style={styles.chipsContainer}>
          <TouchableOpacity
            style={[styles.chip, !isChatAllowed && styles.chipDisabled]}
            onPress={() => isChatAllowed && handleOpenChat("I'm nearby")}
            disabled={!isChatAllowed}
          >
            <Text style={styles.chipText}>I'm nearby</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, !isChatAllowed && styles.chipDisabled]}
            onPress={() => isChatAllowed && handleOpenChat('Coming now')}
            disabled={!isChatAllowed}
          >
            <Text style={styles.chipText}>Coming now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, !isChatAllowed && styles.chipDisabled]}
            onPress={() => isChatAllowed && handleOpenChat('Where exactly are you?')}
            disabled={!isChatAllowed}
          >
            <Text style={styles.chipText}>Where exactly are you?</Text>
          </TouchableOpacity>
        </View>

        {/* Safety Card */}
        <View style={styles.safetyCard}>
          <Icon name="shield-check" size={24} color="#64748B" />
          <View style={styles.safetyTextContainer}>
            <Text style={styles.safetyTitle}>Meet in visible public areas.</Text>
            <Text style={styles.safetySubtitle}>You can step away anytime if something feels uncomfortable.</Text>
          </View>
        </View>
        </>
        ) : (
          renderBottomTabContent()
        )}
      </View>
      </ScrollView>

      {/* Fixed bottom action bar */}
      <View style={styles.bottomActionsBar}>
        <TouchableOpacity style={[styles.bottomActionItem, activeBottomTab === 'overview' && styles.bottomActionItemActive]} onPress={() => setActiveBottomTab('overview')}>
          <Icon name="map-outline" size={scale(22)} color={activeBottomTab === 'overview' ? '#DC5C69' : '#6B7280'} />
          <Text style={[styles.bottomActionText, activeBottomTab === 'overview' && styles.bottomActionTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomActionItem, activeBottomTab === 'offer' && styles.bottomActionItemActive]} onPress={() => setActiveBottomTab('offer')}>
          <Icon name="briefcase-outline" size={scale(22)} color={activeBottomTab === 'offer' ? '#DC5C69' : '#6B7280'} />
          <Text style={[styles.bottomActionText, activeBottomTab === 'offer' && styles.bottomActionTextActive]}>Offer Item</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomActionItem, activeBottomTab === 'delay' && styles.bottomActionItemActive]} onPress={() => setActiveBottomTab('delay')}>
          <Icon name="clock-fast" size={scale(22)} color={activeBottomTab === 'delay' ? '#DC5C69' : '#6B7280'} />
          <Text style={[styles.bottomActionText, activeBottomTab === 'delay' && styles.bottomActionTextActive]}>Delay</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomActionItem, activeBottomTab === 'report' && styles.bottomActionItemActive]} onPress={() => setActiveBottomTab('report')}>
          <Icon name="alert-decagram-outline" size={scale(22)} color={activeBottomTab === 'report' ? '#DC5C69' : '#6B7280'} />
          <Text style={[styles.bottomActionText, activeBottomTab === 'report' && styles.bottomActionTextActive]}>Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomActionItem, activeBottomTab === 'more' && styles.bottomActionItemActive]} onPress={() => setActiveBottomTab('more')}>
          <Icon name="dots-horizontal-circle-outline" size={scale(22)} color={activeBottomTab === 'more' ? '#DC5C69' : '#6B7280'} />
          <Text style={[styles.bottomActionText, activeBottomTab === 'more' && styles.bottomActionTextActive]}>More</Text>
        </TouchableOpacity>
      </View>

      <ChatModal
        visible={chatVisible}
        onClose={() => {
          setChatVisible(false);
          setPrefillMessage('');
        }}
        requestId={requestId}
        otherUserName={request?.user?.name}
        prefillMessage={prefillMessage}
        autoFocus={true}
      />
      <Modal
        visible={photoPickerOfferVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoPickerOfferVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.photoPickerBackdrop}
          onPress={() => setPhotoPickerOfferVisible(false)}
        >
          <View style={styles.photoPickerCard}>
            <Text style={styles.photoPickerTitle}>Add Photo</Text>
            <Text style={styles.photoPickerSubtitle}>Choose image source</Text>
            <View style={styles.photoPickerActions}>
              <TouchableOpacity style={styles.photoPickerBtn} onPress={handleOpenCameraForOffer}>
                <Icon name="camera-outline" size={18} color="#DC5C69" />
                <Text style={styles.photoPickerBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoPickerBtn} onPress={handleOpenGalleryForOffer}>
                <Icon name="image-outline" size={18} color="#DC5C69" />
                <Text style={styles.photoPickerBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.photoPickerCancelBtn} onPress={() => setPhotoPickerOfferVisible(false)}>
              <Text style={styles.photoPickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
  nearbyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  distanceBadge: {
    position: 'absolute',
    top: 10,
    left: '50%',
    marginLeft: -55,
    backgroundColor: '#DC5C69',
    paddingHorizontal: 12,
    paddingVertical: 5,
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
  helperMainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginTop: 23,
    marginBottom: 12,
    paddingTop: 60,
    paddingHorizontal: 14,
    paddingBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  helperAvatarFloating: {
    position: 'absolute',
    top: -30,
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  helperMainBody: {
    width: '100%',
    alignItems: 'center',
  },
  helperSignalsDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 10,
  },
  helperSignalsDividerBottom: {
    width: '100%',
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileImageWrapper: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
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
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileStatus: {
    fontSize: 13,
    color: '#667085',
    fontWeight: '500',
  },
  requestDescriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  requestDescriptionText: {
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 10,
  },
  trustSignalsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  trustSignalItem: {
    alignItems: 'center',
    minWidth: 86,
  },
  trustSignalItemInactive: {
    opacity: 0.65,
  },
  trustSignalText: {
    fontSize: 12,
    color: '#667085',
    marginTop: 3,
    fontWeight: '500',
  },
  trustSignalTextInactive: {
    color: '#94A3B8',
  },
  trustSignalInfo: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 2,
    fontStyle: 'italic',
  },
  quickMessageInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quickMessagePlaceholder: {
    fontSize: 15,
    color: '#999',
  },
  quickMessageDisabled: {
    opacity: 0.5,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#F7F7F8',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECEFF3',
  },
  chipText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  chipDisabled: {
    opacity: 0.45,
  },
  safetyCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  safetyTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  safetyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 1,
  },
  safetySubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  openNavButton: {
    backgroundColor: '#DC5C69',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#DC5C69',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  openNavText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  closeRequestButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#DC5C69',
  },
  closeRequestText: {
    color: '#DC5C69',
    fontSize: 15,
    fontWeight: '700',
  },
  closeRequestButtonDisabled: {
    opacity: 0.45,
  },
  bottomPanelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  bottomPanelScreen: {
    minHeight: Math.max(320, height * 0.62),
    justifyContent: 'flex-start',
  },
  bottomPanelTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  bottomPanelLine: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  bottomPanelMuted: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  delayHeroCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFDDE2',
    backgroundColor: '#FFF5F6',
    padding: 12,
    marginBottom: 10,
  },
  delayHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  delayHeroIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFE5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  delayHeroTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  delayHeroSub: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  delayStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  delayStatCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1D3D8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  delayStatLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  delayStatValue: {
    marginTop: 3,
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '700',
  },
  delayStatHint: {
    marginTop: 5,
    fontSize: 10,
    color: '#9CA3AF',
    lineHeight: 14,
  },
  delayLatestText: {
    marginTop: 8,
    fontSize: 11,
    color: '#B4234F',
    fontWeight: '600',
  },
  delayInfoBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  delayInfoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#5B21B6',
  },
  moreScreenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  moreScreenSubtitle: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 12,
    color: '#6B7280',
  },
  moreHeroCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F8D1D6',
    backgroundColor: '#FFF7F8',
    padding: 12,
    marginBottom: 10,
  },
  moreHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  moreHeroTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  moreHeroText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
  },
  moreActionButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moreActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moreActionLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '700',
  },
  morePrimaryCta: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#DC5C69',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  morePrimaryCtaText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  reportButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#DC5C69',
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  bottomActionTextActive: {
    color: '#DC5C69',
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
    height: 150,
    width: '100%',
    position: 'relative',
  },
  mapPreview: {
    width: '100%',
    height: '100%',
  },
  fullscreenButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(220, 92, 105, 0.9)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
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
  offerHistoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#ECEFF3',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  offerHistoryThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  offerHistoryThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerHistoryMain: {
    flex: 1,
    minWidth: 0,
  },
  offerHistoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  offerHistoryTitle: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
  },
  offerHistoryMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  offerHistoryMetaSmall: {
    marginTop: 2,
    fontSize: 11,
    color: '#9CA3AF',
  },
  offerHistoryNote: {
    marginTop: 6,
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
  },
  offerStatusPill: {
    textTransform: 'capitalize',
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EEF2F7',
    overflow: 'hidden',
  },
  offerStatusPillAccepted: {
    color: '#16A34A',
    backgroundColor: '#E8F7EE',
  },
  offerStatusPillDeclined: {
    color: '#DC2626',
    backgroundColor: '#FDECEC',
  },
  offerStatusPillPending: {
    color: '#B45309',
    backgroundColor: '#FEF3C7',
  },
  offerActionButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  offerMiniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  offerAcceptBtn: {
    backgroundColor: '#F04E4E',
  },
  offerDeclineBtn: {
    backgroundColor: '#E5E7EB',
  },
  offerMiniBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
  requestActionButton: {
    backgroundColor: '#E35F52',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  requestActionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
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
    fontSize: 22,
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
  borrowHistoryWrap: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF3',
    paddingTop: 10,
    gap: 8,
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
  historyActionRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  historyActionBtn: {
    backgroundColor: '#DC5C69',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  historyActionBtnDecline: {
    backgroundColor: '#94A3B8',
  },
  historyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  borrowHistoryNoteLine: {
    marginTop: 6,
    fontSize: 12,
    color: '#374151',
    lineHeight: 18,
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
    fontSize: 25,
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
    paddingHorizontal: 20,
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
  panelInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  borrowModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  borrowModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  borrowModalClose: {
    position: 'absolute',
    right: 12,
    top: 10,
    zIndex: 2,
  },
  borrowModalAvatarWrap: {
    alignItems: 'center',
    marginTop: 2,
  },
  borrowModalAvatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  borrowModalName: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 34,
    fontWeight: '700',
    color: '#111827',
  },
  borrowModalDivider: {
    marginTop: 8,
    marginBottom: 10,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  borrowMetaLine: {
    fontSize: 18,
    color: '#374151',
    marginBottom: 8,
  },
  borrowMetaLabel: {
    fontWeight: '700',
    color: '#111827',
  },
  borrowModalItemImage: {
    width: '100%',
    height: 170,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 14,
    backgroundColor: '#F3F4F6',
  },
  borrowModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  borrowModalBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  borrowModalAccept: {
    backgroundColor: '#F04E4E',
  },
  borrowModalDecline: {
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  borrowModalAcceptText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  borrowModalDeclineText: {
    color: '#1F2937',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default MatchingMapScreen;

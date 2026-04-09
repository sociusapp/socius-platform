import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ImageBackground,
  StatusBar,
  Keyboard,
  Dimensions,
  ToastAndroid,
  AppState,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  FadeInUp, 
  FadeInDown, 
  ZoomIn, 
  ZoomOut,
  Layout,
  FadeIn,
  FadeOut,
  BounceIn,
  SlideInDown
} from 'react-native-reanimated';
import SwipeableMessage from './SwipeableMessage';
import { LinearGradient } from 'expo-linear-gradient';
import { loadAuth } from '../../services/storage/asyncStorage.service';
import {
  getSessionByRequest,
  getMessages,
  markMessagesRead,
  sendMessage,
  sendRichMessage,
  uploadChatMedia,
  reactToMessage,
} from '../../services/api/chat.api';
import { getSocket, connectSocket } from '../../services/socket/socket.service';
import { baseURL } from '../../services/api/client';
import { buildChatBlockedCopy } from '../../utils/closureMessages';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import {
  setActiveChatSessionId,
  clearChatSessionNotifications,
} from '../../services/chat/chatNotificationSync';

/** Avoid static `expo-av` import: it touches native AV on load and StackNavigator eagerly loads ChatModal → startup crash on some devices. */
const loadExpoAv = () => import('expo-av');

const formatVoiceDuration = (sec) => {
  if (sec == null || Number.isNaN(sec)) return '0:00';
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
};

const QUICK_EMOJIS = ['😊', '👍', '❤️', '😂', '🙏', '😮', '✅', '👋'];

/** App-aligned pink / white palette */
const WA_COLORS = {
  sentBubble: '#FDECEF',
  receivedBubble: '#FFFFFF',
  sentText: '#1F2937',
  receivedText: '#1F2937',
  header: '#DC5C69',
  headerSecondary: '#C84D59',
  tickDelivered: '#98A2B3',
  tickRead: '#DC5C69',
  fab: '#DC5C69',
  pageBg: '#F8F9FB',
};

const InlineAudioPlayer = ({ uri, isMyMessage, durationSec: initialDurationSec }) => {
  const [playing, setPlaying] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(
    typeof initialDurationSec === 'number' && initialDurationSec > 0 ? initialDurationSec * 1000 : 0
  );
  const soundRef = useRef(null);
  const seekBarW = useRef(1);
  const barTint = isMyMessage ? 'rgba(31,41,55,0.24)' : 'rgba(152,162,179,0.35)';
  const iconTint = isMyMessage ? '#C84D59' : '#667085';

  const bars = useMemo(() => {
    const out = [];
    const s = uri || 'x';
    let h = 0;
    for (let i = 0; i < 36; i++) {
      h = ((h * 31 + s.charCodeAt(i % s.length)) % 12) + 4;
      out.push(h);
    }
    return out;
  }, [uri]);

  const onStatusUpdate = (s) => {
    if (!s?.isLoaded) return;
    if (typeof s.durationMillis === 'number' && s.durationMillis > 0) {
      setDurationMillis(s.durationMillis);
    }
    if (typeof s.positionMillis === 'number') setPositionMillis(s.positionMillis);
    if (s.didJustFinish) {
      setPlaying(false);
      setPositionMillis(0);
    }
  };

  const seekToRatio = async (ratio) => {
    try {
      if (!soundRef.current) return;
      const st = await soundRef.current.getStatusAsync();
      if (!st?.isLoaded || !st.durationMillis) return;
      const next = Math.max(0, Math.min(1, ratio)) * st.durationMillis;
      await soundRef.current.setPositionAsync(next);
      setPositionMillis(next);
    } catch (e) {
      console.warn('seek', e);
    }
  };

  const toggle = async () => {
    if (preparing) return;
    try {
      setPreparing(true);
      const { Audio } = await loadExpoAv();
      if (playing && soundRef.current) {
        await soundRef.current.pauseAsync();
        setPlaying(false);
        setPreparing(false);
        return;
      }
      if (soundRef.current) {
        const st = await soundRef.current.getStatusAsync();
        if (st.isLoaded && st.positionMillis > 0 && st.durationMillis && st.positionMillis < st.durationMillis - 50) {
          await soundRef.current.playAsync();
          setPlaying(true);
          setPreparing(false);
          return;
        }
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(onStatusUpdate);
      await sound.playAsync();
      setPlaying(true);
    } catch (e) {
      console.warn('Audio playback', e);
    } finally {
      setPreparing(false);
    }
  };

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync?.();
    };
  }, []);

  const total = durationMillis > 0 ? durationMillis : 1;
  const progress = total > 0 ? Math.min(1, positionMillis / total) : 0;
  const displaySec =
    durationMillis > 0
      ? formatVoiceDuration(durationMillis / 1000)
      : formatVoiceDuration(initialDurationSec || 0);

  return (
    <View style={styles.voiceRow} accessibilityRole="adjustable">
      <TouchableOpacity
        onPress={toggle}
        style={styles.voicePlayBtn}
        accessibilityLabel={preparing ? 'Loading audio' : playing ? 'Pause voice message' : 'Play voice message'}
        disabled={preparing}
      >
        {preparing ? (
          <ActivityIndicator size="small" color={iconTint} />
        ) : (
          <Icon name={playing ? 'pause' : 'play-arrow'} size={24} color={iconTint} />
        )}
      </TouchableOpacity>
      <View style={styles.voiceWaveBlock}>
        <View style={styles.voiceTopRow}>
          <View style={styles.voiceBars}>
            {bars.map((h, i) => (
              <View key={i} style={[styles.voiceBar, { height: h, backgroundColor: barTint }]} />
            ))}
          </View>
          <Text style={[styles.voiceTimeTop, isMyMessage ? styles.voiceTimeSent : styles.voiceTimeRecv]}>
            {displaySec}
          </Text>
        </View>
        <Pressable
          style={styles.voiceSeekHit}
          onPress={(e) => {
            const x = e.nativeEvent.locationX;
            const w = seekBarW.current || 1;
            seekToRatio(x / w);
          }}
          onLayout={(e) => {
            seekBarW.current = e.nativeEvent.layout.width;
          }}
        >
          <View style={styles.voiceProgressBg}>
            <View style={[styles.voiceProgressFg, { width: `${progress * 100}%` }]} />
            <View style={[styles.voiceThumb, { left: `${Math.min(100, Math.max(0, progress * 100))}%` }]} />
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const osmStaticMapUri = (lat, lng) =>
  `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=640x200&maptype=mapnik&markers=${lat},${lng},red-pushpin`;

const MediaLoadingOverlay = ({ label = 'Loading...' }) => (
  <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={styles.mediaLoadingOverlay}>
    <ActivityIndicator size="small" color="#FFFFFF" />
    <Text style={styles.mediaLoadingLabel}>{label}</Text>
  </Animated.View>
);

const ChatImageBubble = ({ uri, timeStr, statusIconOnImage, imageCaption, isMyMessage }) => {
  const [loadingImage, setLoadingImage] = useState(true);
  const [failedImage, setFailedImage] = useState(false);
  const isRemoteImage = /^https?:\/\//i.test(String(uri || ''));

  if (failedImage) {
    return (
      <View style={[styles.imageBubbleClip, imageCaption ? styles.imageBubbleClipAboveCaption : null]}>
        <View style={styles.imageFallbackInner}>
          <Icon name="broken-image" size={28} color="#94A3B8" />
          <Text style={styles.imageFallbackText}>Image unavailable</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.imageBubbleClip, imageCaption ? styles.imageBubbleClipAboveCaption : null]}>
        <Image
          source={{ uri }}
          style={styles.chatImageBleed}
          resizeMode="cover"
          onLoadStart={() => setLoadingImage(true)}
          onLoadEnd={() => setLoadingImage(false)}
          onError={() => {
            setLoadingImage(false);
            setFailedImage(true);
          }}
        />
        {loadingImage && isRemoteImage ? <MediaLoadingOverlay label="Loading image..." /> : null}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.52)']}
          locations={[0, 0.45, 1]}
          style={styles.imageShade}
        />
        <View style={styles.imageMetaOverlay}>
          <Text style={styles.imageMetaTime}>{timeStr}</Text>
          {statusIconOnImage}
        </View>
      </View>
      {imageCaption ? (
        <Text
          style={[styles.messageText, isMyMessage ? styles.sentMessageText : styles.recvMessageText, styles.imageCaption]}
          numberOfLines={12}
        >
          {imageCaption}
        </Text>
      ) : null}
    </>
  );
};

const LocationMapPreview = ({ lat, lng }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <View style={styles.locationMapBlock}>
        <View style={styles.locationMapHeader}>
          <Icon name="map" size={18} color="#C84D59" />
          <Text style={styles.locationMapHeaderTitle}>Map</Text>
        </View>
        <View style={styles.locationMapFallbackInner}>
          <Icon name="map" size={36} color="#2E7D32" style={{ opacity: 0.55 }} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.locationMapBlock}>
      <View style={styles.locationMapHeader}>
        <Icon name="map" size={18} color="#C84D59" />
        <Text style={styles.locationMapHeaderTitle}>Map</Text>
      </View>
      <Image
        source={{ uri: osmStaticMapUri(lat, lng) }}
        style={styles.locationMapImage}
        resizeMode="cover"
        onError={() => {
          setFailed(true);
        }}
      />
    </View>
  );
};

const ChatModal = ({ visible, onClose, requestId, otherUserName, otherUser, prefillMessage = '', autoFocus = false }) => {
  const insets = useSafeAreaInsets();
  /** Space under composer when keyboard closed (home indicator / nav bar). */
  const composerBottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 8);
  /** Gap above keyboard so the bar floats slightly (5–8px). */
  const KEYBOARD_GAP = 7;
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showEvt, (e) => {
      setKeyboardOpen(true);
      setKeyboardHeight(e?.endCoordinates?.height || 0);
    });
    const subHide = Keyboard.addListener(hideEvt, () => {
      setKeyboardOpen(false);
      setKeyboardHeight(0);
    });
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);
  const { width: layoutWidth } = useWindowDimensions();
  /** Explicit width so image/map bubbles don’t collapse to a narrow strip. */
  const mediaBubbleWidth = Math.round(Math.min(layoutWidth * 0.76, layoutWidth - 28));
  const navigation = useNavigation();
  const SOCIUS_PRIMARY = WA_COLORS.header;
  const WHATSAPP_TEXTURE_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEklEQVR4nGP4//8/AwMDAwMjAABV5gP6mQfR0QAAAABJRU5ErkJggg==';
  const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState(prefillMessage || '');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const [userId, setUserId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const localTypingTimeoutRef = useRef(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [reactionPicker, setReactionPicker] = useState(null);
  const [chatBlocked, setChatBlocked] = useState(false);
  const [chatBlockedReason, setChatBlockedReason] = useState('');
  const chatBlockedRef = useRef(false);
  const lastRequestIdRef = useRef(null);
  const recordingRef = useRef(null);
  const recordIntervalRef = useRef(null);
  const recordSecsRef = useRef(0);

  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadingKind, setUploadingKind] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [showQuickEmoji, setShowQuickEmoji] = useState(false);
  const suppressNextActiveRefreshRef = useRef(false);
  const lastAppStateRef = useRef(AppState.currentState);

  const scrollToLatest = () => {
    // Only scroll if list is ready
    if (!loading && flatListRef.current) {
      // Use non-animated scroll for instant positioning
      flatListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  };

  useEffect(() => {
    // Keyboard listener to scroll to latest
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        scrollToLatest();
      }
    );

    return () => {
      keyboardDidShowListener.remove();
    };
  }, [loading]); // Added loading dependency

  useEffect(() => {
    if (visible && requestId) {
      initializeChat();
    }
  }, [visible, requestId]);

  useEffect(() => {
    if (visible && session?._id) {
      setActiveChatSessionId(session._id);
      clearChatSessionNotifications(session._id);
    } else if (!visible) {
      setActiveChatSessionId(null);
    }
  }, [visible, session?._id]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      const prev = lastAppStateRef.current;
      lastAppStateRef.current = s;
      const becameActiveFromBackground = s === 'active' && /background|inactive/.test(String(prev || ''));
      if (!becameActiveFromBackground || !visible || !requestId) return;
      if (suppressNextActiveRefreshRef.current) {
        suppressNextActiveRefreshRef.current = false;
        return;
      }
      initializeChat();
    });
    return () => sub.remove();
  }, [visible, requestId]);

  useEffect(() => {
    chatBlockedRef.current = chatBlocked;
  }, [chatBlocked]);

  useEffect(() => {
    let socket = getSocket();
    
    const setupListeners = (s) => {
      if (!s) return;

      const addSystemMessage = (text) => {
        const systemMessage = {
          _id: null,
          localId: `system_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          text,
          senderId: null,
          createdAt: new Date().toISOString(),
          isSystem: true,
        };
        setMessages((prev) => [...prev, systemMessage]);
        scrollToLatest();
      };
      
      const handleNewMessage = (data) => {
        if (data.sessionId === session?._id) {
          setMessages((prev) => [...prev, data.message]);
          scrollToLatest();
          if (visible) {
            markRead(data.sessionId);
            s.emit('chat:mark_delivered', { sessionId: data.sessionId });
          }
        }
      };

      const handleMessageSent = (data) => {
        if (data.sessionId === session?._id) {
          // Update the pending message with actual data from server
          // Fix: Ensure we only update pending messages and use localId if available to avoid duplicates
          setMessages((prev) => 
            prev.map(msg => {
              if (msg.status === 'pending') {
                 // Match by localId if available (preferred)
                 if (data.localId && msg.localId === data.localId) {
                   return { ...data.message, status: 'sent', localId: msg.localId };
                 }
                 // Fallback: match by text if localId is missing
                 if (!data.localId && msg.text === data.message.text) {
                   return { ...data.message, status: 'sent' };
                 }
              }
              return msg;
            })
          );
          scrollToLatest();
        }
      };

      const handleDeliveredConfirmed = (data) => {
        if (data.sessionId === session?._id) {
          setMessages((prev) => 
            prev.map(msg => 
              msg.senderId === userId && !msg.isRead ? { ...msg, isDelivered: true } : msg
            )
          );
        }
      };

      const handleReadConfirmed = (data) => {
        if (data.sessionId === session?._id) {
          setMessages((prev) => 
            prev.map(msg => 
              msg.senderId === userId ? { ...msg, isRead: true, isDelivered: true } : msg
            )
          );
        }
      };

      const handleTyping = (data) => {
        if (data.sessionId === session?._id && data.userId !== userId) {
          setIsTyping(true);
          // Auto clear typing status after 5 seconds if no stop_typing received
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 5000);
        }
      };

      const handleStopTyping = (data) => {
        if (data.sessionId === session?._id && data.userId !== userId) {
          setIsTyping(false);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
      };

      const handleReactionUpdated = (data) => {
        if (data.sessionId === session?._id) {
          const updatedMessage = data.message;
          const updatedId = data.messageId || updatedMessage?._id;
          if (!updatedMessage || !updatedId) return;

          setMessages((prev) =>
            prev.map((msg) =>
              String(msg._id) === String(updatedId)
                ? { ...msg, reactions: updatedMessage.reactions || [] }
                : msg
            )
          );
        }
      };

      const handleMessagesLoaded = (data) => {
        if (data.sessionId === session?._id && Array.isArray(data.messages)) {
          console.log('ChatModal: Messages loaded via socket', data.messages.length);
          setMessages(data.messages);
          scrollToLatest();
          if (visible) {
            markRead(data.sessionId);
            s.emit('chat:mark_delivered', { sessionId: data.sessionId });
          }
        }
      };

      const handleError = (data) => {
        console.error('Chat socket error:', data);
        const code = String(data?.code || '').toUpperCase();
        const errorText = String(data?.error || data?.message || '');
        const isAuthIssue =
          code === 'SEND_FAILED' &&
          (errorText.toLowerCase().includes('not authorized') ||
            errorText.toLowerCase().includes('invalid or expired token'));
        const isClosed =
          code === 'SESSION_CLOSED' ||
          errorText.toLowerCase().includes('chat session is not active') ||
          errorText.toLowerCase().includes('chat is closed');

        if (isAuthIssue && session?._id) {
          // Token/socket mismatch can happen after relogin; reconnect and retry loading once.
          connectSocket().then((reconnected) => {
            if (reconnected?.connected) {
              reconnected.emit('chat:load_messages', { sessionId: session._id });
            }
          }).catch(() => {});
        }

        if (isClosed && !chatBlockedRef.current) {
          setChatBlocked(true);
          setChatBlockedReason('closed');
          addSystemMessage(buildChatBlockedCopy({
            requestId: data?.requestId || requestId,
            requestType: data?.requestType || 'Help request',
            reason: data?.reason || 'closed',
            occurredAt: data?.occurredAt || null,
          }));
        }
        if (Platform.OS === 'android') {
          ToastAndroid.show(data.message || 'Chat error', ToastAndroid.LONG);
        }
        // Revert optimistic updates if needed
      };

      const handleClosureInitiated = (data) => {
        if (String(data?.requestId) !== String(requestId)) return;
        if (!chatBlockedRef.current) {
          setChatBlocked(true);
          setChatBlockedReason('closing');
          addSystemMessage(buildChatBlockedCopy({
            requestId: data?.requestId || requestId,
            requestType: data?.requestType || 'Help request',
            reason: 'closing started',
            occurredAt: data?.occurredAt || null,
          }));
        }
      };

      const handleRequestClosed = (data) => {
        if (String(data?.requestId) !== String(requestId)) return;
        if (!chatBlockedRef.current) {
          setChatBlocked(true);
          setChatBlockedReason('closed');
          addSystemMessage(buildChatBlockedCopy({
            requestId: data?.requestId || requestId,
            requestType: data?.requestType || 'Help request',
            reason: data?.reason || 'closed',
            occurredAt: data?.occurredAt || null,
          }));
        }
      };

      s.on('chat:new_message', handleNewMessage);
      s.on('chat:message_sent', handleMessageSent);
      s.on('chat:messages_loaded', handleMessagesLoaded);
      s.on('chat:delivered_confirmed', handleDeliveredConfirmed);
      s.on('chat:read_confirmed', handleReadConfirmed);
      s.on('chat:typing', handleTyping);
      s.on('chat:stop_typing', handleStopTyping);
      s.on('chat:reaction_updated', handleReactionUpdated);
      s.on('chat:error', handleError);
      s.on('help:closure_initiated', handleClosureInitiated);
      s.on('help:request_closed', handleRequestClosed);
      
      // Load messages via socket when connected
      if (session?._id) {
        console.log('ChatModal: Requesting messages via socket for session:', session._id);
        s.emit('chat:load_messages', { sessionId: session._id });
      }
      
      return () => {
        s.off('chat:new_message', handleNewMessage);
        s.off('chat:message_sent', handleMessageSent);
        s.off('chat:messages_loaded', handleMessagesLoaded);
        s.off('chat:delivered_confirmed', handleDeliveredConfirmed);
        s.off('chat:read_confirmed', handleReadConfirmed);
        s.off('chat:typing', handleTyping);
        s.off('chat:stop_typing', handleStopTyping);
        s.off('chat:reaction_updated', handleReactionUpdated);
        s.off('chat:error', handleError);
        s.off('help:closure_initiated', handleClosureInitiated);
        s.off('help:request_closed', handleRequestClosed);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      };
    };

    let cleanup = () => {};

    if (!socket || !socket.connected) {
      connectSocket().then((s) => {
        if (s) {
          cleanup = setupListeners(s);
        }
      });
    } else {
      cleanup = setupListeners(socket);
    }

    return () => {
      if (cleanup) cleanup();
      if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
    };
  }, [session, visible, userId]); // Added userId dependency

  const initializeChat = async () => {
    // Reset state for new request or refresh
    setMessages([]);
    setLoading(true);
    setChatBlocked(false);
    setChatBlockedReason('');

    try {
      const auth = await loadAuth();
      console.log('ChatModal: Auth loaded:', auth);
      if (auth?.userId) {
        setUserId(auth.userId);
      }
      const token = auth?.accessToken;

      if (!token) {
        console.error('No token found');
        return;
      }

      const chatSessionResponse = await getSessionByRequest(token, requestId);
      if (chatSessionResponse?.success && chatSessionResponse?.data) {
        const sessionData = chatSessionResponse.data;
        setSession(sessionData); // Triggers socket setup and message loading
        
        lastRequestIdRef.current = requestId;
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (sessionId) => {
    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (token && sessionId) {
        // Emit socket event for real-time update (Instant Blue Tick)
        const socket = getSocket();
        if (socket && socket.connected) {
          socket.emit('chat:mark_read', { sessionId });
        }
        
        // Call API for persistence
        await markMessagesRead(token, sessionId);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleTextChange = (text) => {
    // Ensure text is always a string
    setInputText(String(text || ''));
    
    if (!session || !userId) return;

    const socket = getSocket();
    if (socket && socket.connected) {
      const receiverId = session.requesterId._id === userId 
        ? session.helperId._id 
        : session.requesterId._id;

      if (text.length > 0) {
        socket.emit('chat:typing', {
          sessionId: session._id,
          receiverId
        });

        // Clear existing timeout
        if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);

        // Set new timeout to stop typing
        localTypingTimeoutRef.current = setTimeout(() => {
          socket.emit('chat:stop_typing', {
            sessionId: session._id,
            receiverId
          });
        }, 2000);
      } else {
        socket.emit('chat:stop_typing', {
          sessionId: session._id,
          receiverId
        });
        if (localTypingTimeoutRef.current) clearTimeout(localTypingTimeoutRef.current);
      }
    }
  };

  const handleSend = async () => {
    // Ensure inputText is a string before trimming
    const trimmedText = (inputText || '').trim();
    if (!trimmedText || !session) return;
    
    // Stop typing immediately when sending
    if (localTypingTimeoutRef.current) {
      clearTimeout(localTypingTimeoutRef.current);
      const socket = getSocket();
      if (socket && socket.connected) {
         const receiverId = session.requesterId._id === userId 
          ? session.helperId._id 
          : session.requesterId._id;
          
        socket.emit('chat:stop_typing', {
          sessionId: session._id,
          receiverId
        });
      }
    }

    setSending(true);
    
    // Add optimistic pending message
    const localId = Date.now().toString();
    const pendingMessage = {
      _id: null,
      localId,
      text: trimmedText,
      senderId: userId,
      createdAt: new Date().toISOString(),
      read: false,
      status: 'pending',
      replyTo: replyingTo,
    };
    
    setMessages(prev => [...prev, pendingMessage]);
    scrollToLatest();
    setInputText(''); // Clear input immediately
    setReplyingTo(null); // Clear reply state

    try {
      let socket = getSocket();
      if (!socket || !socket.connected) {
        socket = await connectSocket();
      }

      if (socket && socket.connected) {
        socket.emit('chat:send', {
          sessionId: session._id,
          text: pendingMessage.text,
          localId, // Send localId to match response
          replyToId: replyingTo?._id || null,
        });
      } else {
        // Fallback to API
        console.warn('Socket not connected, using API fallback');
        const auth = await loadAuth();
        if (auth?.accessToken) {
          const response = await sendMessage(auth.accessToken, session._id, pendingMessage.text, replyingTo?._id || null);
          if (response?.success && response?.data) {
             // Replace pending message with actual one
             setMessages((prev) => 
               prev.map(msg => msg.localId === localId ? { ...response.data, status: 'sent', localId } : msg)
             );
          }
        }
      }
    } catch (error) {
      console.error('Send message error:', error);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Failed to send message', ToastAndroid.SHORT);
      }
      // Mark as failed or remove? For now, we leave it pending.
    } finally {
      setSending(false);
    }
  };

  const emitOrApiSend = async (payload) => {
    let socket = getSocket();
    if (!socket || !socket.connected) {
      socket = await connectSocket();
    }
    if (socket && socket.connected) {
      socket.emit('chat:send', payload);
      return;
    }
    const auth = await loadAuth();
    if (!auth?.accessToken || !session?._id) return;
    await sendRichMessage(auth.accessToken, session._id, {
      text: payload.text,
      replyToId: payload.replyToId || undefined,
      messageType: payload.messageType || 'text',
      attachment: payload.attachment || undefined,
    });
  };

  const sendMediaMessage = async ({ messageType, attachment, caption = '' }) => {
    if (!session?._id || chatBlocked || !userId) return;
    const replySnap = replyingTo;
    const replyToId = replySnap?._id || null;
    const localId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const pendingMessage = {
      _id: null,
      localId,
      text:
        caption ||
        (messageType === 'image'
          ? ''
          : messageType === 'audio'
            ? '🎤 Voice'
            : messageType === 'location'
              ? attachment?.address || '📍 Location'
              : '📎 File'),
      senderId: userId,
      createdAt: new Date().toISOString(),
      read: false,
      status: 'pending',
      replyTo: replySnap,
      messageType,
      attachment,
    };
    setMessages((prev) => [...prev, pendingMessage]);
    scrollToLatest();
    setReplyingTo(null);
    try {
      await emitOrApiSend({
        sessionId: session._id,
        text: pendingMessage.text,
        localId,
        replyToId: replyToId || undefined,
        messageType,
        attachment,
      });
    } catch (e) {
      console.warn('sendMediaMessage', e);
      if (Platform.OS === 'android') ToastAndroid.show('Failed to send', ToastAndroid.SHORT);
    }
  };

  const handlePickImage = async () => {
    if (chatBlocked || !session) return;
    suppressNextActiveRefreshRef.current = true;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      if (Platform.OS === 'android') ToastAndroid.show('Photo access needed', ToastAndroid.SHORT);
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    const localId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const localCaption = inputText.trim() || '';
    setMessages((prev) => [
      ...prev,
      {
        _id: null,
        localId,
        text: localCaption,
        senderId: userId,
        createdAt: new Date().toISOString(),
        read: false,
        status: 'pending',
        messageType: 'image',
        attachment: {
          localUri: asset.uri,
          mimeType: asset.mimeType || 'image/jpeg',
          fileName: asset.fileName || 'photo.jpg',
          size: asset.fileSize || 0,
        },
      },
    ]);
    scrollToLatest();
    setInputText('');

    try {
      setUploadingKind('image');
      setUploadProgress(0);
      const auth = await loadAuth();
      if (!auth?.accessToken) return;
      const file = {
        uri: asset.uri,
        name: asset.fileName || 'photo.jpg',
        type: asset.mimeType || 'image/jpeg',
      };
      const up = await uploadChatMedia(auth.accessToken, session._id, file, (p) => setUploadProgress(p));
      setUploadProgress(null);
      if (!up?.success || !up?.data?.url) throw new Error('Upload failed');
      const uploadedAttachment = {
        url: up.data.url,
        localUri: asset.uri,
        mimeType: up.data.mimeType,
        fileName: up.data.fileName,
        size: up.data.size,
      };
      setMessages((prev) =>
        prev.map((m) => (m.localId === localId ? { ...m, attachment: uploadedAttachment } : m))
      );
      await emitOrApiSend({
        sessionId: session._id,
        text: localCaption || '',
        localId,
        replyToId: null,
        messageType: 'image',
        attachment: uploadedAttachment,
      });
    } catch (e) {
      setUploadProgress(null);
      console.warn('image upload', e);
      setMessages((prev) => prev.map((m) => (m.localId === localId ? { ...m, status: 'failed' } : m)));
      if (Platform.OS === 'android') ToastAndroid.show('Image upload failed', ToastAndroid.SHORT);
    } finally {
      setUploadingKind('');
    }
  };

  const handleOpenCamera = async () => {
    if (chatBlocked || !session) return;
    suppressNextActiveRefreshRef.current = true;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      if (Platform.OS === 'android') ToastAndroid.show('Camera permission needed', ToastAndroid.SHORT);
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    const localId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const localCaption = inputText.trim() || '';
    setMessages((prev) => [
      ...prev,
      {
        _id: null,
        localId,
        text: localCaption,
        senderId: userId,
        createdAt: new Date().toISOString(),
        read: false,
        status: 'pending',
        messageType: 'image',
        attachment: {
          localUri: asset.uri,
          mimeType: asset.mimeType || 'image/jpeg',
          fileName: asset.fileName || 'photo.jpg',
          size: asset.fileSize || 0,
        },
      },
    ]);
    scrollToLatest();
    setInputText('');

    try {
      setUploadingKind('camera');
      setUploadProgress(0);
      const auth = await loadAuth();
      if (!auth?.accessToken) return;
      const file = {
        uri: asset.uri,
        name: asset.fileName || 'photo.jpg',
        type: asset.mimeType || 'image/jpeg',
      };
      const up = await uploadChatMedia(auth.accessToken, session._id, file, (p) => setUploadProgress(p));
      setUploadProgress(null);
      if (!up?.success || !up?.data?.url) throw new Error('Upload failed');
      const uploadedAttachment = {
        url: up.data.url,
        localUri: asset.uri,
        mimeType: up.data.mimeType,
        fileName: up.data.fileName,
        size: up.data.size,
      };
      setMessages((prev) =>
        prev.map((m) => (m.localId === localId ? { ...m, attachment: uploadedAttachment } : m))
      );
      await emitOrApiSend({
        sessionId: session._id,
        text: localCaption || '',
        localId,
        replyToId: null,
        messageType: 'image',
        attachment: uploadedAttachment,
      });
    } catch (e) {
      setUploadProgress(null);
      console.warn('camera upload', e);
      setMessages((prev) => prev.map((m) => (m.localId === localId ? { ...m, status: 'failed' } : m)));
      if (Platform.OS === 'android') ToastAndroid.show('Camera upload failed', ToastAndroid.SHORT);
    } finally {
      setUploadingKind('');
    }
  };

  const handleShareLocation = async () => {
    if (chatBlocked || !session) return;
    suppressNextActiveRefreshRef.current = true;
    try {
      setUploadingKind('location');
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        if (Platform.OS === 'android') ToastAndroid.show('Location permission needed', ToastAndroid.SHORT);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      let address = '';
      try {
        const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (rev?.[0]) {
          const r = rev[0];
          address = [r.name, r.street, r.city, r.region].filter(Boolean).join(', ');
        }
      } catch (e) {}
      await sendMediaMessage({
        messageType: 'location',
        attachment: {
          lat: latitude,
          lng: longitude,
          address: address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        },
        caption: inputText.trim() || '',
      });
      setInputText('');
    } catch (e) {
      console.warn('location', e);
      if (Platform.OS === 'android') ToastAndroid.show('Could not get location', ToastAndroid.SHORT);
    } finally {
      setUploadingKind('');
    }
  };

  const handlePickDocument = async () => {
    if (chatBlocked || !session) return;
    suppressNextActiveRefreshRef.current = true;
    try {
      setUploadingKind('file');
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: '*/*' });
      if (res.canceled) return;
      const asset = res.assets?.[0] || {
        uri: res.uri,
        name: res.name,
        mimeType: res.mimeType,
        size: res.size,
      };
      if (!asset?.uri) return;
      const size = asset.size || 0;
      if (size > 15 * 1024 * 1024) {
        if (Platform.OS === 'android') ToastAndroid.show('Max file size 15 MB', ToastAndroid.SHORT);
        return;
      }
      setUploadProgress(0);
      const auth = await loadAuth();
      if (!auth?.accessToken) return;
      const file = {
        uri: asset.uri,
        name: asset.name || 'document',
        type: asset.mimeType || 'application/octet-stream',
      };
      const up = await uploadChatMedia(auth.accessToken, session._id, file, (p) => setUploadProgress(p));
      setUploadProgress(null);
      if (!up?.success || !up?.data?.url) throw new Error('Upload failed');
      await sendMediaMessage({
        messageType: 'file',
        attachment: {
          url: up.data.url,
          mimeType: up.data.mimeType,
          fileName: up.data.fileName,
          size: up.data.size,
        },
        caption: inputText.trim() || '',
      });
      setInputText('');
    } catch (e) {
      setUploadProgress(null);
      console.warn('document', e);
      if (Platform.OS === 'android') ToastAndroid.show('File upload failed', ToastAndroid.SHORT);
    } finally {
      setUploadingKind('');
    }
  };

  const stopRecordingAndSend = async () => {
    if (!isRecording || !recordingRef.current) return;
    try {
      setUploadingKind('audio');
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      setRecordSecs(0);
      if (!uri || !session) return;
      setUploadProgress(0);
      const auth = await loadAuth();
      if (!auth?.accessToken) return;
      const file = {
        uri,
        name: `voice_${Date.now()}.m4a`,
        type: 'audio/m4a',
      };
      const up = await uploadChatMedia(auth.accessToken, session._id, file, (p) => setUploadProgress(p));
      setUploadProgress(null);
      if (!up?.success || !up?.data?.url) throw new Error('Upload failed');
      await sendMediaMessage({
        messageType: 'audio',
        attachment: {
          url: up.data.url,
          mimeType: up.data.mimeType || 'audio/m4a',
          fileName: up.data.fileName,
          size: up.data.size,
          durationSec: recordSecsRef.current,
        },
        caption: '',
      });
    } catch (e) {
      setUploadProgress(null);
      setIsRecording(false);
      recordingRef.current = null;
      console.warn('voice send', e);
      if (Platform.OS === 'android') ToastAndroid.show('Voice message failed', ToastAndroid.SHORT);
    } finally {
      setUploadingKind('');
    }
  };

  const startRecording = async () => {
    if (chatBlocked || !session || isRecording) return;
    try {
      const { Audio } = await loadExpoAv();
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        if (Platform.OS === 'android') ToastAndroid.show('Microphone permission needed', ToastAndroid.SHORT);
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setIsRecording(true);
      setRecordSecs(0);
      recordSecsRef.current = 0;
      recordIntervalRef.current = setInterval(() => {
        recordSecsRef.current += 1;
        setRecordSecs(recordSecsRef.current);
      }, 1000);
    } catch (e) {
      console.warn('record start', e);
      if (Platform.OS === 'android') ToastAndroid.show('Could not start recording', ToastAndroid.SHORT);
    }
  };

  const cancelRecording = async () => {
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
      }
    } catch (e) {}
    recordingRef.current = null;
    setIsRecording(false);
    setRecordSecs(0);
  };

  const inputRef = useRef(null);

  // Handle prefillMessage and autoFocus when modal becomes visible
  useEffect(() => {
    if (visible && prefillMessage) {
      setInputText(String(prefillMessage || ''));
    }
    if (visible && autoFocus && inputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [visible, prefillMessage, autoFocus]);

  const handleReply = (message) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const getFullImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const apiRoot = baseURL.replace(/\/api\/?$/, '');
    return `${apiRoot}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const sessionOtherUser =
    session && userId
      ? (String(session.requesterId._id) === String(userId) ? session.helperId : session.requesterId)
      : null;
  const targetUser = otherUser || sessionOtherUser;

  const userImage = getFullImageUrl(targetUser?.profileImage);
  const displayName = otherUserName || targetUser?.fullName || 'User';

  const startCall = async () => {
    if (!session || !userId || chatBlockedRef.current) return;
    const otherId = String(session.requesterId?._id) === String(userId) ? session.helperId?._id : session.requesterId?._id;
    if (!otherId) return;
    const callId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    navigation.navigate('P2PCall', {
      callId,
      otherUserId: String(otherId),
      otherUserName: displayName,
      isCaller: true,
    });
  };

  const toggleLocalReaction = (message, currentUserId, emoji) => {
    const reactions = Array.isArray(message.reactions) ? [...message.reactions] : [];
    const existingIndex = reactions.findIndex((r) => String(r.userId) === String(currentUserId));

    if (existingIndex >= 0) {
      if (reactions[existingIndex].emoji === emoji) {
        reactions.splice(existingIndex, 1);
      } else {
        reactions[existingIndex] = { ...reactions[existingIndex], emoji };
      }
    } else {
      reactions.push({ userId: currentUserId, emoji });
    }

    return { ...message, reactions };
  };

  const handleSelectReaction = async (message, emoji) => {
    setReactionPicker(null);
    if (!message?._id || !userId) return;

    setMessages((prev) =>
      prev.map((m) => (String(m._id) === String(message._id) ? toggleLocalReaction(m, userId, emoji) : m))
    );

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('chat:react', { messageId: message._id, emoji });
      return;
    }

    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (token) await reactToMessage(token, message._id, emoji);
    } catch (e) {}
  };

  const handleDeleteMessage = async (message) => {
    setReactionPicker(null);
    const myId = String(userId || '');
    const senderId = String(message?.senderId?._id ?? message?.senderId ?? '');
    if (!message || !myId || senderId !== myId) return;

    const matchBy = (m) => {
      if (message?._id && m?._id) return String(m._id) === String(message._id);
      if (message?.localId && m?.localId) return String(m.localId) === String(message.localId);
      return false;
    };

    setMessages((prev) =>
      prev.map((m) =>
        matchBy(m)
          ? {
              ...m,
              text: 'This message was deleted',
              isDeleted: true,
              messageType: 'text',
              attachment: undefined,
              reactions: [],
              replyTo: null,
            }
          : m
      )
    );

    try {
      const socket = getSocket();
      // TODO: add backend socket/API support for persistent message delete.
      if (socket && socket.connected && message?._id) {
        socket.emit('chat:delete_message', { messageId: String(message._id), sessionId: session?._id });
      }
    } catch (e) {}
  };

  const openReactionPicker = (message, isMyMessage, event) => {
    if (!message?._id || message.status === 'pending') return;
    const { pageX, pageY } = event?.nativeEvent || {};
    if (typeof pageX !== 'number' || typeof pageY !== 'number') return;
    setReactionPicker({ message, isMyMessage, x: pageX, y: pageY, canDelete: !!isMyMessage });
  };

  const renderReactions = (message, isMyMessage) => {
    const reactions = Array.isArray(message.reactions) ? message.reactions : [];
    if (!reactions.length) return null;

    const counts = reactions.reduce((acc, r) => {
      const key = r.emoji;
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const items = Object.entries(counts);
    if (!items.length) return null;

    return (
      <View style={[styles.reactionsRow, isMyMessage ? styles.myReactionsRow : styles.theirReactionsRow]}>
        {items.map(([emoji, count]) => (
          <Animated.View
            entering={ZoomIn.duration(300)}
            layout={Layout.springify()}
            key={`${emoji}-${count}`}
            style={[styles.reactionPill, isMyMessage ? styles.myReactionPill : styles.theirReactionPill]}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            {count > 1 ? <Text style={styles.reactionCount}>{count}</Text> : null}
          </Animated.View>
        ))}
      </View>
    );
  };

  const renderMessage = ({ item }) => {
    if (item.isSystem) {
      return (
        <View style={styles.systemMessageRow}>
          <View style={styles.systemMessageBubble}>
            <Text style={styles.systemMessageText}>{item.text}</Text>
          </View>
        </View>
      );
    }
    // If we have duplicate keys in data, React might warn. 
    // But our keyExtractor handles item._id || item.localId || random.
    // However, if we have two items with same ID, key warning occurs.
    // Our merge logic prevents this.
    
    const msgSenderId = item.senderId?._id ?? item.senderId;
    const isMyMessage = String(msgSenderId) === String(userId);
    const hasReactions = item.reactions && item.reactions.length > 0;
    const mt = item.messageType || 'text';
    const att = item.attachment || {};
    const mediaUri = att.url ? getFullImageUrl(att.url) : att.localUri || null;
    const isImage = mt === 'image' && !!mediaUri;
    const isLocation = mt === 'location' && att.lat != null && att.lng != null;

    const timeStr = new Date(item.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    let statusIcon = null;
    let statusIconOnImage = null;
    if (isMyMessage) {
      if (item.status === 'pending' || !item._id) {
        statusIcon = <Icon name="access-time" size={13} color={WA_COLORS.tickDelivered} style={{ marginLeft: 3 }} />;
        statusIconOnImage = <Icon name="access-time" size={12} color="rgba(255,255,255,0.95)" style={{ marginLeft: 3 }} />;
      } else if (item.isRead) {
        statusIcon = <Ionicons name="checkmark-done" size={15} color={WA_COLORS.tickRead} style={{ marginLeft: 3 }} />;
        statusIconOnImage = <Ionicons name="checkmark-done" size={14} color="#B3E5FC" style={{ marginLeft: 3 }} />;
      } else if (item.isDelivered) {
        statusIcon = <Ionicons name="checkmark-done" size={15} color={WA_COLORS.tickDelivered} style={{ marginLeft: 3 }} />;
        statusIconOnImage = <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.85)" style={{ marginLeft: 3 }} />;
      } else {
        statusIcon = <Ionicons name="checkmark" size={15} color={WA_COLORS.tickDelivered} style={{ marginLeft: 3 }} />;
        statusIconOnImage = <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.85)" style={{ marginLeft: 3 }} />;
      }
    }

    const replyContent = item.replyTo ? (
      <View style={[styles.replySnippet, isMyMessage ? styles.myReplySnippet : styles.theirReplySnippet]}>
        <Text style={[styles.replySender, isMyMessage ? styles.myReplySender : styles.theirReplySender]}>
          {String(item.replyTo.senderId) === String(userId) ? 'You' : displayName}
        </Text>
        <Text style={[styles.replyText, isMyMessage ? styles.myReplyText : styles.theirReplyText]} numberOfLines={1}>
          {item.replyTo.text}
        </Text>
      </View>
    ) : null;

    const rawImageText = isImage ? (item.text || '').trim() : '';
    const imagePlaceholderLabels = new Set(['📷 Photo', '📷 photo', 'Photo']);
    const imageCaption =
      isImage && rawImageText && !imagePlaceholderLabels.has(rawImageText) ? rawImageText : '';
    const hasWhitespace = /\s/.test(String(item.text || ''));
    const shouldUseNoSpaceWideBubble =
      mt === 'text' &&
      !isImage &&
      !isLocation &&
      !hasWhitespace &&
      String(item.text || '').length >= 12;

    const renderMainBody = () => {
      if (isImage) {
        return (
          <ChatImageBubble
            uri={mediaUri}
            timeStr={timeStr}
            statusIconOnImage={statusIconOnImage}
            imageCaption={imageCaption}
            isMyMessage={isMyMessage}
          />
        );
      }
      if (isLocation) {
        return (
          <View style={styles.locationShell}>
            <LocationMapPreview lat={att.lat} lng={att.lng} />
            <View style={styles.locationBody}>
              <Text style={styles.locationLiveLabel}>Location</Text>
              <Text style={styles.locationAddr} numberOfLines={3}>
                {item.text || att.address || `${Number(att.lat).toFixed(4)}, ${Number(att.lng).toFixed(4)}`}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${att.lat},${att.lng}`)
                }
                activeOpacity={0.88}
                style={styles.openMapsBtnSolid}
              >
                <Icon name="directions" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.openMapsBtnSolidText}>Open in Maps</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }
      if (mt === 'audio' && mediaUri) {
        return (
          <InlineAudioPlayer
            uri={mediaUri}
            isMyMessage={isMyMessage}
            durationSec={att.durationSec}
          />
        );
      }
      if (mt === 'file' && mediaUri) {
        return (
          <View style={styles.fileCard}>
            <TouchableOpacity onPress={() => Linking.openURL(mediaUri)} activeOpacity={0.85}>
              <Text style={[styles.messageText, isMyMessage ? styles.sentMessageText : styles.recvMessageText]}>
                📎 {att.fileName || 'Attachment'}
              </Text>
              <Text style={styles.fileTapHint}>Tap to open</Text>
            </TouchableOpacity>
          </View>
        );
      }
      return (
        <Text
          style={[
            styles.messageText,
            isMyMessage ? styles.sentMessageText : styles.recvMessageText,
            item?.isDeleted && styles.deletedMessageText,
          ]}
        >
          {item.text}
        </Text>
      );
    };

    return (
      <SwipeableMessage
        onReply={() => handleReply(item)}
        isMyMessage={isMyMessage}
      >
          <View
            style={[
              styles.messageContainer,
              isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer,
              hasReactions && { marginBottom: 24 },
            ]}
          >
            <Pressable 
              onLongPress={(e) => openReactionPicker(item, isMyMessage, e)} 
              delayLongPress={140}
            >
              <View
                style={[
                  styles.bubbleOuter,
                  isMyMessage ? styles.bubbleOuterRight : styles.bubbleOuterLeft,
                  shouldUseNoSpaceWideBubble && styles.bubbleOuterNoSpaceWide,
                  (isImage || isLocation) && styles.bubbleOuterMedia,
                  (isImage || isLocation) && {
                    width: mediaBubbleWidth,
                    maxWidth: mediaBubbleWidth,
                  },
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble,
                    (isImage || isLocation) && styles.messageBubbleMedia,
                    isImage && !imageCaption && styles.messageBubbleImageOnly,
                  ]}
                >
                  {replyContent}
                  {renderMainBody()}
                  {!isImage ? (
                    <View style={styles.metaContainer}>
                      <Text style={[styles.timeText, isMyMessage ? styles.myTimeText : styles.theirTimeText]}>
                        {timeStr}
                      </Text>
                      {statusIcon}
                    </View>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.bubbleTail,
                    isMyMessage ? styles.bubbleTailSent : styles.bubbleTailReceived,
                  ]}
                  pointerEvents="none"
                />
              </View>
              {renderReactions(item, isMyMessage)}
            </Pressable>
          </View>
        </SwipeableMessage>
    );
  };

  const screenWidth = Dimensions.get('window').width;
  const pickerItemCount = REACTION_EMOJIS.length + (reactionPicker?.canDelete ? 1 : 0);
  const pickerWidth = pickerItemCount * 36 + 16;
  const androidKeyboardInset =
    Platform.OS === 'android' && keyboardOpen
      ? Math.max(0, keyboardHeight - insets.bottom - 6)
      : 0;
  const reactionPickerLeft = reactionPicker
    ? Math.min(Math.max(reactionPicker.x - pickerWidth / 2, 8), screenWidth - pickerWidth - 8)
    : 0;
  const reactionPickerTop = reactionPicker
    ? Math.max(reactionPicker.y - 72, insets.top + 8)
    : 0;

  const reversedMessages = useMemo(() => [...messages].reverse(), [messages]);

  const handleClose = () => {
    if (Platform.OS === 'android') {
      ToastAndroid.show('Chat minimized', ToastAndroid.SHORT);
    }
    onClose();
  };

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: SOCIUS_PRIMARY }}>
          {/* Status Bar Background */}
          <View style={{ height: insets.top, backgroundColor: SOCIUS_PRIMARY }}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
          </View>

          <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            {/* Header stays fixed; only the thread + composer avoid the keyboard. */}
            <View style={styles.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <TouchableOpacity onPress={handleClose} style={styles.backButton}>
                  <Icon name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.avatarContainer}>
                  {userImage ? (
                    <Image source={{ uri: userImage }} style={{ width: 36, height: 36, borderRadius: 18 }} />
                  ) : (
                    <Icon name="account-circle" size={36} color="#ccc" style={styles.avatar} />
                  )}
                </View>
                <TouchableOpacity style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
                  <Text style={styles.headerStatus}>{isTyping ? 'typing...' : 'Online'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.headerIcons}>
                {/* Call icon removed as per PROJECT_ISSUES.md task #1 */}
              </View>
            </View>

            <KeyboardAvoidingView
              style={[styles.keyboardView, styles.keyboardAvoidTransparent]}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 12}
            >
              {/* Chat body + composer: doodle/gradient fills to bottom (no solid slab). */}
              <ImageBackground
                source={{ uri: WHATSAPP_TEXTURE_URI }}
                style={styles.backgroundImage}
                imageStyle={styles.textureImage}
                resizeMode="cover"
              >
                <LinearGradient
                  colors={['rgba(248, 249, 251, 0.96)', 'rgba(253, 236, 239, 0.82)', 'rgba(248, 249, 251, 0.96)']}
                  style={styles.backgroundOverlay}
                >
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={SOCIUS_PRIMARY} />
                    </View>
                  ) : (
                    <FlatList
                      ref={flatListRef}
                      data={reversedMessages}
                      renderItem={renderMessage}
                      keyExtractor={(item, index) =>
                        String(
                          item._id ||
                            item.localId ||
                            `${item.createdAt || 'msg'}_${item.senderId?._id || item.senderId || 'u'}_${index}`
                        )
                      }
                      style={styles.messagesListTransparent}
                      contentContainerStyle={styles.messagesList}
                      showsVerticalScrollIndicator={false}
                      inverted
                      onContentSizeChange={() => requestAnimationFrame(scrollToLatest)}
                      initialNumToRender={20}
                      maxToRenderPerBatch={20}
                      windowSize={15}
                    />
                  )}

                  {replyingTo && (
                    <View style={styles.replyPreviewContainer}>
                      <View style={styles.replyPreviewContent}>
                        <View style={styles.replyBar} />
                        <View style={{ flex: 1, paddingLeft: 8 }}>
                          <Text style={styles.replySender}>
                            {String(replyingTo.senderId) === String(userId) ? 'You' : displayName}
                          </Text>
                          <Text style={styles.replyText} numberOfLines={1}>
                            {replyingTo.text}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={handleCancelReply} style={styles.closeReplyButton}>
                          <Icon name="close" size={20} color="#666" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {isRecording ? (
                    <View
                      style={[
                        styles.recordBar,
                        { paddingBottom: keyboardOpen ? KEYBOARD_GAP : 10 + composerBottomInset },
                        androidKeyboardInset > 0 ? { marginBottom: androidKeyboardInset } : null,
                      ]}
                    >
                      <View style={styles.recordDot} />
                      <Text style={styles.recordBarText}>Recording {recordSecs}s</Text>
                      <TouchableOpacity onPress={cancelRecording} style={styles.recordBtn}>
                        <Text style={styles.recordBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={stopRecordingAndSend}
                        style={[styles.recordBtn, styles.recordSendBtn]}
                        disabled={uploadingKind === 'audio'}
                      >
                        {uploadingKind === 'audio' ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={[styles.recordBtnText, { color: '#fff' }]}>Send</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {showQuickEmoji && !chatBlocked ? (
                        <View style={styles.quickEmojiBar}>
                          {QUICK_EMOJIS.map((em) => (
                            <TouchableOpacity
                              key={em}
                              onPress={() => {
                                setInputText((t) => `${t}${em}`);
                                inputRef.current?.focus();
                              }}
                              style={styles.quickEmojiBtn}
                            >
                              <Text style={styles.quickEmojiChar}>{em}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}

                      <View
                        style={[
                          styles.inputRow,
                          { paddingBottom: keyboardOpen ? KEYBOARD_GAP : 8 + composerBottomInset },
                          androidKeyboardInset > 0 ? { marginBottom: androidKeyboardInset } : null,
                        ]}
                      >
                        <View style={styles.combinedInputBar}>
                          <TouchableOpacity
                            onPress={() => {
                              setShowQuickEmoji((v) => !v);
                              inputRef.current?.focus();
                            }}
                            disabled={chatBlocked}
                            style={styles.inputBarIconBtn}
                            accessibilityLabel="Emoji"
                          >
                            <Icon name="emoji-emotions" size={24} color={chatBlocked ? '#ccc' : '#8696A0'} />
                          </TouchableOpacity>
                          <TextInput
                            ref={inputRef}
                            style={styles.input}
                            value={inputText}
                            onChangeText={handleTextChange}
                            placeholder={chatBlocked ? 'Chat closed' : 'Message'}
                            placeholderTextColor="#94A3B8"
                            multiline
                            editable={!chatBlocked}
                            scrollEnabled
                          />
                          <TouchableOpacity
                            onPress={handleShareLocation}
                            disabled={chatBlocked || uploadingKind === 'location'}
                            style={styles.inputBarIconBtn}
                            accessibilityLabel="Share location"
                          >
                            {uploadingKind === 'location' ? (
                              <ActivityIndicator size="small" color="#8696A0" />
                            ) : (
                              <Icon name="place" size={22} color={chatBlocked ? '#ccc' : '#8696A0'} />
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleOpenCamera}
                            disabled={chatBlocked || uploadingKind === 'camera' || uploadingKind === 'image'}
                            style={styles.inputBarIconBtn}
                            accessibilityLabel="Camera"
                          >
                            {uploadingKind === 'camera' || uploadingKind === 'image' ? (
                              <ActivityIndicator size="small" color="#8696A0" />
                            ) : (
                              <Icon name="photo-camera" size={22} color={chatBlocked ? '#ccc' : '#8696A0'} />
                            )}
                          </TouchableOpacity>
                        </View>

                        {(inputText || '').trim() ? (
                          <TouchableOpacity
                            onPress={handleSend}
                            disabled={chatBlocked || sending}
                            style={[styles.fabSend, chatBlocked && styles.fabDisabled]}
                            accessibilityLabel="Send message"
                          >
                            <Icon name="send" size={22} color="#fff" />
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            onPress={startRecording}
                            disabled={chatBlocked || uploadingKind === 'audio'}
                            style={[styles.fabSend, chatBlocked && styles.fabDisabled]}
                            accessibilityLabel="Record voice"
                          >
                            {uploadingKind === 'audio' ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Icon name="mic" size={24} color="#fff" />
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </>
                  )}
                </LinearGradient>
              </ImageBackground>
            </KeyboardAvoidingView>
          </View>

          {reactionPicker ? (
            <View style={styles.reactionOverlay}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setReactionPicker(null)}
                style={StyleSheet.absoluteFill}
              />
              <Animated.View 
                entering={ZoomIn.duration(200)}
                exiting={ZoomOut.duration(200)}
                style={[styles.reactionPicker, { left: reactionPickerLeft, top: reactionPickerTop, width: pickerWidth }]}
              >
                {REACTION_EMOJIS.map((emoji, index) => (
                  <Animated.View
                    key={emoji}
                    entering={BounceIn.delay(index * 60).springify().damping(12)}
                  >
                    <TouchableOpacity
                      onPress={() => handleSelectReaction(reactionPicker.message, emoji)}
                      style={styles.reactionEmojiButton}
                    >
                      <Text style={styles.reactionEmojiLarge}>{emoji}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
                {reactionPicker?.canDelete ? (
                  <Animated.View entering={BounceIn.delay(REACTION_EMOJIS.length * 60).springify().damping(12)}>
                    <TouchableOpacity
                      onPress={() => handleDeleteMessage(reactionPicker.message)}
                      style={[styles.reactionEmojiButton, styles.reactionDeleteButton]}
                      accessibilityLabel="Delete message"
                    >
                      <Icon name="delete-outline" size={18} color="#B4234F" />
                    </TouchableOpacity>
                  </Animated.View>
                ) : null}
              </Animated.View>
            </View>
          ) : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // container removed as we use custom structure
  keyboardView: {
    flex: 1,
  },
  keyboardAvoidTransparent: {
    backgroundColor: 'transparent',
  },
  messagesListTransparent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  backgroundOverlay: {
    flex: 1,
  },
  textureImage: {
    opacity: 0.08,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: WA_COLORS.header,
    elevation: 2,
    zIndex: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  backButton: {
    padding: 4,
    marginRight: 2,
    borderRadius: 20,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    marginTop: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerStatus: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 15,
    padding: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 8,
    paddingTop: 24,
    paddingBottom: 132,
    flexGrow: 1,
  },
  systemMessageRow: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 6,
  },
  systemMessageBubble: {
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    maxWidth: '85%',
  },
  systemMessageText: {
    color: '#334155',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  messageContainer: {
    marginBottom: 8,
    flexDirection: 'row',
    width: '100%',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
    paddingRight: 6,
    paddingLeft: 16,
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
    paddingLeft: 6,
    paddingRight: 16,
  },
  bubbleOuter: {
    position: 'relative',
    maxWidth: '95%',
    minWidth: 85,
    overflow: 'visible',
  },
  bubbleOuterNoSpaceWide: {
    maxWidth: '95%',
  },
  bubbleOuterRight: {
    alignSelf: 'flex-end',
  },
  bubbleOuterLeft: {
    alignSelf: 'flex-start',
  },
  bubbleOuterMedia: {
    flexShrink: 0,
  },
  bubbleTail: {
    position: 'absolute',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
  },
  bubbleTailSent: {
    top: 6,
    right: -5,
    borderLeftWidth: 10,
    borderLeftColor: 'transparent',
    borderTopWidth: 10,
    borderTopColor: WA_COLORS.sentBubble,
  },
  bubbleTailReceived: {
    top: 6,
    left: -5,
    borderRightWidth: 10,
    borderRightColor: 'transparent',
    borderTopWidth: 10,
    borderTopColor: WA_COLORS.receivedBubble,
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 22,
    borderRadius: 18,
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
  messageBubbleMedia: {
    paddingHorizontal: 0,
    paddingTop: 0,
    overflow: 'hidden',
    borderRadius: 15,
  },
  messageBubbleImageOnly: {
    paddingBottom: 0,
  },
  myMessageBubble: {
    backgroundColor: WA_COLORS.sentBubble,
  },
  theirMessageBubble: {
    backgroundColor: WA_COLORS.receivedBubble,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 21,
    paddingRight: 8,
  },
  sentMessageText: {
    color: WA_COLORS.sentText,
  },
  recvMessageText: {
    color: WA_COLORS.receivedText,
  },
  deletedMessageText: {
    fontStyle: 'italic',
    color: '#667085',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 5,
    right: 8,
    maxWidth: '92%',
  },
  timeText: {
    fontSize: 11,
    marginRight: 3,
    paddingBottom: 2,
    includeFontPadding: false,
  },
  myTimeText: {
    color: 'rgba(48, 48, 48, 0.45)',
    opacity: 0.85,
  },
  theirTimeText: {
    color: 'rgba(0, 0, 0, 0.38)',
    opacity: 0.9,
  },
  quickEmojiBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  quickEmojiBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  quickEmojiChar: {
    fontSize: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 6,
    backgroundColor: 'transparent',
  },
  combinedInputBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minHeight: 48,
    maxHeight: 140,
    marginRight: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: { elevation: 3 },
    }),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.07)',
  },
  inputBarIconBtn: {
    paddingHorizontal: 6,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    color: '#111',
    paddingHorizontal: 6,
    paddingVertical: Platform.OS === 'ios' ? 10 : 9,
    marginRight: 2,
    textAlignVertical: 'center',
  },
  fabSend: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: WA_COLORS.header,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  fabDisabled: {
    opacity: 0.45,
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: 300,
    minWidth: 200,
    paddingVertical: 6,
    paddingLeft: 4,
    paddingRight: 8,
  },
  voicePlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  voiceWaveBlock: {
    flex: 1,
    minWidth: 0,
  },
  voiceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  voiceBars: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 28,
    paddingRight: 8,
    marginRight: 4,
  },
  voiceBar: {
    width: 2,
    borderRadius: 1,
    maxHeight: 26,
  },
  voiceSeekHit: {
    width: '100%',
    paddingVertical: 4,
    justifyContent: 'center',
  },
  voiceProgressBg: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 2,
    overflow: 'visible',
    position: 'relative',
  },
  voiceProgressFg: {
    height: 4,
    backgroundColor: 'rgba(220, 92, 105, 0.35)',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  voiceThumb: {
    position: 'absolute',
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: WA_COLORS.tickRead,
    top: -3.5,
    marginLeft: -5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  voiceTimeTop: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
    marginLeft: 8,
  },
  voiceTimeSent: {
    color: 'rgba(48,48,48,0.55)',
  },
  voiceTimeRecv: {
    color: 'rgba(71, 84, 103, 0.75)',
  },
  imageBubbleClip: {
    position: 'relative',
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#E8E8E8',
  },
  imageBubbleClipAboveCaption: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  chatImageBleed: {
    width: '100%',
    minHeight: 180,
    height: 240,
    maxHeight: 300,
    backgroundColor: '#E8E8E8',
  },
  imageFallbackInner: {
    width: '100%',
    minHeight: 180,
    height: 220,
    maxHeight: 300,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackText: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  mediaLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  mediaLoadingLabel: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  imageShade: {
    ...StyleSheet.absoluteFillObject,
  },
  imageMetaOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    flexWrap: 'nowrap',
    paddingHorizontal: 12,
    paddingTop: 32,
    paddingBottom: 12,
  },
  imageMetaTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.95)',
    paddingBottom: 1,
    includeFontPadding: false,
  },
  imageCaption: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  locationShell: {
    overflow: 'hidden',
    borderRadius: 15,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: { elevation: 1 },
    }),
  },
  locationMapBlock: {
    width: '100%',
    overflow: 'hidden',
  },
  locationMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDECEF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(220, 92, 105, 0.15)',
  },
  locationMapHeaderTitle: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#C84D59',
  },
  locationMapImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F8F9FB',
  },
  locationMapFallbackInner: {
    height: 140,
    backgroundColor: '#F8F9FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  locationLiveLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C84D59',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  locationAddr: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  openMapsBtnSolid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    backgroundColor: '#DC5C69',
    borderRadius: 10,
  },
  openMapsBtnSolidText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fileCard: {
    paddingVertical: 4,
  },
  fileTapHint: {
    fontSize: 12,
    color: '#C84D59',
    fontWeight: '600',
    marginTop: 6,
  },
  callRequestButton: {
    backgroundColor: '#C84D59',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#C84D59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    marginRight: 6,
  },
  callCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    maxWidth: '90%',
  },
  callCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF0F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#F1D7DB',
  },
  callCardTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  callCardSubtitle: {
    color: '#475569',
    fontSize: 12,
    marginTop: 2,
  },
  callActionsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  callAcceptBtn: {
    flex: 1,
    backgroundColor: '#C84D59',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  callAcceptText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  callDeclineBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  callDeclineText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  callNowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  replyPreviewContainer: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  replyPreviewContent: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 5,
    overflow: 'hidden',
    padding: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  replyBar: {
    width: 4,
    backgroundColor: '#C84D59',
    height: '100%',
    borderRadius: 2,
  },
  replySender: {
    fontWeight: 'bold',
    color: '#C84D59',
    fontSize: 12,
    marginBottom: 2,
  },
  myReplySender: {
    color: '#C84D59',
  },
  theirReplySender: {
    color: '#C84D59',
  },
  replyText: {
    fontSize: 12,
    color: '#666',
  },
  myReplyText: {
    color: 'rgba(48, 48, 48, 0.75)',
  },
  theirReplyText: {
    color: '#666',
  },
  closeReplyButton: {
    padding: 5,
  },
  replySnippet: {
    marginBottom: 6,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  myReplySnippet: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderLeftColor: '#DC5C69',
  },
  theirReplySnippet: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderLeftColor: '#C84D59',
  },
  reactionsRow: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: -25,
    zIndex: 10,
  },
  myReactionsRow: {
    right: 10,
    justifyContent: 'flex-end',
  },
  theirReactionsRow: {
    left: 10,
    justifyContent: 'flex-start',
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    marginRight: 4,
  },
  myReactionPill: {
    // No specific style needed for now
  },
  theirReactionPill: {
    // No specific style needed for now
  },
  reactionEmoji: {
    fontSize: 12,
    marginRight: 2,
  },
  reactionCount: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  reactionOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  reactionPicker: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingVertical: 6,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  reactionEmojiButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  reactionDeleteButton: {
    backgroundColor: '#FFF1F3',
  },
  reactionEmojiLarge: {
    fontSize: 20,
  },
  uploadBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  uploadBarText: {
    color: '#475569',
    fontSize: 14,
    marginLeft: 10,
  },
  recordBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  recordDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  recordBarText: {
    flex: 1,
    fontWeight: '600',
    color: '#C84D59',
  },
  recordBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  recordSendBtn: {
    backgroundColor: WA_COLORS.fab,
    borderRadius: 8,
  },
  recordBtnText: {
    color: '#64748b',
    fontWeight: '700',
  },
});

export default ChatModal;

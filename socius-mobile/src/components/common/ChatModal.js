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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { getSessionByRequest, getMessages, markMessagesRead, sendMessage, reactToMessage } from '../../services/api/chat.api';
import { getSocket, connectSocket } from '../../services/socket/socket.service';
import { baseURL } from '../../services/api/client';

const ChatModal = ({ visible, onClose, requestId, otherUserName, otherUser }) => {
  const insets = useSafeAreaInsets();
  const SOCIUS_PRIMARY = '#C84D59';
  const WHATSAPP_TEXTURE_URI =
    'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png';
  const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  const [userId, setUserId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const localTypingTimeoutRef = useRef(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [reactionPicker, setReactionPicker] = useState(null);
  const lastRequestIdRef = useRef(null);

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
    let socket = getSocket();
    
    const setupListeners = (s) => {
      if (!s) return;
      
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
        if (Platform.OS === 'android') {
          ToastAndroid.show(data.message || 'Chat error', ToastAndroid.LONG);
        }
        // Revert optimistic updates if needed
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
    setInputText(text);
    
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
    if (!inputText.trim() || !session) return;
    
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
      text: inputText.trim(),
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

  const inputRef = useRef(null);

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

  const openReactionPicker = (message, isMyMessage, event) => {
    if (!message?._id || message.status === 'pending') return;
    const { pageX, pageY } = event?.nativeEvent || {};
    if (typeof pageX !== 'number' || typeof pageY !== 'number') return;
    setReactionPicker({ message, isMyMessage, x: pageX, y: pageY });
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
    // If we have duplicate keys in data, React might warn. 
    // But our keyExtractor handles item._id || item.localId || random.
    // However, if we have two items with same ID, key warning occurs.
    // Our merge logic prevents this.
    
    const isMyMessage = String(item.senderId) === String(userId);
    const hasReactions = item.reactions && item.reactions.length > 0;
    
    let statusIcon = null;
    if (isMyMessage) {
      if (item.status === 'pending' || !item._id) {
        statusIcon = <Icon name="access-time" size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />;
      } else if (item.isRead) {
        statusIcon = <Ionicons name="checkmark-done-outline" size={16} color="#FFF" style={{ marginLeft: 4 }} />;
      } else if (item.isDelivered) {
        statusIcon = <Ionicons name="checkmark-done-outline" size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />;
      } else {
        statusIcon = <Ionicons name="checkmark-outline" size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />;
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

    return (
      <View>
        <SwipeableMessage
          onReply={() => handleReply(item)}
          isMyMessage={isMyMessage}
        >
          <View
            style={[
              styles.messageContainer,
              isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer,
              hasReactions && { marginBottom: 28 }
            ]}
          >
            <Pressable onLongPress={(e) => openReactionPicker(item, isMyMessage, e)} delayLongPress={250}>
              <View
                style={[
                  styles.messageBubble,
                  isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble,
                ]}
              >
                {replyContent}
                <Text style={[styles.messageText, isMyMessage && styles.myMessageText]}>
                  {item.text}
                </Text>
                <View style={styles.metaContainer}>
                  <Text style={[styles.timeText, isMyMessage && styles.myTimeText]}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </Text>
                  {statusIcon}
                </View>
              </View>
              {renderReactions(item, isMyMessage)}
            </Pressable>
          </View>
        </SwipeableMessage>
      </View>
    );
  };

  const screenWidth = Dimensions.get('window').width;
  const pickerWidth = REACTION_EMOJIS.length * 36 + 16;
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
        
          <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
            
              <View style={styles.headerIcons} />
            </View>

            {/* Chat Body & Input */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}
              style={styles.keyboardView}
            >
              <ImageBackground
                source={{ uri: WHATSAPP_TEXTURE_URI }}
                style={styles.backgroundImage}
                imageStyle={styles.textureImage}
                resizeMode="cover"
              >
                <LinearGradient
                  colors={['rgba(255, 241, 242, 0.92)', 'rgba(255, 255, 255, 0.92)']}
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
                      keyExtractor={(item) => item._id || item.localId || Math.random().toString()}
                      contentContainerStyle={styles.messagesList}
                      showsVerticalScrollIndicator={false}
                      inverted
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

                  <View style={styles.inputWrapper}>
                    <View style={styles.inputContainer}>
                      <TextInput
                        ref={inputRef}
                        style={styles.input}
                        value={inputText}
                        onChangeText={handleTextChange}
                        placeholder="Message"
                        placeholderTextColor="#888"
                        multiline
                      />
                    </View>

                    <TouchableOpacity
                      onPress={handleSend}
                      disabled={!inputText.trim() && !sending}
                      style={styles.sendButton}
                    >
                      <Icon name="send" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
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
              </Animated.View>
            </View>
          ) : null}
        
          <View style={{ height: insets.bottom, backgroundColor: '#F5F5F5' }} />
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
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  backgroundOverlay: {
    flex: 1,
  },
  textureImage: {
    opacity: 0.18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(200, 77, 89, 0.88)',
    elevation: 4,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: 4,
    flexDirection: 'row',
    width: '100%',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  theirMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    minWidth: 120,
    paddingHorizontal: 10,
    paddingVertical: 6,
    paddingBottom: 22,
    borderRadius: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  myMessageBubble: {
    backgroundColor: '#C84D59',
    borderTopRightRadius: 2,
  },
  theirMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 2,
  },
  messageText: {
    fontSize: 16,
    color: '#303030',
    lineHeight: 22,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 4,
    right: 8,
  },
  timeText: {
    fontSize: 11,
    color: 'rgba(0, 0, 0, 0.45)',
    marginRight: 4,
  },
  myTimeText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 6,
    paddingBottom: Platform.OS === 'android' ? 6 : 6,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingVertical: 0,
    marginRight: 6,
    minHeight: 48,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(200, 77, 89, 0.12)',
    marginBottom: Platform.OS === 'ios' ? 5 : 0,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    color: '#000',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  sendButton: {
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
    color: '#FFF',
  },
  theirReplySender: {
    color: '#C84D59',
  },
  replyText: {
    fontSize: 12,
    color: '#666',
  },
  myReplyText: {
    color: 'rgba(255, 255, 255, 0.9)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderLeftColor: '#FFF',
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
    backgroundColor: '#fff4f4ff',
    borderWidth: 2,
    borderColor: '#9a3939ff',
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
    color: '#9a3939',
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
  reactionEmojiLarge: {
    fontSize: 20,
  },
});

export default ChatModal;

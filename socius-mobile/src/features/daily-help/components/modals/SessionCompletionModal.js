import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../../utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import { appEvents } from '../../../../services/socket/socket.service';

const SessionCompletionModal = () => {
  const [visible, setVisible] = useState(false);
  const [role, setRole] = useState('requester'); // 'requester' or 'helper'
  const [data, setData] = useState(null);
  const { ms, scale, spacing, vscale } = useResponsive();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const onRequesterEnd = (payload) => {
      setRole('requester');
      setData(payload);
      setVisible(true);
    };
    const onHelperEnd = (payload) => {
      setRole('helper');
      setData(payload);
      setVisible(true);
    };

    appEvents.on('help:session_ended_requester', onRequesterEnd);
    appEvents.on('help:session_ended_helper', onHelperEnd);

    return () => {
      appEvents.off('help:session_ended_requester', onRequesterEnd);
      appEvents.off('help:session_ended_helper', onHelperEnd);
    };
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, fadeAnim]);

  const close = () => {
    setVisible(false);
    setData(null);
  };

  const handleComplete = () => {
    if (data?.requestId) {
      appEvents.emit('help:run_complete_from_prompt', { requestId: data.requestId });
    }
    close();
  };

  const handleExtend = () => {
    if (data?.requestId) {
      appEvents.emit('help:run_extend_from_prompt', { requestId: data.requestId });
    }
    close();
  };

  const handleMessage = () => {
    if (data?.requestId) {
      appEvents.emit('open_chat', { requestId: data.requestId });
    }
    close();
  };

  if (!visible) return null;

  const isRequester = role === 'requester';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={[styles.card, { width: '90%', maxWidth: scale(400) }]}>
          <LinearGradient
            colors={['#F8FAFC', '#FFFFFF']}
            style={{ borderRadius: scale(24), padding: spacing(24) }}
          >
            <View style={styles.header}>
              <View style={[styles.iconCircle, { backgroundColor: isRequester ? '#F0FDF4' : '#FFF7ED' }]}>
                <Icon 
                  name={isRequester ? "check-decagram-outline" : "clock-alert-outline"} 
                  size={ms(32)} 
                  color={isRequester ? "#16A34A" : "#EA580C"} 
                />
              </View>
              <Text style={styles.title}>
                {isRequester ? 'Item Return Completed?' : 'Return Time Ended'}
              </Text>
              <Text style={styles.subtitle}>
                {isRequester 
                  ? 'The agreed time for item return has ended. Has it been completed?'
                  : 'The agreed time for returning the item has ended. Please follow up with the requester.'}
              </Text>
            </View>

            <View style={styles.actions}>
              {isRequester ? (
                <>
                  <TouchableOpacity style={styles.primaryBtn} onPress={handleComplete}>
                    <LinearGradient
                      colors={['#16A34A', '#15803D']}
                      style={styles.btnGradient}
                    >
                      <Text style={styles.btnText}>Yes, Completed</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.secondaryBtn} onPress={handleExtend}>
                    <Text style={styles.secondaryBtnText}>Need more time</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.primaryBtn} onPress={handleMessage}>
                    <LinearGradient
                      colors={['#0EA5E9', '#0284C7']}
                      style={styles.btnGradient}
                    >
                      <Text style={styles.btnText}>Message Requester</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.secondaryBtn} onPress={close}>
                    <Text style={styles.secondaryBtnText}>OK</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </LinearGradient>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  actions: {
    gap: 12,
  },
  primaryBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 54,
  },
  btnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryBtnText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SessionCompletionModal;

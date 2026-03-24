import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';

const STATUS_COLORS = {
  notified: '#38BDF8', // Skyblue for notified/pending
  accepted: '#22C55E', // Green for accepted
  declined: '#EF4444', // Red for declined/rejected
};

const IncomingPresenceAlarmModal = ({ visible, data, onDecline, onView, onClose, status = 'notified' }) => {
  const { ms, scale, spacing, vscale } = useResponsive();
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const btnPulse = useRef(new Animated.Value(0)).current;

  const pulseColor = '#DC5C69'; // Reverted to Red for modal pulse only

  const situation = String(data?.situation || 'Needs presence').trim();
  const area = String(data?.area || 'Location shared').trim();
  const distanceMeters = Number(data?.distanceMeters || 0) || 0;
  const distanceText = distanceMeters < 1000 ? `${distanceMeters}m away` : `${(distanceMeters / 1000).toFixed(1)} km away`;
  const requesterName = data?.requesterName || data?.user?.firstName || data?.user?.name || 'Someone';

  useEffect(() => {
    if (!visible) {
      pulse1.stopAnimation();
      pulse2.stopAnimation();
      pulse3.stopAnimation();
      btnPulse.stopAnimation();
      pulse1.setValue(0);
      pulse2.setValue(0);
      pulse3.setValue(0);
      btnPulse.setValue(0);
      return;
    }

    const createPulse = (anim, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const l1 = createPulse(pulse1, 0);
    const l2 = createPulse(pulse2, 600);
    const l3 = createPulse(pulse3, 1200);

    const bPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(btnPulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(btnPulse, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    l1.start();
    l2.start();
    l3.start();
    bPulse.start();

    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
      bPulse.stop();
    };
  }, [visible]);

  const renderPulseRing = (anim) => (
    <Animated.View
      style={[
        styles.pulseRing,
        {
          width: scale(70),
          height: scale(70),
          borderRadius: scale(35),
          backgroundColor: pulseColor, // Dynamic color
          opacity: anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.4, 0],
          }),
          transform: [
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 2.5],
              }),
            },
          ],
        },
      ]}
    />
  );

  return (
    <Modal
      visible={!!visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => false}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { borderRadius: scale(32), width: '92%', maxWidth: scale(400) }]}>
          <LinearGradient
            colors={['#FFF1F2', '#FFFFFF', '#FFFFFF']}
            style={{ borderRadius: scale(32), overflow: 'hidden' }}
          >
            <View style={{ padding: spacing(24) }}>
              <View style={{ alignItems: 'center', marginBottom: vscale(20) }}>
                <View style={[styles.iconContainer, { width: scale(70), height: scale(70) }]}>
                  {renderPulseRing(pulse1)}
                  {renderPulseRing(pulse2)}
                  {renderPulseRing(pulse3)}
                  <LinearGradient
                    colors={['#FF4D5E', '#DC5C69']}
                    style={[styles.iconCircle, { width: scale(70), height: scale(70), borderRadius: scale(35) }]}
                  >
                    <Icon name="shield-alert" size={ms(34)} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                
                <Text style={{ fontSize: ms(22), fontWeight: '900', color: '#1E293B', marginTop: vscale(16), textAlign: 'center' }}>
                  Safety Awareness
                </Text>
                <View style={[styles.distanceBadge, { paddingHorizontal: spacing(12), paddingVertical: vscale(6), borderRadius: scale(14) }]}>
                  <Text style={{ fontSize: ms(13), fontWeight: '800', color: '#DC5C69' }}>
                    {distanceText.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.contentBox}>
                <View style={styles.detailRow}>
                  <View style={[styles.detailIconWrap, { backgroundColor: '#F1F5F9' }]}>
                    <Icon name="account-heart" size={ms(20)} color="#DC5C69" />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing(14) }}>
                    <Text style={styles.detailLabel}>REQUESTER</Text>
                    <Text style={styles.detailValue}>{requesterName}</Text>
                  </View>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <View style={[styles.detailIconWrap, { backgroundColor: '#F1F5F9' }]}>
                    <Icon name="alert-decagram" size={ms(20)} color="#DC5C69" />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing(14) }}>
                    <Text style={styles.detailLabel}>SITUATION</Text>
                    <Text style={styles.detailValue} numberOfLines={2}>{situation.replace(/_/g, ' ')}</Text>
                  </View>
                </View>

                <View style={styles.detailDivider} />

                <View style={styles.detailRow}>
                  <View style={[styles.detailIconWrap, { backgroundColor: '#F1F5F9' }]}>
                    <Icon name="map-marker-radius" size={ms(20)} color="#DC5C69" />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing(14) }}>
                    <Text style={styles.detailLabel}>LOCATION</Text>
                    <Text style={styles.detailValue} numberOfLines={2}>{area}</Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', marginTop: vscale(28), gap: spacing(14) }}>
                <TouchableOpacity
                  onPress={onDecline}
                  style={{ flex: 1.2 }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.actionBtn, styles.declineBtn]}>
                    <Text style={[styles.actionBtnText, { color: '#64748B' }]}>Can’t Go</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onView}
                  style={{ flex: 2 }}
                  activeOpacity={0.8}
                >
                  <Animated.View style={{
                    transform: [{
                      scale: btnPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.03]
                      })
                    }]
                  }}>
                    <LinearGradient
                      colors={['#22C55E', '#16A34A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.actionBtn, styles.acceptBtn]}
                    >
                      <Icon name="eye-check" size={ms(20)} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>I’m Aware</Text>
                    </LinearGradient>
                  </Animated.View>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 15 },
    elevation: 15,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    shadowColor: '#DC5C69',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  distanceBadge: {
    backgroundColor: 'rgba(220, 92, 105, 0.1)',
    marginTop: 10,
  },
  contentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
    opacity: 0.5,
  },
  detailIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  actionBtn: {
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    backgroundColor: '#F1F5F9',
  },
  acceptBtn: {
    shadowColor: '#16A34A',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '900',
  },
});

export default IncomingPresenceAlarmModal;

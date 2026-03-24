import React, { useEffect, useMemo, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';

const IncomingPresenceModal = ({ visible, data, onDecline, onView, onClose }) => {
  const { ms, scale, spacing, vscale } = useResponsive();
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;

  const pulseColor = '#DC5C69'; // Red for Presence/Awareness

  const situation = String(data?.situation || 'Safety Concern').toUpperCase();
  const description = String(data?.description || 'Someone needs nearby awareness').trim();
  const area = String(data?.area || 'Nearby location').trim();
  const distanceMeters = Number(data?.distanceMeters || 0) || 0;
  const distanceText = distanceMeters < 1000 ? `${distanceMeters}m away` : `${(distanceMeters / 1000).toFixed(1)} km away`;
  const requesterName = data?.requesterName || 'Someone';

  useEffect(() => {
    if (!visible) {
      pulse1.stopAnimation();
      pulse2.stopAnimation();
      pulse3.stopAnimation();
      pulse1.setValue(0);
      pulse2.setValue(0);
      pulse3.setValue(0);
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

    l1.start();
    l2.start();
    l3.start();

    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, [visible]);

  const renderPulseRing = (anim) => (
    <Animated.View
      style={[
        styles.pulseRing,
        {
          width: scale(64),
          height: scale(64),
          borderRadius: scale(32),
          backgroundColor: pulseColor,
          opacity: anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.3, 0],
          }),
          transform: [
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 2.2],
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
        <View style={[styles.card, { borderRadius: scale(28), width: '90%', maxWidth: scale(400) }]}>
          <LinearGradient
            colors={['#FFF5F5', '#FFFFFF']}
            style={{ borderRadius: scale(28), padding: spacing(20) }}
          >
            <View style={{ alignItems: 'center', marginBottom: vscale(15) }}>
              <View style={[styles.iconContainer, { width: scale(64), height: scale(64) }]}>
                {renderPulseRing(pulse1)}
                {renderPulseRing(pulse2)}
                {renderPulseRing(pulse3)}
                <View style={[styles.iconCircle, { width: scale(64), height: scale(64), borderRadius: scale(32), backgroundColor: '#FEE2E2' }]}>
                  <Icon name="eye-check" size={ms(30)} color="#DC5C69" />
                </View>
              </View>
              
              <Text style={{ fontSize: ms(20), fontWeight: '800', color: '#1E293B', marginTop: vscale(12), textAlign: 'center' }}>
                {situation}
              </Text>
              <View style={[styles.distanceBadge, { paddingHorizontal: spacing(10), paddingVertical: vscale(4), borderRadius: scale(12), backgroundColor: '#FEE2E2' }]}>
                <Text style={{ fontSize: ms(12), fontWeight: '700', color: '#DC5C69' }}>
                  {distanceText}
                </Text>
              </View>
            </View>

            <View style={styles.contentBox}>
              <View style={styles.detailRow}>
                <View style={[styles.detailIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <Icon name="account-alert" size={ms(18)} color="#DC5C69" />
                </View>
                <View style={{ flex: 1, marginLeft: spacing(12) }}>
                  <Text style={[styles.detailLabel, { color: '#DC5C69' }]}>REQUESTER</Text>
                  <Text style={styles.detailValue}>{requesterName}</Text>
                </View>
              </View>

              <View style={[styles.detailRow, { marginTop: vscale(12) }]}>
                <View style={[styles.detailIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <Icon name="alert-circle-outline" size={ms(18)} color="#DC5C69" />
                </View>
                <View style={{ flex: 1, marginLeft: spacing(12) }}>
                  <Text style={[styles.detailLabel, { color: '#DC5C69' }]}>SITUATION</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>{description}</Text>
                </View>
              </View>

              <View style={[styles.detailRow, { marginTop: vscale(12) }]}>
                <View style={[styles.detailIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <Icon name="map-marker-radius" size={ms(18)} color="#DC5C69" />
                </View>
                <View style={{ flex: 1, marginLeft: spacing(12) }}>
                  <Text style={[styles.detailLabel, { color: '#DC5C69' }]}>LOCATION</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>{area}</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', marginTop: vscale(24), gap: spacing(12) }}>
              <TouchableOpacity
                onPress={onDecline}
                style={{ flex: 1 }}
                activeOpacity={0.8}
              >
                <View style={[styles.actionBtn, { backgroundColor: '#F1F5F9', borderRadius: scale(16), paddingVertical: vscale(14) }]}>
                  <Text style={[styles.actionBtnText, { color: '#64748B' }]}>Decline</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onView}
                style={{ flex: 1 }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#DC5C69', '#A83A30']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.actionBtn, { borderRadius: scale(16), paddingVertical: vscale(14) }]}
                >
                  <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Details</Text>
                </LinearGradient>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    overflow: 'hidden',
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
  },
  distanceBadge: {
    marginTop: 8,
  },
  contentBox: {
    backgroundColor: '#FFF5F5',
    borderRadius: 20,
    padding: 16,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
});

export default IncomingPresenceModal;

import React, { useEffect, useMemo, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, Animated, Easing } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../utils/responsive';
import { baseURL } from '../../services/api/client';

const IncomingHelpRequestModal = ({ visible, data, onDecline, onView, onClose }) => {
  const { ms, scale, spacing, vscale } = useResponsive();
  const baseRoot = useMemo(() => String(baseURL || '').replace(/\/api\/?$/, ''), []);
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;

  const category = String(data?.categoryName || data?.category || 'Help Request').replace(/_/g, ' ').toUpperCase();
  const description = String(data?.description || '').trim();
  const area = String(data?.area || '').trim();
  const distanceMeters = Number(data?.distanceMeters || 0) || 0;
  const distanceText = distanceMeters < 1000 ? `${distanceMeters}m away` : `${(distanceMeters / 1000).toFixed(1)} km away`;
  const iconPath = data?.categoryIcon ? String(data.categoryIcon) : '';
  const iconUri = iconPath ? `${baseRoot}${iconPath}` : null;

  useEffect(() => {
    if (!visible) {
      pulse1.stopAnimation();
      pulse2.stopAnimation();
      pulse1.setValue(0);
      pulse2.setValue(0);
      return;
    }

    const makeLoop = (value, delayMs) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delayMs),
          Animated.timing(value, {
            toValue: 1,
            duration: 1200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const l1 = makeLoop(pulse1, 0);
    const l2 = makeLoop(pulse2, 500);
    l1.start();
    l2.start();
    return () => {
      l1.stop();
      l2.stop();
      pulse1.setValue(0);
      pulse2.setValue(0);
    };
  }, [pulse1, pulse2, visible]);

  const ringStyle = (value, maxScale) => ({
    position: 'absolute',
    width: scale(54),
    height: scale(54),
    borderRadius: scale(27),
    borderWidth: scale(2),
    borderColor: 'rgba(220, 92, 105, 0.35)',
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
    transform: [
      {
        scale: value.interpolate({
          inputRange: [0, 1],
          outputRange: [1, maxScale],
        }),
      },
    ],
  });

  return (
    <Modal
      visible={!!visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { borderRadius: scale(22), padding: spacing(16), width: '92%', maxWidth: scale(420) }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.iconWrap, { width: scale(54), height: scale(54) }]}>
              <Animated.View style={ringStyle(pulse1, 1.55)} />
              <Animated.View style={ringStyle(pulse2, 1.55)} />
              <View style={[styles.iconCircle, { width: scale(54), height: scale(54), borderRadius: scale(27) }]}>
                {iconUri ? (
                  <Image
                    source={{ uri: iconUri }}
                    style={{ width: scale(54), height: scale(54), borderRadius: scale(27) }}
                    resizeMode="cover"
                  />
                ) : (
                  <Icon name="hand-heart" size={ms(26)} color="#DC5C69" />
                )}
              </View>
            </View>

            <View style={{ flex: 1, marginLeft: spacing(12) }}>
              <Text style={{ fontSize: ms(18), fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                {category}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: vscale(2) }}>
                <Icon name="map-marker" size={ms(14)} color="#64748B" />
                <Text style={{ marginLeft: spacing(6), fontSize: ms(13), color: '#64748B' }} numberOfLines={1}>
                  {distanceText}
                </Text>
              </View>
            </View>

            <View style={[styles.badge, { paddingHorizontal: spacing(10), paddingVertical: vscale(6), borderRadius: scale(999) }]}>
              <Text style={{ fontSize: ms(12), fontWeight: '800', color: '#DC5C69' }}>OPEN</Text>
            </View>
          </View>

          <View style={[styles.divider, { marginTop: vscale(14), marginBottom: vscale(14) }]} />

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vscale(12) }}>
            <View style={{ width: scale(18) }}>
              <Icon name="text" size={ms(18)} color="#64748B" />
            </View>
            <Text style={{ marginLeft: spacing(10), fontSize: ms(12), fontWeight: '800', color: '#334155' }}>
              DESCRIPTION
            </Text>
            <Text style={{ marginLeft: spacing(10), fontSize: ms(14), color: '#0F172A', flex: 1 }} numberOfLines={2}>
              {description || '—'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: scale(18) }}>
              <Icon name="map-marker" size={ms(18)} color="#64748B" />
            </View>
            <Text style={{ marginLeft: spacing(10), fontSize: ms(12), fontWeight: '800', color: '#334155' }}>
              LOCATION
            </Text>
            <Text style={{ marginLeft: spacing(10), fontSize: ms(14), color: '#0F172A', flex: 1 }} numberOfLines={2}>
              {area || '—'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', marginTop: vscale(18), gap: spacing(14) }}>
            <TouchableOpacity
              onPress={onDecline}
              style={[styles.btn, styles.btnDecline, { borderRadius: scale(999), paddingVertical: vscale(14), flex: 1 }]}
              activeOpacity={0.9}
            >
              <Icon name="close" size={ms(18)} color="#FFFFFF" />
              <Text style={[styles.btnText, { marginLeft: spacing(8), fontSize: ms(14) }]}>Not available</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onView}
              style={[styles.btn, styles.btnAccept, { borderRadius: scale(999), paddingVertical: vscale(14), flex: 1 }]}
              activeOpacity={0.9}
            >
              <Icon name="eye-outline" size={ms(18)} color="#FFFFFF" />
              <Text style={[styles.btnText, { marginLeft: spacing(8), fontSize: ms(14) }]}>View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badge: {
    backgroundColor: '#FFF0F1',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    width: '100%',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDecline: {
    backgroundColor: '#EF4444',
  },
  btnAccept: {
    backgroundColor: '#22C55E',
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

export default IncomingHelpRequestModal;

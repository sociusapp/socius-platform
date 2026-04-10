import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../../utils/responsive';
import PulseDot from '../../../../components/common/PulseDot';

const DailyHelpRequestCard = ({ req, onAccept, resolveCategoryMeta }) => {
  const { ms, scale, spacing, vscale } = useResponsive();
  const statusLower = String(req?.status || 'open').toLowerCase();
  const resolvedCategory = resolveCategoryMeta(req.category, req.categoryName, req.categoryIcon);
  
  const badgeCfg =
    statusLower === 'matched'
      ? { bg: '#E0F2FE', fg: '#0369A1', pulse: '#0EA5E9' }
      : statusLower === 'active'
        ? { bg: '#DCFCE7', fg: '#15803D', pulse: '#22C55E' }
        : statusLower === 'open' || statusLower === 'matching'
          ? { bg: '#F0F9FF', fg: '#0EA5E9', pulse: '#0EA5E9' }
          : { bg: '#F1F5F9', fg: '#475569', pulse: null };

  return (
    <View style={[styles.card, {
      marginBottom: vscale(16),
      padding: spacing(16),
      borderRadius: scale(16),
      borderWidth: 1,
      borderColor: '#E2E8F0',
    }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vscale(12) }}>
        <View style={[styles.iconBadge, {
          width: scale(48),
          height: scale(48),
          borderRadius: scale(24),
          backgroundColor: '#F0F9FF',
          marginRight: spacing(12),
        }]}>
          {resolvedCategory?.iconUri ? (
            <Image
              source={{ uri: resolvedCategory.iconUri }}
              style={{ width: scale(26), height: scale(26), borderRadius: scale(7) }}
              resizeMode="cover"
            />
          ) : (
            <Icon name="hand-heart" size={scale(24)} color="#0EA5E9" />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: ms(16), color: '#1E293B', fontWeight: '700' }}>
            {String(resolvedCategory?.name || req.categoryName || req.category || 'General Help').toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="map-marker" size={scale(12)} color="#64748B" style={{ marginRight: 2 }} />
            <Text style={{ fontSize: ms(12), color: '#64748B' }}>
              {req.distance ? `${req.distance} km away` : 'Nearby'}
            </Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: badgeCfg.bg }]}>
          {badgeCfg.pulse && <PulseDot color={badgeCfg.pulse} size={5} style={{ marginRight: 6 }} />}
          <Text style={{ fontSize: ms(10), fontWeight: '700', color: badgeCfg.fg }}>
            {(req.status || 'OPEN').toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={{ fontSize: ms(14), color: '#334155', lineHeight: ms(20), marginBottom: vscale(12) }}>
        {req.description}
      </Text>

      <View style={styles.infoRow}>
        <Icon name="map-marker-outline" size={scale(14)} color="#64748B" />
        <Text style={styles.infoLabel}>LOCATION</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{req?.area || 'Location shared'}</Text>
      </View>

      <TouchableOpacity
        onPress={() => onAccept(req)}
        style={[styles.actionBtn, { backgroundColor: '#0EA5E9' }]}
      >
        <Text style={styles.actionBtnText}>View & Accept</Text>
        <Icon name="arrow-right" size={scale(16)} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '700',
    marginLeft: 6,
    width: 70,
  },
  infoValue: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  actionBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
  },
});

export default DailyHelpRequestCard;

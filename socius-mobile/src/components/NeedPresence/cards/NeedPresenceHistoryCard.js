import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useResponsive } from '../../../utils/responsive';
import moment from 'moment';

const NeedPresenceHistoryCard = ({ item, onAction, index = 0 }) => {
  const { ms, scale, spacing, vscale } = useResponsive();
  const isMyRequest = item.isMyRequest;
  const raw = item?.data || {};
  const otherName = item.otherUser?.fullName?.trim() || null;
  const areaHint = raw?.location?.address || raw?.location?.whereToFindText || null;
  const situation = raw?.situationType || item.title;

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'matched':
      case 'en_route':
      case 'arrived':
      case 'helpers_notified':
      case 'helpers_accepted':
        return { color: '#DC5C69', bg: '#FFF5F6', label: 'Active' };
      case 'pending':
      case 'open':
      case 'matching':
        return { color: '#FF9F43', bg: '#FFF0E1', label: 'Pending' };
      case 'accepted':
        return { color: '#DC5C69', bg: '#FFF5F6', label: 'Accepted' };
      case 'completed':
      case 'closed':
        return { color: '#6366F1', bg: '#EEF2FF', label: 'Completed' };
      case 'cancelled':
      case 'declined':
        return { color: '#EA5455', bg: '#FCEAEA', label: 'Cancelled' };
      default:
        return { color: '#64748B', bg: '#F1F5F9', label: status || 'Unknown' };
    }
  };

  const statusStyle = getStatusStyle(item.status);
  const actionLabel = useMemo(() => {
    const L = statusStyle.label;
    if (L === 'Active' || L === 'Accepted' || L === 'Pending') return 'Track';
    if (L === 'Completed') return 'Details';
    return 'Again';
  }, [statusStyle.label]);
  const isTrack = actionLabel === 'Track';

  const metaLine = [
    isMyRequest ? 'You requested' : 'You helped',
    moment(item.createdAt).format('MMM D, h:mm A'),
  ].join(' · ');

  const entering = FadeInDown.delay(Math.min(index * 42, 290)).duration(280);

  return (
    <Animated.View entering={entering}>
      <Pressable
        onPress={() => onAction(item)}
        style={({ pressed }) => [
          styles.historyCard,
          {
            marginBottom: vscale(8),
            borderRadius: scale(12),
            paddingHorizontal: spacing(10),
            paddingVertical: vscale(9),
            borderColor: '#EEF2F6',
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View
            style={[
              styles.avatarPlaceholder,
              {
                backgroundColor: '#F8FAFC',
                width: scale(36),
                height: scale(36),
                borderRadius: scale(10),
                marginRight: spacing(10),
                borderWidth: 1,
                borderColor: '#E2E8F0',
              },
            ]}
          >
            <Icon name="eye-check-outline" size={scale(20)} color="#DC5C69" />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing(6) }}>
              <Text style={{ fontSize: ms(13), fontWeight: '700', color: '#0F172A', flex: 1 }} numberOfLines={2}>
                {String(situation || 'Need presence').replace(/_/g, ' ')}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, flexShrink: 0 }]}>
                <Text style={[styles.statusText, { color: statusStyle.color, fontSize: ms(8), fontWeight: '800' }]}>
                  {String(statusStyle.label).toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: ms(10), color: '#94A3B8', marginTop: vscale(3) }} numberOfLines={1}>
              {metaLine}
            </Text>

            <Text style={{ fontSize: ms(10), color: '#64748B', marginTop: vscale(2), fontWeight: '600' }}>
              Presence · calm support nearby
            </Text>

            {(item.description || areaHint) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: vscale(4), gap: spacing(4) }}>
                {areaHint ? (
                  <Icon name="map-marker-outline" size={scale(11)} color="#94A3B8" style={{ marginTop: 1 }} />
                ) : null}
                <Text style={{ fontSize: ms(11), color: '#475569', flex: 1 }} numberOfLines={2}>
                  {[item.description, areaHint].filter(Boolean).join(' · ')}
              </Text>
              </View>
            ) : null}

            {otherName ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: vscale(5) }}>
                <Icon name="account-outline" size={scale(12)} color="#64748B" style={{ marginRight: spacing(3) }} />
                <Text style={{ fontSize: ms(10), color: '#64748B', flex: 1 }} numberOfLines={1}>
                  {isMyRequest ? `Helper: ${otherName}` : `Requester: ${otherName}`}
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: vscale(6) }}>
              <TouchableOpacity
                onPress={() => onAction(item)}
                activeOpacity={0.85}
                style={[
                  styles.actionBtn,
                  {
                    height: vscale(28),
                    paddingHorizontal: spacing(11),
                    borderRadius: scale(14),
                    borderWidth: 1,
                    borderColor: '#DC5C69',
                    backgroundColor: isTrack ? '#DC5C69' : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: ms(10),
                    color: isTrack ? '#FFF' : '#DC5C69',
                    fontWeight: '700',
                    includeFontPadding: false,
                  }}
                >
                  {isTrack ? 'View details' : actionLabel === 'Details' ? 'View details' : 'Request again'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  historyCard: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    letterSpacing: 0.2,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NeedPresenceHistoryCard;

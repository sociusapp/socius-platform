import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useResponsive } from '../../../../utils/responsive';
import moment from 'moment';

const formatCategoryKey = (cat) => {
  if (cat == null || cat === '') return null;
  return String(cat).replace(/_/g, ' ');
};

const LIVE_STATUSES = new Set(['active', 'helpers_notified', 'helpers_accepted']);

const NeedPresenceHistoryCard = ({ item, onAction, index = 0 }) => {
  const { ms, scale, spacing, vscale } = useResponsive();
  const isMyRequest = item.isMyRequest;
  const raw = item?.data || {};
  const otherName = item.otherUser?.fullName?.trim() || null;
  const areaHint = raw?.location?.address || raw?.location?.whereToFindText || null;
  const situation = raw?.situationType || item.title;
  const titleLine = String(situation || 'Need presence').replace(/_/g, ' ');
  const categoryKeyLabel = formatCategoryKey(raw?.situationType || item.title);

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
      case 'auto_closed':
        return { color: '#6366F1', bg: '#EEF2FF', label: 'Completed' };
      case 'cancelled':
      case 'declined':
        return { color: '#EA5455', bg: '#FCEAEA', label: 'Cancelled' };
      default:
        return { color: '#64748B', bg: '#F1F5F9', label: status || 'Unknown' };
    }
  };

  const statusStyle = getStatusStyle(item.status);
  const statusLower = String(item.status || '').toLowerCase();

  const actionLabel = useMemo(() => {
    const L = statusStyle.label;
    if (L === 'Active' || L === 'Accepted' || L === 'Pending') return 'track';
    if (L === 'Completed') return 'details';
    return 'again';
  }, [statusStyle.label]);

  const isTrack = actionLabel === 'track';

  /** Parallel to daily-help "Needed" (duration); presence uses reach / helper cap. */
  const neededDisplay = useMemo(() => {
    const n = Number(raw.totalNotified) || 0;
    const a = Number(raw.totalAccepted) || 0;
    const cap = Number(raw.maxHelpers);
    if (a > 0 && n > 0) {
      return `${a} helping · ${n} notified`;
    }
    if (n > 0) {
      return `${n} notified${Number.isFinite(cap) && cap > 0 ? ` · up to ${cap}` : ''}`;
    }
    if (a > 0) {
      return `${a} helping`;
    }
    if (Number.isFinite(cap) && cap > 0) {
      return `Up to ${cap} helpers`;
    }
    return 'Nearby awareness';
  }, [raw.totalNotified, raw.totalAccepted, raw.maxHelpers]);

  const delayOrWindowText = useMemo(() => {
    if (statusLower === 'cancelled' && raw.cancelledAt) {
      return `Cancelled ${moment(raw.cancelledAt).format('MMM D, h:mm A')}`;
    }
    if (statusLower === 'closed' && raw.closedAt) {
      return `Ended ${moment(raw.closedAt).format('MMM D, h:mm A')}`;
    }
    if (statusLower === 'auto_closed') {
      const t = raw.autoClosedAt || raw.closedAt;
      return t ? `Ended ${moment(t).format('MMM D, h:mm A')}` : '—';
    }
    if (LIVE_STATUSES.has(statusLower)) {
      if (raw.helpersNotifiedAt) {
        return `Notified ${moment(raw.helpersNotifiedAt).format('h:mm A')}`;
      }
      return `Since ${moment(item.createdAt).format('h:mm A')}`;
    }
    if (raw.closedAt) {
      return `Ended ${moment(raw.closedAt).format('MMM D, h:mm A')}`;
    }
    return '—';
  }, [statusLower, raw, item.createdAt]);

  const metaLine = [isMyRequest ? 'You requested' : 'You helped', moment(item.createdAt).format('MMM D, h:mm A')]
    .filter(Boolean)
    .join(' · ');

  const entering = FadeInDown.delay(Math.min(index * 42, 290)).duration(280);

  const btnLabel = isTrack ? 'Track status' : actionLabel === 'details' ? 'Details' : 'Again';

  const iconColW = scale(34);
  const iconGutter = spacing(8);

  return (
    <Animated.View entering={entering}>
      <View
        style={[
          styles.historyCard,
          {
            marginBottom: vscale(8),
            borderRadius: scale(12),
            paddingHorizontal: spacing(10),
            paddingVertical: vscale(8),
            borderColor: '#EEF2F6',
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ width: iconColW, marginRight: iconGutter, alignItems: 'center' }}>
            <View
              style={[
                styles.avatarPlaceholder,
                {
                  backgroundColor: '#F8FAFC',
                  width: iconColW,
                  height: iconColW,
                  borderRadius: scale(9),
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                },
              ]}
            >
              <Icon name="eye-check-outline" size={scale(18)} color="#DC5C69" />
            </View>
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.titleActionsRow}>
              <Text style={[styles.titleText, { fontSize: ms(14) }]} numberOfLines={2}>
                {titleLine}
              </Text>
              <View style={styles.badgeButtonCluster}>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statusStyle.color, fontSize: ms(9) }]}>
                    {String(statusStyle.label).toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => onAction(item)}
                  activeOpacity={0.85}
                  style={[
                    styles.topActionBtn,
                    {
                      height: scale(28),
                      paddingHorizontal: spacing(10),
                      borderRadius: scale(14),
                      backgroundColor: isTrack ? '#DC5C69' : 'transparent',
                      borderColor: '#DC5C69',
                      flexShrink: 0,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.topActionBtnText,
                      {
                        fontSize: ms(9),
                        color: isTrack ? '#FFFFFF' : '#DC5C69',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {btnLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={{ marginTop: vscale(6), alignSelf: 'stretch' }}>
          <Text style={[styles.metaLine, { fontSize: ms(11) }]} numberOfLines={1}>
            {metaLine}
          </Text>

          <View style={[styles.timeSplitRow, { marginTop: vscale(6), paddingVertical: vscale(6), paddingHorizontal: spacing(10) }]}>
            <View style={styles.timeSplitCol}>
              <Text style={[styles.timeSplitLabel, { fontSize: ms(10) }]}>Needed</Text>
              <Text style={[styles.timeSplitValue, { fontSize: ms(12) }]} numberOfLines={2}>
                {neededDisplay}
              </Text>
            </View>
            <View style={[styles.timeSplitCol, { alignItems: 'flex-end' }]}>
              <Text style={[styles.timeSplitLabel, { fontSize: ms(10) }]}>Delay / time</Text>
              <Text style={[styles.timeSplitValue, { fontSize: ms(12) }]} numberOfLines={2}>
                {delayOrWindowText}
              </Text>
            </View>
          </View>

          {(item.description || areaHint) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: vscale(5), gap: spacing(4) }}>
              {areaHint ? (
                <Icon name="map-marker-outline" size={scale(12)} color="#94A3B8" style={{ marginTop: 1 }} />
              ) : null}
              <Text style={{ fontSize: ms(11), color: '#475569', flex: 1 }} numberOfLines={2}>
                {[item.description, areaHint].filter(Boolean).join(' · ')}
              </Text>
            </View>
          ) : null}

          {(categoryKeyLabel || otherName) ? (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginTop: vscale(5),
                gap: spacing(6),
              }}
            >
              {categoryKeyLabel ? (
                <View style={styles.chipMuted}>
                  <Text style={[styles.chipMutedText, { fontSize: ms(11) }]} numberOfLines={1}>
                    {categoryKeyLabel}
                  </Text>
                </View>
              ) : null}
              {otherName ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                  <Icon name="account-outline" size={scale(12)} color="#64748B" style={{ marginRight: spacing(2) }} />
                  <Text style={{ fontSize: ms(11), color: '#64748B', flexShrink: 1 }} numberOfLines={1}>
                    {isMyRequest ? `Helper: ${otherName}` : `Requester: ${otherName}`}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
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
  titleActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    flex: 1,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 0,
  },
  badgeButtonCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    justifyContent: 'center',
  },
  statusText: {
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  topActionBtn: {
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topActionBtnText: {
    fontWeight: '700',
  },
  metaLine: {
    color: '#94A3B8',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  timeSplitCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  timeSplitLabel: {
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.25,
    marginBottom: 2,
  },
  timeSplitValue: {
    color: '#0F172A',
    fontWeight: '700',
  },
  chipMuted: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '70%',
  },
  chipMutedText: {
    color: '#475569',
    fontWeight: '600',
  },
});

export default NeedPresenceHistoryCard;

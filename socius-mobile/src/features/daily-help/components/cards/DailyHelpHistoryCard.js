import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useResponsive } from '../../../../utils/responsive';
import moment from 'moment';
import { formatMeetingWindowCountdownTick, parseMinutesFromDurationLabel } from '../../../../utils/durationLabel';

const formatCategoryKey = (cat) => {
  if (cat == null || cat === '') return null;
  return String(cat).replace(/_/g, ' ');
};

const COUNTDOWN_STATUSES = new Set([
  'active',
  'matched',
  'en_route',
  'arrived',
  'in_progress',
  'accepted',
  'closing',
]);

function useLiveWindowLine(sessionEndsAt, statusIsLive) {
  const [line, setLine] = useState(() => {
    if (!sessionEndsAt || !statusIsLive) return '';
    try {
      return formatMeetingWindowCountdownTick(new Date(sessionEndsAt).toISOString()).line;
    } catch {
      return '';
    }
  });

  useEffect(() => {
    if (!sessionEndsAt || !statusIsLive) {
      setLine('');
      return;
    }
    let iso;
    try {
      iso = new Date(sessionEndsAt).toISOString();
    } catch {
      setLine('');
      return;
    }
    const tick = () => setLine(formatMeetingWindowCountdownTick(iso).line);
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [sessionEndsAt, statusIsLive]);

  return line;
}

function useNowTick(enabled) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => setT(Date.now()), 30000);
    return () => clearInterval(id);
  }, [enabled]);
  return t;
}

const DailyHelpHistoryCard = ({ item, onAction, resolveCategoryMeta, index = 0 }) => {
  const { ms, scale, spacing, vscale } = useResponsive();
  const isMyRequest = item.isMyRequest;
  const raw = item?.data || {};
  const resolvedCategory = resolveCategoryMeta(
    raw?.category || item.category,
    raw?.categoryName || item.title,
    raw?.categoryIcon
  );

  const otherName = item.otherUser?.fullName?.trim() || null;
  const durationLabel = raw.requestedDurationLabel || raw.requestedDuration || null;
  const areaHint =
    raw?.location?.address ||
    raw?.location?.whereToFindText ||
    raw?.whereToFindText ||
    null;
  const categoryKeyLabel = formatCategoryKey(raw?.category || item.category);

  const statusLower = String(item.status || '').toLowerCase();
  const statusIsLive = COUNTDOWN_STATUSES.has(statusLower);
  const sessionEndsAt = raw.sessionEndsAt;
  const liveWindowLine = useLiveWindowLine(sessionEndsAt, statusIsLive);
  const nowTick = useNowTick(statusIsLive);

  const plannedMinutes = useMemo(() => {
    const n = Number(raw.requestedDurationMinutes ?? raw.requestedMinutes ?? raw.durationMinutes ?? 0);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
    return parseMinutesFromDurationLabel(durationLabel);
  }, [raw.requestedDurationMinutes, raw.requestedMinutes, raw.durationMinutes, durationLabel]);

  const neededDisplay = durationLabel || (plannedMinutes > 0 ? `${plannedMinutes} min` : '—');

  const delayOrWindowText = useMemo(() => {
    const matchedMs = raw.matchedAt ? new Date(raw.matchedAt).getTime() : null;

    if (statusIsLive && plannedMinutes > 0 && matchedMs) {
      const elapsedMin = Math.max(0, Math.floor((nowTick - matchedMs) / 60000));
      if (elapsedMin > plannedMinutes) {
        return `+${elapsedMin - plannedMinutes}m past need`;
      }
    }

    if (statusIsLive && liveWindowLine) {
      return liveWindowLine;
    }

    if (sessionEndsAt && !statusIsLive) {
      return `Ended ${moment(sessionEndsAt).format('MMM D, h:mm A')}`;
    }

    if (statusIsLive && raw.matchedAt) {
      return `Since ${moment(raw.matchedAt).format('h:mm A')}`;
    }

    if (raw.matchedAt) {
      return `Matched ${moment(raw.matchedAt).format('MMM D h:mm A')}`;
    }

    return '—';
  }, [
    statusIsLive,
    liveWindowLine,
    sessionEndsAt,
    raw.matchedAt,
    plannedMinutes,
    nowTick,
  ]);

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'matched':
      case 'en_route':
      case 'arrived':
      case 'in_progress':
      case 'closing':
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
        return { color: '#64748B', bg: '#F1F5F9', label: (status && String(status)) || 'Unknown' };
    }
  };

  const statusStyle = getStatusStyle(item.status);

  const actionLabel = useMemo(() => {
    const L = statusStyle.label;
    if (L === 'Active' || L === 'Accepted' || L === 'Pending') return 'track';
    if (L === 'Completed') return 'details';
    return 'again';
  }, [statusStyle.label]);

  const isTrack = actionLabel === 'track';
  const metaLine = [isMyRequest ? 'You requested' : 'You helped', moment(item.createdAt).format('MMM D, h:mm A')]
    .filter(Boolean)
    .join(' · ');

  const entering = FadeInDown.delay(Math.min(index * 42, 290)).duration(280);

  const btnLabel = isTrack
    ? 'Track status'
    : actionLabel === 'details'
      ? 'Details'
      : 'Again';

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
              {resolvedCategory?.iconUri ? (
                <Image
                  source={{ uri: resolvedCategory.iconUri }}
                  style={{ width: scale(20), height: scale(20), borderRadius: scale(4) }}
                  resizeMode="cover"
                />
              ) : (
                <Icon name="hand-heart" size={scale(18)} color="#DC5C69" />
              )}
            </View>
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.titleActionsRow}>
              <Text style={[styles.titleText, { fontSize: ms(14) }]} numberOfLines={2}>
                {String(resolvedCategory?.name || (isMyRequest ? 'Help request' : 'Help provided'))}
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
              <Text style={[styles.timeSplitValue, { fontSize: ms(12) }]} numberOfLines={1}>
                {neededDisplay}
              </Text>
            </View>
            <View style={[styles.timeSplitCol, { alignItems: 'flex-end' }]}>
              <Text style={[styles.timeSplitLabel, { fontSize: ms(10) }]}>Delay / time</Text>
              <Text style={[styles.timeSplitValue, { fontSize: ms(12) }]} numberOfLines={1}>
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

export default DailyHelpHistoryCard;

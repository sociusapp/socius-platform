import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import moment from 'moment';
import { useResponsive } from '../../utils/responsive';
import { api } from '../../services/api/client';
import { formatMeetingWindowCountdownTick, parseMinutesFromDurationLabel } from '../../utils/durationLabel';

export const PENDING_DAILY_HELP_PICK_KEY = '@socius/pendingDailyHelpPickModal';

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

function resolveCategoryImageUri(categoryIcon, baseRoot) {
  if (!categoryIcon) return null;
  const s = String(categoryIcon).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (baseRoot && s.startsWith('/')) return `${baseRoot}${s}`;
  return null;
}

const STATUS_COPY = {
  open: 'Open',
  matching: 'Finding helpers',
  matched: 'Matched',
  active: 'In progress',
  accepted: 'Connected',
  pending: 'Pending',
  in_progress: 'In progress',
  en_route: 'En route',
  arrived: 'Arrived',
  closing: 'Closing',
};

function formatSessionStatus(raw) {
  const s = String(raw ?? '');
  const k = s.toLowerCase().trim();
  if (!k) return 'Active';
  if (STATUS_COPY[k]) return STATUS_COPY[k];
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function SessionRow({ item, onTrack, ms, scale, spacing, vscale, baseRoot }) {
  const isHelper = String(item.roleLabel || '').toLowerCase().includes('helping');
  const accent = isHelper ? '#059669' : '#0EA5E9';
  const fallbackIcon = isHelper ? 'account-heart' : 'hand-heart';
  const statusLabel = formatSessionStatus(item.status);
  const st = String(item.status || '').toLowerCase();
  const statusIsLive = COUNTDOWN_STATUSES.has(st);
  const meta = item.timeMeta || {};
  const durationLabel = meta.requestedDurationLabel || null;

  const plannedMinutes = useMemo(() => {
    const n = Number(meta.requestedDurationMinutes ?? 0);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
    return parseMinutesFromDurationLabel(durationLabel);
  }, [meta.requestedDurationMinutes, durationLabel]);

  const neededDisplay = durationLabel || (plannedMinutes > 0 ? `${plannedMinutes} min` : null);

  const sessionEndsAt = meta.sessionEndsAt;
  const liveWindowLine = useLiveWindowLine(sessionEndsAt, statusIsLive);
  const nowTick = useNowTick(statusIsLive);

  const delayOrWindowText = useMemo(() => {
    if (['open', 'matching'].includes(st)) {
      return 'Finding a helper nearby';
    }
    const matchedMs = meta.matchedAt ? new Date(meta.matchedAt).getTime() : null;

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

    if (statusIsLive && meta.matchedAt) {
      return `Since ${moment(meta.matchedAt).format('h:mm A')}`;
    }

    if (meta.matchedAt) {
      return `Matched ${moment(meta.matchedAt).format('MMM D h:mm A')}`;
    }

    return '—';
  }, [st, statusIsLive, plannedMinutes, nowTick, liveWindowLine, sessionEndsAt, meta.matchedAt]);

  const imageUri = resolveCategoryImageUri(item.categoryIcon, baseRoot);
  const detail =
    item.subtitle && String(item.subtitle).trim() !== '—' ? String(item.subtitle).trim() : null;

  const showTimeRow = !!(neededDisplay || (delayOrWindowText && delayOrWindowText !== '—'));

  return (
    <View
      style={[
        styles.sessionCard,
        {
          borderRadius: scale(16),
          paddingVertical: vscale(10),
          paddingLeft: spacing(10),
          paddingRight: spacing(10),
          marginBottom: vscale(10),
          borderLeftWidth: 3,
          borderLeftColor: accent,
        },
      ]}
    >
      <View style={styles.sessionMainRow}>
        <View
          style={[
            styles.sessionIconWrap,
            {
              width: scale(44),
              height: scale(44),
              borderRadius: scale(12),
              marginRight: spacing(10),
              backgroundColor: isHelper ? '#ECFDF5' : '#E0F2FE',
              overflow: 'hidden',
            },
          ]}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Icon name={fallbackIcon} size={scale(22)} color={accent} />
          )}
        </View>

        <View style={styles.sessionTextCol}>
          <View style={[styles.pillsRow, { marginBottom: vscale(4) }]}>
            <View
              style={[
                styles.pillPrimary,
                {
                  paddingHorizontal: spacing(8),
                  paddingVertical: vscale(2),
                  borderRadius: scale(8),
                  backgroundColor: isHelper ? '#D1FAE5' : '#DBEAFE',
                  marginRight: spacing(6),
                },
              ]}
            >
              <Text style={[styles.pillPrimaryText, { fontSize: ms(10), color: accent }]}>
                {isHelper ? 'Helping' : 'Your request'}
              </Text>
            </View>
            <View
              style={[
                styles.pillMuted,
                {
                  paddingHorizontal: spacing(7),
                  paddingVertical: vscale(2),
                  borderRadius: scale(8),
                },
              ]}
            >
              <Text style={[styles.pillMutedText, { fontSize: ms(10) }]}>{statusLabel}</Text>
            </View>
          </View>
          <Text style={[styles.sessionTitle, { fontSize: ms(15) }]} numberOfLines={2}>
            {item.title}
          </Text>
          {detail ? (
            <Text style={[styles.sessionDetail, { fontSize: ms(12), marginTop: vscale(3) }]} numberOfLines={2}>
              {detail}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => onTrack(item)}
          style={[
            styles.trackCompact,
            {
              marginLeft: spacing(8),
              paddingHorizontal: spacing(12),
              minHeight: scale(40),
              borderRadius: scale(12),
              backgroundColor: '#DC5C69',
            },
          ]}
        >
          <Text style={[styles.trackCompactText, { fontSize: ms(11) }]} numberOfLines={2}>
            Track
          </Text>
        </TouchableOpacity>
      </View>

      {showTimeRow ? (
        <View
          style={[
            styles.timeSplitRow,
            {
              marginTop: vscale(8),
              paddingVertical: vscale(8),
              paddingHorizontal: spacing(10),
              borderRadius: scale(10),
            },
          ]}
        >
          <View style={styles.timeSplitHalf}>
            <Text style={[styles.timeSplitLabel, { fontSize: ms(9) }]}>Needed time</Text>
            <Text style={[styles.timeSplitValue, { fontSize: ms(12) }]} numberOfLines={1}>
              {neededDisplay || '—'}
            </Text>
          </View>
          <View style={[styles.timeSplitHalf, { alignItems: 'flex-end' }]}>
            <Text style={[styles.timeSplitLabel, { fontSize: ms(9) }]}>Delay / window</Text>
            <Text style={[styles.timeSplitValue, { fontSize: ms(12) }]} numberOfLines={2}>
              {delayOrWindowText}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * After cold start, Splash may stash multiple active daily-help sessions; Home opens first
 * and this host shows a chooser (works for Home or HomeReview tab content).
 */
const DailyHelpActivePickModalHost = () => {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { ms, scale, spacing, vscale } = useResponsive();
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState([]);

  const baseRoot = useMemo(() => {
    const base = String(api?.defaults?.baseURL || '');
    return base.replace(/\/api\/?$/, '');
  }, []);

  const count = items.length;
  const subtitle = useMemo(() => {
    if (count < 2) return '';
    return `You have ${count} active Daily Help items right now. Tap Track to open that map or request screen.`;
  }, [count]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PENDING_DAILY_HELP_PICK_KEY);
        if (!raw || cancelled) return;
        await AsyncStorage.removeItem(PENDING_DAILY_HELP_PICK_KEY);
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 1) {
          setItems(parsed);
          setVisible(true);
        }
      } catch (e) {
        try {
          await AsyncStorage.removeItem(PENDING_DAILY_HELP_PICK_KEY);
        } catch (_) {}
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setItems([]);
  }, []);

  const onTrack = useCallback(
    (item) => {
      const name = item?.target?.name;
      if (!name) return;
      setVisible(false);
      setItems([]);
      navigation.navigate(name, item.target.params || {});
    },
    [navigation]
  );

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { maxHeight: width > 480 ? '76%' : '82%' }]}>
          <View style={styles.headerEyebrowWrap}>
            <Text style={[styles.headerEyebrow, { fontSize: ms(11) }]}>Daily Help · active now</Text>
          </View>
          <Text style={[styles.title, { fontSize: ms(20), marginBottom: vscale(6) }]}>Active help sessions</Text>
          <Text style={[styles.subtitle, { fontSize: ms(13), marginBottom: vscale(16), lineHeight: ms(19) }]}>
            {subtitle}
          </Text>

          <ScrollView
            style={{ alignSelf: 'stretch' }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: vscale(4) }}
          >
            {items.map((item) => (
              <SessionRow
                key={item.key}
                item={item}
                onTrack={onTrack}
                ms={ms}
                scale={scale}
                spacing={spacing}
                vscale={vscale}
                baseRoot={baseRoot}
              />
            ))}
          </ScrollView>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={close}
            style={[
              styles.laterBtn,
              {
                marginTop: vscale(10),
                paddingVertical: vscale(12),
                borderRadius: scale(14),
              },
            ]}
          >
            <Text style={[styles.laterText, { fontSize: ms(14) }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  headerEyebrowWrap: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  headerEyebrow: {
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  sessionCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sessionMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTextCol: {
    flex: 1,
    minWidth: 0,
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  pillPrimary: {},
  pillPrimaryText: {
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  pillMuted: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillMutedText: {
    fontWeight: '700',
    color: '#475569',
  },
  sessionTitle: {
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  sessionDetail: {
    color: '#64748B',
    lineHeight: 16,
  },
  timeSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeSplitHalf: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  timeSplitLabel: {
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  timeSplitValue: {
    color: '#0F172A',
    fontWeight: '700',
  },
  trackCompact: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: 76,
  },
  trackCompactText: {
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  laterBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  laterText: {
    fontWeight: '700',
    color: '#334155',
  },
});

export default DailyHelpActivePickModalHost;

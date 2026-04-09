import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { api } from '../../services/api/client';

const ICON_PALETTE = [
  { bg: '#EEF3F6', color: '#5A6F7D' },
  { bg: '#F8EAEA', color: '#C94D4D' },
  { bg: '#F1EEE8', color: '#8B6F47' },
  { bg: '#EEF3F6', color: '#5A6F7D' },
  { bg: '#F8EAEA', color: '#C94D4D' },
];

const buildAssetUrl = (value) => {
  const src = String(value || '').trim();
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  if (!src.startsWith('/')) return null;
  const base = String(api?.defaults?.baseURL || '').replace(/\/api\/?$/, '');
  return `${base}${src}`;
};

/** Vector name, http(s) URL, or upload path starting with / */
const resolveIcon = (iconSpec) => {
  const s = String(iconSpec || '').trim();
  if (!s) return { kind: 'icon', name: 'help-circle-outline' };
  const url = buildAssetUrl(s);
  if (url && /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(s)) {
    return { kind: 'image', uri: url };
  }
  if (/^https?:\/\//i.test(s) && /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(s)) {
    return { kind: 'image', uri: s };
  }
  return { kind: 'icon', name: s || 'help-circle-outline' };
};

const PrepareStayReadyCard = ({ item, index, onPress, scale, ms, spacing, vscale, colors }) => {
  const palette = ICON_PALETTE[Math.abs(index) % ICON_PALETTE.length];
  const iconSpec = item?.image_url || item?.icon;
  const resolved = useMemo(() => resolveIcon(iconSpec), [iconSpec]);

  const iconNode = useMemo(() => {
    if (resolved.kind === 'image') {
      return <Image source={{ uri: resolved.uri }} style={styles.remoteIcon} resizeMode="contain" />;
    }
    return <Icon name={resolved.name} size={scale(32)} color={palette.color} />;
  }, [resolved, palette.color, scale]);

  const circleBg = resolved.kind === 'image' ? colors.iconImageBg : palette.bg;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          borderRadius: scale(16),
          paddingHorizontal: spacing(14),
          paddingVertical: vscale(12),
          backgroundColor: colors.cardBg,
          borderColor: colors.cardBorder,
          shadowOpacity: colors.shadowOpacity,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: circleBg,
            width: scale(56),
            height: scale(56),
            borderRadius: scale(28),
            marginRight: spacing(14),
          },
        ]}
      >
        {iconNode}
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, { fontSize: ms(15), marginBottom: vscale(4), color: colors.title }]}>
          {item.title}
        </Text>
        <Text style={[styles.desc, { fontSize: ms(13), lineHeight: ms(20), color: colors.desc }]}>{item.description}</Text>
      </View>
      <Icon name="chevron-right" size={scale(22)} color={colors.chevron} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteIcon: {
    width: '80%',
    height: '80%',
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
  },
  desc: {},
});

export default PrepareStayReadyCard;

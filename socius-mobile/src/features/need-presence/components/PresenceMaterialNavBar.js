import React from 'react';
import { Pressable, View, Text, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const presenceMaterialNavStyles = StyleSheet.create({
  navLabelReport: {
    color: '#8C1D18',
    fontWeight: '600',
  },
  barWrap: {
    zIndex: 100,
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  barSurface: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBFE',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(121, 116, 126, 0.16)',
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    minHeight: 56,
    paddingVertical: 8,
    borderRadius: 16,
  },
  itemPressedIos: {
    backgroundColor: 'rgba(28, 27, 31, 0.06)',
  },
  iconColumn: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFBFE',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
    color: '#49454F',
    textAlign: 'center',
  },
});

export const PresenceBottomMaterialBar = ({ paddingBottom = 8, children }) => (
  <View style={[presenceMaterialNavStyles.barWrap, { paddingBottom }]}>
    <View style={presenceMaterialNavStyles.barSurface}>{children}</View>
  </View>
);

/** Material-style nav pill (same as requester NearbyMap bottom bar). */
export const PresenceMaterialNavItem = ({
  onPress,
  icon,
  iconColor,
  label,
  labelStyle,
  accessibilityLabel,
  iconBg,
  badgeCount = 0,
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    onPress={onPress}
    android_ripple={{ color: 'rgba(28, 27, 31, 0.10)', borderless: false }}
    style={({ pressed }) => [
      presenceMaterialNavStyles.item,
      Platform.OS === 'ios' && pressed && presenceMaterialNavStyles.itemPressedIos,
    ]}
  >
    <View style={presenceMaterialNavStyles.iconColumn}>
      <View style={[presenceMaterialNavStyles.iconWrap, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={24} color={iconColor} />
      </View>
      {badgeCount > 0 ? (
        <View style={presenceMaterialNavStyles.badge} accessibilityLabel={`${badgeCount} unread`}>
          <Text style={presenceMaterialNavStyles.badgeText}>
            {badgeCount > 99 ? '99+' : String(badgeCount)}
          </Text>
        </View>
      ) : null}
    </View>
    <Text style={[presenceMaterialNavStyles.label, labelStyle]} numberOfLines={1}>
      {label}
    </Text>
  </Pressable>
);

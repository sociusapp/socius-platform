import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MotionPressable from './MotionPressable';

const HomeHeader = ({ onSettingsPress, onLogoPress, onLocationPress, locationLabel }) => {
  const labelText = typeof locationLabel === 'string' && locationLabel.trim().length > 0 ? locationLabel : 'Updating location…';
  const isPlaceholder = labelText === 'Updating location…';
  return (
    <View style={styles.container}>
      <View style={styles.logoSection}>
        <MotionPressable
          style={styles.brandRow}
          onPress={onLogoPress}
          accessibilityRole="button"
          accessibilityLabel="Socius home"
        >
          <Image
            source={require('../../assets/icons/icon-03.png')}
            style={styles.logoImage}
          />
          <Text style={styles.logoText}>Socius</Text>
        </MotionPressable>

        <MotionPressable
          style={styles.locationRow}
          onPress={onLocationPress}
          accessibilityRole="button"
          accessibilityLabel="Open location map"
        >
          <Icon name="map-marker" size={14} color={isPlaceholder ? '#CBD5E1' : '#EC6E63'} />
          <Text style={[styles.locationText, isPlaceholder && styles.locationTextPlaceholder]} numberOfLines={2}>
            {labelText}
          </Text>
          <Icon name="chevron-right" size={18} color="#CBD5E1" style={styles.locationChevron} />
        </MotionPressable>
      </View>

      <MotionPressable
        style={styles.settingsButton}
        onPress={onSettingsPress}
        accessibilityRole="button"
        accessibilityLabel="Open settings"
      >
        <Icon name="cog" size={24} color="#999999" />
      </MotionPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 0,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },

  logoSection: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flex: 1,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  logoImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },

  logoText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2C3E50',
  },

  settingsButton: {
    padding: 8,
    marginLeft: 12,
  },

  locationRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 260,
  },
  locationChevron: {
    marginLeft: 4,
  },

  locationText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#6B7280',
    flexShrink: 1,
  },
  locationTextPlaceholder: {
    color: '#94A3B8',
  },
});

export default HomeHeader;

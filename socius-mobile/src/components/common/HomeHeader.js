import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const HomeHeader = ({ onSettingsPress, onLogoPress, locationLabel }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.logoSection} onPress={onLogoPress} activeOpacity={0.8}>
        <Image 
          source={require('../../assets/icons/icon-03.png')} 
          style={styles.logoImage} 
        />
        <View style={styles.logoTextColumn}>
          <Text style={styles.logoText}>Socius</Text>
          {locationLabel ? (
            <View style={styles.locationRow}>
              <Icon name="map-marker" size={14} color="#EC6E63" />
              <Text style={styles.locationText} numberOfLines={2}>
                {locationLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.settingsButton}
        onPress={onSettingsPress}
      >
        <Icon name="cog" size={24} color="#999999" />
      </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },

  logoTextColumn: {
    flexDirection: 'column',
    justifyContent: 'center',
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

  locationText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#6B7280',
    flexShrink: 1,
  },
});

export default HomeHeader;

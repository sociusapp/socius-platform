import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../utils/responsive';
import Button from '../../components/common/Button';

const PermissionRequiredScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const bulletPoints = [
    'Shared only during active requests',
    'Never tracked in the background',
    'Can be turned off anytime'
  ];

  const handleAllowPermission = () => {
    // Navigate to Availability screen (Got It screen) - last in First Time flow
    navigation.navigate('Availability');
  };

  const handleNotNow = () => {
    // Even if user cancels, still go to Availability screen to complete the flow
    navigation.navigate('Availability');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing(16), paddingTop: vscale(35), paddingBottom: vscale(30) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          {/* Logo Header */}
          <View style={[styles.logoSection, { marginBottom: vscale(16) }]}>
            <Image 
              source={require('../../assets/icons/icon-03.png')} 
              style={{ width: scale(32), height: scale(32), resizeMode: 'contain', marginRight: spacing(8) }} 
            />
            <Text style={[styles.logoText, { fontSize: ms(24) }]}>Socius</Text>
          </View>

          {/* Divider */}
          <View style={[styles.headerDivider, { marginBottom: vscale(32), height: scale(1) }]} />

          {/* Title Section */}
          <View style={[styles.titleSection, { marginBottom: vscale(32) }]}>
            <Text style={[styles.mainTitle, { fontSize: ms(26), lineHeight: ms(32), marginBottom: vscale(8) }]}>Permission Required</Text>
            <Text style={[styles.subtitle, { fontSize: ms(15), lineHeight: ms(22) }]}>To help Socius work when you choose</Text>
          </View>

          {/* Location Card */}
          <View style={[styles.locationCard, { 
            borderRadius: scale(24), 
            paddingHorizontal: spacing(20), 
            paddingVertical: vscale(28), 
            marginBottom: vscale(28),
            borderWidth: scale(1),
            shadowOffset: { width: 0, height: vscale(4) },
            shadowRadius: scale(12),
            elevation: scale(4)
          }]}>
            <View style={[styles.iconContainerLarge, { marginBottom: vscale(20) }]}>
              <Icon name="map-marker" size={scale(48)} color="#999999" />
            </View>

            <Text style={[styles.cardTitle, { fontSize: ms(15), lineHeight: ms(22), marginBottom: vscale(18) }]}>
              Socius uses your location only {"\n"} when you request awareness.
            </Text>

            {/* Bullet Points */}
            <View style={styles.bulletContainer}>
              {bulletPoints.map((point, index) => (
                <View key={index} style={[styles.bulletRow, { marginBottom: vscale(12) }]}>
                  <View style={[styles.bulletPoint, { width: scale(6), height: scale(6), borderRadius: scale(3), marginTop: vscale(8) }]} />
                  <Text style={[styles.bulletText, { fontSize: ms(14), marginLeft: spacing(10), lineHeight: ms(20) }]}>{point}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Spacer */}
          <View style={[styles.spacer, { minHeight: vscale(20) }]} />

          {/* Allow Permission Button */}
          <Button
            title="Allow Permission"
            onPress={handleAllowPermission}
            variant="gradient"
            fullWidth
          />

          {/* Not Now Button */}
          <Button
            title="Not now"
            onPress={handleNotNow}
            variant="link"
          />

          {/* Footer Text */}
          <Text style={[styles.footerText, { fontSize: ms(13), marginTop: vscale(10) }]}>
            You remain in control at all times.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  scrollContent: {
    flexGrow: 1,
  },

  // ===== LOGO SECTION =====
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoIcon: {
  },

  logoText: {
    fontWeight: '600',
    color: '#999999',
  },

  // ===== HEADER DIVIDER =====
  headerDivider: {
    backgroundColor: '#E8EAED',
  },

  // ===== TITLE SECTION =====
  titleSection: {
    alignItems: 'center',
  },

  mainTitle: {
    fontWeight: '700',
    color: '#555555',
    textAlign: 'center',
  },

  subtitle: {
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
  },

  // ===== LOCATION CARD =====
  locationCard: {
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    width: '100%',
  },

  iconContainerLarge: {
  },

  cardTitle: {
    fontWeight: '500',
    color: '#2C3E50',
    textAlign: 'center',
  },

  // ===== BULLET POINTS =====
  bulletContainer: {
    width: '100%',
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  bulletPoint: {
    backgroundColor: '#2C3E50',
  },

  bulletText: {
    fontWeight: '400',
    color: '#555555',
    flex: 1,
  },

  // ===== SPACER =====
  spacer: {
    flex: 1,
  },

  // ===== FOOTER TEXT =====
  footerText: {
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center', 
  },
});

export default PermissionRequiredScreen;

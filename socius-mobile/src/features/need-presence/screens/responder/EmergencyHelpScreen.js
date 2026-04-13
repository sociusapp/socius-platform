import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../../components/common/Header';
import Button from '../../../../components/common/Button';
import { useResponsive } from '../../../../utils/responsive';

const EmergencyHelpScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const returnWithBack = route?.params?.returnWithBack === true;
  const scrollRef = useRef(null);

  useEffect(() => {
    const raw = route?.params?.focusIndex;
    const idx = raw == null ? NaN : Number(raw);
    if (!Number.isFinite(idx) || idx < 0 || idx > 3) return;
    const warningApprox = vscale(120) + spacing(20);
    const rowApprox = vscale(12) + spacing(16) * 2 + scale(48) + vscale(12);
    const y = warningApprox + idx * rowApprox;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y, animated: true });
    }, 350);
    return () => clearTimeout(t);
  }, [route?.params?.focusIndex, scale, spacing, vscale]);
  
  const handleCall = (number) => {
    let phoneNumber = '';
    if (Platform.OS === 'android') {
      phoneNumber = `tel:${number}`;
    } else {
      phoneNumber = `telprompt:${number}`;
    }
    Linking.openURL(phoneNumber).catch(err => console.error('Error launching dialer', err));
  };

  const EmergencyOption = ({ icon, title, onPress, iconColor = "#E74C3C" }) => (
    <TouchableOpacity style={[styles.optionCard, { borderRadius: scale(12), padding: spacing(16), marginBottom: vscale(12), shadowRadius: scale(4), elevation: scale(3) }]} onPress={onPress}>
      <View style={[styles.iconContainer, { width: scale(48), marginRight: spacing(16) }]}>
        <Icon name={icon} size={scale(32)} color={iconColor} />
      </View>
      <Text style={[styles.optionText, { fontSize: ms(16) }]}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Header 
        title="Emergency Help" 
        onBackPress={() => navigation.goBack()}
        style={[styles.header, { paddingHorizontal: spacing(16) }]}
        titleStyle={[styles.headerTitle, { fontSize: ms(20) }]}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scrollContent, { padding: spacing(16), paddingBottom: vscale(40) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          {/* Warning Card */}
          <View style={[styles.warningCard, { borderRadius: scale(12), padding: spacing(16), marginBottom: vscale(20), borderWidth: scale(1), shadowRadius: scale(2), elevation: scale(2) }]}>
            <Text style={[styles.warningTitle, { fontSize: ms(16), marginBottom: vscale(8) }]}>Socius does not replace emergency services.</Text>
            <View style={[styles.divider, { height: scale(1), marginVertical: vscale(8) }]} />
            <Text style={[styles.warningText, { fontSize: ms(14), lineHeight: vscale(20) }]}>
              If someone is in immediate danger, contact official emergency services directly.
            </Text>
          </View>

          {/* Emergency Options */}
          <View style={[styles.optionsContainer, { marginBottom: vscale(24) }]}>
            <EmergencyOption 
              icon="police-badge" 
              title="Police" 
              iconColor="#2C3E50" // Dark Blue for Police
              onPress={() => handleCall('100')} 
            />
            <EmergencyOption 
              icon="ambulance" 
              title="Ambulance / Medical Emergency" 
              iconColor="#E74C3C" // Red for Ambulance
              onPress={() => handleCall('102')} 
            />
            <EmergencyOption 
              icon="face-woman" 
              title="Women's Safety Helpline" 
              iconColor="#E91E63" // Pink for Women's Safety
              onPress={() => handleCall('1091')} 
            />
            <EmergencyOption 
              icon="phone" 
              title="Local Emergency Helpline" 
              iconColor="#E74C3C" // Red for General
              onPress={() => handleCall('112')} 
            />
          </View>

          {/* Bottom Card */}
          <View style={[styles.bottomCard, { borderRadius: scale(12), padding: spacing(16), shadowRadius: scale(4), elevation: scale(3) }]}>
            <Text style={[styles.bottomText, { fontSize: ms(14), lineHeight: vscale(20), marginBottom: vscale(16) }]}>
              If the situation is not urgent, you may also choose to share awareness with nearby community members.
            </Text>
            <View style={[styles.divider, { height: scale(1), marginVertical: vscale(8) }]} />
            <Button
              title={returnWithBack ? 'Back to live map' : 'Return to Socius'}
              onPress={() => {
                if (returnWithBack && navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
                  });
                }
              }}
              style={[styles.returnButton, { borderRadius: scale(8), marginTop: vscale(8) }]}
              textStyle={styles.returnButtonText}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#F9FAFB',
  },
  headerTitle: {
    fontWeight: '700',
    color: '#34495E',
  },
  scrollContent: {
  },
  warningCard: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
  },
  warningTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  divider: {
    backgroundColor: '#E0E0E0',
  },
  warningText: {
    color: '#7F8C8D',
  },
  optionsContainer: {
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  bottomText: {
    color: '#7F8C8D',
  },
  returnButton: {
    backgroundColor: '#E74C3C',
  },
  returnButtonText: {
    fontWeight: '700',
  },
});

export default EmergencyHelpScreen;

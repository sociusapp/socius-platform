import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import { useResponsive } from '../../../utils/responsive';

const RequestConfirmationScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const requestId = route?.params?.requestId;

  const handleKeepActive = () => {
    navigation.navigate('RequestActive');
  };

  const handleCancel = () => {
    navigation.navigate('CancelRequest', requestId ? { requestId } : undefined);
  };

  const handleEmergency = () => {
    navigation.navigate('EmergencyHelp');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ padding: spacing(8) }}>
            <Icon name="cog" size={scale(24)} color="#999999" />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />
      <ScrollView 
        contentContainerStyle={[styles.scroll, { 
          paddingHorizontal: spacing(20),
          paddingTop: vscale(20),
          paddingBottom: vscale(60),
          alignItems: 'center'
        }]} 
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          <View style={[styles.statusCard, {
            borderRadius: scale(16),
            padding: spacing(24),
            marginBottom: vscale(30),
            borderWidth: scale(1),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(6),
            elevation: scale(3)
          }]}>
            <Text style={[styles.statusTitle, { fontSize: ms(20), marginBottom: vscale(8) }]}>People Nearby Are Aware</Text>
            <Text style={[styles.statusSubtitle, { fontSize: ms(14) }]}>This does not mean anyone is coming yet.</Text>
          </View>

          <View style={[styles.infoCard, {
            borderRadius: scale(16),
            padding: spacing(20),
            marginBottom: vscale(30),
            borderWidth: scale(1)
          }]}>
            <Text style={[styles.infoTitle, { fontSize: ms(16), marginBottom: vscale(12) }]}>What's happening?</Text>
            <View style={[styles.infoRow, { marginBottom: vscale(12) }]}>
              <View style={[styles.dot, { width: scale(6), height: scale(6), borderRadius: scale(3), marginRight: spacing(10), marginTop: vscale(6) }]} />
              <Text style={[styles.infoText, { fontSize: ms(14) }]}>Local community members have been notified.</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={[styles.dot, { width: scale(6), height: scale(6), borderRadius: scale(3), marginRight: spacing(10), marginTop: vscale(6) }]} />
              <Text style={[styles.infoText, { fontSize: ms(14) }]}>Emergency services have NOT been called.</Text>
            </View>
          </View>

          <View style={[styles.buttonContainer, { gap: vscale(12) }]}>
            <TouchableOpacity 
              style={[styles.primaryButton, { 
                height: vscale(56),
                borderRadius: scale(12)
              }]} 
              onPress={handleKeepActive}
            >
              <Text style={[styles.primaryButtonText, { fontSize: ms(16) }]}>Keep This Request Active</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.secondaryButton, { 
                height: vscale(56),
                borderRadius: scale(12),
                borderWidth: scale(1)
              }]} 
              onPress={handleCancel}
            >
              <Text style={[styles.secondaryButtonText, { fontSize: ms(16) }]}>Cancel Request</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.emergencyButton, { 
                marginTop: vscale(12),
                paddingVertical: vscale(12)
              }]} 
              onPress={handleEmergency}
            >
              <Text style={[styles.emergencyButtonText, { fontSize: ms(14) }]}>I need emergency services</Text>
            </TouchableOpacity>
          </View>
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
  scroll: {
    flexGrow: 1,
  },
  statusCard: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E9ECEF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  statusTitle: {
    fontFamily: 'Inter-Bold',
    color: '#1A1C1E',
    textAlign: 'center',
  },
  statusSubtitle: {
    fontFamily: 'Inter-Regular',
    color: '#6C757D',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F3F5',
  },
  infoTitle: {
    fontFamily: 'Inter-SemiBold',
    color: '#495057',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dot: {
    backgroundColor: '#ADB5BD',
  },
  infoText: {
    fontFamily: 'Inter-Regular',
    color: '#495057',
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Inter-SemiBold',
    color: '#495057',
  },
  emergencyButton: {
    alignItems: 'center',
  },
  emergencyButtonText: {
    fontFamily: 'Inter-Medium',
    color: '#FF3B30',
    textDecorationLine: 'underline',
  },
});

export default RequestConfirmationScreen;

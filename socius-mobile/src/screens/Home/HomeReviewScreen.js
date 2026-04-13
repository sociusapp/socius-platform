import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeHeader from '../../components/common/HomeHeader';
import { useResponsive } from '../../utils/responsive';

const HomeReviewScreen = ({ navigation, route, onRefreshVerification }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefreshVerification) return;
    setRefreshing(true);
    try {
      await onRefreshVerification();
    } finally {
      setRefreshing(false);
    }
  }, [onRefreshVerification]);

  // Get rejection details from route params if available
  const failureReasons = route?.params?.failureReasons || [];
  const adminNote = route?.params?.adminNote || '';
  const fromRejection = route?.params?.fromRejection || false;

  const emergencyContacts = [
    { id: 1, label: 'Police', icon: require('../../assets/home_icons/2.png'), phone: '100' },
    { id: 2, label: 'Ambulance', icon: require('../../assets/home_icons/4.png'), phone: '108' },
    { id: 3, label: "Women's Safety", icon: require('../../assets/home_icons/5.png'), phone: '1091' },
    { id: 4, label: 'Local Helpline', icon: require('../../assets/home_icons/3.png'), phone: '112' },
  ];

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleEmergencyShortcut = (contact) => {
    const id = Number(contact?.id);
    navigation.navigate('EmergencyHelp', {
      focusIndex: Number.isFinite(id) ? Math.max(0, Math.min(3, id - 1)) : 0,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <HomeHeader
        onSettingsPress={handleSettings}
        onLogoPress={() => console.log('Logo pressed')}
        onLocationPress={() => navigation.navigate('LocationMap')}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: spacing(20), paddingTop: vscale(12), paddingBottom: vscale(24) },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefreshVerification ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#DC5C69']}
              tintColor="#DC5C69"
            />
          ) : undefined
        }
      >
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <View
            style={[
              styles.underReviewBanner,
              fromRejection ? styles.rejectedBanner : null,
              {
                paddingHorizontal: spacing(16),
                paddingVertical: vscale(12),
                borderRadius: scale(16),
                marginBottom: vscale(16),
                borderWidth: scale(1),
                shadowOffset: { width: 0, height: vscale(2) },
                shadowRadius: scale(8),
                elevation: scale(4),
              },
            ]}
          >
            <Text
              style={[
                styles.underReviewTitle,
                fromRejection ? styles.rejectedTitle : null,
                { fontSize: ms(15), marginBottom: vscale(4) },
              ]}
            >
              {fromRejection ? 'Resubmit Required' : 'Your profile is under review.'}
            </Text>
            <Text
              style={[
                styles.underReviewSubtitle,
                { fontSize: ms(13), marginBottom: vscale(10) },
              ]}
            >
              {fromRejection 
                ? 'Your documents need to be updated. Tap below to resubmit.'
                : 'Some features will be available once verification is complete.'}
            </Text>

            {/* Show Update button only when rejected */}
            {fromRejection ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('DocumentDetails', { 
                  fromRejection,
                  failureReasons,
                  adminNote 
                })}
                style={{
                  marginTop: vscale(8),
                  backgroundColor: '#DC5C69',
                  paddingVertical: vscale(10),
                  paddingHorizontal: spacing(16),
                  borderRadius: scale(8),
                  alignSelf: 'flex-start',
                  borderWidth: 1,
                  borderColor: '#DC5C69',
                }}
              >
                <Text style={{ 
                  fontSize: ms(13), 
                  fontWeight: '600', 
                  color: '#FFFFFF' 
                }}>
                  Review & Update
                </Text>
              </TouchableOpacity>
            ) : (
              /* Normal under review state - show View button only */
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('DocumentDetails')}
                style={{
                  marginTop: vscale(8),
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  paddingVertical: vscale(10),
                  paddingHorizontal: spacing(16),
                  borderRadius: scale(8),
                  alignSelf: 'flex-start',
                  borderWidth: 1,
                  borderColor: 'rgba(0,0,0,0.05)',
                }}
              >
                <Text style={{ 
                  fontSize: ms(13), 
                  fontWeight: '600', 
                  color: '#DC5C69' 
                }}>
                  View Application Details
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.presenceSection, { marginBottom: vscale(32) }]}>
            <View
              style={[
                styles.presenceButtonContainer,
                {
                  width: scale(180),
                  height: scale(180),
                  borderRadius: scale(90),
                  marginBottom: vscale(5),
                },
              ]}
            >
              <Image
                source={require('../../assets/home_icons/1.png')}
                style={{ width: scale(180), height: scale(180) }}
                resizeMode="contain"
              />
              <View style={styles.presenceDisabledOverlay} />
            </View>
            <Text
              style={[
                styles.presenceTitle,
                { fontSize: ms(20), marginBottom: vscale(6) },
              ]}
            >
              Need Presence
            </Text>
            <Text
              style={[
                styles.presenceSubtitle,
                { fontSize: ms(13), lineHeight: ms(22), marginBottom: vscale(10) },
              ]}
            >
              Available after verification
            </Text>
          </View>

          <Text
            style={[
              styles.emergencyHeader,
              { fontSize: ms(14), marginBottom: vscale(10) },
            ]}
          >
            Emergency Shortcuts
          </Text>

          <View
            style={[
              styles.emergencyContactsContainer,
              { gap: spacing(12), marginBottom: vscale(16) },
            ]}
          >
            {emergencyContacts.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                style={[
                  styles.emergencyContactButton,
                  styles.underReviewEmergencyButton,
                  {
                    paddingVertical: vscale(10),
                    paddingHorizontal: spacing(14),
                    borderRadius: scale(18),
                    borderWidth: scale(1),
                    shadowRadius: scale(6),
                  },
                ]}
                onPress={() => handleEmergencyShortcut(contact)}
              >
                <View
                  style={[
                    styles.emergencyContactIconWrapper,
                    { marginRight: spacing(12) },
                  ]}
                >
                  <Image
                    source={contact.icon}
                    style={{ width: scale(30), height: scale(30), tintColor: '#FFFFFF' }}
                    resizeMode="contain"
                  />
                </View>
                <Text
                  style={[
                    styles.emergencyContactLabel,
                    styles.underReviewEmergencyLabel,
                    { fontSize: ms(13) },
                  ]}
                >
                  {contact.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text
            style={[
              styles.underReviewFootnote,
              { fontSize: ms(12), marginTop: vscale(6) },
            ]}
          >
            You&apos;ll be notified once your account is approved.
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
  presenceSection: {
    alignItems: 'center',
  },
  presenceButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  presenceTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  presenceSubtitle: {
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
  },
  presenceDisabledOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 999,
  },
  emergencyHeader: {
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
  },
  emergencyContactsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  emergencyContactButton: {
    width: '48%',
    borderColor: '#D0D5DD',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    elevation: 2,
  },
  emergencyContactIconWrapper: {
    flexShrink: 0,
  },
  emergencyContactLabel: {
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  underReviewBanner: {
    backgroundColor: '#FFF4F4',
    borderColor: '#F5C2C2',
  },
  rejectedBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  underReviewTitle: {
    fontWeight: '700',
    color: '#D84D42',
  },
  rejectedTitle: {
    color: '#DC2626',
  },
  underReviewSubtitle: {
    fontWeight: '400',
    color: '#6B7280',
  },
  underReviewEmergencyButton: {
    backgroundColor: '#DC5C69',
    borderColor: '#C94A58',
  },
  underReviewEmergencyLabel: {
    color: '#FFFFFF',
  },
  underReviewFootnote: {
    fontWeight: '400',
    color: '#6B7280',
    textAlign: 'center',
  },
  verificationInfoCard: {
    backgroundColor: '#FEF3F3',
    borderColor: '#F5C2C2',
  },
  verificationInfoTitle: {
    fontWeight: '700',
    color: '#9B2C2C',
  },
  verificationInfoText: {
    fontWeight: '400',
    color: '#4A5568',
  },
  verificationInfoNote: {
    fontWeight: '600',
    color: '#742A2A',
  },
});

export default HomeReviewScreen;

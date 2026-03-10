import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeHeader from '../../components/common/HomeHeader';
import { useResponsive } from '../../utils/responsive';

const HomeReviewScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [activeEmergencyContact, setActiveEmergencyContact] = useState(null);

  const emergencyContacts = [
    { id: 1, label: 'Police', icon: require('../../assets/home_icons/2.png'), phone: '100' },
    { id: 2, label: 'Ambulance', icon: require('../../assets/home_icons/4.png'), phone: '108' },
    { id: 3, label: "Women's Safety", icon: require('../../assets/home_icons/5.png'), phone: '1091' },
    { id: 4, label: 'Local Helpline', icon: require('../../assets/home_icons/3.png'), phone: '112' },
  ];

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleEmergencyContact = (contact) => {
    setActiveEmergencyContact(contact);
    setCallModalVisible(true);
  };

  const handleCloseCallModal = () => {
    setCallModalVisible(false);
    setActiveEmergencyContact(null);
  };

  const handleConfirmCall = () => {
    if (!activeEmergencyContact) {
      return;
    }
    const url = `tel:${activeEmergencyContact.phone}`;
    Linking.openURL(url).finally(() => {
      setCallModalVisible(false);
      setActiveEmergencyContact(null);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <HomeHeader
        onSettingsPress={handleSettings}
        onLogoPress={() => console.log('Logo pressed')}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: spacing(20), paddingTop: vscale(12), paddingBottom: vscale(24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <View
            style={[
              styles.underReviewBanner,
              {
                paddingHorizontal: spacing(16),
                paddingVertical: vscale(12),
                borderRadius: scale(16),
                marginBottom: vscale(24),
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
                { fontSize: ms(15), marginBottom: vscale(4) },
              ]}
            >
              Your profile is under review.
            </Text>
            <Text
              style={[
                styles.underReviewSubtitle,
                { fontSize: ms(13) },
              ]}
            >
              Some features will be available once verification is complete.
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('DocumentDetails')}
              style={{
                marginTop: vscale(12),
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                paddingVertical: vscale(8),
                paddingHorizontal: spacing(16),
                borderRadius: scale(8),
                alignSelf: 'flex-start',
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.05)',
              }}
            >
              <Text style={{ fontSize: ms(13), fontWeight: '600', color: '#DC5C69' }}>
                View Application Details
              </Text>
            </TouchableOpacity>
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
                onPress={() => handleEmergencyContact(contact)}
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

      <Modal
        transparent
        visible={callModalVisible}
        animationType="fade"
        onRequestClose={handleCloseCallModal}
      >
        <View style={styles.callModalBackdrop}>
          <View style={styles.callModalCard}>
            {activeEmergencyContact && (
              <View style={styles.callModalIconWrapper}>
                <Image
                  source={activeEmergencyContact.icon}
                  style={{ width: scale(32), height: scale(32), tintColor: '#FFFFFF' }}
                  resizeMode="contain"
                />
              </View>
            )}
            <Text style={styles.callModalTitle}>
              {activeEmergencyContact ? activeEmergencyContact.label : 'Emergency contact'}
            </Text>
            <Text style={styles.callModalNumber}>
              {activeEmergencyContact ? activeEmergencyContact.phone : ''}
            </Text>
            <View style={styles.callModalButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.callModalSecondaryButton}
                onPress={handleCloseCallModal}
              >
                <Text style={styles.callModalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.callModalPrimaryWrapper}
                onPress={handleConfirmCall}
              >
                <View style={styles.callModalPrimaryButton}>
                  <Text style={styles.callModalPrimaryText}>Call</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  underReviewTitle: {
    fontWeight: '700',
    color: '#D84D42',
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

  callModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callModalCard: {
    width: '82%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  callModalIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DC5C69',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  callModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  callModalNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 18,
    textAlign: 'center',
  },
  callModalButtonsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    gap: 12,
  },
  callModalSecondaryButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  callModalSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  callModalPrimaryWrapper: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#DC5C69',
  },
  callModalPrimaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callModalPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default HomeReviewScreen;

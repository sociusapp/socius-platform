import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import { CheckBox } from 'react-native-elements';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from '../../components/common/Button';
import Header from '../../components/common/Header';

const keyPoints = [
  'Socius shares information only — It does not direct actions',
  'Participation is voluntary at all times',
  'You are responsible for your own decisions',
  'Socius does not replace emergency services',
  'You may leave or stop using the app at any time',
];

const sections = [
  {
    id: 'terms',
    title: 'Terms of Use',
    icon: 'file-document-outline',
    content:
      'By using Socius, you agree to use the platform responsibly and in accordance with all applicable laws. You acknowledge that Socius is a community information-sharing platform and not a substitute for professional services.',
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    icon: 'shield-lock-outline',
    content:
      'Your privacy is important to us. We collect only necessary information to help you connect with your community. Your personal data is protected and never shared publicly without your consent.',
  },
  {
    id: 'community',
    title: 'Community Guidelines',
    icon: 'handshake',
    content:
      'We are committed to maintaining a safe and respectful community. Users must treat each other with respect, avoid harassment, and refrain from sharing harmful or illegal content.',
  },
];

const TermsAndConditionsScreen = ({ navigation }) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleAgree = () => {
    if (agreedToTerms) {
      navigation.navigate('Subscription');
    }
  };

  const { contentWidth, ms, spacing, vscale, scale, isTablet } = useResponsive();
  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="" 
        onBackPress={() => navigation.goBack()} 
        style={{ borderBottomWidth: 0 }}
      />
      
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: spacing(16), paddingTop: vscale(16), paddingBottom: vscale(130) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          <View style={[styles.titleSection, { marginBottom: vscale(28) }]}>
            <Text style={[styles.mainTitle, { fontSize: ms(26), lineHeight: ms(32), marginBottom: vscale(8) }]}>Before you continue</Text>
            <Text style={[styles.subtitle, { fontSize: ms(13), lineHeight: ms(22) }]}>Please review and agree to the following to use Socius.</Text>
          </View>

        <View style={[styles.keyPointsContainer, {paddingHorizontal: spacing(8) }]}>
          {keyPoints.map((point, index) => (
            <View key={index} style={[styles.keyPointRow, { marginBottom: vscale(16) }]}>
              <View style={[styles.checkmarkIconContainer, { marginRight: spacing(12), marginTop: vscale(2) }]}>
                <Icon name="check-circle" size={scale(19)} color="#4CAF50" />
              </View>
              <Text style={[styles.keyPointText, { fontSize: ms(14), lineHeight: ms(22) }]}>{point}</Text>
            </View>
          ))}
        </View>

        <View style={[{ marginBottom: vscale(15) }]}>
          {sections.map((section) => (
            <View key={section.id} style={[styles.sectionCard, { 
              marginBottom: vscale(8), 
              borderRadius: scale(16),
              borderWidth: scale(1),
              shadowOffset: { width: 0, height: vscale(2) },
              shadowRadius: scale(4),
              elevation: scale(3)
            }]}>
              <TouchableOpacity 
                style={[
                  styles.sectionHeader,
                  {
                    paddingHorizontal: spacing(16),
                    paddingVertical: vscale(10),
                  },
                ]}
                onPress={() => {
                  if (section.id === 'terms') {
                    navigation.navigate('TermsOfUse');
                  } else if (section.id === 'privacy') {
                    navigation.navigate('PrivacyPolicy');
                  } else if (section.id === 'community') {
                    navigation.navigate('CommunityGuidelines');
                  }
                }}
              >
                <View style={styles.sectionTitleContainer}>
                  <View style={[styles.sectionIconContainer, { width: scale(40), height: scale(30), marginRight: spacing(12) }]}>
                    <Icon 
                      name={section.icon} 
                      size={scale(24)} 
                      color="#2C3E50"
                    />
                  </View>
                  <Text style={[styles.sectionTitle, { fontSize: ms(16) }]}>{section.title}</Text>
                </View>
                <Icon 
                  name="chevron-right"
                  size={scale(24)}
                  color="#999999"
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={[styles.agreementContainer, { marginBottom: vscale(24) }]}>
          <TouchableOpacity 
            style={[styles.checkboxWrapper, { paddingHorizontal: spacing(4) }]}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
          >
            <View style={[
              styles.checkbox,
              agreedToTerms && styles.checkboxChecked,
              { 
                width: scale(22), 
                height: scale(22), 
                borderRadius: scale(6), 
                marginRight: spacing(12),
                borderWidth: scale(2)
              }
            ]}>
              {agreedToTerms && (
                <Icon name="check" size={scale(14)} color="#FFFFFF" />
              )}
            </View>
            <Text style={[styles.agreementText, { fontSize: ms(14), lineHeight: ms(21) }]}>
              I have read and agree to the Terms of Use, Privacy Policy, and Community Guidelines.
            </Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>

      {/* Agree Button */}
      <View style={[styles.footer, { paddingHorizontal: spacing(20), paddingVertical: vscale(16), paddingBottom: vscale(24), borderTopWidth: scale(1) }]}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <Button 
            title="Agree & Continue" 
            onPress={handleAgree}
            fullWidth
            disabled={!agreedToTerms}
          />
        </View>
      </View>
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

  // ===== TITLE SECTION =====
  titleSection: {
    alignItems: 'center',
  },

  mainTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },

  subtitle: {
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
  },

  // ===== KEY POINTS SECTION =====
  keyPointsContainer: {
  },

  keyPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  checkmarkIconContainer: {
  },

  keyPointText: {
    fontWeight: '500',
    color: '#2C3E50',
    flex: 1,
  },

  // ===== SECTIONS CONTAINER =====

  sectionCard: {
    borderColor: '#E8EAED',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },

  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sectionIconContainer: {
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },

  sectionTitle: {
    fontWeight: '600',
    color: '#2C3E50',
  },

  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#F1F3F5',
  },

  sectionText: {
    fontWeight: '400',
    color: '#666666',
  },

  // ===== AGREEMENT SECTION =====
  agreementContainer: {
  },

  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkbox: {
    borderColor: '#E8EAED',
    backgroundColor: '#F8F9FA', 
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },

  agreementText: {
    fontWeight: '400',
    color: '#666666',
    flex: 1,
  },

  // ===== FOOTER SECTION =====
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E8EAED',
  },
});

export default TermsAndConditionsScreen;

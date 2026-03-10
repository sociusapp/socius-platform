import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import { useResponsive } from '../../utils/responsive';

const VerificationNeedsAttentionScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale, isTablet } = useResponsive();
  const rejectionReasons = route?.params?.failureReasons || [];
  const rejectionNote = route?.params?.adminNote || null;
  const rejectionMessage =
    rejectionNote ||
    (rejectionReasons.length > 0 ? rejectionReasons.join(' • ') : null);
  const reasons = [
    'Image unclear or cropped',
    'Document not fully visible',
    'Information mismatch',
    'Missing required detail'
  ];

  const solutions = [
    'Use clear, well-lit photos',
    'Ensure full document is visible',
    'Avoid glare or blur',
    'Take selfie without hats or masks'
  ];

  const handleRetryVerification = () => {
    navigation.navigate('IdentityVerification');
  };

  const handleContactSupport = () => {
    navigation.navigate('SupportChat');
  };

  const handleContinue = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title=""
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: spacing(16), paddingTop: vscale(16), paddingBottom: vscale(40) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          {/* Title */}
          <Text style={[styles.mainTitle, { fontSize: ms(24), marginBottom: vscale(16), lineHeight: ms(32) }]}>Verification Needs Attention</Text>

          {/* Error Card */}
          <View style={[styles.errorCard, {
            paddingHorizontal: spacing(16),
            paddingVertical: vscale(18),
            borderRadius: scale(20),
            marginBottom: vscale(24),
            borderWidth: scale(1),
            shadowOffset: { width: 0, height: vscale(2) },
            elevation: scale(3)
          }]}>
            <Text style={[styles.errorTitle, { fontSize: ms(15), fontWeight: '700', marginBottom: vscale(8), lineHeight: ms(22) }]}>
              We couldn't complete verification with the information provided.
            </Text>
            <Text style={[styles.errorSubtitle, { fontSize: ms(13), lineHeight: ms(20) }]}>
              This can happen for a few common reasons.
            </Text>
            {rejectionMessage ? (
              <Text
                style={[
                  styles.errorSubtitle,
                  {
                    fontSize: ms(13),
                    lineHeight: ms(20),
                    marginTop: vscale(8),
                    color: '#4A5568',
                  },
                ]}
              >
                {rejectionMessage}
              </Text>
            ) : null}
          </View>

          {/* Reasons List */}
          <View style={[styles.reasonsContainer, { marginBottom: vscale(24) }]}>
            {reasons.map((reason, index) => (
              <View key={index} style={[styles.reasonRow, { flexDirection: 'row', alignItems: 'center', marginBottom: vscale(12), gap: spacing(10) }]}>
                <Icon name="check-circle-outline" size={scale(18)} color="#4A5568" />
                <Text style={[styles.reasonText, { fontSize: ms(13), color: '#4A5568' }]}>{reason}</Text>
              </View>
            ))}
          </View>

          {/* How to Fix Section */}
          <Text style={[styles.howToFixTitle, { fontSize: ms(16), fontWeight: '700', marginBottom: vscale(16), color: '#2C3E50' }]}>How to fix this</Text>

          <View style={[styles.solutionsContainer, { marginBottom: vscale(32) }]}>
            {solutions.map((solution, index) => (
              <View key={index} style={[styles.solutionRow, { flexDirection: 'row', alignItems: 'flex-start', marginBottom: vscale(12), gap: spacing(10) }]}>
                <View style={[styles.bulletPoint, { width: scale(6), height: scale(6), borderRadius: scale(3), backgroundColor: '#DC5C69', marginTop: scale(8) }]} />
                <Text style={[styles.solutionText, { fontSize: ms(13), color: '#4A5568', lineHeight: ms(20), flex: 1 }]}>{solution}</Text>
              </View>
            ))}
          </View>

          {/* Retry Button */}
          <View style={{ marginBottom: vscale(12) }}>
            <Button
              title="Retry Verification"
              onPress={handleRetryVerification}
              variant="gradient"
              fullWidth
            />
          </View>

          {/* Contact Support Button */}
          <View style={{ marginBottom: vscale(12) }}>
            <Button
              title="Contact Support"
              onPress={handleContactSupport}
              variant="white"
              fullWidth
            />
          </View>

          {/* Save & Exit */}
          <View style={styles.saveExitButton}>
            <Text style={styles.saveExitText} onPress={handleContinue}>
              Save & Exit
            </Text>
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

  scrollContent: {
    flexGrow: 1,
  },

  // ===== MAIN TITLE =====
  mainTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'left',
  },

  // ===== ERROR CARD =====
  errorCard: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },

  errorTitle: {
    fontWeight: '500',
    color: '#2C3E50',
  },

  errorSubtitle: {
    fontWeight: '400',
    color: '#888888',
  },

  // ===== REASONS CONTAINER =====
  reasonsContainer: {
  },

  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  reasonText: {
    fontWeight: '400',
    color: '#2C3E50',
    flex: 1,
  },

  // ===== HOW TO FIX SECTION =====
  howToFixTitle: {
    fontWeight: '600',
    color: '#2C3E50',
  },

  solutionsContainer: {
  },

  solutionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  bulletPoint: {
    backgroundColor: '#2C3E50',
  },

  solutionText: {
    fontWeight: '400',
    color: '#555555',
    flex: 1,
  },

  // ===== BUTTONS =====
  saveExitButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveExitText: {
    fontWeight: '600',
    color: '#2C3E50',
    textDecorationLine: 'underline',
  },
});

export default VerificationNeedsAttentionScreen;

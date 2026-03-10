import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import { useResponsive } from '../../utils/responsive';

const ConnectionUnavailableScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const actionItems = [
    'Check your internet connection.',
    'Try again in a moment.',
    'Contact emergency services if needed.'
  ];

  const handleTryAgain = () => {
    console.log('Try again');
    navigation.goBack();
  };

  const handleEmergencyHelp = () => {
    console.log('Emergency help');
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="" 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: 0 }}
      />

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing(20), paddingTop: vscale(12), paddingBottom: vscale(30) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          {/* Main Title */}
          <Text style={[styles.mainTitle, { fontSize: ms(28), marginBottom: vscale(20), lineHeight: ms(36) }]}>Connection Unavailable</Text>

          {/* Error Card */}
          <View style={[styles.errorCard, { borderRadius: scale(16), paddingHorizontal: spacing(16), paddingVertical: vscale(16), marginBottom: vscale(20), borderWidth: scale(1), shadowOffset: { width: 0, height: vscale(2) }, shadowRadius: scale(6), elevation: scale(2) }]}>
            <Text style={[styles.errorMessage, { fontSize: ms(15), lineHeight: ms(22), marginBottom: vscale(6) }]}>
              Socius can't connect right now due to a network issue.
            </Text>
            <Text style={[styles.errorSubtext, { fontSize: ms(13), lineHeight: ms(18) }]}>
              This may be temporary.
            </Text>
          </View>

          {/* Info Text */}
          <Text style={[styles.infoText, { fontSize: ms(14), marginBottom: vscale(20), lineHeight: ms(20) }]}>
            Your information has not been shared.
          </Text>

          {/* Divider */}
          <View style={[styles.sectionDivider, { height: scale(1), marginBottom: vscale(20) }]} />

          {/* What you can do now */}
          <Text style={[styles.sectionTitle, { fontSize: ms(16), marginBottom: vscale(16) }]}>What you can do now</Text>

          {/* Action Items */}
          <View style={[styles.actionItemsContainer, { marginBottom: vscale(28) }]}>
            {actionItems.map((item, index) => (
              <View key={index} style={[styles.actionItem, { marginBottom: vscale(14), gap: spacing(10) }]}>
                <Icon name="check" size={scale(20)} color="#2C3E50" />
                <Text style={[styles.actionItemText, { fontSize: ms(14), lineHeight: ms(20), paddingTop: vscale(2) }]}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Spacer */}
          <View style={[styles.spacer, { height: vscale(16) }]} />

          {/* Try Again Button */}
          <Button
            title="Try Again"
            onPress={handleTryAgain}
            variant="gradient"
            fullWidth
          />

          {/* Emergency Help Button */}
          <Button
            title="Emergency Help"
            onPress={handleEmergencyHelp}
            variant="white"
            fullWidth
          />

          {/* Go Back Link */}
          <Button
            title="Go Back"
            onPress={handleGoBack}
            variant="link"
          />

          {/* Bottom Spacing */}
          <View style={[styles.bottomSpacing, { height: vscale(20) }]} />
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
    textAlign: 'center',
  },

  // ===== ERROR CARD =====
  errorCard: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },

  errorMessage: {
    fontWeight: '400',
    color: '#2C3E50',
  },

  errorSubtext: {
    fontWeight: '400',
    color: '#999999',
    fontStyle: 'italic',
  },

  // ===== INFO TEXT =====
  infoText: {
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
  },

  sectionDivider: {
    backgroundColor: '#E8EAED',
  },

  // ===== SECTION TITLE =====
  sectionTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },

  // ===== ACTION ITEMS =====
  actionItemsContainer: {
  },

  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  actionItemText: {
    fontWeight: '400',
    color: '#2C3E50',
    flex: 1,
  },

  // ===== SPACER =====
  spacer: {
  },

  // ===== BOTTOM SPACING =====
  bottomSpacing: {
  },
});

export default ConnectionUnavailableScreen;

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../../../components/common/Header';
import Button from '../../../../components/common/Button';
import { submitClosure } from '../../../../services/api/needPresence.api';
import { loadAuth } from '../../../../services/storage/asyncStorage.service';
import CustomAlert from '../../../../components/common/CustomAlert';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { useResponsive } from '../../../../utils/responsive';

const ThankYouClosingScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [stars, setStars] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const requestId = route?.params?.requestId;

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    icon: 'alert-circle-outline',
    iconColor: '#DC5C69'
  });

  const showAlert = (title, message, buttons = [], icon = 'alert-circle-outline', iconColor = '#DC5C69') => {
    setAlertConfig({
      title,
      message,
      buttons,
      icon,
      iconColor
    });
    setAlertVisible(true);
  };

  const closeAlert = () => {
    setAlertVisible(false);
  };

  const outcomes = [
    { label: 'Resolved calmly', icon: 'check-circle-outline' },
    { label: 'No longer needed', icon: 'clock-outline' },
    { label: 'Chose another option', icon: 'swap-horizontal' },
    { label: 'Still concerned', icon: 'alert-circle-outline' },
  ];

  const handleSubmit = async () => {
    if (submitting) return;

    // If no requestId is provided, just navigate home (legacy behavior or preview)
    if (!requestId) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
      });
      return;
    }

    if (!stars || stars < 1) {
      showAlert('Rating required', 'Please rate your experience to continue.', [{ text: 'OK', onPress: closeAlert }]);
      return;
    }

    setSubmitting(true);
    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      
      if (!token) {
        showAlert('Error', 'Not authenticated', [{ text: 'OK', onPress: closeAlert }]);
        return;
      }

      const payload = {
        requestId,
        rating: stars,
        feedback: {
          providedHelp: selectedOutcome === 'Resolved calmly',
          requesterUnavailable: selectedOutcome === 'No longer needed',
          safetyConcerns: selectedOutcome === 'Still concerned',
          notes: feedback || null,
        }
      };

      const response = await submitClosure(token, payload);

      if (response?.success) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
        });
      } else {
        console.log('Close request response:', response);
        showAlert(
          'Could not save',
          response?.message || 'Something went wrong. You can try again from the meeting screen.',
          [{ text: 'OK', onPress: closeAlert }]
        );
      }
    } catch (error) {
      console.error('Error closing request:', error);
      showAlert('Error', 'Failed to submit. Please try again or skip.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Header 
        title="" 
        onBackPress={() => navigation.goBack()} 
        backIcon="close"
        style={{ borderBottomWidth: scale(1), paddingHorizontal: spacing(16) }}
        titleStyle={{ fontSize: ms(18), fontWeight: '600', color: '#5D6D7E' }}
      />
      
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing(20), paddingTop: vscale(24), paddingBottom: vscale(40), alignItems: 'center' }]} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentWidth }}>
          <View style={[styles.headerSection, { marginBottom: vscale(20) }]}>
            <View style={{ alignItems: 'center', marginBottom: vscale(14) }}>
              <LinearGradient
                colors={['#E7F9F0', '#DCFCE7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: scale(74),
                  height: scale(74),
                  borderRadius: scale(37),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="hand-heart" size={scale(34)} color="#28C76F" />
              </LinearGradient>
            </View>
            <Text style={[styles.mainTitle, { fontSize: ms(22), marginBottom: vscale(8) }]}>Close this request</Text>
            <Text style={[styles.subTitle, { fontSize: ms(15), lineHeight: vscale(22) }]}>
              A short rating helps keep community help calm and respectful.
            </Text>
          </View>

          {/* Outcome Selection */}
          <View style={[styles.card, { borderRadius: scale(12), padding: spacing(16), marginBottom: vscale(24), shadowRadius: scale(4), elevation: scale(2), borderWidth: scale(1) }]}>
            <Text style={[styles.cardTitle, { fontSize: ms(16), marginBottom: vscale(12) }]}>Rate this experience</Text>
            <View style={{ flexDirection: 'row', marginBottom: vscale(16) }}>
              {[1,2,3,4,5].map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setStars(n)}
                  style={{ padding: spacing(6) }}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${n} star${n === 1 ? '' : 's'}`}
                >
                  <Icon
                    name={n <= stars ? 'star' : 'star-outline'}
                    size={scale(26)}
                    color={n <= stars ? '#F59E0B' : '#9CA3AF'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.cardTitle, { fontSize: ms(16), marginBottom: vscale(16) }]}>How did this situation end?</Text>
            <View style={[styles.chipContainer, { gap: spacing(10) }]}>
              {outcomes.map((outcome) => (
                <TouchableOpacity
                  key={outcome.label}
                  style={[
                    styles.chip,
                    { paddingVertical: vscale(10), paddingHorizontal: spacing(16), borderRadius: scale(20), borderWidth: scale(1), width: '48%' },
                    selectedOutcome === outcome.label && styles.chipSelected
                  ]}
                  onPress={() => setSelectedOutcome(outcome.label)}
                  accessibilityRole="button"
                  accessibilityLabel={`Outcome: ${outcome.label}`}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon
                      name={outcome.icon}
                      size={scale(16)}
                      color={selectedOutcome === outcome.label ? '#FFFFFF' : '#5D6D7E'}
                      style={{ marginRight: spacing(8) }}
                    />
                    <Text style={[
                      styles.chipText,
                      { fontSize: ms(13) },
                      selectedOutcome === outcome.label && styles.chipTextSelected
                    ]}>
                      {outcome.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Feedback Input */}
          <View style={[styles.section, { marginBottom: vscale(24) }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vscale(10) }}>
              <Icon name="message-text-outline" size={scale(18)} color="#5D6D7E" style={{ marginRight: spacing(8) }} />
              <Text style={[styles.sectionLabel, { fontSize: ms(15) }]}>Anything you want to share? <Text style={[styles.optionalText, { fontSize: ms(15) }]}>(optional)</Text></Text>
            </View>
            <TextInput
              style={[styles.textInput, { borderRadius: scale(8), padding: spacing(12), height: vscale(80), fontSize: ms(14), marginBottom: vscale(8), borderWidth: scale(1) }]}
              placeholder="Short feedback helps improve the platform"
              placeholderTextColor="#95A5A6"
              value={feedback}
              onChangeText={setFeedback}
              multiline
            />
            <Text style={[styles.helperText, { fontSize: ms(12) }]}>Please avoid names or accusations.</Text>
          </View>

          {/* Info Cards */}
          <View style={[styles.infoCard, { borderRadius: scale(12), padding: spacing(16), marginBottom: vscale(16), borderWidth: scale(1), shadowRadius: scale(2), elevation: scale(1) }]}>
            <Text style={[styles.infoCardTitle, { fontSize: ms(16), marginBottom: vscale(12) }]}>If you're still concerned</Text>
            <View style={[styles.bulletItem, { marginBottom: vscale(8) }]}>
              <Text style={[styles.bulletPoint, { fontSize: ms(16), marginRight: spacing(8), lineHeight: vscale(20) }]}>•</Text>
              <Text style={[styles.bulletText, { fontSize: ms(14), lineHeight: vscale(20) }]}>Consider contacting local authorities.</Text>
            </View>
            <View style={[styles.bulletItem, { marginBottom: vscale(8) }]}>
              <Text style={[styles.bulletPoint, { fontSize: ms(16), marginRight: spacing(8), lineHeight: vscale(20) }]}>•</Text>
              <Text style={[styles.bulletText, { fontSize: ms(14), lineHeight: vscale(20) }]}>Reach out to someone you trust.</Text>
            </View>
            <View style={[styles.bulletItem, { marginBottom: vscale(8) }]}>
              <Text style={[styles.bulletPoint, { fontSize: ms(16), marginRight: spacing(8), lineHeight: vscale(20) }]}>•</Text>
              <Text style={[styles.bulletText, { fontSize: ms(14), lineHeight: vscale(20) }]}>You can start a new request anytime.</Text>
            </View>
          </View>

          <View style={[styles.infoCard, { borderRadius: scale(12), padding: spacing(16), marginBottom: vscale(16), borderWidth: scale(1), shadowRadius: scale(2), elevation: scale(1) }]}>
            <Text style={[styles.infoCardTitle, { fontSize: ms(16), marginBottom: vscale(12) }]}>For volunteers</Text>
            <View style={[styles.bulletItem, { marginBottom: vscale(8) }]}>
              <Text style={[styles.bulletPoint, { fontSize: ms(16), marginRight: spacing(8), lineHeight: vscale(20) }]}>•</Text>
              <Text style={[styles.bulletText, { fontSize: ms(14), lineHeight: vscale(20) }]}>You can step back now.</Text>
            </View>
            <View style={[styles.bulletItem, { marginBottom: vscale(8) }]}>
              <Text style={[styles.bulletPoint, { fontSize: ms(16), marginRight: spacing(8), lineHeight: vscale(20) }]}>•</Text>
              <Text style={[styles.bulletText, { fontSize: ms(14), lineHeight: vscale(20) }]}>No further action is expected.</Text>
            </View>
            <View style={[styles.bulletItem, { marginBottom: vscale(8) }]}>
              <Text style={[styles.bulletPoint, { fontSize: ms(16), marginRight: spacing(8), lineHeight: vscale(20) }]}>•</Text>
              <Text style={[styles.bulletText, { fontSize: ms(14), lineHeight: vscale(20) }]}>Thank you for being aware.</Text>
            </View>
          </View>

          {submitting ? (
            <ActivityIndicator size="large" color="#DC5C69" style={{ marginTop: vscale(16) }} />
          ) : (
            <Button 
              title={requestId ? "Submit & Close" : "Return to Home"}
              onPress={handleSubmit} 
              variant="primary"
              fullWidth
              style={[styles.returnButton, { marginTop: vscale(16), borderRadius: scale(30) }]}
              icon={<Icon name={requestId ? "check-circle-outline" : "home-outline"} size={scale(18)} color="#FFFFFF" />}
              accessibilityLabel={requestId ? "Submit closure and close" : "Return to home"}
            />
          )}
        </View>
      </ScrollView>
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4A5568',
    marginBottom: 8,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 16,
    textAlign: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '48%', // Approx half width
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: '#EBF5FF',
    borderColor: '#4299E1',
  },
  chipText: {
    fontSize: 13,
    color: '#4A5568',
    textAlign: 'center',
  },
  chipTextSelected: {
    color: '#2B6CB0',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 10,
  },
  optionalText: {
    color: '#A0AEC0',
    fontWeight: '400',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    height: 60,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#2D3748',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#718096',
    fontStyle: 'italic',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    fontSize: 16,
    color: '#4A5568',
    marginRight: 8,
    lineHeight: 20,
  },
  bulletText: {
    fontSize: 14,
    color: '#4A5568',
    flex: 1,
    lineHeight: 20,
  },
  returnButton: {
    marginTop: 16,
    borderRadius: 30,
    backgroundColor: '#D3453D',
  },
});

export default ThankYouClosingScreen;

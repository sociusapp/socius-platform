import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import { LinearGradient } from 'expo-linear-gradient';
import Button from '../../../components/common/Button';
import CustomAlert from '../../../components/common/CustomAlert';
import { useResponsive } from '../../../utils/responsive';
import { cancelHelpRequest } from '../../../services/api/incident.api';
import { loadAuth } from '../../../services/storage/asyncStorage.service';

const CancelRequestScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [submitting, setSubmitting] = useState(false);
  const requestId = route?.params?.requestId;

  const CANCEL_REASONS = {
    NO_HELPERS_NEARBY: 'no_helpers_nearby',
    NO_ONE_ACCEPTED: 'no_one_accepted',
    CHANGE_OF_PLANS: 'change_of_plans',
    FOUND_HELP_ELSEWHERE: 'found_help_elsewhere',
  };
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS.NO_ONE_ACCEPTED);

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

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleCancelRequest = async () => {
    if (submitting) {
      return;
    }

    if (!requestId) {
      showAlert('Request not found', 'Unable to identify the request to cancel.', [{ text: 'OK', onPress: closeAlert, type: 'destructive' }]);
      return;
    }

    setSubmitting(true);

    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;

      if (!token) {
        showAlert('Not signed in', 'Please sign in again to cancel this request.', [{ text: 'OK', onPress: closeAlert, type: 'primary' }]);
        return;
      }

      const response = await cancelHelpRequest(token, requestId, { reason: cancelReason });

      if (response?.success) {
        showAlert('Request cancelled', 'Your help request has been cancelled.', [
          {
            text: 'OK',
            onPress: () => {
              closeAlert();
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
              });
            },
            type: 'primary'
          },
        ], 'check-circle', '#4CAF50');
        return;
      }

      showAlert(
        'Unable to cancel',
        response?.message || 'Something went wrong while cancelling the request.',
        [{ text: 'OK', onPress: closeAlert, type: 'destructive' }]
      );
    } catch (error) {
      const status = error?.response?.status;
      const messageFromServer =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message;

      showAlert(
        status ? `Error (${status})` : 'Error',
        messageFromServer || 'Something went wrong while cancelling the request.',
        [{ text: 'OK', onPress: closeAlert, type: 'destructive' }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeepActive = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={handleSettings} style={{ padding: scale(8) }}>
            <Icon name="cog" size={scale(24)} color="#999999" />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          {/* Dialog Card */}
          <View style={[styles.dialogCard, {
            borderRadius: scale(24),
            borderWidth: scale(1),
            paddingHorizontal: spacing(24),
            paddingVertical: vscale(20),
            marginBottom: vscale(28),
            shadowOffset: { width: 0, height: vscale(4) },
            shadowRadius: scale(12),
            elevation: scale(4)
          }]}>
            {/* Pause Icon */}
            <View style={[styles.iconContainer, { marginBottom: vscale(15) }]}>
              <LinearGradient
                colors={['#F2F4F7', '#E3E7EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.pauseGradient, {
                  width: scale(72),
                  height: scale(72),
                  borderRadius: scale(36),
                  shadowOffset: { width: 0, height: vscale(2) },
                  shadowRadius: scale(8),
                  elevation: scale(4)
                }]}
              >
                <View style={styles.pauseBars}>
                  <View style={[styles.pauseBar, { width: scale(10), height: vscale(28), borderRadius: scale(4) }]} />
                  <View style={[styles.pauseBar, { width: scale(10), height: vscale(28), borderRadius: scale(4), marginLeft: spacing(8) }]} />
                </View>
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={[styles.dialogTitle, { fontSize: ms(20), marginBottom: vscale(10) }]}>Cancel This Request?</Text>

            {/* Subtitle */}
            <Text style={[styles.dialogSubtitle, { fontSize: ms(15) }]}>You can close this anytime.</Text>
          </View>

          {/* Info Section */}
          <View style={[styles.infoSection, { marginBottom: vscale(20) }]}>
            <Text style={[styles.infoText, { fontSize: ms(15), lineHeight: ms(24) }]}>Please select a reason for cancelling.</Text>
          </View>

          {/* Reason Selection */}
          <View style={{ width: '100%', marginBottom: vscale(24) }}>
            <TouchableOpacity
              style={[
                styles.reasonOption,
                { borderRadius: scale(14), paddingVertical: vscale(12), paddingHorizontal: spacing(14), marginBottom: vscale(10) },
                cancelReason === CANCEL_REASONS.NO_HELPERS_NEARBY && styles.reasonOptionSelected,
              ]}
              onPress={() => setCancelReason(CANCEL_REASONS.NO_HELPERS_NEARBY)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.reasonOptionText,
                  { fontSize: ms(14) },
                  cancelReason === CANCEL_REASONS.NO_HELPERS_NEARBY && styles.reasonOptionTextSelected,
                ]}
              >
                No helpers nearby
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.reasonOption,
                { borderRadius: scale(14), paddingVertical: vscale(12), paddingHorizontal: spacing(14), marginBottom: vscale(10) },
                cancelReason === CANCEL_REASONS.NO_ONE_ACCEPTED && styles.reasonOptionSelected,
              ]}
              onPress={() => setCancelReason(CANCEL_REASONS.NO_ONE_ACCEPTED)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.reasonOptionText,
                  { fontSize: ms(14) },
                  cancelReason === CANCEL_REASONS.NO_ONE_ACCEPTED && styles.reasonOptionTextSelected,
                ]}
              >
                No one accepted
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.reasonOption,
                { borderRadius: scale(14), paddingVertical: vscale(12), paddingHorizontal: spacing(14), marginBottom: vscale(10) },
                cancelReason === CANCEL_REASONS.FOUND_HELP_ELSEWHERE && styles.reasonOptionSelected,
              ]}
              onPress={() => setCancelReason(CANCEL_REASONS.FOUND_HELP_ELSEWHERE)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.reasonOptionText,
                  { fontSize: ms(14) },
                  cancelReason === CANCEL_REASONS.FOUND_HELP_ELSEWHERE && styles.reasonOptionTextSelected,
                ]}
              >
                Found help elsewhere
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.reasonOption,
                { borderRadius: scale(14), paddingVertical: vscale(12), paddingHorizontal: spacing(14) },
                cancelReason === CANCEL_REASONS.CHANGE_OF_PLANS && styles.reasonOptionSelected,
              ]}
              onPress={() => setCancelReason(CANCEL_REASONS.CHANGE_OF_PLANS)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.reasonOptionText,
                  { fontSize: ms(14) },
                  cancelReason === CANCEL_REASONS.CHANGE_OF_PLANS && styles.reasonOptionTextSelected,
                ]}
              >
                Change of plans
              </Text>
            </TouchableOpacity>
          </View>

          {/* Spacer */}
          <View style={[styles.spacer, { height: vscale(20) }]} />

          <View style={{ width: '100%' }}>
            <Button
              title="Cancel Request"
              onPress={handleCancelRequest}
              variant="gradient"
              fullWidth
              loading={submitting}
              disabled={submitting}
            />
          </View>

          {/* Keep Active Button */}
          <Button
            title="Keep Request Active"
            onPress={handleKeepActive}
            variant="white"
            fullWidth
          />

          {/* Footer Text */}
          <View style={styles.footerSection}>
            <Text style={[styles.footerText, { fontSize: ms(15), marginBottom: vscale(4) }]}>Socius does not require follow-up.</Text>
            <Text style={[styles.footerSubtext, { fontSize: ms(14) }]}>You remain in control.</Text>
          </View>

          <View style={[styles.bottomSpacer, { height: vscale(40) }]} />
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 80,
  },

  // ===== DIALOG CARD =====
  dialogCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E8EAED',
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginBottom: 28,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },

  iconContainer: {
    marginBottom: 15,
  },

  pauseGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBar: {
    width: 10,
    height: 28,
    borderRadius: 4,
    backgroundColor: '#9AA4B2',
  },

  dialogTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 10,
  },

  dialogSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#999999',
    textAlign: 'center',
  },

  // ===== INFO SECTION =====
  infoSection: {
    marginBottom: 20,
  },

  infoText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#2C3E50',
    textAlign: 'center',
    lineHeight: 24,
  },

  reasonOption: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  reasonOptionSelected: {
    borderColor: '#D84D42',
    backgroundColor: '#FFF2F0',
  },
  reasonOptionText: {
    color: '#444444',
    fontWeight: '600',
  },
  reasonOptionTextSelected: {
    color: '#B93A30',
  },

  // ===== DETAILS BOX =====
  detailsBox: {
    backgroundColor: '#F0F4F7',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EAED',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },

  bulletText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#2C3E50',
    lineHeight: 22,
    marginLeft: 12,
  },

  // ===== SPACER =====
  spacer: {
  },


  // ===== FOOTER =====
  footerSection: {
    alignItems: 'center',
    marginTop: 16,
  },

  footerText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2C3E50',
  },

  footerSubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
  },

  bottomSpacer: {
  },
});

export default CancelRequestScreen;

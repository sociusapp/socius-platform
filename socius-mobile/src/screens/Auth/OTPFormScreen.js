import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Keyboard, Platform, Animated, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { useResponsive } from '../../utils/responsive';
import Button from '../../components/common/Button';
import Header from '../../components/common/Header';
import CustomAlert from '../../components/common/CustomAlert';
import BottomActionBar from '../../components/common/BottomActionBar';
import { verifyOtp as verifyOtpApi, sendOtp as sendOtpApi } from '../../services/api/auth.api';
import notifee from '@notifee/react-native';
import { saveAuth } from '../../services/storage/asyncStorage.service';
import { getHome, markFirstTimeFlag } from '../../services/api/user.api';
import { getFcmToken } from '../../services/firebase/config';
import { requestLocationPermission, getCurrentPosition } from '../../services/location/geolocation.service';
import { updateAvailabilityLocation } from '../../services/api/incident.api';

// ==================== DEV OTP FEATURES CONFIG ====================
// Set to true to enable auto-fill, auto-verify, and OTP display
// Works in both development and production builds
// IMPORTANT: Set to false before Play Store release
const ENABLE_DEV_OTP_FEATURES = true;
// Set to true to auto-trigger verification after OTP is filled
const AUTO_VERIFY_IN_DEV = false; // Change to true for instant login
// ===============================================================

const buildOtpDigits = (raw) => {
  const digitsOnly = String(raw ?? '').replace(/\D/g, '').slice(0, 6);
  const next = [];
  for (let i = 0; i < 6; i += 1) {
    next.push(digitsOnly[i] || '');
  }
  return next;
};

const OTPVerificationScreen = ({ navigation, route }) => {
  const { phone, countryCode, otp: serverOtpParam } = route?.params || {};
  const [otp, setOtp] = useState(() => buildOtpDigits(serverOtpParam));
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const otpInputs = useRef([]);
  const [otpError, setOtpError] = useState('');

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

  // Animation value for the OTP overlay
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  const fillOtpBoxes = (raw) => {
    setOtp(buildOtpDigits(raw));
  };

  // DEV MODE: Auto-fill OTP from API/DB response
  // Runs when ENABLE_DEV_OTP_FEATURES is true (works in all builds)
  useLayoutEffect(() => {
    if (!ENABLE_DEV_OTP_FEATURES) return;
    if (!serverOtpParam) return;
    setOtp(buildOtpDigits(serverOtpParam));
    Keyboard.dismiss();
  }, [serverOtpParam]);

  // DEV MODE: Animate OTP banner when server returns OTP
  useEffect(() => {
    if (!ENABLE_DEV_OTP_FEATURES) return;
    if (serverOtpParam) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 5,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [serverOtpParam]);

  // DEV MODE: Show OTP banner for debugging
  const renderDevOtpBanner = () => {
    if (!ENABLE_DEV_OTP_FEATURES || !serverOtpParam) return null;
    return (
      <Animated.View
        style={[
          styles.devOtpBanner,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.devOtpBannerContent}>
          <Text style={styles.devOtpBannerLabel}>🔧 TEST MODE</Text>
          <Text style={styles.devOtpBannerCode}>{serverOtpParam}</Text>
          <Text style={styles.devOtpBannerHint}>Tap Verify to continue</Text>
          {AUTO_VERIFY_IN_DEV && (
            <Text style={styles.devOtpBannerAuto}>Auto-verify enabled</Text>
          )}
        </View>
      </Animated.View>
    );
  };
  useEffect(() => {
    let interval;
    if (timer > 0 && !canResend) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [canResend]);

  // Focus first input or dismiss keyboard in dev mode
  useEffect(() => {
    const timeout = setTimeout(() => {
      // DEV MODE: Don't focus if OTP was auto-filled
      if (ENABLE_DEV_OTP_FEATURES && serverOtpParam) {
        Keyboard.dismiss();
        // Optional: Auto-verify after short delay
        if (AUTO_VERIFY_IN_DEV) {
          setTimeout(() => {
            handleVerify();
          }, 800);
        }
        return;
      }
      otpInputs.current[0]?.focus();
    }, 280);
    return () => clearTimeout(timeout);
  }, [serverOtpParam]);

  const syncLocationAfterOtp = async (accessToken) => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        return;
      }

      const position = await getCurrentPosition();
      const { longitude, latitude } = position.coords || {};
      if (typeof longitude !== 'number' || typeof latitude !== 'number') {
        return;
      }

      const response = await updateAvailabilityLocation(accessToken, {
        lng: longitude,
        lat: latitude,
      });

      if (response?.success) {
        await markFirstTimeFlag(accessToken, 'hasGivenLocationPermission');
      }
    } catch (error) {
      console.log(
        'syncLocationAfterOtp error',
        error?.message,
        error?.response?.status,
        error?.response?.data
      );
    }
  };

  const handleOTPChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }

    if (value) {
      const isComplete = newOtp.every(digit => digit !== '');
      if (isComplete) {
        Keyboard.dismiss();
      }
    }
  };

  const handleBackspace = (index) => {
    const newOtp = [...otp];

    if (index > 0) {
      if (newOtp[index] !== '') {
        newOtp[index] = '';
      } else {
        newOtp[index - 1] = '';
      }
      setOtp(newOtp);
      otpInputs.current[index - 1]?.focus();
      return;
    }

    if (index === 0 && newOtp[0] !== '') {
      newOtp[0] = '';
      setOtp(newOtp);
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');

    if (!phone) {
      showAlert('Error', 'Phone number is missing. Please go back and try again.', [{ text: 'OK', onPress: closeAlert }]);
      return;
    }

    if (otpCode.length !== 6) {
      setOtpError('Please enter the 6-digit code.');
      return;
    }

    try {
      setIsVerifying(true);
      setOtpError('');

      let deviceToken = null;
      try {
        deviceToken = await getFcmToken();
      } catch (e) {
        deviceToken = null;
      }

      let deviceId = null;
      let deviceModel = null;
      let appVersion = null;
      try {
        deviceModel = Device.modelName || null;
      } catch (e) { }
      try {
        if (Platform.OS === 'android') {
          deviceId = Application.androidId || null;
        } else if (Platform.OS === 'ios') {
          deviceId = Application.iosIdForVendor || null;
        }
      } catch (e) { }
      try {
        appVersion = Application.nativeApplicationVersion || null;
      } catch (e) { }

      const response = await verifyOtpApi({
        phone,
        countryCode,
        otp: otpCode,
        deviceToken,
        platform: Platform.OS,
        deviceId,
        deviceModel,
        appVersion,
      });

      const { success, message, data, errorCode } = response || {};

      if (!success) {
        if (errorCode === 'COUNTRY_MISMATCH') {
          showAlert(
            'Authentication Error',
            message || 'The country selected does not match the registered account for this number.',
            [{ text: 'Go Back', onPress: () => { closeAlert(); navigation.goBack(); } }]
          );
        } else {
          const errorMessage = message || 'OTP verification failed. Please try again.';
          setOtpError(errorMessage);
        }
        return;
      }

      if (data?.accessToken) {
        // Cancel the persistent OTP notification
        try {
          await notifee.cancelNotification('dev_otp_notification');
        } catch (e) {
          console.log('Failed to cancel dev OTP notification', e);
        }

        await saveAuth({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          role: data.user?.role,
          userId: data.user?._id || data.user?.id,
        });
        syncLocationAfterOtp(data.accessToken);
      }

      let nextRoute = { name: 'MainApp', params: { screen: 'HomeTab' } };

      if (!data?.isNewUser && data?.accessToken) {
        try {
          const homeResponse = await getHome(data.accessToken);
          const { success: homeSuccess, data: homeData } = homeResponse || {};
          if (homeSuccess && homeData) {
            const user = homeData.user;
            const accountStatus = String(user?.accountStatus || 'active').toLowerCase();
            const verificationStatus = String(homeData.verificationStatus || 'not_submitted').toLowerCase();
            const accountAllowed = ['active', 'limited'].includes(accountStatus);
            const verificationApproved = verificationStatus === 'approved';
            const canUseVerifiedHome = accountAllowed && verificationApproved;

            if (verificationStatus === 'failed') {
              nextRoute = { name: 'MainApp', params: { screen: 'HomeTab' } };
            } else if (!canUseVerifiedHome) {
              if (verificationStatus === 'not_submitted') {
                nextRoute = { name: 'ParticipationChoice' };
              } else {
                nextRoute = { name: 'ProfileReview' };
              }
            } else {
              nextRoute = { name: 'MainApp', params: { screen: 'HomeTab' } };
            }
          }
        } catch (e) {
          console.log('getHome failed during OTP verify:', e);
        }
      }

      if (data?.isNewUser) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'ProfileInfo', params: { user: data?.user, isNewUser: true } }],
        });
        return;
      }

      navigation.reset({
        index: 0,
        routes: [nextRoute],
      });
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message;
      const message =
        apiMessage ||
        'Something went wrong while verifying OTP. Please try again.';
      setOtpError(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    if (!phone || !countryCode) {
      showAlert('Error', 'Phone number or country code is missing. Please go back and try again.', [{ text: 'OK', onPress: closeAlert }]);
      return;
    }

    try {
      setIsResending(true);
      setOtpError('');

      const response = await sendOtpApi(phone, countryCode);
      const { success, message, data } = response || {};

      if (!success) {
        const errorMessage =
          message ||
          'Failed to resend OTP. Please try again.';
        setOtpError(errorMessage);
        return;
      }

      if (data?.otp) {
        fillOtpBoxes(data.otp);
      } else {
        setOtp(['', '', '', '', '', '']);
      }
      setTimer(30);
      setCanResend(false);
      otpInputs.current[0]?.focus();
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message;
      const message =
        apiMessage ||
        'Something went wrong while resending OTP. Please try again.';
      setOtpError(message);
    } finally {
      setIsResending(false);
    }
  };

  const otpFilled = otp.every(digit => digit !== '');

  const { contentWidth, ms, spacing, vscale, scale, otpSize, radius } = useResponsive();
  const otpFont = Math.round(otpSize * 0.42);

  return (
    <View style={{ flex: 1 }}>
      {renderDevOtpBanner()}
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <Header
          title=""
          onBackPress={() => navigation.goBack()}
          style={{ borderBottomWidth: 0 }}
        />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View style={[styles.content, { alignItems: 'center', paddingHorizontal: spacing(20), paddingTop: vscale(32) }]}>
              <View style={{ width: contentWidth }}>
                <View style={[styles.titleSection, { marginBottom: vscale(36) }]}>
                  <Text style={[styles.mainTitle, { fontSize: ms(28), lineHeight: ms(36) }]}>Enter verification code</Text>
                  <Text style={[styles.subtitle, { fontSize: ms(16), lineHeight: ms(24) }]}>We've sent a 6-digit code to your phone.</Text>
                </View>
                <View style={[styles.otpContainer, { gap: spacing(10), marginBottom: vscale(20) }]}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={ref => otpInputs.current[index] = ref}
                      style={[styles.otpInput, {
                        width: otpSize,
                        height: otpSize,
                        fontSize: otpFont,
                        borderRadius: 10,
                        borderWidth: scale(2),
                        shadowOffset: { width: 0, height: vscale(2) },
                        shadowRadius: scale(4),
                        elevation: scale(2)
                      }]}
                      maxLength={1}
                      keyboardType="number-pad"
                      value={digit}
                      onChangeText={(value) => handleOTPChange(value, index)}
                      onFocus={() => {
                        const ref = otpInputs.current[index];
                        if (ref) {
                          const length = digit ? digit.length : 0;
                          ref.setNativeProps({ selection: { start: length, end: length } });
                        }
                      }}
                      onSelectionChange={({ nativeEvent }) => {
                        const { selection } = nativeEvent;
                        if (digit && selection.start === 0 && selection.end === 0) {
                          const ref = otpInputs.current[index];
                          if (ref) {
                            ref.setNativeProps({ selection: { start: 1, end: 1 } });
                          }
                        }
                      }}
                      onKeyPress={({ nativeEvent }) => {
                        if (nativeEvent.key === 'Backspace') {
                          handleBackspace(index);
                        }
                      }}
                      placeholder=""
                      placeholderTextColor="#E8EAED"
                    />
                  ))}
                </View>
                {otpError ? (
                  <Text style={[styles.errorText, { fontSize: ms(13), marginBottom: vscale(24) }]}>
                    {otpError}
                  </Text>
                ) : null}
                <View style={styles.resendSection}>
                  <Text style={[styles.resendLabel, { fontSize: ms(14), marginBottom: vscale(12) }]}>Didn't receive the code?</Text>
                  <Button
                    title="Resend OTP"
                    onPress={handleResendOTP}
                    variant="outline"
                    loading={isResending}
                    disabled={!canResend || isResending}
                    style={[
                      styles.resendButtonContainer,
                      (!canResend || isResending) && styles.resendButtonDisabled,
                      { borderRadius: scale(24), marginBottom: vscale(8) }
                    ]}
                  />
                  {!canResend && (
                    <Text style={[styles.timerText, { fontSize: ms(14) }]}>Resend available in {timer}s</Text>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>
          <BottomActionBar style={{ paddingHorizontal: spacing(20) }}>
            <Button
              title="Verify"
              onPress={handleVerify}
              loading={isVerifying}
              disabled={!otpFilled || isVerifying || isResending}
              fullWidth
            />
          </BottomActionBar>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        onClose={closeAlert}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  content: {
    flex: 1,
    justifyContent: 'flex-start',
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

  // ===== OTP INPUT =====
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  otpInput: {
    borderColor: '#E8EAED',
    fontWeight: '600',
    textAlign: 'center',
    color: '#2C3E50',
    backgroundColor: '#F8F9FA',
  },

  errorText: {
    color: '#DC5C69',
    textAlign: 'center',
    fontWeight: '500',
    width: '100%',
  },

  // ===== RESEND SECTION =====
  resendSection: {
    alignItems: 'center',
  },

  resendLabel: {
    fontWeight: '400',
    color: '#999999',
  },

  resendButtonContainer: {
    borderColor: '#E8EAED',
  },

  resendButtonDisabled: {
    borderColor: '#E8EAED',
    opacity: 0.5,
  },

  resendButton: {
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
  },

  timerText: {
    fontWeight: '400',
    color: '#999999',
    fontStyle: 'italic',
  },

  // ===== FOOTER BUTTON =====
  footer: {
  },

  buttonStyle: {
  },
  // ===== DEV MODE: OTP Banner Styles =====
  devOtpBanner: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#DC5C69', // Red color for visibility
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    zIndex: 99999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  devOtpBannerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  devOtpBannerLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 8,
    letterSpacing: 1,
  },
  devOtpBannerCode: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 32,
    letterSpacing: 4,
  },
  devOtpBannerHint: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    fontSize: 12,
    marginTop: 4,
  },
  devOtpBannerAuto: {
    color: '#FFD700',
    fontWeight: '600',
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  // ===== END DEV MODE =====

  devOtpContainer: {
    position: 'absolute',
    top: 110,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Transparent dark background
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10, // Pill shape
    zIndex: 99999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', // Subtle border
  },
  devOtpText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 1,
  },
});

export default OTPVerificationScreen;

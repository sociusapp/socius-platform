import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Keyboard, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { useResponsive } from '../../utils/responsive';
import Button from '../../components/common/Button';
import Header from '../../components/common/Header';
import CustomAlert from '../../components/common/CustomAlert';
import { verifyOtp as verifyOtpApi, sendOtp as sendOtpApi } from '../../services/api/auth.api';
import notifee from '@notifee/react-native';
import { saveAuth } from '../../services/storage/asyncStorage.service';
import { getHome, markFirstTimeFlag } from '../../services/api/user.api';
import { getFcmToken } from '../../services/firebase/config';
import { requestLocationPermission, getCurrentPosition } from '../../services/location/geolocation.service';
import { updateAvailabilityLocation } from '../../services/api/incident.api';

const OTPVerificationScreen = ({ navigation, route }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
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

  const { phone, countryCode, otp: devOtp } = route?.params || {};

  // Animation value for the OTP overlay
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (devOtp) {
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
  }, [devOtp]);

  // If in DEV mode and we have the OTP from previous screen, show it in a persistent overlay
  const renderDevOtpOverlay = () => {
    if (devOtp) {
      return (
        <Animated.View
          style={[
            styles.devOtpContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              try {
                const code = String(devOtp).replace(/\D/g, '').slice(0, 6).padEnd(6, '0');
                const digits = code.split('');
                setOtp(digits);
                Keyboard.dismiss();
              } catch { }
            }}
          >
            <Text style={styles.devOtpText}>OTP: {devOtp}</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    }
    return null;
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

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (otpInputs.current[0]) {
        otpInputs.current[0].focus();
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, []);

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
        otp: otpCode,
        deviceToken,
        platform: Platform.OS,
        deviceId,
        deviceModel,
        appVersion,
      });

      const { success, message, data } = response || {};

      if (!success) {
        const errorMessage =
          message ||
          'OTP verification failed. Please try again.';
        setOtpError(errorMessage);
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

      let shouldShowProfileReview = false;

      if (!data?.isNewUser && data?.accessToken) {
        try {
          const homeResponse = await getHome(data.accessToken);
          const { success: homeSuccess, data: homeData } = homeResponse || {};
          if (homeSuccess && homeData?.verificationStatus) {
            const status = homeData.verificationStatus;
            const pendingStatuses = ['pending', 'review_requested', 'not_submitted'];
            if (pendingStatuses.includes(status)) {
              shouldShowProfileReview = true;
            }
          }
        } catch (e) {
          console.log('getHome failed during OTP verify:', e);
          // Proceed to MainApp even if getHome fails
        }
      }

      if (data?.isNewUser) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'ProfileInfo', params: { user: data?.user, isNewUser: true } }],
        });
        return;
      }

      if (shouldShowProfileReview) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'ProfileReview' }],
        });
        return;
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
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
    if (!phone) {
      showAlert('Error', 'Phone number is missing. Please go back and try again.', [{ text: 'OK', onPress: closeAlert }]);
      return;
    }

    try {
      setIsResending(true);
      setOtpError('');

      const response = await sendOtpApi(phone, countryCode || '+91');
      const { success, message } = response || {};

      if (!success) {
        const errorMessage =
          message ||
          'Failed to resend OTP. Please try again.';
        setOtpError(errorMessage);
        return;
      }

      setOtp(['', '', '', '', '', '']);
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
      {renderDevOtpOverlay()}
      <SafeAreaView style={styles.container}>
        <Header
          title=""
          onBackPress={() => navigation.goBack()}
          style={{ borderBottomWidth: 0 }}
        />
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
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
        <View style={[styles.footer, { paddingHorizontal: spacing(20), paddingVertical: vscale(16), paddingBottom: vscale(24), backgroundColor: '#FFFFFF' }]}>
          <Button
            title="Verify"
            onPress={handleVerify}
            loading={isVerifying}
            disabled={!otpFilled || isVerifying || isResending}
            fullWidth
          />
        </View>
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

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Keyboard, Platform, ToastAndroid, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from '../../components/common/Button';
import Header from '../../components/common/Header';
import CustomAlert from '../../components/common/CustomAlert';
import { sendOtp } from '../../services/api/auth.api';

const PhoneVerificationScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const phoneInputRef = useRef(null);
  const countries = [
    { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳', maxLength: 10 },
    { code: 'NP', name: 'Nepal', dial: '+977', flag: '🇳🇵', maxLength: 10 },
    { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩', maxLength: 11 },
    { code: 'BT', name: 'Bhutan', dial: '+975', flag: '🇧🇹', maxLength: 8 },
    { code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰', maxLength: 10 },
    { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰', maxLength: 10 },
    { code: 'MM', name: 'Myanmar', dial: '+95', flag: '🇲🇲', maxLength: 9 },
    { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳', maxLength: 11 },
    { code: 'AF', name: 'Afghanistan', dial: '+93', flag: '🇦🇫', maxLength: 9 },
    { code: 'MV', name: 'Maldives', dial: '+960', flag: '🇲🇻', maxLength: 7 },
  ];
  const [selectedCountryIndex, setSelectedCountryIndex] = useState(0);
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

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

  const selectedCountry = countries[selectedCountryIndex];

  const handleSendOTP = async () => {
    if (phoneNumber.length !== selectedCountry.maxLength) {
      setPhoneError(`Please enter a valid ${selectedCountry.maxLength}-digit mobile number`);
      return;
    }

    try {
      setIsLoading(true);
      setPhoneError('');
      setApiError('');

      const response = await sendOtp(phoneNumber, selectedCountry.dial);
      console.log('Send OTP Response:', response);
      const { success, message, data } = response || {};
      const otp = data?.otp;

      if (otp) {
        // Show toast for quick feedback (Android only)
        if (Platform.OS === 'android') {
          ToastAndroid.show(`OTP: ${otp}`, ToastAndroid.LONG);
        } else {
          // Fallback for iOS since ToastAndroid doesn't work there
          showAlert('Development OTP', `Your OTP is: ${otp}`, [{ text: 'OK', onPress: closeAlert }]);
        }
      }

      if (!success) {
        const errorMessage =
          message || 'Failed to send OTP. Please try again.';
        setApiError(errorMessage);
        return;
      }

      navigation.navigate('OTPForm', {
        phone: phoneNumber,
        countryCode: selectedCountry.dial,
        otp: otp // Pass OTP for development display
      });
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message;
      const message =
        apiMessage ||
        `Something went wrong while sending OTP. Error: ${error.message}`;
      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCountryMenu = () => setCountryMenuOpen(!countryMenuOpen);
  const chooseCountry = (index) => {
    setSelectedCountryIndex(index);
    setCountryMenuOpen(false);
    setPhoneNumber('');
  };

  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (phoneInputRef.current) {
        phoneInputRef.current.focus();
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title=""
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: 0 }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.mainContent} pointerEvents="box-none">
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.content, { paddingHorizontal: spacing(20), paddingTop: vscale(40) }]}>
              <View style={{ width: contentWidth, alignSelf: 'center' }}>
                <View style={[styles.titleSection, { marginBottom: vscale(40) }]}>
                  <Text style={[styles.mainTitle, { fontSize: ms(28), lineHeight: ms(36), marginBottom: vscale(12) }]}>Verify your phone number</Text>
                  <Text style={[styles.subtitle, { fontSize: ms(16), lineHeight: ms(24) }]}>Your number helps keep the community{"\n"}accountable and safe.</Text>
                </View>
                <View>
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        paddingHorizontal: spacing(16),
                        paddingVertical: vscale(4),
                        marginBottom: vscale(8),
                        borderRadius: scale(28),
                        borderWidth: scale(1),
                        shadowOffset: { width: 0, height: vscale(2) },
                        shadowRadius: scale(6),
                        elevation: scale(2),
                      },
                    ]}
                  >
                    <TouchableOpacity style={[styles.countryCodeBox, { paddingRight: spacing(12) }]} onPress={toggleCountryMenu} activeOpacity={0.8}>
                      <Text style={[styles.flagText, { fontSize: ms(18), marginRight: spacing(8) }]}>{selectedCountry.flag}</Text>
                      <Text style={[styles.countryCode, { fontSize: ms(16), marginRight: spacing(8) }]}>{selectedCountry.dial}</Text>
                      <Icon name={countryMenuOpen ? 'chevron-up' : 'chevron-down'} size={scale(20)} color="#666666" />
                      <View style={[styles.divider, { height: vscale(24), width: scale(1) }]} />
                    </TouchableOpacity>
                    <TextInput
                      ref={phoneInputRef}
                      style={[styles.phoneInput, { paddingVertical: vscale(14), fontSize: ms(16) }]}
                      placeholder="Enter mobile number"
                      placeholderTextColor="#CCCCCC"
                      keyboardType="phone-pad"
                      value={phoneNumber}
                      onChangeText={(text) => {
                        const numericText = text.replace(/[^0-9]/g, '');
                        setPhoneNumber(numericText);
                        if (phoneError) {
                          setPhoneError('');
                        }
                        if (countryMenuOpen) {
                          setCountryMenuOpen(false);
                        }
                        if (numericText.length === selectedCountry.maxLength) {
                          Keyboard.dismiss();
                        }
                      }}
                      maxLength={selectedCountry.maxLength}
                    />
                  </View>
                  {phoneError || apiError ? (
                    <Text style={[styles.errorText, { fontSize: ms(12), marginTop: vscale(1), marginBottom: vscale(20) }]}>
                      {phoneError || apiError}
                    </Text>
                  ) : null}
                  {countryMenuOpen && (
                    <View
                      style={[
                        styles.countryDropdown,
                        {
                          marginTop: vscale(4),
                          borderRadius: scale(12),
                          borderWidth: scale(1),
                          shadowOffset: { width: 0, height: vscale(10) },
                          shadowRadius: scale(15),
                          elevation: scale(10),
                        },
                      ]}
                    >
                      <ScrollView style={{ maxHeight: vscale(260) }} nestedScrollEnabled>
                        {countries.map((c, idx) => (
                          <TouchableOpacity
                            key={c.code}
                            style={[
                              styles.dropdownItem,
                              selectedCountryIndex === idx && styles.dropdownItemSelected,
                              {
                                paddingHorizontal: spacing(12),
                                paddingVertical: vscale(12),
                                borderBottomWidth: scale(1),
                              },
                            ]}
                            onPress={() => chooseCountry(idx)}
                          >
                            <Text style={[styles.flagText, { fontSize: ms(18), marginRight: spacing(8) }]}>{c.flag}</Text>
                            <Text style={[styles.dropdownText, { fontSize: ms(14), marginLeft: spacing(8) }]}>{c.name} {c.dial}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                <Text style={[styles.infoText, { fontSize: ms(14), lineHeight: ms(21) }]}>
                  Your number is used only for verification and{"\n"}important account updates.
                </Text>
              </View>
            </View>
          </ScrollView>
          <View style={{ paddingHorizontal: spacing(20), paddingVertical: vscale(16), paddingBottom: vscale(24), backgroundColor: '#FFFFFF' }}>
            <Button
              title="Send OTP"
              onPress={handleSendOTP}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
            />
          </View>
        </View>
      </KeyboardAvoidingView>
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

  mainContent: {
    flex: 1,
  },

  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
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

  // ===== INPUT SECTION =====
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },

  countryCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  countryCode: {
    fontWeight: '500',
    color: '#666666',
  },
  flagText: {
    color: '#000000',
  },

  divider: {
    backgroundColor: '#E8EAED',
  },

  phoneInput: {
    flex: 1,
    fontWeight: '400',
    color: '#2C3E50',
  },
  countryDropdown: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  dropdownItemSelected: {
    backgroundColor: '#F8F9FA',
  },
  dropdownText: {
    color: '#2C3E50',
    fontWeight: '500',
  },
  infoText: {
    color: '#999999',
    textAlign: 'center',
    fontWeight: '400',
  },
  errorText: {
    color: '#E74C3C',
    marginLeft: 24,
  },
});

export default PhoneVerificationScreen;

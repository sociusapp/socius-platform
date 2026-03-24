import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Keyboard, Platform, ToastAndroid, KeyboardAvoidingView, PermissionsAndroid, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from '../../components/common/Button';
import Header from '../../components/common/Header';
import CustomAlert from '../../components/common/CustomAlert';
import BottomActionBar from '../../components/common/BottomActionBar';
import { sendOtp } from '../../services/api/auth.api';
import { countries } from '../../utils/countries';
import { getCurrentPosition, reverseGeocode, requestLocationPermission } from '../../services/location/geolocation.service';
import { saveDefaultCountryCode, loadDefaultCountryCode } from '../../services/storage/asyncStorage.service';

const PhoneVerificationScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const phoneInputRef = useRef(null);
  const searchInputRef = useRef(null);
  
  const [selectedCountryIndex, setSelectedCountryIndex] = useState(0); // Default to India (first in list now)
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [isDetectingCountry, setIsDetectingCountry] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredCountries = useMemo(() => {
    if (!searchQuery) return countries;
    return countries.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.dial.includes(searchQuery) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const selectedCountry = countries[selectedCountryIndex];

  const handleSendOTP = async () => {
    if (!phoneNumber) {
      setPhoneError('Please enter your mobile number');
      return;
    }

    if (phoneNumber.length !== selectedCountry.maxLength) {
      setPhoneError(`Please enter a valid ${selectedCountry.maxLength}-digit mobile number for ${selectedCountry.name}`);
      return;
    }

    try {
      setIsLoading(true);
      setPhoneError('');
      setApiError('');

      // Send both phone and country code for validation
      const response = await sendOtp(phoneNumber, selectedCountry.dial);
      console.log('Send OTP Response:', response);
      const { success, message, data, errorCode } = response || {};
      
      // Handle specific error case where country doesn't match registered number
      if (!success && errorCode === 'COUNTRY_MISMATCH') {
        showAlert(
          'Country Mismatch',
          message || 'This phone number is registered with a different country. Please select the correct country and try again.',
          [{ text: 'OK', onPress: closeAlert }]
        );
        return;
      }

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
        const errorMessage = message || 'Failed to send OTP. Please try again.';
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
      
      // Check if it's a country mismatch error from backend
      if (error?.response?.data?.errorCode === 'COUNTRY_MISMATCH') {
        showAlert(
          'Country Mismatch',
          apiMessage || 'This phone number is registered with a different country.',
          [{ text: 'OK', onPress: closeAlert }]
        );
      } else {
        const message = apiMessage || `Something went wrong while sending OTP. Error: ${error.message}`;
        setApiError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCountryMenu = () => {
    const nextState = !countryMenuOpen;
    setCountryMenuOpen(nextState);
    if (nextState) {
      setSearchQuery('');
      // Focus search input after a short delay to allow menu to open
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  };

  const chooseCountry = (country) => {
    // Find the original index in the countries array
    const index = countries.findIndex(c => c.code === country.code);
    setSelectedCountryIndex(index);
    setCountryMenuOpen(false);
    setPhoneNumber('');
    setSearchQuery('');
    
    // Focus phone input after selecting country
    setTimeout(() => {
      if (phoneInputRef.current) {
        phoneInputRef.current.focus();
      }
    }, 100);
  };

  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  useEffect(() => {
    const requestNotificationPermission = async () => {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
        } catch (err) {
          console.warn('Post notification permission error:', err);
        }
      }
    };
    requestNotificationPermission();

    const initializeCountry = async () => {
      try {
        const savedCode = await loadDefaultCountryCode();
        if (savedCode) {
          const index = countries.findIndex(c => c.code === savedCode);
          if (index !== -1) {
            setSelectedCountryIndex(index);
            return; // Found in storage, no need to detect
          }
        }

        // If not in storage, detect from location
        setIsDetectingCountry(true);
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          setIsDetectingCountry(false);
          return;
        }

        const position = await getCurrentPosition({ timeoutMs: 5000, fallbackToLastKnown: true });
        if (position && position.coords) {
          const { latitude, longitude } = position.coords;
          const place = await reverseGeocode({ latitude, longitude });
          if (place && place.isoCountryCode) {
            const detectedCode = place.isoCountryCode.toUpperCase();
            const index = countries.findIndex(c => c.code === detectedCode);
            if (index !== -1) {
              setSelectedCountryIndex(index);
              await saveDefaultCountryCode(detectedCode); // Save for next time
            }
          }
        }
      } catch (error) {
        console.log('Error initializing country:', error);
      } finally {
        setIsDetectingCountry(false);
      }
    };

    initializeCountry();

    const timeout = setTimeout(() => {
      if (phoneInputRef.current) {
        phoneInputRef.current.focus();
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, []);

  return (
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
                      {isDetectingCountry ? (
                        <View style={{ width: spacing(40), alignItems: 'center' }}>
                          <ActivityIndicator size="small" color="#E85555" />
                        </View>
                      ) : (
                        <>
                          <Text style={[styles.flagText, { fontSize: ms(18), marginRight: spacing(8) }]}>{selectedCountry.flag}</Text>
                          <Text style={[styles.countryCode, { fontSize: ms(16), marginRight: spacing(8) }]}>{selectedCountry.dial}</Text>
                        </>
                      )}
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
                      <View style={[styles.searchContainer, { paddingHorizontal: spacing(12), paddingVertical: vscale(8), borderBottomWidth: scale(1) }]}>
                        <Icon name="magnify" size={scale(20)} color="#666666" style={{ marginRight: spacing(8) }} />
                        <TextInput
                          ref={searchInputRef}
                          style={[styles.searchInput, { fontSize: ms(14), paddingVertical: vscale(4) }]}
                          placeholder="Search country..."
                          placeholderTextColor="#CCCCCC"
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          autoCorrect={false}
                        />
                        {searchQuery.length > 0 && (
                          <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Icon name="close-circle" size={scale(18)} color="#CCCCCC" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <ScrollView style={{ maxHeight: vscale(260) }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {filteredCountries.map((c) => (
                          <TouchableOpacity
                            key={c.code}
                            style={[
                              styles.dropdownItem,
                              selectedCountry.code === c.code && styles.dropdownItemSelected,
                              {
                                paddingHorizontal: spacing(12),
                                paddingVertical: vscale(12),
                                borderBottomWidth: scale(1),
                              },
                            ]}
                            onPress={() => chooseCountry(c)}
                          >
                            <Text style={[styles.flagText, { fontSize: ms(18), marginRight: spacing(8) }]}>{c.flag}</Text>
                            <Text style={[styles.dropdownText, { fontSize: ms(14), marginLeft: spacing(8) }]}>{c.name} {c.dial}</Text>
                          </TouchableOpacity>
                        ))}
                        {filteredCountries.length === 0 && (
                          <View style={{ padding: spacing(20), alignItems: 'center' }}>
                            <Text style={{ color: '#999999', fontSize: ms(14) }}>No countries found</Text>
                          </View>
                        )}
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
          <BottomActionBar style={{ paddingHorizontal: spacing(20) }}>
            <Button
              title="Send OTP"
              onPress={handleSendOTP}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
            />
          </BottomActionBar>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
  },
  searchInput: {
    flex: 1,
    color: '#2C3E50',
    fontWeight: '400',
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

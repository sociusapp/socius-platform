import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import Button from '../../components/common/Button';
import Header from '../../components/common/Header';
import { updateProfile } from '../../services/api/user.api';
import { loadAuth } from '../../services/storage/asyncStorage.service';

const genderOptions = ['Male', 'Female', 'Other'];

const UserProfileScreen = ({ navigation, route }) => {
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [selectedGender, setSelectedGender] = useState('Male');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressPincodeZip, setAddressPincodeZip] = useState('');
  const [addressLandmark, setAddressLandmark] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');

  const [token, setToken] = useState(null);

  useEffect(() => {
    const loadToken = async () => {
      const { accessToken } = await loadAuth();
      setToken(accessToken || null);
    };
    loadToken();
  }, []);

  const handleContinue = async () => {
    const nextErrors = {};

    if (!fullName.trim()) {
      nextErrors.fullName = 'Please enter your full name.';
    }

    const ageNumber = Number(age);
    if (!ageNumber || ageNumber < 13 || ageNumber > 120) {
      nextErrors.age = 'Please enter a valid age 13 above.';
    }

    if (!addressLine1.trim()) {
      nextErrors.addressLine1 = 'Please enter address line 1.';
    }
    if (!addressCity.trim()) {
      nextErrors.addressCity = 'Please enter city.';
    }
    if (!addressState.trim()) {
      nextErrors.addressState = 'Please enter state.';
    }

    if (!/^[0-9]{4,10}$/.test(addressPincodeZip)) {
      nextErrors.addressPincodeZip = 'Please enter a valid pincode / zip code.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError('');
      return;
    }

    if (!token) {
      Alert.alert('Error', 'Session expired. Please login again.');
      return;
    }

    try {
      setIsLoading(true);
      setFieldErrors({});
      setFormError('');

      const genderValue =
        selectedGender === 'Male'
          ? 'male'
          : selectedGender === 'Female'
          ? 'female'
          : 'prefer_not_to_say';

      const payload = {
        fullName: fullName.trim(),
        age: ageNumber,
        gender: genderValue,
        cityArea: `${addressLine1.trim()}, ${addressCity.trim()}, ${addressState.trim()} ${addressPincodeZip.trim()}`.trim(),
      };

      const response = await updateProfile(token, payload);
      const { success, message, errors } = response || {};

      if (!success) {
        const apiFieldErrors = {};

        if (Array.isArray(errors)) {
          errors.forEach((err) => {
            if (!err || !err.field) return;
            switch (err.field) {
              case 'fullName':
                apiFieldErrors.fullName = err.message;
                break;
              case 'age':
                apiFieldErrors.age = err.message;
                break;
              case 'gender':
                // Gender optional hai, agar error aaye to form level pe dikhao
                break;
              case 'cityArea':
                apiFieldErrors.addressCity = err.message;
                break;
              default:
                break;
            }
          });
        }

        if (Object.keys(apiFieldErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...apiFieldErrors }));
          setFormError('');
        } else {
          const errorMessage =
            message || 'Failed to save profile. Please try again.';
          setFormError(errorMessage);
        }
        return;
      }

      navigation.navigate('ParticipationChoice');
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message;
      const message =
        apiMessage || 'Something went wrong while saving profile.';
      setFormError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title=""
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: 0 }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { alignItems: 'center', paddingHorizontal: spacing(16), paddingTop: vscale(16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          <View style={[styles.titleSection, { marginBottom: vscale(28) }]}>
            <Text style={[styles.mainTitle, { fontSize: ms(26), lineHeight: ms(32) }]}>
              Tell us a bit about you
            </Text>
            <Text style={[styles.subtitle, { fontSize: ms(15), lineHeight: ms(22) }]}>
              This helps people recognize each other and builds trust in the community.
            </Text>
          </View>

          <View style={[styles.formContainer, { marginBottom: vscale(20) }]}>
            {/* Full Name */}
            <View
              style={[
                styles.fieldGroup,
                {
                  marginBottom: vscale(14),
                  borderRadius: scale(13),
                  padding: spacing(11),
                  borderWidth: scale(1),
                  shadowOffset: { width: 0, height: vscale(2) },
                  shadowRadius: scale(6),
                  elevation: scale(2),
                },
              ]}
            >
              <Text style={[styles.fieldLabel, { fontSize: ms(14), marginBottom: vscale(7) }]}>
                Full Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderRadius: scale(11),
                    paddingHorizontal: spacing(11),
                    paddingVertical: vscale(9),
                    fontSize: ms(14),
                    height: vscale(45),
                    borderWidth: scale(1),
                  },
                ]}
                placeholder="Enter your name"
                placeholderTextColor="#CCCCCC"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (fieldErrors.fullName) {
                    setFieldErrors((prev) => ({ ...prev, fullName: '' }));
                  }
                }}
                editable={!isLoading}
              />
              {fieldErrors.fullName ? (
                <Text
                  style={[
                    styles.errorText,
                    { fontSize: ms(12), marginTop: vscale(4) },
                  ]}
                >
                  {fieldErrors.fullName}
                </Text>
              ) : null}
            </View>

            {/* Age */}
            <View
              style={[
                styles.fieldGroup,
                {
                  marginBottom: vscale(14),
                  borderRadius: scale(13),
                  padding: spacing(11),
                  borderWidth: scale(1),
                  shadowOffset: { width: 0, height: vscale(2) },
                  shadowRadius: scale(6),
                  elevation: scale(2),
                },
              ]}
            >
              <Text style={[styles.fieldLabel, { fontSize: ms(14), marginBottom: vscale(7) }]}>
                Age
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderRadius: scale(11),
                    paddingHorizontal: spacing(11),
                    paddingVertical: vscale(9),
                    fontSize: ms(14),
                    height: vscale(45),
                    borderWidth: scale(1),
                  },
                ]}
                placeholder="Enter your age"
                placeholderTextColor="#CCCCCC"
                keyboardType="number-pad"
                maxLength={3}
                value={age}
                onChangeText={(text) => {
                  setAge(text);
                  if (fieldErrors.age) {
                    setFieldErrors((prev) => ({ ...prev, age: '' }));
                  }
                }}
                editable={!isLoading}
              />
              {fieldErrors.age ? (
                <Text
                  style={[
                    styles.errorText,
                    { fontSize: ms(12), marginTop: vscale(4) },
                  ]}
                >
                  {fieldErrors.age}
                </Text>
              ) : null}
            </View>

            {/* Gender */}
            <View
              style={[
                styles.fieldGroup,
                {
                  marginBottom: vscale(14),
                  borderRadius: scale(13),
                  padding: spacing(11),
                  borderWidth: scale(1),
                  shadowOffset: { width: 0, height: vscale(2) },
                  shadowRadius: scale(6),
                  elevation: scale(2),
                },
              ]}
            >
              <View style={[styles.genderHeader, { marginBottom: vscale(7) }]}>
                <Text style={[styles.fieldLabel, { fontSize: ms(14), marginBottom: vscale(7) }]}>
                  Gender
                </Text>
                <Text
                  style={[styles.optionalLabel, { fontSize: ms(13), marginLeft: spacing(4) }]}
                >
                  (Optional)
                </Text>
              </View>
              <View style={[styles.genderButtonContainer, { gap: spacing(7) }]}>
                {genderOptions.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.genderButton,
                      selectedGender === option && styles.genderButtonSelected,
                      {
                        paddingVertical: vscale(9),
                        paddingHorizontal: spacing(6),
                        borderRadius: scale(10),
                        borderWidth: scale(1),
                        shadowOffset: { width: 0, height: vscale(1) },
                        shadowRadius: scale(4),
                        elevation: scale(1),
                      },
                    ]}
                    onPress={() => setSelectedGender(option)}
                    disabled={isLoading}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        selectedGender === option && styles.genderButtonTextSelected,
                        { fontSize: ms(13) },
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Address */}
            <View
              style={[
                styles.fieldGroup,
                {
                  marginBottom: vscale(14),
                  borderRadius: scale(13),
                  padding: spacing(11),
                  borderWidth: scale(1),
                  shadowOffset: { width: 0, height: vscale(2) },
                  shadowRadius: scale(6),
                  elevation: scale(2),
                },
              ]}
            >
              <Text style={[styles.fieldLabel, { fontSize: ms(14), marginBottom: vscale(7) }]}>
                Address
              </Text>

              <View style={{ marginBottom: vscale(8) }}>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        borderRadius: scale(11),
                        paddingHorizontal: spacing(11),
                        paddingVertical: vscale(9),
                        fontSize: ms(14),
                        height: vscale(45),
                        borderWidth: scale(1),
                      },
                    ]}
                    placeholder="Address line 1"
                    placeholderTextColor="#CCCCCC"
                    value={addressLine1}
                    onChangeText={(text) => {
                      setAddressLine1(text);
                      if (fieldErrors.addressLine1) {
                        setFieldErrors((prev) => ({ ...prev, addressLine1: '' }));
                      }
                    }}
                    editable={!isLoading}
                  />
              {fieldErrors.addressLine1 ? (
                <Text
                  style={[
                    styles.errorText,
                    { fontSize: ms(12), marginTop: vscale(4) },
                  ]}
                >
                  {fieldErrors.addressLine1}
                </Text>
              ) : null}
              </View>

              <View style={{ marginBottom: vscale(8) }}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderRadius: scale(11),
                      paddingHorizontal: spacing(11),
                      paddingVertical: vscale(9),
                      fontSize: ms(14),
                      height: vscale(45),
                      borderWidth: scale(1),
                    },
                  ]}
                  placeholder="Address line 2 (optional)"
                  placeholderTextColor="#CCCCCC"
                  value={addressLine2}
                  onChangeText={(text) => {
                    setAddressLine2(text);
                  }}
                  editable={!isLoading}
                />
              </View>

              <View style={{ marginBottom: vscale(8) }}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderRadius: scale(11),
                      paddingHorizontal: spacing(11),
                      paddingVertical: vscale(9),
                      fontSize: ms(14),
                      height: vscale(45),
                      borderWidth: scale(1),
                    },
                  ]}
                  placeholder="Landmark / directions (optional)"
                  placeholderTextColor="#CCCCCC"
                  value={addressLandmark}
                  onChangeText={(text) => {
                    setAddressLandmark(text);
                  }}
                  editable={!isLoading}
                />
              </View>

              <View style={{ marginBottom: vscale(8) }}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderRadius: scale(11),
                      paddingHorizontal: spacing(11),
                      paddingVertical: vscale(9),
                      fontSize: ms(14),
                      height: vscale(45),
                      borderWidth: scale(1),
                    },
                  ]}
                  placeholder="City"
                  placeholderTextColor="#CCCCCC"
                  value={addressCity}
                  onChangeText={(text) => {
                    setAddressCity(text);
                    if (fieldErrors.addressCity) {
                      setFieldErrors((prev) => ({ ...prev, addressCity: '' }));
                    }
                  }}
                  editable={!isLoading}
                />
                {fieldErrors.addressCity ? (
                  <Text
                    style={[
                      styles.errorText,
                      { fontSize: ms(12), marginTop: vscale(4) },
                    ]}
                  >
                    {fieldErrors.addressCity}
                  </Text>
                ) : null}
              </View>

              <View style={{ marginBottom: vscale(8) }}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderRadius: scale(11),
                      paddingHorizontal: spacing(11),
                      paddingVertical: vscale(9),
                      fontSize: ms(14),
                      height: vscale(45),
                      borderWidth: scale(1),
                    },
                  ]}
                  placeholder="State"
                  placeholderTextColor="#CCCCCC"
                  value={addressState}
                  onChangeText={(text) => {
                    setAddressState(text);
                    if (fieldErrors.addressState) {
                      setFieldErrors((prev) => ({ ...prev, addressState: '' }));
                    }
                  }}
                  editable={!isLoading}
                />
                {fieldErrors.addressState ? (
                  <Text
                    style={[
                      styles.errorText,
                      { fontSize: ms(12), marginTop: vscale(4) },
                    ]}
                  >
                    {fieldErrors.addressState}
                  </Text>
                ) : null}
              </View>

              <View>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderRadius: scale(11),
                      paddingHorizontal: spacing(11),
                      paddingVertical: vscale(9),
                      fontSize: ms(14),
                      height: vscale(45),
                      borderWidth: scale(1),
                    },
                  ]}
                  placeholder="Pincode / Zip code"
                  placeholderTextColor="#CCCCCC"
                  value={addressPincodeZip}
                  onChangeText={(text) => {
                    setAddressPincodeZip(text);
                    if (fieldErrors.addressPincodeZip) {
                      setFieldErrors((prev) => ({ ...prev, addressPincodeZip: '' }));
                    }
                  }}
                  editable={!isLoading}
                  keyboardType="number-pad"
                />
                {fieldErrors.addressPincodeZip ? (
                  <Text
                    style={[
                      styles.errorText,
                      { fontSize: ms(12), marginTop: vscale(4) },
                    ]}
                  >
                    {fieldErrors.addressPincodeZip}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          <Text
            style={[
              styles.infoText,
              { fontSize: ms(13), lineHeight: ms(19), marginBottom: vscale(12) },
            ]}
          >
            Your information is visible only during active requests and{'\n'}never shared publicly.
          </Text>
          {formError ? (
            <Text
              style={[
                styles.errorText,
                { fontSize: ms(13), lineHeight: ms(18), marginBottom: vscale(8) },
              ]}
            >
              {formError}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingHorizontal: spacing(16),
            paddingVertical: vscale(14),
            paddingBottom: vscale(22),
            borderTopWidth: 0,
            backgroundColor: '#FFFFFF',
          },
        ]}
      >
        <Button
          title="Continue"
          onPress={handleContinue}
          loading={isLoading}
          disabled={isLoading}
          fullWidth
        />
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

  formContainer: {},

  fieldGroup: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E8EAED',
  },

  fieldLabel: {
    fontWeight: '600',
    color: '#2C3E50',
  },

  genderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  optionalLabel: {
    fontWeight: '400',
    color: '#999999',
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    fontWeight: '400',
    color: '#2C3E50',
  },

  genderButtonContainer: {
    flexDirection: 'row',
  },

  genderButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  genderButtonSelected: {
    backgroundColor: '#DC5C69',
    borderColor: '#DC5C69',
  },

  genderButtonText: {
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
  },

  genderButtonTextSelected: {
    color: '#FFFFFF',
  },

  infoText: {
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
  },

  errorText: {
    fontWeight: '500',
    color: '#DC5C69',
    textAlign: 'left',
  },

  footer: {
    borderTopColor: '#E8EAED',
  },
});

export default UserProfileScreen;

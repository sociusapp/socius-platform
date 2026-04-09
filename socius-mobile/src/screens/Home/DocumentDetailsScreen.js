import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { useResponsive } from '../../utils/responsive';
import Header from '../../components/common/Header';
import { getProfile, updateProfile } from '../../services/api/user.api';
import { getVerificationStatus, retryVerification } from '../../services/api/verification.api';
import { loadAuth } from '../../services/storage/asyncStorage.service';
import { baseURL as apiBaseURL } from '../../services/api/client';
import Button from '../../components/common/Button';

const genderOptions = ['Male', 'Female', 'Other'];

const DocumentDetailsScreen = ({ navigation }) => {
  const { ms, spacing, vscale, scale } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [verification, setVerification] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);

  // Editable fields for rejected status
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [selectedGender, setSelectedGender] = useState('Male');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressPincodeZip, setAddressPincodeZip] = useState('');

  // Document images for rejected status
  const [governmentIdImage, setGovernmentIdImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const isRejected = verificationStatus === 'failed';
  const isReadOnly = !isRejected;

  useEffect(() => {
    fetchDetails();
  }, []);

  // Populate editable fields when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setAge(profile.age ? String(profile.age) : '');
      const gender = profile.gender;
      if (gender === 'male') setSelectedGender('Male');
      else if (gender === 'female') setSelectedGender('Female');
      else setSelectedGender('Other');

      // Parse address - assuming format: "line1, city, state pincode"
      if (profile.cityArea) {
        const parts = profile.cityArea.split(',').map(p => p.trim());
        setAddressLine1(parts[0] || '');
        setAddressCity(parts[1] || '');
        if (parts[2]) {
          const statePin = parts[2].split(' ');
          setAddressState(statePin[0] || '');
          setAddressPincodeZip(statePin[1] || '');
        }
      }
    }
  }, [profile]);

  const toAbsoluteFileUrl = (filePath) => {
    if (!filePath) return null;
    const path = String(filePath);
    if (path.startsWith('http://') || path.startsWith('https://')) return path;

    const uploadsIndex = path.indexOf('/uploads/');
    if (uploadsIndex !== -1) {
      const relativePath = path.substring(uploadsIndex);
      const apiRoot = apiBaseURL.replace(/\/api\/?$/, '');
      return `${apiRoot}${relativePath}`;
    }

    const apiRoot = apiBaseURL.replace(/\/api\/?$/, '');
    if (path.startsWith('/')) return `${apiRoot}${path}`;
    return `${apiRoot}/${path}`;
  };

  const extractFilePath = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return value.fileUrl || value.url || value.path || value.uri || value.filePath || value.imageUrl || value.image || null;
  };

  const fetchDetails = async () => {
    try {
      const { accessToken } = await loadAuth();
      if (!accessToken) {
        setProfile(null);
        setVerification(null);
        setVerificationStatus(null);
        return;
      }

      const [profileSettled, verificationSettled] = await Promise.allSettled([
        getProfile(accessToken),
        getVerificationStatus(accessToken),
      ]);

      if (profileSettled.status === 'fulfilled') {
        const profileResult = profileSettled.value;
        if (profileResult?.success && profileResult?.data) {
          setProfile(profileResult.data);
        } else if (profileResult?.data) {
          setProfile(profileResult.data);
        } else {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      if (verificationSettled.status === 'fulfilled') {
        const verificationResult = verificationSettled.value;
        const verData = verificationResult?.data || null;
        setVerification(verData);
        setVerificationStatus(verData?.status || verificationResult?.status || null);
      } else {
        setVerification(null);
        setVerificationStatus(null);
      }
    } catch (error) {
      const apiMessage = error?.response?.data?.message || error?.message;
      Alert.alert('Error', apiMessage || 'Failed to load details.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Government ID upload
  const handleUploadGovernmentId = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setGovernmentIdImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

  // Handle Selfie capture
  const handleCaptureSelfie = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Permission', 'Camera permission is required.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setSelfieImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture selfie.');
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!fullName.trim()) {
      errors.fullName = 'Please enter your full name.';
    }

    const ageNumber = Number(age);
    if (!ageNumber || ageNumber < 13 || ageNumber > 120) {
      errors.age = 'Please enter a valid age (13+).';
    }

    if (!addressLine1.trim()) {
      errors.addressLine1 = 'Please enter address line 1.';
    }
    if (!addressCity.trim()) {
      errors.addressCity = 'Please enter city.';
    }
    if (!addressState.trim()) {
      errors.addressState = 'Please enter state.';
    }

    if (!/^[0-9]{4,10}$/.test(addressPincodeZip)) {
      errors.addressPincodeZip = 'Please enter a valid pincode.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save all changes
  const handleSaveChanges = async () => {
    if (!validateForm()) {
      const errorMessages = Object.entries(fieldErrors)
        .map(([field, error]) => {
          const fieldNames = {
            fullName: 'Full Name',
            age: 'Age',
            addressLine1: 'Address',
            addressCity: 'City',
            addressState: 'State',
            addressPincodeZip: 'Pincode'
          };
          return `• ${fieldNames[field] || field}: ${error}`;
        })
        .join('\n');
      
      Alert.alert(
        'Validation Error',
        `Please fix the following errors:\n\n${errorMessages}`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setSaving(true);
      const { accessToken } = await loadAuth();
      if (!accessToken) {
        Alert.alert('Error', 'Session expired. Please login again.');
        return;
      }

      const genderValue =
        selectedGender === 'Male'
          ? 'male'
          : selectedGender === 'Female'
            ? 'female'
            : 'prefer_not_to_say';

      const profilePayload = {
        fullName: fullName.trim(),
        age: Number(age),
        gender: genderValue,
        cityArea: `${addressLine1.trim()}, ${addressCity.trim()}, ${addressState.trim()} ${addressPincodeZip.trim()}`.trim(),
      };

      const profileResponse = await updateProfile(accessToken, profilePayload);

      if (!profileResponse?.success) {
        Alert.alert('Error', profileResponse?.message || 'Failed to update profile.');
        setSaving(false);
        return;
      }

      if (governmentIdImage || selfieImage) {
        const docPayload = {};
        if (governmentIdImage) docPayload.governmentIdUri = governmentIdImage;
        if (selfieImage) docPayload.selfieUri = selfieImage;

        const docResponse = await retryVerification(accessToken, docPayload);

        if (!docResponse?.success) {
          Alert.alert('Error', docResponse?.message || 'Failed to update documents.');
          setSaving(false);
          return;
        }
      }

      setSuccessMessage('Your application has been updated successfully.');
      setShowSuccessModal(true);
    } catch (error) {
      const apiMessage = error?.response?.data?.message || error?.message;
      Alert.alert('Error', apiMessage || 'Something went wrong while saving.');
    } finally {
      setSaving(false);
    }
  };

  const InfoRow = ({ label, value }) => (
    <View style={[styles.infoRow, { marginBottom: vscale(12) }]}>
      <Text style={[styles.label, { fontSize: ms(13) }]}>{label}</Text>
      <Text style={[styles.value, { fontSize: ms(15) }]}>{value || ''}</Text>
    </View>
  );

  const DocumentStatus = ({ label, status, imageUrl, onPress }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.docContainer, { marginBottom: vscale(16), padding: spacing(12), borderRadius: scale(12) }]}
    >
      <View style={styles.docHeader}>
        <Text style={[styles.docLabel, { fontSize: ms(14) }]}>{label}</Text>
        <View style={[styles.statusBadge, { 
          paddingHorizontal: spacing(8), 
          paddingVertical: vscale(4), 
          borderRadius: scale(4),
          backgroundColor: statusBadgeColor,
          borderColor: statusTextColor + '40'
        }]}>
          <Text style={[styles.statusText, { fontSize: ms(10), color: statusTextColor }]}>{status || 'Submitted'}</Text>
        </View>
      </View>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[styles.docImage, { height: vscale(150), marginTop: vscale(10), borderRadius: scale(8) }]}
          resizeMode="cover"
          onError={(e) => console.log(`[DocumentDetails] Image load error:`, e.nativeEvent.error, 'URL:', imageUrl)}
          onLoad={() => console.log(`[DocumentDetails] Image loaded successfully:`, imageUrl)}
        />
      ) : (
        <View style={[styles.placeholderImage, { height: vscale(100), marginTop: vscale(10), borderRadius: scale(8), justifyContent: 'center', alignItems: 'center' }]}>
          <Icon name="image-off" size={40} color="#999" />
          <Text style={{ fontSize: ms(12), color: '#999', marginTop: vscale(8) }}>Tap to upload</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: vscale(8) }}>
        <Icon name="pencil" size={14} color="#DC5C69" />
        <Text style={{ fontSize: ms(11), color: '#DC5C69', marginLeft: 4, fontWeight: '500' }}>
          Tap to update
        </Text>
      </View>
    </TouchableOpacity>
  );

  const statusText =
    verificationStatus === 'approved'
      ? 'Verified'
      : verificationStatus === 'failed'
      ? 'Rejected'
      : verificationStatus === 'not_submitted' || !verificationStatus
      ? 'Not available'
      : 'Under review';

  const statusBadgeColor =
    verificationStatus === 'approved'
      ? '#E7F9F0'
      : verificationStatus === 'failed'
      ? '#FFEBEE'
      : '#FFF5F5';

  const statusTextColor =
    verificationStatus === 'approved'
      ? '#28C76F'
      : verificationStatus === 'failed'
      ? '#FF3B30'
      : '#DC5C69';

  const statusMessage =
    verificationStatus === 'failed'
      ? 'Your verification was rejected. Please review your documents and resubmit.'
      : verificationStatus === 'approved'
      ? 'Your verification is complete. You can now use all features.'
      : 'Your details are currently being reviewed by our team. This process usually takes 24-48 hours.';

  const selfieUrl = selfieImage || toAbsoluteFileUrl(
    extractFilePath(verification?.selfie) ||
    extractFilePath(verification?.selfieUrl) ||
    extractFilePath(verification?.selfie_url) ||
    extractFilePath(verification?.profileImage)
  );

  const governmentIdUrl = governmentIdImage || toAbsoluteFileUrl(
    extractFilePath(verification?.government_id) ||
    extractFilePath(verification?.governmentId) ||
    extractFilePath(verification?.governmentID) ||
    extractFilePath(verification?.governmentIdUrl) ||
    extractFilePath(verification?.governmentIDUrl) ||
    extractFilePath(verification?.government_id_url) ||
    extractFilePath(verification?.idImage) ||
    extractFilePath(verification?.documentImage)
  );

  // Debug logging
  console.log('[DocumentDetails] Verification object:', JSON.stringify(verification, null, 2));
  console.log('[DocumentDetails] Selfie URL:', selfieUrl);
  console.log('[DocumentDetails] Government ID URL:', governmentIdUrl);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Application Details" onBack={() => navigation.goBack()} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#DC5C69" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Application Details" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { padding: spacing(20) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Status Banner */}
          <View style={[styles.statusBanner, { backgroundColor: statusBadgeColor, padding: spacing(16), borderRadius: scale(12), marginBottom: vscale(20), borderWidth: 1, borderColor: statusTextColor + '40' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon
                name={verificationStatus === 'failed' ? 'alert-circle' : verificationStatus === 'approved' ? 'check-circle' : 'clock-outline'}
                size={24}
                color={statusTextColor}
              />
              <View style={{ marginLeft: spacing(12), flex: 1 }}>
                <Text style={[styles.statusTitle, { color: statusTextColor, fontSize: ms(16), fontWeight: '700' }]}>
                  {statusText}
                </Text>
                <Text style={[styles.statusMessage, { color: statusTextColor, fontSize: ms(13), marginTop: vscale(4), opacity: 0.9 }]}>
                  {statusMessage}
                </Text>
              </View>
            </View>
          </View>

          {/* Personal Information Section */}
          <Text style={[styles.sectionTitle, { fontSize: ms(18), marginBottom: vscale(16) }]}>
            Personal Information
          </Text>

          <View style={[styles.card, { padding: spacing(16), marginBottom: vscale(24), borderRadius: scale(16) }]}>
            {isReadOnly ? (
              // Read-only view
              <>
                <InfoRow label="Full Name" value={profile?.fullName} />
                <InfoRow label="Age" value={profile?.age ? `${profile.age} years` : ''} />
                <InfoRow label="Gender" value={profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : ''} />
                <InfoRow label="Address / Area" value={profile?.cityArea} />
              </>
            ) : (
              // Editable form
              <>
                {/* Full Name */}
                <View style={{ marginBottom: vscale(12) }}>
                  <Text style={[styles.inputLabel, { fontSize: ms(13), marginBottom: vscale(6) }]}>Full Name</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { fontSize: ms(14), padding: spacing(12), borderRadius: scale(8), borderWidth: 1 },
                      fieldErrors.fullName && { borderColor: '#DC5C69', backgroundColor: '#FFF5F5' }
                    ]}
                    value={fullName}
                    onChangeText={(text) => {
                      setFullName(text);
                      if (fieldErrors.fullName) setFieldErrors(prev => ({ ...prev, fullName: '' }));
                    }}
                    placeholder="Enter full name"
                    placeholderTextColor="#999"
                    editable={!saving}
                  />
                  {fieldErrors.fullName && <Text style={styles.errorText}>{fieldErrors.fullName}</Text>}
                </View>

                {/* Age */}
                <View style={{ marginBottom: vscale(12) }}>
                  <Text style={[styles.inputLabel, { fontSize: ms(13), marginBottom: vscale(6) }]}>Age</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { fontSize: ms(14), padding: spacing(12), borderRadius: scale(8), borderWidth: 1 },
                      fieldErrors.age && { borderColor: '#DC5C69', backgroundColor: '#FFF5F5' }
                    ]}
                    value={age}
                    onChangeText={(text) => {
                      const numericText = text.replace(/[^0-9]/g, '');
                      setAge(numericText);
                      if (fieldErrors.age) setFieldErrors(prev => ({ ...prev, age: '' }));
                    }}
                    placeholder="Enter age"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    maxLength={3}
                    editable={!saving}
                  />
                  {fieldErrors.age && <Text style={styles.errorText}>{fieldErrors.age}</Text>}
                </View>

                {/* Gender */}
                <View style={{ marginBottom: vscale(12) }}>
                  <Text style={[styles.inputLabel, { fontSize: ms(13), marginBottom: vscale(6) }]}>Gender</Text>
                  <View style={{ flexDirection: 'row', gap: spacing(8) }}>
                    {genderOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.genderButton,
                          selectedGender === option && styles.genderButtonSelected,
                          { paddingVertical: vscale(10), paddingHorizontal: spacing(16), borderRadius: scale(8), borderWidth: 1 }
                        ]}
                        onPress={() => setSelectedGender(option)}
                        disabled={saving}
                      >
                        <Text style={[styles.genderButtonText, selectedGender === option && styles.genderButtonTextSelected, { fontSize: ms(13) }]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Address */}
                <View style={{ marginBottom: vscale(12) }}>
                  <Text style={[styles.inputLabel, { fontSize: ms(13), marginBottom: vscale(6) }]}>Address</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { fontSize: ms(14), padding: spacing(12), borderRadius: scale(8), borderWidth: 1 },
                      fieldErrors.addressLine1 && { borderColor: '#DC5C69', backgroundColor: '#FFF5F5' }
                    ]}
                    value={addressLine1}
                    onChangeText={(text) => {
                      setAddressLine1(text);
                      if (fieldErrors.addressLine1) setFieldErrors(prev => ({ ...prev, addressLine1: '' }));
                    }}
                    placeholder="Street address"
                    placeholderTextColor="#999"
                    editable={!saving}
                  />
                  {fieldErrors.addressLine1 && <Text style={styles.errorText}>{fieldErrors.addressLine1}</Text>}
                </View>

                <View style={{ marginBottom: vscale(12) }}>
                  <Text style={[styles.inputLabel, { fontSize: ms(13), marginBottom: vscale(6) }]}>City</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { fontSize: ms(14), padding: spacing(12), borderRadius: scale(8), borderWidth: 1 },
                      fieldErrors.addressCity && { borderColor: '#DC5C69', backgroundColor: '#FFF5F5' }
                    ]}
                    value={addressCity}
                    onChangeText={(text) => {
                      setAddressCity(text);
                      if (fieldErrors.addressCity) setFieldErrors(prev => ({ ...prev, addressCity: '' }));
                    }}
                    placeholder="City"
                    placeholderTextColor="#999"
                    editable={!saving}
                  />
                  {fieldErrors.addressCity && <Text style={styles.errorText}>{fieldErrors.addressCity}</Text>}
                </View>

                <View style={{ marginBottom: vscale(12) }}>
                  <Text style={[styles.inputLabel, { fontSize: ms(13), marginBottom: vscale(6) }]}>State</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { fontSize: ms(14), padding: spacing(12), borderRadius: scale(8), borderWidth: 1 },
                      fieldErrors.addressState && { borderColor: '#DC5C69', backgroundColor: '#FFF5F5' }
                    ]}
                    value={addressState}
                    onChangeText={(text) => {
                      setAddressState(text);
                      if (fieldErrors.addressState) setFieldErrors(prev => ({ ...prev, addressState: '' }));
                    }}
                    placeholder="State"
                    placeholderTextColor="#999"
                    editable={!saving}
                  />
                  {fieldErrors.addressState && <Text style={styles.errorText}>{fieldErrors.addressState}</Text>}
                </View>

                <View style={{ marginBottom: vscale(4) }}>
                  <Text style={[styles.inputLabel, { fontSize: ms(13), marginBottom: vscale(6) }]}>Pincode / Zip</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { fontSize: ms(14), padding: spacing(12), borderRadius: scale(8), borderWidth: 1 },
                      fieldErrors.addressPincodeZip && { borderColor: '#DC5C69', backgroundColor: '#FFF5F5' }
                    ]}
                    value={addressPincodeZip}
                    onChangeText={(text) => {
                      const numericText = text.replace(/[^0-9]/g, '');
                      setAddressPincodeZip(numericText);
                      if (fieldErrors.addressPincodeZip) setFieldErrors(prev => ({ ...prev, addressPincodeZip: '' }));
                    }}
                    placeholder="Pincode"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    maxLength={10}
                    editable={!saving}
                  />
                  {fieldErrors.addressPincodeZip && <Text style={styles.errorText}>{fieldErrors.addressPincodeZip}</Text>}
                </View>
              </>
            )}
          </View>

          {/* Documents Section */}
          <Text style={[styles.sectionTitle, { fontSize: ms(18), marginBottom: vscale(16) }]}>
            Submitted Documents
          </Text>

          <View style={[styles.card, { padding: spacing(16), borderRadius: scale(16) }]}>
            {/* Government ID */}
            <View style={[styles.docSection, { marginBottom: vscale(16) }]}>
              <View style={styles.docHeader}>
                <Text style={[styles.docLabel, { fontSize: ms(14) }]}>Government ID</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusBadgeColor, paddingHorizontal: spacing(8), paddingVertical: vscale(4), borderRadius: scale(4) }]}>
                  <Text style={[styles.statusText, { fontSize: ms(10), color: statusTextColor }]}>{statusText}</Text>
                </View>
              </View>

              {governmentIdUrl ? (
                <Image
                  source={{ uri: governmentIdUrl }}
                  style={[styles.docImage, { height: vscale(150), marginTop: vscale(10), borderRadius: scale(8) }]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.placeholderImage, { height: vscale(100), marginTop: vscale(10), borderRadius: scale(8) }]}>
                  <Icon name="image-off" size={40} color="#999" />
                  <Text style={{ fontSize: ms(12), color: '#999', marginTop: vscale(8) }}>No document uploaded</Text>
                </View>
              )}

              {isRejected && (
                <TouchableOpacity
                  style={[styles.updateDocButton, { marginTop: vscale(12), padding: spacing(12), borderRadius: scale(8), borderWidth: 1 }]}
                  onPress={handleUploadGovernmentId}
                  disabled={saving}
                >
                  <Icon name="upload" size={20} color="#DC5C69" />
                  <Text style={[styles.updateDocText, { fontSize: ms(14), marginLeft: spacing(8), color: '#DC5C69' }]}>
                    {governmentIdImage ? 'Change Government ID' : 'Upload New Government ID'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Selfie */}
            <View style={styles.docSection}>
              <View style={styles.docHeader}>
                <Text style={[styles.docLabel, { fontSize: ms(14) }]}>Selfie</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusBadgeColor, paddingHorizontal: spacing(8), paddingVertical: vscale(4), borderRadius: scale(4) }]}>
                  <Text style={[styles.statusText, { fontSize: ms(10), color: statusTextColor }]}>{statusText}</Text>
                </View>
              </View>

              {selfieUrl ? (
                <Image
                  source={{ uri: selfieUrl }}
                  style={[styles.docImage, { height: vscale(150), marginTop: vscale(10), borderRadius: scale(8) }]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.placeholderImage, { height: vscale(100), marginTop: vscale(10), borderRadius: scale(8) }]}>
                  <Icon name="image-off" size={40} color="#999" />
                  <Text style={{ fontSize: ms(12), color: '#999', marginTop: vscale(8) }}>No selfie uploaded</Text>
                </View>
              )}

              {isRejected && (
                <TouchableOpacity
                  style={[styles.updateDocButton, { marginTop: vscale(12), padding: spacing(12), borderRadius: scale(8), borderWidth: 1 }]}
                  onPress={handleCaptureSelfie}
                  disabled={saving}
                >
                  <Icon name="camera" size={20} color="#DC5C69" />
                  <Text style={[styles.updateDocText, { fontSize: ms(14), marginLeft: spacing(8), color: '#DC5C69' }]}>
                    {selfieImage ? 'Retake Selfie' : 'Capture New Selfie'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Save Button - Only when rejected */}
          {isRejected && (
            <View style={{ marginTop: vscale(24), marginBottom: vscale(30) }}>
              <Button
                title="Save Changes & Resubmit"
                onPress={handleSaveChanges}
                variant="gradient"
                fullWidth
                loading={saving}
                disabled={saving}
                icon={<Icon name="content-save-outline" size={20} color="#FFFFFF" />}
              />
            </View>
          )}
        </ScrollView>

        {/* Success Modal */}
        <Modal
          visible={showSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSuccessModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { padding: spacing(24), borderRadius: scale(20), width: '85%' }]}>
              <View style={[styles.successIconContainer, { width: scale(70), height: scale(70), borderRadius: scale(35), marginBottom: vscale(16) }]}>
                <Icon name="check-circle" size={scale(40)} color="#FFFFFF" />
              </View>
              
              <Text style={[styles.modalTitle, { fontSize: ms(20), marginBottom: vscale(8) }]}>
                Resubmitted Successfully!
              </Text>
              
              <Text style={[styles.modalMessage, { fontSize: ms(14), marginBottom: vscale(24) }]}>
                Your application has been updated and resubmitted for review.
              </Text>

              <TouchableOpacity
                style={[styles.okButton, { paddingVertical: vscale(14), paddingHorizontal: spacing(32), borderRadius: scale(25) }]}
                onPress={() => {
                  setShowSuccessModal(false);
                  fetchDetails();
                  navigation.navigate('MainApp', { screen: 'HomeTab' });
                }}
              >
                <Text style={[styles.okButtonText, { fontSize: ms(16) }]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTitle: {
    fontWeight: '700',
  },
  statusMessage: {
    fontWeight: '400',
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#1A1A1A',
  },
  card: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  inputLabel: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    color: '#2C3E50',
  },
  errorText: {
    fontSize: 12,
    color: '#DC5C69',
    marginTop: 4,
    fontWeight: '500',
  },
  genderButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    alignItems: 'center',
  },
  genderButtonSelected: {
    backgroundColor: '#DC5C69',
    borderColor: '#DC5C69',
  },
  genderButtonText: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  genderButtonTextSelected: {
    color: '#FFFFFF',
  },
  docSection: {
    backgroundColor: '#FFFFFF',
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docLabel: {
    fontWeight: '600',
    color: '#1A1A1A',
  },
  statusBadge: {
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  statusText: {
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  docImage: {
    width: '100%',
    backgroundColor: '#F0F0F0',
  },
  placeholderImage: {
    width: '100%',
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateDocButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderColor: '#DC5C69',
    borderStyle: 'dashed',
  },
  updateDocText: {
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  successIconContainer: {
    backgroundColor: '#28C76F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  modalMessage: {
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  okButton: {
    backgroundColor: '#DC5C69',
    alignItems: 'center',
    justifyContent: 'center',
  },
  okButtonText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});

export default DocumentDetailsScreen;

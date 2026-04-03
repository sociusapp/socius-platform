import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import Button from '../../components/common/Button';
import Header from '../../components/common/Header';
import { useResponsive } from '../../utils/responsive';
import { submitVerificationDocuments } from '../../services/api/verification.api';
import { loadAuth } from '../../services/storage/asyncStorage.service';

const IdentityVerificationScreen = ({ navigation }) => {
  const { contentWidth, titleFont, subtitleFont, bodyFont, smallFont, isTablet, scale, vscale, spacing } = useResponsive();
  const [governmentIDUploaded, setGovernmentIDUploaded] = useState(false);
  const [governmentIDImage, setGovernmentIDImage] = useState(null);
  const [selfieUploaded, setSelfieUploaded] = useState(false);
  const [selfieImage, setSelfieImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cropModalVisible, setCropModalVisible] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [croppingTarget, setCroppingTarget] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  const openCropModal = (uri, target) => {
    setImageToCrop(uri);
    setCroppingTarget(target);
    setCropModalVisible(true);
  };

  const handleCancelCrop = () => {
    setCropModalVisible(false);
    setImageToCrop(null);
    setCroppingTarget(null);
    setIsCropping(false);
  };

  const handleConfirmCrop = () => {
    if (!imageToCrop || !croppingTarget) {
      return;
    }
    setIsCropping(true);
    Image.getSize(
      imageToCrop,
      async (width, height) => {
        try {
          const size = Math.min(width, height);
          const originX = (width - size) / 2;
          const originY = (height - size) / 2;
          const result = await ImageManipulator.manipulateAsync(
            imageToCrop,
            [{ crop: { originX, originY, width: size, height: size } }],
            { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
          );
          if (croppingTarget === 'governmentId') {
            setGovernmentIDImage(result.uri);
            setGovernmentIDUploaded(true);
          } else if (croppingTarget === 'selfie') {
            setSelfieImage(result.uri);
            setSelfieUploaded(true);
          }
          setCropModalVisible(false);
          setImageToCrop(null);
          setCroppingTarget(null);
        } catch (error) {
          console.log('Crop error:', error);
          setTimeout(() => {
            Alert.alert('Error', 'Failed to crop image');
          }, 100);
        } finally {
          setIsCropping(false);
        }
      },
      () => {
        setIsCropping(false);
        setTimeout(() => {
          Alert.alert('Error', 'Failed to get image size');
        }, 100);
      }
    );
  };

  // Handle Document Upload (Gallery)
  const handleUploadDocument = async () => {
    try {
      // Request permission first to avoid "lateinit property imageLibraryLauncher has not been initialized" error
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library permission is required to upload a document.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setGovernmentIDImage(result.assets[0].uri);
        setGovernmentIDUploaded(true);
        console.log('Government ID uploaded:', result.assets[0].uri);
      }
    } catch (error) {
      console.log('Document pick error:', error);
      // Only show alert if still mounted and attached to activity
      setTimeout(() => {
        Alert.alert('Error', 'Failed to pick document');
      }, 100);
    }
  };

  // Handle Take Selfie (Camera)
  const handleTakeSelfie = async () => {
    try {
      if (!permission?.granted) {
        const { granted } = await requestPermission();
        if (!granted) {
          setTimeout(() => {
            Alert.alert('Camera Permission', 'Camera permission is required to take a selfie');
          }, 100);
          return;
        }
      }
      setShowCamera(true);
    } catch (error) {
      console.log('Camera error:', error);
      setTimeout(() => {
        Alert.alert('Error', 'Failed to access camera');
      }, 100);
    }
  };

  // Capture Selfie
  const handleCaptureSelfie = async () => {
    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: false,
        });
        if (photo && photo.uri) {
          setSelfieImage(photo.uri);
          setSelfieUploaded(true);
          setShowCamera(false);
          console.log('Selfie captured:', photo.uri);
        }
      }
    } catch (error) {
      console.log('Capture error:', error);
      setTimeout(() => {
        Alert.alert('Error', 'Failed to capture selfie');
      }, 100);
    }
  };

  // Cancel Camera
  const handleCancelCamera = () => {
    setShowCamera(false);
  };

  // Remove Government ID
  const handleRemoveGovernmentID = () => {
    setGovernmentIDImage(null);
    setGovernmentIDUploaded(false);
  };

  // Remove Selfie
  const handleRemoveSelfie = () => {
    setSelfieImage(null);
    setSelfieUploaded(false);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitForReview = async () => {
    console.log('[IdentityVerification] handleSubmitForReview clicked');
    if (!governmentIDUploaded || !selfieUploaded) {
      console.log('[IdentityVerification] Validation failed: missing documents');
      Alert.alert('Required', 'Please upload both government ID and a selfie.');
      return;
    }

    try {
      setIsSubmitting(true);
      const { accessToken } = await loadAuth();
      if (!accessToken) {
        console.log('[IdentityVerification] No token found');
        Alert.alert('Session expired', 'Please login again to continue.');
        setIsSubmitting(false);
        return;
      }

      console.log('[IdentityVerification] Submitting documents...');
      const result = await submitVerificationDocuments(accessToken, {
        governmentIdUri: governmentIDImage,
        selfieUri: selfieImage,
      });

      console.log('[IdentityVerification] API response:', result);

      if (!result?.success) {
        const message =
          result?.message || 'Failed to submit documents for review.';
        console.log('[IdentityVerification] API error:', message);
        Alert.alert('Error', message);
        setIsSubmitting(false);
        return;
      }

      console.log('[IdentityVerification] Success! Navigating to BeforeContinue');
      navigation.navigate('BeforeContinue');
    } catch (error) {
      console.log('[IdentityVerification] Catch error:', error);
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message;
      const message =
        apiMessage || 'Something went wrong while submitting documents.';
      console.log('[IdentityVerification] Error message to display:', message);
      Alert.alert('Error', message);
      setIsSubmitting(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="front"
          ref={cameraRef}
        />
        <View style={[styles.cameraOverlay, { paddingBottom: vscale(40) }]}>
          <TouchableOpacity
            style={[styles.closeCameraButton, { top: vscale(40), left: spacing(20), width: scale(44), height: scale(44), borderRadius: scale(22) }]}
            onPress={handleCancelCamera}
          >
            <Icon name="close" size={scale(30)} color="#FFF" />
          </TouchableOpacity>

          <View style={[styles.selfieGuide, { width: scale(250), height: scale(350), borderRadius: scale(125), borderWidth: scale(2) }]} />

          <TouchableOpacity
            style={[styles.captureButton, { bottom: vscale(40), width: scale(70), height: scale(70), borderRadius: scale(35), borderWidth: scale(5) }]}
            onPress={handleCaptureSelfie}
          >
            <View style={[styles.captureButtonInner, { width: scale(54), height: scale(54), borderRadius: scale(27) }]} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title=""
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: 0 }}
      />

      <Modal
        visible={cropModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancelCrop}
      >
        <View style={styles.cropModalContainer}>
          <View style={styles.cropModalContent}>
            {imageToCrop ? (
              <View style={styles.cropImageContainer}>
                <Image
                  source={{ uri: imageToCrop }}
                  style={styles.cropImage}
                  resizeMode="contain"
                />
                <View style={styles.cropSquareOverlay} />
              </View>
            ) : null}
            <View style={styles.cropButtonsRow}>
              <TouchableOpacity
                style={styles.cropCancelButton}
                onPress={handleCancelCrop}
                disabled={isCropping}
              >
                <Text style={styles.cropCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cropConfirmButton}
                onPress={handleConfirmCrop}
                disabled={isCropping}
              >
                <Text style={styles.cropConfirmText}>{isCropping ? 'Cropping...' : 'Crop'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: spacing(20), paddingTop: vscale(10), paddingBottom: vscale(130) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          {/* Main Card */}
          <View style={[styles.mainCard, {
            paddingVertical: vscale(30),
            paddingHorizontal: spacing(20),
            borderRadius: scale(32),
            borderWidth: scale(1),
            shadowOffset: { width: 0, height: vscale(4) },
            shadowRadius: scale(12),
            elevation: scale(5)
          }]}>
            <View style={[styles.headerSection, { marginBottom: vscale(24) }]}>
              <Text style={[styles.title, { fontSize: titleFont(24), marginBottom: vscale(12) }]}>Verify your identity</Text>
              <Text style={[styles.subtitle, { fontSize: subtitleFont(15), lineHeight: subtitleFont(22) }]}>This helps keep Socius safe and trusted for everyone.</Text>
            </View>

            {/* Verification Steps */}
            <View style={[styles.stepsContainer, { gap: vscale(16) }]}>
              {/* Government ID Card */}
              <View style={[
                styles.stepCard,
                { padding: spacing(16), borderRadius: scale(24), borderWidth: scale(1), borderColor: '#F1F3F5', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 }
              ]}>
                <View style={[styles.stepHeader, { marginBottom: vscale(16) }]}>
                  <View style={[
                    styles.stepIconContainer,
                    { width: scale(56), height: scale(44), borderRadius: scale(8), marginRight: spacing(14), backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E8EAED' }
                  ]}>
                    <Icon name="account-card-outline" size={scale(32)} color="#4A5568" />
                  </View>
                  <View style={styles.stepTitleContainer}>
                    <Text style={[styles.stepTitle, { fontSize: subtitleFont(16), fontWeight: '700', color: '#2D3748' }]}>Government ID</Text>
                    <Text style={[styles.stepStatus, { fontSize: smallFont(12), color: '#718096', marginTop: vscale(2) }]}>Aadhaar, Passport, Driving License, or Voter ID</Text>
                  </View>
                </View>

                {governmentIDUploaded && governmentIDImage ? (
                  <View style={[styles.previewCard, { borderRadius: scale(16), marginBottom: vscale(12), padding: spacing(10), borderWidth: scale(1) }]}>
                    <Image
                      source={{ uri: governmentIDImage }}
                      style={[styles.previewImage, { height: vscale(160), borderRadius: scale(12) }]}
                      resizeMode="cover"
                    />
                    <View style={[styles.previewActions, { marginTop: vscale(10) }]}>
                      <TouchableOpacity onPress={handleRemoveGovernmentID} style={[styles.previewActionButton, { paddingVertical: vscale(8), paddingHorizontal: spacing(12), borderRadius: scale(20), borderWidth: scale(1) }]}>
                        <Text style={[styles.previewActionText, { fontSize: smallFont(13) }]}>Remove</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleUploadDocument} style={[styles.previewPrimaryButton, { paddingVertical: vscale(8), paddingHorizontal: spacing(12), borderRadius: scale(20) }]}>
                        <Text style={[styles.previewPrimaryText, { fontSize: smallFont(13) }]}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.actionButton, {
                    paddingVertical: vscale(12),
                    borderRadius: scale(25),
                    backgroundColor: '#E85555',
                    borderWidth: 0,
                    shadowColor: '#E85555',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 4
                  }]}
                  onPress={handleUploadDocument}
                >
                  <Text style={[styles.actionButtonText, { fontSize: bodyFont(16), color: '#FFFFFF', fontWeight: '600' }]}>
                    {governmentIDUploaded ? 'Change document' : 'Upload document'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Selfie Card */}
              <View style={[
                styles.stepCard,
                { padding: spacing(16), borderRadius: scale(24), borderWidth: scale(1), borderColor: '#F1F3F5', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 }
              ]}>
                <View style={[styles.stepHeader, { marginBottom: vscale(16) }]}>
                  <View style={[
                    styles.stepIconContainer,
                    { width: scale(56), height: scale(44), borderRadius: scale(8), marginRight: spacing(14), backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E8EAED' }
                  ]}>
                    <Icon name="camera-outline" size={scale(32)} color="#4A5568" />
                  </View>
                  <View style={styles.stepTitleContainer}>
                    <Text style={[styles.stepTitle, { fontSize: subtitleFont(16), fontWeight: '700', color: '#2D3748' }]}>Selfie verification</Text>
                    <Text style={[styles.stepStatus, { fontSize: smallFont(12), color: '#718096', marginTop: vscale(2) }]}>Used only to confirm identity</Text>
                  </View>
                </View>

                {selfieUploaded && selfieImage ? (
                  <View style={[styles.previewCard, { borderRadius: scale(16), marginBottom: vscale(12), padding: spacing(10), borderWidth: scale(1) }]}>
                    <Image
                      source={{ uri: selfieImage }}
                      style={[styles.previewImage, { height: vscale(160), borderRadius: scale(12) }]}
                      resizeMode="cover"
                    />
                    <View style={[styles.previewActions, { marginTop: vscale(10) }]}>
                      <TouchableOpacity onPress={handleRemoveSelfie} style={[styles.previewActionButton, { paddingVertical: vscale(8), paddingHorizontal: spacing(12), borderRadius: scale(20), borderWidth: scale(1) }]}>
                        <Text style={[styles.previewActionText, { fontSize: smallFont(13) }]}>Remove</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleTakeSelfie} style={[styles.previewPrimaryButton, { paddingVertical: vscale(8), paddingHorizontal: spacing(12), borderRadius: scale(20) }]}>
                        <Text style={[styles.previewPrimaryText, { fontSize: smallFont(13) }]}>Retake</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.actionButton, {
                    paddingVertical: vscale(12),
                    borderRadius: scale(25),
                    backgroundColor: '#E85555',
                    borderWidth: 0,
                    shadowColor: '#E85555',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 4
                  }]}
                  onPress={handleTakeSelfie}
                >
                  <Text style={[styles.actionButtonText, { fontSize: bodyFont(16), color: '#FFFFFF', fontWeight: '600' }]}>
                    {selfieUploaded ? 'Retake selfie' : 'Take selfie'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Privacy Note with Separator Line */}
            <View style={{ marginTop: vscale(30) }}>
              <View style={{ height: 1, backgroundColor: '#F1F3F5', width: '100%', marginBottom: vscale(20) }} />
              <Text style={[styles.privacyText, { fontSize: smallFont(13), lineHeight: smallFont(20), color: '#718096', textAlign: 'center', paddingHorizontal: spacing(10) }]}>
                Your documents are securely stored and reviewed only for verification purposes.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Button Footer */}
      <View style={[styles.footer, { paddingHorizontal: spacing(20), paddingVertical: vscale(12), paddingBottom: vscale(24), borderTopWidth: 0 }]}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <Button
            title="Submit for Review"
            onPress={handleSubmitForReview}
            fullWidth
            loading={isSubmitting}
            disabled={isSubmitting || !governmentIDUploaded || !selfieUploaded}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  scrollContent: {
    flexGrow: 1,
  },

  // ===== CAMERA SCREEN =====
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },

  camera: {
    flex: 1,
  },

  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeCameraButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  selfieGuide: {
    borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'transparent',
  },

  captureButton: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#FFFFFF',
  },

  captureButtonInner: {
    backgroundColor: '#FFFFFF',
  },

  mainCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F3F5',
    shadowColor: '#000',
    shadowOpacity: 0.08,
  },

  headerSection: {
    alignItems: 'center',
  },

  title: {
    fontFamily: 'Outfit-Bold',
    color: '#2C3E50',
    textAlign: 'center',
  },

  subtitle: {
    fontFamily: 'Outfit-Regular',
    color: '#666666',
    textAlign: 'center',
  },

  // ===== STEPS CONTAINER =====
  stepsContainer: {
    width: '100%',
  },

  stepCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F3F5',
  },

  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  stepIconContainer: {
    backgroundColor: '#FFF5F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  stepTitleContainer: {
    flex: 1,
  },

  stepTitle: {
    fontFamily: 'Outfit-SemiBold',
    color: '#2C3E50',
  },

  stepStatus: {
    fontFamily: 'Outfit-Medium',
    color: '#9CA3AF',
  },

  previewCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
  },
  previewImage: {
    width: '100%',
    backgroundColor: '#F5F7FA',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  previewActionButton: {
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  previewActionText: {
    color: '#2D3748',
    fontFamily: 'Outfit-SemiBold',
  },
  previewPrimaryButton: {
    backgroundColor: '#E85555',
  },
  previewPrimaryText: {
    color: '#FFFFFF',
    fontFamily: 'Outfit-SemiBold',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F6',
    borderWidth: 1,
    borderColor: '#E85555',
    borderStyle: 'dashed',
  },

  actionButtonText: {
    fontFamily: 'Outfit-SemiBold',
    color: '#E85555',
  },

  privacyNote: {
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },

  privacyText: {
    fontFamily: 'Outfit-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
  },
  cropModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropModalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
  },
  cropImageContainer: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#000000',
  },
  cropImage: {
    width: '100%',
    height: '100%',
  },
  cropSquareOverlay: {
    position: 'absolute',
    width: '80%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  cropButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cropCancelButton: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cropConfirmButton: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#E85555',
    alignItems: 'center',
  },
  cropCancelText: {
    fontFamily: 'Outfit-SemiBold',
    color: '#2D3748',
  },
  cropConfirmText: {
    fontFamily: 'Outfit-SemiBold',
    color: '#FFFFFF',
  },
});

export default IdentityVerificationScreen;

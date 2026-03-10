import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive.js';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from '../../components/common/Button';
import Header from '../../components/common/Header';
import * as ImagePicker from 'expo-image-picker';
import { submitVerificationDocuments } from '../../services/api/verification.api';
import { loadAuth } from '../../services/storage/asyncStorage.service';

const SelfieVerificationScreen = ({ navigation }) => {
  const [photoTaken, setPhotoTaken] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { width, contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const camW = Math.max(scale(240), Math.min(scale(340), Math.floor(width * 0.6)));
  const camH = Math.round(camW * 1.285);
  const camRadius = Math.round(camW * 0.5);

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Permission', 'Camera permission is required to take a selfie.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
        setPhotoTaken(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open camera.');
    }
  };

  const handleContinue = async () => {
    if (!photoTaken || !photoUri) {
      Alert.alert('Required', 'Please take a selfie before continuing.');
      return;
    }

    try {
      setIsSubmitting(true);
      const { accessToken } = await loadAuth();
      if (!accessToken) {
        Alert.alert('Session expired', 'Please login again to continue.');
        return;
      }

      const result = await submitVerificationDocuments(accessToken, {
        governmentIdUri: null,
        selfieUri: photoUri,
      });

      if (!result?.success) {
        const message =
          result?.message || 'Failed to submit selfie for verification.';
        Alert.alert('Error', message);
        return;
      }

      navigation.navigate('BeforeContinue');
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message;
      const message =
        apiMessage || 'Something went wrong while submitting selfie.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title=""
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: 0 }}
      />

      <View style={[styles.content, { alignItems: 'center', paddingHorizontal: spacing(16), paddingBottom: vscale(40) }]}>
        <View style={{ width: contentWidth }}>
          <Text style={[styles.title, { fontSize: ms(24), lineHeight: ms(32), marginBottom: vscale(16) }]}>Take a selfie</Text>
          <Text style={[styles.subtitle, { fontSize: ms(16), lineHeight: ms(24), marginBottom: vscale(40) }]}>To match your ID.</Text>

          <View style={[styles.cameraContainer, {
            width: camW,
            height: camH,
            borderRadius: camRadius,
            marginBottom: vscale(40),
            marginTop: vscale(24),
            borderWidth: scale(2)
          }]}>
            {photoTaken && photoUri ? (
              <View style={styles.photoPlaceholder}>
                <Image
                  source={{ uri: photoUri }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                <View
                  style={[
                    styles.checkBadge,
                    {
                      bottom: vscale(20),
                      right: spacing(40),
                      width: scale(40),
                      height: scale(40),
                      borderRadius: scale(20),
                      borderWidth: scale(3),
                      shadowOffset: { width: 0, height: vscale(2) },
                      shadowRadius: scale(6),
                      elevation: scale(4),
                    },
                  ]}
                >
                  <Icon name="check" size={scale(24)} color="#FFFFFF" />
                </View>
              </View>
            ) : (
              <View style={styles.cameraPlaceholder}>
                <Icon name="camera-outline" size={scale(64)} color="#757575" />
              </View>
            )}
          </View>

          <Text style={[styles.instruction, { fontSize: ms(14), lineHeight: ms(20), paddingHorizontal: spacing(16) }]}>Make sure your face is clearly visible and well-lit.</Text>

          <View style={styles.spacer} />

          <Button
            title={photoTaken ? "Continue" : "Take Photo"}
            onPress={photoTaken ? handleContinue : handleTakePhoto}
            fullWidth
            size="large"
            variant={photoTaken ? "primary" : "outline"}
            loading={isSubmitting}
            disabled={isSubmitting}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    fontFamily: 'System',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  subtitle: {
    fontWeight: '400',
    fontFamily: 'System',
    color: '#757575',
    textAlign: 'center',
  },
  cameraContainer: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
  },
  instruction: {
    fontWeight: '400',
    fontFamily: 'System',
    color: '#757575',
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
  },
});

export default SelfieVerificationScreen;

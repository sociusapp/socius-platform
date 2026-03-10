import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import { useResponsive } from '../../utils/responsive';

const RequestReviewScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale, isTablet } = useResponsive();
  const [explanation, setExplanation] = useState('');
  const [documentUploaded, setDocumentUploaded] = useState(false);
  const [selfieUploaded, setSelfieUploaded] = useState(false);

  const handleUploadDocument = () => {
    setDocumentUploaded(true);
  };

  const handleUploadSelfie = () => {
    setSelfieUploaded(true);
  };

  const handleSubmitReview = () => {
    navigation.navigate('ReviewSubmitted');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />
      
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: spacing(20), paddingTop: vscale(20), paddingBottom: vscale(40) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          {/* Info Text */}
          <Text style={[styles.infoText, { fontSize: ms(16), marginBottom: vscale(12), lineHeight: ms(24) }]}>
            Your account is currently limited or under review.
          </Text>
          
          <Text style={[styles.infoText, { fontSize: ms(16), marginBottom: vscale(24), lineHeight: ms(24) }]}>
            If you believe this is a mistake, you may request a review.
          </Text>

          {/* Explanation TextInput */}
          <View style={[styles.fieldGroup, { marginBottom: vscale(12) }]}>
            <TextInput
              style={[styles.textInput, { minHeight: vscale(150), padding: spacing(16), borderRadius: scale(12), fontSize: ms(16) }]}
              placeholder="Explain your request (optional)"
              placeholderTextColor="#AAAAAA"
              value={explanation}
              onChangeText={setExplanation}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Info Text */}
          <Text style={[styles.warningText, { fontSize: ms(14), marginBottom: vscale(32), color: '#666666' }]}>
            Please keep your explanation factual and respectful.
          </Text>

          {/* Optional Supporting Documents */}
          <Text style={[styles.sectionTitle, { fontSize: ms(16), fontWeight: '700', marginBottom: vscale(16) }]}>Optional supporting documents</Text>

          {/* Upload Buttons */}
          <View style={[styles.uploadContainer, { gap: spacing(12), marginBottom: vscale(16) }]}>
            <Button
              title={documentUploaded ? "✓ Document Uploaded" : "Upload updated document"}
              onPress={handleUploadDocument}
              variant="outline"
              icon={<Icon name="file-document-outline" size={scale(20)} color="#2C3E50" />}
              fullWidth
            />

            <Button
              title={selfieUploaded ? "✓ Selfie Uploaded" : "Upload recent selfie"}
              onPress={handleUploadSelfie}
              variant="outline"
              icon={<Icon name="camera-outline" size={scale(20)} color="#2C3E50" />}
              fullWidth
            />
          </View>

          {/* Info Text */}
          <Text style={[styles.infoSubText, { fontSize: ms(14), marginBottom: vscale(32), color: '#888888' }]}>
            These help us verify your account details.
          </Text>

          {/* Important Notice */}
          <View style={[styles.noticeCard, { padding: spacing(16), borderRadius: scale(12), backgroundColor: '#F8F9FA', marginBottom: vscale(32) }]}>
            <Text style={[styles.noticeText, { fontSize: ms(14), lineHeight: ms(20), color: '#444444' }]}>
              Reviews are handled by humans and may take some time. You'll be notified once a decision is made.
            </Text>
          </View>

          {/* Submit Button */}
          <Button
            title="Submit Review Request"
            onPress={handleSubmitReview}
            fullWidth
            disabled={explanation.length < 10 && !documentUploaded && !selfieUploaded}
          />
        </View>
      </ScrollView>
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

  // ===== INFO TEXT =====
  infoText: {
    fontWeight: '400',
    color: '#555555',
    textAlign: 'center',
  },

  // ===== TEXT INPUT FIELD =====
  fieldGroup: {
  },

  textInput: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E8EAED',
    fontWeight: '400',
    color: '#2C3E50',
    textAlignVertical: 'top',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },

  // ===== WARNING TEXT =====
  warningText: {
    fontWeight: '400',
    color: '#888888',
    textAlign: 'left',
  },

  // ===== SECTION TITLE =====
  sectionTitle: {
    color: '#2C3E50',
  },

  // ===== UPLOAD BUTTONS =====
  uploadContainer: {
    flexDirection: 'row',
  },

  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    borderColor: '#E8EAED',
  },

  uploadButtonText: {
    fontWeight: '500',
    color: '#2C3E50',
    textAlign: 'center',
  },

  // ===== INFO SUB TEXT =====
  infoSubText: {
    fontWeight: '400',
    color: '#888888',
    textAlign: 'left',
  },

  // ===== NOTICE CARD =====
  noticeCard: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },

  noticeText: {
    fontWeight: '400',
    color: '#555555',
    textAlign: 'left',
  },

  // ===== SUBMIT BUTTON =====
  submitButton: {
    borderRadius: 26,
    backgroundColor: '#DC5C69',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC5C69',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    elevation: 6,
  },

  submitButtonText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ===== DISCLAIMER TEXT =====
  disclaimerText: {
    fontWeight: '400',
    color: '#888888',
    textAlign: 'center',
  },
});

export default RequestReviewScreen;

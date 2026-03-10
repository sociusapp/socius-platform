import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Button from '../../components/common/Button';
import { getVerificationStatus } from '../../services/api/verification.api';
import { loadAuth } from '../../services/storage/asyncStorage.service';

const VerificationReviewScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const { accessToken } = await loadAuth();
        if (!accessToken) {
          setLoading(false);
          return;
        }
        const result = await getVerificationStatus(accessToken);
        if (result && result.success && result.data?.status) {
          setStatus(result.data.status);
        } else if (result?.data?.status) {
          setStatus(result.data.status);
        }
      } catch (error) {
        const apiMessage =
          error?.response?.data?.message ||
          error?.response?.data?.errors?.[0]?.message;
        const message =
          apiMessage || 'Failed to load verification status.';
        Alert.alert('Error', message);
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, []);

  const handleDone = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: spacing(20), justifyContent: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth, alignItems: 'center' }}>
          <View style={[styles.iconContainer, { width: scale(100), height: scale(100), borderRadius: scale(50), marginBottom: vscale(32), borderWidth: scale(1) }]}>
            <Icon name="clock-outline" size={scale(50)} color="#DC5C69" />
          </View>

          <Text style={[styles.title, { fontSize: ms(26), lineHeight: ms(34), marginBottom: vscale(16) }]}>
            {status === 'approved'
              ? 'Verification Approved'
              : status === 'failed'
              ? 'Verification Rejected'
              : status === 'review_requested'
              ? 'Review Requested'
              : 'Verification in Review'}
          </Text>
          
          <Text style={[styles.description, { fontSize: ms(16), lineHeight: ms(24), marginBottom: vscale(40) }]}>
            {status === 'approved'
              ? 'Your identity has been verified. Thank you for helping keep Socius safe.'
              : status === 'failed'
              ? 'Your verification was rejected based on the documents submitted.'
              : status === 'review_requested'
              ? 'Your request for manual review has been received. Our team will take a look soon.'
              : "We're reviewing your information to ensure community safety. This usually takes less than 24 hours."}
          </Text>

          <View style={[styles.infoCard, { 
            padding: spacing(20), 
            borderRadius: scale(16), 
            marginBottom: vscale(32),
            borderWidth: scale(1),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(8),
            elevation: scale(3)
          }]}>
            <View style={[styles.infoRow, { marginBottom: vscale(16) }]}>
              <Icon name="check-circle" size={scale(20)} color="#4CAF50" style={{ marginRight: spacing(12) }} />
              <Text style={[styles.infoText, { fontSize: ms(15) }]}>Phone Verified</Text>
            </View>
            <View style={[styles.infoRow, { marginBottom: vscale(16) }]}>
              <Icon name="check-circle" size={scale(20)} color="#4CAF50" style={{ marginRight: spacing(12) }} />
              <Text style={[styles.infoText, { fontSize: ms(15) }]}>Profile Info Submitted</Text>
            </View>
            <View style={styles.infoRow}>
              <Icon
                name={
                  status === 'approved'
                    ? 'check-circle'
                    : status === 'failed'
                    ? 'alert-circle'
                    : 'clock'
                }
                size={scale(20)}
                color={
                  status === 'approved'
                    ? '#4CAF50'
                    : status === 'failed'
                    ? '#E53935'
                    : '#FF9800'
                }
                style={{ marginRight: spacing(12) }}
              />
              <Text style={[styles.infoText, { fontSize: ms(15) }]}>
                {status === 'approved'
                  ? 'ID & Selfie Verified'
                  : status === 'failed'
                  ? 'ID & Selfie Rejected'
                  : 'ID & Selfie Under Review'}
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#DC5C69" />
          ) : (
            <Button 
              title="Done" 
              onPress={handleDone}
              fullWidth
              size="large"
            />
          )}

          <Text style={[styles.footerText, { fontSize: ms(14), marginTop: vscale(24) }]}>
            We'll notify you once your account is ready.
          </Text>
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
  iconContainer: {
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#FFEAEA',
  },
  title: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  description: {
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderColor: '#E8EAED',
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontWeight: '500',
    color: '#2C3E50',
  },
  footerText: {
    fontWeight: '400',
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default VerificationReviewScreen;

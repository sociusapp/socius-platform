import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import Header from '../../components/common/Header';
import { getProfile } from '../../services/api/user.api';
import { getVerificationStatus } from '../../services/api/verification.api';
import { loadAuth } from '../../services/storage/asyncStorage.service';
import { baseURL as apiBaseURL } from '../../services/api/client';

const DocumentDetailsScreen = ({ navigation }) => {
  const { ms, spacing, vscale, scale } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [verification, setVerification] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);

  useEffect(() => {
    fetchDetails();
  }, []);

  const toAbsoluteFileUrl = (filePath) => {
    if (!filePath) return null;
    const path = String(filePath);
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const apiRoot = apiBaseURL.replace(/\/api\/?$/, '');
    if (path.startsWith('/')) return `${apiRoot}${path}`;
    return `${apiRoot}/${path}`;
  };

  const extractFilePath = (value) => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return value.fileUrl || value.url || value.path || value.uri || null;
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
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message;
      Alert.alert('Error', apiMessage || 'Failed to load details. Showing empty details.');
    } finally {
      setLoading(false);
    }
  };

  const InfoRow = ({ label, value }) => (
    <View style={[styles.infoRow, { marginBottom: vscale(12) }]}>
      <Text style={[styles.label, { fontSize: ms(13) }]}>{label}</Text>
      <Text style={[styles.value, { fontSize: ms(15) }]}>{value || ''}</Text>
    </View>
  );

  const DocumentStatus = ({ label, status, imageUrl }) => (
    <View style={[styles.docContainer, { marginBottom: vscale(16), padding: spacing(12), borderRadius: scale(12) }]}>
      <View style={styles.docHeader}>
        <Text style={[styles.docLabel, { fontSize: ms(14) }]}>{label}</Text>
        <View style={[styles.statusBadge, { paddingHorizontal: spacing(8), paddingVertical: vscale(4), borderRadius: scale(4) }]}>
          <Text style={[styles.statusText, { fontSize: ms(10) }]}>{status || 'Submitted'}</Text>
        </View>
      </View>
      {imageUrl ? (
        <Image 
          source={{ uri: imageUrl }} 
          style={[styles.docImage, { height: vscale(150), marginTop: vscale(10), borderRadius: scale(8) }]} 
          resizeMode="cover" 
        />
      ) : (
        <View style={[styles.placeholderImage, { height: vscale(100), marginTop: vscale(10), borderRadius: scale(8) }]} />
      )}
    </View>
  );

  const statusText =
    verificationStatus === 'approved'
      ? 'Verified'
      : verificationStatus === 'failed'
      ? 'Rejected'
      : verificationStatus === 'not_submitted' || !verificationStatus
      ? 'Not available'
      : 'Under review';

  const selfieUrl = toAbsoluteFileUrl(
    extractFilePath(verification?.selfie) ||
      verification?.selfieUrl ||
      verification?.selfie_url
  );

  const governmentIdUrl = toAbsoluteFileUrl(
    extractFilePath(verification?.government_id) ||
      extractFilePath(verification?.governmentId) ||
      extractFilePath(verification?.governmentID) ||
      verification?.governmentIdUrl ||
      verification?.governmentIDUrl ||
      verification?.government_id_url
  );

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
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { padding: spacing(20) }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { fontSize: ms(18), marginBottom: vscale(16) }]}>Personal Information</Text>
        
        <View style={[styles.card, { padding: spacing(16), marginBottom: vscale(24), borderRadius: scale(16) }]}>
          <InfoRow label="Full Name" value={profile?.fullName} />
          <InfoRow label="Age" value={profile?.age ? `${profile.age} years` : ''} />
          <InfoRow label="Gender" value={profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : ''} />
          <InfoRow label="Address / Area" value={profile?.cityArea} />
        </View>

        <Text style={[styles.sectionTitle, { fontSize: ms(18), marginBottom: vscale(16) }]}>Submitted Documents</Text>
        
        <View style={[styles.card, { padding: spacing(16), borderRadius: scale(16) }]}>
          <DocumentStatus 
            label="Government ID" 
            status={statusText} 
            imageUrl={governmentIdUrl} 
          />
          <DocumentStatus 
            label="Selfie" 
            status={statusText} 
            imageUrl={selfieUrl} 
          />
        </View>

        <Text style={[styles.noteText, { fontSize: ms(12), marginTop: vscale(24), marginBottom: vscale(30) }]}>
          Your details are currently being reviewed by our team. This process usually takes 24-48 hours.
        </Text>
      </ScrollView>
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
  sectionTitle: {
    fontWeight: '700',
    color: '#1A1A1A',
  },
  card: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  infoRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  label: {
    color: '#666666',
    marginBottom: 4,
  },
  value: {
    fontWeight: '600',
    color: '#1A1A1A',
  },
  docContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
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
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  statusText: {
    color: '#DC5C69',
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
  noteText: {
    color: '#888888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default DocumentDetailsScreen;

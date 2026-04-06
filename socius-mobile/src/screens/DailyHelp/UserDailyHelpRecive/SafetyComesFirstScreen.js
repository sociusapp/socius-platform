import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../utils/responsive';
import Header from '../../../components/common/Header';
import { acceptHelpRequest } from '../../../services/api/incident.api';
import { loadAuth } from '../../../services/storage/asyncStorage.service';

const SafetyComesFirstScreen = ({ navigation, route }) => {
  const { requestId } = route.params || {};
  const { ms, scale, spacing, vscale } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  const handleAccept = async () => {
    if (!requestId) {
      Alert.alert('Error', 'Missing Request ID');
      return;
    }

    setLoading(true);
    try {
      const auth = await loadAuth();
      const token = auth?.accessToken;
      
      if (!token) {
        Alert.alert('Error', 'Session expired. Please sign in again.');
        return;
      }

      const response = await acceptHelpRequest(token, requestId);
      
      if (response?.success) {
        navigation.reset({
          index: 0,
          routes: [
            { 
              name: 'MatchingMap', 
              params: { 
                requestId,
                mode: 'helper'
              } 
            }
          ],
        });
      } else {
        Alert.alert('Error', response?.message || 'Failed to accept request');
      }
    } catch (error) {
      const msg = error?.response?.data?.message || 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const showAcceptConfirmation = () => {
    setConfirmModalVisible(true);
  };

  const handleNotAvailable = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainApp', { screen: 'HomeTab' });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={{ paddingTop: 40 }}>
        <Header 
          title="Socius" 
          onBackPress={handleNotAvailable}
          titleStyle={{ color: '#DC5C69', fontWeight: '700' }}
        />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { fontSize: ms(24), marginTop: vscale(20) }]}>
            Your Safety Comes First
          </Text>
          
          <Text style={[styles.subtitle, { fontSize: ms(14), marginTop: vscale(12) }]}>
            You are choosing to be aware — not required to act.
          </Text>

          <View style={styles.guidelines}>
            <View style={styles.guideItem}>
              <Text style={styles.guideText}>Do not intervene or confront anyone.</Text>
            </View>
            <View style={styles.guideDivider} />
            <View style={styles.guideItem}>
              <Text style={styles.guideText}>Leave immediately if you feel unsafe.</Text>
            </View>
            <View style={styles.guideDivider} />
            <View style={styles.guideItem}>
              <Text style={styles.guideText}>Contact authorities if the situation escalates.</Text>
            </View>
          </View>

          <View style={styles.pointsContainer}>
            {[
              { image: require('../../../assets/images/safety-3.png'), title: 'Observe Only', desc: 'Stay aware, keep distance.' },
              { image: require('../../../assets/images/safety-2.png'), title: 'Leave Anytime', desc: 'You can exit without explanation.' },
              { image: require('../../../assets/images/safety-1.png'), title: 'Call Authorities', desc: 'If anything feels unsafe.' },
            ].map((point, index) => (
              <View key={index} style={[styles.pointCard, { marginBottom: vscale(12) }]}>
                <View style={[styles.pointIconBg, { width: scale(56), height: scale(56), borderRadius: scale(28) }]}>
                  <Image source={point.image} style={{ width: scale(36), height: scale(36) }} resizeMode="contain" />
                </View>
                <View style={styles.pointText}>
                  <Text style={[styles.pointTitle, { fontSize: ms(16) }]}>{point.title}</Text>
                  <Text style={[styles.pointDesc, { fontSize: ms(14) }]}>{point.desc}</Text>
                </View>
              </View>
            ))}
          </View>
          {/* Spacer for scroll */}
          <View style={{ height: vscale(20) }} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => {
            console.log('Continue pressed');
            showAcceptConfirmation();
          }}
          style={[styles.continueBtn, { backgroundColor: loading ? '#E2E8F0' : '#D84D42' }]}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.continueBtnText}>
            {loading ? 'Processing...' : 'Continue'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => {
            console.log('Not Available pressed');
            handleNotAvailable();
          }}
          style={styles.notAvailableBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.notAvailableText}>I'm Not Available</Text>
        </TouchableOpacity>
      </View>

      {/* Accept Confirmation Modal */}
      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Icon name="hand-heart" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.modalTitle}>Accept Request?</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to help? You should be nearby and able to assist.
            </Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setConfirmModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalAcceptButton, loading && { opacity: 0.7 }]}
                onPress={() => {
                  setConfirmModalVisible(false);
                  handleAccept();
                }}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.modalAcceptText}>
                  {loading ? 'Processing...' : 'Accept'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  guidelines: {
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  guideItem: {
    paddingVertical: 8,
  },
  guideText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
  },
  guideDivider: {
    width: '80%',
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  pointsContainer: {
    marginTop: 30,
    width: '100%',
  },
  pointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  pointIconBg: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pointText: {
    flex: 1,
  },
  pointTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  pointDesc: {
    fontSize: 13,
    color: '#64748B',
  },
  footer: {
    padding: 24,
    paddingBottom: 34,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  continueBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    marginBottom: 12,
  },
  continueBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notAvailableBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
  },
  notAvailableText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D84D42',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#D84D42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  modalAcceptButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#D84D42',
    alignItems: 'center',
    shadowColor: '#D84D42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modalAcceptText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default SafetyComesFirstScreen;

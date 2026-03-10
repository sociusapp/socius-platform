import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../utils/responsive';
import { cancelPresenceRequest, getActivePresenceRequest } from '../../../services/api/incident.api';
import { loadAuth } from '../../../services/storage/asyncStorage.service';
import CustomAlert from '../../../components/common/CustomAlert';

const CANCEL_REASONS = {
  NO_HELPERS_NEARBY: 'no_helpers_nearby',
  NO_ONE_ACCEPTED: 'no_one_accepted',
  CHANGE_OF_PLANS: 'change_of_plans',
};

const AwarenessSharedScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [modalVisible, setModalVisible] = useState(false);
  
  // No Helpers Modal State
  const { initialNoHelpers } = route?.params || {};
  const [noHelpersModalVisible, setNoHelpersModalVisible] = useState(initialNoHelpers || false);
  
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS.NO_HELPERS_NEARBY);
  const [activeRequestId, setActiveRequestId] = useState(route?.params?.requestId);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

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

  useEffect(() => {
    if (initialNoHelpers) {
      setNoHelpersModalVisible(true);
    }
  }, [initialNoHelpers]);

  useEffect(() => {
    const fetchActiveRequest = async () => {
      try {
        const auth = await loadAuth();
        const token = auth?.accessToken;
        if (!token) return;

        const response = await getActivePresenceRequest(token);
        const data = response?.data || response;
        const requestId = data?._id || data?.id || data?.requestId || data?.request?._id || data?.presenceRequestId;
        
        if (requestId) {
          setActiveRequestId(requestId);
        }
      } catch (error) {
        // Silent fail or handle 404
      }
    };

    if (!activeRequestId) {
      fetchActiveRequest();
    }
  }, [activeRequestId]);

  const handleNoHelpersCancel = async () => {
    if (cancelSubmitting) return;
    try {
      setCancelSubmitting(true);
      const auth = await loadAuth();
      const token = auth?.accessToken;
      if (token && activeRequestId) {
        const response = await cancelPresenceRequest(token, activeRequestId, { reason: 'no_helpers_nearby' });
        if (response?.success) {
           setNoHelpersModalVisible(false);
           navigation.navigate('RequestClosed');
           return;
        }
      }
      setNoHelpersModalVisible(false);
      showAlert('Error', 'Failed to cancel request.', [{ text: 'OK', onPress: closeAlert }]);
    } catch (error) {
      setNoHelpersModalVisible(false);
      showAlert('Error', 'Failed to cancel request.', [{ text: 'OK', onPress: closeAlert }]);
    } finally {
      setCancelSubmitting(false);
    }
  };

  const handleEmergency = () => navigation.navigate('EmergencyHelp');
  
  const handleCancelPress = () => {
    setModalVisible(true);
  };

  const confirmCancel = async () => {
    if (cancelSubmitting) return;

    try {
      setCancelSubmitting(true);
      const auth = await loadAuth();
      const token = auth?.accessToken;

      if (!token) {
        showAlert('Not signed in', 'Please sign in again.', [{ text: 'OK', onPress: closeAlert }]);
        return;
      }

      if (!activeRequestId) {
        // If we still don't have an ID, try one last fetch or just navigate away
        // But for safety, let's just assume navigation if no ID found to avoid blocking user
        setModalVisible(false);
        navigation.navigate('RequestClosed');
        return;
      }

      const response = await cancelPresenceRequest(token, activeRequestId, { reason: cancelReason });
      
      if (response?.success) {
        setModalVisible(false);
        navigation.navigate('RequestClosed');
      } else {
        showAlert('Error', response?.message || 'Unable to cancel request.', [{ text: 'OK', onPress: closeAlert }]);
      }
    } catch (error) {
       if (error?.response?.status === 404) {
         setModalVisible(false);
         navigation.navigate('RequestClosed');
       } else {
         showAlert('Error', 'Something went wrong. Please try again.', [{ text: 'OK', onPress: closeAlert }]);
       }
    } finally {
      setCancelSubmitting(false);
    }
  };

  const keepActive = () => {
    setModalVisible(false);
  };

  const members = [
    { id: 1, name: 'Aman', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop' },
    { id: 2, name: 'Riya', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop' },
    { id: 3, name: 'Josh', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <Modal
        visible={noHelpersModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNoHelpersModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { paddingHorizontal: spacing(20), justifyContent: 'center', alignItems: 'center' }]}>
          <View style={[styles.modalContent, { 
            width: contentWidth,
            borderRadius: scale(20),
            padding: spacing(24),
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            shadowRadius: scale(8),
            elevation: scale(10)
          }]}>
            <View style={{ 
              width: scale(60), 
              height: scale(60), 
              borderRadius: scale(30),
              marginBottom: vscale(16),
              backgroundColor: '#FDF2F2',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Icon name="account-search-outline" size={scale(32)} color="#DC5C69" />
            </View>
            
            <Text style={{ 
              fontSize: ms(20), 
              fontWeight: '700', 
              color: '#1A1C1E', 
              textAlign: 'center', 
              marginBottom: vscale(12) 
            }}>
              No Helpers Found Nearby
            </Text>
            
            <Text style={{ 
              fontSize: ms(15), 
              lineHeight: ms(22), 
              color: '#42474E', 
              textAlign: 'center', 
              marginBottom: vscale(24) 
            }}>
              We couldn't find any available helpers within a 500m radius right now. Would you like to keep waiting or cancel the request?
            </Text>
            
            <View style={{ flexDirection: 'column', width: '100%', alignItems: 'center' }}>
              <TouchableOpacity 
                style={{ 
                  width: '100%', 
                  paddingVertical: vscale(12), 
                  borderRadius: scale(25), 
                  backgroundColor: '#DC5C69', 
                  alignItems: 'center',
                  marginBottom: vscale(12)
                }}
                onPress={handleNoHelpersCancel}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: ms(16) }}>{cancelSubmitting ? "Cancelling..." : "Cancel Request"}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ 
                  width: '100%', 
                  paddingVertical: vscale(12), 
                  borderRadius: scale(25), 
                  borderWidth: scale(1), 
                  borderColor: '#DC5C69', 
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF'
                }}
                onPress={() => setNoHelpersModalVisible(false)}
              >
                <Text style={{ color: '#DC5C69', fontWeight: '600', fontSize: ms(16) }}>Keep Waiting</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={keepActive}
      >
        <View style={[styles.modalOverlay, { paddingHorizontal: spacing(20) }]}>
          <View style={[styles.modalContent, { 
            width: contentWidth,
            borderRadius: scale(20),
            padding: spacing(24),
            shadowRadius: scale(8),
            elevation: scale(10)
          }]}>
            <Text style={[styles.modalTitle, { fontSize: ms(20), marginBottom: vscale(16) }]}>Cancel Request?</Text>
            
            <Text style={[styles.modalDescription, { fontSize: ms(15), lineHeight: vscale(22), marginBottom: vscale(24) }]}>
              Please select a reason for cancelling.
            </Text>

            <View style={{ width: '100%', marginBottom: vscale(16) }}>
                <TouchableOpacity
                  style={[
                    styles.reasonOption,
                    { borderRadius: scale(14), paddingVertical: vscale(12), paddingHorizontal: spacing(14), marginBottom: vscale(10) },
                    cancelReason === CANCEL_REASONS.NO_HELPERS_NEARBY && styles.reasonOptionSelected,
                  ]}
                  onPress={() => setCancelReason(CANCEL_REASONS.NO_HELPERS_NEARBY)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.reasonOptionText,
                      { fontSize: ms(14) },
                      cancelReason === CANCEL_REASONS.NO_HELPERS_NEARBY && styles.reasonOptionTextSelected,
                    ]}
                  >
                    No helpers nearby
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.reasonOption,
                    { borderRadius: scale(14), paddingVertical: vscale(12), paddingHorizontal: spacing(14), marginBottom: vscale(10) },
                    cancelReason === CANCEL_REASONS.NO_ONE_ACCEPTED && styles.reasonOptionSelected,
                  ]}
                  onPress={() => setCancelReason(CANCEL_REASONS.NO_ONE_ACCEPTED)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.reasonOptionText,
                      { fontSize: ms(14) },
                      cancelReason === CANCEL_REASONS.NO_ONE_ACCEPTED && styles.reasonOptionTextSelected,
                    ]}
                  >
                    No one accepted
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.reasonOption,
                    { borderRadius: scale(14), paddingVertical: vscale(12), paddingHorizontal: spacing(14) },
                    cancelReason === CANCEL_REASONS.CHANGE_OF_PLANS && styles.reasonOptionSelected,
                  ]}
                  onPress={() => setCancelReason(CANCEL_REASONS.CHANGE_OF_PLANS)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.reasonOptionText,
                      { fontSize: ms(14) },
                      cancelReason === CANCEL_REASONS.CHANGE_OF_PLANS && styles.reasonOptionTextSelected,
                    ]}
                  >
                    Change of plans
                  </Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.modalKeepButton, { 
                paddingVertical: vscale(14),
                borderRadius: scale(25),
                marginBottom: vscale(12),
                shadowRadius: scale(6),
                elevation: scale(4)
              }]} 
              onPress={keepActive}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalKeepButtonText, { fontSize: ms(16) }]}>Keep Request Active</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalCancelButton, { 
                paddingVertical: vscale(14),
                borderRadius: scale(25),
                borderWidth: scale(1),
                marginBottom: vscale(20),
                shadowRadius: scale(2),
                elevation: scale(1)
              }]} 
              onPress={confirmCancel}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalCancelButtonText, { fontSize: ms(16) }]}>Cancel Request</Text>
            </TouchableOpacity>

            <View style={[styles.modalDivider, { height: scale(1), marginBottom: vscale(16) }]} />
            
            <Text style={[styles.modalFooterText, { fontSize: ms(13) }]}>
              You can request awareness again anytime.
            </Text>
          </View>
        </View>
      </Modal>

      <View style={[styles.header, { paddingHorizontal: spacing(16), paddingVertical: vscale(12), borderBottomWidth: scale(1) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { padding: scale(4) }]}>
          <Icon name="arrow-left" size={scale(24)} color="#5A5A5A" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: ms(18) }]}>Socius</Text>
        <View style={[styles.headerRight, { width: scale(32) }]} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing(24), paddingTop: vscale(30), paddingBottom: vscale(40) }]} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentWidth, alignItems: 'center' }}>
          <View style={[styles.topContent, { marginBottom: vscale(24) }]}>
            <Text style={[styles.title, { fontSize: ms(24), marginBottom: vscale(8) }]}>Awareness Shared</Text>
            <Text style={[styles.subtitle, { fontSize: ms(15) }]}>People nearby may choose to stay aware.</Text>
          </View>

          <View style={[styles.statusCard, { 
            borderRadius: scale(16), 
            paddingVertical: vscale(20), 
            paddingHorizontal: spacing(16), 
            marginBottom: vscale(30),
            shadowRadius: scale(8),
            elevation: scale(3),
            borderWidth: scale(1)
          }]}>
            <Text style={[styles.statusCardTitle, { fontSize: ms(16), marginBottom: vscale(6) }]}>Some people nearby have seen this.</Text>
            <Text style={[styles.statusCardDesc, { fontSize: ms(14) }]}>They may or may not choose to come.</Text>
          </View>

          <View style={[styles.membersSection, { marginBottom: vscale(30) }]}>
            <View style={[styles.sectionHeader, { marginBottom: vscale(20) }]}>
              <View style={[styles.line, { height: scale(1) }]} />
              <Text style={[styles.sectionTitle, { fontSize: ms(14), marginHorizontal: spacing(12) }]}>Nearby community members</Text>
              <View style={[styles.line, { height: scale(1) }]} />
            </View>
            
            <View style={styles.membersRow}>
              {members.map((member) => (
                <View key={member.id} style={styles.memberItem}>
                  <View style={[styles.avatarContainer, { 
                    width: scale(70), 
                    height: scale(70), 
                    borderRadius: scale(35), 
                    marginBottom: vscale(8),
                    shadowRadius: scale(4),
                    elevation: scale(3),
                    borderWidth: scale(2)
                  }]}>
                    <Image 
                      source={{ uri: member.image }} 
                      style={styles.avatarImage} 
                      blurRadius={15}
                    />
                  </View>
                  <Text style={[styles.memberName, { fontSize: ms(14) }]}>{member.name}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.infoCard, { 
            borderRadius: scale(16), 
            paddingVertical: vscale(20), 
            paddingHorizontal: spacing(16), 
            marginBottom: vscale(30),
            borderWidth: scale(1),
            shadowRadius: scale(4),
            elevation: scale(2)
          }]}>
            <Text style={[styles.infoCardTitle, { fontSize: ms(15), marginBottom: vscale(6) }]}>You can cancel this at any time.</Text>
            <Text style={[styles.infoCardDesc, { fontSize: ms(14), lineHeight: vscale(20) }]}>
              You can also contact emergency services whenever needed.
            </Text>
          </View>

          <View style={[styles.actionButtons, { gap: vscale(12) }]}>
            <TouchableOpacity 
              style={[styles.cancelButton, { 
                height: vscale(52), 
                borderRadius: scale(26), 
                borderWidth: scale(1),
                shadowRadius: scale(4),
                elevation: scale(2)
              }]} 
              activeOpacity={0.8}
              onPress={handleCancelPress}
            >
              <Text style={[styles.cancelButtonText, { fontSize: ms(16) }]}>Cancel Awareness</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.emergencyButton, { 
                height: vscale(52), 
                borderRadius: scale(26), 
                borderWidth: scale(1),
                shadowRadius: scale(2),
                elevation: scale(1)
              }]} 
              activeOpacity={0.8}
              onPress={handleEmergency}
            >
              <Text style={[styles.emergencyButtonText, { fontSize: ms(16) }]}>Contact Emergency Services</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
  },
  headerTitle: {
    fontWeight: '600',
    color: '#333333',
  },
  headerRight: {
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
  },
  topContent: {
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
    color: '#37474F',
    textAlign: 'center',
  },
  subtitle: {
    color: '#78909C',
    textAlign: 'center',
  },
  statusCard: {
    width: '100%',
    backgroundColor: '#FDF8F8',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    borderColor: '#FBE9E7',
  },
  statusCardTitle: {
    fontWeight: '700',
    color: '#37474F',
    textAlign: 'center',
  },
  statusCardDesc: {
    color: '#78909C',
    textAlign: 'center',
  },
  membersSection: {
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#78909C',
  },
  line: {
    flex: 1,
    backgroundColor: '#E0E0E0',
  },
  membersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  memberItem: {
    alignItems: 'center',
  },
  avatarContainer: {
    overflow: 'hidden',
    backgroundColor: '#ECEFF1',
    borderColor: '#FFFFFF',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  memberName: {
    color: '#37474F',
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    borderColor: '#F0F0F0',
  },
  infoCardTitle: {
    fontWeight: '600',
    color: '#37474F',
  },
  infoCardDesc: {
    color: '#78909C',
  },
  actionButtons: {
    width: '100%',
  },
  cancelButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#E53935',
    fontWeight: '600',
  },
  emergencyButton: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyButtonText: {
    color: '#37474F',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontWeight: '700',
    color: '#333333',
  },
  modalDescription: {
    color: '#555555',
  },
  reasonOption: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  reasonOptionSelected: {
    borderColor: '#D84D42',
    backgroundColor: '#FFF2F0',
  },
  reasonOptionText: {
    color: '#444444',
    fontWeight: '600',
  },
  reasonOptionTextSelected: {
    color: '#B93A30',
  },
  modalKeepButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  modalKeepButtonText: {
    color: '#333333',
    fontWeight: '600',
  },
  modalCancelButton: {
    backgroundColor: '#E53935',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalDivider: {
    width: '100%',
    backgroundColor: '#E0E0E0',
  },
  modalFooterText: {
    color: '#777777',
    textAlign: 'center',
  },
});

export default AwarenessSharedScreen;


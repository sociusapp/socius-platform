import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useResponsive } from '../../../../utils/responsive';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

const CancelRequestModal = ({ visible, onClose, onConfirm }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const [selectedReason, setSelectedReason] = useState(null);

  const CANCEL_REASONS = [
    { id: 'no_helpers_nearby', label: 'No helpers nearby' },
    { id: 'no_one_accepted', label: 'No one accepted' },
    { id: 'change_of_plans', label: 'Change of plans' },
    { id: 'feeling_safer', label: 'I feel safer now' },
    { id: 'mistake', label: 'Created by mistake' },
  ];

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(selectedReason);
    }
    setSelectedReason(null);
  };

  const handleClose = () => {
    setSelectedReason(null);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { width: contentWidth * 0.9, borderRadius: scale(28), overflow: 'hidden' }]}>
          <LinearGradient
            colors={['#FFF5F6', '#FFFFFF']}
            style={{ padding: spacing(24) }}
          >
            <View style={[styles.iconContainer, { marginBottom: vscale(16) }]}>
              <View style={[styles.iconCircle, { width: scale(64), height: scale(64), borderRadius: scale(32) }]}>
                <Icon name="alert-circle-outline" size={scale(32)} color="#DC5C69" />
              </View>
            </View>
            
            <Text style={[styles.modalTitle, { fontSize: ms(20), marginBottom: vscale(12) }]}>Cancel Awareness Request?</Text>
            
            <Text style={[styles.modalDescription, { fontSize: ms(14), marginBottom: vscale(20) }]}>
              Please select a reason for cancelling this request:
            </Text>

            <View style={{ maxHeight: vscale(250), width: '100%', marginBottom: vscale(20) }}>
              {CANCEL_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonOption,
                    { padding: spacing(14), marginBottom: vscale(10), borderRadius: scale(16), borderWidth: 1.5 },
                    selectedReason === reason.id ? styles.selectedReasonOption : { borderColor: '#F1F5F9', backgroundColor: '#F8FAFC' }
                  ]}
                  onPress={() => setSelectedReason(reason.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.radioCircle, 
                    { width: scale(22), height: scale(22), borderRadius: scale(11), borderWidth: 2, marginRight: spacing(12) },
                    selectedReason === reason.id ? { borderColor: '#DC5C69' } : { borderColor: '#CBD5E1' }
                  ]}>
                    {selectedReason === reason.id && <View style={[styles.selectedRb, { width: scale(12), height: scale(12), borderRadius: scale(6) }]} />}
                  </View>
                  <Text style={[
                    styles.reasonText, 
                    { fontSize: ms(15), fontWeight: selectedReason === reason.id ? '700' : '500' },
                    selectedReason === reason.id ? { color: '#DC5C69' } : { color: '#475569' }
                  ]}>{reason.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ gap: vscale(12) }}>
              <TouchableOpacity 
                style={{ opacity: selectedReason ? 1 : 0.6 }} 
                onPress={handleConfirm}
                disabled={!selectedReason}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#DC5C69', '#C54B57']}
                  style={[styles.confirmButton, { paddingVertical: vscale(14), borderRadius: scale(16) }]}
                >
                  <Text style={[styles.confirmButtonText, { fontSize: ms(16) }]}>Yes, Cancel Request</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.cancelButton, { paddingVertical: vscale(14), borderRadius: scale(16), backgroundColor: '#F1F5F9' }]} 
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelButtonText, { fontSize: ms(16), color: '#64748B' }]}>No, Keep Active</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    backgroundColor: '#FFF0F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
  },
  modalDescription: {
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cancelButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontWeight: '700',
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedReasonOption: {
    borderColor: '#DC5C69',
    backgroundColor: '#FFF5F6',
  },
  reasonText: {
    flex: 1,
  },
  radioCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRb: {
    backgroundColor: '#DC5C69',
  },
});

export default CancelRequestModal;

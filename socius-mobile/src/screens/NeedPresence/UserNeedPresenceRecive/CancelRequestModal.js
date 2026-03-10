import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useResponsive } from '../../../utils/responsive';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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
        <View style={[styles.modalContent, { width: contentWidth, padding: spacing(24), borderRadius: scale(20) }]}>
          <View style={[styles.iconContainer, { marginBottom: vscale(16) }]}>
            <Icon name="alert-circle-outline" size={scale(48)} color="#E74C3C" />
          </View>
          
          <Text style={[styles.modalTitle, { fontSize: ms(20), marginBottom: vscale(12) }]}>Cancel Awareness Request?</Text>
          
          <Text style={[styles.modalDescription, { fontSize: ms(14), marginBottom: vscale(16) }]}>
            Please select a reason for cancelling this request:
          </Text>

          <ScrollView style={{ maxHeight: vscale(200), width: '100%', marginBottom: vscale(16) }}>
            {CANCEL_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={[
                  styles.reasonOption,
                  selectedReason === reason.id && styles.selectedReasonOption,
                  { padding: spacing(12), marginBottom: vscale(8), borderRadius: scale(8), borderWidth: 1 }
                ]}
                onPress={() => setSelectedReason(reason.id)}
              >
                <View style={[styles.radioCircle, { width: scale(20), height: scale(20), borderRadius: scale(10), borderWidth: scale(2), marginRight: spacing(10) }]}>
                  {selectedReason === reason.id && <View style={[styles.selectedRb, { width: scale(10), height: scale(10), borderRadius: scale(5) }]} />}
                </View>
                <Text style={[styles.reasonText, { fontSize: ms(14) }]}>{reason.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity 
            style={[styles.confirmButton, { paddingVertical: vscale(14), borderRadius: scale(30), marginBottom: vscale(12), opacity: selectedReason ? 1 : 0.6 }]} 
            onPress={handleConfirm}
            disabled={!selectedReason}
          >
            <Text style={[styles.confirmButtonText, { fontSize: ms(16) }]}>Yes, Cancel Request</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.cancelButton, { paddingVertical: vscale(14), borderRadius: scale(30) }]} 
            onPress={handleClose}
          >
            <Text style={[styles.cancelButtonText, { fontSize: ms(16) }]}>No, Keep Active</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  modalDescription: {
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmButton: {
    backgroundColor: '#E74C3C',
    width: '100%',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#F2F2F2',
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#7F8C8D',
    fontWeight: '600',
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#E0E0E0',
    backgroundColor: '#F9FAFB',
  },
  selectedReasonOption: {
    borderColor: '#E74C3C',
    backgroundColor: '#FFF5F5',
  },
  reasonText: {
    color: '#4A4A4A',
    flex: 1,
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#7F8C8D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E74C3C',
  },
});

export default CancelRequestModal;

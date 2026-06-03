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
        <View style={[styles.modalContent, { width: contentWidth * 0.88, borderRadius: scale(24) }]}>
          <View style={{ padding: spacing(24) }}>
            {/* Icon */}
            <View style={[styles.iconContainer, { marginBottom: vscale(20) }]}>
              <View style={[styles.iconCircle, { width: scale(56), height: scale(56), borderRadius: scale(28) }]}>
                <Icon name="alert-circle-outline" size={scale(28)} color="#DC5C69" />
              </View>
            </View>
            
            {/* Title */}
            <Text style={[styles.modalTitle, { fontSize: ms(20), marginBottom: vscale(8) }]}>
              Cancel Awareness Request?
            </Text>
            
            {/* Description */}
            <Text style={[styles.modalDescription, { fontSize: ms(14), marginBottom: vscale(24) }]}>
              Please select a reason for cancelling this request:
            </Text>

            {/* Reason Options */}
            <View style={{ width: '100%', marginBottom: vscale(24) }}>
              {CANCEL_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason.id}
                  style={[
                    styles.reasonOption,
                    { padding: spacing(16), marginBottom: vscale(12), borderRadius: scale(12), borderWidth: 1.5 },
                    selectedReason === reason.id 
                      ? { borderColor: '#DC5C69', backgroundColor: '#FFF5F6' } 
                      : { borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }
                  ]}
                  onPress={() => setSelectedReason(reason.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.radioCircle, 
                    { width: scale(20), height: scale(20), borderRadius: scale(10), borderWidth: 2, marginRight: spacing(12) },
                    selectedReason === reason.id ? { borderColor: '#DC5C69' } : { borderColor: '#CBD5E1' }
                  ]}>
                    {selectedReason === reason.id && (
                      <View style={[styles.selectedRb, { width: scale(10), height: scale(10), borderRadius: scale(5) }]} />
                    )}
                  </View>
                  <Text style={[
                    styles.reasonText, 
                    { fontSize: ms(15), fontWeight: selectedReason === reason.id ? '600' : '400' },
                    selectedReason === reason.id ? { color: '#1E293B' } : { color: '#475569' }
                  ]}>
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Buttons */}
            <View style={{ gap: vscale(10) }}>
              {/* Yes, Cancel Request - Red filled */}
              <TouchableOpacity 
                style={[
                  styles.confirmButton, 
                  { 
                    paddingVertical: vscale(14), 
                    borderRadius: scale(16),
                    backgroundColor: selectedReason ? '#DC5C69' : '#F1F5F9',
                    opacity: selectedReason ? 1 : 0.7
                  }
                ]} 
                onPress={handleConfirm}
                disabled={!selectedReason}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.confirmButtonText, 
                  { fontSize: ms(16) },
                  { color: selectedReason ? '#FFFFFF' : '#94A3B8' }
                ]}>
                  Yes, Cancel Request
                </Text>
              </TouchableOpacity>
              
              {/* No, Keep Active - Gray outlined */}
              <TouchableOpacity 
                style={[
                  styles.cancelButton, 
                  { 
                    paddingVertical: vscale(14), 
                    borderRadius: scale(16),
                    borderWidth: 1,
                    borderColor: '#CBD5E1',
                    backgroundColor: '#FFFFFF'
                  }
                ]} 
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelButtonText, { fontSize: ms(16), color: '#64748B' }]}>
                  No, Keep Active
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.70)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    backgroundColor: '#FFF5F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontWeight: '700',
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
    fontWeight: '600',
  },
  cancelButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontWeight: '600',
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
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

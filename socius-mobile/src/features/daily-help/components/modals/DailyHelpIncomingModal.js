import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../../utils/responsive';
import { baseURL } from '../../../../services/api/client';

const IncomingHelpRequestModal = ({ visible, data, onDecline, onView }) => {
  const { ms, scale, spacing, vscale } = useResponsive();
  const baseRoot = String(baseURL || '').replace(/\/api\/?$/, '');
  
  const category = String(data?.categoryName || data?.category || 'General').replace(/_/g, ' ');
  const area = String(data?.area || 'Nearby location').trim();
  const iconPath = data?.categoryIcon ? String(data.categoryIcon) : '';
  const iconUri = iconPath ? `${baseRoot}${iconPath}` : null;

  return (
    <Modal
      visible={!!visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => false}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { borderRadius: scale(20), width: '90%', maxWidth: scale(400), padding: spacing(20) }]}>
          <View style={styles.headerRow}>
            <View style={[styles.imageContainer, { width: scale(60), height: scale(60), borderRadius: scale(12) }]}>
              {iconUri ? (
                <Image
                  source={{ uri: iconUri }}
                  style={{ width: '100%', height: '100%', borderRadius: scale(12) }}
                  resizeMode="cover"
                />
              ) : (
                <Icon name="hand-heart" size={ms(30)} color="#DC5C69" />
              )}
            </View>
            
            <View style={styles.titleColumn}>
              <Text style={[styles.title, { fontSize: ms(18) }]}>Help Request</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>category: </Text>
                <Text style={styles.detailValue}>{category}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>location: </Text>
                <Text style={styles.detailValue} numberOfLines={1}>{area}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              onPress={onDecline}
              style={[styles.actionBtn, styles.declineBtn, { borderRadius: scale(25) }]}
              activeOpacity={0.7}
            >
              <Text style={styles.declineBtnText}>Not available</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onView}
              style={[styles.actionBtn, styles.viewBtn, { borderRadius: scale(25) }]}
              activeOpacity={0.7}
            >
              <Text style={styles.viewBtnText}>View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  imageContainer: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  titleColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  viewBtn: {
    backgroundColor: '#DC5C69',
  },
  declineBtnText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
  },
  viewBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default IncomingHelpRequestModal;

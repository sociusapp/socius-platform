import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../utils/responsive';
import moment from 'moment';

const DailyHelpHistoryCard = ({ item, onAction, resolveCategoryMeta, baseRoot }) => {
  const { ms, scale, spacing, vscale } = useResponsive();
  const isMyRequest = item.isMyRequest;
  const raw = item?.data || {};
  const resolvedCategory = resolveCategoryMeta(
    raw?.category || item.category,
    raw?.categoryName || item.title,
    raw?.categoryIcon
  );

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'matched':
      case 'en_route':
      case 'arrived':
      case 'in_progress':
        return { color: '#DC5C69', bg: '#FFF5F6', label: 'Active' };
      case 'pending':
      case 'open':
      case 'matching':
        return { color: '#FF9F43', bg: '#FFF0E1', label: 'Pending' };
      case 'accepted':
        return { color: '#DC5C69', bg: '#FFF5F6', label: 'Accepted' };
      case 'completed':
      case 'closed':
        return { color: '#7367F0', bg: '#ECEBFF', label: 'Completed' };
      case 'cancelled':
      case 'declined':
        return { color: '#EA5455', bg: '#FCEAEA', label: 'Cancelled' };
      default:
        return { color: '#A0AEC0', bg: '#EDF2F7', label: status || 'Unknown' };
    }
  };

  const statusStyle = getStatusStyle(item.status);

  return (
    <View
      style={[styles.historyCard, {
        marginBottom: vscale(10),
        borderRadius: scale(14),
        padding: scale(12),
        borderColor: '#F1F5F9'
      }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.avatarPlaceholder, {
          backgroundColor: '#F8FAFC',
          width: scale(48),
          height: scale(48),
          borderRadius: scale(24),
          marginRight: spacing(12),
          borderWidth: 1,
          borderColor: '#E2E8F0'
        }]}>
          {resolvedCategory?.iconUri ? (
            <Image
              source={{ uri: resolvedCategory.iconUri }}
              style={{ width: scale(28), height: scale(28), borderRadius: scale(6) }}
              resizeMode="cover"
            />
          ) : (
            <Icon name="hand-heart" size={scale(28)} color="#DC5C69" />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vscale(1) }}>
            <Text style={{ fontSize: ms(14), fontWeight: '700', color: '#1E293B', flex: 1 }} numberOfLines={1}>
              {String(resolvedCategory?.name || (isMyRequest ? 'Help Request' : 'Help Provided')).toUpperCase()}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.color, fontSize: ms(9), fontWeight: '700' }]}>
                {statusStyle.label.toUpperCase()}
              </Text>
            </View>
          </View>

          {item.description && (
            <Text style={{ fontSize: ms(12), color: '#475569', marginBottom: vscale(2) }} numberOfLines={1}>
              {item.description}
            </Text>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F6', paddingHorizontal: spacing(6), paddingVertical: vscale(1), borderRadius: scale(4), marginRight: spacing(8) }}>
              <Icon name={isMyRequest ? "account-arrow-right-outline" : "account-arrow-left-outline"} size={scale(10)} color="#DC5C69" style={{ marginRight: spacing(4) }} />
              <Text style={{ color: '#DC5C69', fontSize: ms(9), fontWeight: '600' }}>
                {isMyRequest ? 'You Requested' : 'You Helped'}
              </Text>
            </View>
            <Text style={{ color: '#94A3B8', fontSize: ms(9) }}>{moment(item.createdAt).format('MMM D, h:mm A')}</Text>
          </View>
        </View>
      </View>

      <View style={{ marginTop: vscale(8), paddingTop: vscale(8), borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: ms(9), color: '#94A3B8', marginRight: spacing(4) }}>CATEGORY:</Text>
          <Text style={{ fontSize: ms(11), color: '#1E293B', fontWeight: '600' }}>{item.category || 'General'}</Text>
        </View>

        <TouchableOpacity
          onPress={() => onAction(item)}
          style={[
            styles.actionBtn,
            {
              height: vscale(30),
              paddingHorizontal: spacing(12),
              paddingVertical: 0,
              borderRadius: scale(15),
              borderWidth: 1,
              borderColor: '#DC5C69',
              backgroundColor: statusStyle.label === 'Active' ? '#DC5C69' : 'transparent',
              justifyContent: 'center',
              alignItems: 'center'
            }
          ]}
        >
          <Text style={[
            styles.actionBtnText,
            {
              fontSize: ms(11),
              color: statusStyle.label === 'Active' ? '#FFF' : '#DC5C69',
              fontWeight: '700',
              textAlignVertical: 'center',
              includeFontPadding: false
            }
          ]}>
            {statusStyle.label === 'Active' ? 'Track Status' : 'Request Again'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  historyCard: {
    backgroundColor: '#FFFFFF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    backgroundColor: '#F1F5F9',
  },
  actionBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
  },
});

export default DailyHelpHistoryCard;

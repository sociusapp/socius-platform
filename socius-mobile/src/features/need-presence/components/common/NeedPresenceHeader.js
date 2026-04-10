import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../../utils/responsive';

const NeedPresenceHeader = ({ title, onBack }) => {
  const { ms, scale, vscale } = useResponsive();
  return (
    <View style={[styles.container, { height: vscale(60), paddingHorizontal: scale(16) }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Icon name="arrow-left" size={scale(24)} color="#DC5C69" />
      </TouchableOpacity>
      <Text style={[styles.title, { fontSize: ms(18) }]}>{title}</Text>
      <View style={{ width: scale(40) }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    padding: 8,
  },
  title: {
    fontWeight: '700',
    color: '#1E293B',
  },
});

export default NeedPresenceHeader;

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useResponsive } from '../../utils/responsive';

const SubscriptionManageScreen = () => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  return (
    <View style={styles.container}>
      <View style={{ width: contentWidth, alignSelf: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: ms(16) }}>SubscriptionManageScreen</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SubscriptionManageScreen;

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import { useResponsive } from '../../utils/responsive';

const SubscriptionStatusScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  const availableItems = [
    'Emergency Help',
    'Profile access',
    'Contact support',
  ];

  const unavailableItems = [
    'Sharing awareness',
    'Receiving awareness notifications',
  ];

  const handleRenew = () => {
    navigation.navigate('SubscriptionManage');
  };

  const handleLimitedAccess = () => {
    navigation.navigate('AccountAccess');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="" onBackPress={() => navigation.goBack()} style={{ borderBottomWidth: 0 }} />

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing(20), paddingTop: vscale(20), paddingBottom: vscale(30) }]} 
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <Text style={[styles.screenTitle, { fontSize: ms(22), marginBottom: vscale(10) }]}>Subscription Status</Text>
          <View style={[styles.divider, { height: scale(1), marginBottom: vscale(18) }]} />

          <View style={[styles.statusCard, { borderRadius: scale(18), paddingHorizontal: spacing(16), paddingVertical: vscale(14), marginBottom: vscale(18), borderWidth: scale(1) }]}>
            <Text style={[styles.statusTitle, { fontSize: ms(16), marginBottom: vscale(6) }]}>Your subscription has ended.</Text>
            <Text style={[styles.statusSubtitle, { fontSize: ms(13) }]}>You're currently in a grace period.</Text>
          </View>

          <Text style={[styles.sectionTitle, { fontSize: ms(15), marginBottom: vscale(12) }]}>Still available:</Text>
          <View style={[styles.itemsList, { marginBottom: vscale(16) }]}>
            {availableItems.map((item, idx) => (
              <View key={idx} style={[styles.itemRow, { marginBottom: vscale(10) }]}>
                <Icon name="check-circle" size={scale(20)} color="#4CAF50" />
                <Text style={[styles.itemText, { fontSize: ms(14), marginLeft: spacing(10) }]}>{item}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { fontSize: ms(15), marginBottom: vscale(12) }]}>Temporarily unavailable:</Text>
          <View style={[styles.itemsList, { marginBottom: vscale(16) }]}>
            {unavailableItems.map((item, idx) => (
              <View key={idx} style={[styles.itemRow, { marginBottom: vscale(10) }]}>
                <Icon name="close-circle" size={scale(20)} color="#DC5C69" />
                <Text style={[styles.itemText, { fontSize: ms(14), marginLeft: spacing(10) }]}>{item}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.disclaimerText, { fontSize: ms(13), marginBottom: vscale(18) }]}>
            Emergency access is always available, even without a subscription.
          </Text>

          <Button
            title="Renew Subscription"
            onPress={handleRenew}
            variant="primary"
            fullWidth
            style={[styles.primaryButton, { borderRadius: scale(26), paddingVertical: vscale(14), marginBottom: vscale(12) }]}
          />

          <Button
            title="Continue with Limited Access"
            onPress={handleLimitedAccess}
            variant="white"
            fullWidth
            style={[styles.secondaryButton, { borderRadius: scale(26), paddingVertical: vscale(14), marginBottom: vscale(14) }]}
          />

          <Text style={[styles.footerNote, { fontSize: ms(12) }]}>₹15/month — cancel anytime</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  screenTitle: {
    fontWeight: '700',
    color: '#C84242',
    textAlign: 'center',
  },
  divider: {
    backgroundColor: '#E8EAED',
  },
  statusCard: {
    backgroundColor: '#FDF6F2',
    borderColor: '#F1DDD6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  statusSubtitle: {
    fontWeight: '400',
    color: '#666666',
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  itemsList: {
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    color: '#2C3E50',
  },
  disclaimerText: {
    fontWeight: '400',
    color: '#666666',
  },
  primaryButton: {
  },
  secondaryButton: {
  },
  footerNote: {
    color: '#888888',
    textAlign: 'center',
  },
});

export default SubscriptionStatusScreen;

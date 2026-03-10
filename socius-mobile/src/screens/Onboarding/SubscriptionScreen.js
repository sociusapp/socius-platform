import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import { useResponsive } from '../../utils/responsive';

const SubscriptionScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale, isTablet } = useResponsive();
  const [subscriptionStatus, setSubscriptionStatus] = useState('active');

  const contributionItems = [
    'Platform maintenance',
    'Identity verification & safety checks',
    'Moderation & misuse prevention',
    'Server & notification costs'
  ];

  const handlePauseSubscription = () => {
    Alert.alert(
      'Pause Subscription?',
      'You can resume your subscription anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pause',
          onPress: () => setSubscriptionStatus('paused'),
        },
      ]
    );
  };

  const handleContinue = () => {
    navigation.navigate('ProfileReview');
  };

  const isSubscriptionActive = subscriptionStatus === 'active';

  return (
    <SafeAreaView style={styles.container}>
      <Header
        onBackPress={() => navigation.goBack()} 
        rightComponent={
          <View style={{ paddingRight: spacing(12) }}>
            <Button
              title="Skip"
              onPress={handleContinue}
              variant="white"
              size="small"
              fullWidth={false}
              style={{
                paddingHorizontal: spacing(12),
                paddingVertical: vscale(4),
                minHeight: vscale(30),
                borderWidth: scale(1),
                borderColor: '#DC5C69',
                borderRadius: scale(18),
                backgroundColor: '#FFFFFF',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: 'transparent',
                shadowOpacity: 0,
                shadowRadius: 0,
                elevation: 0,
              }}
              textStyle={{
                fontSize: ms(13),
                color: '#DC5C69',
                textAlign: 'center',
              }}
            />
          </View>
        }
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />
      
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: spacing(16), paddingTop: vscale(16), paddingBottom: vscale(30) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Why Socius Has a Subscription Section */}
        <View style={[styles.infoCard, { width: contentWidth, paddingVertical: vscale(15), paddingHorizontal: spacing(24), borderRadius: scale(24), marginBottom: vscale(24) }]}>
          <View style={[styles.infoIconContainer, { marginBottom: vscale(16) }]}>
            <Icon name="heart" size={scale(40)} color="#DC5C69" />
          </View>
          
          <Text style={[styles.infoTitle, { fontSize: ms(20), marginBottom: vscale(16) }]}>Why Socius Has a Subscription</Text>
          
          <View style={[styles.infoLine, { width: scale(50), marginBottom: vscale(16) }]} />
          
          <Text style={[styles.infoDescription, { fontSize: ms(14), lineHeight: ms(21), marginBottom: vscale(14) }]}>
            Socius is maintained through a small monthly contribution to keep the platform independent, ad-free, and focused on community safety.
          </Text>
          
          <Text style={[styles.infoSubtext, { fontSize: ms(14) }]}>
            No ads. No selling data. No external control.
          </Text>
        </View>

        {/* Your Plan Section */}
        <View style={[styles.section, { width: contentWidth, marginBottom: vscale(24) }]}>
          <Text style={[styles.sectionTitle, { fontSize: ms(16), fontWeight: '700', marginBottom: vscale(12) }]}>Your Plan</Text>
          
          <View style={[styles.planCard, { padding: spacing(20), borderRadius: scale(16) }]}>
            <View style={[styles.planHeader, { marginBottom: vscale(16) }]}>
              <View style={styles.planLeft}>
                <Text style={[styles.planName, { fontSize: ms(16), fontWeight: '700' }]}>Community Supporter</Text>
                <Text style={[styles.planBilling, { fontSize: ms(14), color: '#666666' }]}>Billing: Monthly</Text>
              </View>
              
              <View style={[styles.planRight, { alignItems: 'flex-end' }]}>
                <Text style={[styles.planPrice, { fontSize: ms(22), fontWeight: '700' }]}>₹15 <Text style={[styles.planFrequency, { fontSize: ms(12) }]}>/month</Text></Text>
                <View style={[
                  styles.statusBadge,
                  isSubscriptionActive && styles.statusBadgeActive,
                  { paddingHorizontal: spacing(8), paddingVertical: vscale(2), borderRadius: scale(4), marginTop: vscale(4) }
                ]}>
                  <Text style={[
                    styles.statusText,
                    isSubscriptionActive && styles.statusTextActive,
                    { fontSize: ms(10) }
                  ]}>
                    {subscriptionStatus.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.planDivider, { height: 1, backgroundColor: '#EEEEEE', marginBottom: vscale(16) }]} />

            <View style={[styles.contributionsList, { gap: vscale(12) }]}>
              {contributionItems.map((item, index) => (
                <View key={index} style={[styles.contributionItem, { flexDirection: 'row', alignItems: 'center', gap: spacing(10) }]}>
                  <Icon name="check-circle" size={scale(18)} color="#4A5568" />
                  <Text style={[styles.contributionText, { fontSize: ms(14), color: '#555555' }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Actions Section */}
        <View style={[styles.actionsContainer, { width: contentWidth, marginTop: vscale(12) }]}>
          <Button
            title="Continue"
            onPress={handleContinue}
            fullWidth
            variant="primary"
          />
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

  // ===== INFO CARD SECTION =====
  infoCard: {
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EAED',
  },

  infoIconContainer: {
  },

  infoTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },

  infoLine: {
    height: 1,
    backgroundColor: '#D0D0D0',
  },

  infoDescription: {
    fontWeight: '400',
    color: '#555555',
    textAlign: 'center',
  },

  infoSubtext: {
    fontWeight: '400',
    color: '#333333',
    textAlign: 'center',
  },

  // ===== SECTION STYLING =====
  section: {
  },

  sectionTitle: {
    color: '#2C3E50',
  },

  // ===== PLAN CARD =====
  planCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EAED',
  },

  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  planLeft: {
    flex: 1,
  },

  planRight: {
  },

  planName: {
    color: '#2C3E50',
  },

  planBilling: {
    fontWeight: '400',
  },

  planPrice: {
    color: '#2C3E50',
  },

  planFrequency: {
    fontWeight: '400',
    color: '#666666',
  },

  statusBadge: {
    backgroundColor: '#D4E8DB',
  },

  statusBadgeActive: {
    backgroundColor: '#D4E8DB',
  },

  statusText: {
    fontWeight: '600',
    color: '#4CAF50',
  },

  statusTextActive: {
    color: '#4CAF50',
  },

  planDivider: {
    backgroundColor: '#E8EAED',
  },

  contributionsList: {
  },

  contributionItem: {
  },

  contributionText: {
  },

  actionsContainer: {
  },
});

export default SubscriptionScreen;

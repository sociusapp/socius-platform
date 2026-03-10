import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import { useResponsive } from '../../utils/responsive';
import { clearAuth } from '../../services/storage/asyncStorage.service';

const AccountAccessScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const canStill = [
    'View emergency help',
    'Access your profile',
    'Contact support',
  ];

  const unavailable = [
    'Sharing awareness',
    'Receiving awareness notifications',
  ];

  const handleSupport = () => {
    navigation.navigate('HelpSupport');
  };

  const handleSignOut = async () => {
    try {
      await clearAuth();
    } catch (e) {
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'PhoneVerification' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="" 
        onBackPress={() => navigation.goBack()} 
        style={{ borderBottomWidth: 0 }}
      />

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing(20), paddingBottom: vscale(30) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <Text style={[styles.pageTitle, { fontSize: ms(22), marginBottom: vscale(16), lineHeight: ms(28) }]}>Account Access Update</Text>

          {/* Status Card */}
          <View style={[styles.statusCard, { borderRadius: scale(20), paddingHorizontal: spacing(16), paddingVertical: vscale(16), marginBottom: vscale(16), borderWidth: scale(1), shadowOffset: { width: 0, height: vscale(2) }, shadowRadius: scale(8), elevation: scale(3) }]}>
            <View style={[styles.statusPill, { borderRadius: scale(14), paddingHorizontal: spacing(12), paddingVertical: vscale(10), marginBottom: vscale(10) }]}>
              <Text style={[styles.statusTitle, { fontSize: ms(15) }]}>
                Your account access is currently limited.
              </Text>
            </View>
            <Text style={[styles.statusDescription, { fontSize: ms(14), lineHeight: ms(20) }]}>
              This may happen during routine review or after a reported concern.
            </Text>
          </View>

          {/* Reason */}
          <View style={[styles.section, { marginBottom: vscale(14) }]}>
            <Text style={[styles.sectionTitle, { fontSize: ms(16), marginBottom: vscale(8) }]}>Reason</Text>
            <View style={[styles.divider, { height: scale(1), marginVertical: vscale(12) }]} />
            <View style={[styles.reasonPill, { borderRadius: scale(18), paddingHorizontal: spacing(14), paddingVertical: vscale(10), borderWidth: scale(1), shadowOffset: { width: 0, height: vscale(2) }, shadowRadius: scale(6), elevation: scale(2) }]}>
              <Text style={[styles.reasonText, { fontSize: ms(14) }]}>Routine verification review</Text>
            </View>
          </View>

          {/* Capabilities */}
          <View style={[styles.capabilities, { gap: spacing(16), marginBottom: vscale(8) }]}>
            <View style={styles.capColumn}>
              <Text style={[styles.capTitle, { fontSize: ms(15), marginBottom: vscale(8) }]}>You can still:</Text>
              {canStill.map((item, idx) => (
                <View style={[styles.capRow, { marginBottom: vscale(8), gap: spacing(8) }]} key={`can-${idx}`}>
                  <Icon name="check" size={scale(18)} color="#2C3E50" />
                  <Text style={[styles.capText, { fontSize: ms(14) }]}>{item}</Text>
                </View>
              ))}
            </View>
            <View style={styles.capColumn}>
              <Text style={[styles.capTitle, { fontSize: ms(15), marginBottom: vscale(8) }]}>Temporarily unavailable:</Text>
              {unavailable.map((item, idx) => (
                <View style={[styles.capRow, { marginBottom: vscale(8), gap: spacing(8) }]} key={`un-${idx}`}>
                  <Icon name="close" size={scale(18)} color="#C94D4D" />
                  <Text style={[styles.capText, { fontSize: ms(14) }]}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.divider, { height: scale(1), marginVertical: vscale(12) }]} />

          {/* Note */}
          <Text style={[styles.note, { fontSize: ms(13), marginBottom: vscale(16) }]}>
            This is not a judgment. Most reviews are resolved quickly.
          </Text>

          {/* Contact Support Button */}
          <Button 
            title="Contact Support" 
            onPress={handleSupport}
            fullWidth
          />

          {/* Sign Out */}
          <Text style={[styles.signOut, { fontSize: ms(15), marginTop: vscale(10) }]} onPress={handleSignOut}>Sign Out</Text>
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
  pageTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },

  // ===== STATUS CARD =====
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  statusPill: {
    backgroundColor: '#F8F1EE',
  },
  statusTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  statusDescription: {
    fontWeight: '400',
    color: '#666666',
  },

  // ===== SECTION =====
  section: {
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  divider: {
    backgroundColor: '#E8EAED',
  },
  reasonPill: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    alignSelf: 'flex-start',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
  },
  reasonText: {
    fontWeight: '500',
    color: '#2C3E50',
  },

  // ===== CAPABILITIES =====
  capabilities: {
    flexDirection: 'row',
  },
  capColumn: {
    flex: 1,
  },
  capTitle: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  capRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capText: {
    color: '#2C3E50',
  },
  
  note: {
    fontStyle: 'italic',
    color: '#888888',
    textAlign: 'center',
  },
  signOut: {
    textAlign: 'center',
    color: '#C94D4D',
    fontWeight: '600',
  }
});

export default AccountAccessScreen;

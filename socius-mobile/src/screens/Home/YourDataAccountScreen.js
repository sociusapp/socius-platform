import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import { useResponsive } from '../../utils/responsive';

const YourDataAccountScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  const handleDownloadData = () => {
    navigation.navigate('DataPrivacy');
  };

  const handleDataRetention = () => {
    navigation.navigate('DataPrivacy');
  };

  const handleRequestDeletion = () => {
    navigation.navigate('ReportConcern');
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
          {/* Title */}
          <Text style={[styles.pageTitle, { fontSize: ms(22), marginBottom: vscale(16), lineHeight: ms(28) }]}>Your Data & Account</Text>

          {/* Intro Text */}
          <Text style={[styles.introText, { fontSize: ms(14), marginBottom: vscale(20), lineHeight: ms(20) }]}>
            You're in control of your data and account at all times.
          </Text>

          {/* Section: Data Access */}
          <Text style={[styles.sectionTitle, { fontSize: ms(16), marginBottom: vscale(10), marginTop: vscale(8) }]}>Data Access</Text>
          <View style={[styles.cardList, { marginBottom: vscale(6) }]}>
            <TouchableOpacity style={[styles.listCard, { borderRadius: scale(16), paddingHorizontal: spacing(16), paddingVertical: vscale(14), marginBottom: vscale(12), borderWidth: scale(1) }]} onPress={handleDownloadData} activeOpacity={0.85}>
              <View style={[styles.listText, { paddingRight: spacing(12) }]}>
                <Text style={[styles.listTitle, { fontSize: ms(15), marginBottom: vscale(6) }]}>Download my data</Text>
                <Text style={[styles.listSubtitle, { fontSize: ms(13), lineHeight: ms(20) }]}>Get a copy of the information linked to your account.</Text>
              </View>
              <Icon name="chevron-right" size={scale(24)} color="#999999" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.listCard, { borderRadius: scale(16), paddingHorizontal: spacing(16), paddingVertical: vscale(14), marginBottom: vscale(12), borderWidth: scale(1) }]} onPress={handleDataRetention} activeOpacity={0.85}>
              <View style={[styles.listText, { paddingRight: spacing(12) }]}>
                <Text style={[styles.listTitle, { fontSize: ms(15), marginBottom: vscale(6) }]}>Data retention & usage</Text>
                <Text style={[styles.listSubtitle, { fontSize: ms(13), lineHeight: ms(20) }]}>Learn how long data is stored and why.</Text>
              </View>
              <Icon name="chevron-right" size={scale(24)} color="#999999" />
            </TouchableOpacity>
          </View>

          {/* Section: Account actions */}
          <Text style={[styles.sectionTitle, { fontSize: ms(16), marginBottom: vscale(10), marginTop: vscale(8) }]}>Account actions</Text>
          <TouchableOpacity style={[styles.listCard, { borderRadius: scale(16), paddingHorizontal: spacing(16), paddingVertical: vscale(14), marginBottom: vscale(12), borderWidth: scale(1) }]} onPress={handleRequestDeletion} activeOpacity={0.85}>
            <View style={[styles.listText, { paddingRight: spacing(12) }]}>
              <Text style={[styles.listTitle, { fontSize: ms(15), marginBottom: vscale(6) }]}>Request account deletion</Text>
              <Text style={[styles.listSubtitle, { fontSize: ms(13), lineHeight: ms(20) }]}>This permanently removes your account and associated data.</Text>
            </View>
            <Icon name="chevron-right" size={scale(24)} color="#999999" />
          </TouchableOpacity>

          {/* Info Card */}
          <View style={[styles.infoCard, { borderRadius: scale(16), paddingHorizontal: spacing(16), paddingVertical: vscale(14), marginTop: vscale(6), marginBottom: vscale(16), borderWidth: scale(1) }]}>
            <Text style={[styles.infoTextEmphasis, { fontSize: ms(14), marginBottom: vscale(6) }]}>
              Account deletion is permanent and cannot be undone.
            </Text>
            <Text style={[styles.infoTextSub, { fontSize: ms(13) }]}>
              Some records may be retained temporarily where required by law.
            </Text>
          </View>

          {/* Support Text */}
          <Text style={[styles.supportText, { fontSize: ms(12), marginBottom: vscale(14) }]}>
            You can contact support if you have questions about your data.
          </Text>

          {/* CTA */}
          <Button 
            title="Request Deletion" 
            variant="gradient"
            onPress={handleRequestDeletion}
            fullWidth
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
  pageTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  introText: {
    color: '#666666',
    textAlign: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  cardList: {
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  listText: {
    flex: 1,
  },
  listTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  listSubtitle: {
    color: '#666666',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1D1D1',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTextEmphasis: {
    fontWeight: '700',
    color: '#C94D4D',
  },
  infoTextSub: {
    color: '#C94D4D',
  },
  supportText: {
    color: '#888888',
    textAlign: 'left',
  },
});

export default YourDataAccountScreen;

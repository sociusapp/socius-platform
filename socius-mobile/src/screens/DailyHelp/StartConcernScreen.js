import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/common/Header';
import Button from '../../components/common/Button';
import { useResponsive } from '../../utils/responsive';

const StartConcernScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  const handleOpenReport = () => navigation.navigate('ReportConcern');

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ padding: spacing(8) }}>
            <Icon name="cog" size={scale(24)} color="#999999" />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />
      <ScrollView 
        contentContainerStyle={[styles.scroll, {
          paddingHorizontal: spacing(20),
          paddingTop: vscale(20),
          paddingBottom: vscale(60),
          alignItems: 'center'
        }]} 
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          <Text style={[styles.pageTitle, { fontSize: ms(22), marginBottom: vscale(8) }]}>Community Awareness</Text>
          <Text style={[styles.pageSubtitle, { fontSize: ms(14), marginBottom: vscale(24) }]}>Help others stay informed about your local area.</Text>

          <View style={[styles.infoCard, { 
            borderRadius: scale(16),
            padding: spacing(20),
            marginBottom: vscale(24),
            borderWidth: scale(1),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(6),
            elevation: scale(2)
          }]}>
            <View style={[styles.infoIcon, { width: scale(48), height: scale(48), borderRadius: scale(24), marginBottom: vscale(16) }]}>
              <Icon name="alert-circle-outline" size={scale(28)} color="#007AFF" />
            </View>
            <Text style={[styles.infoTitle, { fontSize: ms(18), marginBottom: vscale(8) }]}>Share a Concern</Text>
            <Text style={[styles.infoDescription, { fontSize: ms(14), lineHeight: vscale(20) }]}>
              Reporting a concern helps people nearby stay alert. Your specific location is shared only with people you trust.
            </Text>
          </View>

          <View style={[styles.guidelines, { marginBottom: vscale(32) }]}>
            <Text style={[styles.guidelinesTitle, { fontSize: ms(16), marginBottom: vscale(12) }]}>Community Guidelines</Text>
            <View style={[styles.guidelineRow, { marginBottom: vscale(10) }]}>
              <Icon name="check-circle-outline" size={scale(18)} color="#34C759" />
              <Text style={[styles.guidelineText, { fontSize: ms(14), marginLeft: spacing(10) }]}>Be specific about the concern</Text>
            </View>
            <View style={[styles.guidelineRow, { marginBottom: vscale(10) }]}>
              <Icon name="check-circle-outline" size={scale(18)} color="#34C759" />
              <Text style={[styles.guidelineText, { fontSize: ms(14), marginLeft: spacing(10) }]}>Respect others' privacy</Text>
            </View>
            <View style={styles.guidelineRow}>
              <Icon name="check-circle-outline" size={scale(18)} color="#34C759" />
              <Text style={[styles.guidelineText, { fontSize: ms(14), marginLeft: spacing(10) }]}>Use emergency services for immediate danger</Text>
            </View>
          </View>

          <Button 
            title="Start Awareness Report"
            onPress={handleOpenReport}
            fullWidth
            style={[styles.primaryButton, { 
              height: vscale(56),
              borderRadius: scale(12)
            }]}
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
  scroll: {
    flexGrow: 1,
  },
  pageTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  pageSubtitle: {
    color: '#7F8C8D',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E9F0',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
  },
  infoIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
  },
  infoTitle: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  infoDescription: {
    color: '#546E7A',
  },
  guidelines: {
  },
  guidelinesTitle: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guidelineText: {
    color: '#546E7A',
  },
  primaryButton: {
  },
});

export default StartConcernScreen;


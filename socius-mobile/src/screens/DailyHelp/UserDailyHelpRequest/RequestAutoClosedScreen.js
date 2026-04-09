import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import { useResponsive } from '../../../utils/responsive';
import { sociusRefreshProps, useStaticPullRefresh } from '../../../utils/sociusRefreshControl';

const RequestAutoClosedScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const { refreshing, onRefresh } = useStaticPullRefresh();
  const [completion, setCompletion] = useState(null);

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleContinue = () => {
    if (completion === 'no' || completion === 'partial') {
      navigation.navigate('CommunityBalanceNudge');
      return;
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
    });
  };

  const handleReport = () => {
    navigation.navigate('ReportConcern');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity
            onPress={handleSettings}
            style={{ padding: scale(8) }}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Icon name="cog" size={scale(24)} color="#999999" />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { alignItems: 'center', paddingHorizontal: spacing(20), paddingTop: vscale(24), paddingBottom: vscale(40) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...sociusRefreshProps} />}
      >
        <View style={{ width: contentWidth }}>
          <View style={[styles.headerCard, { borderRadius: scale(18), borderWidth: scale(1), paddingHorizontal: spacing(18), paddingVertical: vscale(16), marginBottom: vscale(18), shadowOffset: { width: 0, height: vscale(2) }, shadowRadius: scale(6), elevation: scale(2) }]}>
            <View style={[styles.iconCircle, { width: scale(60), height: scale(60), borderRadius: scale(30), marginBottom: vscale(12) }]}>
              <Icon name="information-outline" size={scale(32)} color="#185ADB" />
            </View>
            <Text style={[styles.title, { fontSize: ms(18), marginBottom: vscale(6) }]}>This request is now closed.</Text>
            <Text style={[styles.subtitle, { fontSize: ms(14), lineHeight: ms(20) }]}>
              It timed out after a while so that your location and details are no longer active.
            </Text>
          </View>

          <View style={[styles.section, { marginBottom: vscale(16) }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vscale(10) }}>
              <Icon name="clipboard-check-outline" size={scale(18)} color="#1F2933" style={{ marginRight: spacing(8) }} />
              <Text style={[styles.sectionHeading, { fontSize: ms(14) }]}>Was help completed?</Text>
            </View>
            <View style={{ gap: vscale(8) }}>
              <Button
                title="Yes, completed"
                onPress={() => setCompletion('yes')}
                variant={completion === 'yes' ? 'gradient' : 'white'}
                size="large"
                fullWidth
                icon={<Icon name="check-circle-outline" size={scale(18)} color={completion === 'yes' ? '#FFFFFF' : '#2C3E50'} />}
                accessibilityLabel="Yes, help was completed"
              />
              <Button
                title="No, not really"
                onPress={() => setCompletion('no')}
                variant={completion === 'no' ? 'gradient' : 'white'}
                size="large"
                fullWidth
                icon={<Icon name="close-circle-outline" size={scale(18)} color={completion === 'no' ? '#FFFFFF' : '#2C3E50'} />}
                accessibilityLabel="No, help was not completed"
              />
              <Button
                title="Partially"
                onPress={() => setCompletion('partial')}
                variant={completion === 'partial' ? 'gradient' : 'white'}
                size="large"
                fullWidth
                icon={<Icon name="minus-circle-outline" size={scale(18)} color={completion === 'partial' ? '#FFFFFF' : '#2C3E50'} />}
                accessibilityLabel="Help was partially completed"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleReport}
            activeOpacity={0.85}
            style={[styles.reportRow, { marginBottom: vscale(18), justifyContent: 'space-between' }]}
            accessibilityRole="button"
            accessibilityLabel="Report a concern about this request"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="alert-circle-outline" size={scale(20)} color="#DC5C69" />
              <Text style={[styles.reportText, { fontSize: ms(13) }]}>Report a concern about this request</Text>
            </View>
            <Icon name="chevron-right" size={scale(22)} color="#DC5C69" />
          </TouchableOpacity>

          <View style={[styles.infoCard, { borderRadius: scale(16), borderWidth: scale(1), paddingHorizontal: spacing(16), paddingVertical: vscale(12), marginBottom: vscale(20), shadowOffset: { width: 0, height: vscale(2) }, shadowRadius: scale(6), elevation: scale(2) }]}>
            <Icon name="lock-outline" size={scale(18)} color="#5A6F7D" style={{ marginRight: spacing(8) }} />
            <Text style={[styles.infoText, { fontSize: ms(13), lineHeight: ms(20) }]}>
              Details from this request have been archived. Your live location is no longer shared.
            </Text>
          </View>

          <Button
            title="Continue"
            onPress={handleContinue}
            variant="gradient"
            size="large"
            fullWidth
            icon={<Icon name="arrow-right" size={scale(18)} color="#FFFFFF" />}
            accessibilityLabel="Continue"
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
  headerCard: {
    backgroundColor: '#F0F4FF',
    borderColor: '#D4E0FF',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  iconCircle: {
    backgroundColor: '#E0ECFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '700',
    color: '#1F2933',
    textAlign: 'center',
  },
  subtitle: {
    color: '#4B5563',
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontWeight: '600',
    color: '#1F2933',
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportText: {
    color: '#DC5C69',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  infoText: {
    flex: 1,
    color: '#4B5563',
  },
});

export default RequestAutoClosedScreen;

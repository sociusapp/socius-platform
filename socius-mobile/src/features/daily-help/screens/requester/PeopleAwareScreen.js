import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../../components/common/Header';
import Button from '../../../../components/common/Button';
import { useResponsive } from '../../../../utils/responsive';
import { sociusRefreshProps, useStaticPullRefresh } from '../../../../utils/sociusRefreshControl';

const PeopleAwareScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const { refreshing, onRefresh } = useStaticPullRefresh();
  const handleOpenDetails = () => navigation.navigate('ReviewRequest');
  const handleStayAway = () => navigation.navigate('StayAway');

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={{ padding: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Icon name="cog" size={24} color="#999999" />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: 1, borderBottomColor: '#E8EAED' }}
      />
      <ScrollView 
        contentContainerStyle={[styles.scroll, { 
          paddingHorizontal: spacing(20),
          paddingTop: vscale(20),
          paddingBottom: vscale(60),
          alignItems: 'center'
        }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...sociusRefreshProps} />}
      >
        <View style={{ width: contentWidth }}>
          <Text style={[styles.title, { fontSize: ms(22), marginBottom: vscale(6) }]}>Who might be there</Text>
          <Text style={[styles.subtitle, { fontSize: ms(14), marginBottom: vscale(16) }]}>Nearby people aware of your request.</Text>

          <View style={{ 
            borderRadius: scale(16),
            borderWidth: scale(1),
            borderColor: '#E8EAED',
            backgroundColor: '#FFFFFF',
            paddingHorizontal: spacing(16),
            paddingVertical: vscale(16),
            marginBottom: vscale(12),
            alignItems: 'center'
          }}>
            <Icon name="account-multiple-outline" size={scale(28)} color="#CBD5E1" />
            <Text style={{ marginTop: vscale(10), fontSize: ms(14), fontWeight: '600', color: '#475569', textAlign: 'center' }}>
              No nearby helpers shown yet
            </Text>
            <Text style={{ marginTop: vscale(6), fontSize: ms(13), color: '#94A3B8', textAlign: 'center', lineHeight: vscale(20) }}>
              This list updates when someone chooses to respond.
            </Text>
          </View>

          <View style={[styles.infoBox, { 
            gap: spacing(10),
            borderRadius: scale(16),
            borderWidth: scale(1),
            paddingHorizontal: spacing(16),
            paddingVertical: vscale(14),
            marginBottom: vscale(16)
          }]}>
            <Icon name="information" size={scale(20)} color="#999999" />
            <Text style={[styles.infoText, { fontSize: ms(14), lineHeight: vscale(22) }]}>
              This is not public. People decide privately whether to be nearby.
            </Text>
          </View>

          <Button
            title="Open Details"
            onPress={handleOpenDetails}
            fullWidth
            icon={<Icon name="clipboard-text-outline" size={scale(18)} color="#FFFFFF" />}
            accessibilityLabel="Open request details"
          />
          <Button
            title="Stay Away"
            onPress={handleStayAway}
            variant="white"
            fullWidth
            icon={<Icon name="shield-alert-outline" size={scale(18)} color="#2C3E50" />}
            accessibilityLabel="Safety guidance: stay away"
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
  title: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  subtitle: {
    color: '#666666',
    textAlign: 'center',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  avatar: {
    backgroundColor: '#EEF3F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  profileMeta: {
    color: '#666666',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9F9F9',
    borderColor: '#E8EAED',
  },
  infoText: {
    flex: 1,
    color: '#2C3E50',
  },
});

export default PeopleAwareScreen;

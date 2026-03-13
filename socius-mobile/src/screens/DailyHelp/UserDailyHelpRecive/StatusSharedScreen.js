import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import { useResponsive } from '../../../utils/responsive';

const StatusSharedScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  const handleGoHome = () =>
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
    });

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={{ padding: spacing(8) }}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <Icon name="cog" size={scale(24)} color="#999999" />
          </TouchableOpacity>
        }
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />
      <ScrollView 
        contentContainerStyle={[styles.scroll, {
          paddingHorizontal: spacing(20),
          paddingTop: vscale(40),
          paddingBottom: vscale(60),
          alignItems: 'center'
        }]} 
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth, alignItems: 'center' }}>
          <View style={[styles.successIcon, { width: scale(80), height: scale(80), borderRadius: scale(40), marginBottom: vscale(24) }]}>
            <Icon name="check-circle" size={scale(60)} color="#34C759" />
          </View>
          
          <Text style={[styles.title, { fontSize: ms(24), marginBottom: vscale(12) }]}>Status Shared</Text>
          <Text style={[styles.subtitle, { fontSize: ms(16), marginBottom: vscale(40) }]}>
            Your community awareness update has been shared with people nearby.
          </Text>

          <View style={[styles.infoCard, { 
            borderRadius: scale(16),
            padding: spacing(20),
            marginBottom: vscale(40),
            borderWidth: scale(1)
          }]}>
            <Text style={[styles.infoText, { fontSize: ms(14), lineHeight: vscale(22) }]}>
              People in your local area will now see this update on their maps. This helps everyone stay informed and safe.
            </Text>
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, { 
              height: vscale(56),
              borderRadius: scale(12)
            }]} 
            onPress={handleGoHome}
            accessibilityRole="button"
            accessibilityLabel="Back to home"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="home-outline" size={scale(18)} color="#FFFFFF" style={{ marginRight: spacing(8) }} />
              <Text style={[styles.primaryButtonText, { fontSize: ms(16) }]}>Back to Home</Text>
            </View>
          </TouchableOpacity>
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
  successIcon: {
    backgroundColor: '#EAF9EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Inter-Bold',
    color: '#1A1C1E',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    color: '#495057',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E9ECEF',
    width: '100%',
  },
  infoText: {
    fontFamily: 'Inter-Medium',
    color: '#495057',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});

export default StatusSharedScreen;

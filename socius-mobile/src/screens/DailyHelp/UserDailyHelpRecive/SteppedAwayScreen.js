import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../../../utils/responsive';
import { sociusRefreshProps, useStaticPullRefresh } from '../../../utils/sociusRefreshControl';

const SteppedAwayScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const { refreshing, onRefresh } = useStaticPullRefresh();

  const handleBackHome = () =>
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
    });
  const handleSetNotAvailable = () => navigation.navigate('Availability');

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
          paddingTop: vscale(40),
          paddingBottom: vscale(60),
          alignItems: 'center'
        }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} {...sociusRefreshProps} />}
      >
        <View style={{ width: contentWidth, alignItems: 'center' }}>
          <View style={[styles.statusCard, { 
            borderRadius: scale(16),
            padding: spacing(24),
            marginBottom: vscale(30),
            borderWidth: scale(1),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(6),
            elevation: scale(3)
          }]}>
            <LinearGradient
              colors={['#EEF2F6', '#E5EAEE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.statusIcon, { width: scale(64), height: scale(64), borderRadius: scale(32), marginBottom: vscale(16) }]}
            >
              <Icon name="pause" size={scale(28)} color="#8C9199" />
            </LinearGradient>
            <Text style={[styles.statusTitle, { fontSize: ms(20), marginBottom: vscale(8) }]}>You Can Step Away</Text>
            <Text style={[styles.statusSubtitle, { fontSize: ms(14) }]}>No explanation is required.</Text>
          </View>

          <View style={[styles.infoCard, { 
            borderRadius: scale(16),
            padding: spacing(20),
            marginBottom: vscale(40),
            borderWidth: scale(1)
          }]}>
            <Text style={[styles.infoText, { fontSize: ms(14), lineHeight: vscale(22) }]}>
              It is always okay to decline or step away from a request. Your safety and comfort come first.
            </Text>
          </View>

          <View style={[styles.buttonContainer, { gap: vscale(12) }]}>
            <TouchableOpacity 
              style={[styles.primaryButton, { 
                height: vscale(56),
                borderRadius: scale(12)
              }]} 
              onPress={handleBackHome}
            >
              <Text style={[styles.primaryButtonText, { fontSize: ms(16) }]}>Back to Home</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.secondaryButton, { 
                height: vscale(56),
                borderRadius: scale(12),
                borderWidth: scale(1)
              }]} 
              onPress={handleSetNotAvailable}
            >
              <Text style={[styles.secondaryButtonText, { fontSize: ms(16) }]}>Set Not Available</Text>
            </TouchableOpacity>
          </View>
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
  statusCard: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E9ECEF',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  statusIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontFamily: 'Inter-Bold',
    color: '#1A1C1E',
    textAlign: 'center',
  },
  statusSubtitle: {
    fontFamily: 'Inter-Regular',
    color: '#6C757D',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F3F5',
    width: '100%',
  },
  infoText: {
    fontFamily: 'Inter-Medium',
    color: '#495057',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Inter-SemiBold',
    color: '#495057',
  },
});

export default SteppedAwayScreen;

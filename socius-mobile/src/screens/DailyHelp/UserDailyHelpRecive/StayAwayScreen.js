import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import { useResponsive } from '../../../utils/responsive';

const StayAwayScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  const handleBackHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
    });
  };

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
            <View style={[styles.statusIcon, { width: scale(64), height: scale(64), borderRadius: scale(32), marginBottom: vscale(16) }]}>
              <Icon name="hand-right" size={scale(32)} color="#FF9500" />
            </View>
            <Text style={[styles.statusTitle, { fontSize: ms(20), marginBottom: vscale(8) }]}>Please Stay Away</Text>
            <Text style={[styles.statusSubtitle, { fontSize: ms(14) }]}>Authorities or specialists are handling this.</Text>
          </View>

          <View style={[styles.guidanceCard, { 
            borderRadius: scale(16),
            padding: spacing(20),
            marginBottom: vscale(40),
            borderWidth: scale(1)
          }]}>
            <Text style={[styles.guidanceTitle, { fontSize: ms(16), marginBottom: vscale(12) }]}>What you should do:</Text>
            <View style={[styles.guidanceRow, { marginBottom: vscale(12) }]}>
              <View style={[styles.dot, { width: scale(6), height: scale(6), borderRadius: scale(3), marginRight: spacing(10), marginTop: vscale(6) }]} />
              <Text style={[styles.guidanceText, { fontSize: ms(14) }]}>Do not approach the location shown on the map.</Text>
            </View>
            <View style={[styles.guidanceRow, { marginBottom: vscale(12) }]}>
              <View style={[styles.dot, { width: scale(6), height: scale(6), borderRadius: scale(3), marginRight: spacing(10), marginTop: vscale(6) }]} />
              <Text style={[styles.guidanceText, { fontSize: ms(14) }]}>Keep the area clear for emergency responders.</Text>
            </View>
            <View style={styles.guidanceRow}>
              <View style={[styles.dot, { width: scale(6), height: scale(6), borderRadius: scale(3), marginRight: spacing(10), marginTop: vscale(6) }]} />
              <Text style={[styles.guidanceText, { fontSize: ms(14) }]}>Wait for further updates if you are nearby.</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, { 
              height: vscale(56),
              borderRadius: scale(12)
            }]} 
            onPress={handleBackHome}
          >
            <Text style={[styles.primaryButtonText, { fontSize: ms(16) }]}>Back to Home</Text>
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
  statusCard: {
    backgroundColor: '#FFF9F2',
    borderColor: '#FFE5CC',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },
  statusIcon: {
    backgroundColor: '#FFE5CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontFamily: 'Inter-Bold',
    color: '#FF9500',
    textAlign: 'center',
  },
  statusSubtitle: {
    fontFamily: 'Inter-Regular',
    color: '#6C757D',
    textAlign: 'center',
  },
  guidanceCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F3F5',
    width: '100%',
  },
  guidanceTitle: {
    fontFamily: 'Inter-SemiBold',
    color: '#495057',
  },
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dot: {
    backgroundColor: '#ADB5BD',
  },
  guidanceText: {
    fontFamily: 'Inter-Regular',
    color: '#495057',
    flex: 1,
    lineHeight: 20,
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

export default StayAwayScreen;


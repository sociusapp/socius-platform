import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../../components/common/Header';
import Button from '../../../../components/common/Button';

import { useResponsive } from '../../../../utils/responsive';

const AwarenessClosedScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  const handleReturnHome = () => navigation.navigate('HomeScreen');

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
          <Text style={[styles.title, { fontSize: ms(20), marginBottom: vscale(10) }]}>Awareness Closed</Text>

          <View style={[styles.heroWrap, { marginBottom: vscale(10) }]}>
            <Image
              source={require('../../../../assets/images/awareness/02.png')}
              style={[styles.heroImage, { height: vscale(160) }]}
              resizeMode="contain"
            />
          </View>

          <View style={[styles.centerCard, { 
            borderRadius: scale(16),
            paddingHorizontal: spacing(16),
            paddingVertical: vscale(14),
            marginBottom: vscale(14),
            borderWidth: scale(1),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(6),
            elevation: scale(2)
          }]}>
            <Text style={[styles.centerMain, { fontSize: ms(15), marginBottom: vscale(6) }]}>This awareness request has ended.</Text>
            <Text style={[styles.centerSub, { fontSize: ms(12) }]}>No further action is expected.</Text>
          </View>

          <View style={[styles.blockCard, { 
            borderRadius: scale(16),
            paddingHorizontal: spacing(16),
            paddingVertical: vscale(14),
            marginBottom: vscale(14),
            borderWidth: scale(1),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(6),
            elevation: scale(2)
          }]}>
            <Text style={[styles.blockHeader, { fontSize: ms(13), marginBottom: vscale(10) }]}>Why this may happen</Text>
            <View style={[styles.listRow, { marginBottom: vscale(10) }]}><Icon name="lock-outline" size={scale(18)} color="#999999" /><Text style={[styles.listText, { fontSize: ms(14), marginLeft: spacing(10) }]}>The requester closed the request</Text></View>
            <View style={[styles.listRow, { marginBottom: vscale(10) }]}><Icon name="clock-outline" size={scale(18)} color="#999999" /><Text style={[styles.listText, { fontSize: ms(14), marginLeft: spacing(10) }]}>Time limit was reached</Text></View>
            <View style={styles.listRow}><Icon name="wifi-off" size={scale(18)} color="#999999" /><Text style={[styles.listText, { fontSize: ms(14), marginLeft: spacing(10) }]}>The requester went offline</Text></View>
          </View>

          <View style={[styles.blockCard, { 
            borderRadius: scale(16),
            paddingHorizontal: spacing(16),
            paddingVertical: vscale(14),
            marginBottom: vscale(14),
            borderWidth: scale(1),
            shadowOffset: { width: 0, height: vscale(2) },
            shadowRadius: scale(6),
            elevation: scale(2)
          }]}>
            <Text style={[styles.blockHeader, { fontSize: ms(13), marginBottom: vscale(10) }]}>What you should do now</Text>
            <View style={[styles.listRow, { marginBottom: vscale(10) }]}><Icon name="home-outline" size={scale(18)} color="#999999" /><Text style={[styles.listText, { fontSize: ms(14), marginLeft: spacing(10) }]}>Resume your day</Text></View>
            <View style={[styles.listRow, { marginBottom: vscale(10) }]}><Icon name="check-circle-outline" size={scale(18)} color="#999999" /><Text style={[styles.listText, { fontSize: ms(14), marginLeft: spacing(10) }]}>No follow-up is required</Text></View>
            <View style={styles.listRow}><Icon name="phone-outline" size={scale(18)} color="#999999" /><Text style={[styles.listText, { fontSize: ms(14), marginLeft: spacing(10) }]}>Use emergency contacts if you still have concerns</Text></View>
          </View>

          <Text style={[styles.helperText, { fontSize: ms(12), marginBottom: vscale(14) }]}>Closing a request does not mean something went wrong.</Text>

          <Button title="Return Home" onPress={handleReturnHome} variant="gradient" size="large" fullWidth />

          <View style={[styles.sectionDivider, { height: scale(1), marginVertical: vscale(12) }]} />
          <Text style={[styles.footerNote, { fontSize: ms(12) }]}>Socius does not keep incidents open after closure.</Text>
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
    color: '#B23B35',
    textAlign: 'center',
  },
  heroWrap: {
    alignItems: 'center',
  },
  heroImage: {
    width: '100%',
  },
  centerCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    alignItems: 'center',
  },
  centerMain: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  centerSub: {
    color: '#666666',
    textAlign: 'center',
  },
  blockCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
  },
  blockHeader: {
    fontWeight: '700',
    color: '#999999',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listText: {
    color: '#2C3E50',
  },
  helperText: {
    textAlign: 'center',
    color: '#666666',
  },
  sectionDivider: {
    backgroundColor: '#E8EAED',
  },
  footerNote: {
    textAlign: 'center',
    color: '#999999',
  },
});

export default AwarenessClosedScreen;

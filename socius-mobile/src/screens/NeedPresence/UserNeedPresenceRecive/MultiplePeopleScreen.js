import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../../components/common/Header';
import Button from '../../../components/common/Button';
import { useResponsive } from '../../../utils/responsive';

const MultiplePeopleScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const handleContinue = () => navigation.navigate('AwarenessProgress');
  const handleStepAway = () => navigation.navigate('SteppedAway');

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ padding: scale(8) }}>
            <Icon name="cog" size={scale(24)} color="#999999" />
          </TouchableOpacity>
        }
        style={[styles.header, { paddingHorizontal: spacing(16) }]}
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing(20), paddingTop: vscale(20), paddingBottom: vscale(60) }]} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <Text style={[styles.title, { fontSize: ms(20), marginBottom: vscale(10) }]}>Multiple People Are Aware</Text>

          <View style={[styles.heroWrap, { marginBottom: vscale(12) }]}>
            <Image
              source={require('../../../assets/images/awareness/01.png')}
              style={[styles.heroImage, { height: vscale(180) }]}
              resizeMode="contain"
            />
          </View>

          <View style={[styles.infoPanel, { borderRadius: scale(16), paddingHorizontal: spacing(14), paddingVertical: vscale(14), marginBottom: vscale(12), shadowRadius: scale(6), elevation: scale(2), borderWidth: scale(1) }]}>
            <Text style={[styles.panelTitle, { fontSize: ms(15), marginBottom: vscale(6) }]}>Others nearby have also seen this request.</Text>
            <Text style={[styles.panelSub, { fontSize: ms(12) }]}>You are part of a visible group — not acting alone.</Text>
          </View>

          <View style={[styles.listWrap, { marginBottom: vscale(8) }]}>
            <View style={[styles.listRow, { gap: spacing(10), marginBottom: vscale(10) }]}><Icon name="map-marker" size={scale(18)} color="#DC5C69" /><Text style={[styles.listText, { fontSize: ms(14) }]}>Stay in public, open areas</Text></View>
            <View style={[styles.listRow, { gap: spacing(10), marginBottom: vscale(10) }]}><Icon name="home-outline" size={scale(18)} color="#999999" /><Text style={[styles.listText, { fontSize: ms(14) }]}>Avoid private or isolated spaces</Text></View>
            <View style={[styles.listRow, { gap: spacing(10), marginBottom: vscale(10) }]}><Icon name="eye-outline" size={scale(18)} color="#999999" /><Text style={[styles.listText, { fontSize: ms(14) }]}>Let others remain within view</Text></View>
            <View style={[styles.listRow, { gap: spacing(10), marginBottom: vscale(10) }]}><Icon name="shield-outline" size={scale(18)} color="#999999" /><Text style={[styles.listText, { fontSize: ms(14) }]}>Collective presence reduces risk</Text></View>
          </View>

          <Text style={[styles.helperText, { fontSize: ms(13), marginBottom: vscale(4) }]}>Socius encourages visibility, not isolation.</Text>
          <Text style={[styles.helperText, { fontSize: ms(13), marginBottom: vscale(16) }]}>No one is expected to act alone.</Text>

          <Button title="Continue" onPress={handleContinue} variant="gradient" size="large" fullWidth style={{ marginBottom: vscale(12) }} />
          <Button title="Step Away" onPress={handleStepAway} variant="white" size="large" fullWidth style={{ marginBottom: vscale(12) }} />

          <View style={[styles.sectionDivider, { height: scale(1), marginVertical: vscale(12) }]} />
          <Text style={[styles.footerNote, { fontSize: ms(12) }]}>You may leave at any time without explanation.</Text>
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
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'stretch',
  },
  title: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  heroWrap: {
    alignItems: 'center',
  },
  heroImage: {
    width: '100%',
  },
  infoPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
  },
  panelTitle: {
    fontWeight: '700',
    color: '#2C3E50',
  },
  panelSub: {
    color: '#666666',
  },
  listWrap: {
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

export default MultiplePeopleScreen;

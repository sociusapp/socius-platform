import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { useResponsive } from '../../../utils/responsive';

const SafetyGuidanceScreen = ({ navigation, route }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  const { category, reason, query } = route.params || {};

  const handleContinue = () => {
    navigation.navigate('BeforeShare', { category, reason, query });
  };

  const handleStepAway = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={[styles.header, { paddingHorizontal: spacing(16), paddingVertical: vscale(12), borderBottomWidth: scale(1) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { padding: scale(8), marginLeft: -spacing(8) }]}>
          <Icon name="arrow-left" size={scale(24)} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: ms(18) }]}>You Are Not Alone Here</Text>
        <View style={{ width: scale(24) }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { padding: spacing(24), paddingBottom: vscale(40) }]} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentWidth, alignItems: 'center' }}>
          <Image 
            source={require('../../../assets/images/awareness/03.png')} 
            style={[styles.heroImage, { height: vscale(180), marginBottom: vscale(24) }]} 
            resizeMode="contain"
          />
          
          <View style={[styles.infoCard, { borderRadius: scale(16), padding: spacing(20), marginBottom: vscale(32), borderWidth: scale(1), shadowRadius: scale(12), elevation: scale(3) }]}>
            <Text style={[styles.infoCardTitle, { fontSize: ms(16), marginBottom: vscale(8) }]}>Others nearby have also seen this request.</Text>
            <Text style={[styles.infoCardText, { fontSize: ms(14), lineHeight: vscale(20) }]}>This is shared awareness, not a solo situation.</Text>
          </View>

          <View style={[styles.tipsList, { marginBottom: vscale(32) }]}>
            <View style={[styles.tipItem, { paddingVertical: vscale(12) }]}>
              <Icon name="map-marker" size={scale(22)} color="#C62828" style={[styles.tipIcon, { width: scale(32), marginRight: spacing(12) }]} />
              <Text style={[styles.tipText, { fontSize: ms(15) }]}>Stay in open, visible places</Text>
            </View>
            <View style={[styles.tipDivider, { height: scale(1), marginLeft: spacing(44) }]} />
            
            <View style={[styles.tipItem, { paddingVertical: vscale(12) }]}>
              <Icon name="eye" size={scale(22)} color="#546E7A" style={[styles.tipIcon, { width: scale(32), marginRight: spacing(12) }]} />
              <Text style={[styles.tipText, { fontSize: ms(15) }]}>Let others remain within view</Text>
            </View>
            <View style={[styles.tipDivider, { height: scale(1), marginLeft: spacing(44) }]} />

            <View style={[styles.tipItem, { paddingVertical: vscale(12) }]}>
              <Icon name="door-open" size={scale(22)} color="#78909C" style={[styles.tipIcon, { width: scale(32), marginRight: spacing(12) }]} />
              <Text style={[styles.tipText, { fontSize: ms(15) }]}>Avoid private or enclosed areas</Text>
            </View>
          </View>

          <View style={[styles.sociusNoteWrap, { marginBottom: vscale(24) }]}>
            <View style={[styles.hairline, { height: scale(1), marginBottom: vscale(12) }]} />
            <Text style={[styles.sociusNote, { fontSize: ms(13), marginBottom: vscale(12) }]}>Socius encourages visibility, not action.</Text>
            <View style={[styles.hairline, { height: scale(1), marginBottom: vscale(12) }]} />
          </View>

          <TouchableOpacity onPress={handleContinue} activeOpacity={0.8} style={{ width: '100%' }}>
            <LinearGradient
              colors={['#E53935', '#C62828']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.continueButton, { paddingVertical: vscale(16), borderRadius: scale(30), minWidth: scale(300), marginBottom: vscale(16), shadowRadius: scale(8), elevation: scale(4) }]}
            >
              <Text style={[styles.continueButtonText, { fontSize: ms(18) }]}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleStepAway} style={[styles.stepAwayButton, { paddingVertical: vscale(12), paddingHorizontal: spacing(24), marginBottom: vscale(24) }]}>
            <Text style={[styles.stepAwayText, { fontSize: ms(16) }]}>Step Away</Text>
          </TouchableOpacity>

          <View style={[styles.bottomDivider, { height: scale(1), marginBottom: vscale(16) }]} />
          <Text style={[styles.bottomNote, { fontSize: ms(13) }]}>Presence does not require engagement.</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#37474F',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
    paddingBottom: 40,
  },
  heroImage: {
    width: '100%',
    height: 180,
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#37474F',
    marginBottom: 8,
  },
  infoCardText: {
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 20,
  },
  tipsList: {
    width: '100%',
    marginBottom: 32,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  tipIcon: {
    width: 32,
    textAlign: 'center',
    marginRight: 12,
  },
  tipText: {
    fontSize: 15,
    color: '#455A64',
    flex: 1,
  },
  tipDivider: {
    height: 1,
    backgroundColor: '#ECEFF1',
    marginLeft: 44,
  },
  sociusNoteWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  hairline: {
    height: 1,
    backgroundColor: '#ECEFF1',
    width: '100%',
    marginBottom: 12,
  },
  sociusNote: {
    fontSize: 13,
    color: '#78909C',
    marginBottom: 12,
  },
  continueButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    minWidth: 300,
    marginBottom: 16,
    shadowColor: '#C62828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  stepAwayButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  stepAwayText: {
    fontSize: 16,
    color: '#78909C',
    fontWeight: '600',
  },
  bottomDivider: {
    height: 1,
    backgroundColor: '#ECEFF1',
    width: '100%',
    marginBottom: 16,
  },
  bottomNote: {
    fontSize: 13,
    color: '#90A4AE',
    fontStyle: 'italic',
  },
});

export default SafetyGuidanceScreen;

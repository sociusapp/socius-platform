import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../../../components/common/Header';
import Button from '../../../../components/common/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useResponsive } from '../../../../utils/responsive';

const HighRiskAreaScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Header 
        title="High-Risk Area Detected" 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: 0 }}
        titleStyle={{ fontSize: ms(16) }}
      />
      
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing(20), paddingBottom: vscale(30) }]} showsVerticalScrollIndicator={false}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          {/* Illustration */}
          <View style={[styles.illustrationContainer, { height: vscale(130), marginBottom: vscale(1) }]}>
            <Image 
              source={require('../../../../assets/images/awareness/06.png')}
              style={styles.illustrationImage}
              resizeMode="contain"
            />
          </View>

          {/* Warning Card */}
          <View style={[styles.warningCard, { borderRadius: scale(16), padding: spacing(20), shadowRadius: scale(8), elevation: scale(4), marginBottom: vscale(10), borderWidth: scale(1) }]}>
            <Text style={[styles.warningTitle, { fontSize: ms(16), marginBottom: vscale(8) }]}>This location may not be safe for civilian presence.</Text>
            <Text style={[styles.warningSubtitle, { fontSize: ms(14) }]}>Isolation, time, or environment increases risk.</Text>
          </View>

          {/* What this means Card */}
          <View style={[styles.infoCard, { borderRadius: scale(16), padding: spacing(16), marginBottom: vscale(16), borderWidth: scale(1) }]}>
            <Text style={[styles.cardHeader, { fontSize: ms(16), marginBottom: vscale(10) }]}>What this means</Text>
            <View style={[styles.divider, { height: scale(1), marginBottom: vscale(10) }]} />
            
            <View style={[styles.listItem, { marginBottom: vscale(12), gap: spacing(12) }]}>
              <View style={[styles.iconBox, { width: scale(24) }]}>
                <Icon name="eye-outline" size={scale(18)} color="#5D6D7E" />
              </View>
              <Text style={[styles.listItemText, { fontSize: ms(15) }]}>Limited visibility</Text>
            </View>
            
            <View style={[styles.listItem, { marginBottom: vscale(12), gap: spacing(12) }]}>
              <View style={[styles.iconBox, { width: scale(24) }]}>
                <Icon name="map-marker-outline" size={scale(18)} color="#5D6D7E" />
              </View>
              <Text style={[styles.listItemText, { fontSize: ms(15) }]}>Few people nearby</Text>
            </View>
            
            <View style={[styles.listItem, { marginBottom: vscale(12), gap: spacing(12) }]}>
              <View style={[styles.iconBox, { width: scale(24) }]}>
                <Icon name="shield-alert-outline" size={scale(18)} color="#5D6D7E" />
              </View>
              <Text style={[styles.listItemText, { fontSize: ms(15) }]}>Higher personal risk</Text>
            </View>
          </View>

          {/* Recommended Options Card */}
          <View style={[styles.infoCard, { borderRadius: scale(16), padding: spacing(16), marginBottom: vscale(16), borderWidth: scale(1) }]}>
            <Text style={[styles.cardHeader, { fontSize: ms(16), marginBottom: vscale(10) }]}>Recommended options</Text>
            <View style={[styles.divider, { height: scale(1), marginBottom: vscale(10) }]} />
            
            <View style={[styles.listItem, { marginBottom: vscale(12), gap: spacing(12) }]}>
              <View style={[styles.iconBox, { width: scale(24) }]}>
                <Icon name="account" size={scale(18)} color="#5D6D7E" />
              </View>
              <Text style={[styles.listItemText, { fontSize: ms(15) }]}>Do not approach alone</Text>
            </View>
            
            <View style={[styles.listItem, { marginBottom: vscale(12), gap: spacing(12) }]}>
              <View style={[styles.iconBox, { width: scale(24) }]}>
                <Icon name="phone-in-talk" size={scale(18)} color="#5D6D7E" />
              </View>
              <Text style={[styles.listItemText, { fontSize: ms(15) }]}>Use emergency contacts instead</Text>
            </View>
            
            <View style={[styles.listItem, { marginBottom: vscale(12), gap: spacing(12) }]}>
              <View style={[styles.iconBox, { width: scale(24) }]}>
                <Icon name="police-badge" size={scale(18)} color="#5D6D7E" />
              </View>
              <Text style={[styles.listItemText, { fontSize: ms(15) }]}>Let authorities handle it</Text>
            </View>
          </View>

          <View style={[styles.dividerFull, { height: scale(1), marginVertical: vscale(16) }]} />

          <Text style={[styles.decisionNote, { fontSize: ms(14), marginBottom: vscale(20) }]}>
            Choosing not to go is a responsible decision.
          </Text>

          <View style={[styles.actionContainer, { gap: vscale(12), marginBottom: vscale(16) }]}>
            <Button 
              title="Contact Emergency Services" 
              onPress={() => navigation.navigate('EmergencyHelp')} 
              variant="emergency"
              fullWidth
              style={[styles.emergencyButton, { borderRadius: scale(30) }]}
            />
            
            <Button 
              title="Step Back" 
              onPress={() => navigation.goBack()} 
              variant="white"
              fullWidth
              style={[styles.stepBackButton, { borderRadius: scale(30) }]}
            />
          </View>

          <Text style={[styles.footerNote, { fontSize: ms(12), paddingHorizontal: spacing(20) }]}>
            Socius does not expect civilian presence in high-risk locations.
          </Text>
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
    alignItems: 'center',
  },
  illustrationContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationImage: {
    width: '100%',
    height: '100%',
  },
  warningCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    borderColor: '#F0F0F0',
  },
  warningTitle: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  warningSubtitle: {
    color: '#5D6D7E',
    textAlign: 'center',
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderColor: '#EAECEE',
  },
  cardHeader: {
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  divider: {
    backgroundColor: '#E0E0E0',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemText: {
    color: '#5D6D7E',
    flex: 1,
  },
  dividerFull: {
    width: '100%',
    backgroundColor: '#E0E0E0',
  },
  decisionNote: {
    color: '#5D6D7E',
    textAlign: 'center',
  },
  actionContainer: {
    width: '100%',
  },
  emergencyButton: {
    backgroundColor: '#D3453D', // Emergency Red
  },
  stepBackButton: {
  },
  footerNote: {
    color: '#7F8C8D',
    textAlign: 'center',
  },
});

export default HighRiskAreaScreen;

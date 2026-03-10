import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../../../utils/responsive';

const BeforeShareScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={[styles.header, { paddingHorizontal: spacing(16), paddingVertical: vscale(12), borderBottomWidth: scale(1) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { padding: scale(4), marginLeft: -spacing(8) }]}>
          <Icon name="chevron-left" size={scale(32)} color="#5A5A5A" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: ms(18) }]}>Socius</Text>
        <View style={[styles.headerRight, { width: scale(40) }]} />
      </View>

      <View style={[styles.content, { paddingHorizontal: spacing(24), paddingTop: vscale(40) }]}>
        <View style={{ width: contentWidth, alignItems: 'center' }}>
          <Text style={[styles.title, { fontSize: ms(24), marginBottom: vscale(20) }]}>Before You Share</Text>
          
          <View style={[styles.divider, { height: scale(1), marginBottom: vscale(30) }]} />

          <View style={styles.textContainer}>
            <Text style={[styles.infoText, { fontSize: ms(16), lineHeight: vscale(24), marginBottom: vscale(24) }]}>
              This shares information, not emergency response.
            </Text>
            
            <Text style={[styles.infoText, { fontSize: ms(16), lineHeight: vscale(24), marginBottom: vscale(24) }]}>
              People nearby may choose to be aware — they may or may not come.
            </Text>
            
            <Text style={[styles.infoText, { fontSize: ms(16), lineHeight: vscale(24), marginBottom: vscale(24) }]}>
              You can contact emergency services at any time.
            </Text>
          </View>
        </View>

        <View style={styles.spacer} />

        <View style={[styles.buttonContainer, { width: contentWidth, paddingBottom: vscale(40) }]}>
          <TouchableOpacity 
            style={[styles.primaryButton, { height: vscale(56), borderRadius: scale(28), marginBottom: vscale(16), shadowRadius: scale(8), elevation: scale(5) }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ShareLocation')}
          >
            <LinearGradient
              colors={['#D84D42', '#C63F34']}
              style={styles.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Text style={[styles.primaryButtonText, { fontSize: ms(18) }]}>Continue to Share</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.secondaryButton, { height: vscale(56), borderRadius: scale(28), borderWidth: scale(1), marginBottom: vscale(12), shadowRadius: scale(4), elevation: scale(2) }]}
            activeOpacity={0.8}
            onPress={() => {
              navigation.navigate('EmergencyHelp');
            }}
          >
            <Text style={[styles.secondaryButtonText, { fontSize: ms(16) }]}>Contact Emergency Services</Text>
          </TouchableOpacity>
          
          <Text style={[styles.helperText, { fontSize: ms(14), marginTop: vscale(4) }]}>If this is urgent or dangerous</Text>
        </View>
      </View>
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
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
  },
  headerTitle: {
    fontWeight: '600',
    color: '#5A5A5A',
  },
  headerRight: {
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
    color: '#546E7A',
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    backgroundColor: '#F0F0F0',
  },
  textContainer: {
    width: '100%',
  },
  infoText: {
    color: '#546E7A',
    textAlign: 'left',
  },
  spacer: {
    flex: 1,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    overflow: 'hidden',
    shadowColor: '#D84D42',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#E0E0E0',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
  },
  secondaryButtonText: {
    color: '#546E7A',
    fontWeight: '600',
  },
  helperText: {
    color: '#78909C',
  },
});

export default BeforeShareScreen;


import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import Button from '../../components/common/Button';

const WhatSociusIsScreen = ({ navigation }) => {
  const { contentWidth, titleFont, subtitleFont, bodyFont, smallFont, scale, vscale, spacing, height } = useResponsive();
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { paddingHorizontal: spacing(20), paddingVertical: vscale(20) }]}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/icons/icon-03.png')} 
            style={{ width: scale(60), height: scale(60), resizeMode: 'contain', marginBottom: vscale(4) }} 
          />
          <Text style={[styles.logoText, { fontSize: titleFont(28), letterSpacing: scale(0.5) }]}>Socius</Text>
        </View>

        {/* Card */}
        <View style={[styles.card, { width: contentWidth, padding: spacing(20), borderRadius: scale(20) }]}>
          <Text style={[styles.cardTitle, { fontSize: titleFont(22), marginBottom: vscale(10) }]}>What Socius Is</Text>
          
          <View style={[styles.divider, { marginBottom: vscale(12), height: vscale(1) }]} />

          <Text style={[styles.description, { fontSize: bodyFont(14), lineHeight: bodyFont(20), marginBottom: vscale(10) }] }>
            Socius is a community awareness platform.
          </Text>
          
          <Text style={[styles.description, { fontSize: bodyFont(14), lineHeight: bodyFont(20), marginBottom: vscale(10) }] }>
            It helps people share information and stay connected during moments of concern or uncertainty.
          </Text>
          
          <Text style={[styles.description, { fontSize: bodyFont(14), lineHeight: bodyFont(20), marginBottom: vscale(10) }] }>
            When something feels wrong, Socius helps nearby people become aware — calmly and voluntarily.
          </Text>

          {/* Icons */}
          <View style={[styles.iconsContainer, { marginTop: vscale(15) }]}>
            <View style={styles.iconItem}>
              <View style={[styles.iconCircle, { width: scale(56), height: scale(56), borderRadius: scale(28), marginBottom: vscale(6) }]}>
                <Image
                  source={require('../../assets/icons/icon-05.png')}
                  style={[styles.iconImage, { width: scale(80), height: scale(80) }]}
                />
              </View>
              <Text style={[styles.iconLabel, { fontSize: smallFont(10) }]}>Information</Text>
            </View>

            <View style={styles.iconItem}>
              <View style={[styles.iconCircle, { width: scale(56), height: scale(56), borderRadius: scale(28), marginBottom: vscale(6) }]}>
                <Image
                  source={require('../../assets/icons/icon-06.png')}
                  style={[styles.iconImage, { width: scale(80), height: scale(80) }]}
                />
              </View>
              <Text style={[styles.iconLabel, { fontSize: smallFont(10) }]}>Awareness</Text>
            </View>

            <View style={styles.iconItem}>
              <View style={[styles.iconCircle, { width: scale(56), height: scale(56), borderRadius: scale(28), marginBottom: vscale(6) }]}>
                <Image
                  source={require('../../assets/icons/icon-07.png')}
                  style={[styles.iconImage, { width: scale(60), height: scale(60) }]}
                />
              </View>
              <Text style={[styles.iconLabel, { fontSize: smallFont(10) }]}>Calm Presence</Text>
            </View>
          </View>
        </View>

        {/* Continue Button */}
        <View style={{ width: contentWidth, marginBottom: vscale(10) }}>
          <Button
            title="Continue"
            onPress={() => navigation.navigate('WhatSociusIsNot')}
            fullWidth
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoText: {
    fontWeight: '700',
    color: '#4A4A4A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    elevation: 8,
  },
  cardTitle: {
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
  },
  divider: {
    backgroundColor: '#E0E0E0',
  },
  description: {
    color: '#5A6C7D',
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  iconItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  iconImage: {
    resizeMode: 'contain',
  },
  iconLabel: {
    color: '#5A6C7D',
    fontWeight: '500',
    textAlign: 'center',
  },
  eyeRay: {
    position: 'absolute',
    width: 2,
    height: 8,
    backgroundColor: '#E89892',
    top: -10,
  },
  eyeRay2: {
    transform: [{ rotate: '45deg' }],
  },
  eyeRay3: {
    transform: [{ rotate: '-45deg' }],
  },
  lotusIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lotusPetal: {
    backgroundColor: '#EFA7A2',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  lotusPetal2: {
    position: 'absolute',
    transform: [{ rotate: '30deg' }],
    opacity: 0.8,
  },
  lotusPetal3: {
    position: 'absolute',
    transform: [{ rotate: '-30deg' }],
    opacity: 0.8,
  },
});

export default WhatSociusIsScreen;

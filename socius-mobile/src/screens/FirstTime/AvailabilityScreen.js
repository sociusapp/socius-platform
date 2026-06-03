import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import Button from '../../components/common/Button';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AvailabilityScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  const handleGotIt = async () => {
    try {
      // Mark First Time flow as completed
      await AsyncStorage.setItem('HAS_COMPLETED_FIRST_TIME_FLOW', 'true');
    } catch (e) {
      // ignore storage errors and proceed
    }
    // Navigate to MainApp (Home)
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp', params: { screen: 'HomeTab' } }],
    });
  };

  const handleLearnMore = () => {
    console.log('Learn how availability works pressed');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing(16), paddingTop: vscale(35), paddingBottom: vscale(30) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          {/* Logo Header */}
          <View style={[styles.logoSection, { marginBottom: vscale(16) }]}>
            <Image 
              source={require('../../assets/icons/icon-03.png')} 
              style={{ width: scale(32), height: scale(32), resizeMode: 'contain', marginRight: spacing(8) }} 
            />
            <Text style={[styles.logoText, { fontSize: ms(24) }]}>Socius</Text>
          </View>

          {/* Divider */}
          <View style={[styles.headerDivider, { marginBottom: vscale(32), height: scale(1) }]} />

          {/* Title Section */}
          <View style={[styles.titleSection, { marginBottom: vscale(32) }]}>
            <Text style={[styles.mainTitle, { fontSize: ms(26), lineHeight: ms(32), marginBottom: vscale(8) }]}>
              You control when {"\n"} you're available.
            </Text>
          </View>

          {/* Info Card */}
          <View style={[styles.infoCard, { 
            borderRadius: scale(24), 
            paddingHorizontal: spacing(20), 
            paddingVertical: vscale(28), 
            marginBottom: vscale(28),
            borderWidth: scale(1),
            shadowOffset: { width: 0, height: vscale(4) },
            shadowRadius: scale(12),
            elevation: scale(4)
          }]}>
            <View style={[styles.iconContainerLarge, { marginBottom: vscale(20) }]}>
              <Icon name="toggle-switch" size={scale(48)} color="#DC5C69" />
            </View>

            <View style={styles.bulletContainer}>
              <Text style={[styles.infoText, { fontSize: ms(15), lineHeight: ms(22), marginBottom: vscale(12), textAlign: 'center' }]}>
                Being available is always your choice.
              </Text>
              <Text style={[styles.infoText, { fontSize: ms(15), lineHeight: ms(22), marginBottom: vscale(12), textAlign: 'center' }]}>
                You are never required to respond.
              </Text>
              <Text style={[styles.infoText, { fontSize: ms(15), lineHeight: ms(22), marginBottom: vscale(12), textAlign: 'center' }]}>
                You can switch availability on or off at any time.
              </Text>
            </View>
          </View>

          {/* Subtext Section */}
          <View style={[styles.subtextContainer, { marginBottom: vscale(30), alignItems: 'center' }]}>
            <Text style={[styles.subtext, { fontSize: ms(14), color: '#777777', textAlign: 'center', lineHeight: ms(20) }]}>
              Socius never expects action. {"\n"}
              Your safety, comfort, and judgment always come first.
            </Text>
          </View>

          {/* Spacer */}
          <View style={[styles.spacer, { minHeight: vscale(20) }]} />

          {/* Got it Button */}
          <Button
            title="Got it"
            onPress={handleGotIt}
            variant="gradient"
            fullWidth
          />

          {/* Learn More Link */}
          <TouchableOpacity onPress={handleLearnMore} style={{ marginTop: vscale(16), alignItems: 'center' }}>
            <Text style={{ fontSize: ms(14), color: '#777777', textDecorationLine: 'underline' }}>
              Learn how availability works
            </Text>
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
  scrollContent: {
    flexGrow: 1,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontWeight: '600',
    color: '#999999',
  },
  headerDivider: {
    backgroundColor: '#E8EAED',
  },
  titleSection: {
    alignItems: 'center',
  },
  mainTitle: {
    fontWeight: '700',
    color: '#555555',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderColor: '#E8EAED',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    width: '100%',
  },
  iconContainerLarge: {
  },
  bulletContainer: {
    width: '100%',
  },
  infoText: {
    fontWeight: '400',
    color: '#555555',
  },
  subtextContainer: {
    width: '100%',
  },
  subtext: {
    fontWeight: '400',
  },
  spacer: {
    flex: 1,
  },
});

export default AvailabilityScreen;

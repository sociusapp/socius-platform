import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/common/Button';
import { useResponsive } from '../../utils/responsive';

const WelcomeScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { alignItems: 'center', paddingHorizontal: spacing(30), paddingBottom: vscale(20) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth }}>
          {/* Onboarding */}
          <View style={{ marginBottom: vscale(12) }}>
            <Button
              title="Onboarding"
              onPress={() => navigation.navigate('WhatSociusIs')}
              fullWidth
            />
          </View>
 
          {/* First Time Users */}
          <View style={{ marginBottom: vscale(12) }}>
            <Button
              title="First Time Users"
              onPress={() => navigation.navigate('AvailabilityRoles')}
              fullWidth
            />
          </View>

          {/* Guide for users */}
          <View style={{ marginBottom: vscale(12) }}>
            <Button
              title="Guide for users"
              onPress={() => navigation.navigate('YourRole')}
              fullWidth
            />
          </View>

          {/* Home Flow */}
          <View style={{ marginBottom: vscale(12) }}>
            <Button
              title="Home Flow"
              onPress={() => navigation.navigate('MainApp')}
              fullWidth
            />
          </View>
 
          {/* Dev Launcher */}
          <View style={{ marginBottom: vscale(12) }}>
            <Button
              title="DevLauncher"
              onPress={() => navigation.navigate('DevLauncher')}
              fullWidth
              variant="gradient"
            />
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});

export default WelcomeScreen;

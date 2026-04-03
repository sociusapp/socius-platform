import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AppUpdateManager from './AppUpdateManager';

const YourApp = () => {
  return (
    <View style={styles.container}>
      {/* Your existing app content */}
      <View style={styles.content}>
        <Text style={styles.title}>Socius App</Text>
        <Text style={styles.subtitle}>Your main app content here</Text>
        
        {/* Manual update check button */}
        <TouchableOpacity style={styles.checkButton} onPress={() => {
          // You can call the update check manually
          console.log('Checking for updates...');
        }}>
          <Text style={styles.checkButtonText}>Check for Updates</Text>
        </TouchableOpacity>
      </View>
      
      {/* Update Manager - handles automatic updates */}
      <AppUpdateManager />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 30,
    textAlign: 'center',
  },
  checkButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default YourApp;

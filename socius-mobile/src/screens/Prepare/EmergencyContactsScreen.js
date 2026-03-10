import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/common/Header';
import { useResponsive } from '../../utils/responsive';

const EmergencyContactsScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Emergency Contacts" 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { 
          paddingHorizontal: spacing(20),
          paddingTop: vscale(20),
          paddingBottom: vscale(40),
          alignItems: 'center'
        }]} 
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: contentWidth, alignItems: 'center' }}>
          <Text style={[styles.title, { fontSize: ms(22), marginBottom: vscale(12) }]}>Emergency Contacts</Text>
          <Text style={[styles.description, { fontSize: ms(16) }]}>This screen is under development.</Text>
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
  title: {
    fontWeight: '700',
    color: '#1A1C1E',
    textAlign: 'center',
  },
  description: {
    color: '#42474E',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default EmergencyContactsScreen;

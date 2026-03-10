import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../../components/common/Header';
import { useResponsive } from '../../../utils/responsive';

const NearDubaiedAreaScreen = ({ navigation }) => {
  const { contentWidth, ms, spacing, vscale, scale } = useResponsive();

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Near Dubaied Area" 
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
          <Text style={[styles.title, { fontSize: ms(22), marginBottom: vscale(12) }]}>Near Dubaied Area</Text>
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
    color: '#2C3E50',
    textAlign: 'center',
  },
  description: {
    color: '#666666',
    textAlign: 'center',
  },
});

export default NearDubaiedAreaScreen;

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import Button from '../../components/common/Button';
import Header from '../../components/common/Header';
import StaticPageViewer from '../../components/common/StaticPageViewer';

const WhatSociusIsNotScreen = ({ navigation }) => {
  const { contentWidth, scale, vscale, spacing } = useResponsive();

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="What Socius is NOT" 
        onBackPress={() => navigation.goBack()} 
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />
      
      <View style={styles.contentContainer}>
        <StaticPageViewer slug="what-socius-is-not" />
      </View>

      {/* Footer Button */}
      <View style={[styles.footer, { paddingHorizontal: spacing(20), paddingVertical: vscale(12), paddingBottom: vscale(24), borderTopWidth: scale(1) }]}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <Button 
            title="I Understand" 
            onPress={() => navigation.navigate('Principles')}
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
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100, // Ensure content is not hidden behind footer
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E8EAED',
  },
});

export default WhatSociusIsNotScreen;

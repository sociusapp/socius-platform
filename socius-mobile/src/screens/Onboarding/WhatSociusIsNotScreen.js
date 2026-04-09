import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import Button from '../../components/common/Button';
import Header from '../../components/common/Header';
import StaticPageViewer from '../../components/common/StaticPageViewer';
import BottomActionBar from '../../components/common/BottomActionBar';

const FALLBACK_HTML = `<h1>What Socius is not</h1>
<p>Socius is not emergency services, medical or legal advice, or a guarantee that someone will be present.</p>
<p>It is a tool for voluntary community awareness. Use local emergency numbers when needed.</p>`;

const WhatSociusIsNotScreen = ({ navigation }) => {
  const { contentWidth, scale, vscale, spacing } = useResponsive();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header 
        title="What Socius is NOT" 
        onBackPress={() => navigation.goBack()} 
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />
      
      <View style={styles.contentContainer}>
        <StaticPageViewer slug="what-socius-is-not" fallbackContent={FALLBACK_HTML} />
      </View>

      <BottomActionBar style={{ paddingHorizontal: spacing(20) }} contentStyle={{ width: contentWidth, alignSelf: 'center' }}>
        <View style={{ width: contentWidth, alignSelf: 'center' }}>
          <Button 
            title="I Understand" 
            onPress={() => navigation.navigate('Principles')}
            fullWidth
          />
        </View>
      </BottomActionBar>
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
    paddingBottom: 16,
  },
});

export default WhatSociusIsNotScreen;

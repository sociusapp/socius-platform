import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/common/Header';
import StaticPageViewer from '../../components/common/StaticPageViewer';
import { useResponsive } from '../../utils/responsive';

const FALLBACK_DATA_PRIVACY_HTML = `<h1>Data privacy</h1>
<p>Socius limits data collection to what the product needs. Location and verification data are used only as described in the app.</p>
<p>For the full page, seed static pages on the server or see Privacy Policy in settings.</p>`;

const DataPrivacyScreen = ({ navigation }) => {
  const { scale } = useResponsive();

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Data Privacy" 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />
      <View style={styles.contentContainer}>
        <StaticPageViewer slug="data-privacy" fallbackContent={FALLBACK_DATA_PRIVACY_HTML} />
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
  },
});

export default DataPrivacyScreen;

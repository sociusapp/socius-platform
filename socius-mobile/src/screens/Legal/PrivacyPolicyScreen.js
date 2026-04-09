import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/common/Header';
import StaticPageViewer from '../../components/common/StaticPageViewer';
import { useResponsive } from '../../utils/responsive';

const FALLBACK_PRIVACY_HTML = `<h1>Privacy Policy</h1>
<p>Your privacy matters. Socius collects only information needed to run the service and connect you with your community.</p>
<p>Data is handled carefully and not sold. Details depend on your region and product features—see the full policy once your server static pages are available.</p>`;

const PrivacyPolicyScreen = ({ navigation }) => {
  const { scale } = useResponsive();

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Privacy Policy" 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />
      <View style={styles.contentContainer}>
        <StaticPageViewer slug="privacy-policy" fallbackContent={FALLBACK_PRIVACY_HTML} />
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

export default PrivacyPolicyScreen;


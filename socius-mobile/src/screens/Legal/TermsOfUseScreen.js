import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/common/Header';
import StaticPageViewer from '../../components/common/StaticPageViewer';
import { useResponsive } from '../../utils/responsive';

/** Shown if GET /api/pages/:slug returns 404 (DB not seeded yet). */
const FALLBACK_TERMS_HTML = `<h1>Terms of Use</h1>
<p>By using Socius, you agree to use the platform responsibly and in accordance with applicable laws.</p>
<p>Socius is a community information-sharing platform—not a substitute for professional services or emergency response. You are responsible for your own decisions.</p>
<p>For the full document, ensure static pages are seeded on the server or try again later.</p>`;

const TermsOfUseScreen = ({ navigation, route }) => {
  const { scale } = useResponsive();
  const { slug = 'terms-of-use', title = 'Terms of Use' } = route.params || {};

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title={title} 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />
      <View style={styles.contentContainer}>
        <StaticPageViewer slug={slug} fallbackContent={FALLBACK_TERMS_HTML} />
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

export default TermsOfUseScreen;

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/common/Header';
import StaticPageViewer from '../../components/common/StaticPageViewer';
import { useResponsive } from '../../utils/responsive';

/** Shown if GET /api/pages/:slug returns 404 (DB not seeded yet). */
const FALLBACK_TERMS_HTML = `<h1>Terms of Service</h1>
<p>By using Socius, you agree to these terms. Please read them carefully.</p>
<h2>1. Acceptance of Terms</h2>
<p>By downloading, accessing, or using the Socius application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.</p>
<h2>2. User Responsibilities</h2>
<p>As a user of Socius, you agree to:</p>
<ul>
<li>Provide accurate and truthful information</li>
<li>Use the service for legitimate safety and community purposes only</li>
<li>Respect other users and maintain appropriate behavior</li>
<li>Not misuse the platform for harassment, fraud, or illegal activities</li>
<li>Keep your account credentials secure</li>
</ul>
<h2>3. Safety and Emergency Use</h2>
<p>Socius is a community awareness platform, not a replacement for emergency services. In life-threatening situations, always contact local emergency authorities first (e.g., police, ambulance, fire department).</p>
<h2>4. User Content</h2>
<p>You retain ownership of any content you post on Socius. By posting content, you grant us a license to use, display, and distribute it for the purpose of providing our services. You are responsible for all content you post.</p>
<h2>5. Prohibited Activities</h2>
<p>The following activities are strictly prohibited:</p>
<ul>
<li>Impersonating others or providing false information</li>
<li>Harassing, threatening, or abusing other users</li>
<li>Using the platform for criminal activities</li>
<li>Spamming or sending unsolicited messages</li>
<li>Attempting to hack or disrupt the service</li>
<li>Creating fake accounts or requests</li>
</ul>
<h2>6. Verification and Trust</h2>
<p>Socius may require verification of user identity through government-issued ID or other means. By using the service, you consent to such verification processes. Verified users receive a badge indicating their verified status.</p>
<h2>7. Termination</h2>
<p>We reserve the right to suspend or terminate your account at any time for violation of these terms or for any other reason at our sole discretion. You may also terminate your account at any time through the app settings.</p>
<h2>8. Dispute Resolution</h2>
<p>Any disputes arising from the use of Socius shall be resolved through good faith negotiation. If negotiation fails, disputes shall be resolved through arbitration in accordance with applicable laws.</p>
<h2>9. Limitation of Liability</h2>
<p>Socius is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from the use of our service.</p>
<h2>10. Changes to Terms</h2>
<p>We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the new terms.</p>
<p><em>Last updated: May 2026</em></p>`;

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

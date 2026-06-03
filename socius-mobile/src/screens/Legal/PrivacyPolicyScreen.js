import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/common/Header';
import StaticPageViewer from '../../components/common/StaticPageViewer';
import { useResponsive } from '../../utils/responsive';

const FALLBACK_PRIVACY_HTML = `<h1>Privacy Policy</h1>
<p>Your privacy is important to us. This policy explains how Socius collects, uses, and protects your personal information.</p>
<h2>1. Information We Collect</h2>
<p>We collect information you provide directly to us, including:</p>
<ul>
<li>Name, email address, and phone number</li>
<li>Location data (with your consent)</li>
<li>Profile information and photos</li>
<li>Help requests and responses</li>
<li>Communication with other users</li>
</ul>
<h2>2. How We Use Your Information</h2>
<p>We use your information to:</p>
<ul>
<li>Provide and improve our services</li>
<li>Connect you with nearby helpers</li>
<li>Ensure safety and verify user identity</li>
<li>Send important notifications</li>
<li>Prevent fraud and abuse</li>
</ul>
<h2>3. Location Data</h2>
<p>Socius uses location data to connect you with nearby helpers. We only collect location data when you explicitly grant permission and only for the duration needed to provide our services. You can disable location access at any time through your device settings.</p>
<h2>4. Data Security</h2>
<p>We implement industry-standard security measures to protect your data, including encryption, secure servers, and regular security audits. However, no method of transmission over the internet is 100% secure.</p>
<h2>5. Your Rights</h2>
<p>You have the right to:</p>
<ul>
<li>Access your personal data</li>
<li>Correct inaccurate data</li>
<li>Delete your account and data</li>
<li>Opt-out of marketing communications</li>
<li>Export your data</li>
</ul>
<h2>6. Third-Party Services</h2>
<p>We may use third-party services for analytics, push notifications, and payment processing. These services have their own privacy policies, and we encourage you to review them.</p>
<p><em>Last updated: May 2026</em></p>`;

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


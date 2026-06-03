import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/common/Header';
import StaticPageViewer from '../../components/common/StaticPageViewer';
import { useResponsive } from '../../utils/responsive';

const FALLBACK_DATA_PROTECTION_HTML = `<h1>Data Protection Policy</h1>
<p>This policy outlines how Socius protects your personal data and complies with data protection regulations including GDPR.</p>
<h2>1. Data Controller</h2>
<p>Socius acts as the data controller for personal information collected through our application. We are committed to protecting your privacy and ensuring compliance with applicable data protection laws.</p>
<h2>2. Legal Basis for Processing</h2>
<p>We process your personal data based on:</p>
<ul>
<li>Consent: When you explicitly agree to data collection</li>
<li>Contractual Necessity: To provide the services you request</li>
<li>Legitimate Interests: For safety, fraud prevention, and service improvement</li>
<li>Legal Obligation: When required by law</li>
</ul>
<h2>3. Data Categories</h2>
<p>We collect and process the following categories of data:</p>
<ul>
<li>Personal Identity: Name, email, phone number, profile photo</li>
<li>Location Data: GPS coordinates (with consent)</li>
<li>Usage Data: App interactions, help requests, responses</li>
<li>Communication: Messages between users</li>
<li>Verification: Government ID documents (encrypted storage)</li>
</ul>
<h2>4. Data Retention</h2>
<p>We retain your data for the following periods:</p>
<ul>
<li>Account Data: Until account deletion</li>
<li>Help Requests: 90 days after completion</li>
<li>Location Data: Only during active sessions</li>
<li>Verification Documents: 30 days after verification</li>
<li>Communication Logs: 180 days</li>
</ul>
<h2>5. Data Security Measures</h2>
<p>We implement comprehensive security measures:</p>
<ul>
<li>End-to-end encryption for sensitive communications</li>
<li>AES-256 encryption for stored data</li>
<li>Secure HTTPS/TLS for all data transmission</li>
<li>Regular security audits and penetration testing</li>
<li>Access controls and authentication systems</li>
<li>Secure data centers with physical security</li>
</ul>
<h2>6. Your GDPR Rights</h2>
<p>Under GDPR, you have the right to:</p>
<ul>
<li>Right to Access: Request a copy of your personal data</li>
<li>Right to Rectification: Correct inaccurate or incomplete data</li>
<li>Right to Erasure: Request deletion of your data ("right to be forgotten")</li>
<li>Right to Restrict Processing: Limit how we use your data</li>
<li>Right to Data Portability: Receive your data in a machine-readable format</li>
<li>Right to Object: Object to processing based on legitimate interests</li>
<li>Right to Withdraw Consent: Revoke previously given consent</li>
</ul>
<h2>7. Data Transfers</h2>
<p>Your data is stored and processed within secure data centers. We may transfer data to third-party service providers (e.g., cloud hosting, analytics) only when they provide adequate protection and comply with data protection regulations.</p>
<h2>8. Cookies and Tracking</h2>
<p>We use cookies and similar technologies to improve user experience, analyze usage patterns, and provide personalized content. You can manage cookie preferences through your device settings.</p>
<h2>9. Data Breach Notification</h2>
<p>In the event of a data breach that poses a risk to your rights and freedoms, we will notify you within 72 hours of becoming aware of the breach, in accordance with GDPR requirements.</p>
<h2>10. Contact for Data Protection</h2>
<p>For any data protection inquiries, requests, or complaints, please contact our Data Protection Officer at privacy@socius.app</p>
<p><em>Last updated: May 2026</em></p>`;

const DataProtectionScreen = ({ navigation }) => {
  const { scale } = useResponsive();

  return (
    <SafeAreaView style={styles.container}>
      <Header 
        title="Data Protection" 
        onBackPress={() => navigation.goBack()}
        style={{ borderBottomWidth: scale(1), borderBottomColor: '#E8EAED' }}
      />
      <View style={styles.contentContainer}>
        <StaticPageViewer slug="data-protection" fallbackContent={FALLBACK_DATA_PROTECTION_HTML} />
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

export default DataProtectionScreen;

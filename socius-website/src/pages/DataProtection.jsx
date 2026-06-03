import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const PRIMARY = "#E8352A";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Poppins:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; }
  body { font-family: 'Nunito', sans-serif; color: #1a1a2e; background: #fff; }

  .dp-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 140px 40px 60px;
  }

  .dp-header {
    margin-bottom: 40px;
  }

  .dp-title {
    font-family: 'Poppins', sans-serif;
    font-size: 2.5rem;
    font-weight: 800;
    color: #1a1a2e;
    margin-bottom: 16px;
    line-height: 1.2;
  }

  .dp-subtitle {
    font-size: 1.1rem;
    color: #666;
    line-height: 1.6;
  }

  .dp-section {
    margin-bottom: 40px;
  }

  .dp-section-title {
    font-family: 'Poppins', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1a1a2e;
    margin-bottom: 16px;
  }

  .dp-section-content {
    font-size: 1rem;
    color: #555;
    line-height: 1.7;
  }

  .dp-section-content p {
    margin-bottom: 16px;
  }

  .dp-section-content ul {
    margin-left: 24px;
    margin-bottom: 16px;
  }

  .dp-section-content li {
    margin-bottom: 8px;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: ${PRIMARY};
    text-decoration: none;
    font-weight: 700;
    font-size: 0.95rem;
    margin-bottom: 24px;
    transition: all 0.2s;
    padding: 10px 20px;
    border-radius: 8px;
    background: ${PRIMARY}10;
    border: 1px solid ${PRIMARY}30;
  }

  .back-link:hover {
    color: #c0281f;
    background: ${PRIMARY}20;
    transform: translateX(-4px);
  }

  .last-updated {
    font-size: 0.9rem;
    color: #888;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #eee;
  }
`;

export default function DataProtection() {
  return (
    <>
      <style>{styles}</style>
      <Header />
      <div className="dp-container">
        <div className="dp-header">
          <h1 className="dp-title">Data Protection Policy</h1>
          <p className="dp-subtitle">
            This policy outlines how Socius protects your personal data and complies with data protection regulations including GDPR.
          </p>
        </div>

        <div className="dp-section">
          <h2 className="dp-section-title">1. Data Controller</h2>
          <div className="dp-section-content">
            <p>
              Socius acts as the data controller for personal information collected through our application. We are committed to protecting your privacy and ensuring compliance with applicable data protection laws.
            </p>
          </div>
        </div>

        <div className="dp-section">
          <h2 className="dp-section-title">2. Legal Basis for Processing</h2>
          <div className="dp-section-content">
            <p>We process your personal data based on:</p>
            <ul>
              <li><strong>Consent:</strong> When you explicitly agree to data collection</li>
              <li><strong>Contractual Necessity:</strong> To provide the services you request</li>
              <li><strong>Legitimate Interests:</strong> For safety, fraud prevention, and service improvement</li>
              <li><strong>Legal Obligation:</strong> When required by law</li>
            </ul>
          </div>
        </div>

        <div className="dp-section">
          <h2 className="dp-section-title">3. Data Categories</h2>
          <div className="dp-section-content">
            <p>We collect and process the following categories of data:</p>
            <ul>
              <li><strong>Personal Identity:</strong> Name, email, phone number, profile photo</li>
              <li><strong>Location Data:</strong> GPS coordinates (with consent)</li>
              <li><strong>Usage Data:</strong> App interactions, help requests, responses</li>
              <li><strong>Communication:</strong> Messages between users</li>
              <li><strong>Verification:</strong> Government ID documents (encrypted storage)</li>
            </ul>
          </div>
        </div>

        <div className="dp-section">
          <h2 className="dp-section-title">4. Data Retention</h2>
          <div className="dp-section-content">
            <p>We retain your data for the following periods:</p>
            <ul>
              <li><strong>Account Data:</strong> Until account deletion</li>
              <li><strong>Help Requests:</strong> 90 days after completion</li>
              <li><strong>Location Data:</strong> Only during active sessions</li>
              <li><strong>Verification Documents:</strong> 30 days after verification</li>
              <li><strong>Communication Logs:</strong> 180 days</li>
            </ul>
          </div>
        </div>

        <div className="dp-section">
          <h2 className="dp-section-title">5. Data Security Measures</h2>
          <div className="dp-section-content">
            <p>We implement comprehensive security measures:</p>
            <ul>
              <li>End-to-end encryption for sensitive communications</li>
              <li>AES-256 encryption for stored data</li>
              <li>Secure HTTPS/TLS for all data transmission</li>
              <li>Regular security audits and penetration testing</li>
              <li>Access controls and authentication systems</li>
              <li>Secure data centers with physical security</li>
            </ul>
          </div>
        </div>

        <div className="dp-section">
          <h2 className="dp-section-title">6. Your GDPR Rights</h2>
          <div className="dp-section-content">
            <p>Under GDPR, you have the right to:</p>
            <ul>
              <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
              <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
              <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
              <li><strong>Right to Data Portability:</strong> Receive your data in a machine-readable format</li>
              <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Right to Withdraw Consent:</strong> Revoke previously given consent</li>
            </ul>
          </div>
        </div>

        <div className="dp-section">
          <h2 className="dp-section-title">7. Data Transfers</h2>
          <div className="dp-section-content">
            <p>
              Your data is stored and processed within secure data centers. We may transfer data to third-party service providers (e.g., cloud hosting, analytics) only when they provide adequate protection and comply with data protection regulations.
            </p>
          </div>
        </div>

        <div className="dp-section">
          <h2 className="dp-section-title">8. Cookies and Tracking</h2>
          <div className="dp-section-content">
            <p>
              We use cookies and similar technologies to improve user experience, analyze usage patterns, and provide personalized content. You can manage cookie preferences through your browser settings.
            </p>
          </div>
        </div>

        <div className="dp-section">
          <h2 className="dp-section-title">9. Data Breach Notification</h2>
          <div className="dp-section-content">
            <p>
              In the event of a data breach that poses a risk to your rights and freedoms, we will notify you within 72 hours of becoming aware of the breach, in accordance with GDPR requirements.
            </p>
          </div>
        </div>

        <div className="dp-section">
          <h2 className="dp-section-title">10. Contact for Data Protection</h2>
          <div className="dp-section-content">
            <p>
              For any data protection inquiries, requests, or complaints, please contact our Data Protection Officer at privacy@socius.app
            </p>
          </div>
        </div>

        <div className="last-updated">
          Last updated: May 2026
        </div>
      </div>
      <Footer />
    </>
  );
}

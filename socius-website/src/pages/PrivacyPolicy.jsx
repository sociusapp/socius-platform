import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ChevronRight, Shield, Lock, User, MapPin, FileText, AlertCircle, Mail } from 'lucide-react';

const PRIMARY = "#E8352A";
const DARK = "#1a1a2e";
const LIGHT_BG = "#f8f9fa";
const TEXT_SECONDARY = "#666";
const BORDER_COLOR = "#e0e0e0";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Dm+Sans:wght@400;500;600;700&family=Bricolage+Grotesque:wght@400;600;700;800&display=swap');

  *, *::before, *::after { 
    box-sizing: border-box; 
    margin: 0; 
    padding: 0; 
  }

  html, body { 
    width: 100%; 
    scroll-behavior: smooth;
  }

  body { 
    font-family: 'DM Sans', sans-serif; 
    color: ${DARK}; 
    background: #ffffff; 
    line-height: 1.6;
  }

  /* ======================== SCROLL & ANIMATIONS ======================== */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes highlightPulse {
    0%, 100% { background-color: transparent; }
    50% { background-color: ${PRIMARY}15; }
  }

  /* ======================== MAIN CONTAINER ======================== */
  .privacy-wrapper {
    width: 100%;
    background: linear-gradient(135deg, #ffffff 0%, ${LIGHT_BG} 100%);
  }

  .privacy-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 120px 40px 80px;
  }

  /* ======================== HEADER SECTION ======================== */
  .privacy-header {
    margin-bottom: 60px;
    animation: fadeInUp 0.8s ease-out;
  }

  .privacy-header-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: ${PRIMARY}15;
    border: 1px solid ${PRIMARY}30;
    border-radius: 24px;
    margin-bottom: 24px;
    font-size: 0.85rem;
    font-weight: 600;
    color: ${PRIMARY};
    animation: fadeInUp 0.8s ease-out 0.1s backwards;
  }

  .privacy-header-badge svg {
    width: 16px;
    height: 16px;
  }

  .privacy-title {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 3rem;
    font-weight: 800;
    color: ${DARK};
    margin-bottom: 16px;
    line-height: 1.1;
    animation: fadeInUp 0.8s ease-out 0.2s backwards;
  }

  .privacy-subtitle {
    font-size: 1.1rem;
    color: ${TEXT_SECONDARY};
    line-height: 1.7;
    max-width: 700px;
    animation: fadeInUp 0.8s ease-out 0.3s backwards;
  }

  /* ======================== TABLE OF CONTENTS ======================== */
  .table-of-contents {
    background: ${LIGHT_BG};
    border: 1px solid ${BORDER_COLOR};
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 60px;
    animation: fadeInUp 0.8s ease-out 0.4s backwards;
  }

  .toc-title {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 1.2rem;
    font-weight: 700;
    color: ${DARK};
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .toc-title svg {
    width: 24px;
    height: 24px;
    color: ${PRIMARY};
  }

  .toc-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    list-style: none;
  }

  .toc-item {
    margin: 0;
  }

  .toc-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    color: ${PRIMARY};
    text-decoration: none;
    font-weight: 500;
    border-radius: 8px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .toc-link:hover {
    background: ${PRIMARY}10;
    transform: translateX(4px);
  }

  .toc-link svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  /* ======================== SECTIONS ======================== */
  .privacy-section {
    margin-bottom: 60px;
    animation: fadeInUp 0.8s ease-out;
  }

  .privacy-section-wrapper {
    display: flex;
    gap: 24px;
  }

  .section-icon {
    flex-shrink: 0;
    width: 60px;
    height: 60px;
    border-radius: 12px;
    background: ${PRIMARY}15;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 4px;
  }

  .section-icon svg {
    width: 28px;
    height: 28px;
    color: ${PRIMARY};
  }

  .section-content-wrapper {
    flex: 1;
  }

  .privacy-section-title {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 1.6rem;
    font-weight: 700;
    color: ${DARK};
    margin-bottom: 16px;
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .section-number {
    font-size: 1.4rem;
    color: ${PRIMARY};
    font-weight: 800;
  }

  .privacy-section-content {
    font-size: 1rem;
    color: ${TEXT_SECONDARY};
    line-height: 1.8;
  }

  .privacy-section-content p {
    margin-bottom: 18px;
  }

  .privacy-section-content p:last-child {
    margin-bottom: 0;
  }

  .privacy-section-content ul {
    list-style: none;
    margin-left: 0;
    margin-bottom: 18px;
  }

  .privacy-section-content li {
    margin-bottom: 12px;
    padding-left: 28px;
    position: relative;
  }

  .privacy-section-content li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 8px;
    width: 8px;
    height: 8px;
    background: ${PRIMARY};
    border-radius: 50%;
    opacity: 0.7;
  }

  /* ======================== HIGHLIGHT BOX ======================== */
  .highlight-box {
    background: ${PRIMARY}08;
    border-left: 4px solid ${PRIMARY};
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
    font-style: italic;
    color: ${DARK};
    display: flex;
    gap: 16px;
  }

  .highlight-box svg {
    width: 20px;
    height: 20px;
    color: ${PRIMARY};
    flex-shrink: 0;
    margin-top: 2px;
  }

  .highlight-content {
    flex: 1;
  }

  /* ======================== SUBSECTIONS ======================== */
  .subsection {
    background: ${LIGHT_BG};
    border: 1px solid ${BORDER_COLOR};
    border-radius: 12px;
    padding: 24px;
    margin-top: 20px;
    margin-bottom: 20px;
  }

  .subsection-title {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: ${DARK};
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .subsection-title::before {
    content: '';
    width: 4px;
    height: 4px;
    background: ${PRIMARY};
    border-radius: 50%;
  }

  .subsection-content {
    color: ${TEXT_SECONDARY};
    font-size: 0.95rem;
    line-height: 1.7;
  }

  /* ======================== CTA SECTION ======================== */
  .contact-section {
    background: linear-gradient(135deg, ${PRIMARY}08 0%, ${PRIMARY}04 100%);
    border: 1px solid ${PRIMARY}20;
    border-radius: 16px;
    padding: 40px;
    margin-top: 80px;
    text-align: center;
    animation: fadeInUp 0.8s ease-out;
  }

  .contact-section-title {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 1.6rem;
    font-weight: 700;
    color: ${DARK};
    margin-bottom: 16px;
  }

  .contact-section-text {
    color: ${TEXT_SECONDARY};
    font-size: 1rem;
    margin-bottom: 24px;
    line-height: 1.7;
  }

  .contact-email {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 14px 24px;
    background: ${PRIMARY};
    color: white;
    text-decoration: none;
    border-radius: 12px;
    font-weight: 600;
    transition: all 0.3s ease;
    border: 2px solid ${PRIMARY};
  }

  .contact-email:hover {
    background: transparent;
    color: ${PRIMARY};
    transform: translateY(-2px);
    box-shadow: 0 8px 24px ${PRIMARY}25;
  }

  .contact-email svg {
    width: 20px;
    height: 20px;
  }

  /* ======================== LAST UPDATED ======================== */
  .last-updated {
    font-size: 0.9rem;
    color: #888;
    margin-top: 60px;
    padding-top: 24px;
    border-top: 1px solid ${BORDER_COLOR};
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .last-updated svg {
    width: 16px;
    height: 16px;
  }

  /* ======================== RESPONSIVE ======================== */
  @media (max-width: 768px) {
    .privacy-container {
      padding: 80px 24px 60px;
    }

    .privacy-title {
      font-size: 2rem;
    }

    .privacy-section-title {
      font-size: 1.3rem;
    }

    .privacy-section-wrapper {
      flex-direction: column;
    }

    .toc-list {
      grid-template-columns: 1fr;
    }

    .contact-section {
      padding: 32px 24px;
    }
  }
`;

const sections = [
  {
    id: 'applicability',
    number: '1',
    icon: Shield,
    title: 'Applicability & Scope',
    content: (
      <>
        <p>
          This Privacy Policy applies to all users of the Socius Platform located in India. Socius acts as a <strong>Data Fiduciary</strong> under the Digital Personal Data Protection Act, 2023.
        </p>
      </>
    ),
  },
  {
    id: 'data-collection',
    number: '2',
    icon: User,
    title: 'Data We Collect',
    content: (
      <>
        <p>Socius collects <strong>only minimal data necessary</strong> to operate the Platform safely and lawfully.</p>
        
        <div className="subsection">
          <div className="subsection-title">Identity & Contact Information</div>
          <div className="subsection-content">
            <ul>
              <li>Mobile number (OTP verification)</li>
              <li>Name (as provided)</li>
              <li>Age confirmation (18+)</li>
            </ul>
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Verification Data</div>
          <div className="subsection-content">
            <p>Government-issued ID and selfie photographs for verification only. <strong>Not publicly visible</strong> and never used for profiling.</p>
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Location Information</div>
          <div className="subsection-content">
            <p>Approximate location (area-level) shared voluntarily. ❌ No continuous tracking or background monitoring.</p>
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">User-Provided Content</div>
          <div className="subsection-content">
            <p>Short text descriptions and feedback submitted voluntarily.</p>
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Technical Data</div>
          <div className="subsection-content">
            <p>Device type, app version, and basic log data for security and debugging.</p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'purpose-limitation',
    number: '3',
    icon: FileText,
    title: 'Purpose Limitation',
    content: (
      <>
        <p>Your data is collected <strong>only</strong> for the following purposes:</p>
        <ul>
          <li>Account creation and verification</li>
          <li>Platform safety and misuse prevention</li>
          <li>Sharing user-initiated information with nearby users</li>
          <li>Providing access to emergency contact resources</li>
          <li>Moderation and compliance with legal obligations</li>
        </ul>

        <div className="highlight-box">
          <AlertCircle />
          <div className="highlight-content">
            <strong>What We Don't Do:</strong> We do not use data for advertising, behavioral profiling, surveillance, or automated decision-making.
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'consent',
    number: '4',
    icon: Lock,
    title: 'Consent & User Control',
    content: (
      <>
        <p>By registering and using the Platform, you provide explicit consent for data collection as described.</p>
        
        <div className="subsection">
          <div className="subsection-title">Your Consent Is:</div>
          <div className="subsection-content">
            <ul>
              <li><strong>Specific:</strong> Clear about what data we collect</li>
              <li><strong>Informed:</strong> You know how it's used</li>
              <li><strong>Revocable:</strong> You can withdraw it anytime</li>
            </ul>
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">Your Rights (DPDP Act)</div>
          <div className="subsection-content">
            <ul>
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Withdraw consent</li>
              <li>Request account & data deletion</li>
              <li>Grievance redressal</li>
            </ul>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'data-sharing',
    number: '5',
    icon: MapPin,
    title: 'Data Sharing & Disclosure',
    content: (
      <>
        <div className="subsection">
          <div className="subsection-title">With Other Users</div>
          <div className="subsection-content">
            <p>Only the following may be shared: Information you voluntarily choose to share, approximate location, and situation type. ❌ No documents, IDs, phone numbers, or private details are shared.</p>
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">With Authorities</div>
          <div className="subsection-content">
            <p>Data may be disclosed only when: Required by law, ordered by a court, or requested by a lawful government authority. We do <strong>not</strong> proactively share user data.</p>
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">With Third Parties</div>
          <div className="subsection-content">
            <p>We use third-party providers for hosting, SMS delivery, and analytics. All are contractually bound to maintain reasonable security practices.</p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'data-security',
    number: '6',
    icon: Lock,
    title: 'Data Security',
    content: (
      <>
        <p>Socius implements <strong>reasonable security safeguards</strong>, including:</p>
        <ul>
          <li>Encrypted storage of sensitive data</li>
          <li>Access controls and role-based permissions</li>
          <li>Limited admin access with audit logs</li>
          <li>Regular security assessments</li>
        </ul>
        <div className="highlight-box">
          <AlertCircle />
          <div className="highlight-content">
            Despite best efforts, no system is completely secure. Users acknowledge this inherent risk.
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'data-retention',
    number: '7',
    icon: FileText,
    title: 'Data Retention',
    content: (
      <>
        <ul>
          <li>Verification data retained only as long as necessary for compliance and safety</li>
          <li>Incident records stored in anonymized form where possible</li>
          <li>Personal data deleted upon account deletion (except legally required retention)</li>
          <li>Retention periods reviewed periodically</li>
        </ul>
      </>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <>
      <style>{styles}</style>
      <Header />
      <div className="privacy-wrapper">
        <div className="privacy-container">
          {/* Header */}
          <div className="privacy-header">
            <div className="privacy-header-badge">
              <Shield size={16} />
              DPDP Act Compliant
            </div>
            <h1 className="privacy-title">Privacy Policy</h1>
            <p className="privacy-subtitle">
              Your privacy is fundamental to Socius. This policy explains how we collect, use, and protect your personal information in compliance with Indian law.
            </p>
          </div>

          {/* Table of Contents */}
          <div className="table-of-contents">
            <div className="toc-title">
              <FileText size={24} />
              Quick Navigation
            </div>
            <ul className="toc-list">
              {sections.map((section) => (
                <li key={section.id} className="toc-item">
                  <a href={`#${section.id}`} className="toc-link">
                    <ChevronRight size={16} />
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Main Sections */}
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                id={section.id}
                className="privacy-section"
                style={{ animationDelay: `${0.1 * idx}s` }}
              >
                <div className="privacy-section-wrapper">
                  <div className="section-icon">
                    <Icon size={28} />
                  </div>
                  <div className="section-content-wrapper">
                    <h2 className="privacy-section-title">
                      <span className="section-number">{section.number}</span>
                      {section.title}
                    </h2>
                    <div className="privacy-section-content">
                      {section.content}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Contact Section */}
          <div className="contact-section">
            <h2 className="contact-section-title">Privacy Questions?</h2>
            <p className="contact-section-text">
              Our grievance officer is available to help. Get in touch for any privacy-related concerns.
            </p>
            <a href="mailto:privacy@socius.app" className="contact-email">
              <Mail size={20} />
              privacy@socius.app
            </a>
          </div>

          {/* Last Updated */}
          <div className="last-updated">
            <FileText size={16} />
            <span><strong>Last updated:</strong> May 2026</span>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
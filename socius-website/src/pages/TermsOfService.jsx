import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ChevronRight, AlertTriangle, CheckCircle, Users, Shield, Gavel, Trash2, FileText, Mail, AlertCircle, BookOpen } from 'lucide-react';

const PRIMARY = "#E8352A";
const DARK = "#1a1a2e";
const LIGHT_BG = "#f8f9fa";
const TEXT_SECONDARY = "#666";
const BORDER_COLOR = "#e0e0e0";
const WARNING_BG = "#fff3cd";
const WARNING_BORDER = "#ffc107";

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

  /* ======================== ANIMATIONS ======================== */
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

  /* ======================== MAIN CONTAINER ======================== */
  .tos-wrapper {
    width: 100%;
    background: linear-gradient(135deg, #ffffff 0%, ${LIGHT_BG} 100%);
  }

  .tos-container {
    max-width: 900px;
    margin: 0 auto;
    padding: 120px 40px 80px;
  }

  /* ======================== HEADER SECTION ======================== */
  .tos-header {
    margin-bottom: 60px;
    animation: fadeInUp 0.8s ease-out;
  }

  .tos-header-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #fff3cd;
    border: 1px solid ${WARNING_BORDER}40;
    border-radius: 24px;
    margin-bottom: 24px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #856404;
    animation: fadeInUp 0.8s ease-out 0.1s backwards;
  }

  .tos-header-badge svg {
    width: 16px;
    height: 16px;
  }

  .tos-title {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 3rem;
    font-weight: 800;
    color: ${DARK};
    line-height: 1.1;
    margin-bottom: 16px;
    letter-spacing: -0.02em;
    animation: fadeInUp 0.8s ease-out 0.2s backwards;
  }

  .tos-subtitle {
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
  .tos-section {
    margin-bottom: 60px;
    animation: fadeInUp 0.8s ease-out;
  }

  .tos-section-wrapper {
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

  .section-icon.warning {
    background: ${WARNING_BG};
  }

  .section-icon svg {
    width: 28px;
    height: 28px;
    color: ${PRIMARY};
  }

  .section-icon.warning svg {
    color: #856404;
  }

  .section-content-wrapper {
    flex: 1;
  }

  .tos-section-title {
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

  .tos-section-content {
    font-size: 1rem;
    color: ${TEXT_SECONDARY};
    line-height: 1.8;
  }

  .tos-section-content p {
    margin-bottom: 18px;
  }

  .tos-section-content p:last-child {
    margin-bottom: 0;
  }

  .tos-section-content ul {
    list-style: none;
    margin-left: 0;
    margin-bottom: 18px;
  }

  .tos-section-content li {
    margin-bottom: 12px;
    padding-left: 28px;
    position: relative;
  }

  .tos-section-content li::before {
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
    color: ${DARK};
    line-height: 1.6;
  }

  .highlight-content strong {
    color: ${PRIMARY};
  }

  /* ======================== WARNING BOX ======================== */
  .warning-box {
    background: ${WARNING_BG};
    border-left: 4px solid ${WARNING_BORDER};
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
    display: flex;
    gap: 16px;
  }

  .warning-box svg {
    width: 20px;
    height: 20px;
    color: #856404;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .warning-content {
    flex: 1;
    color: #664d03;
    line-height: 1.6;
    font-weight: 500;
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

  .subsection-content ul {
    list-style: none;
    margin-left: 0;
  }

  .subsection-content li {
    margin-bottom: 10px;
    padding-left: 24px;
    position: relative;
    font-size: 0.95rem;
  }

  .subsection-content li::before {
    content: '→';
    position: absolute;
    left: 0;
    color: ${PRIMARY};
    font-weight: bold;
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
    .tos-container {
      padding: 80px 24px 60px;
    }

    .tos-title {
      font-size: 2rem;
    }

    .tos-section-title {
      font-size: 1.3rem;
    }

    .tos-section-wrapper {
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
    id: 'definitions',
    number: '1',
    icon: BookOpen,
    title: 'Definitions',
    content: (
      <>
        <p>Key terms used throughout this document:</p>
        <div className="subsection">
          <div className="subsection-title">Socius / Platform</div>
          <div className="subsection-content">Refers to the Socius mobile application and associated services.</div>
        </div>
        <div className="subsection">
          <div className="subsection-title">User</div>
          <div className="subsection-content">Any individual who accesses or uses the Platform.</div>
        </div>
        <div className="subsection">
          <div className="subsection-title">Volunteer</div>
          <div className="subsection-content">A User who marks themselves as available to receive informational alerts.</div>
        </div>
        <div className="subsection">
          <div className="subsection-title">Content</div>
          <div className="subsection-content">Information voluntarily shared by Users on the Platform.</div>
        </div>
      </>
    ),
  },
  {
    id: 'platform-nature',
    number: '2',
    icon: AlertTriangle,
    title: 'Nature of the Platform',
    warning: true,
    content: (
      <>
        <p><strong>Socius is a private information-sharing and awareness platform.</strong></p>
        
        <div className="warning-box">
          <AlertTriangle />
          <div className="warning-content">
            <strong>What Socius Does:</strong> Shares user-submitted information, displays safety-related alerts, and provides access to emergency resources.
          </div>
        </div>

        <div className="highlight-box">
          <AlertCircle />
          <div className="highlight-content">
            <strong>What Socius Does NOT Do:</strong> Provide emergency response services, dispatch individuals, coordinate physical intervention, or replace law enforcement, medical, or emergency authorities.
          </div>
        </div>

        <div className="subsection">
          <div className="subsection-title">No Duty of Care</div>
          <div className="subsection-content">
            Socius does <strong>not</strong> assume any duty of care toward Users or Volunteers. All actions taken are voluntary, independent, and based on personal judgment. Socius does not supervise, direct, or control user behavior.
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'eligibility',
    number: '3',
    icon: Users,
    title: 'Eligibility & Account Registration',
    content: (
      <>
        <ul>
          <li>Users must be <strong>18 years or older</strong></li>
          <li>Users must provide <strong>accurate and truthful information</strong></li>
          <li>Identity verification is conducted solely for <strong>platform safety and compliance</strong></li>
          <li>Socius reserves the right to <strong>approve, suspend, or terminate accounts</strong> at its discretion</li>
        </ul>
      </>
    ),
  },
  {
    id: 'voluntary-participation',
    number: '4',
    icon: CheckCircle,
    title: 'Voluntary Participation',
    content: (
      <>
        <ul>
          <li>Use of the Platform is <strong>entirely voluntary</strong></li>
          <li>No User or Volunteer is <strong>obligated to respond</strong> to any alert</li>
          <li>Availability status does <strong>not create responsibility, duty, or obligation</strong></li>
          <li>Users may <strong>disengage at any time</strong> without consequence</li>
        </ul>
      </>
    ),
  },
  {
    id: 'user-conduct',
    number: '5',
    icon: Shield,
    title: 'User Conduct',
    content: (
      <>
        <p>Users agree that they will <strong>not</strong>:</p>
        <ul>
          <li>Engage in confrontation, harassment, or violence</li>
          <li>Impersonate authorities or officials</li>
          <li>Enforce laws or issue commands</li>
          <li>Record or share personal information without consent</li>
          <li>Use the Platform for vigilantism, moral policing, or surveillance</li>
          <li>Post false, misleading, or defamatory content</li>
        </ul>
        <div className="highlight-box">
          <AlertCircle />
          <div className="highlight-content">
            <strong>Violation may result in suspension or termination of your account.</strong>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'emergency-services',
    number: '6',
    icon: AlertTriangle,
    warning: true,
    title: 'Emergency Services & Authorities',
    content: (
      <>
        <div className="warning-box">
          <AlertTriangle />
          <div className="warning-content">
            In life-threatening situations, <strong>always contact local emergency authorities first.</strong>
          </div>
        </div>

        <ul>
          <li>Socius does <strong>not</strong> contact police or emergency services on behalf of Users</li>
          <li>The Platform may display official emergency contact information</li>
          <li>Users choose independently whether and how to contact authorities</li>
          <li>Socius is <strong>not responsible</strong> for response times, outcomes, or actions taken by authorities</li>
        </ul>
      </>
    ),
  },
  {
    id: 'liability',
    number: '7',
    icon: Gavel,
    title: 'Limitation of Liability',
    content: (
      <>
        <p>To the fullest extent permitted by law, Socius shall <strong>not be liable</strong> for:</p>
        <ul>
          <li>User actions or omissions</li>
          <li>Volunteer conduct</li>
          <li>Physical injury, loss, or damage</li>
          <li>Failure of third-party services</li>
          <li>Outcomes of interactions initiated via the Platform</li>
        </ul>
        <div className="highlight-box">
          <AlertCircle />
          <div className="highlight-content">
            <strong>Use of Socius is at the User's own risk.</strong>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'warranties',
    number: '8',
    icon: AlertTriangle,
    title: 'Disclaimer of Warranties',
    warning: true,
    content: (
      <>
        <p>Socius is provided on an <strong>"as is" and "as available"</strong> basis.</p>
        <p>No warranties are made regarding:</p>
        <ul>
          <li>Accuracy of user-generated content</li>
          <li>Availability of help</li>
          <li>Prevention of harm</li>
          <li>Resolution of situations</li>
        </ul>
      </>
    ),
  },
  {
    id: 'data-privacy',
    number: '9',
    icon: Shield,
    title: 'Data & Privacy',
    content: (
      <>
        <ul>
          <li>Data collection and use are governed by the <strong>Privacy Policy</strong></li>
          <li>Socius collects only <strong>minimal data</strong> required for platform operation</li>
          <li>Data is <strong>not sold</strong></li>
          <li>Data may be disclosed only with user consent or as required by law</li>
        </ul>
      </>
    ),
  },
  {
    id: 'termination',
    number: '10',
    icon: Trash2,
    title: 'Termination',
    content: (
      <>
        <p>Socius may suspend or terminate access:</p>
        <ul>
          <li>For violation of these Terms</li>
          <li>For safety or legal reasons</li>
          <li>Without prior notice if required</li>
        </ul>
        <p style={{ marginTop: '18px' }}>Users may delete their accounts at any time through app settings.</p>
      </>
    ),
  },
  {
    id: 'modifications',
    number: '11',
    icon: FileText,
    title: 'Modifications to Terms',
    content: (
      <>
        <p>Socius may update these Terms from time to time.</p>
        <div className="highlight-box">
          <AlertCircle />
          <div className="highlight-content">
            Continued use of the Platform after changes constitutes <strong>acceptance of the new terms.</strong>
          </div>
        </div>
      </>
    ),
  },
  {
    id: 'governing-law',
    number: '12',
    icon: Gavel,
    title: 'Governing Law & Jurisdiction',
    content: (
      <>
        <ul>
          <li>These Terms are governed by the laws of <strong>India</strong></li>
          <li>Any dispute shall be subject to the exclusive jurisdiction of courts in <strong>[City, State]</strong></li>
        </ul>
      </>
    ),
  },
];

export default function TermsOfService() {
  return (
    <>
      <style>{styles}</style>
      <Header />
      <div className="tos-wrapper">
        <div className="tos-container">
          {/* Header */}
          <div className="tos-header">
            <div className="tos-header-badge">
              <AlertTriangle size={16} />
              Please Read Carefully
            </div>
            <h1 className="tos-title">Terms of Service</h1>
            <p className="tos-subtitle">
              By accessing or using Socius, you agree to be bound by these Terms. If you do not agree, please do not use the Platform.
            </p>
          </div>

          {/* Table of Contents */}
          <div className="table-of-contents">
            <div className="toc-title">
              <BookOpen size={24} />
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
                className="tos-section"
                style={{ animationDelay: `${0.1 * idx}s` }}
              >
                <div className="tos-section-wrapper">
                  <div className={`section-icon ${section.warning ? 'warning' : ''}`}>
                    <Icon size={28} />
                  </div>
                  <div className="section-content-wrapper">
                    <h2 className="tos-section-title">
                      <span className="section-number">{section.number}</span>
                      {section.title}
                    </h2>
                    <div className="tos-section-content">
                      {section.content}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Contact Section */}
          <div className="contact-section">
            <h2 className="contact-section-title">Questions About These Terms?</h2>
            <p className="contact-section-text">
              Have questions about our Terms of Service? Our support team is here to help clarify any concerns.
            </p>
            <a href="mailto:support@socius.app" className="contact-email">
              <Mail size={20} />
              support@socius.app
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
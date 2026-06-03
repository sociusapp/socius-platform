import { Link } from 'react-router-dom';
import { useState } from 'react';

const PRIMARY = "#E8352A";

const LogoIcon = () => (
  <img src="/logo.png" alt="Socius Logo" style={{ width: '34px', height: '34px' }} />
);

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Poppins:wght@400;500;600;700;800&display=swap');

  .footer { background: #1a1a2e; color: #fff; padding: 60px 0 28px; }
  .footer-inner { padding: 0 40px; max-width: 100%; }
  .footer-grid {
    display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr 1.3fr;
    gap: 48px; margin-bottom: 48px;
  }
  .footer-logo-row {
    display: flex; align-items: center; gap: 10px;
    font-family: 'Poppins',sans-serif; font-weight: 800;
    font-size: 1.3rem; margin-bottom: 14px;
  }
  .footer-logo-icon {
    width: 34px; height: 34px; background: ${PRIMARY}; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }
  .footer-desc { font-size: 0.85rem; color: #aaa; line-height: 1.7; margin-bottom: 20px; }
  .footer-socials { display: flex; gap: 10px; }
  .fsoc {
    width: 34px; height: 34px; border-radius: 8px;
    background: rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.82rem; cursor: pointer; transition: background .2s;
    color: #aaa; text-decoration: none; border: none;
  }
  .fsoc:hover { background: ${PRIMARY}; color: #fff; }
  .footer-col h5 { font-family: 'Poppins',sans-serif; font-weight: 700; font-size: 0.93rem; margin-bottom: 18px; }
  .footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 11px; }
  .footer-col ul a { color: #aaa; text-decoration: none; font-size: 0.85rem; transition: color .2s; }
  .footer-col ul a:hover { color: ${PRIMARY}; }
  .footer-news h5 { font-family: 'Poppins',sans-serif; font-weight: 700; font-size: 0.93rem; margin-bottom: 8px; }
  .footer-news p { font-size: 0.82rem; color: #aaa; margin-bottom: 16px; }
  .nl-form { display: flex; gap: 8px; }
  .nl-input {
    flex: 1; background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15); border-radius: 8px;
    padding: 10px 14px; color: #fff; font-size: 0.84rem;
    font-family: 'Nunito',sans-serif; outline: none; min-width: 0;
  }
  .nl-input::placeholder { color: #555; }
  .nl-btn {
    background: ${PRIMARY}; color: #fff; border: none;
    border-radius: 8px; padding: 10px 16px;
    font-weight: 700; font-size: 0.82rem; cursor: pointer;
    font-family: 'Nunito',sans-serif; white-space: nowrap;
    transition: background .2s;
  }
  .nl-btn:hover { background: #c0281f; }
  .footer-bottom {
    border-top: 1px solid rgba(255,255,255,0.08); padding-top: 22px;
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
  }
  .footer-bottom span { font-size: 0.82rem; color: #555; }
  .footer-legal { display: flex; gap: 20px; }
  .footer-legal a { color: #555; font-size: 0.82rem; text-decoration: none; transition: color .2s; }
  .footer-legal a:hover { color: ${PRIMARY}; }

  @media (max-width: 1100px) {
    .footer-grid { grid-template-columns: 1fr 1fr 1fr; gap: 32px; }
  }
  @media (max-width: 700px) {
    .footer-inner { padding: 0 20px; }
    .footer-grid { grid-template-columns: 1fr; gap: 28px; }
  }
`;

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <>
      <style>{styles}</style>
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-grid">
            <div>
              <div className="footer-logo-row">
                <div className="footer-logo-icon"><LogoIcon /></div>
                Socius
              </div>
              <p className="footer-desc">Socius connects people, builds trust, and creates safer communities. Together, we look out for each other.</p>
              <div className="footer-socials">
                {["f","𝕏","in","▶","ig","yt"].map((s,i) => (
                  <button className="fsoc" key={i}>{s}</button>
                ))}
              </div>
            </div>
            <div className="footer-col">
              <h5>Product</h5>
              <ul>{["Features","How It Works","Pricing","Download App"].map(l => <li key={l}><Link to="/">{l}</Link></li>)}</ul>
            </div>
            <div className="footer-col">
              <h5>For Institutions</h5>
              <ul>{["Schools & Colleges","Residential Societies","Workplaces","NGOs"].map(l => <li key={l}><Link to="/">{l}</Link></li>)}</ul>
            </div>
            <div className="footer-col">
              <h5>Company</h5>
              <ul>{["About Us","Careers","Blog","Contact Us"].map(l => <li key={l}><Link to="/">{l}</Link></li>)}</ul>
            </div>
            <div className="footer-news">
              <h5>Stay Updated</h5>
              <p>Get the latest updates and safety tips.</p>
              <div className="nl-form">
                <input className="nl-input" type="email" placeholder="Enter your email"
                  value={email} onChange={e => setEmail(e.target.value)}/>
                <button className="nl-btn" onClick={() => email && setSubscribed(true)}>
                  {subscribed ? "✓ Done" : "Subscribe"}
                </button>
              </div>
              {subscribed && <p style={{color:'#4ade80',fontSize:'0.8rem',marginTop:8}}>✓ Subscribed successfully!</p>}
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Socius. All rights reserved.</span>
            <div className="footer-legal">
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
              <Link to="/data-protection">Data Protection</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

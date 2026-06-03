import { useState } from 'react';
import { Link } from 'react-router-dom';

const PRIMARY = "#E8352A";

const LogoIcon = () => (
  <img src="/logo.png" alt="Socius Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
);

const HamburgerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Poppins:wght@400;500;600;700;800&display=swap');

  .header-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    background: rgba(255,255,255,0.97);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #f0f0f0;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  }
  .header-inner {
    padding: 0 40px;
    height: 68px;
    display: flex; align-items: center; justify-content: space-between;
    max-width: 100%;
  }
  .header-logo {
    display: flex; align-items: center; gap: 10px;
    font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 1.35rem;
    color: #1a1a2e; text-decoration: none; flex-shrink: 0;
  }
  .header-logo-icon {
    width: 38px; height: 38px;
    display: flex; align-items: center; justify-content: center;
  }
  .header-links { display: flex; gap: 30px; list-style: none; }
  .header-links a {
    text-decoration: none; color: #444; font-weight: 600; font-size: 0.93rem;
    transition: color .2s; white-space: nowrap;
  }
  .header-links a:hover { color: ${PRIMARY}; }
  .header-cta {
    background: ${PRIMARY}; color: #fff; border: none;
    padding: 11px 24px; border-radius: 8px; font-weight: 700;
    font-size: 0.93rem; cursor: pointer; transition: all .2s;
    font-family: 'Nunito', sans-serif; white-space: nowrap; flex-shrink: 0;
    text-decoration: none;
  }
  .header-cta:hover { background: #c0281f; transform: translateY(-1px); }

  .hamburger-btn {
    display: none;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    color: #1a1a2e;
    transition: color 0.2s;
    border-radius: 8px;
  }

  .hamburger-btn:hover { color: ${PRIMARY}; background: #f5f5f5; }

  .mobile-menu {
    position: fixed;
    top: 0;
    left: -280px;
    width: 280px;
    height: 100vh;
    background: #fff;
    box-shadow: 4px 0 20px rgba(0,0,0,0.15);
    z-index: 1000;
    padding: 80px 24px 24px;
    transition: left 0.3s ease;
    overflow-y: auto;
  }

  .mobile-menu.open { left: 0; }

  .mobile-menu-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 999;
  }

  .mobile-menu-overlay.open { display: block; }

  .mobile-menu-links {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .mobile-menu-links a {
    text-decoration: none;
    color: #1a1a2e;
    font-weight: 600;
    font-size: 1rem;
    padding: 12px 16px;
    border-radius: 8px;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .mobile-menu-links a:hover {
    background: ${PRIMARY}10;
    color: ${PRIMARY};
  }

  .mobile-menu-cta {
    margin-top: 20px;
    text-align: center;
  }

  .mobile-menu-cta .header-cta {
    width: 100%;
    display: block;
    text-align: center;
  }

  @media (max-width: 900px) {
    .header-links { display: none; }
    .header-cta { display: none; }
    .hamburger-btn { display: flex; }
    .header-inner { padding: 0 40px; }
  }
`;

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <style>{styles}</style>
      <nav className="header-nav">
        <div className="header-inner">
          <Link to="/" className="header-logo" onClick={closeMobileMenu}>
            <LogoIcon />
            Socius
          </Link>
          <ul className="header-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/#features">Features</Link></li>
            <li><Link to="/#institutions">For Institutions</Link></li>
            <li><Link to="/#government">For Government</Link></li>
            <li><Link to="/#pricing">Pricing</Link></li>
            <li><Link to="/#about">About Us</Link></li>
            <li><Link to="/#blog">Blog</Link></li>
          </ul>
          <Link to="/" className="header-cta">Download App</Link>
          <button className="hamburger-btn" onClick={toggleMobileMenu}>
            {isMobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
          </button>
        </div>
      </nav>
      <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={closeMobileMenu}></div>
      <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-links">
          <Link to="/" onClick={closeMobileMenu}><span>🏠</span> Home</Link>
          <Link to="/#features" onClick={closeMobileMenu}><span>⚡</span> Features</Link>
          <Link to="/#institutions" onClick={closeMobileMenu}><span>🏢</span> For Institutions</Link>
          <Link to="/#government" onClick={closeMobileMenu}><span>🏛️</span> For Government</Link>
          <Link to="/#pricing" onClick={closeMobileMenu}><span>💰</span> Pricing</Link>
          <Link to="/#about" onClick={closeMobileMenu}><span>ℹ️</span> About Us</Link>
          <Link to="/#blog" onClick={closeMobileMenu}><span>📝</span> Blog</Link>
        </div>
        <div className="mobile-menu-cta">
          <Link to="/" className="header-cta" onClick={closeMobileMenu}>Download App</Link>
        </div>
      </div>
    </>
  );
}

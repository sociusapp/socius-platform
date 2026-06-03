import { useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import DataProtection from "./pages/DataProtection";

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

const PRIMARY = "#E8352A";
const PRIMARY_LIGHT = "#fff1f0";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Poppins:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; overflow-x: hidden; margin: 0; padding: 0; }
  body { font-family: 'Nunito', sans-serif; color: #1a1a2e; background: #fff; }

  .socius-root { width: 100%; overflow-x: hidden; margin: 0; padding: 0; }

.container {
  width: 100%;
  max-width: none;
  padding: 0 40px;
}

  /* ── NAV ── */
  .nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    background: rgba(255,255,255,0.97);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #f0f0f0;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    margin: 0; padding: 0; width: 100%;
  }
  .nav-inner {
    padding: 0 40px;
    height: 68px;
    display: flex; align-items: center; justify-content: space-between;
    max-width: none;
  }
  .nav-logo {
    display: flex; align-items: center; gap: 10px;
    font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 1.35rem;
    color: #1a1a2e; text-decoration: none; flex-shrink: 0;
  }
  .nav-logo-icon {
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
  }
  .nav-links { display: flex; gap: 30px; list-style: none; }
  .nav-links a {
    text-decoration: none; color: #444; font-weight: 600; font-size: 0.93rem;
    transition: color .2s; white-space: nowrap;
  }
  .nav-links a:hover { color: ${PRIMARY}; }
  .nav-links a.active {
    color: ${PRIMARY}; border-bottom: 2.5px solid ${PRIMARY}; padding-bottom: 3px;
  }
  .nav-cta {
    background: ${PRIMARY}; color: #fff; border: none;
    padding: 11px 24px; border-radius: 8px; font-weight: 700;
    font-size: 0.93rem; cursor: pointer; transition: all .2s;
    font-family: 'Nunito', sans-serif; white-space: nowrap; flex-shrink: 0;
  }
  .nav-cta:hover { background: #c0281f; transform: translateY(-1px); }

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

  .mobile-menu-cta .nav-cta {
    width: 100%;
    display: block;
    text-align: center;
  }

  /* ── HERO ── */
  .hero-section {
    background: linear-gradient(135deg, #fff 55%, #fff5f5 100%);
    position: relative; overflow: hidden;
    margin: 0; padding: 0; width: 100%;
  }
  .hero-section::after {
    content: ''; position: absolute; right: -100px; top: -100px;
    width: 600px; height: 600px; pointer-events: none;
    background: radial-gradient(circle, rgba(232,53,42,0.07) 0%, transparent 65%);
    border-radius: 50%;
  }
.hero-inner {
  padding: 148px 40px 70px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 60px;
  max-width: none;
}
  .hero-left { flex: 1; min-width: 0; z-index: 2; }
  .hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: ${PRIMARY_LIGHT}; color: ${PRIMARY};
    border-radius: 30px; padding: 7px 18px;
    font-size: 0.82rem; font-weight: 700; margin-bottom: 24px;
    border: 1px solid rgba(232,53,42,0.2);
  }
  .hero-badge-dot {
    width: 8px; height: 8px; background: ${PRIMARY};
    border-radius: 50%; animation: pulse 1.5s infinite;
  }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }

  .hero-h1 {
    font-family: 'Poppins', sans-serif;
    font-size: clamp(2rem, 3.5vw, 3.1rem);
    font-weight: 800; line-height: 1.15; color: #1a1a2e;
    margin-bottom: 6px;
  }
  .hero-h1-red { color: ${PRIMARY}; display: block; }
  .hero-desc {
    font-size: 1.05rem; color: #555; line-height: 1.7;
    margin: 20px 0 36px; max-width: 440px;
  }
  .hero-btns { display: flex; gap: 14px; margin-bottom: 36px; flex-wrap: wrap; }
  .btn-android {
    display: inline-flex; align-items: center; gap: 10px;
    background: ${PRIMARY}; color: #fff; border: none;
    padding: 14px 24px; border-radius: 10px; font-weight: 700;
    font-size: 0.95rem; cursor: pointer; transition: all .2s;
    font-family: 'Nunito', sans-serif;
    box-shadow: 0 4px 18px rgba(232,53,42,0.3);
  }
  .btn-android:hover { background: #c0281f; transform: translateY(-2px); box-shadow: 0 6px 24px rgba(232,53,42,0.4); }
  .btn-ios {
    display: inline-flex; align-items: center; gap: 10px;
    background: #fff; color: #1a1a2e;
    border: 2px solid #1a1a2e;
    padding: 14px 24px; border-radius: 10px; font-weight: 700;
    font-size: 0.95rem; cursor: pointer; transition: all .2s;
    font-family: 'Nunito', sans-serif;
  }
  .btn-ios:hover { background: #1a1a2e; color: #fff; transform: translateY(-2px); }
  .hero-pills { display: flex; gap: 24px; flex-wrap: wrap; }
  .hero-pill {
    display: flex; align-items: center; gap: 8px;
    font-size: 0.88rem; color: #555; font-weight: 600;
  }
  .hero-pill-icon {
    width: 26px; height: 26px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-size: 0.85rem;
  }

  /* ── PHONE MOCKUP ── */
  .hero-right { flex-shrink: 0; z-index: 2; display: flex; justify-content: center; }
  .phone-wrap {
    width: 300px; background: #111;
    border-radius: 44px; padding: 10px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.08);
    animation: floatPhone 3.5s ease-in-out infinite;
  }
  @keyframes floatPhone { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
  .phone-screen {
    background: #fff; border-radius: 34px; overflow: hidden;
    padding: 14px 12px 8px; display: flex; flex-direction: column; gap: 10px;
  }
  .phone-topbar {
    display: flex; justify-content: space-between; align-items: center;
    padding: 2px 6px;
  }
  .phone-brand {
    font-family: 'Poppins',sans-serif; font-weight: 800; font-size: 0.88rem;
    color: ${PRIMARY}; display: flex; align-items: center; gap: 5px;
  }
  .phone-brand-dot { width: 14px; height: 14px; background: ${PRIMARY}; border-radius: 50%; }
  .phone-active-badge {
    background: #e6f9f0; color: #16a34a;
    border-radius: 20px; padding: 3px 11px;
    font-size: 0.7rem; font-weight: 700; border: 1px solid #bbf7d0;
  }
  .phone-map {
    background: linear-gradient(135deg, #e8f5e9 0%, #f0f9f0 50%, #e8f0fe 100%);
    border-radius: 14px; height: 120px; position: relative; overflow: hidden;
  }
  .map-grid {
    position: absolute; inset: 0;
    background-image: linear-gradient(rgba(0,130,50,.08) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(0,130,50,.08) 1px, transparent 1px);
    background-size: 22px 22px;
  }
  .map-pin {
    position: absolute; top: 38%; left: 50%;
    transform: translate(-50%,-50%);
  }
  .map-pin-dot {
    width: 15px; height: 15px; background: ${PRIMARY};
    border-radius: 50%; border: 2.5px solid #fff;
    box-shadow: 0 2px 10px rgba(232,53,42,.5);
    position: relative; z-index: 2;
  }
  .map-pin-ring {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%,-50%);
    width: 54px; height: 54px; border-radius: 50%;
    border: 2px solid rgba(232,53,42,.35);
    animation: ringPulse 2s ease-out infinite;
  }
  @keyframes ringPulse { 0%{transform:translate(-50%,-50%) scale(0.2);opacity:1} 100%{transform:translate(-50%,-50%) scale(2.8);opacity:0} }
  .map-dist {
    position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
    background: ${PRIMARY}; color: #fff; border-radius: 12px;
    padding: 4px 14px; font-size: 0.72rem; font-weight: 700; white-space: nowrap;
  }
  .alert-card {
    background: #fff; border-radius: 12px;
    border: 1px solid #eee; padding: 11px 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  }
  .alert-user { display: flex; align-items: center; gap: 9px; margin-bottom: 7px; }
  .alert-avatar {
    width: 38px; height: 38px; border-radius: 50%;
    background: linear-gradient(135deg,#f87171,#fb923c);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 800; font-size: 0.95rem; flex-shrink: 0;
  }
  .alert-name { font-weight: 800; font-size: 0.84rem; color: #1a1a2e; }
  .alert-sub { font-size: 0.72rem; color: #888; }
  .alert-msg {
    font-size: 0.8rem; color: #444; margin-bottom: 9px;
    padding: 7px 10px; background: #f9f9f9; border-radius: 8px; line-height: 1.45;
  }
  .alert-tags { display: flex; gap: 6px; flex-wrap: wrap; }
  .atag {
    display: flex; align-items: center; gap: 3px;
    background: #f0fdf4; color: #166534;
    border-radius: 20px; padding: 3px 9px;
    font-size: 0.65rem; font-weight: 700;
  }
  .atag.new { background: #fffbeb; color: #92400e; }
  .phone-btn-red {
    background: ${PRIMARY}; color: #fff; border: none;
    border-radius: 10px; padding: 12px;
    font-weight: 800; font-size: 0.88rem; cursor: pointer;
    font-family: 'Nunito',sans-serif; width: 100%;
    box-shadow: 0 3px 14px rgba(232,53,42,0.35);
  }
  .phone-btn-gray {
    background: #f5f5f5; color: #444; border: none;
    border-radius: 10px; padding: 10px;
    font-weight: 600; font-size: 0.82rem; cursor: pointer;
    font-family: 'Nunito',sans-serif; width: 100%;
  }
  .phone-navbar {
    display: flex; justify-content: space-around;
    padding: 8px 0 4px; border-top: 1px solid #f0f0f0;
  }
  .phone-nav-item {
    display: flex; flex-direction: column; align-items: center;
    gap: 2px; font-size: 0.6rem; color: #888; font-weight: 600;
  }
  .phone-nav-item svg { width: 20px; height: 20px; }

  /* ── TRUSTED ── */
  .trusted-section {
    border-top: 1px solid #f5f5f5; border-bottom: 1px solid #f5f5f5;
    padding: 48px 0; margin: 0; width: 100%;
  }
  .trusted-label {
    text-align: center; font-size: 0.8rem; color: #aaa;
    font-weight: 700; letter-spacing: 1.8px; text-transform: uppercase; margin-bottom: 30px;
  }
  .trusted-logos {
    display: flex; justify-content: center; align-items: center;
    gap: 50px; flex-wrap: wrap;
  }
  .trusted-logo-item {
    display: flex; flex-direction: column; align-items: center; gap: 5px;
    opacity: 0.5; filter: grayscale(1); transition: all .25s; cursor: pointer;
  }
  .trusted-logo-item:hover { opacity: 1; filter: none; }
  .trusted-logo-box {
    width: 42px; height: 42px; border-radius: 10px;
    background: #eee; display: flex; align-items: center;
    justify-content: center; font-weight: 800; font-size: 0.75rem; color: #555;
  }
  .trusted-logo-name { font-size: 0.72rem; font-weight: 700; color: #666; }

  /* ── SECTION BASE ── */
  .section-wrap { padding: 80px 0; margin: 0; width: 100%; }
  .section-wrap.gray { background: #f9fafb; }
  .section-title {
    text-align: center; margin-bottom: 52px;
  }
  .section-title h2 {
    font-family: 'Poppins',sans-serif; font-size: 2.1rem;
    font-weight: 800; color: #1a1a2e; margin-bottom: 10px;
  }
  .section-title p { color: #888; font-size: 1rem; }

  /* ── FEATURES ── */
  .features-grid {
    display: grid; grid-template-columns: repeat(6, 1fr); gap: 20px;
  }
  .feat-card {
    text-align: center; padding: 28px 14px;
    border-radius: 16px; border: 1.5px solid #f0f0f0;
    transition: all .25s; cursor: default;
  }
  .feat-card:hover {
    border-color: ${PRIMARY}; background: ${PRIMARY_LIGHT};
    transform: translateY(-5px); box-shadow: 0 8px 28px rgba(232,53,42,0.12);
  }
  .feat-icon {
    width: 58px; height: 58px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 16px; font-size: 1.5rem;
  }
  .feat-card h4 { font-weight: 800; font-size: 0.9rem; color: #1a1a2e; margin-bottom: 7px; }
  .feat-card p { font-size: 0.78rem; color: #777; line-height: 1.55; }

  /* ── HOW IT WORKS ── */
  .how-steps {
    display: flex; align-items: flex-start;
    justify-content: center; gap: 0;
  }
  .how-step { text-align: center; flex: 1; max-width: 240px; }
  .how-icon-wrap {
    width: 64px; height: 64px; border-radius: 50%;
    background: #fff; box-shadow: 0 4px 18px rgba(0,0,0,0.1);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.6rem; margin: 0 auto 12px;
  }
  .how-num {
    width: 34px; height: 34px; border-radius: 50%;
    background: ${PRIMARY_LIGHT}; border: 2px solid ${PRIMARY};
    color: ${PRIMARY}; font-weight: 900; font-size: 0.95rem;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 14px; font-family: 'Poppins',sans-serif;
  }
  .how-step h4 { font-weight: 800; font-size: 0.95rem; color: #1a1a2e; margin-bottom: 8px; }
  .how-step p { font-size: 0.8rem; color: #777; line-height: 1.55; }
  .how-connector {
    flex: 1; max-width: 70px; height: 2px; margin-top: 84px;
    background: repeating-linear-gradient(90deg, ${PRIMARY} 0, ${PRIMARY} 7px, transparent 7px, transparent 14px);
  }

  /* ── DOWNLOAD CTA ── */
  .dl-wrap { padding: 0 40px 80px; max-width: none; }
  .dl-card {
    background: ${PRIMARY_LIGHT}; border-radius: 24px;
    display: flex; align-items: center; gap: 60px;
    padding: 60px; overflow: hidden; position: relative;
  }
  .dl-card::before {
    content: ''; position: absolute; right: -80px; top: -100px;
    width: 380px; height: 380px;
    background: radial-gradient(circle, rgba(232,53,42,0.09) 0%, transparent 70%);
    border-radius: 50%; pointer-events: none;
  }
  .dl-phones { display: flex; flex-shrink: 0; }
  .dl-phone {
    width: 135px; background: #111; border-radius: 24px; padding: 6px;
    box-shadow: 0 18px 44px rgba(0,0,0,0.25);
  }
  .dl-phone:nth-child(2) { transform: translateX(-22px) translateY(18px); }
  .dl-phone-screen { background: #fff; border-radius: 18px; height: 230px; overflow: hidden; }
  .dl-phone-map {
    background: linear-gradient(135deg,#e8f5e9,#f3f9f3);
    height: 115px; display: flex; align-items: center; justify-content: center; font-size: 2rem;
  }
  .dl-phone-lines { padding: 10px 8px; display: flex; flex-direction: column; gap: 7px; }
  .dl-line { height: 9px; border-radius: 4px; background: #eee; }
  .dl-line.s { width: 58%; }
  .dl-line.r { background: ${PRIMARY}; }
  .dl-info { z-index: 2; }
  .dl-pre { color: ${PRIMARY}; font-weight: 700; font-size: 0.9rem; margin-bottom: 8px; }
  .dl-h2 {
    font-family: 'Poppins',sans-serif; font-size: 2.3rem;
    font-weight: 800; color: #1a1a2e; margin-bottom: 12px;
  }
  .dl-sub { color: #666; font-size: 0.98rem; line-height: 1.65; margin-bottom: 30px; }
  .dl-btns { display: flex; gap: 14px; flex-wrap: wrap; }
  .btn-gplay {
    display: inline-flex; align-items: center; gap: 10px;
    background: ${PRIMARY}; color: #fff; border: none;
    padding: 14px 22px; border-radius: 10px; font-weight: 700;
    font-size: 0.93rem; cursor: pointer; font-family: 'Nunito',sans-serif;
    box-shadow: 0 4px 16px rgba(232,53,42,0.3); transition: all .2s;
  }
  .btn-gplay:hover { background: #c0281f; transform: translateY(-2px); }
  .btn-astore {
    display: inline-flex; align-items: center; gap: 10px;
    background: #1a1a2e; color: #fff; border: none;
    padding: 14px 22px; border-radius: 10px; font-weight: 700;
    font-size: 0.93rem; cursor: pointer; font-family: 'Nunito',sans-serif; transition: all .2s;
  }
  .btn-astore:hover { background: #000; transform: translateY(-2px); }

  /* ── STATS ── */
  .stats-section { border-top: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; padding: 48px 0; }
  .stats-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 20px; }
  .stat-card {
    text-align: center; padding: 26px 16px;
    border-radius: 16px; background: #fff;
    box-shadow: 0 2px 14px rgba(0,0,0,0.06); transition: transform .2s;
  }
  .stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 26px rgba(0,0,0,0.1); }
  .stat-icon-wrap {
    width: 46px; height: 46px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.3rem; margin: 0 auto 12px;
  }
  .stat-num { font-family: 'Poppins',sans-serif; font-size: 2rem; font-weight: 800; color: #1a1a2e; }
  .stat-label { font-size: 0.82rem; color: #888; font-weight: 600; margin-top: 4px; }

  /* ── COMMUNITIES ── */
  .communities-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 22px; }
  .comm-card {
    text-align: center; padding: 32px 18px;
    border-radius: 18px; background: #fff;
    border: 1.5px solid #f0f0f0; transition: all .25s;
  }
  .comm-card:hover { border-color: ${PRIMARY}; transform: translateY(-5px); box-shadow: 0 8px 28px rgba(232,53,42,0.1); }
  .comm-icon { font-size: 2.2rem; margin-bottom: 14px; }
  .comm-card h4 { font-weight: 800; font-size: 0.95rem; color: #1a1a2e; margin-bottom: 8px; }
  .comm-card p { font-size: 0.8rem; color: #777; line-height: 1.55; }

  /* ── TESTIMONIALS ── */
  .testi-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 26px; }
  .testi-card {
    background: #fff; border-radius: 18px; padding: 28px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.07);
    border: 1.5px solid #f5f5f5; transition: all .25s;
  }
  .testi-card:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(0,0,0,0.12); }
  .testi-quote { font-size: 2.2rem; color: ${PRIMARY}; line-height: 1; margin-bottom: 10px; }
  .testi-text { font-size: 0.9rem; color: #444; line-height: 1.7; margin-bottom: 20px; font-style: italic; }
  .testi-author { display: flex; align-items: center; gap: 12px; }
  .testi-av {
    width: 46px; height: 46px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; color: #fff; font-size: 0.92rem; flex-shrink: 0;
  }
  .testi-name { font-weight: 800; font-size: 0.9rem; color: #1a1a2e; }
  .testi-stars { color: #f59e0b; font-size: 0.9rem; margin-top: 3px; }

  /* ── FOOTER ── */
  .footer { background: #1a1a2e; color: #fff; padding: 60px 0 28px; width: 100%; margin: 0; }
  .footer-inner { padding: 0 40px; max-width: none; }
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

  /* ── RESPONSIVE ── */
  @media (max-width: 1100px) {
    .features-grid { grid-template-columns: repeat(3,1fr); }
    .stats-grid { grid-template-columns: repeat(3,1fr); }
    .communities-grid { grid-template-columns: repeat(3,1fr); }
    .footer-grid { grid-template-columns: 1fr 1fr 1fr; gap: 32px; }
    .hero-inner { gap: 40px; }
    .phone-wrap { width: 270px; }
  }
  @media (max-width: 900px) {
    .hero-inner { flex-direction: column; padding: 120px 24px 50px; text-align: center; }
    .hero-desc { max-width: 100%; }
    .hero-btns { justify-content: center; }
    .hero-pills { justify-content: center; }
    .hero-badge { align-self: center; }
    .hero-left { display: flex; flex-direction: column; align-items: center; }
    .nav-links { display: none; }
    .dl-card { flex-direction: column; padding: 36px 28px; }
    .dl-phones { justify-content: center; }
  }
  @media (max-width: 700px) {
    .container, .dl-wrap, .footer-inner { padding: 0; }
    .hero-inner { padding: 120px 16px 40px; }
    .nav-inner { padding: 0; }
    .section-wrap { padding: 50px 0; }
    .features-grid { grid-template-columns: repeat(2,1fr); }
    .testi-grid { grid-template-columns: 1fr; }
    .communities-grid { grid-template-columns: repeat(2,1fr); }
    .stats-grid { grid-template-columns: repeat(2,1fr); }
    .how-steps { flex-direction: column; align-items: center; gap: 28px; }
    .how-connector { display: none; }
    .footer-grid { grid-template-columns: 1fr; gap: 28px; }
    .phone-wrap { width: 260px; }
    .hero-h1 { font-size: 1.9rem; }
  }

  @media (max-width: 900px) {
    .nav-links { display: none; }
    .nav-cta { display: none; }
    .hamburger-btn { display: flex; }
    .nav-inner { padding: 0 40px; }
  }
`;

const LogoIcon = () => (
  <img src="/logo.png" alt="Socius Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
);

const features = [
  { icon: "📍", bg: "#fff0f0", title: "Nearby Help", desc: "Instantly alert and connect with verified people nearby." },
  { icon: "👥", bg: "#eff6ff", title: "Real-time Presence", desc: "People around you are aware and can respond." },
  { icon: "🧭", bg: "#f0fdfa", title: "Smart Navigation", desc: "Get safe routes and live location guidance." },
  { icon: "💬", bg: "#f0fdf4", title: "Quick Communication", desc: "Chat and share updates with your helper." },
  { icon: "⚠️", bg: "#fff7ed", title: "Report & Escalate", desc: "Report incidents and escalate to authorities if needed." },
  { icon: "🤝", bg: "#faf5ff", title: "Offer or Borrow", desc: "Offer items or request things you need." },
];

const steps = [
  { num: 1, icon: "✏️", title: "Share Your Situation", desc: "Tell us what's happening in just a few taps." },
  { num: 2, icon: "👥", title: "People Nearby Are Aware", desc: "Verified users around you get notified instantly." },
  { num: 3, icon: "❤️", title: "Get Help or Offer Help", desc: "Someone comes forward to assist you." },
  { num: 4, icon: "🛡️", title: "Stay Safe Together", desc: "We create a stronger, safer community." },
];

const stats = [
  { icon: "👥", bg: "#fff0f0", num: "1M+", label: "Users" },
  { icon: "✅", bg: "#f0fdf4", num: "50K+", label: "Verified Volunteers" },
  { icon: "🏛️", bg: "#eff6ff", num: "10K+", label: "Institutions" },
  { icon: "📍", bg: "#fdf2f8", num: "500+", label: "Cities" },
  { icon: "⚡", bg: "#fefce8", num: "99.9%", label: "Uptime" },
];

const communities = [
  { icon: "🎓", title: "Educational Institutions", desc: "Ensure student safety on campus and beyond." },
  { icon: "🏠", title: "Residential Societies", desc: "Build a connected and responsive neighborhood." },
  { icon: "💼", title: "Workplaces", desc: "Empower employees with real-time safety support." },
  { icon: "📅", title: "Events & Venues", desc: "Manage crowds and respond faster in emergencies." },
  { icon: "🏛️", title: "Government & NGOs", desc: "Strengthen disaster response and community outreach." },
];

const testimonials = [
  { text: "Socius helped me when I felt helpless. Within minutes, someone reached out and stayed with me until I was safe. Truly life-changing.", name: "Ananya P.", initials: "AP", color: "linear-gradient(135deg,#f87171,#fb923c)", stars: 5 },
  { text: "As a volunteer, I love how easy it is to help someone nearby. Small actions create big impact.", name: "Rahul M.", initials: "RM", color: "linear-gradient(135deg,#60a5fa,#818cf8)", stars: 5 },
  { text: "We implemented Socius in our campus and it has improved safety and response time significantly.", name: "Dr. Neha T.", initials: "NT", color: "linear-gradient(135deg,#34d399,#10b981)", stars: 5 },
];

const trusted = [
  {abbr:"DU", name:"Delhi University"}, {abbr:"AU", name:"Amity University"},
  {abbr:"MU", name:"Manipal"}, {abbr:"NC", name:"NASSCOM"},
  {abbr:"UN", name:"UNICEF"}, {abbr:"ND", name:"NDRF India"},
];

export default function SociusLanding() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <style>{styles}</style>
      <Routes>
        <Route path="/" element={
          <div className="socius-root">

        {/* NAV */}
        <nav className="nav">
          <div className="nav-inner">
            <a className="nav-logo" href="#">
              <LogoIcon />
              Socius
            </a>
            <ul className="nav-links">
              <li><a href="#" className="active">Home</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#institutions">For Institutions</a></li>
              <li><a href="#government">For Government</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#about">About Us</a></li>
              <li><a href="#blog">Blog</a></li>
            </ul>
            <button className="nav-cta">Download App</button>
            <button className="hamburger-btn" onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
            </button>
          </div>
        </nav>
        <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)}></div>
        <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="mobile-menu-links">
            <a href="#" onClick={() => setMobileMenuOpen(false)}><span>🏠</span> Home</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}><span>⚡</span> Features</a>
            <a href="#institutions" onClick={() => setMobileMenuOpen(false)}><span>🏢</span> For Institutions</a>
            <a href="#government" onClick={() => setMobileMenuOpen(false)}><span>🏛️</span> For Government</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}><span>💰</span> Pricing</a>
            <a href="#about" onClick={() => setMobileMenuOpen(false)}><span>ℹ️</span> About Us</a>
            <a href="#blog" onClick={() => setMobileMenuOpen(false)}><span>📝</span> Blog</a>
          </div>
          <div className="mobile-menu-cta">
            <button className="nav-cta">Download App</button>
          </div>
        </div>

        {/* HERO */}
        <section className="hero-section">
          <div className="hero-inner">
            <div className="hero-left">
              <div className="hero-badge">
                <div className="hero-badge-dot"/>
                Live &amp; Active in 500+ Cities
              </div>
              <h1 className="hero-h1">
                You Are Not Alone.
                <span className="hero-h1-red">Help is Closer Than You Think.</span>
              </h1>
              <p className="hero-desc">
                Socius connects people in real-time during moments that matter. Get help, offer help, and create a safer community together.
              </p>
              <div className="hero-btns">
                <button className="btn-android">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.57.06 2.63.91 3.44.91.82 0 2.42-1.14 4.06-.97 1.69.18 2.97.85 3.81 2.2-3.33 2.07-2.71 6.55.69 7.72zm-3.25-14.6C13 7.25 10.59 8.5 10.96 11c2.4.12 4.67-1.2 4.84-3.32z"/></svg>
                  Download for Android
                </button>
                <button className="btn-ios">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06zm-3.01-11.66c.84-1.02 1.4-2.42 1.25-3.84-1.21.05-2.69.81-3.55 1.83-.79.94-1.47 2.35-1.21 3.74 1.33.1 2.69-.71 3.51-1.73z"/></svg>
                  Download for iOS
                </button>
              </div>
              <div className="hero-pills">
                <div className="hero-pill"><div className="hero-pill-icon" style={{background:'#fff0f0'}}>🔴</div>Real-time Help</div>
                <div className="hero-pill"><div className="hero-pill-icon" style={{background:'#f0fdf4'}}>✅</div>Verified Volunteers</div>
                <div className="hero-pill"><div className="hero-pill-icon" style={{background:'#fffbeb'}}>🔒</div>Privacy First</div>
              </div>
            </div>

            {/* PHONE */}
            <div className="hero-right">
              <div className="phone-wrap">
                <div className="phone-screen">
                  <div className="phone-topbar">
                    <div className="phone-brand"><div className="phone-brand-dot"/>Socius</div>
                    <div className="phone-active-badge">Active Request</div>
                  </div>
                  <div className="phone-map">
                    <div className="map-grid"/>
                    <div className="map-pin">
                      <div style={{position:'relative',display:'inline-block'}}>
                        <div className="map-pin-ring"/>
                        <div className="map-pin-dot"/>
                      </div>
                    </div>
                    <div className="map-dist">120 meters away</div>
                  </div>
                  <div className="alert-card">
                    <div className="alert-user">
                      <div className="alert-avatar">R</div>
                      <div>
                        <div className="alert-name">Riya Sharma</div>
                        <div className="alert-sub">Needs presence nearby</div>
                      </div>
                    </div>
                    <div className="alert-msg">I feel unsafe, someone is following me</div>
                    <div className="alert-tags">
                      <span className="atag">✅ Verified user</span>
                      <span className="atag">🤝 Helps others</span>
                      <span className="atag new">⭐ New user</span>
                    </div>
                  </div>
                  <button className="phone-btn-red">Go to Help</button>
                  <button className="phone-btn-gray">Stay Aware</button>
                  <button className="phone-btn-gray">Not Now</button>
                  <div className="phone-navbar">
                    {[
                      {label:"Navigate", path:"M3 11l19-9-9 19-2-8-8-2z"},
                      {label:"Message", path:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"},
                      {label:"Report", path:"M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zm0-14v4m0 4h.01"}
                    ].map(n => (
                      <div className="phone-nav-item" key={n.label}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={n.path}/></svg>
                        {n.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUSTED */}
        <section className="trusted-section">
          <div className="container">
            <div className="trusted-label">Trusted by communities and institutions</div>
            <div className="trusted-logos">
              {trusted.map(t => (
                <div className="trusted-logo-item" key={t.name}>
                  <div className="trusted-logo-box">{t.abbr}</div>
                  <span className="trusted-logo-name">{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="section-wrap" id="features">
          <div className="container">
            <div className="section-title">
              <h2>Powerful Features for Real-Life Safety</h2>
              <p>Everything you need in one app to stay safe and help others.</p>
            </div>
            <div className="features-grid">
              {features.map(f => (
                <div className="feat-card" key={f.title}>
                  <div className="feat-icon" style={{background:f.bg}}>{f.icon}</div>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section-wrap gray">
          <div className="container">
            <div className="section-title">
              <h2>How Socius Works</h2>
              <p>Simple steps. Real impact.</p>
            </div>
            <div className="how-steps">
              {steps.map((s, i) => (
                <>
                  <div className="how-step" key={s.num}>
                    <div className="how-icon-wrap">{s.icon}</div>
                    <div className="how-num">{s.num}</div>
                    <h4>{s.title}</h4>
                    <p>{s.desc}</p>
                  </div>
                  {i < steps.length - 1 && <div className="how-connector" key={`c${i}`}/>}
                </>
              ))}
            </div>
          </div>
        </section>

        {/* DOWNLOAD CTA */}
        <div className="dl-wrap">
          <div className="dl-card">
            <div className="dl-phones">
              {[0, 1].map(i => (
                <div className="dl-phone" key={i}>
                  <div className="dl-phone-screen">
                    <div className="dl-phone-map">{i === 0 ? "🗺️" : "👥"}</div>
                    <div className="dl-phone-lines">
                      <div className="dl-line"/>
                      <div className="dl-line s"/>
                      <div className="dl-line r"/>
                      <div className="dl-line s"/>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="dl-info">
              <p className="dl-pre">Always Here. Always Ready.</p>
              <h2 className="dl-h2">Download Socius Today</h2>
              <p className="dl-sub">Join lakhs of people building safer communities.<br/>Because safety is not just an app. It's us.</p>
              <div className="dl-btns">
                <button className="btn-gplay">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.57.06 2.63.91 3.44.91.82 0 2.42-1.14 4.06-.97 1.69.18 2.97.85 3.81 2.2-3.33 2.07-2.71 6.55.69 7.72zm-3.25-14.6C13 7.25 10.59 8.5 10.96 11c2.4.12 4.67-1.2 4.84-3.32z"/></svg>
                  Get it on Google Play
                </button>
                <button className="btn-astore">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06zm-3.01-11.66c.84-1.02 1.4-2.42 1.25-3.84-1.21.05-2.69.81-3.55 1.83-.79.94-1.47 2.35-1.21 3.74 1.33.1 2.69-.71 3.51-1.73z"/></svg>
                  Download on the App Store
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* STATS */}
        <section className="stats-section">
          <div className="container">
            <div className="stats-grid">
              {stats.map(s => (
                <div className="stat-card" key={s.label}>
                  <div className="stat-icon-wrap" style={{background:s.bg}}>{s.icon}</div>
                  <div className="stat-num">{s.num}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMMUNITIES */}
        <section className="section-wrap" id="institutions">
          <div className="container">
            <div className="section-title">
              <h2>Built for Every Community</h2>
              <p>Socius adapts to your world.</p>
            </div>
            <div className="communities-grid">
              {communities.map(c => (
                <div className="comm-card" key={c.title}>
                  <div className="comm-icon">{c.icon}</div>
                  <h4>{c.title}</h4>
                  <p>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="section-wrap gray">
          <div className="container">
            <div className="section-title">
              <h2>What People Say</h2>
            </div>
            <div className="testi-grid">
              {testimonials.map(t => (
                <div className="testi-card" key={t.name}>
                  <div className="testi-quote">"</div>
                  <p className="testi-text">{t.text}</p>
                  <div className="testi-author">
                    <div className="testi-av" style={{background:t.color}}>{t.initials}</div>
                    <div>
                      <div className="testi-name">– {t.name}</div>
                      <div className="testi-stars">{"★".repeat(t.stars)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
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
                <ul>{["Features","How It Works","Pricing","Download App"].map(l => <li key={l}><a href="#">{l}</a></li>)}</ul>
              </div>
              <div className="footer-col">
                <h5>For Institutions</h5>
                <ul>{["Schools & Colleges","Residential Societies","Workplaces","NGOs"].map(l => <li key={l}><a href="#">{l}</a></li>)}</ul>
              </div>
              <div className="footer-col">
                <h5>Company</h5>
                <ul>{["About Us","Careers","Blog","Contact Us"].map(l => <li key={l}><a href="#">{l}</a></li>)}</ul>
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
      </div>
        } />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/data-protection" element={<DataProtection />} />
      </Routes>
    </>
  );
}
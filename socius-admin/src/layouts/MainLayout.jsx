import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api/client';
import {
  User,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  Menu,
  X,
  Settings,
  Maximize,
  Minimize,
  Bug,
  MapPin,
  Link2
} from 'lucide-react';
import logo from '../assets/images/icon-03.png';

const MainLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pendingIssuesCount, setPendingIssuesCount] = useState(0);
  const [pendingVerificationsCount, setPendingVerificationsCount] = useState(0);
  const location = useLocation();
  const isDeveloper = !!user?.isDeveloper;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Listen for fullscreen change events (e.g., when user presses Esc)
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  React.useEffect(() => {
    if (!user?.accessToken) return;

    const fetchCounts = async () => {
      try {
        const [issuesRes, dashboardRes] = await Promise.all([
          api.get('/admin-issues'),
          isDeveloper ? Promise.resolve(null) : api.get('/admin/dashboard'),
        ]);

        const issues = Array.isArray(issuesRes?.data?.data) ? issuesRes.data.data : [];
        const openCount = issues.filter((i) => i?.status === 'Pending' || i?.status === 'In Progress').length;
        setPendingIssuesCount(openCount);

        if (!isDeveloper) {
          const pendingVerifications = Number(dashboardRes?.data?.data?.pendingVerifications || 0);
          setPendingVerificationsCount(pendingVerifications);
        } else {
          setPendingVerificationsCount(0);
        }
      } catch {
      }
    };

    fetchCounts();
  }, [user?.accessToken, isDeveloper]);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
    navigate(isDeveloper ? '/developer-login' : '/login');
  };

  const handleThemeToggle = () => {
    toggleTheme();
    setIsUserMenuOpen(false);
  };

  const handleAccountSettings = () => {
    setIsUserMenuOpen(false);
    navigate('/account-settings');
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Helper component for Nav Links
  const NavLink = ({ to, icon, children, badge }) => {
    const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
    return (
      <Link
        to={to}
        onClick={closeMobileMenu}
        className={`group flex items-center px-4 py-3 text-sm font-medium transition-colors duration-150 ${isActive
            ? 'bg-socius-red text-white'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
          }`}
      >
        <span className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? 'text-white' : 'text-current'}`}>
          {icon}
        </span>
        <span className="flex-1 min-w-0">{children}</span>
        {badge ? (
          <span className={`ml-3 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-socius-red/10 text-socius-red dark:bg-socius-red/20'}`}>
            {badge}
          </span>
        ) : null}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <img src={logo} alt="Socius Logo" className="h-8 w-8" />
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            Socius <span className="text-gray-500 font-normal text-lg">— {isDeveloper ? 'Developer' : 'Admin'}</span>
          </h1>
        </div>
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto">
        {!isDeveloper && (
          <NavLink to="/dashboard" icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          }>Dashboard</NavLink>
        )}

        <NavLink to="/issue-tracker" icon={<Bug className="w-5 h-5" />} badge={pendingIssuesCount > 0 ? pendingIssuesCount : null}>Issue Tracker</NavLink>
        <NavLink to="/public-locations" icon={<MapPin className="w-5 h-5" />}>Public Locations</NavLink>
        <NavLink to="/tracking-links" icon={<Link2 className="w-5 h-5" />}>Tracking Links</NavLink>
        <NavLink to="/gallery-settings" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        }>Gallery Settings</NavLink>

        {!isDeveloper && (
          <>
        <NavLink to="/live-awareness" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        }>Live Awareness</NavLink>

        <NavLink to="/daily-help" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c1.657 0 3-1.343 3-3S13.657 2 12 2 9 3.343 9 5s1.343 3 3 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 21v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12v4" />
          </svg>
        }>DailyHelp</NavLink>

        <NavLink to="/incident-review" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        }>Incident Review</NavLink>

        <NavLink to="/users" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        }>Users & Volunteers</NavLink>

        {!isDeveloper && user?.isAdmin && (
        <NavLink to="/verification" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        } badge={pendingVerificationsCount > 0 ? pendingVerificationsCount : null}>Verification Queue</NavLink>
        )}

        <NavLink to="/content" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        }>Content Management</NavLink>

        <NavLink to="/static-pages" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }>Static Pages</NavLink>

        <NavLink to="/reports" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }>Reports & Exports</NavLink>

        <NavLink to="/notifications" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-9.33-4.906" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 19a2 2 0 11-4 0" />
          </svg>
        }>Notifications</NavLink>

        <NavLink to="/appeals" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8M3 21h18M3 21l8-8 8 8M3 10l5-7 5 7 5-7" />
          </svg>
        }>Appeals & Re-verification</NavLink>

        <NavLink to="/subscriptions" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }>Subscriptions</NavLink>

        <NavLink to="/risk-tiers" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        }>Risk Tiers & Safeguards</NavLink>

        <NavLink to="/settings" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }>System Settings</NavLink>

        <NavLink to="/audit-logs" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }>Audit Logs</NavLink>
          </>
        )}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      {/* Desktop Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 shadow-md hidden md:flex md:flex-col fixed inset-y-0 left-0 z-30 transition-colors duration-200">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar (Overlay) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            {/* Overlay backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity"
              onClick={closeMobileMenu}
            ></motion.div>

            {/* Sidebar panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-800"
            >
              <SidebarContent />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-20 sticky top-0">
          <div className="flex items-center">
            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-socius-red mr-3"
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Logo for Mobile/Closed Sidebar */}
            <div className="flex items-center space-x-2 md:hidden">
              <img src={logo} alt="Socius Logo" className="h-8 w-8" />
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                Socius <span className="text-gray-500 font-normal text-lg">— {isDeveloper ? 'Developer' : 'Admin'}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-full text-gray-500 hover:text-socius-red hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 transition-all duration-200 focus:outline-none"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </button>

            {/* User Dropdown */}
            <div className="relative ml-1">
              <div>
                <button
                  onClick={toggleUserMenu}
                  className={`flex items-center gap-3 pl-1 pr-3 py-1 bg-white dark:bg-gray-800 rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-socius-red ${isUserMenuOpen
                      ? 'border-socius-red ring-2 ring-socius-red ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
                      : 'border-gray-200 dark:border-gray-700 hover:border-socius-red dark:hover:border-socius-red'
                    }`}
                  id="user-menu-button"
                  aria-expanded="false"
                  aria-haspopup="true"
                >
                  <span className="sr-only">Open user menu</span>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${isUserMenuOpen
                      ? 'bg-socius-red text-white'
                      : 'bg-socius-red/10 dark:bg-red-900/20 text-socius-red dark:text-red-400'
                    }`}>
                    <User className="h-5 w-5" />
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180 text-socius-red' : 'text-gray-500 dark:text-gray-400'
                    }`} />
                </button>
              </div>

              {/* Dropdown menu */}
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-lg shadow-xl bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                    tabIndex="-1"
                  >
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Signed in as</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.email || user?.name || (isDeveloper ? 'Developer User' : 'Admin User')}</p>
                    </div>

                    <div className="py-1">
                      {!isDeveloper && (
                        <button
                          onClick={handleAccountSettings}
                          className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          role="menuitem"
                        >
                          <Settings className="mr-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
                          Account Settings
                        </button>
                      )}

                      <button
                        onClick={handleThemeToggle}
                        className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        role="menuitem"
                      >
                        {theme === 'light' ? (
                          <Moon className="mr-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <Sun className="mr-3 h-4 w-4 text-yellow-500" />
                        )}
                        <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                      </button>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        role="menuitem"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 relative bg-white dark:bg-gray-900 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;

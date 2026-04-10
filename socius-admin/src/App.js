import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';

// Pages
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import LiveAwarenessPage from './pages/LiveAwarenessPage';
import LiveAwarenessDetailsPage from './pages/LiveAwarenessDetailsPage';
import IncidentReviewPage from './pages/IncidentReviewPage';
import UsersVolunteersPage from './pages/UsersVolunteersPage';
import UserProfilePage from './pages/UserProfilePage';
import VerificationQueuePage from './pages/VerificationQueuePage';
import VerificationReviewPage from './pages/VerificationReviewPage';
import ContentManagementPage from './pages/ContentManagementPage';
import StaticPageEditor from './pages/StaticPageEditor';
import ReportsSafetyFlagsPage from './pages/ReportsSafetyFlagsPage';
import NotificationCenterPage from './pages/NotificationCenterPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import AppealsPage from './pages/AppealsPage';
import RiskTiersPage from './pages/RiskTiersPage';
import SubscriptionSettingsPage from './pages/SubscriptionSettingsPage';
import ScenarioConfigPage from './pages/ScenarioConfigPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import DailyHelpPage from './pages/DailyHelpPage';
import DailyHelpRequestDetailPage from './pages/DailyHelpRequestDetailPage';
import IssueTrackerPage from './pages/IssueTrackerPage';
import IssueDetailsPage from './pages/IssueDetailsPage';
import PublicLocationsPage from './pages/PublicLocationsPage';
import PublicLocationProfilePage from './pages/PublicLocationProfilePage';
import TrackingLinksPage from './pages/TrackingLinksPage';
import GallerySettingsPage from './pages/GallerySettingsPage';
import BlogTypesPage from './pages/BlogTypesPage';
import BlogsPage from './pages/BlogsPage';
import PresenceCatalogPage from './pages/PresenceCatalogPage';
import PrepareCardsPage from './pages/PrepareCardsPage';
import PrepareCardEditorPage from './pages/PrepareCardEditorPage';
import PrepareLearnPage from './pages/PrepareLearnPage';
import CommunitySurveyPage from './pages/CommunitySurveyPage';

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) {
    const home = user?.isDeveloper ? '/issue-tracker' : '/dashboard';
    return <Navigate to={home} replace />;
  }
  return children;
};

const LandingRoute = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user?.isDeveloper ? '/issue-tracker' : '/dashboard'} replace />;
};

function App() {
  const { theme } = useTheme();

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <Toaster
          position="top-right"
          reverseOrder={false}
          toastOptions={{
            style: {
              background: theme === 'dark' ? '#1f2937' : '#ffffff',
              color: theme === 'dark' ? '#f3f4f6' : '#111827',
              border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
            },
            success: {
              iconTheme: {
                primary: '#16a34a',
                secondary: '#ffffff',
              },
            },
            error: {
              iconTheme: {
                primary: '#dc2626',
                secondary: '#ffffff',
              },
            },
          }}
        />
        <Routes>
          {/* Public Routes */}
          <Route
            element={
              <PublicRoute>
                <AuthLayout />
              </PublicRoute>
            }
          >
            <Route path="/login" element={<LoginPage />} />
            <Route path="/developer-login" element={<LoginPage />} />
            <Route path="/login-developer" element={<Navigate to="/developer-login" replace />} />
            <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Protected Routes (Shared) */}
          <Route
            element={
              <ProtectedRoute allow={['admin', 'developer']}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<LandingRoute />} />
            <Route path="/issue-tracker" element={<IssueTrackerPage />} />
            <Route path="/issue-tracker/:id" element={<IssueDetailsPage />} />
            <Route path="/public-locations" element={<PublicLocationsPage />} />
            <Route path="/public-locations/:visitorId" element={<PublicLocationProfilePage />} />
            <Route path="/tracking-links" element={<TrackingLinksPage />} />
            <Route path="/gallery-settings" element={<GallerySettingsPage />} />
          </Route>

          {/* Protected Routes (Admin Only) */}
          <Route
            element={
              <ProtectedRoute allow={['admin']}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/live-awareness" element={<LiveAwarenessPage />} />
            <Route path="/live-awareness/:id" element={<LiveAwarenessDetailsPage />} />
            <Route path="/daily-help/:kind/:id" element={<DailyHelpRequestDetailPage />} />
            <Route path="/daily-help" element={<DailyHelpPage />} />
            <Route path="/help-catalog" element={<Navigate to="/daily-help" replace />} />
            <Route path="/incident-review" element={<IncidentReviewPage />} />
            <Route path="/users" element={<UsersVolunteersPage />} />
            <Route path="/users/:userId" element={<UserProfilePage />} />
            <Route path="/verification" element={<VerificationQueuePage />} />
            <Route path="/verification/:requestId" element={<VerificationReviewPage />} />
            <Route path="/content" element={<ContentManagementPage />} />
            <Route path="/static-pages" element={<ContentManagementPage initialTab="Static Pages" />} />
            <Route path="/static-pages/new" element={<StaticPageEditor />} />
            <Route path="/static-pages/edit/:slug" element={<StaticPageEditor />} />
            <Route path="/reports" element={<ReportsSafetyFlagsPage />} />
            <Route path="/notifications" element={<NotificationCenterPage />} />
            <Route path="/settings" element={<SystemSettingsPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/appeals" element={<AppealsPage />} />
            <Route path="/risk-tiers" element={<RiskTiersPage />} />
            <Route path="/subscriptions" element={<SubscriptionSettingsPage />} />
            <Route path="/content/scenario-config" element={<ScenarioConfigPage />} />
            <Route path="/blog-types" element={<BlogTypesPage />} />
            <Route path="/blogs" element={<BlogsPage />} />
            <Route path="/community-survey" element={<CommunitySurveyPage />} />
            <Route path="/presence-catalog" element={<PresenceCatalogPage />} />
            <Route path="/prepare-cards" element={<PrepareCardsPage />} />
            <Route path="/prepare-cards/new" element={<PrepareCardEditorPage />} />
            <Route path="/prepare-cards/edit/:id" element={<PrepareCardEditorPage />} />
            <Route path="/prepare-learn" element={<PrepareLearnPage />} />
            <Route path="/account-settings" element={<AccountSettingsPage />} />
          </Route>


        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const getUserType = (user) => {
  if (user?.isDeveloper) return 'developer';
  if (user?.isAdmin) return 'admin';
  return 'unknown';
};

const ProtectedRoute = ({ children, allow }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Redirect to login page, but save the current location they were trying to go to
    const loginPath = Array.isArray(allow) && allow.length === 1 && allow[0] === 'developer'
      ? '/developer-login'
      : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (Array.isArray(allow) && allow.length > 0) {
    const userType = getUserType(user);
    if (!allow.includes(userType)) {
      // If user doesn't have required permissions, redirect to appropriate page
      // but don't create infinite redirects
      const currentPath = location.pathname;
      
      // Special handling for verification queue - require admin access
      if (currentPath.includes('/verification') && !user?.isAdmin) {
        return <Navigate to="/dashboard" replace />;
      }
      
      const fallback = userType === 'developer' ? '/issue-tracker' : '/dashboard';
      
      // Avoid redirecting to the same page
      if (currentPath === fallback) {
        return <Navigate to="/login" replace />;
      }
      
      return <Navigate to={fallback} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

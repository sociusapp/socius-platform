import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api/client';
import { clearAdminPriorityToastSession } from '../utils/adminPriorityToasts';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('socius_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const hasRoleFlags =
          typeof parsed?.isAdmin === 'boolean' || typeof parsed?.isDeveloper === 'boolean';

        if (!hasRoleFlags) {
          localStorage.removeItem('socius_user');
          setUser(null);
          setLoading(false);
          return;
        }

        setUser(parsed);
        if (parsed?.accessToken) {
          api.defaults.headers.common.Authorization = `Bearer ${parsed.accessToken}`;
        }
      } catch {
        localStorage.removeItem('socius_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/admin-login', {
        email,
        password,
      });

      const { success, data, message } = response?.data || {};

      if (!success || !data) {
        return { ok: false, error: message || 'Login failed' };
      }

      if (!data.user?.isAdmin) {
        return { ok: false, error: 'Admin access only' };
      }

      const mappedUser = {
        id: data.user._id || data.user.id,
        phone: data.user.phone,
        email: data.user.email,
        name: data.user.fullName || data.user.name || 'Admin User',
        role: data.user.role,
        isAdmin: !!data.user.isAdmin,
        isDeveloper: !!data.user.isDeveloper,
        accessToken: data.accessToken,
      };

      setUser(mappedUser);
      localStorage.setItem('socius_user', JSON.stringify(mappedUser));
      if (mappedUser.accessToken) {
        api.defaults.headers.common.Authorization = `Bearer ${mappedUser.accessToken}`;
      }

      return { ok: true };
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message;

      return { ok: false, error: apiMessage || 'Login failed' };
    }
  };

  const loginDeveloper = async (email, password) => {
    try {
      const response = await api.post('/auth/developer-login', {
        email,
        password,
      });

      const { success, data, message } = response?.data || {};

      if (!success || !data) {
        return { ok: false, error: message || 'Login failed' };
      }

      if (!data.user?.isDeveloper) {
        return { ok: false, error: 'Developer access only' };
      }

      const mappedUser = {
        id: data.user._id || data.user.id,
        phone: data.user.phone,
        email: data.user.email,
        name: data.user.fullName || data.user.name || 'Developer User',
        role: data.user.role,
        isAdmin: !!data.user.isAdmin,
        isDeveloper: !!data.user.isDeveloper,
        accessToken: data.accessToken,
      };

      setUser(mappedUser);
      localStorage.setItem('socius_user', JSON.stringify(mappedUser));
      if (mappedUser.accessToken) {
        api.defaults.headers.common.Authorization = `Bearer ${mappedUser.accessToken}`;
      }

      return { ok: true };
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.[0]?.message;

      return { ok: false, error: apiMessage || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (error) {
    }
    clearAdminPriorityToastSession();
    setUser(null);
    localStorage.removeItem('socius_user');
    delete api.defaults.headers.common.Authorization;
  };

  return (
    <AuthContext.Provider value={{ user, login, loginDeveloper, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

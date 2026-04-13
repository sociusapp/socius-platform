import React, { createContext, useContext, useState, useEffect } from 'react';

const LogoContext = createContext(null);

const STORAGE_KEY = 'socius_custom_logo';

export const LogoProvider = ({ children }) => {
  const [customLogo, setCustomLogo] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setCustomLogo(stored);
    }
  }, []);

  const setLogo = (base64Image) => {
    if (base64Image) {
      localStorage.setItem(STORAGE_KEY, base64Image);
      setCustomLogo(base64Image);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setCustomLogo(null);
    }
  };

  const clearLogo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCustomLogo(null);
  };

  return (
    <LogoContext.Provider value={{ customLogo, setLogo, clearLogo }}>
      {children}
    </LogoContext.Provider>
  );
};

export const useLogo = () => {
  const context = useContext(LogoContext);
  if (!context) {
    throw new Error('useLogo must be used within a LogoProvider');
  }
  return context;
};

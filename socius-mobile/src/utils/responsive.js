import { useWindowDimensions, PixelRatio, Platform } from 'react-native';

export const breakpoints = { 
  tablet: 768, 
  smallPhone: 360, 
  largePhone: 414 
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = {
  width: 375, // Base width (iPhone 11/12/13/14/15/16)
  height: 812 // Base height
};

export const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

// Responsive sizing helpers
export const scale = (size, width) => (width / SCREEN_WIDTH) * size;
export const vscale = (size, height) => (height / SCREEN_HEIGHT) * size;
export const moderateScale = (size, width, factor = 0.5) => size + (scale(size, width) - size) * factor;

// Percentage based helpers
export const wp = (percentage, width) => (width * percentage) / 100;
export const hp = (percentage, height) => (height * percentage) / 100;

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= breakpoints.tablet;
  const isSmallDevice = width < breakpoints.smallPhone;

  // Optimized scaling factor for fonts
  const fontScale = PixelRatio.getFontScale();
  const getFontSize = (size) => {
    const scaledSize = moderateScale(size, width, isTablet ? 0.4 : 0.25);
    return scaledSize / fontScale;
  };

  return {
    width,
    height,
    isTablet,
    isSmallDevice,
    // Content layout
    contentWidth: Math.min(560, width * 0.9),
    spacing: (val) => moderateScale(val, width, 0.3),
    
    // Scaling functions
    scale: (size) => scale(size, width),
    vscale: (size) => vscale(size, height),
    ms: (size, factor = 0.5) => moderateScale(size, width, factor),
    
    // Percentage helpers
    wp: (p) => wp(p, width),
    hp: (p) => hp(p, height),
    
    // Font scaling
    titleFont: (size = 28) => getFontSize(size),
    subtitleFont: (size = 16) => getFontSize(size),
    bodyFont: (size = 14) => getFontSize(size),
    smallFont: (size = 12) => getFontSize(size),

    // Device specific values
    paddingHorizontal: isTablet ? 40 : 20,
    safeAreaPadding: Platform.OS === 'ios' ? 44 : 20,
    
    // Component specific
    otpSize: clamp(Math.floor(width * 0.12), 44, 64),
    radius: (size) => Math.round(size * (width / SCREEN_WIDTH)),
  };
};


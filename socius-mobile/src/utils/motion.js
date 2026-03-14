import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

const getWebReducedMotion = () => {
  try {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
};

export const useReducedMotion = () => {
  const [reducedMotionEnabled, setReducedMotionEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (Platform.OS === 'web') {
      const reduced = getWebReducedMotion();
      if (mounted) setReducedMotionEnabled(reduced);
      return () => {
        mounted = false;
      };
    }

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReducedMotionEnabled(!!enabled);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (enabled) => {
      if (mounted) setReducedMotionEnabled(!!enabled);
    });

    return () => {
      mounted = false;
      if (sub?.remove) sub.remove();
    };
  }, []);

  return reducedMotionEnabled;
};

export const motionDurations = {
  micro: 200,
  short: 260,
  medium: 320,
  long: 400,
};

export const motionDefaults = {
  durationMs: motionDurations.short,
};

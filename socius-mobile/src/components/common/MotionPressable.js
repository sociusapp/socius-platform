import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { motionDurations, useReducedMotion } from '../../utils/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const MotionPressable = ({
  children,
  disabled,
  style,
  pressScale = 0.985,
  hoverOpacity = 0.96,
  pressOpacity = 0.92,
  durationMs = motionDurations.short,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  ...props
}) => {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const config = useMemo(
    () => ({
      duration: Math.min(Math.max(Number(durationMs) || motionDurations.short, 200), 400),
      easing: Easing.inOut(Easing.ease),
    }),
    [durationMs]
  );

  const animateTo = (nextScale, nextOpacity) => {
    if (reducedMotion) {
      scale.value = nextScale;
      opacity.value = nextOpacity;
      return;
    }
    scale.value = withTiming(nextScale, config);
    opacity.value = withTiming(nextOpacity, config);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        if (!disabled) animateTo(pressScale, pressOpacity);
        if (onPressIn) onPressIn(e);
      }}
      onPressOut={(e) => {
        if (!disabled) animateTo(1, 1);
        if (onPressOut) onPressOut(e);
      }}
      onHoverIn={(e) => {
        if (!disabled) animateTo(1, hoverOpacity);
        if (onHoverIn) onHoverIn(e);
      }}
      onHoverOut={(e) => {
        if (!disabled) animateTo(1, 1);
        if (onHoverOut) onHoverOut(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
};

export default MotionPressable;


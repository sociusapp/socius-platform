import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';

const usePulse = ({ min = 0.35, max = 0.85, durationMs = 900 } = {}) => {
  const opacity = useRef(new Animated.Value(max)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: min, duration: durationMs, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: max, duration: durationMs, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [durationMs, max, min, opacity]);

  return opacity;
};

const SkeletonBox = ({
  width = '100%',
  height = 12,
  radius = 10,
  style,
  backgroundColor = '#E5E7EB',
  pulse = true,
}) => {
  const opacity = usePulse();
  const baseStyle = useMemo(
    () => ({
      width,
      height,
      borderRadius: radius,
      backgroundColor,
      overflow: 'hidden',
    }),
    [backgroundColor, height, radius, width]
  );

  if (!pulse) {
    return <View style={[baseStyle, style]} />;
  }

  return <Animated.View style={[baseStyle, style, { opacity }]} />;
};

const SkeletonCircle = ({ size = 40, style, backgroundColor = '#E5E7EB', pulse = true }) => {
  return (
    <SkeletonBox
      width={size}
      height={size}
      radius={size / 2}
      style={style}
      backgroundColor={backgroundColor}
      pulse={pulse}
    />
  );
};

const SkeletonSpacer = ({ height = 12 }) => <View style={{ height }} />;

export { SkeletonBox, SkeletonCircle, SkeletonSpacer };

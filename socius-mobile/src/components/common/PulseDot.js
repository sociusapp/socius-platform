import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';

const PulseDot = ({ color = '#DC5C69', size = 8, ringScale = 2.6, ringOpacity = 0.25 }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 720, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(scale, { toValue: ringScale, duration: 940, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );

    anim.start();
    return () => anim.stop();
  }, [opacity, scale, ringScale]);

  const ringSize = useMemo(() => Math.max(size * ringScale, size + 2), [size, ringScale]);
  const ringRadius = ringSize / 2;
  const dotRadius = size / 2;

  return (
    <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: ringSize,
          height: ringSize,
          borderRadius: ringRadius,
          backgroundColor: color,
          opacity: opacity.interpolate({
            inputRange: [0, 1],
            outputRange: [0, ringOpacity],
          }),
          transform: [{ scale }],
        }}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: dotRadius,
          backgroundColor: color,
        }}
      />
    </View>
  );
};

export default PulseDot;

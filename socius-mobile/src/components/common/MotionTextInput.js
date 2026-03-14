import React, { useMemo } from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { motionDurations, useReducedMotion } from '../../utils/motion';

const AnimatedView = Animated.createAnimatedComponent(View);

const MotionTextInput = ({
  containerStyle,
  inputStyle,
  durationMs = motionDurations.short,
  focusBorderColor = '#DC5C69',
  blurBorderColor = '#E5E7EB',
  focusShadowColor = '#DC5C69',
  ...props
}) => {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  const config = useMemo(
    () => ({
      duration: Math.min(Math.max(Number(durationMs) || motionDurations.short, 200), 400),
      easing: Easing.inOut(Easing.ease),
    }),
    [durationMs]
  );

  const setFocused = (focused) => {
    const to = focused ? 1 : 0;
    if (reducedMotion) {
      progress.value = to;
      return;
    }
    progress.value = withTiming(to, config);
  };

  const animatedStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(progress.value, [0, 1], [blurBorderColor, focusBorderColor]);
    const shadowOpacity = 0.08 + 0.12 * progress.value;
    const scale = 1 - 0.006 * progress.value;
    return {
      borderColor,
      shadowColor: focusShadowColor,
      shadowOpacity,
      transform: reducedMotion ? undefined : [{ scale }],
    };
  });

  return (
    <AnimatedView style={[styles.container, animatedStyle, containerStyle]}>
      <TextInput
        {...props}
        onFocus={(e) => {
          setFocused(true);
          if (props.onFocus) props.onFocus(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          if (props.onBlur) props.onBlur(e);
        }}
        style={[styles.input, inputStyle]}
      />
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 2,
  },
  input: {
    fontSize: 16,
    color: '#111827',
    padding: 0,
  },
});

export default MotionTextInput;


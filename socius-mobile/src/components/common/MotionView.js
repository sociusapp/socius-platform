import React, { useMemo } from 'react';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInDown,
  SlideInUp,
  SlideOutDown,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { useReducedMotion, motionDurations } from '../../utils/motion';

const build = (factory, { duration, delay }) => {
  let a = factory.duration(duration);
  if (delay) a = a.delay(delay);
  return a;
};

const presetMap = {
  fade: (opts) => build(FadeIn, opts),
  fadeDown: (opts) => build(FadeInDown, opts),
  fadeUp: (opts) => build(FadeInUp, opts),
  slideUp: (opts) => build(SlideInUp, opts),
  slideDown: (opts) => build(SlideInDown, opts),
  zoomIn: (opts) => build(ZoomIn, opts),
};

const exitMap = {
  fade: (opts) => build(FadeOut, opts),
  zoomOut: (opts) => build(ZoomOut, opts),
  slideDown: (opts) => build(SlideOutDown, opts),
};

const MotionView = ({
  preset = 'fadeUp',
  exitPreset,
  delay = 0,
  duration = motionDurations.short,
  exitDuration = motionDurations.short,
  style,
  children,
  ...props
}) => {
  const reduced = useReducedMotion();

  const entering = useMemo(() => {
    if (reduced) return undefined;
    const fn = presetMap[preset] || presetMap.fadeUp;
    return fn({ duration, delay });
  }, [reduced, preset, duration, delay]);

  const exiting = useMemo(() => {
    if (reduced) return undefined;
    if (!exitPreset) return undefined;
    const fn = exitMap[exitPreset];
    if (!fn) return undefined;
    return fn({ duration: exitDuration, delay: 0 });
  }, [reduced, exitPreset, exitDuration]);

  return (
    <Animated.View entering={entering} exiting={exiting} style={style} {...props}>
      {children}
    </Animated.View>
  );
};

export default MotionView;


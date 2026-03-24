import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SWIPE_THRESHOLD = 50;

const SwipeableMessage = ({ children, onReply, isMyMessage }) => {
  const translateX = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      const tx = event.translationX;
      if (isMyMessage) {
        translateX.value = tx < 0 ? tx * 0.5 : 0;
      } else {
        translateX.value = tx > 0 ? tx * 0.5 : 0;
      }
    })
    .onEnd((event) => {
      const thresholdMet = isMyMessage
        ? event.translationX < -SWIPE_THRESHOLD
        : event.translationX > SWIPE_THRESHOLD;

      if (thresholdMet) {
        runOnJS(onReply)();
      }
      translateX.value = withSpring(0);
    });

  const rStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const rIconStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [0.5, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, styles.iconContainer, isMyMessage ? styles.iconRight : styles.iconLeft]}>
        <Animated.View style={rIconStyle}>
           <View style={styles.circle}>
             <Icon name="reply" size={20} color="#C84D59" />
           </View>
        </Animated.View>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[rStyle, { width: '100%' }]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    width: '100%',
  },
  iconContainer: {
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconLeft: {
    alignItems: 'flex-start',
  },
  iconRight: {
    alignItems: 'flex-end',
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
});

export default SwipeableMessage;

// src/components/common/Button.js
// Reusable button component matching design image 100%

import React, { useEffect } from 'react';
import {
  Text,
  ActivityIndicator,
  View,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence, 
  withDelay,
  Easing,
  interpolate,
  cancelAnimation
} from 'react-native-reanimated';
import MotionPressable from './MotionPressable';

const APP_PRIMARY_BUTTON = '#C93F46';

const styles = StyleSheet.create({
  buttonContainer: {
    marginBottom: 10,
  },
  buttonBase: {
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: 24,
    paddingVertical: 15,
    overflow: 'hidden', // Required for fly animation
    // iOS Shadow
    shadowColor: '#8B3A36',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    // Android Elevation
    elevation: 8,
  },
  fullWidth: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: APP_PRIMARY_BUTTON,
  },
  emergencyButton: {
    backgroundColor: APP_PRIMARY_BUTTON,
  },
  secondaryButton: {
    backgroundColor: '#F5F1ED',
    borderWidth: 2,
    borderColor: APP_PRIMARY_BUTTON,
    shadowOpacity: 0.2,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: APP_PRIMARY_BUTTON,
    elevation: 0,
    shadowOpacity: 0,
  },
  whiteButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D0D5DD',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  linkButton: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
    paddingVertical: 10,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryText: {
    color: APP_PRIMARY_BUTTON,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  outlineText: {
    color: APP_PRIMARY_BUTTON,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  whiteText: {
    color: '#2C3E50',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  linkText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  iconSpacing: {
    marginRight: 8,
  },
  gradientFill: {
    borderRadius: 28,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: -1,
  },
  loaderCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const Button = ({
  title,
  onPress,
  variant = 'primary', // primary, secondary, emergency, outline, gradient, white, link
  size = 'medium', // small, medium, large
  loading = false,
  success = false, // New success state for final fly animation
  disabled = false,
  fullWidth = true,
  icon = null,
  fly = false, // New fly animation prop
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  ...props
}) => {
  const iconTranslateX = useSharedValue(0);
  const iconOpacity = useSharedValue(1);
  const textOpacity = useSharedValue(1);
  const loaderOpacity = useSharedValue(0);
  const loaderScale = useSharedValue(0.5);
  
  // New success icon specific values
  const successIconTranslateX = useSharedValue(0);
  const successIconOpacity = useSharedValue(0);

  useEffect(() => {
    if (loading && fly && !success) {
      // Step 1: Fly out the current icon and show loader
      iconTranslateX.value = withTiming(100, { 
        duration: 400, 
        easing: Easing.bezier(0.4, 0, 0.2, 1) 
      });
      iconOpacity.value = withTiming(0, { duration: 300 });
      textOpacity.value = withTiming(0, { duration: 250 });
      
      // Loader appearance
      loaderOpacity.value = withDelay(300, withTiming(1, { duration: 300 }));
      loaderScale.value = withDelay(300, withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.back(1.5)) 
      }));
    } else if (success && fly) {
      // Step 2: Final success animation - Fly from center to right
      
      // Stop any previous animations immediately
      cancelAnimation(loaderOpacity);
      cancelAnimation(loaderScale);

      // 1. Instantly hide the loader
      loaderOpacity.value = withTiming(0, { duration: 150 });
      loaderScale.value = withTiming(0.2, { duration: 150 });
      
      // 2. Animate the SUCCESS icon (which is already centered absolutely)
      successIconTranslateX.value = 0;
      successIconOpacity.value = withSequence(
        withDelay(200, withTiming(1, { duration: 250 })), // Fade in exactly at center
        withDelay(200, withTiming(1, { duration: 500 })), // Stay visible while moving
        withTiming(0, { duration: 200 })  // Finally fade out at the very right
      );
      
      successIconTranslateX.value = withSequence(
        withTiming(0, { duration: 600 }), // Wait at center
        withTiming(250, { // Fly away fast to the right
          duration: 700,
          easing: Easing.bezier(0.4, 0, 0.2, 1)
        })
      );
    } else if (!loading && !success) {
      // Reset animations
      iconTranslateX.value = withTiming(0, { duration: 300 });
      iconOpacity.value = withTiming(1, { duration: 300 });
      textOpacity.value = withTiming(1, { duration: 300 });
      loaderOpacity.value = withTiming(0, { duration: 200 });
      loaderScale.value = withTiming(0.5, { duration: 200 });
      successIconTranslateX.value = 0;
      successIconOpacity.value = 0;
    }
  }, [loading, fly, success]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: iconTranslateX.value }],
    opacity: iconOpacity.value,
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ scale: interpolate(textOpacity.value, [0, 1], [0.9, 1]) }],
  }));

  const animatedLoaderStyle = useAnimatedStyle(() => ({
    opacity: loaderOpacity.value,
    transform: [{ scale: loaderScale.value }],
  }));

  const animatedSuccessIconStyle = useAnimatedStyle(() => ({
    opacity: successIconOpacity.value,
    transform: [{ translateX: successIconTranslateX.value }],
    position: 'absolute',
  }));

  const getButtonVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryButton;
      case 'emergency':
        return styles.emergencyButton;
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      case 'white':
        return styles.whiteButton;
      case 'link':
        return styles.linkButton;
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
      case 'emergency':
      case 'gradient':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'white':
        return styles.whiteText;
      case 'link':
        return styles.linkText;
      default:
        return styles.primaryText;
    }
  };

  const getLoaderColor = () => {
    return variant === 'primary' || variant === 'emergency' || variant === 'gradient' ? '#FFFFFF' : APP_PRIMARY_BUTTON;
  };

  const getSizeStyle = () => {
    const sizeStyles = {};
    if (size === 'large') {
      sizeStyles.paddingVertical = 18;
      sizeStyles.minHeight = 62;
    } else if (size === 'small') {
      sizeStyles.paddingVertical = 12;
      sizeStyles.minHeight = 48;
    }
    return sizeStyles;
  };

  return (
    <View style={[styles.buttonContainer, fullWidth && { width: '100%' }]}>
      <MotionPressable
        style={[
          styles.buttonBase,
          getButtonVariantStyle(),
          fullWidth && styles.fullWidth,
          getSizeStyle(),
          (disabled || loading) && { opacity: 0.9 }, // Less opacity drop during loading
          style,
        ]}
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!(disabled || loading) }}
        {...props}
      >
        {variant === 'gradient' && (
          <LinearGradient
            colors={[APP_PRIMARY_BUTTON, APP_PRIMARY_BUTTON]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientFill}
          />
        )}
        
        {fly ? (
          <>
            {icon && (
              <Animated.View style={[styles.iconSpacing, animatedIconStyle]}>
                {icon}
              </Animated.View>
            )}
            
            <Animated.View style={animatedTextStyle}>
              <Text style={[getTextStyle(), textStyle]}>{title}</Text>
            </Animated.View>

            {/* Centered container for Loader */}
            <View style={styles.centeredContent} pointerEvents="none">
              <Animated.View style={[animatedLoaderStyle, styles.loaderCircle]}>
                <ActivityIndicator color={getLoaderColor()} size="small" />
              </Animated.View>
            </View>

            {/* Centered container for Success Fly Icon */}
            <View style={styles.centeredContent} pointerEvents="none">
              <Animated.View style={animatedSuccessIconStyle}>
                {icon}
              </Animated.View>
            </View>
          </>
        ) : (
          <>
            {icon && <View style={styles.iconSpacing}>{icon}</View>}
            {loading ? (
              <ActivityIndicator color={getLoaderColor()} size="small" />
            ) : (
              <Text style={[getTextStyle(), textStyle]}>{title}</Text>
            )}
          </>
        )}
      </MotionPressable>
    </View>
  );
};

export default Button;

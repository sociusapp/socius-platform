// src/components/common/Button.js
// Reusable button component matching design image 100%

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
    backgroundColor: '#E85555',
  },
  emergencyButton: {
    backgroundColor: '#D84D42',
  },
  secondaryButton: {
    backgroundColor: '#F5F1ED',
    borderWidth: 2,
    borderColor: '#E85555',
    shadowOpacity: 0.2,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E85555',
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
    color: '#E85555',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  outlineText: {
    color: '#E85555',
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
  },
});

const Button = ({
  title,
  onPress,
  variant = 'primary', // primary, secondary, emergency, outline, gradient, white, link
  size = 'medium', // small, medium, large
  loading = false,
  disabled = false,
  fullWidth = true,
  icon = null,
  style,
  textStyle,
  ...props
}) => {
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
    return variant === 'primary' || variant === 'emergency' || variant === 'gradient' ? '#FFFFFF' : '#E85555';
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
      <TouchableOpacity
        style={[
          styles.buttonBase,
          getButtonVariantStyle(),
          fullWidth && styles.fullWidth,
          getSizeStyle(),
          disabled && { opacity: 0.6 },
          style,
        ]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        {...props}
      >
        {variant === 'gradient' && (
          <LinearGradient
            colors={['#E96A5C', '#D84D42']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientFill}
          />
        )}
        {icon && <View style={styles.iconSpacing}>{icon}</View>}
        {loading ? (
          <ActivityIndicator color={getLoaderColor()} size="small" />
        ) : (
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default Button;

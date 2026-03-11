import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
  TouchableWithoutFeedback
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

const CustomAlert = ({
  visible,
  title,
  message,
  buttons = [],
  icon,
  iconColor,
  onClose,
  animationType = 'scale', // 'scale' | 'fade' | 'slide'
}) => {
  const [showModal, setShowModal] = useState(visible);
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    toggleModal(visible);
  }, [visible]);

  const toggleModal = (visible) => {
    if (visible) {
      setShowModal(true);
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          friction: 7,
          tension: 40
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowModal(false);
        if (onClose) onClose();
      });
    }
  };

  const handleButtonPress = (onPress) => {
    // Auto-close the modal immediately to prevent UI blocking
    toggleModal(false);

    if (onPress) {
      onPress();
    }
  };

  if (!showModal) return null;

  // Default button if none provided
  let actionButtons = buttons.length > 0 ? buttons : [
    { text: 'OK', onPress: () => toggleModal(false), style: 'primary' }
  ];

  // When exactly two buttons are provided, prefer showing the primary on top and cancel below
  // to avoid cramped horizontal layout and ensure consistent tap targets across devices.
  if (actionButtons.length === 2) {
    const primary = actionButtons.find(b => b.style !== 'cancel');
    const cancel = actionButtons.find(b => b.style === 'cancel');
    if (primary && cancel) {
      actionButtons = [primary, cancel];
    }
  }

  return (
    <Modal
      transparent
      visible={showModal}
      onRequestClose={() => toggleModal(false)}
      animationType="none" // We handle animation manually
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: opacityValue }
          ]}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: opacityValue,
              transform: [{ scale: scaleValue }]
            }
          ]}
        >
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: iconColor ? `${iconColor}20` : '#DC5C6920' }]}>
              <Icon
                name={icon}
                size={32}
                color={iconColor || '#DC5C69'}
              />
            </View>
          )}

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={[
            styles.buttonContainer,
            // Use vertical layout for 1-2 buttons for better readability and consistent widths
            actionButtons.length <= 2 ? { flexDirection: 'column' } : { flexDirection: 'column' }
          ]}>
            {actionButtons.map((btn, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                style={[
                  styles.button,
                  btn.style === 'cancel' ? styles.cancelButton : styles.primaryButton,
                  btn.style === 'destructive' ? styles.destructiveButton : {},
                  { width: '100%', marginBottom: 12 }
                ]}
                onPress={() => handleButtonPress(btn.onPress)}
              >
                <Text style={[
                  styles.buttonText,
                  btn.style === 'cancel' ? styles.cancelButtonText : styles.primaryButtonText,
                  btn.style === 'destructive' ? styles.destructiveButtonText : {}
                ]}>
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
    justifyContent: 'center',
  },
  button: {
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: '#DC5C69',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  destructiveButton: {
    backgroundColor: '#EF4444',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '600',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CustomAlert;

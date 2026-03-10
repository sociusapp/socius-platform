// src/components/common/TextInput.js
// Reusable text input field

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

const CustomTextInput = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  error = null,
  icon = null,
  rightIcon = null,
  onRightIconPress,
  editable = true,
  maxLength,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          error && styles.inputWrapperError,
        ]}
      >
        {icon && <View style={styles.leftIcon}>{icon}</View>}

        <TextInput
          style={[styles.input, { paddingLeft: icon ? 8 : 12 }]}
          placeholder={placeholder}
          placeholderTextColor={'#CCCCCC'}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          editable={editable}
          maxLength={maxLength}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    fontFamily: 'System',
    color: '#1A1A1A',
    marginBottom: 8,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48,
  },
  inputWrapperFocused: {
    borderColor: '#A83A30',
    borderWidth: 2,
  },
  inputWrapperError: {
    borderColor: '#D84D42',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    fontFamily: 'System',
    color: '#1A1A1A',
    paddingVertical: 8,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 14,
    fontFamily: 'System',
    color: '#D84D42',
    marginTop: 8,
  },
});

export default CustomTextInput;

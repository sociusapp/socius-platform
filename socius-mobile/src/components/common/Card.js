// src/components/common/Card.js
// Reusable card with shadow effect

import React from 'react';
import { View } from 'react-native';

const Card = ({
  children,
  padding = 16,
  margin = 0,
  shadow = 'medium', // small, medium, large
  borderRadius = 12,
  backgroundColor = '#F5F1ED',
  style,
  onPress,
  ...props
}) => {
  const shadowStyles = {
    small: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    large: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
  };

  const containerStyle = {
    backgroundColor,
    borderRadius,
    padding,
    margin,
    ...shadowStyles[shadow],
  };

  const ViewComponent = onPress ? 'TouchableOpacity' : View;

  return (
    <ViewComponent
      style={[containerStyle, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      {...props}
    >
      {children}
    </ViewComponent>
  );
};

export default Card;

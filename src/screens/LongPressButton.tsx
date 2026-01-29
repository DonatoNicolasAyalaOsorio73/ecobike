// LongPressButton.js

import React, { useState, useRef } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';

const LongPressButton = ({ onLongPress, onPressOut, children, ...props }) => {
  const [isPressed, setIsPressed] = useState(false);
  const pressTimeout = useRef(null);

  const handleLongPress = () => {
    setIsPressed(true);
    onLongPress && onLongPress();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    pressTimeout.current && clearTimeout(pressTimeout.current);
    onPressOut && onPressOut();
  };

  const handlePress = () => {
    pressTimeout.current = setTimeout(() => {
      setIsPressed(false);
      onLongPress && onLongPress();
    }, 500); // Tiempo en milisegundos para considerar como "mantenido"
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressOut={handlePressOut}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
      {...props}
    >
      <View style={{ opacity: isPressed ? 0.5 : 1 }}>
        {children}
      </View>
    </TouchableOpacity>
  );
};

export default LongPressButton;

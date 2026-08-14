// ponytail: plain TextInput shim — react-native-masked-text has no web support
import React from 'react';
import { TextInput } from 'react-native';

export const TextInputMask = ({ onChangeText, value, style, placeholder, placeholderTextColor, autoCorrect, keyboardType }) => (
  <TextInput
    style={style}
    placeholder={placeholder}
    placeholderTextColor={placeholderTextColor}
    autoCorrect={autoCorrect}
    keyboardType={keyboardType}
    onChangeText={onChangeText}
    value={value}
  />
);

export default { TextInputMask };

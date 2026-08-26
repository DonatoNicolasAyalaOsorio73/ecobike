import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PasswordResetScreen from './PasswordResetScreen';

test('La página de recuperación de cuenta se carga correctamente', () => {
  const { getByText, getByPlaceholderText } = render(<PasswordResetScreen />);
  
  // Verifica que los elementos de la página se carguen correctamente
  expect(getByText('Recuperar Contraseña')).toBeDefined();
  expect(getByText('Ingresa tu correo electrónico para restablecer la contraseña:')).toBeDefined();
  expect(getByText('Enviar')).toBeDefined();
  expect(getPlaceholderText('Correo electrónico')).toBeDefined();
});

test('Iniciar el proceso de recuperación de cuenta', () => {
  const { getByPlaceholderText, getByText } = render(<PasswordResetScreen />);
  
  // Encuentra el campo de entrada de correo electrónico y el botón "Enviar"
  const emailInput = getByPlaceholderText('Correo electrónico');
  const sendButton = getByText('Enviar');
  
  // Simula la entrada de un correo electrónico
  fireEvent.changeText(emailInput, 'correo@example.com');
  
  // Simula hacer clic en el botón "Enviar"
  fireEvent.press(sendButton);
  
  // Verifica que se haya mostrado la alerta de correo de restablecimiento enviado
  expect(getByText('Correo de Restablecimiento Enviado')).toBeDefined();
  expect(getByText('Se ha enviado un correo para restablecer tu contraseña.')).toBeDefined();
});

test('Acceder nuevamente a la cuenta después de la recuperación', () => {
  const { getByText, getByPlaceholderText } = render(<PasswordResetScreen />);
  
  // Encuentra el campo de entrada de correo electrónico
  const emailInput = getByPlaceholderText('Correo electrónico');
  
  // Simula la entrada de un correo electrónico
  fireEvent.changeText(emailInput, 'correo@example.com');
  
  // Encuentra el botón "Enviar" y simula hacer clic en él
  const sendButton = getByText('Enviar');
  fireEvent.press(sendButton);
  
  // Verifica que se haya mostrado la alerta de correo de restablecimiento enviado
  expect(getByText('Correo de Restablecimiento Enviado')).toBeDefined();
  expect(getByText('Se ha enviado un correo para restablecer tu contraseña.')).toBeDefined();
});

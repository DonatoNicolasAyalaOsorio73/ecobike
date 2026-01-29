import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SignIn from './SignIn';

test('La página de inicio de sesión se carga correctamente', () => {
  const { getByText } = render(<SignIn />);
  expect(getByText('Hola Biker!')).toBeDefined();
});

test('Manejo de datos de usuario', () => {
  const { getByPlaceholderText } = render(<SignIn />);
  const emailInput = getByPlaceholderText('Correo electrónico');
  const passwordInput = getByPlaceholderText('Contraseña');

  fireEvent.changeText(emailInput, 'test@example.com');
  fireEvent.changeText(passwordInput, 'password123');

  expect(emailInput.props.value).toBe('test@example.com');
  expect(passwordInput.props.value).toBe('password123');
});

test('Iniciar sesión con datos válidos', async () => {
  const { getByPlaceholderText, getByText } = render(<SignIn />);
  const emailInput = getByPlaceholderText('Correo electrónico');
  const passwordInput = getByPlaceholderText('Contraseña');

  fireEvent.changeText(emailInput, 'test@example.com');
  fireEvent.changeText(passwordInput, 'password123');

  const signInButton = getByText('Entrar');
  await fireEvent.press(signInButton);
  // Agregar aserciones para verificar que se haya iniciado sesión correctamente.
});

test('Redirección a la página principal después de iniciar sesión', async () => {
  const { getByPlaceholderText, getByText } = render(<SignIn />);
  const emailInput = getByPlaceholderText('Correo electrónico');
  const passwordInput = getByPlaceholderText('Contraseña');

  fireEvent.changeText(emailInput, 'test@example.com');
  fireEvent.changeText(passwordInput, 'password123');

  const signInButton = getByText('Entrar');
  await fireEvent.press(signInButton);
  // Agregar aserciones para verificar que se haya redirigido a la página principal.
});

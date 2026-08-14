import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Register from './Register';

test('La página de registro se carga correctamente', () => {
  const { getByText } = render(<Register />);
  expect(getByText('Regístrate!')).toBeTruthy();
});

test('Manejo de datos de usuario', () => {
  const { getByPlaceholderText } = render(<Register />);
  const nombreInput = getByPlaceholderText('Nombres');
  const apellidoInput = getByPlaceholderText('Apellidos');

  fireEvent.changeText(nombreInput, 'John');
  fireEvent.changeText(apellidoInput, 'Doe');

  expect(nombreInput.props.value).toBe('John');
  expect(apellidoInput.props.value).toBe('Doe');
});

test('Generación de nombre de usuario', () => {
  const username = Register.prototype.generateUsername('John Doe');
  const regex = /^johndoe#\d{4}$/i;

  expect(username).toMatch(regex);
});

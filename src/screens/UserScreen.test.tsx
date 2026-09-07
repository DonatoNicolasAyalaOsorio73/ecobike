import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import UserScreen from './UserScreen';

test('La página de configuración de perfil se carga correctamente', () => {
  const { getByText } = render(<UserScreen />);
  expect(getByText('Usuario')).toBeDefined();
});

test('Editar perfil y guardar cambios', () => {
  const { getByText, getByPlaceholderText } = render(<UserScreen />);
  
  // Encuentra y toca el botón de edición
  const editButton = getByText('Editar');
  fireEvent.press(editButton);
  
  // Verifica que los campos de entrada estén habilitados para edición
  const nameInput = getByPlaceholderText('Nombre');
  const genderInput = getByText('Seleccionar Género');
  const dateOfBirthInput = getByPlaceholderText('dd/mm/yyyy');
  
  expect(nameInput).toBeDefined();
  expect(genderInput).toBeDefined();
  expect(dateOfBirthInput).toBeDefined();
  
  // Realiza cambios en los campos de entrada
  fireEvent.changeText(nameInput, 'Nuevo Nombre');
  
  // Selecciona un género
  fireEvent.press(genderInput);
  const genderOption = getByText('Masculino'); // Cambia esto a la opción que desees
  fireEvent.press(genderOption);
  
  fireEvent.changeText(dateOfBirthInput, '01/01/1990');
  
  // Encuentra y toca el botón de guardar
  const saveButton = getByText('Guardar');
  fireEvent.press(saveButton);
  
  // Verifica que los cambios se hayan reflejado
  expect(getByText('Nuevo Nombre')).toBeDefined();
  expect(getByText('Masculino')).toBeDefined();
  expect(getByText('01/01/1990')).toBeDefined();
});

import { render, fireEvent } from '@testing-library/react-native';
import ControladorSesion from './ControladorSesion'; // Asegúrate de importar el controlador de sesión desde tu código

describe('Pruebas para Cierre de Sesión Exitoso', () => {
  it('El usuario es desconectado y se le devuelve a la pantalla de inicio de sesión', () => {
    const controladorSesion = new ControladorSesion(); // Crea una instancia del controlador de sesión (ajusta esto a tu implementación)
    
    // Realiza la prueba para el cierre de sesión exitoso
    const resultado = controladorSesion.cierreSesionExitoso();
    
    // Comprueba que el resultado sea verdadero, lo que indica un cierre de sesión exitoso
    expect(resultado).toBe(true);
  });
});

describe('Pruebas para Protección de Datos al Cerrar Sesión', () => {
  it('La seguridad de los datos del usuario se mantiene protegida en caso de compartir el dispositivo', () => {
    const controladorSesion = new ControladorSesion(); // Crea una instancia del controlador de sesión (ajusta esto a tu implementación)
    
    // Realiza la prueba para la protección de datos al cerrar sesión
    const resultado = controladorSesion.proteccionDatosAlCerrarSesion();
    
    // Comprueba que el resultado sea verdadero, lo que indica que los datos del usuario están protegidos
    expect(resultado).toBe(true);
  });
});


import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import UserScreen from './UserScreen'; // Asegúrate de importar el componente desde la ubicación correcta

describe('UserScreen Component', () => {
  test('debería renderizar correctamente con datos de usuario', () => {
    const userData = {
      // Simula datos de usuario
      username: 'UsuarioPrueba',
      sexo: 'Masculino',
      fechaNacimiento: '01/01/2000',
      email: 'usuario@example.com',
    };

    const { getByText } = render(<UserScreen userData={userData} />);
    
    // Verifica que los elementos de usuario estén en la pantalla
    expect(getByText('UsuarioPrueba')).toBeTruthy();
    expect(getByText('Masculino')).toBeTruthy();
    expect(getByText('01/01/2000')).toBeTruthy();
    expect(getByText('usuario@example.com')).toBeTruthy();
  });

  test('debería mostrar el botón de edición cuando se puede editar', () => {
    const userData = {
      username: 'UsuarioPrueba',
      sexo: 'Masculino',
      fechaNacimiento: '01/01/2000',
      email: 'usuario@example.com',
    };

    const { getByText, queryByText } = render(<UserScreen userData={userData} isEditing={true} />);
    
    // Verifica que el botón de edición esté presente y el texto sea 'Guardar'
    expect(getByText('Guardar')).toBeTruthy();
    
    // El botón de edición no debería estar presente
    expect(queryByText('Editar')).toBeNull();
  });

  test('debería mostrar el botón de edición cuando no se puede editar', () => {
    const userData = {
      username: 'UsuarioPrueba',
      sexo: 'Masculino',
      fechaNacimiento: '01/01/2000',
      email: 'usuario@example.com',
    };

    const { getByText, queryByText } = render(<UserScreen userData={userData} isEditing={false} />);
    
    // Verifica que el botón de edición esté presente y el texto sea 'Editar'
    expect(getByText('Editar')).toBeTruthy();
    
    // El botón de guardar no debería estar presente
    expect(queryByText('Guardar')).toBeNull();
  });

  test('debería permitir la edición de datos de usuario', () => {
    const userData = {
      username: 'UsuarioPrueba',
      sexo: 'Masculino',
      fechaNacimiento: '01/01/2000',
      email: 'usuario@example.com',
    };
    
    const { getByText, getByTestId } = render(<UserScreen userData={userData} isEditing={true} />);

    // Busca el botón para cambiar el nombre de usuario
    const usernameInput = getByTestId('username-input');

    // Realiza una edición en el nombre de usuario
    fireEvent.changeText(usernameInput, 'NuevoUsuario');
    
    // Verifica que el nuevo nombre de usuario esté presente
    expect(getByText('NuevoUsuario')).toBeTruthy();
  });
});

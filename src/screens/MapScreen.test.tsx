import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import App from './App';

describe('App', () => {
  it('should start recording and change the button text when clicked', () => {
    const { getByText, getByTestId } = render(<App />);
    const startButton = getByTestId('startButton');

    fireEvent.press(startButton);

    expect(startButton).toHaveTextContent('Finalizar recorrido');
  });

  it('should stop recording and show the modal when clicked', () => {
    const { getByText, getByTestId } = render(<App />);
    const startButton = getByTestId('startButton');
    const stopButton = getByTestId('stopButton');
    const modalText = getByText('Recorrido finalizado');

    fireEvent.press(startButton); // Start recording
    fireEvent.press(stopButton);

    expect(modalText).toBeTruthy();
  });
});

import { render, fireEvent } from '@testing-library/react-native';
import ControladorMapa from './ControladorMapa'; // Asegúrate de importar el controlador de mapa desde tu código

describe('Pruebas para Acceder al Mapa con GPS', () => {
  it('El usuario puede acceder al mapa con GPS en la aplicación', () => {
    const controlador = new ControladorMapa(); // Crea una instancia del controlador de mapa (ajusta esto a tu implementación)
    const apiKey = 'tu_clave_de_API_de_Google_Maps'; // Sustituye 'tu_clave_de_API_de_Google_Maps' por tu clave de API real
    
    // Realiza la prueba para acceder al mapa con GPS
    const resultado = controlador.accederMapaGPS(apiKey);
    
    // Comprueba que el resultado sea verdadero, lo que indica que el acceso fue exitoso
    expect(resultado).toBe(true);
  });
});

describe('Pruebas para Visualizar el Recorrido en Tiempo Real', () => {
  it('El mapa muestra el recorrido acumulado en tiempo real a medida que el usuario realiza actividades', () => {
    const controlador = new ControladorMapa(); // Crea una instancia del controlador de mapa (ajusta esto a tu implementación)
    
    // Simula la distancia recorrida y la ubicación en tiempo real
    const distanciaRecorrida = 10; // Supongamos que el usuario ha recorrido 10 km
    const ubicacionActual = { latitud: 40.7128, longitud: -74.0060 }; // Supongamos una ubicación en Nueva York
    
    // Realiza la prueba para visualizar el recorrido acumulado en tiempo real
    const resultado = controlador.visualizarRecorridoTiempoReal(distanciaRecorrida, ubicacionActual);
    
    // Comprueba que el resultado sea verdadero, lo que indica que el recorrido se muestra correctamente
    expect(resultado).toBe(true);
  });
});

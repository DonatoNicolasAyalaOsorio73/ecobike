import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function HomeScreen({ navigation }) {
  const handleMapNavigation = () => {
    navigation.navigate('Map');
  };

  const handlePointsNavigation = () => {
    navigation.navigate('Points');
  };

  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.text}>Nombre: Juan Pérez</Text>
        <Text style={styles.text}>Edad: 30 años</Text>
        <Text style={styles.text}>Email: juan@example.com</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.customButton, styles.ganarButton]}
          onPress={handleMapNavigation}>
          <Text style={styles.buttonText}>Ganar Puntos</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.customButton, styles.verButton]}
          onPress={handlePointsNavigation}>
          <Text style={styles.buttonText}>Ver Puntos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  infoContainer: {
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  text: {
    fontSize: 18,
    marginBottom: 10,
    color: '#353147',
  },
  customButton: {
    borderRadius: 20,
    paddingVertical: 20, // Aumenta este valor para aumentar la altura del botón
    paddingHorizontal: 25, // Aumenta este valor para aumentar el ancho del botón
    alignItems: 'center',
  },
  ganarButton: {
    backgroundColor: '#54CD64',
  },
  verButton: {
    backgroundColor: '#54CD64',
  },
  buttonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
});

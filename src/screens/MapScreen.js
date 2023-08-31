import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, TouchableHighlight, Modal } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance * 1000; // Convert to meters
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

export default function App() {
  const [location, setLocation] = useState(null);
  const [watching, setWatching] = useState(false);
  const [path, setPath] = useState([]);
  const prevLocationRef = useRef();
  const [points, setPoints] = useState(0);
  const [recording, setRecording] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);

  useEffect(() => {
    async function startWatching() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        return;
      }

      setWatching(true);
      const locationListener = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 1, // meters
          timeInterval: 1000, // milliseconds
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          const newPoint = { latitude, longitude };
          setPath((prevPath) => [...prevPath, newPoint]);
          setLocation(newLocation);

          if (prevLocationRef.current) {
            const prevPoint = prevLocationRef.current.coords;
            const distance = calculateDistance(
              prevPoint.latitude,
              prevPoint.longitude,
              newLocation.coords.latitude,
              newLocation.coords.longitude
            );
            const timeDiff = newLocation.timestamp - prevLocationRef.current.timestamp;
            const speed = distance / timeDiff; // meters per millisecond

            console.log('Distance:', distance, 'meters');
            console.log('Speed:', speed, 'm/s');

            if (recording && speed < 5 && distance >= 10) {
              const pointsToAdd = Math.floor(distance / 10);
              setPoints((prevPoints) => prevPoints + pointsToAdd);
            }
          }

          prevLocationRef.current = newLocation;
        }
      );

      return () => {
        if (locationListener) {
          locationListener.remove();
        }
        setWatching(false);
      };
    }

    startWatching();
  }, [recording]);

  const startRecording = () => {
    setRecording(true);
    setShowStartModal(false);
  };

  const stopRecording = () => {
    setRecording(false);
    setShowStopModal(true);
  };

  if (!location) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.09,
          longitudeDelta: 0.04,
        }}
        showsUserLocation={true}
        followsUserLocation={true}
      >
        <Polyline coordinates={path} strokeWidth={4} strokeColor="blue" />
      </MapView>
      
      <View style={styles.pointsInfo}>
        <Text style={styles.pointsText}>Puntos acumulados: {points}</Text>
      </View>
      
      <Modal visible={showStartModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>¿Iniciar recorrido en bicicleta?</Text>
            <TouchableHighlight style={styles.modalButton} onPress={startRecording}>
              <Text style={styles.buttonText}>Sí</Text>
            </TouchableHighlight>
            <TouchableHighlight style={styles.modalButton} onPress={() => setShowStartModal(false)}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableHighlight>
          </View>
        </View>
      </Modal>

      <Modal visible={showStopModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Recorrido finalizado</Text>
            <Text>Puntos obtenidos: {points}</Text>
            <TouchableHighlight style={styles.modalButton} onPress={() => setShowStopModal(false)}>
              <Text style={styles.buttonText}>Aceptar</Text>
            </TouchableHighlight>
          </View>
        </View>
      </Modal>

      {recording ? (
        <TouchableHighlight style={styles.button} onPress={stopRecording}>
          <Text style={styles.buttonText}>Finalizar recorrido</Text>
        </TouchableHighlight>
      ) : (
        <TouchableHighlight style={styles.button} onPress={() => setShowStartModal(true)}>
          <Text style={styles.buttonText}>Iniciar recorrido</Text>
        </TouchableHighlight>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
    height: 200,
  },
  pointsInfo: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'blue',
    borderRadius: 5,
    marginTop: 10,
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'blue',
    borderRadius: 5,
    marginVertical: 5,
  },
});
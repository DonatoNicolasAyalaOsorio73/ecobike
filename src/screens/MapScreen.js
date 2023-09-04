import React, { useState, useEffect, useRef } from 'react';
import { Text, View, TouchableHighlight, Modal, ActivityIndicator } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet } from 'react-native';

const calculateAndUpdatePoints = (newLocation, prevLocationRef, setLocalPoints, recording) => {
  if (newLocation && prevLocationRef.current && newLocation.coords) {
    const { latitude, longitude } = newLocation.coords;
    const distance = calculateDistance(
      prevLocationRef.current.coords.latitude,
      prevLocationRef.current.coords.longitude,
      latitude,
      longitude
    );
    const timeDiff = newLocation.timestamp - prevLocationRef.current.timestamp;

    if (timeDiff > 0) {
      const speed = distance / timeDiff;

      console.log('Distance:', distance, 'meters');
      console.log('Speed:', speed, 'm/s');

      if (recording && speed < 3 && distance >= 10) {
        const pointsToAdd = Math.floor(distance / 10);
        setLocalPoints(prevPoints => prevPoints + pointsToAdd);
      }
    }
  }
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance * 1000;
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

export default function App() {
  const [location, setLocation] = useState(null);
  const [watching, setWatching] = useState(false);
  const [path, setPath] = useState([]);
  const [points, setPoints] = useState(0);
  const [recording, setRecording] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [localPoints, setLocalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  const prevLocationRef = useRef(null);

  const authInstance = getAuth();
  const userUid = authInstance.currentUser?.uid;

  const db = getFirestore();

  const updatePointsInAsyncStorage = async (newPoints) => {
    try {
      await AsyncStorage.setItem('puntosAcumulados', newPoints.toString());
      console.log('Puntos actualizados en AsyncStorage');
    } catch (error) {
      console.error('Error al actualizar puntos en AsyncStorage:', error);
    }
  };

  const updatePointsInDatabase = async (userId, newPoints) => {
    const userDocRef = doc(db, 'usuarios', userId);

    try {
      await updateDoc(userDocRef, {
        puntosAcumulados: newPoints,
      });
      console.log('Puntos actualizados en la base de datos');
    } catch (error) {
      console.error('Error al actualizar puntos en la base de datos:', error);
    }
  };

  const retrievePointsFromAsyncStorage = async () => {
    try {
      const storedPoints = await AsyncStorage.getItem('puntosAcumulados');
      if (storedPoints !== null) {
        const parsedPoints = parseInt(storedPoints, 10);
        setPoints(parsedPoints);
      }
    } catch (error) {
      console.error('Error al recuperar puntos desde AsyncStorage:', error);
    } finally {
      setLoading(false); // Actualizar el estado de carga
    }
  };

  useEffect(() => {
    retrievePointsFromAsyncStorage();
  }, []);

  const startRecording = () => {
    setRecording(true);
    setLocalPoints(0);
    setShowStartModal(false);
    retrievePointsFromAsyncStorage();
    // Cambio: Limpiar el trazado anterior
    setPath([]);
  };

  const stopRecording = () => {
    const newPoints = points + localPoints;
    setRecording(false);
    setPoints(newPoints);
    setShowStopModal(true);
    // Cambio: Limpiar el trazado al detener el recorrido
    setPath([]);

    const updateUserPoints = async () => {
      try {
        await updatePointsInDatabase(userUid, newPoints);
        await updatePointsInAsyncStorage(newPoints);
        console.log('Puntos actualizados en la base de datos y AsyncStorage');
      } catch (error) {
        console.error('Error al actualizar puntos:', error);
      }
    };

    updateUserPoints();
  };

  useEffect(() => {
    const startWatching = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permiso para acceder a la ubicación fue denegado');
        setLoading(false); // Actualizar el estado de carga en caso de permiso denegado
        return;
      }

      setWatching(true);

      const locationListener = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 10,
          timeInterval: 500,
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          const newPoint = { latitude, longitude };
          setPath((prevPath) => [...prevPath, newPoint]);
          setLocation(newLocation);

          if (recording) {
            calculateAndUpdatePoints(newLocation, prevLocationRef, setLocalPoints, recording);
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
    };

    if (recording) {
      startWatching();
    }
  }, [recording]);

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <View style={styles.container}>
      {recording && (
        <Text style={styles.localPointsText}>Puntos obtenidos: {localPoints}</Text>
      )}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location?.coords?.latitude || 0,
          longitude: location?.coords?.longitude || 0,
          latitudeDelta: 0.09,
          longitudeDelta: 0.04,
        }}
        showsUserLocation={true}
        followsUserLocation={true}
      >
        <Polyline coordinates={path} strokeWidth={4} strokeColor="blue" />
      </MapView>

      <Modal visible={showStartModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>¿Iniciar recorrido en bicicleta?</Text>
            <TouchableHighlight style={styles.modalButton} onPress={startRecording}>
              <Text style={styles.buttonText}>Sí</Text>
            </TouchableHighlight>
            <TouchableHighlight
              style={styles.modalButton}
              onPress={() => setShowStartModal(false)}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableHighlight>
          </View>
        </View>
      </Modal>

      <Modal visible={showStopModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Recorrido finalizado</Text>
            <Text>Puntos obtenidos en este recorrido: {localPoints}</Text>
            <TouchableHighlight
              style={styles.modalButton}
              onPress={() => setShowStopModal(false)}
            >
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
        <TouchableHighlight
          style={styles.button}
          onPress={() => setShowStartModal(true)}
        >
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
    height: 0,
  },
  pointsInfo: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    position: 'absolute',
    top: 50,
    left: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    padding: 10,
    backgroundColor: 'blue',
    position: 'absolute',
    top: 650,
    left: 110,
    borderRadius: 5,
    

    paddingVertical: 20,
    paddingHorizontal: 20,
    
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
    padding: 10,
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
import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  TouchableHighlight,
  Modal,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet } from 'react-native';

const API_KEY = 'REMOVED_GOOGLE_API_KEY'; 

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
  const [shouldDrawPath, setShouldDrawPath] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [selectedRouteCoordinates, setSelectedRouteCoordinates] = useState([]);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isRouteSelected, setIsRouteSelected] = useState(false);
  const [selectedEcologicalRoute, setSelectedEcologicalRoute] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showLossText, setShowLossText] = useState(false);

  
  

  const [showSearchModal, setShowSearchModal] = useState(false);

  const prevLocationRef = useRef(null);
  const mapRef = useRef(null);

  const authInstance = getAuth();
  const userUid = authInstance.currentUser?.uid;

  const db = getFirestore();

  const decodePolyline = (encoded) => {
    const poly = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      const latitude = lat / 1e5;
      const longitude = lng / 1e5;

      poly.push({ latitude, longitude });
    }

    return poly;
  };

  useEffect(() => {
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
        setLoading(false); // Update the loading state
      }
    };

    retrievePointsFromAsyncStorage();
  }, []);

  const startRecording = () => {
    setRecording(true);
    setLocalPoints(0);
    setShowStartModal(false);
    setRouteCoordinates([]); // Reset the current route coordinates
    setShouldDrawPath(true);
    setShowLossText(false);

    if (mapRef.current && location?.coords) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.00009,
        longitudeDelta: 0.00009,
      });
    }

    if (isRouteSelected) {
      // Start point accumulation automatically
      const initialPoints = Math.floor(localPoints / 10);
      setLocalPoints(initialPoints);
    }
  };

  const stopRecording = () => {
    
    const newPoints = points + localPoints;
    
    setRecording(false);
    setPoints(newPoints);
    setShowStopModal(true);
    setShouldDrawPath(false);
    setRouteCoordinates([...routeCoordinates, ...path]);
    setShowLossText(true);
    

    setPath([]);
    setShouldDrawPath(false);
    setSelectedRouteCoordinates([]);
    setRouteCoordinates([]);
    setIsRouteSelected(false);
    setSelectedEcologicalRoute(null);
    setCurrentLocation(null);
    
    

    const updateUserPoints = async () => {
      try {
        await updatePointsInDatabase(userUid, newPoints);
        await updatePointsInAsyncStorage(newPoints);
        console.log('Points updated in the database and AsyncStorage');
      } catch (error) {
        console.error('Error updating points:', error);
      }
    };

    updateUserPoints();
  };

  useEffect(() => {
    const calculateAndUpdatePoints = (newLocation, prevLocationRef, setLocalPoints, recording, isRecordingFinished) => {
      if (newLocation && prevLocationRef.current && newLocation.coords && recording && !isRecordingFinished) {
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
    
          if (speed < 3 && distance >= 10) {
            const pointsToAdd = Math.floor(distance / 10);
            setLocalPoints((prevPoints) => prevPoints + pointsToAdd);
          }
        }
      }
    };
    
    
    

    const startWatching = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        setLoading(false); // Update the loading state in case of denied permission
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
          if (recording) {
            // Check if recording before adding points to the route
            const { latitude, longitude } = newLocation.coords;
            const newPoint = { latitude, longitude };
            setPath((prevPath) => [...prevPath, newPoint]);
            setLocation(newLocation);
            calculateAndUpdatePoints(newLocation, prevLocationRef, setLocalPoints, recording);
            prevLocationRef.current = newLocation;

            // Update the map region to follow the user
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude,
                longitude,
                latitudeDelta: 0.0009, // Adjust the zoom level as desired
                longitudeDelta: 0.0009,
              });
            }
          }
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

  useEffect(() => {
    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission to access location was denied');
        setLoading(false); // Update the loading state in case of denied permission
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      centerMapOnLocation(); // Center the map on the current location when initializing
    };

    getLocation();
  }, []);

  const centerMapOnLocation = () => {
    if (mapRef.current && location?.coords) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0009, // Adjust the zoom level as desired
        longitudeDelta: 0.0009,
      });
    }
  };

  const updatePointsInAsyncStorage = async (newPoints) => {
    try {
      await AsyncStorage.setItem('puntosAcumulados', newPoints.toString());
      console.log('Points updated in AsyncStorage');
    } catch (error) {
      console.error('Error updating points in AsyncStorage:', error);
    }
  };

  const updatePointsInDatabase = async (userId, newPoints) => {
    const userDocRef = doc(db, 'usuarios', userId);

    try {
      await updateDoc(userDocRef, {
        puntosAcumulados: newPoints,
      });
      console.log('Points updated in the database');
    } catch (error) {
      console.error('Error updating points in the database:', error);
    }
  };

  const searchLocation = async () => {
    try {
      const apiKey = API_KEY; // Use your API key here
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchText}&key=${apiKey}`
      );
      const data = await response.json();
      setSearchResults(data.results);
    } catch (error) {
      console.error('Error searching location:', error);
    }
  };

  const selectLocation = async (selectedLocation) => {
    try {
      const apiKey = API_KEY; // Use your API key here
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${location.coords.latitude},${location.coords.longitude}&destination=${selectedLocation.geometry.location.lat},${selectedLocation.geometry.location.lng}&key=${apiKey}`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        // Find the desired route, e.g., the first available route
        const selectedRoute = data.routes[0];

        const coordinates = selectedRoute.overview_polyline.points;
        const decodedCoordinates = decodePolyline(coordinates);
        setSelectedRouteCoordinates(decodedCoordinates);
        // Mark the route as selected
        setSelectedEcologicalRoute(selectedRoute);

        // Close the modal automatically after the route has loaded
        setShowSearchModal(false);
        setIsRouteSelected(true);

        // Start recording automatically
        startRecording();
      } else {
        console.error('No valid routes found.');
      }
    } catch (error) {
      console.error('Error getting directions:', error);
    }
  };
  return (
    <View style={styles.container}>
      {showLossText && (
      <View style={styles.redContainer}>
     
        
          <Text style={styles.localPointsText2}>Podrías estar acumulando</Text>
        
      
    </View>
    )}
      <View style={styles.rectangle}>
        <Text style={styles.localPointsText}>Puntos obtenidos: {localPoints}</Text>
      </View>
      <View style={styles.rectangle2}>
        <TouchableHighlight
          style={styles.button}
          onPress={() => setShowSearchModal(true)} // Esto abrirá el modal de búsqueda
        >
          <Text style={styles.buttonText2}>Planear EcoRuta</Text>
        </TouchableHighlight>
      </View>
  
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location?.coords?.latitude || 0,
          longitude: location?.coords?.longitude || 0,
          latitudeDelta: 0.009,
          longitudeDelta: 0.009,
        }}
        showsUserLocation={true}
        followsUserLocation={true}
        onMapReady={() => centerMapOnLocation()}
      >
        {shouldDrawPath && (
          <Polyline
            coordinates={path}
            strokeWidth={4}
            strokeColor="green"
          />
        )}
  
        {selectedRouteCoordinates.length > 0 && (
          <Polyline
            coordinates={selectedRouteCoordinates}
            strokeWidth={4}
            strokeColor="#ADF14B" // Color de la ruta seleccionada
          />
        )}
      </MapView>
  
      <Modal visible={showStartModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>¿Iniciar recorrido en bicicleta?</Text>
            <TouchableHighlight style={styles.modalButton2} onPress={startRecording}>
              <Text style={styles.buttonText2}>Sí</Text>
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
              style={styles.modalButton2}
              onPress={() => setShowStopModal(false)}
            >
              <Text style={styles.buttonText2}>Aceptar</Text>
            </TouchableHighlight>
          </View>
        </View>
      </Modal>
  
      <Modal visible={showSearchModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.searchInput}
              placeholder="¿Dónde quieres ir?"
              placeholderTextColor="gray"
              onChangeText={(text) => setSearchText(text)}
              value={searchText}
            />
  
            <ScrollView style={styles.resultsContainer}>
              {searchResults.map((result, index) => (
                <TouchableHighlight
                  key={result.place_id}
                  style={[
                    styles.searchResult,
                    index !== searchResults.length - 1 && styles.divider, // Agregar borde inferior excepto al último elemento
                  ]}
                  onPress={() => selectLocation(result)}
                >
                  <Text style={styles.resultText}>{result.name}</Text>
                </TouchableHighlight>
              ))}
            </ScrollView>
  
            <TouchableHighlight style={styles.modalButton2} onPress={searchLocation}>
              <Text style={styles.buttonText2}>Buscar</Text>
            </TouchableHighlight>
  
            <TouchableHighlight
              style={styles.modalButton}
              onPress={() => setShowSearchModal(false)}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableHighlight>
          </View>
        </View>
      </Modal>
  
      {recording ? (
        <TouchableHighlight style={styles.button} onPress={stopRecording}>
          <Text style={styles.buttonText2}>Finalizar recorrido</Text>
        </TouchableHighlight>
      ) : (
        <TouchableHighlight
          style={styles.button}
          onPress={() => {
            if (isRouteSelected) {
              // Iniciar la suma de puntos automáticamente
              const initialPoints = Math.floor(localPoints / 10);
              setLocalPoints(initialPoints);
            }
  
            if (selectedEcologicalRoute) {
              // Si hay una ruta ecológica seleccionada, inicia el recorrido automáticamente
              startRecording();
            } else {
              // Si no, muestra el modal de inicio de recorrido
              setShowStartModal(true);
            }
          }}
        >
          <Text style={styles.buttonText2}>Iniciar recorrido</Text>
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
  localPointsText: {
    fontSize: 18,
    fontWeight: 'bold',
    position: 'absolute',
    zIndex: 2, 
    color: 'black', 
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },
  localPointsText2: {
    fontSize: 18,
    
    position: 'absolute',
    zIndex: 2, 
    color: 'red', 
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    color: '#000', 
  },
  button: {
    position: 'absolute',
    bottom: 120,
    marginHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#ADF14B',
    paddingVertical: 20,
    paddingHorizontal: 20, 
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.44,
    shadowRadius: 2.32,
  },
  buttonText2: {
    color: '#3e3742',
    fontSize: 16,
    fontWeight: 'bold',
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
  rectangle: {
    width: 250,
    height: 60,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 60,
    left: '50%', // Centra horizontalmente usando porcentaje
    transform: [{ translateX: -125 }], // Ajusta la posición según el ancho del contenedor
    zIndex: 2,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: 'lightgray', 
    marginBottom: 10,
  },
  
  searchInput: {
    marginBottom: 30,
    width: 300,
    height: 50,
    backgroundColor: 'white', 
    borderRadius: 10,
    shadowColor: '#000',
    
    shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.2,
  shadowRadius: 10,
  textAlign: 'center', // Centra el texto horizontalmente
  alignSelf: 'center', // Centra el TextInput horizontalmente en su contenedor
},

  rectangle2: {
    bottom: -0,
     
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute', 
    right: 95, 
    zIndex: 2, 
    borderRadius: 10, 
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  redContainer: {
    width: 264,
    height: 15,  
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    padding: 20,
    borderRadius: 8,
    top: 120,
    left: '17%',
    zIndex: 2, // Ajusta el valor de zIndex según sea necesario
  },
  
  
  resultsContainer: {
    maxHeight: 200, 
  },
  resultText: {
    fontSize: 18,
  },
  modalText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#000000', 
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10.32,
    
  },
  modalButton2: {
    backgroundColor: '#ADF14B', 
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16.32,
    
  },
});

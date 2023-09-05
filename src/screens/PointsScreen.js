import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  Dimensions,
  SafeAreaView,
  Animated,
  TouchableOpacity,
  Modal,
  Button,
  TouchableHighlight,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getFirestore,
  doc,
  getDoc,
  runTransaction,
} from "@firebase/firestore";
import { getAuth } from "@firebase/auth";
import { useIsFocused } from "@react-navigation/native";

const storesData = [
  { id: 1, name: "La Merced", logo: require("./assets/merced.png"), pointsRequired: 1 },
  { id: 2, name: "Red en linea", logo: require("./assets/red.png"), pointsRequired: 150 },
  { id: 3, name: "Centro Andino", logo: require("./assets/andino.png"), pointsRequired: 250 },
];

const width = Dimensions.get("window").width;
const height = Dimensions.get("window").height;

const ANCHO_CONTENEDOR = width * 0.7;
const ESPACIO_CONTENEDOR = (width - ANCHO_CONTENEDOR) / 2;
const ESPACIO = 10;
const ALTURA_BACKDROP = height * 0.5;

function Backdrop({ scrollX }) {
  return (
    <View
      style={[
        {
          position: "absolute",
          height: ALTURA_BACKDROP,
          top: 0,
          width: width,
        },
        StyleSheet.absoluteFillObject,
      ]}
    >
      {storesData.map((store, index) => {
        const inputRange = [
          (index - 1) * ANCHO_CONTENEDOR,
          index * ANCHO_CONTENEDOR,
          (index + 1) * ANCHO_CONTENEDOR,
        ];

        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0, 1, 0],
        });
        return (
          <Animated.Image
            key={store.id}
            source={store.logo}
            style={[
              { width: width, height: ALTURA_BACKDROP, opacity },
              StyleSheet.absoluteFillObject,
            ]}
          />
        );
      })}
      <LinearGradient
        colors={["transparent", "white"]}
        style={{
          width,
          height: ALTURA_BACKDROP,
          position: "absolute",
          bottom: 0,
        }}
      />
    </View>
  );
}

export default function App() {
  const authInstance = getAuth();
  const userUid = authInstance.currentUser?.uid; // Corregido: Acceder a currentUser de forma segura
  const [accumulatedPoints, setAccumulatedPoints] = useState(null);
  const isFocused = useIsFocused();
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showInsufficientPointsModal, setShowInsufficientPointsModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null); // Nuevo estado para almacenar la tienda seleccionada

  const scrollX = React.useRef(new Animated.Value(0)).current;

  const handleConfirmRedeem = () => {
    setShowConfirmationModal(false); // Cierra el modal de confirmación

    if (accumulatedPoints >= selectedStore.pointsRequired) {
      const db = getFirestore();
      const userDocRef = doc(db, "usuarios", userUid);

      try {
        runTransaction(db, async (transaction) => {
          const userDocSnapshot = await transaction.get(userDocRef);
          if (userDocSnapshot.exists()) {
            const userData = userDocSnapshot.data();
            const newPoints = userData.puntosAcumulados - selectedStore.pointsRequired;

            if (newPoints >= 0) {
              transaction.update(userDocRef, { puntosAcumulados: newPoints });
              setAccumulatedPoints(newPoints);
              await AsyncStorage.setItem("puntosAcumulados", newPoints.toString());
            } else {
              setShowInsufficientPointsModal(true);
              console.log("No tienes suficientes puntos para realizar este descuento.");
            }
          }
        });
      } catch (error) {
        console.log("Error al realizar el descuento:", error);
      }
    } else {
      setShowInsufficientPointsModal(true);
      console.log("No tienes suficientes puntos para realizar este descuento.");
    }
  };

  const handleStoreInteraction = (store) => {
    setSelectedStore(store); // Almacena la tienda seleccionada
    setShowConfirmationModal(true); // Muestra el modal de confirmación
  };

  useEffect(() => {
    if (isFocused) {
      const fetchAccumulatedPoints = async () => {
        const db = getFirestore();
        const userDocRef = doc(db, "usuarios", userUid);
        try {
          const userDocSnapshot = await getDoc(userDocRef);
          if (userDocSnapshot.exists()) {
            const userData = userDocSnapshot.data();
            setAccumulatedPoints(userData.puntosAcumulados);
            const storedPoints = await AsyncStorage.getItem("puntosAcumulados");
            if (storedPoints !== null) {
              setAccumulatedPoints(parseInt(storedPoints, 10));
            }
          } else {
            console.log("User document not found");
          }
        } catch (error) {
          console.log("Error fetching user data:", error);
        }
      };

      fetchAccumulatedPoints();
    }
  }, [isFocused]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar hidden />
      <Backdrop scrollX={scrollX} />
      <View style={styles.pointsContainer}>
        <Text style={styles.pointsText}>Puntos acumulados: {accumulatedPoints}</Text>
      </View>
      <Animated.FlatList
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        showsHorizontalScrollIndicator={false}
        horizontal={true}
        snapToAlignment="start"
        contentContainerStyle={{
          paddingTop: 200,
          paddingHorizontal: ESPACIO_CONTENEDOR,
        }}
        snapToInterval={ANCHO_CONTENEDOR}
        decelerationRate={0}
        scrollEventThrottle={16}
        data={storesData}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * ANCHO_CONTENEDOR,
            index * ANCHO_CONTENEDOR,
            (index + 1) * ANCHO_CONTENEDOR,
          ];

          const scrollY = scrollX.interpolate({
            inputRange,
            outputRange: [0, -50, 0],
          });
          return (
            <View style={{ width: ANCHO_CONTENEDOR }}>
              <Animated.View
                style={{
                  marginHorizontal: ESPACIO,
                  padding: ESPACIO,
                  borderRadius: 34,
                  backgroundColor: "#fff",
                  alignItems: "center",
                  transform: [{ translateY: scrollY }],
                }}
              >
                <Image source={item.logo} style={styles.posterImage} />
                <Text style={{ fontWeight: "bold", fontSize: 26 }}>
                  {item.name}
                </Text>
                <TouchableOpacity
                  onPress={() => handleStoreInteraction(item)}
                  style={styles.storeButton}
                >
                  <Text style={{ color: "white" }}>
                    Descuento: {item.pointsRequired} puntos
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          );
        }}
      />

       {/* Modal de confirmación */}
       <Modal visible={showConfirmationModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>
              ¿Estás seguro de canjear el descuento en el restaurante?
            </Text>
            <TouchableHighlight
              style={styles.modalButton}
              onPress={handleConfirmRedeem}
            >
              <Text style={styles.buttonText}>Confirmar</Text>
            </TouchableHighlight>
            <TouchableHighlight
              style={styles.modalButton}
              onPress={() => setShowConfirmationModal(false)}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableHighlight>
          </View>
        </View>
      </Modal>

      {/* Modal de puntos insuficientes */}
      <Modal visible={showInsufficientPointsModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>
              No tienes suficientes puntos para realizar este descuento.
            </Text>
            <TouchableHighlight
              style={styles.modalButton}
              onPress={() => setShowInsufficientPointsModal(false)}
            >
              <Text style={styles.buttonText}>Aceptar</Text>
            </TouchableHighlight>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  posterImage: {
    width: "100%",
    height: ANCHO_CONTENEDOR * 1.2,
    resizeMode: "cover",
    borderRadius: 24,
    margin: 0,
    marginBottom: 10,
  },
  storeButton: {
    backgroundColor: "#000000",
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  pointsContainer: {
    alignItems: "center",
    top: 80,
    backgroundColor: "#fff", // Color blanco de fondo
    width: 300, // Ancho igual a 300 unidades
    height: 50, // Altura de 50 unidades (ajústala según sea necesario)
    justifyContent: "center", // Centrar contenido verticalmente
    position: "absolute", // Posición absoluta para superponerlo
    borderRadius: 20, // Radio de borde para redondear los bordes
    left: (width - 300) / 2, // Centrar horizontalmente restando la mitad del ancho al margen izquierdo
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  pointsText: {
    fontSize: 18,
    fontWeight: "bold",
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
    padding: 20, // Aumentado el padding para dar más espacio al contenido
    borderRadius: 10,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#000000', // Cambiado el color de fondo a azul
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 20.32,
    
  },
});

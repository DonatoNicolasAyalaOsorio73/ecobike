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
  TouchableHighlight,
  ScrollView,
} from "react-native";

import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDocs } from "@firebase/firestore";

import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
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
  const userUid = authInstance.currentUser?.uid;
  const [accumulatedPoints, setAccumulatedPoints] = useState(null);
  const isFocused = useIsFocused();
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showInsufficientPointsModal, setShowInsufficientPointsModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [generatedCodes, setGeneratedCodes] = useState([]);
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [showGeneratedCodesModal, setShowGeneratedCodesModal] = useState(false);
  const [showAllCodesModal, setShowAllCodesModal] = useState(false); // Definición del estado
  const [allCodes, setAllCodes] = useState([]); // Estado para almacenar los códigos canjeados

  const scrollX = React.useRef(new Animated.Value(0)).current;

  const handleConfirmRedeem = async () => {
  setShowConfirmationModal(false);

  if (accumulatedPoints >= selectedStore.pointsRequired) {
    const db = getFirestore();
    const userDocRef = doc(db, "usuarios", userUid);

    try {
      const userDocSnapshot = await getDoc(userDocRef);
      if (userDocSnapshot.exists()) {
        const userData = userDocSnapshot.data();
        const newPoints = userData.puntosAcumulados - selectedStore.pointsRequired;

        if (newPoints >= 0) {
          await updateDoc(userDocRef, { puntosAcumulados: newPoints });
          setAccumulatedPoints(newPoints);
          await AsyncStorage.setItem("puntosAcumulados", newPoints.toString());

          // Genera códigos después de que se haya confirmado el canje
          generateCodes();

          // Muestra el modal de códigos generados
          setShowGeneratedCodesModal(true);

          // Envía los códigos a la colección en la base de datos
          const userCodesCollection = collection(userDocRef, "codigos_canjeados");
          generatedCodes.forEach(async (code) => {
            const codeData = {
              code: code,
              store: selectedStore.name,
              userId: userUid,
            };
            await addDoc(userCodesCollection, codeData);
          });
        } else {
          setShowInsufficientPointsModal(true);
          console.log("No tienes suficientes puntos para realizar este descuento.");
        }
      }
    } catch (error) {
      console.log("Error al realizar el descuento:", error);
    }
  } else {
    setShowInsufficientPointsModal(true);
    console.log("No tienes suficientes puntos para realizar este descuento.");
  }
};

const loadAllCodes = async () => {
  const db = getFirestore();
  const userDocRef = doc(db, "usuarios", userUid);
  const userCodesCollection = collection(userDocRef, "codigos_canjeados");
  const codes = [];

  try {
    const querySnapshot = await getDocs(userCodesCollection); // Utiliza getDocs para obtener los documentos de la colección
    querySnapshot.forEach((doc) => {
      const codeData = doc.data();
      codes.push(codeData.code);
    });
    setAllCodes(codes);
  } catch (error) {
    console.error("Error al cargar los códigos canjeados:", error);
  }
};




  const handleStoreInteraction = (store) => {
    setSelectedStore(store);
    setShowConfirmationModal(true);
  };

  const generateCodes = () => {
    const codeLength = 25; // Longitud del código
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; // Caracteres permitidos en el código
    const codes = [];
  
    let code = '';
    for (let j = 0; j < codeLength; j++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters[randomIndex];
    }
  
    codes.push(code); // Agrega un solo código
  
    setGeneratedCodes(codes);
    setShowCodesModal(true);
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
                  onPress={() => {
                    handleStoreInteraction(item);
                    // Aquí generamos los códigos cuando el usuario interactúa con la tienda
                    generateCodes();
                  }}
                  style={styles.storeButton}
                >
                  <Text style={{ color: "white",  fontWeight: "bold" }}>
                    Descuento: {item.pointsRequired} puntos
                  </Text>
                  
                </TouchableOpacity>
                <TouchableHighlight
  style={styles.viewAllCodesButton}
  onPress={() => {
    loadAllCodes(); // Carga los códigos antes de mostrar el modal
    setShowAllCodesModal(true);
  }}
>
  <Text style={styles.buttonTexts}>Mis Codigos</Text>
</TouchableHighlight>


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

      <Modal visible={showAllCodesModal} transparent={true} animationType="slide">
  <View style={styles.modalContainer}>
    {/* Utiliza un ScrollView para hacer que el contenido sea scrollable */}
    <ScrollView
      contentContainerStyle={{
        ...styles.scrollViewContainer,
        paddingTop: 100, // Ajusta el paddingTop según sea necesario
      }}
    >
      <View style={styles.modalContent}>
        <Text style={styles.modalText}>Códigos Canjeados:</Text>
        {allCodes.map((code, index) => (
          <View key={index} style={styles.qrContainer}>
            <Text style={styles.codesText}>{code}</Text>
            <View style={styles.qrWrapper}>
              <QRCode value={code} size={200} />
            </View>
          </View>
        ))}
        <TouchableHighlight
          style={styles.modalButton}
          onPress={() => setShowAllCodesModal(false)}
        >
          <Text style={styles.buttonText}>Cerrar</Text>
        </TouchableHighlight>
      </View>
    </ScrollView>
  </View>
</Modal>


      
      {generatedCodes.length > 0 && (
        // Modal de códigos generados
<Modal visible={showGeneratedCodesModal} transparent={true} animationType="slide">
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
      <Text style={styles.modalText}>Disfruta tu recompensa:</Text>
      {generatedCodes.map((code, index) => (
        <View key={index} style={styles.qrContainer}>
          <Text style={styles.codesText}>{code}</Text>
          <View style={styles.qrWrapper}>
            <QRCode value={code} size={200} />
          </View>
        </View>
      ))}
      <TouchableHighlight
        style={styles.modalButton}
        onPress={() => setShowGeneratedCodesModal(false)}
      >
        <Text style={styles.buttonText}>Cerrar</Text>
      </TouchableHighlight>
    </View>
  </View>
</Modal>









      )}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  codesContainer: {
    marginTop: 0,
    alignItems: "center",
  },
  codesText: {
    fontSize: 18,
    marginBottom: 10,
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
  qrContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    
  },
  qrWrapper: {
    alignItems: 'center',
    
  },
  viewAllCodesButton: {
    backgroundColor: "#ADF14B", // Color de fondo del botón
    padding: 10, // Espacio interno
    borderRadius: 10, // Borde redondeado
    marginTop: 20, // Espacio superior
    alignItems: "center", 
    
  },
  
  buttonTexts: {
    color: "#FFFFFF", // Color del texto del botón
    fontSize: 13, // Tamaño del texto

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

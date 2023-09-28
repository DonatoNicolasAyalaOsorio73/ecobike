import React, { useState } from "react";
import {
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Text,
  View,
  Alert,
  Platform,
  Modal,
} from "react-native";
import {
  getAuth,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { TextInputMask } from 'react-native-masked-text';

const Register = ({ navigation }) => {
  const [userData, setUserData] = useState({
    nombres: "",
    apellidos: "",
    identificacion: "",
    fechaNacimiento: "",
    sexo: "",
    email: "",
    contraseña: "",
    confirmarContraseña: "",
  });

  const [isPlaceholder, setIsPlaceholder] = useState(true);
  const [showSexModal, setShowSexModal] = useState(false);

  const showAlert = (title, message) => {
    Alert.alert(title, message);
  };

  const validateFields = () => {
    const {
      email,
      contraseña,
      nombres,
      apellidos,
      identificacion,
      fechaNacimiento,
      confirmarContraseña,
    } = userData;

    if (
      !email ||
      !contraseña ||
      !nombres ||
      !apellidos ||
      !identificacion ||
      !fechaNacimiento ||
      !confirmarContraseña
    ) {
      showAlert("Alerta", "Debes completar todos los campos.");
      return false;
    }

    if (contraseña.length < MIN_PASSWORD_LENGTH) {
      showAlert("Alerta", "La contraseña debe tener al menos 6 caracteres.");
      return false;
    }

    if (contraseña !== confirmarContraseña) {
      showAlert("Alerta", "Las contraseñas no coinciden.");
      return false;
    }

    return true;
  };

  const handleFocus = () => {
    if (isPlaceholder) {
      setUserData((prevData) => ({
        ...prevData,
        fechaNacimiento: "",
      }));
      setIsPlaceholder(false);
    }
  };

  const handleBlur = () => {
    if (userData.fechaNacimiento === "dd/mm/yyyy") {
      setUserData((prevData) => ({
        ...prevData,
        fechaNacimiento: "",
      }));
      setIsPlaceholder(true);
    } else {
      const formattedDate = userData.fechaNacimiento.replace(
        /(\d{2})(\d{2})(\d{4})/,
        "$1/$2/$3"
      );
      const isValidDate = validateDate(formattedDate);
      if (isValidDate) {
        setUserData((prevData) => ({
          ...prevData,
          fechaNacimiento: formattedDate,
        }));
      } else {
        showAlert("Alerta", "Fecha de nacimiento no válida.");
        setUserData((prevData) => ({
          ...prevData,
          fechaNacimiento: "",
        }));
        setIsPlaceholder(true);
      }
    }
  };

  const validateDate = (date) => {
    const parts = date.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (
      day >= 1 && day <= 31 &&
      month >= 1 && month <= 12 &&
      year >= 1900 && year <= 9999
    ) {
      return true;
    } else {
      return false;
    }
  };

  const handleRegister = async () => {
    const db = getFirestore();
    if (!validateFields()) {
      return;
    }
    try {
      const authInstance = getAuth();
      const username = generateUsername(userData.nombres);
      await createUserWithEmailAndPassword(
        authInstance,
        userData.email,
        userData.contraseña
      );
      if (authInstance.currentUser) {
        const userDocRef = doc(
          db,
          USERS_COLLECTION,
          authInstance.currentUser.uid
        );
        await setDoc(
          userDocRef,
          {
            email: userData.email,
            nombres: userData.nombres,
            apellidos: userData.apellidos,
            identificacion: userData.identificacion,
            fechaNacimiento: userData.fechaNacimiento,
            sexo: userData.sexo,
            username: username 
          },
          { merge: true }
        );
        console.log("Datos agregados a Firestore exitosamente");
        showAlert(
          "Registro Exitoso",
          "Tu registro ha sido exitoso. Ahora puedes iniciar sesión."
        );
        navigation.navigate("SignIn");
      } else {
        console.log("Usuario no autenticado");
      }
    } catch (error) {
      console.log("Error object:", error);
      let errorMessage = "Error al registrar usuario.";
      switch (error.code) {
      }
      showAlert("Alerta", errorMessage);
    }
  };
  
const generateUsername = (name) => {
  const formattedName = name.toLowerCase().replace(/\s/g, '');
  const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
  const username = formattedName + '#' + randomSuffix;
  return username;
};

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.contentContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#353147" />
          </TouchableOpacity>
          <Text style={styles.title}>Regístrate!</Text>
          <Text style={styles.body}>Sé un nuevo Biker</Text>
          {Object.keys(userData).map((key) => (
            <View key={key} style={styles.dataContainer}>
              {key === "fechaNacimiento" ? (
                <View style={styles.inputContainer}>
                  <TextInputMask
                    type={'datetime'}
                    options={{
                      format: 'DD/MM/YYYY'
                    }}
                    key={key}
                    style={styles.input}
                    placeholder={
                      isPlaceholder
                        ? "Fecha de nacimiento"
                        : "dd/mm/yyyy"
                    }
                    placeholderTextColor="#BFBFC1"
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    autoCorrect={false}
                    onChangeText={(value) =>
                      setUserData((prevData) => ({
                        ...prevData,
                        fechaNacimiento: value,
                      }))
                    }
                    value={userData.fechaNacimiento}
                  />
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  {key === "sexo" ? (
                    <View style={styles.inputContainer}>
                      <TouchableOpacity
                        style={[
                          styles.input,
                          { color: userData.sexo ? "black" : "#BFBFC1" },
                        ]}
                        onPress={() => setShowSexModal(true)}
                      >
                        <Text
                          style={{ color: userData.sexo ? "black" : "#BFBFC1" }}
                        >
                          {userData.sexo || "Sexo"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TextInput
                      key={key}
                      style={styles.input}
                      placeholder={
                        key === "confirmarContraseña"
                          ? "Confirma tu contraseña"
                          : key.charAt(0).toUpperCase() + key.slice(1)
                      }
                      autoCorrect={false}
                      secureTextEntry={
                        key === "contraseña" || key === "confirmarContraseña"
                      }
                      keyboardType={
                        key === "identificacion" ? "numeric" : "default"
                      }
                      onChangeText={(value) =>
                        setUserData((prevData) => ({
                          ...prevData,
                          [key]: value,
                        }))
                      }
                      value={userData[key]}
                    />
                  )}
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
          >
            <Text style={styles.buttonText}>Crear</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showSexModal}
        onRequestClose={() => setShowSexModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecciona tu Sexo</Text>
            <Picker
              selectedValue={userData.sexo}
              onValueChange={(itemValue) =>
                setUserData((prevData) => ({ ...prevData, sexo: itemValue }))
              }
            >
              <Picker.Item label="Masculino" value="Masculino" />
              <Picker.Item label="Femenino" value="Femenino" />
              <Picker.Item label="Otro" value="Otro" />
            </Picker>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                if (!userData.sexo) {
                  setUserData((prevData) => ({ ...prevData, sexo: 'Masculino' }));
                }
                setShowSexModal(false);
              }}
            >
              <Text style={styles.modalText}>Seleccionar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const MIN_PASSWORD_LENGTH = 6;
const USERS_COLLECTION = "usuarios";
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  contentContainer: {
    paddingHorizontal: 30,
    borderRadius: 33,
    backgroundColor: "white",
    paddingVertical: 50,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 35,
    textAlign: "center",
    color: "#353147",
  },
  body: {
    padding: 20,
    fontSize: 30,
    lineHeight: 35,
    marginBottom: 20,
    fontWeight: "400",
    textAlign: "center",
    color: "#353147",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#F7F7F7",
    padding: 20,
    borderRadius: 16,
    marginBottom: 10,
    color: "#353147", // Cambia el color del texto a gris
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 1,
  },
  registerButton: {
    backgroundColor: "#000000",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    marginVertical: 30,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Agrega un fondo semitransparente
  },
  modalButton: {
    backgroundColor: "#000000", // Cambiado el color de fondo a azul
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10.32,
  },
  modalText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
});

export default Register;

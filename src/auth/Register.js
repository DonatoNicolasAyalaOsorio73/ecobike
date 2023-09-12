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
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import DatePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";

const Register = ({ navigation }) => {
  const [userData, setUserData] = useState({
    nombres: "",
    apellidos: "",
    identificacion: "",
    fechaNacimiento: new Date(), // Cambiamos esto para que sea un objeto Date
    sexo: "",
    email: "",
    contraseña: "",
    confirmarContraseña: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
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

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === "ios"); // Mostrar el selector en iOS
    if (selectedDate) {
      setUserData((prevData) => ({
        ...prevData,
        fechaNacimiento: selectedDate,
      }));
    }
  };

  const handleSexPress = () => {
    setShowSexModal(true);
  };

  const handleSexSelect = (value) => {
    setShowSexModal(false);
    setUserData((prevData) => ({
      ...prevData,
      sexo: value === "Seleccione una opción" ? "" : value,
    }));
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const hideDatepicker = () => {
    setShowDatePicker(false);
  };

  const acceptDate = () => {
    // Aquí puedes realizar cualquier acción que necesites con la fecha de nacimiento seleccionada.
    // En este ejemplo, simplemente ocultamos el selector de fecha.
    hideDatepicker();
  };

  const handleRegister = async () => {
    const db = getFirestore();

    if (!validateFields()) {
      return;
    }

    try {
      const authInstance = getAuth();
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
            fechaNacimiento: userData.fechaNacimiento.toISOString(),
            sexo: userData.sexo, // Agregamos el campo "sexo"
          },
          { merge: true }
        ); // Utilizamos merge para actualizar o crear el documento

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
      switch (
        error.code
        // ... (rest of the error handling remains the same)
      ) {
      }
      showAlert("Alerta", errorMessage);
    }
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
                <TouchableOpacity style={styles.input} onPress={showDatepicker}>
                  <Text style={styles.label}>Fecha de Nacimiento:</Text>
                  <Text style={styles.label}>
                    {userData.fechaNacimiento.toDateString()}
                  </Text>
                </TouchableOpacity>
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
                      placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
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
            // Si no se eligió ninguna opción, establecer "Masculino" automáticamente
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={showDatePicker}
        onRequestClose={hideDatepicker}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Selecciona tu Fecha de Nacimiento
            </Text>
            <View style={{ alignItems: "center" }}>
              <DatePicker
                style={styles.datePicker}
                mode="date"
                value={userData.fechaNacimiento}
                onChange={handleDateChange}
              />
            </View>

            <TouchableOpacity style={styles.modalButton} onPress={acceptDate}>
              <Text style={styles.modalText}>Aceptar</Text>
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
    borderRadius: 4,
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
  acceptButton: {
    backgroundColor: "#000000",
    padding: 10,
    borderRadius: 16,
    alignItems: "center",
    marginVertical: 10,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.44,
    shadowRadius: 5.32,
    elevation: 5,
  },
  acceptButtonText: {
    color: "white",
    fontWeight: "bold",
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
  label: {
    marginBottom: 10,
    color: "#BFBFC1", // Cambia el color del texto a gris
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
    width: "80%", // Ajusta el ancho del modalContent al 80% del ancho de la pantalla
  },
  textInputStyle: {
    backgroundColor: "#F7F7F7",

    color: "#BFBFC1", // Cambiar el color del texto a un gris más suave
  },
});

export default Register;

import React, { useState } from 'react';
import { SafeAreaView, TouchableOpacity, ScrollView, TextInput, StyleSheet, Text, View, Alert } from 'react-native';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

const Register = ({ navigation }) => {
  const [userData, setUserData] = useState({
    nombres: '',
    apellidos: '',
    identificacion: '',
    edad: '',
    email: '',
    contraseña: '',
    confirmPassword: '',
  });

  const showAlert = (title, message) => {
    Alert.alert(title, message);
  };

  const handleRegister = async () => {
    const db = getFirestore();

    const { email, contraseña, nombres, apellidos, identificacion, edad, confirmPassword } = userData;

    if (!email || !contraseña || !nombres || !apellidos || !identificacion || !edad || !confirmPassword) {
      showAlert('Alerta', 'Debes completar todos los campos.');
      return;
    }

    if (contraseña.length < 6) {
      showAlert('Alerta', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (contraseña !== confirmPassword) {
      showAlert('Alerta', 'Las contraseñas no coinciden.');
      return;
    }

    try {
      const authInstance = getAuth();
      await createUserWithEmailAndPassword(authInstance, email, contraseña);

      if (authInstance.currentUser) {
        const userDocRef = doc(db, 'usuarios', authInstance.currentUser.uid);
        await setDoc(userDocRef, {
          email,
          nombres,
          apellidos,
          identificacion,
          edad,
        }, { merge: true });

        console.log('Datos agregados a Firestore exitosamente');

        showAlert(
          'Registro Exitoso',
          'Tu registro ha sido exitoso. Ahora puedes iniciar sesión.',
        );
        navigation.navigate('SignIn');
      } else {
        console.log('Usuario no autenticado');
      }
    } catch (error) {
      console.log('Error object:', error);
      let errorMessage = 'Error al registrar usuario.';
      switch (error.code) {
        // ... (rest of the error handling remains the same)
      }
      showAlert('Alerta', errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.contentContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#353147" />
          </TouchableOpacity>
          <Text style={styles.title}>Regístrate!</Text>
          <Text style={styles.body}>Sé un nuevo Biker!</Text>
          {Object.keys(userData).map((key) => (
            <TextInput
              key={key}
              style={styles.input}
              placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
              autoCorrect={false}
              secureTextEntry={key === 'contraseña' || key === 'confirmPassword'}
              keyboardType={key === 'edad' || key === 'identificacion' ? 'numeric' : 'default'}
              onChangeText={(value) => setUserData((prevData) => ({ ...prevData, [key]: value }))}
              value={userData[key]}
            />
          ))}
          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}>
            <Text style={styles.buttonText}>Crear</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    paddingHorizontal: 30,
    borderRadius: 4,
    backgroundColor: 'white',
    paddingVertical: 50,
    shadowColor: '#000',
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
    fontWeight: '700',
    lineHeight: 35,
    textAlign: 'center',
    color: '#353147',
  },
  body: {
    padding: 20,
    fontSize: 30,
    lineHeight: 35,
    marginBottom: 20,
    fontWeight: '400',
    textAlign: 'center',
    color: '#353147',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#F7F7F7',
    padding: 20,
    borderRadius: 16,
    marginBottom: 10,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
  },
  registerButton: {
    backgroundColor: '#000000',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginVertical: 30,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
  },
});

export default Register;

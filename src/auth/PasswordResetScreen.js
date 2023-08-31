import React, { useState } from 'react';
import {
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Text,
  Alert,
  View,
} from 'react-native';

import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../FireDataBase';
import { Ionicons } from '@expo/vector-icons';

const PasswordResetScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');

  const handlePasswordReset = async () => {
    try {
      if (!email.trim()) {
        throw new Error('Debes ingresar un correo electrónico.');
      }

      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        'Correo de Restablecimiento Enviado',
        'Se ha enviado un correo para restablecer tu contraseña.'
      );
      navigation.navigate('SignIn'); // Regresar a la pantalla de inicio de sesión después de enviar el correo
    } catch (error) {
      let errorMessage = 'Error al enviar el correo de restablecimiento.';

      switch (error.code) {
        case 'auth/invalid-email':
        case 'auth/user-not-found':
          errorMessage = 'No se encontró ningún usuario con este correo electrónico.';
          break;
        default:
          errorMessage = error.message || errorMessage;
          break;
      }

      Alert.alert('Error', errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.contentContainer}>
        <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#353147" />
          </TouchableOpacity>

          <Text style={styles.title}>Recuperar Contraseña</Text>

          <Text style={styles.body}>
            Ingresa tu correo electrónico para restablecer la contraseña:
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            autoCorrect={false}
            onChangeText={setEmail}
            value={email}
            maxLength={50}
          />

          <TouchableOpacity style={styles.signInButton} onPress={handlePasswordReset}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Enviar</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingHorizontal: 30,
  },
  backButton: {
    position: 'absolute',
    top: -75, 
    left: 10,
    zIndex: 1,
  },
  backButtonText: {
    fontWeight: '500',
    color: '#353147',
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
    fontSize: 20,
    lineHeight: 35,
    marginBottom: 20,
    fontWeight: '400',
    textAlign: 'center',
    color: '#353147',
  },
  buttonsText: {
    fontWeight: '500',
    color: '#353147',
  },
  button1: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#ffffff70',
    padding: 16,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 16,
    marginHorizontal: 10,
  },
  button2: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',

    backgroundColor: '#DFE3E630',
    marginTop: 40,
  },
  input: {
    backgroundColor: '#F7F7F7',
    padding: 20,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  signInButton: {
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

export default PasswordResetScreen;

import MyBlur from '../components/MyBlur';
import React, { useState } from 'react';
import {
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Text,
  Image,
  View,
  Dimensions,
  Alert,
} from 'react-native';

import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'; // Import necessary Firebase functions
import { auth } from '../FireDataBase'; // Import the 'auth' object from FireDataBase.js
import { Ionicons } from '@expo/vector-icons';



const SignIn = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    try {
      if (!email.trim() || !password.trim()) {
        throw new Error('Debes ingresar un correo y una contraseña.');
      }

      if (password.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres.');
      }

      await signInWithEmailAndPassword(auth, email, password);

      Alert.alert('Inicio de Sesión Exitoso', 'Has iniciado sesión correctamente.');
      navigation.navigate('MainTabs')
    } catch (error) {
      let errorMessage = 'Error al iniciar sesión.';

      switch (error.code) {
        case 'auth/invalid-email':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMessage = 'Credenciales inválidas. Verifica tu correo y contraseña.';
          break;
        default:
          errorMessage = error.message || errorMessage;
          break;
      }

      Alert.alert(
        'Alerta',
        errorMessage,
        [
          { text: 'Aceptar', onPress: () => console.log('OK Pressed') }
        ],
        { messageStyle: { textAlign: 'center' } }
      );
      
    }
    
  };

  

  return (
    <>
      <MyBlur />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.contentContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#353147" />
            </TouchableOpacity>
            <Text style={styles.title}>Hola Biker!</Text>
            <Text style={styles.body}>Bienvenido</Text>

            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              autoCorrect={false}
              onChangeText={setEmail}
              value={email}
              maxLength={50}
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              autoCorrect={false}
              secureTextEntry={true}
              onChangeText={setPassword}
              value={password}
              maxLength={20}
            />
            <TouchableOpacity
              onPress={() => navigation.navigate('PasswordResetScreen')}>
              <Text
                style={[
                  styles.buttonsText,
                  { fontWeight: 'bold', lineHeight: 30, textAlign: 'right' },
                ]}>
                Recupera tu contraseña
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Entrar</Text>
            </TouchableOpacity>

            <Text style={{ textAlign: 'center' }}>O inicia con</Text>

            <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button1} >
          <Image
            source={{
              uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/1024px-Google_%22G%22_Logo.svg.png',
            }}
            style={{ width: 40, height: 40 }}
          />
        </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Welcome')}
                style={styles.button1}>
                <Image
                  source={{
                    uri: 'https://www.freepnglogos.com/uploads/apple-logo-png/apple-logo-png-dallas-shootings-don-add-are-speech-zones-used-4.png',
                  }}
                  style={{ width: 40, height: 40 }}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Welcome')}
                style={styles.button1}>
                <Image
                  source={{
                    uri: 'https://cdn-icons-png.flaticon.com/512/124/124010.png',
                  }}
                  style={{ width: 40, height: 40, borderRadius: 50 }}
                />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
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
  backButton: {
    position: 'absolute',
    top: -40, 
    left: 20,
    zIndex: 1,
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
    borderRadius: 16,
    marginBottom: 10,
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
export default SignIn;
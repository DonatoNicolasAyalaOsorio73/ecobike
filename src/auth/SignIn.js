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
  ActivityIndicator,
} from 'react-native';

import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'; // Import necessary Firebase functions
import { auth } from '../FireDataBase'; // Import the 'auth' object from FireDataBase.js
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme';

const SignIn = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (loading) return; // ponytail: guard double-submit
    if (!email.trim() || !password.trim()) {
      Alert.alert('Faltan datos', 'Debes ingresar un correo y una contraseña.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigation.navigate('MainTabs');
    } catch (error) {
      let errorMessage = 'Error al iniciar sesión. Intenta de nuevo.';

      switch (error.code) {
        case 'auth/invalid-email':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Credenciales inválidas. Verifica tu correo y contraseña.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Demasiados intentos. Espera un momento e intenta de nuevo.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Sin conexión. Verifica tu red e intenta de nuevo.';
          break;
        default:
          errorMessage = error.message || errorMessage;
          break;
      }
      Alert.alert('No se pudo iniciar sesión', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const socialSoon = () =>
    Alert.alert('Próximamente', 'El inicio de sesión con redes sociales estará disponible muy pronto.');

  

  return (
    <>
      <MyBlur />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.contentContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={colors.textAuth} />
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

            <TouchableOpacity
              style={[styles.signInButton, loading && { opacity: 0.7 }]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.85}>
              {loading ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <Text style={{ color: colors.onBrand, fontWeight: 'bold' }}>Entrar</Text>
              )}
            </TouchableOpacity>

            <Text style={{ textAlign: 'center' }}>O inicia con</Text>

            <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button1} onPress={socialSoon}>
          <Image
            source={{
              uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/1024px-Google_%22G%22_Logo.svg.png',
            }}
            style={{ width: 40, height: 40 }}
          />
        </TouchableOpacity>
              <TouchableOpacity
                onPress={socialSoon}
                style={styles.button1}>
                <Image
                  source={{
                    uri: 'https://www.freepnglogos.com/uploads/apple-logo-png/apple-logo-png-dallas-shootings-don-add-are-speech-zones-used-4.png',
                  }}
                  style={{ width: 40, height: 40 }}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={socialSoon}
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
    color: colors.textAuth,
  },
  body: {
    padding: 20,
    fontSize: 30,
    lineHeight: 35,
    marginBottom: 20,
    fontWeight: '400',
    textAlign: 'center',
    color: colors.textAuth,
  },
  backButton: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.38)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonsText: {
    fontWeight: '500',
    color: colors.textAuth,
  },
  button1: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    marginHorizontal: 6,
  },
  button2: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 20,
    marginTop: 40,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  signInButton: {
    backgroundColor: colors.brand,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginVertical: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    ...shadows.brandGlow,
  },
});
export default SignIn;
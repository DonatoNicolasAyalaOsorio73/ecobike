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
  ActivityIndicator,
} from 'react-native';

import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../FireDataBase';
import { Ionicons } from '@expo/vector-icons';
import MyBlur from '../components/MyBlur';
import { colors, shadows, glass } from '../theme';

const PasswordResetScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async () => {
    if (loading) return; // ponytail: guard double-submit
    if (!email.trim()) {
      Alert.alert('Falta el correo', 'Debes ingresar un correo electrónico.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert(
        'Correo enviado',
        'Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada y spam.'
      );
      navigation.navigate('SignIn');
    } catch (error) {
      let errorMessage = 'Error al enviar el correo de restablecimiento.';

      switch (error.code) {
        case 'auth/invalid-email':
        case 'auth/user-not-found':
          errorMessage = 'No se encontró ningún usuario con este correo electrónico.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Sin conexión. Verifica tu red e intenta de nuevo.';
          break;
        default:
          errorMessage = error.message || errorMessage;
          break;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
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
            <Ionicons name="arrow-back" size={24} color={colors.textAuth} />
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

          <TouchableOpacity
            style={[styles.signInButton, loading && { opacity: 0.7 }]}
            onPress={handlePasswordReset}
            disabled={loading}
            activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <Text style={{ color: colors.onBrand, fontWeight: 'bold' }}>Enviar</Text>
            )}
          </TouchableOpacity>

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
    paddingVertical: 48,
    borderRadius: 32,
    ...glass.authCard,
    width: '90%',
    alignSelf: 'center',
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
  backButtonText: {
    fontWeight: '500',
    color: colors.textAuth,
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
    fontSize: 20,
    lineHeight: 35,
    marginBottom: 20,
    fontWeight: '400',
    textAlign: 'center',
    color: colors.textAuth,
  },
  buttonsText: {
    fontWeight: '500',
    color: colors.textAuth,
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

export default PasswordResetScreen;
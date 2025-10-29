import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../FireDataBase';
import { Ionicons } from '@expo/vector-icons';
import MyBlur from '../components/MyBlur';

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
      navigation.navigate('SignIn');
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
    <View style={styles.wrapper}>
      <MyBlur />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Botón de regreso */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <View style={styles.backButtonCircle}>
                <Ionicons name="arrow-back" size={24} color="#353147" />
              </View>
            </TouchableOpacity>

            {/* Contenido principal */}
            <View style={styles.contentContainer}>
              <Text style={styles.title}>Recuperar</Text>
              <Text style={styles.title}>Contraseña</Text>

              <Text style={styles.body}>
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
              </Text>

              {/* Input de email */}
              <View style={styles.inputContainer}>
                <Ionicons 
                  name="mail-outline" 
                  size={20} 
                  color="#353147" 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="Correo electrónico"
                  placeholderTextColor="#353147"
                  autoCorrect={false}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  value={email}
                  maxLength={50}
                />
              </View>

              {/* Botón de enviar */}
              <TouchableOpacity 
                style={styles.sendButton} 
                onPress={handlePasswordReset}
                activeOpacity={0.8}
              >
                <Text style={styles.sendButtonText}>Enviar enlace</Text>
              </TouchableOpacity>

              {/* Botón para volver a inicio de sesión */}
              <TouchableOpacity 
                style={styles.backToLoginButton}
                onPress={() => navigation.navigate('SignIn')}
                activeOpacity={0.7}
              >
                <Text style={styles.backToLoginText}>Volver al inicio de sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    textAlign: 'center',
    color: '#353147',
  },
  body: {
    marginTop: 20,
    marginBottom: 40,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
    textAlign: 'center',
    color: '#353147',
    paddingHorizontal: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    fontSize: 16,
    color: '#353147',
    fontWeight: '500',
  },
  sendButton: {
    backgroundColor: '#353147',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#353147',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  backToLoginButton: {
    marginTop: 20,
    padding: 16,
    alignItems: 'center',
  },
  backToLoginText: {
    color: '#353147',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PasswordResetScreen;
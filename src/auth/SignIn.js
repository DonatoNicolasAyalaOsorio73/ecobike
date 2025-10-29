import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../FireDataBase';
import { Ionicons } from '@expo/vector-icons';
import MyBlur from '../components/MyBlur';
import { DEMO_MODE } from '../config/demoConfig';
import { signInDemo } from '../services/authService';

const SignIn = ({ navigation }) => {
  const [email, setEmail] = useState(DEMO_MODE ? 'demo@ecobike.com' : '');
  const [password, setPassword] = useState(DEMO_MODE ? 'demo123' : '');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    try {
      if (DEMO_MODE) {
        // Modo demo
        await signInDemo(email, password);
        Alert.alert('¡Bienvenido!', 'Modo Demo - Explora la app sin límites', [
          { text: 'OK', onPress: () => navigation.replace('Home') }
        ]);
      } else {
        // Modo producción con Firebase
        await signInWithEmailAndPassword(auth, email, password);
        navigation.replace('Home');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
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
            {/* Banner de modo demo */}
            {DEMO_MODE && (
              <View style={styles.demoBanner}>
                <Ionicons name="information-circle" size={20} color="#64cd69" />
                <Text style={styles.demoText}>Modo Demo Activo</Text>
              </View>
            )}

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

            {/* Resto del código existente... */}
            <View style={styles.contentContainer}>
              <Text style={styles.title}>Iniciar</Text>
              <Text style={styles.title}>Sesión</Text>

              {DEMO_MODE && (
                <View style={styles.demoCredentials}>
                  <Text style={styles.demoCredentialsText}>
                    📧 Email: demo@ecobike.com
                  </Text>
                  <Text style={styles.demoCredentialsText}>
                    🔒 Contraseña: demo123
                  </Text>
                </View>
              )}

              {/* Inputs... (código existente) */}
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#353147" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Correo electrónico"
                  placeholderTextColor="#353147"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#353147" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Contraseña"
                  placeholderTextColor="#353147"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#353147" 
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
                <Text style={styles.signInButtonText}>Entrar</Text>
              </TouchableOpacity>

              {/* Resto del código... */}
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
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: 30,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(100, 205, 105, 0.15)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  demoText: {
    color: '#64cd69',
    fontSize: 14,
    fontWeight: '600',
  },
  demoCredentials: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#64cd69',
  },
  demoCredentialsText: {
    fontSize: 14,
    color: '#353147',
    marginVertical: 4,
    fontWeight: '500',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  contentContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
    textAlign: 'center',
    color: '#353147',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 28,
    textAlign: 'center',
    color: '#353147',
  },
  inputContainer: {
    width: '100%',
    backgroundColor: '#F7F7F7',
    borderRadius: 16,
    marginBottom: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: '#353147',
  },
  signInButton: {
    backgroundColor: '#000000',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 8,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orText: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    color: '#353147',
    marginBottom: 24,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButtonWrapper: {
    flex: 1,
  },
  socialButton: {
    backgroundColor: '#ffffff70',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIcon: {
    width: 32,
    height: 32,
  },
  socialIconRound: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});

export default SignIn;
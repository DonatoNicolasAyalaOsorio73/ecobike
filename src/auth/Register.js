import React, { useState } from 'react';
import {
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Text,
  Image,
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../FireDataBase';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import MyBlur from '../components/MyBlur';

const Register = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const registerButtonScale = useSharedValue(1);
  const backButtonScale = useSharedValue(1);
  const googleScale = useSharedValue(1);
  const appleScale = useSharedValue(1);
  const facebookScale = useSharedValue(1);

  const handleRegister = async () => {
    try {
      if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
        throw new Error('Todos los campos son obligatorios.');
      }

      if (password !== confirmPassword) {
        throw new Error('Las contraseñas no coinciden.');
      }

      if (password.length < 8) {
        throw new Error('La contraseña debe tener al menos 8 caracteres.');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        name: name,
        email: email,
        createdAt: new Date(),
      });

      Alert.alert('Registro Exitoso', '¡Bienvenido a EcoBike!');
      navigation.navigate('MainTabs');
    } catch (error) {
      let errorMessage = 'Error al registrar.';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este correo ya está registrado.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Correo electrónico inválido.';
          break;
        case 'auth/weak-password':
          errorMessage = 'La contraseña es muy débil.';
          break;
        default:
          errorMessage = error.message || errorMessage;
          break;
      }

      Alert.alert('Alerta', errorMessage, [{ text: 'Aceptar' }]);
    }
  };

  const registerButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: registerButtonScale.value }],
  }));

  const backButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backButtonScale.value }],
  }));

  const googleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: googleScale.value }],
  }));

  const appleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: appleScale.value }],
  }));

  const facebookAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: facebookScale.value }],
  }));

  return (
    <View style={styles.wrapper}>
      <MyBlur />
      <SafeAreaView style={styles.container} edges={[]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View style={styles.contentContainer}>
              <Animated.View style={backButtonAnimatedStyle}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                  onPressIn={() => backButtonScale.value = withSpring(0.9, { damping: 15 })}
                  onPressOut={() => backButtonScale.value = withSpring(1, { damping: 15 })}
                  activeOpacity={1}
                >
                  <Ionicons name="arrow-back" size={24} color="#353147" />
                </TouchableOpacity>
              </Animated.View>

              <Text style={styles.title}>Crear Cuenta</Text>
              <Text style={styles.body}>Únete a la comunidad</Text>

              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                autoCorrect={false}
                onChangeText={setName}
                value={name}
                maxLength={50}
              />
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                autoCorrect={false}
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={setEmail}
                value={email}
                maxLength={50}
              />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                autoCorrect={false}
                autoCapitalize="none"
                secureTextEntry={true}
                onChangeText={setPassword}
                value={password}
                maxLength={20}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirmar contraseña"
                autoCorrect={false}
                autoCapitalize="none"
                secureTextEntry={true}
                onChangeText={setConfirmPassword}
                value={confirmPassword}
                maxLength={20}
              />

              <Animated.View style={registerButtonAnimatedStyle}>
                <TouchableOpacity
                  style={styles.registerButton}
                  onPress={handleRegister}
                  onPressIn={() => registerButtonScale.value = withSpring(0.96, { damping: 15 })}
                  onPressOut={() => registerButtonScale.value = withSpring(1, { damping: 15 })}
                  activeOpacity={1}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Registrarse</Text>
                </TouchableOpacity>
              </Animated.View>

              <Text style={{ textAlign: 'center', marginVertical: 20 }}>O regístrate con</Text>

              <View style={styles.buttonContainer}>
                <Animated.View style={[{ flex: 1 }, googleAnimatedStyle]}>
                  <TouchableOpacity
                    style={styles.button1}
                    onPressIn={() => googleScale.value = withSpring(0.9, { damping: 15 })}
                    onPressOut={() => googleScale.value = withSpring(1, { damping: 15 })}
                    activeOpacity={1}
                  >
                    <Image
                      source={{
                        uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/1024px-Google_%22G%22_Logo.svg.png',
                      }}
                      style={{ width: 40, height: 40 }}
                    />
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View style={[{ flex: 1 }, appleAnimatedStyle]}>
                  <TouchableOpacity
                    style={styles.button1}
                    onPressIn={() => appleScale.value = withSpring(0.9, { damping: 15 })}
                    onPressOut={() => appleScale.value = withSpring(1, { damping: 15 })}
                    activeOpacity={1}
                  >
                    <Image
                      source={{
                        uri: 'https://www.freepnglogos.com/uploads/apple-logo-png/apple-logo-png-dallas-shootings-don-add-are-speech-zones-used-4.png',
                      }}
                      style={{ width: 40, height: 40 }}
                    />
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View style={[{ flex: 1 }, facebookAnimatedStyle]}>
                  <TouchableOpacity
                    style={styles.button1}
                    onPressIn={() => facebookScale.value = withSpring(0.9, { damping: 15 })}
                    onPressOut={() => facebookScale.value = withSpring(1, { damping: 15 })}
                    activeOpacity={1}
                  >
                    <Image
                      source={{
                        uri: 'https://cdn-icons-png.flaticon.com/512/124/124010.png',
                      }}
                      style={{ width: 40, height: 40, borderRadius: 50 }}
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>

              <View style={styles.loginContainer}>
                <Text style={styles.buttonsText}>¿Ya tienes cuenta? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                  <Text style={[styles.buttonsText, { fontWeight: 'bold', textDecorationLine: 'underline' }]}>
                    Inicia sesión
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
    justifyContent: 'center',
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
    padding: 15,
    fontSize: 24,
    lineHeight: 30,
    marginBottom: 15,
    fontWeight: '400',
    textAlign: 'center',
    color: '#353147',
  },
  backButton: {
    position: 'absolute',
    top: -10,
    left: 0,
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
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'white',
    marginHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#DFE3E630',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F7F7F7',
    padding: 18,
    borderRadius: 16,
    marginBottom: 10,
  },
  registerButton: {
    backgroundColor: '#000000',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
});

export default Register;

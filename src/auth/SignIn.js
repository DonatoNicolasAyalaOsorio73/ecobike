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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../FireDataBase';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import MyBlur from '../components/MyBlur';

const SignIn = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signInButtonScale = useSharedValue(1);
  const backButtonScale = useSharedValue(1);
  const googleScale = useSharedValue(1);
  const appleScale = useSharedValue(1);
  const facebookScale = useSharedValue(1);

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
      navigation.navigate('MainTabs');
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
        [{ text: 'Aceptar' }],
        { messageStyle: { textAlign: 'center' } }
      );
    }
  };

  const signInButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: signInButtonScale.value }],
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

            <View style={styles.header}>
              <Text style={styles.title}>Hola Biker!</Text>
              <Text style={styles.subtitle}>Bienvenido</Text>
            </View>

            <View style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                placeholderTextColor="#999"
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
                placeholderTextColor="#999"
                autoCorrect={false}
                autoCapitalize="none"
                secureTextEntry={true}
                onChangeText={setPassword}
                value={password}
                maxLength={20}
              />
              
              <TouchableOpacity
                onPress={() => navigation.navigate('PasswordResetScreen')}
                activeOpacity={0.7}
                style={styles.forgotPasswordContainer}
              >
                <Text style={styles.forgotPasswordText}>
                  Recupera tu contraseña
                </Text>
              </TouchableOpacity>

              <Animated.View style={signInButtonAnimatedStyle}>
                <TouchableOpacity 
                  style={styles.signInButton} 
                  onPress={handleSignIn}
                  onPressIn={() => signInButtonScale.value = withSpring(0.96, { damping: 15 })}
                  onPressOut={() => signInButtonScale.value = withSpring(1, { damping: 15 })}
                  activeOpacity={1}
                >
                  <Text style={styles.signInButtonText}>Entrar</Text>
                </TouchableOpacity>
              </Animated.View>

              <Text style={styles.orText}>O inicia con</Text>

              <View style={styles.socialButtonsContainer}>
                <Animated.View style={[styles.socialButtonWrapper, googleAnimatedStyle]}>
                  <TouchableOpacity 
                    style={styles.socialButton}
                    onPressIn={() => googleScale.value = withSpring(0.9, { damping: 15 })}
                    onPressOut={() => googleScale.value = withSpring(1, { damping: 15 })}
                    activeOpacity={1}
                  >
                    <Image
                      source={{
                        uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/1024px-Google_%22G%22_Logo.svg.png',
                      }}
                      style={styles.socialIcon}
                    />
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View style={[styles.socialButtonWrapper, appleAnimatedStyle]}>
                  <TouchableOpacity 
                    style={styles.socialButton}
                    onPressIn={() => appleScale.value = withSpring(0.9, { damping: 15 })}
                    onPressOut={() => appleScale.value = withSpring(1, { damping: 15 })}
                    activeOpacity={1}
                  >
                    <Image
                      source={{
                        uri: 'https://www.freepnglogos.com/uploads/apple-logo-png/apple-logo-png-dallas-shootings-don-add-are-speech-zones-used-4.png',
                      }}
                      style={styles.socialIcon}
                    />
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View style={[styles.socialButtonWrapper, facebookAnimatedStyle]}>
                  <TouchableOpacity 
                    style={styles.socialButton}
                    onPressIn={() => facebookScale.value = withSpring(0.9, { damping: 15 })}
                    onPressOut={() => facebookScale.value = withSpring(1, { damping: 15 })}
                    activeOpacity={1}
                  >
                    <Image
                      source={{
                        uri: 'https://cdn-icons-png.flaticon.com/512/124/124010.png',
                      }}
                      style={styles.socialIconRound}
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>
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
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  contentContainer: {
    paddingHorizontal: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: '#F7F7F7',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '400',
    color: '#353147',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
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
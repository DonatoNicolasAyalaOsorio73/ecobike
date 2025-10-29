import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
} from 'react-native-reanimated';
import MyBlur from '../components/MyBlur';

const { width, height } = Dimensions.get('window');

const Welcome = ({ navigation }) => {
  const button1Scale = useSharedValue(1);
  const button2Scale = useSharedValue(1);

  const handlePressIn1 = () => {
    button1Scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut1 = () => {
    button1Scale.value = withSpring(1, { damping: 15 });
  };

  const handlePressIn2 = () => {
    button2Scale.value = withSpring(0.95, { damping: 15 });
  };

  const handlePressOut2 = () => {
    button2Scale.value = withSpring(1, { damping: 15 });
  };

  const button1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: button1Scale.value }],
  }));

  const button2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: button2Scale.value }],
  }));

  return (
    <View style={styles.wrapper}>
      <MyBlur />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.container}>
          {/* Logo - Parte superior */}
          <View style={styles.logoContainer}>
            <Image
              source={{
                uri: 'https://i.pinimg.com/originals/f1/8d/c4/f18dc48903a12e939904ef622bc37cc9.png',
              }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          {/* Textos - Centro con blobs verdes atrás */}
          <View style={styles.contentContainer}>
            <Text style={styles.title}>El mundo</Text>
            <Text style={styles.title}>sobre dos ruedas</Text>
            <Text style={styles.body}>
              Vive emocionantes aventuras en tu bicicleta y gana puntos canjeables por cupones en tus tiendas favoritas.
            </Text>
          </View>

          {/* Botones - Estilo Apple */}
          <View style={styles.buttonContainerWrapper}>
            <View style={styles.buttonContainer}>
              <Animated.View style={[styles.buttonWrapper, button2AnimatedStyle]}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Register')}
                  onPressIn={handlePressIn2}
                  onPressOut={handlePressOut2}
                  style={styles.button2}
                  activeOpacity={1}
                >
                  <Text style={styles.buttonText}>Únete</Text>
                </TouchableOpacity>
              </Animated.View>
              
              <Animated.View style={[styles.buttonWrapper, button1AnimatedStyle]}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('SignIn')}
                  onPressIn={handlePressIn1}
                  onPressOut={handlePressOut1}
                  style={styles.button1}
                  activeOpacity={1}
                >
                  <Text style={styles.buttonText}>Entra</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </View>
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
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: height * 0.06,
    paddingBottom: 40,
  },
  logoContainer: {
    flex: 1.8,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
  },
  logo: {
    width: width * 0.8,
    height: height * 0.35,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
    zIndex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    textAlign: 'center',
    color: '#353147',
  },
  body: {
    marginTop: 16,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
    textAlign: 'center',
    color: '#353147',
  },
  buttonContainerWrapper: {
    paddingTop: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 60,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonWrapper: {
    flex: 1,
  },
  button1: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.5)',
  },
  button2: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#353147',
  },
});

export default Welcome;
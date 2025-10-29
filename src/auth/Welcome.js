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
          {/* Logo - Protagonista */}
          <View style={styles.logoContainer}>
            <Image
              source={{
                uri: 'https://i.pinimg.com/originals/f1/8d/c4/f18dc48903a12e939904ef622bc37cc9.png',
              }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          {/* Textos */}
          <View style={styles.contentContainer}>
            <Text style={styles.title}>El mundo</Text>
            <Text style={styles.title}>sobre dos ruedas</Text>
            <Text style={styles.body}>
              Vive emocionantes aventuras en tu bicicleta y gana puntos canjeables por cupones en tus tiendas favoritas.
            </Text>
          </View>

          {/* Botones */}
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
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: height * 0.08,
    paddingBottom: 30,
  },
  logoContainer: {
    flex: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: width * 0.85,
    height: height * 0.45,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginBottom: 20,
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
    paddingBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 60,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 16,
    backgroundColor: '#DFE3E630',
    overflow: 'hidden',
  },
  buttonWrapper: {
    flex: 1,
  },
  button1: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff70',
  },
  button2: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#353147',
  },
});

export default Welcome;
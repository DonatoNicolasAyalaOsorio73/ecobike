import React from 'react';
import {
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  Image,
  View,
  Dimensions,
} from 'react-native';
import MyBlur from '../components/MyBlur';

const Welcome = ({navigation}) => {
  const {height} = Dimensions.get('window');
  return (
    <>
      <MyBlur />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.container}>
          <Image
            source={{
              uri: 'https://i.pinimg.com/originals/f1/8d/c4/f18dc48903a12e939904ef622bc37cc9.png',
            }}
            style={{
              width: '100%',
              height: (height / 4.2) * 1.5,
              borderRadius: 4,
              marginBottom: 60, // Ajusta el valor según tu preferencia
              alignSelf: 'center', // Centra la imagen horizontalmente
              marginTop: 80, // Agrega margen superior si es necesario
            }}
          />
          <View style={styles.contentContainer}>
            <Text style={styles.title}>El Mundo </Text>
            <Text style={styles.title}>Sobre Dos Ruedas</Text>
            <Text style={styles.body}>Descubre emocionantes aventuras en bicicleta y gana puntos canjeables por premios.
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
               onPress={() => navigation.navigate('Register')}
               style={styles.button2}>
                <Text style={styles.buttonsText}>Register</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('SignIn')}
                style={styles.button1}>
                <Text style={styles.buttonsText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

export default Welcome;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingHorizontal: 25,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 35,
    textAlign: 'center',
    color: '#353147',
  },
  body: {
    paddingTop: 20,
    fontSize: 16,
    lineHeight: 23,
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
  },
  button2: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 16,
    backgroundColor: '#DFE3E630',
    marginTop: 40,
  },
});
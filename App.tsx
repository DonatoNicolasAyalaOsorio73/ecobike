import { NavigationContainer } from '@react-navigation/native'; 
import * as React from 'react';
import {StatusBar} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MyNavigation from './src/MyNavigation';

const App = () => {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={'dark-content'} />
      <NavigationContainer>
        <MyNavigation />
      </NavigationContainer>
    </SafeAreaProvider>
  )
};

export default App;
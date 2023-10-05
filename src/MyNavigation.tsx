import * as React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Welcome from './auth/Welcome';
import SignIn from './auth/SignIn';
import Register from './auth/Register';
import FriendsScreen from './screens/FriendsScreen';
import MapScreen from './screens/MapScreen';
import PointsScreen from './screens/PointsScreen';
import UserScreen from './screens/UserScreen';
import PasswordResetScreen from './auth/PasswordResetScreen';
import CustomBottomTab from './components/shared/BottomTabs/CustomBottomTab';


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator tabBar={props => <CustomBottomTab {...props} />}>
      <Tab.Group
        screenOptions={{
          headerShown: false,
        }}>
      <Tab.Screen name="Mapa" component={MapScreen} />
      <Tab.Screen name="Puntos" component={PointsScreen} />
      <Tab.Screen name="Amigos" component={FriendsScreen} />
      <Tab.Screen name="Usuario" component={UserScreen} />
      </Tab.Group>
    </Tab.Navigator> 
  );
};

function AuthStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Welcome" component={Welcome} options={{ headerShown: false }} />
      <Stack.Screen name="SignIn" component={SignIn} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
      <Stack.Screen name="PasswordResetScreen"component={PasswordResetScreen} options={{ headerShown: false }}/>
    </Stack.Navigator>
  );
}

export default function MyNavigation() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AuthStack"
        component={AuthStack}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

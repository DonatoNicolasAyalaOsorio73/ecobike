import * as React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// @ts-ignore
import Welcome from './auth/Welcome';
// @ts-ignore
import SignIn from './auth/SignIn';
// @ts-ignore
import Register from './auth/Register';
// @ts-ignore
import PasswordResetScreen from './auth/PasswordResetScreen';
// @ts-ignore
import FriendsScreen from './screens/FriendsScreen';
// @ts-ignore
import MapScreen from './screens/MapScreen';
// @ts-ignore
import PointsScreen from './screens/PointsScreen';
// @ts-ignore
import UserScreen from './screens/UserScreen';
// @ts-ignore
import AdminPanel from './screens/AdminPanel';
import CustomBottomTab from './components/shared/BottomTabs/CustomBottomTab';



const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator tabBar={props => <CustomBottomTab {...props} />}>
      <Tab.Group screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Mapa" component={MapScreen} />
        <Tab.Screen name="Puntos" component={PointsScreen} />
        <Tab.Screen name="Amigos" component={FriendsScreen} />
        <Tab.Screen name="Usuario" component={UserScreen} />
        <Tab.Screen name="AdminPanel" component={AdminPanel} />
      </Tab.Group>
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Welcome" component={Welcome} options={{ headerShown: false }} />
      <Stack.Screen name="SignIn" component={SignIn} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />
      <Stack.Screen name="PasswordResetScreen" component={PasswordResetScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

export default function MyNavigation() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AuthStack" component={AuthStack} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
    </Stack.Navigator>
  );
}

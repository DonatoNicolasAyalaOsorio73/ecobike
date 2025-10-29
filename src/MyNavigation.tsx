import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from './services/authService';

// Auth Screens
import Welcome from './auth/Welcome';
import SignIn from './auth/SignIn';
import Register from './auth/Register';
import PasswordResetScreen from './auth/PasswordResetScreen';

// Main Screens
import PointsScreen from './screens/PointsScreen';
import UserScreen from './screens/UserScreen';
import FriendsScreen from './screens/FriendsScreen';

// Importar MapScreen según plataforma
let MapScreen: React.ComponentType<any>;
if (Platform.OS === 'web') {
  MapScreen = require('./screens/MapScreen.web').default;
} else {
  MapScreen = require('./screens/MapScreen').default;
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MapTab') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'RewardsTab') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#64cd69',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={PointsScreen} 
        options={{ tabBarLabel: 'Inicio' }}
      />
      <Tab.Screen 
        name="MapTab" 
        component={MapScreen} 
        options={{ tabBarLabel: 'Mapa' }}
      />
      <Tab.Screen 
        name="RewardsTab" 
        component={FriendsScreen} 
        options={{ tabBarLabel: 'Amigos' }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={UserScreen} 
        options={{ tabBarLabel: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}

export default function MyNavigation() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };
    
    checkUser();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#64cd69" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Home" component={HomeTabs} />
        ) : (
          <>
            <Stack.Screen name="Welcome" component={Welcome} />
            <Stack.Screen name="SignIn" component={SignIn} />
            <Stack.Screen name="Register" component={Register} />
            <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

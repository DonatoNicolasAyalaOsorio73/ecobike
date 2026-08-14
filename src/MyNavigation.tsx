import * as React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

import Welcome from './auth/Welcome';
import SignIn from './auth/SignIn';
import Register from './auth/Register';
import FriendsScreen from './screens/FriendsScreen';
import MapScreen from './screens/MapScreen';
import PointsScreen from './screens/PointsScreen';
import UserScreen from './screens/UserScreen';
import PasswordResetScreen from './auth/PasswordResetScreen';
import CustomBottomTab from './components/shared/BottomTabs/CustomBottomTab';
import AdminPanel from './screens/AdminPanel'; 


const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Reads the admin role once: Firebase custom claim `admin` OR usuarios/{uid}.isAdmin.
function useIsAdmin() {
  const [isAdmin, setIsAdmin] = React.useState(false);
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = getAuth().currentUser;
        if (!user) return;
        const tokenResult = await user.getIdTokenResult();
        let admin = tokenResult.claims?.admin === true;
        if (!admin) {
          const snap = await getDoc(doc(getFirestore(), 'usuarios', user.uid));
          admin = snap.exists() && snap.data()?.isAdmin === true;
        }
        if (active) setIsAdmin(admin);
      } catch {
        // treat any failure as non-admin
      }
    })();
    return () => { active = false; };
  }, []);
  return isAdmin;
}

function MainTabs() {
  const isAdmin = useIsAdmin();
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
      {isAdmin && <Tab.Screen name="AdminPanel" component={AdminPanel} />}
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

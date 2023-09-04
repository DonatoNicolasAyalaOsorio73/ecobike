import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useIsFocused } from '@react-navigation/native';


export default function PointsScreen() {
  const authInstance = getAuth();
  const userUid = authInstance.currentUser.uid;
  const [accumulatedPoints, setAccumulatedPoints] = useState(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      const fetchAccumulatedPoints = async () => {
        const db = getFirestore();
        const userDocRef = doc(db, 'usuarios', userUid);
        try {
          const userDocSnapshot = await getDoc(userDocRef);
          if (userDocSnapshot.exists()) {
            const userData = userDocSnapshot.data();
            setAccumulatedPoints(userData.puntosAcumulados);
          } else {
            console.log('User document not found');
          }
        } catch (error) {
          console.log('Error fetching user data:', error);
        }
      };

      // Llama a la función de carga de datos solo cuando la pantalla está enfocada
      fetchAccumulatedPoints();
    }
  }, [isFocused]); // Agrega isFocused como dependencia

  return (
    <View style={styles.container}>
      {accumulatedPoints !== null ? (
        <Text style={styles.text}>Puntos acumulados: {accumulatedPoints}</Text>
      ) : (
        <Text>Loading data...</Text>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
  },
});

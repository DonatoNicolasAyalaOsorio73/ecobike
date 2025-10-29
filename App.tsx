import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import MyNavigation from './src/MyNavigation';

export default function App() {
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('App Error:', event.error);
      setError(event.error?.message || 'Error desconocido');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleError);
      return () => window.removeEventListener('error', handleError);
    }
  }, []);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error al cargar la aplicación</Text>
        <Text style={styles.errorMessage}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <MyNavigation />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff0000',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});
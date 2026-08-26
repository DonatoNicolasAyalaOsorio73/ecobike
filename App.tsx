import React from 'react';
import MyNavigation from './src/MyNavigation';
import './App.css';

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
      <div className="error-container">
        <h1 className="error-title">Error al cargar la aplicación</h1>
        <p className="error-message">{error}</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <MyNavigation />
    </div>
  );
}
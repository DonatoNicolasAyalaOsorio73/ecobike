import React from 'react';
import { firebaseReady } from './FireDataBase';
import MyNavigation from './MyNavigation';
import './App.css';

function SetupScreen() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh',
      background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
      padding: 24, fontFamily: 'sans-serif',
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🚲</div>
      <h1 style={{ color: '#2e7d32', margin: '0 0 8px' }}>EcoBike</h1>
      <h2 style={{ color: '#388e3c', margin: '0 0 24px', fontWeight: 400 }}>Configuracion requerida</h2>
      <div style={{
        background: 'white', borderRadius: 12, padding: 24,
        maxWidth: 480, width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}>
        <p style={{ color: '#333', marginBottom: 16 }}>
          Faltan las credenciales de Firebase. Crea un archivo <code>.env</code> en la raiz del proyecto con:
        </p>
        <pre style={{
          background: '#f5f5f5', borderRadius: 8, padding: 16,
          fontSize: 12, overflow: 'auto', color: '#333', margin: '0 0 16px',
        }}>{`VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
VITE_ADMIN_EMAILS=admin@tudominio.com`}</pre>
        <p style={{ color: '#666', fontSize: 13, margin: 0 }}>
          Encuentra estos valores en la consola de Firebase &rarr; Configuracion del proyecto &rarr; Tus apps.
          Despues de crear el archivo reinicia el servidor con <code>npm run dev</code>.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (!firebaseReady) return <SetupScreen />;

  return (
    <div className="app-container">
      <MyNavigation />
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import './navigation.css';

// Auth Screens
import Welcome from './auth/Welcome';
import SignIn from './auth/SignIn';
import Register from './auth/Register';
import PasswordResetScreen from './auth/PasswordResetScreen';

// Main Screens
import PointsScreen from './screens/PointsScreen';
import UserScreen from './screens/UserScreen';
import FriendsScreen from './screens/FriendsScreen';
import MapScreen from './screens/MapScreen';

// Componente para la navegación de pestañas
function BottomNavigation({ currentTab, setCurrentTab }: any) {
  const tabs = [
    { id: 'home', label: 'Inicio', icon: '🏠' },
    { id: 'map', label: 'Mapa', icon: '🗺️' },
    { id: 'friends', label: 'Amigos', icon: '👥' },
    { id: 'profile', label: 'Perfil', icon: '👤' },
  ];

  return (
    <div className="bottom-navigation">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-tab ${currentTab === tab.id ? 'active' : ''}`}
          onClick={() => setCurrentTab(tab.id)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

function HomeTabs() {
  const [currentTab, setCurrentTab] = useState('home');

  const renderTab = () => {
    switch(currentTab) {
      case 'home':
        return <PointsScreen />;
      case 'map':
        return <MapScreen />;
      case 'friends':
        return <FriendsScreen />;
      case 'profile':
        return <UserScreen />;
      default:
        return <PointsScreen />;
    }
  };

  return (
    <div className="home-container">
      <div className="tab-content">
        {renderTab()}
      </div>
      <BottomNavigation currentTab={currentTab} setCurrentTab={setCurrentTab} />
    </div>
  );
}

export default function MyNavigation() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        {user ? (
          <>
            <Route path="/" element={<HomeTabs />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Welcome />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/register" element={<Register />} />
            <Route path="/password-reset" element={<PasswordResetScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

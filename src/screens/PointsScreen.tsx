import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import './PointsScreen.css';

export default function PointsScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);
  const [rides, setRides] = useState(0);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (currentUser) {
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          
          if (userDoc.exists()) {
            setUser(userDoc.data());
            setPoints(userDoc.data().points || 0);
            setRides(userDoc.data().rides || 0);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  if (loading) {
    return <div className="points-screen-loading">Cargando...</div>;
  }

  return (
    <div className="points-screen">
      <div className="points-header">
        <h1>EcoBike</h1>
        <p>Bienvenido de vuelta</p>
      </div>

      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-value">{points}</div>
          <div className="stat-label">Puntos Ecológicos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{rides}</div>
          <div className="stat-label">Viajes Realizados</div>
        </div>
      </div>

      <div className="welcome-section">
        <h2>Sigue pedalando</h2>
        <p>Cada viaje en bicicleta cuenta para un planeta más limpio. Acumula puntos y desbloquea premios.</p>
      </div>

      <div className="quick-actions">
        <button className="action-btn primary">Registrar Nuevo Viaje</button>
        <button className="action-btn secondary">Ver Mi Historial</button>
      </div>
    </div>
  );
}

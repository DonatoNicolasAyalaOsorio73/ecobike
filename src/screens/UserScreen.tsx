import React, { useState, useEffect } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import './UserScreen.css';

export default function UserScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (currentUser) {
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          
          if (userDoc.exists()) {
            setUser({
              email: currentUser.email,
              ...userDoc.data(),
            });
          } else {
            setUser({ email: currentUser.email });
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return <div className="user-screen-loading">Cargando perfil...</div>;
  }

  return (
    <div className="user-screen">
      <div className="profile-header">
        <div className="profile-avatar">{user?.name?.charAt(0) || user?.email?.charAt(0) || '👤'}</div>
        <h1>{user?.name || 'Usuario'}</h1>
        <p>{user?.email}</p>
      </div>

      <div className="profile-stats">
        <div className="stat">
          <div className="stat-value">{user?.points || 0}</div>
          <div className="stat-label">Puntos</div>
        </div>
        <div className="stat">
          <div className="stat-value">{user?.rides || 0}</div>
          <div className="stat-label">Viajes</div>
        </div>
        <div className="stat">
          <div className="stat-value">{user?.kilometers || 0}</div>
          <div className="stat-label">KM</div>
        </div>
      </div>

      <div className="profile-sections">
        <div className="section">
          <h2>Información Personal</h2>
          <div className="info-row">
            <span className="label">Nombre:</span>
            <span className="value">{user?.name || 'No configurado'}</span>
          </div>
          <div className="info-row">
            <span className="label">Email:</span>
            <span className="value">{user?.email}</span>
          </div>
          <div className="info-row">
            <span className="label">Teléfono:</span>
            <span className="value">{user?.phone || 'No configurado'}</span>
          </div>
        </div>

        <div className="section">
          <h2>Logros</h2>
          <div className="achievements">
            <div className="achievement">🥇 Primer Viaje</div>
            <div className="achievement">🚲 10 Viajes</div>
            <div className="achievement">⭐ Eco Champion</div>
          </div>
        </div>
      </div>

      <div className="profile-actions">
        <button className="action-btn edit">Editar Perfil</button>
        <button className="action-btn settings">Configuración</button>
        <button className="action-btn logout" onClick={handleLogout}>Cerrar Sesión</button>
      </div>
    </div>
  );
}

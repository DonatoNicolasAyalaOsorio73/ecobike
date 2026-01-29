import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import './FriendsScreen.css';

export default function FriendsScreen() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFriends = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (currentUser) {
          const db = getFirestore();
          // Aquí puedes cargar amigos desde Firestore
          // Por ahora, mostramos datos de ejemplo
          setFriends([
            { id: 1, name: 'Carlos López', points: 1250, rides: 45 },
            { id: 2, name: 'María García', points: 980, rides: 38 },
            { id: 3, name: 'Juan Rodríguez', points: 1100, rides: 42 },
          ]);
        }
      } catch (error) {
        console.error('Error loading friends:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFriends();
  }, []);

  if (loading) {
    return <div className="friends-screen-loading">Cargando amigos...</div>;
  }

  return (
    <div className="friends-screen">
      <div className="friends-header">
        <h1>Mis Amigos</h1>
        <p>Compite y colabora con otros ciclistas</p>
      </div>

      {friends.length === 0 ? (
        <div className="no-friends">
          <p>Aún no tienes amigos en EcoBike</p>
          <button className="btn-primary">Invitar Amigos</button>
        </div>
      ) : (
        <div className="friends-list">
          {friends.map((friend) => (
            <div key={friend.id} className="friend-card">
              <div className="friend-avatar">{friend.name.charAt(0)}</div>
              <div className="friend-info">
                <h3>{friend.name}</h3>
                <div className="friend-stats">
                  <span>{friend.points} puntos</span>
                  <span>•</span>
                  <span>{friend.rides} viajes</span>
                </div>
              </div>
              <button className="friend-action">👁️</button>
            </div>
          ))}
        </div>
      )}

      <div className="friends-actions">
        <button className="action-btn primary">Invitar Amigos</button>
        <button className="action-btn secondary">Ver Leaderboard</button>
      </div>
    </div>
  );
}

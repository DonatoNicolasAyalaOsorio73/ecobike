import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import './FriendsScreen.css';

export default function FriendsScreen() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFriends = async () => {
      try {
        const currentUser = getAuth().currentUser;
        if (!currentUser) return;

        const db = getFirestore();
        const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(20));
        const snap = await getDocs(q);
        setFriends(
          snap.docs
            .filter(doc => doc.id !== currentUser.uid)
            .map(doc => ({ id: doc.id, ...doc.data() }))
        );
      } catch (error) {
        console.error('Error loading friends:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFriends();
  }, []);

  if (loading) {
    return <div className="friends-screen-loading">Cargando ciclistas...</div>;
  }

  return (
    <div className="friends-screen">
      <div className="friends-header">
        <h1>Leaderboard</h1>
        <p>Los ciclistas con más puntos</p>
      </div>

      {friends.length === 0 ? (
        <div className="no-friends">
          <p>Aún no hay otros ciclistas registrados</p>
        </div>
      ) : (
        <div className="friends-list">
          {friends.map((friend: any) => (
            <div key={friend.id} className="friend-card">
              <div className="friend-avatar">{friend.name?.charAt(0) || '?'}</div>
              <div className="friend-info">
                <h3>{friend.name || 'Ciclista'}</h3>
                <div className="friend-stats">
                  <span>{friend.points ?? 0} puntos</span>
                  <span>•</span>
                  <span>{friend.rides ?? 0} viajes</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

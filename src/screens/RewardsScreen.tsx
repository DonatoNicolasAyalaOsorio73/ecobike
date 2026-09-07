import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { callGenerateQRToken } from '../services/cloudFunctions';
import './RewardsScreen.css';

type Store = { id: string; name: string; description: string; pointsRequired: number; stock: number };
type ActiveQR = { token: string; numericCode: string; expiresAt: string; storeName: string };

export default function RewardsScreen() {
  const [stores, setStores] = useState<Store[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [activeQR, setActiveQR] = useState<ActiveQR | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const currentUser = getAuth().currentUser;
      if (!currentUser) return;
      const db = getFirestore();
      const [storesSnap, userSnap] = await Promise.all([
        getDocs(collection(db, 'tiendas')),
        getDoc(doc(db, 'users', currentUser.uid)),
      ]);
      setStores(storesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Store)));
      setUserPoints(userSnap.data()?.points ?? 0);
      setLoading(false);
    };
    loadData().catch(err => { console.error(err); setLoading(false); });
  }, []);

  const handleRedeem = async () => {
    if (!selectedStore) return;
    setGenerating(true);
    setError('');
    try {
      const result = await callGenerateQRToken(selectedStore.id);
      if (result.success) {
        setActiveQR({
          token: result.data.token,
          numericCode: result.data.numericCode,
          expiresAt: result.data.expiresAt,
          storeName: selectedStore.name,
        });
        setSelectedStore(null);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Error al generar el codigo. Intenta de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

  const expiresIn = (expiresAt: string) => {
    const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (loading) return <div className="rewards-loading">Cargando recompensas...</div>;

  return (
    <div className="rewards-screen">
      <div className="rewards-header">
        <h1>Recompensas</h1>
        <div className="points-badge">{userPoints} pts disponibles</div>
      </div>

      {/* Active QR display */}
      {activeQR && (
        <div className="qr-modal">
          <h2>Codigo para {activeQR.storeName}</h2>
          <div className="qr-wrapper">
            <QRCode value={activeQR.token} size={200} />
          </div>
          <div className="numeric-code">{activeQR.numericCode}</div>
          <p className="qr-hint">Muestra este codigo al partner. Valido por: {expiresIn(activeQR.expiresAt)}</p>
          <button className="btn-close" onClick={() => setActiveQR(null)}>Cerrar</button>
        </div>
      )}

      {/* Store selection modal */}
      {selectedStore && !activeQR && (
        <div className="qr-modal">
          <h2>Canjear en {selectedStore.name}</h2>
          <p>{selectedStore.description}</p>
          <p className="cost-line">Costo: <strong>{selectedStore.pointsRequired} puntos</strong></p>
          <p>Tu balance: <strong>{userPoints} puntos</strong></p>
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button className="action-btn primary" onClick={handleRedeem} disabled={generating}>
              {generating ? 'Generando...' : 'Generar Codigo QR'}
            </button>
            <button className="action-btn secondary" onClick={() => setSelectedStore(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Stores list */}
      {stores.length === 0 ? (
        <div className="no-rewards">
          <p>No hay recompensas disponibles aun.</p>
          <p>Sigue pedaleando para desbloquearlas.</p>
        </div>
      ) : (
        <div className="stores-grid">
          {stores.map(store => {
            const canRedeem = userPoints >= store.pointsRequired && store.stock > 0;
            return (
              <div key={store.id} className={`store-card ${canRedeem ? 'redeemable' : 'locked'}`}>
                <div className="store-name">{store.name}</div>
                <div className="store-description">{store.description}</div>
                <div className="store-cost">{store.pointsRequired} pts</div>
                {store.stock === 0 && <div className="store-sold-out">Agotado</div>}
                <button
                  className={`redeem-btn ${canRedeem ? '' : 'disabled'}`}
                  disabled={!canRedeem}
                  onClick={() => canRedeem && setSelectedStore(store)}
                >
                  {canRedeem ? 'Canjear' : `Faltan ${store.pointsRequired - userPoints} pts`}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

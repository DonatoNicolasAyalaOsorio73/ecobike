import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { haversineKm } from '../utils/routeTracking';
import './MapScreen.css';

type Store = { id: string; name: string; description: string; pointsRequired: number; distanceKm?: number };

export default function MapScreen() {
  const [location, setLocation] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setLocation(loc);
        setLoading(false);
        // Load stores and compute distance once we have location
        getDocs(collection(getFirestore(), 'tiendas'))
          .then(snap => {
            const list = snap.docs.map(d => {
              const data = d.data() as Omit<Store, 'id' | 'distanceKm'>;
              return {
                id: d.id,
                ...data,
                distanceKm: haversineKm(loc.lat, loc.lon, (data as any).lat ?? 0, (data as any).lon ?? 0),
              } as Store;
            });
            // Sort by distance, but skip stores without coords (distanceKm ~= 6371)
            list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
            setStores(list);
          })
          .catch(() => {});
      },
      () => { setLocationError(true); setLoading(false); },
    );
    // Load stores even without location
    getDocs(collection(getFirestore(), 'tiendas'))
      .then(snap => {
        if (!location) {
          setStores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Store)));
        }
      })
      .catch(() => {});
  }, []);

  if (loading) return <div className="map-screen-loading">Obteniendo ubicacion...</div>;

  return (
    <div className="map-screen">
      <div className="map-header">
        <h1>Mapa y Tiendas</h1>
      </div>

      {locationError ? (
        <div className="map-error">
          <p>No se pudo obtener tu ubicacion.</p>
          <p>Verifica que hayas otorgado permisos de ubicacion al navegador.</p>
        </div>
      ) : location && (
        <div className="location-card">
          <div className="location-row">
            <span className="loc-label">Latitud</span>
            <span>{location.lat.toFixed(5)}</span>
          </div>
          <div className="location-row">
            <span className="loc-label">Longitud</span>
            <span>{location.lon.toFixed(5)}</span>
          </div>
          <div className="location-row">
            <span className="loc-label">Precision</span>
            <span>±{Math.round(location.accuracy)}m</span>
          </div>
        </div>
      )}

      <div className="stores-section">
        <h2>Tiendas Partner</h2>
        {stores.length === 0 ? (
          <p className="no-stores">No hay tiendas registradas aun.</p>
        ) : (
          stores.map(store => (
            <div key={store.id} className="store-row">
              <div className="store-row-icon">🏪</div>
              <div className="store-row-info">
                <strong>{store.name}</strong>
                <span>{store.description}</span>
              </div>
              <div className="store-row-meta">
                <span className="store-pts">{store.pointsRequired} pts</span>
                {store.distanceKm !== undefined && store.distanceKm < 100 && (
                  <span className="store-dist">{store.distanceKm < 1
                    ? `${Math.round(store.distanceKm * 1000)}m`
                    : `${store.distanceKm.toFixed(1)}km`}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

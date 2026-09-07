import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { haversineKm, formatDuration, type Checkpoint } from '../utils/routeTracking';
import { callFinishRoute } from '../services/cloudFunctions';
import './PointsScreen.css';

type RouteResult = { pointsEarned: number; newBalance: number; firstRoute: boolean };

export default function PointsScreen() {
  const [user, setUser] = useState<any>(null);
  const [points, setPoints] = useState(0);
  const [rides, setRides] = useState(0);
  const [km, setKm] = useState(0);
  const [loading, setLoading] = useState(true);

  // Route tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [gpsError, setGpsError] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);

  // Refs to avoid stale closure in watchPosition callbacks
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const checkpointsRef = useRef<Checkpoint[]>([]);
  const lastPosRef = useRef<{ lat: number; lon: number } | null>(null);
  const distanceRef = useRef(0);
  const startedAtRef = useRef<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = getAuth().currentUser;
      if (!currentUser) return;
      const snap = await getDoc(doc(getFirestore(), 'users', currentUser.uid));
      if (snap.exists()) {
        const d = snap.data();
        setUser(d);
        setPoints(d.points ?? 0);
        setRides(d.rides ?? 0);
        setKm(d.kilometers ?? 0);
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const handlePosition = useCallback((pos: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = pos.coords;
    const checkpoint: Checkpoint = {
      latitude, longitude,
      timestamp: new Date().toISOString(),
      accuracy,
    };
    checkpointsRef.current.push(checkpoint);

    if (lastPosRef.current) {
      const delta = haversineKm(lastPosRef.current.lat, lastPosRef.current.lon, latitude, longitude);
      // Ignore jumps > 500m (GPS error)
      if (delta < 0.5) {
        distanceRef.current += delta;
        setDistanceKm(distanceRef.current);
      }
    }
    lastPosRef.current = { lat: latitude, lon: longitude };
  }, []);

  const startRoute = () => {
    setGpsError('');
    setRouteResult(null);
    if (!navigator.geolocation) {
      setGpsError('Tu navegador no soporta GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        checkpointsRef.current = [];
        distanceRef.current = 0;
        lastPosRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        startedAtRef.current = new Date().toISOString();
        setDistanceKm(0);
        setElapsedSeconds(0);
        setIsTracking(true);

        watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, () => {}, {
          enableHighAccuracy: true,
          maximumAge: 0,
        });

        intervalRef.current = window.setInterval(() => {
          setElapsedSeconds(s => s + 1);
        }, 1000);
      },
      () => setGpsError('No se pudo obtener tu ubicacion. Verifica permisos GPS.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const stopRoute = async () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (intervalRef.current !== null) clearInterval(intervalRef.current);
    watchIdRef.current = null;
    intervalRef.current = null;
    setIsTracking(false);
    setFinishing(true);

    const endedAt = new Date().toISOString();
    const totalDistanceKm = parseFloat(distanceRef.current.toFixed(3));

    if (totalDistanceKm < 0.01 || !startedAtRef.current) {
      setFinishing(false);
      setGpsError('Ruta muy corta para registrar puntos.');
      return;
    }

    try {
      const result = await callFinishRoute(checkpointsRef.current, {
        startedAt: startedAtRef.current,
        endedAt,
        totalDistanceKm,
      });
      if (result.success) {
        setPoints(result.data.newBalance);
        setRides(r => r + 1);
        setKm(k => parseFloat((k + totalDistanceKm).toFixed(1)));
        setRouteResult({
          pointsEarned: result.data.pointsEarned,
          newBalance: result.data.newBalance,
          firstRoute: result.data.firstRoute,
        });
      }
    } catch (err) {
      console.error('Error finalizando ruta:', err);
      setGpsError('Error al registrar la ruta. Tus puntos se acreditaran pronto.');
    } finally {
      setFinishing(false);
    }
  };

  if (loading) return <div className="points-screen-loading">Cargando...</div>;

  return (
    <div className="points-screen">
      <div className="points-header">
        <h1>EcoBike</h1>
        <p>Bienvenido, {user?.name || 'ciclista'}</p>
      </div>

      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-value">{points}</div>
          <div className="stat-label">Puntos Ecologicos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{rides}</div>
          <div className="stat-label">Viajes Realizados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{km.toFixed(1)}</div>
          <div className="stat-label">Kilometros Totales</div>
        </div>
        {user?.streak > 0 && (
          <div className="stat-card">
            <div className="stat-value">{user.streak >= 7 ? '🔥' : ''}{user.streak}</div>
            <div className="stat-label">Dias de Racha</div>
          </div>
        )}
      </div>

      {/* Route result modal */}
      {routeResult && (
        <div className="route-result">
          {routeResult.firstRoute && <div className="bonus-badge">Bono de Bienvenida x2!</div>}
          <h2>Ruta Completada</h2>
          <p className="result-points">+{routeResult.pointsEarned} puntos</p>
          <p>Balance total: <strong>{routeResult.newBalance} pts</strong></p>
          <button className="action-btn secondary" onClick={() => setRouteResult(null)}>Cerrar</button>
        </div>
      )}

      {/* Route tracking panel */}
      <div className="route-panel">
        {isTracking ? (
          <>
            <div className="live-stats">
              <div className="live-stat">
                <span className="live-value">{distanceKm.toFixed(2)}</span>
                <span className="live-label">km</span>
              </div>
              <div className="live-stat">
                <span className="live-value">{formatDuration(elapsedSeconds)}</span>
                <span className="live-label">tiempo</span>
              </div>
              <div className="live-stat">
                <span className="live-value">{Math.floor(distanceKm)}</span>
                <span className="live-label">pts est.</span>
              </div>
            </div>
            <div className="gps-indicator">GPS activo</div>
            <button className="action-btn stop-btn" onClick={stopRoute} disabled={finishing}>
              {finishing ? 'Registrando...' : 'Terminar Ruta'}
            </button>
          </>
        ) : (
          <>
            {gpsError && <p className="gps-error">{gpsError}</p>}
            <p className="route-hint">Cada km recorrido = 1 punto ecologico</p>
            <button className="action-btn primary" onClick={startRoute}>
              Iniciar Ruta
            </button>
          </>
        )}
      </div>
    </div>
  );
}

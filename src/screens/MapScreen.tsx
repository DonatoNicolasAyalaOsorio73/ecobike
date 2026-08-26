import React, { useState, useEffect } from 'react';
import './MapScreen.css';

export default function MapScreen() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLoading(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setLocationError(true);
        setLoading(false);
      }
    );
  }, []);

  if (loading) {
    return <div className="map-screen-loading">Obteniendo ubicación...</div>;
  }

  return (
    <div className="map-screen">
      <div className="map-header">
        <h1>Mi Ubicación</h1>
      </div>

      {locationError ? (
        <div className="map-error">
          <p>No se pudo obtener tu ubicación.</p>
          <p>Verifica que hayas otorgado permisos de ubicación al navegador.</p>
        </div>
      ) : (
        <div className="map-info">
          <p>Latitud: {location?.latitude?.toFixed(4)}</p>
          <p>Longitud: {location?.longitude?.toFixed(4)}</p>
          <p>Precisión: ±{Math.round(location?.accuracy ?? 0)}m</p>
        </div>
      )}

      <div className="map-message">
        <p>Para ver el mapa interactivo, accede desde un dispositivo móvil o espera a que se cargue completamente.</p>
        <p>Esta es una versión web simplificada de EcoBike. Los mapas interactivos se mostrarán en una versión mejorada.</p>
      </div>

      <div className="nearby-stations">
        <h2>Estaciones Cercanas</h2>
        <div className="station-card">
          <div className="station-icon">🚲</div>
          <div className="station-info">
            <h3>Estación Central</h3>
            <p>A ~500m de tu ubicación</p>
            <p className="station-status">✓ Disponible</p>
          </div>
        </div>
        <div className="station-card">
          <div className="station-icon">🚲</div>
          <div className="station-info">
            <h3>Estación Norte</h3>
            <p>A ~1.2km de tu ubicación</p>
            <p className="station-status">✓ Disponible</p>
          </div>
        </div>
      </div>
    </div>
  );
}

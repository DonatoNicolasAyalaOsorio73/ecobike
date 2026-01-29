import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Welcome.css';

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="welcome-screen">
      <div className="welcome-container">
        <div className="welcome-logo">🚲</div>
        <h1>EcoBike</h1>
        <p className="welcome-tagline">Pedalea hacia un futuro sostenible</p>

        <div className="welcome-features">
          <div className="feature">
            <span className="feature-icon">🌍</span>
            <p>Reduce tu huella de carbono</p>
          </div>
          <div className="feature">
            <span className="feature-icon">⭐</span>
            <p>Acumula puntos y premios</p>
          </div>
          <div className="feature">
            <span className="feature-icon">👥</span>
            <p>Conecta con otros ciclistas</p>
          </div>
        </div>

        <div className="welcome-actions">
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/signin')}
          >
            Iniciar Sesión
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate('/register')}
          >
            Crear Cuenta
          </button>
        </div>

        <p className="welcome-footer">Únete a miles de ciclistas eco-conscientes</p>
      </div>
    </div>
  );
}

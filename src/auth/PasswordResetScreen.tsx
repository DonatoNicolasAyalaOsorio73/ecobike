import React, { useState } from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import './PasswordResetScreen.css';

export default function PasswordResetScreen() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor ingresa tu email');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      setMessage('Email de recuperación enviado. Revisa tu correo.');
      setTimeout(() => navigate('/signin'), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al enviar email de recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-reset-screen">
      <div className="password-reset-container">
        <div className="password-reset-logo">🔐</div>
        <h1>Recuperar Contraseña</h1>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <form 
          className="password-reset-form" 
          onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }}
        >
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            className="btn-reset"
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Enviar Email de Recuperación'}
          </button>
        </form>

        <div className="password-reset-footer">
          <p>¿Recordaste tu contraseña? <Link to="/signin">Vuelve a iniciar sesión</Link></p>
        </div>
      </div>
    </div>
  );
}

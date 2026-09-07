import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { firebaseErrorToSpanish } from '../services/authService';
import './Register.css';

function getAgeGroup(birthDate: string): 'adult' | 'minor' | null {
  if (!birthDate) return null;
  const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000));
  if (age < 13) return null; // Under 13 not allowed
  return age >= 18 ? 'adult' : 'minor';
}

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Por favor completa todos los campos');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres');
      return;
    }
    if (birthDate) {
      const ageGroup = getAgeGroup(birthDate);
      if (ageGroup === null) {
        setError('Debes tener al menos 13 anos para registrarte.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const ageGroup = birthDate ? getAgeGroup(birthDate) : 'adult';
      const db = getFirestore();
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name,
        email,
        city: city || '',
        birthDate: birthDate || '',
        ageGroup: ageGroup ?? 'adult',
        createdAt: new Date(),
        points: 0,
        rides: 0,
        kilometers: 0,
        streak: 0,
        badges: [],
      });
      navigate('/');
    } catch (err: any) {
      setError(firebaseErrorToSpanish(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-screen">
      <div className="register-container">
        <div className="register-logo">🚲</div>
        <h1>Crear Cuenta</h1>

        {error && <div className="error-message">{error}</div>}

        <form className="register-form" onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
          <div className="form-group">
            <label>Nombre Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              disabled={loading}
            />
          </div>

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

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Confirmar Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Ciudad</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Tu ciudad"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Fecha de Nacimiento</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn-register"
            disabled={loading}
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="register-footer">
          <p>¿Ya tienes cuenta? <Link to="/signin">Inicia sesión aquí</Link></p>
        </div>
      </div>
    </div>
  );
}

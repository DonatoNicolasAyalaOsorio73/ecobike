import React, { useState, useEffect } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import './UserScreen.css';

const BADGE_LABELS: Record<string, string> = {
  'first-route': 'Primera Ruta',
  'welcome-bonus': 'Bono x2',
  '10-routes': '10 Viajes',
  '100km': '100 km',
};

export default function UserScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const snap = await getDoc(doc(getFirestore(), 'users', currentUser.uid));
      const data = snap.exists()
        ? { email: currentUser.email, ...snap.data() }
        : { email: currentUser.email };
      setUser(data);
      setEditName(data.name ?? '');
      setEditCity(data.city ?? '');
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    const currentUser = getAuth().currentUser;
    if (!currentUser) return;
    try {
      await updateDoc(doc(getFirestore(), 'users', currentUser.uid), {
        name: editName,
        city: editCity,
      });
      setUser((u: any) => ({ ...u, name: editName, city: editCity }));
      setEditing(false);
      setSaveMsg('Perfil actualizado.');
    } catch (e) {
      setSaveMsg('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut(getAuth());
    navigate('/', { replace: true });
  };

  if (loading) return <div className="user-screen-loading">Cargando perfil...</div>;

  const badges: string[] = user?.badges ?? [];

  return (
    <div className="user-screen">
      <div className="profile-header">
        <div className="profile-avatar">{user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}</div>
        {editing ? (
          <div className="edit-form">
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Nombre"
              className="edit-input"
            />
            <input
              value={editCity}
              onChange={e => setEditCity(e.target.value)}
              placeholder="Ciudad"
              className="edit-input"
            />
            {saveMsg && <p className="save-msg">{saveMsg}</p>}
            <div className="edit-actions">
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button className="btn-cancel" onClick={() => { setEditing(false); setSaveMsg(''); }}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1>{user?.name || 'Sin nombre'}</h1>
            <p className="user-email">{user?.email}</p>
            {user?.city && <p className="user-city">{user.city}</p>}
          </>
        )}
      </div>

      {saveMsg && !editing && <p className="save-msg center">{saveMsg}</p>}

      <div className="profile-stats">
        <div className="stat">
          <div className="stat-value">{user?.points ?? 0}</div>
          <div className="stat-label">Puntos</div>
        </div>
        <div className="stat">
          <div className="stat-value">{user?.rides ?? 0}</div>
          <div className="stat-label">Viajes</div>
        </div>
        <div className="stat">
          <div className="stat-value">{(user?.kilometers ?? 0).toFixed(1)}</div>
          <div className="stat-label">KM</div>
        </div>
        {(user?.streak ?? 0) > 0 && (
          <div className="stat">
            <div className="stat-value">{user.streak >= 7 ? '🔥' : ''}{user.streak}</div>
            <div className="stat-label">Racha</div>
          </div>
        )}
      </div>

      {badges.length > 0 && (
        <div className="profile-section">
          <h2>Logros</h2>
          <div className="badges">
            {badges.map(b => (
              <span key={b} className="badge">{BADGE_LABELS[b] ?? b}</span>
            ))}
          </div>
        </div>
      )}

      <div className="profile-info section">
        <h2>Informacion Personal</h2>
        <div className="info-row"><span className="label">Email:</span><span>{user?.email}</span></div>
        <div className="info-row"><span className="label">Ciudad:</span><span>{user?.city || 'No configurada'}</span></div>
        <div className="info-row"><span className="label">Registrado:</span><span>{user?.createdAt?.toDate?.()?.toLocaleDateString?.() ?? '—'}</span></div>
      </div>

      <div className="profile-actions">
        {!editing && (
          <button className="action-btn edit" onClick={() => setEditing(true)}>Editar Perfil</button>
        )}
        <button className="action-btn logout" onClick={handleLogout}>Cerrar Sesion</button>
      </div>
    </div>
  );
}

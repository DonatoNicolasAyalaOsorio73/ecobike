import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

// ponytail: email allowlist — replace with Custom Claims isAdmin check when admin roles are defined
const ADMIN_EMAILS = (import.meta as any).env.VITE_ADMIN_EMAILS?.split(',').map((e: string) => e.trim()) ?? [];

type Store = { id: string; name: string; logo: string; pointsRequired: number };

export default function AdminPanel() {
  const currentUser = getAuth().currentUser;
  const [stores, setStores] = useState<Store[]>([]);
  const [selected, setSelected] = useState<Store | null>(null);
  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [points, setPoints] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(currentUser.email)) return;
    const db = getFirestore();
    getDocs(collection(db, 'tiendas'))
      .then(snap => setStores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Store))))
      .catch(err => console.error('Error cargando tiendas:', err));
  }, [currentUser?.uid]);

  if (!currentUser) return <p style={{ padding: 16 }}>Acceso denegado. Debes iniciar sesion.</p>;
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(currentUser.email))
    return <p style={{ padding: 16 }}>Acceso denegado. No tienes permisos de administrador.</p>;

  const handleSelect = (store: Store) => {
    setSelected(store);
    setName(store.name);
    setLogo(store.logo);
    setPoints(String(store.pointsRequired));
    setMsg('');
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(getFirestore(), 'tiendas', selected.id), {
        name: name || selected.name,
        logo: logo || selected.logo,
        pointsRequired: points ? Number(points) : selected.pointsRequired,
      });
      setStores(prev => prev.map(s => s.id === selected.id
        ? { ...s, name, logo, pointsRequired: Number(points) }
        : s
      ));
      setMsg('Tienda actualizada.');
      setSelected(null);
    } catch (err) {
      setMsg('Error al guardar.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: '0 auto' }}>
      <h1>Panel de Administracion</h1>
      <h2>Tiendas</h2>
      {stores.length === 0 && <p>No hay tiendas registradas.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {stores.map(s => (
          <li key={s.id}
            onClick={() => handleSelect(s)}
            style={{
              padding: '10px 14px', marginBottom: 8, cursor: 'pointer',
              border: '1px solid #ccc', borderRadius: 8,
              background: selected?.id === s.id ? '#e8f5e9' : '#fff',
            }}>
            <strong>{s.name}</strong> — {s.pointsRequired} pts requeridos
          </li>
        ))}
      </ul>

      {selected && (
        <div style={{ marginTop: 16, padding: 16, border: '1px solid #4caf50', borderRadius: 8 }}>
          <h3>Editando: {selected.name}</h3>
          <label>Nombre<br />
            <input value={name} onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: 8, marginBottom: 10, boxSizing: 'border-box' }} />
          </label>
          <label>Logo URL<br />
            <input value={logo} onChange={e => setLogo(e.target.value)}
              style={{ width: '100%', padding: 8, marginBottom: 10, boxSizing: 'border-box' }} />
          </label>
          <label>Puntos requeridos<br />
            <input type="number" value={points} onChange={e => setPoints(e.target.value)}
              style={{ width: '100%', padding: 8, marginBottom: 10, boxSizing: 'border-box' }} />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '8px 16px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => setSelected(null)}
              style={{ padding: '8px 16px', background: '#eee', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
          {msg && <p style={{ marginTop: 8, color: msg.startsWith('Error') ? 'red' : 'green' }}>{msg}</p>}
        </div>
      )}
    </div>
  );
}

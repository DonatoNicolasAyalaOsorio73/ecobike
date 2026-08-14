// Vercel serverless function — admin store management via Firebase Admin SDK.
// Runs server-side only. The service account key lives in the
// FIREBASE_SERVICE_ACCOUNT_KEY env var (Vercel dashboard), never in the bundle.
//
// GET  /api/stores        → list all stores        (admin only)
// PUT  /api/stores        → update one store        (admin only)
//   body: { id, name?, logo?, pointsRequired?, description? }
//
// Auth: caller sends their Firebase ID token as `Authorization: Bearer <token>`.
// The token is verified, then the user must be an admin — either a custom claim
// `admin: true` or a Firestore doc `usuarios/{uid}.isAdmin === true`.

const admin = require('firebase-admin');

function getApp() {
  if (admin.apps.length) return admin.app();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY no está configurada en el servidor.');
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY no es un JSON válido.');
  }
  return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

async function requireAdmin(app, req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return { status: 401, error: 'Falta el token de autenticación.' };

  let decoded;
  try {
    decoded = await admin.auth(app).verifyIdToken(token);
  } catch {
    return { status: 401, error: 'Token inválido o expirado.' };
  }

  let isAdmin = decoded.admin === true;
  if (!isAdmin) {
    const snap = await admin.firestore(app).collection('usuarios').doc(decoded.uid).get();
    isAdmin = snap.exists && snap.data().isAdmin === true;
  }
  if (!isAdmin) return { status: 403, error: 'No tienes permisos de administrador.' };

  return { uid: decoded.uid };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  let app;
  try {
    app = getApp();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  const gate = await requireAdmin(app, req);
  if (gate.error) return res.status(gate.status).json({ error: gate.error });

  const db = admin.firestore(app);

  try {
    if (req.method === 'GET') {
      const snap = await db.collection('tiendas').get();
      const stores = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return res.status(200).json({ stores });
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const { id, name, logo, pointsRequired, description } = body;
      if (!id) return res.status(400).json({ error: 'Falta el id de la tienda.' });

      const update = {};
      if (typeof name === 'string' && name.trim()) update.name = name.trim();
      if (typeof logo === 'string') update.logo = logo.trim();
      if (typeof description === 'string') update.description = description.trim();
      if (pointsRequired !== undefined && pointsRequired !== '') {
        const n = Number(pointsRequired);
        if (!Number.isFinite(n) || n < 0) {
          return res.status(400).json({ error: 'pointsRequired debe ser un número ≥ 0.' });
        }
        update.pointsRequired = n;
      }
      if (Object.keys(update).length === 0) {
        return res.status(400).json({ error: 'No hay campos válidos para actualizar.' });
      }

      const ref = db.collection('tiendas').doc(String(id));
      const exists = await ref.get();
      if (!exists.exists) return res.status(404).json({ error: 'La tienda no existe.' });

      await ref.update(update);
      const fresh = await ref.get();
      return res.status(200).json({ store: { id: fresh.id, ...fresh.data() } });
    }

    res.setHeader('Allow', 'GET,PUT,OPTIONS');
    return res.status(405).json({ error: 'Método no permitido.' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

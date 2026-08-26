import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getMessaging } from 'firebase-admin/messaging';

initializeApp();

// Story 3-2: finishRoute — calcula y acredita puntos, detecta primera ruta
export const finishRoute = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Debes iniciar sesion');

  const { checkpoints, metadata } = request.data as {
    checkpoints: Array<{ latitude: number; longitude: number; timestamp: string; accuracy: number }>;
    metadata: { startedAt: string; endedAt: string; totalDistanceKm: number };
  };

  if (!metadata?.totalDistanceKm || !metadata?.startedAt || !metadata?.endedAt) {
    throw new HttpsError('invalid-argument', 'Metadatos de ruta incompletos');
  }

  const db = getFirestore();

  const existingRoutes = await db.collection('routes').where('userId', '==', uid).limit(1).get();
  const isFirstRoute = existingRoutes.empty;

  const basePoints = Math.floor(metadata.totalDistanceKm);
  const pointsEarned = isFirstRoute ? basePoints * 2 : basePoints;

  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  const userData = userSnap.data() ?? {};
  const newBalance = (userData.points ?? 0) + pointsEarned;

  const batch = db.batch();

  batch.set(db.collection('routes').doc(), {
    userId: uid,
    startedAt: metadata.startedAt,
    endedAt: metadata.endedAt,
    totalDistanceKm: metadata.totalDistanceKm,
    checkpointCount: checkpoints.length,
    pointsEarned,
    createdAt: new Date(),
  });

  const badgeUpdates: string[] = isFirstRoute
    ? [...(userData.badges ?? []), 'first-route', 'welcome-bonus']
    : (userData.badges ?? []);

  batch.set(userRef, {
    points: newBalance,
    totalRoutes: (userData.totalRoutes ?? 0) + 1,
    badges: badgeUpdates,
    lastRouteAt: new Date(),
  }, { merge: true });

  await batch.commit();

  return { success: true, data: { newBalance, pointsEarned, distanceKm: metadata.totalDistanceKm, firstRoute: isFirstRoute } };
});

// Story 4-2: generateQRToken — genera token y codigo numerico de respaldo
export const generateQRToken = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Debes iniciar sesion');

  const { rewardId } = request.data as { rewardId: string };
  if (!rewardId) throw new HttpsError('invalid-argument', 'rewardId requerido');

  const db = getFirestore();
  const rewardSnap = await db.doc(`tiendas/${rewardId}`).get();
  if (!rewardSnap.exists) throw new HttpsError('not-found', 'Recompensa no encontrada');

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const token = Array.from({ length: 25 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const numericCode = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join('');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await db.collection('canjes').add({
    userId: uid,
    storeId: rewardId,
    storeName: rewardSnap.data()?.name,
    code: token,
    numericCode,
    expiresAt,
    validated: false,
    timestamp: new Date(),
  });

  return { success: true, data: { token, numericCode, expiresAt } };
});

// Story 5-2: validateRedemption — valida canje QR por el partner
export const validateRedemption = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Debes iniciar sesion');

  const { token, partnerId } = request.data as { token: string; partnerId: string };
  if (!token) throw new HttpsError('invalid-argument', 'token requerido');

  const db = getFirestore();

  // Accept both QR token and 6-digit numeric code
  let q = await db.collection('canjes').where('code', '==', token).where('validated', '==', false).limit(1).get();
  if (q.empty) {
    q = await db.collection('canjes').where('numericCode', '==', token).where('validated', '==', false).limit(1).get();
  }
  if (q.empty) throw new HttpsError('not-found', 'Codigo no valido o ya fue usado');

  const canjeDoc = q.docs[0];
  await canjeDoc.ref.update({ validated: true, validatedBy: partnerId, validatedAt: new Date() });

  const data = canjeDoc.data();
  return { success: true, data: { rewardName: data.storeName, redeemedAt: new Date().toISOString() } };
});

// Story 6-3: Notificacion de progreso hacia recompensa
// Fires when user's points balance changes
export const onPointsUpdated = onDocumentUpdated('users/{uid}', async (event) => {
  const after = event.data?.after.data();
  const before = event.data?.before.data();
  if (!after || !before) return;

  const uid = event.params.uid;
  const newPoints: number = after.points ?? 0;
  const oldPoints: number = before.points ?? 0;
  if (newPoints <= oldPoints) return; // points didn't increase

  const pushToken: string | undefined = after.pushToken;
  if (!pushToken) return;

  const db = getFirestore();
  const tiendas = await db.collection('tiendas').get();

  for (const tienda of tiendas.docs) {
    const required: number = tienda.data().pointsRequired ?? 0;
    const threshold = Math.floor(required * 0.8);
    // Notify if user just crossed the 80% threshold
    if (oldPoints < threshold && newPoints >= threshold && newPoints < required) {
      await getMessaging().send({
        token: pushToken,
        notification: {
          title: 'Ya casi llegas',
          body: `Te faltan solo ${required - newPoints} puntos para canjear en ${tienda.data().name}`,
        },
        data: { type: 'progress', storeId: tienda.id },
      }).catch(() => {});
      break; // one notification per points update
    }
  }
});

// Story 6-4: Recordatorio de racha a las 7pm (Colombia UTC-5)
// Runs at 7pm Bogota time = midnight UTC
export const streakReminder = onSchedule('0 0 * * *', async () => {
  const db = getFirestore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find users with active streak who haven't routed today
  const usersSnap = await db.collection('users')
    .where('streak', '>=', 1)
    .get();

  const messaging = getMessaging();
  const sends: Promise<unknown>[] = [];

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    const lastRouteAt: Date | null = userData.lastRouteAt?.toDate?.() ?? null;
    const pushToken: string | undefined = userData.pushToken;

    if (!pushToken) continue;
    if (lastRouteAt && lastRouteAt >= today) continue; // already rode today

    sends.push(
      messaging.send({
        token: pushToken,
        notification: {
          title: 'Tu racha esta en riesgo',
          body: `Llevas ${userData.streak} dias consecutivos. Sal a pedalear hoy para mantenerla.`,
        },
        data: { type: 'streak_reminder' },
      }).catch(() => {}),
    );
  }

  await Promise.all(sends);
});

// Story 6-5: Notificacion cuando el usuario gana un nuevo badge
export const onBadgeEarned = onDocumentUpdated('users/{uid}', async (event) => {
  const after = event.data?.after.data();
  const before = event.data?.before.data();
  if (!after || !before) return;

  const pushToken: string | undefined = after.pushToken;
  if (!pushToken) return;

  const newBadges: string[] = after.badges ?? [];
  const oldBadges: string[] = before.badges ?? [];
  const earned = newBadges.filter((b: string) => !oldBadges.includes(b));

  if (earned.length === 0) return;

  const BADGE_NAMES: Record<string, string> = {
    'first-route': 'Primera Ruta',
    'welcome-bonus': 'Bienvenida x2',
    '10-routes': '10 Viajes',
    '100km': '100 km',
  };

  const badgeName = BADGE_NAMES[earned[0]] ?? earned[0];
  await getMessaging().send({
    token: pushToken,
    notification: {
      title: 'Nuevo logro desbloqueado',
      body: `Ganaste el badge "${badgeName}". Sigue pedaleando.`,
    },
    data: { type: 'badge', badge: earned[0] },
  }).catch(() => {});
});

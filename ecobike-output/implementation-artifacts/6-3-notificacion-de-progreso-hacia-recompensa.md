# Story 6-3: Notificacion de progreso hacia recompensa

**Status:** review  
**Epic:** 6 — Gamificacion y Notificaciones Contextuales

## Descripcion
Como ciclista, quiero recibir una notificacion push cuando alcance el 80% de los puntos necesarios para una recompensa, para motivarme a completarla.

## Implementacion

### Cloud Function: `onPointsUpdated` en `functions/src/index.ts`
- Trigger `onDocumentUpdated('users/{uid}')` — fires cuando cambian los puntos
- Compara `oldPoints < threshold && newPoints >= threshold` para el 80% de cada tienda
- Envia push via FCM (`getMessaging().send()`) al `pushToken` del usuario

### Client: `src/services/pushNotifications.ts`
- `registerPushToken(uid)` — solicita permisos, obtiene Expo push token, guarda en `users/{uid}.pushToken`
- Llamado en `app/_layout.tsx` en el `onAuthStateChanged` handler

### Nota
Push delivery activa requiere EAS Build con push credentials configurados. El codigo esta completo.

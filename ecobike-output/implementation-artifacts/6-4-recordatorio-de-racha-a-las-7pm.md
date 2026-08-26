# Story 6-4: Recordatorio de racha a las 7pm

**Status:** review  
**Epic:** 6 — Gamificacion y Notificaciones Contextuales

## Descripcion
Como ciclista, quiero recibir un recordatorio a las 7pm si no he registrado una ruta ese dia y tengo una racha activa, para no perderla.

## Implementacion

### Cloud Function: `streakReminder` en `functions/src/index.ts`
- Trigger `onSchedule('0 0 * * *')` — medianoche UTC = 7pm Colombia (UTC-5)
- Consulta todos los users con `streak >= 1`
- Filtra los que no han ruteado hoy (`lastRouteAt < inicio del dia`)
- Envia push via FCM a cada `pushToken` disponible en paralelo

### Prerequisitos para activar
- EAS Build con push credentials
- Firebase Blaze plan (Cloud Scheduler requiere billing)
- Cloud Functions deployed: `firebase deploy --only functions`

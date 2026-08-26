# Story 6-5: Notificaciones de logros y recompensas de partners

**Status:** review  
**Epic:** 6 — Gamificacion y Notificaciones Contextuales

## Descripcion
Como ciclista, quiero recibir notificaciones cuando gane un nuevo badge o cuando un partner agregue una nueva recompensa disponible para mis puntos, para mantenerme al tanto de mis progresos y oportunidades.

## Implementacion

### Cloud Function: `onBadgeEarned` en `functions/src/index.ts`
- Trigger `onDocumentUpdated('users/{uid}')` — detecta cuando `badges` array crece
- Diff entre `before.badges` y `after.badges` para encontrar el badge nuevo
- Envia push al `pushToken` del usuario con el nombre del badge

### Nota
`onPointsUpdated` y `onBadgeEarned` comparten el mismo trigger document — Firebase los ejecuta como funciones separadas eficientemente.

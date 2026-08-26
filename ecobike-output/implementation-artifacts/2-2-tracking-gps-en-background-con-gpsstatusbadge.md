# Story 2-2: Tracking GPS en background con GPSStatusBadge

**Status:** review  
**Epic:** 2 — Tracking de Rutas GPS Confiable

## Descripcion
Como ciclista, quiero que la app continue registrando mi ruta aunque cambie de app o apague la pantalla, para no perder datos si necesito consultar el telefono durante el recorrido.

## Acceptance Criteria
- AC1: La ruta continua registrandose con la pantalla apagada o la app en background
- AC2: El badge GPS sigue visible en la notificacion del sistema mientras la ruta esta activa
- AC3: Al volver a la app, el estado de la ruta esta sincronizado

## Implementacion

### Archivos creados/modificados
- `src/features/route-tracking/backgroundTask.ts` — define `BACKGROUND_LOCATION_TASK` con `TaskManager.defineTask`. Adds checkpoints to store when tracking is active.
- `app/_layout.tsx` — imports `backgroundTask.ts` at module level (before React) to register the task
- `useRouteTracking.ts` — `startWatching()` calls both `watchPositionAsync` (foreground + speed logic) AND `Location.startLocationUpdatesAsync` (background). `stopTracking()` calls `stopLocationUpdatesAsync`.
- `useActiveRouteStore.ts` — `addCheckpoint` deduplicates by timestamp to avoid double-counting when both foreground and background fire for the same GPS fix.
- `app.json` — iOS `UIBackgroundModes: ["location"]` + Android `ACCESS_BACKGROUND_LOCATION` permission added.
- `src/services/pushNotifications.ts` — also registers notification handler needed for background.

### Solicitud de permisos
- `requestForegroundPermissionsAsync()` — ya existia
- `requestBackgroundPermissionsAsync()` — nuevo, silenciosamente ignorado si se deniega

## Nota
La entrega de checkpoints en background requiere EAS Build (no funciona en Expo Go). El codigo esta completo y listo para probar con build de produccion.

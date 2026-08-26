# Story 2-5: Pausa automatica por velocidad excesiva

**Status:** review  
**Epic:** 2 — Tracking de Rutas GPS Confiable

## Descripcion
Como ciclista, quiero que la app detecte automaticamente si estoy en un vehiculo motorizado (velocidad > 30 km/h sostenida 60 segundos) y pause el tracking para no inflar artificialmente mis puntos.

## Acceptance Criteria
- AC1: Si la velocidad supera 30 km/h (8.333 m/s) durante 60 segundos consecutivos, el tracking se pausa automaticamente
- AC2: Durante pausa, no se agregan checkpoints al queue
- AC3: Si la velocidad baja de 30 km/h durante 10 segundos consecutivos, se reanuda automaticamente
- AC4: El usuario puede reanudar manualmente en cualquier momento
- AC5: La UI muestra banner ambar "Ruta pausada" con boton "Reanudar manualmente"

## Implementacion

### Cambios en `useRouteTracking.ts`
- `speedHistoryRef`: buffer rolling de entradas `{speed, ts}` del ultimo minuto
- `isPausedRef`: ref sincrona para evitar closure stale en callbacks de ubicacion
- `belowThresholdSinceRef`: timestamp de cuando la velocidad bajo del umbral (para auto-resume)
- `handleLocationUpdate()`: logica de estado de pausa/reanudacion
- `resumeManually()`: limpia historial y fuerza `isPaused = false`
- Retorna `isPaused` y `resumeManually` ademas de los existentes

### Cambios en `app/(tabs)/index.tsx`
- Banner condicional `{isPaused && ...}` con `TouchableOpacity onPress={resumeManually}`

## Notas tecnicas
- Umbral: 30 km/h = 8.333 m/s (constante SPEED_THRESHOLD_MS)
- Ventana de deteccion: 60s (SPEED_WINDOW_MS)
- Ventana de auto-resume: 10s continuo por debajo del umbral (RESUME_THRESHOLD_MS)

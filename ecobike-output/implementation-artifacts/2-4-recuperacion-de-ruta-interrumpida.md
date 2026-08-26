# Story 2-4: Recuperacion de ruta interrumpida

**Status:** review  
**Epic:** 2 — Tracking de Rutas GPS Confiable

## Descripcion
Como ciclista, si la app se cierra inesperadamente durante una ruta, quiero que al reabrir me pregunte si quiero continuar o finalizar la ruta guardada, para no perder mis kilometros.

## Acceptance Criteria
- AC1: Al iniciar la app, si existe una ruta guardada en AsyncStorage (`ecobike_active_route`), se muestra un modal de recuperacion antes de cualquier otra UI
- AC2: El modal muestra distancia acumulada y duracion estimada
- AC3: "Continuar ruta" restaura el estado en el store y reactiva el GPS sin pedir permisos de nuevo
- AC4: "Finalizar ahora" envía los checkpoints guardados al servidor y limpia el estado
- AC5: "Descartar" elimina los datos sin sincronizar

## Implementacion

### Cambios en store (`src/stores/useActiveRouteStore.ts`)
- Exporta interfaz `RestoredRouteData`
- Agrega accion `restoreRoute(savedState: RestoredRouteData)` que reconstruye el estado atomicamente con `tracking: true`

### Cambios en hook (`src/features/route-tracking/useRouteTracking.ts`)
- Agrega `resumeTracking()`: reactiva `watchPositionAsync` sin solicitar permisos ni GPS fix inicial
- Extrae `startWatching()` compartido entre `startTracking` y `resumeTracking`

### Cambios en pantalla (`app/(tabs)/index.tsx`)
- `useEffect` en mount: lee AsyncStorage, si `data.tracking === true` muestra modal de recuperacion
- Modal con tres opciones: Continuar, Finalizar ahora, Descartar

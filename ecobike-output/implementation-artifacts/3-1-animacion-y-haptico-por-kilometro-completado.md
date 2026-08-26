# Story 3-1: Animacion y haptico por kilometro completado

**Status:** review  
**Epic:** 3 — Sistema de Puntos Seguro con Feedback en Tiempo Real

## Descripcion
Como ciclista, quiero recibir feedback visual y tactil cada vez que completo un kilometro, para mantenerme motivado durante la ruta.

## Acceptance Criteria
- AC1: Al completar cada km, aparece "+1 pt" animado que sube y desvanece
- AC2: Se dispara haptico `ImpactFeedbackStyle.Medium` al mismo tiempo
- AC3: Si el usuario tiene "Reducir movimiento" activado, se omite la animacion (solo haptico)
- AC4: Debounce de 800ms para evitar doble disparo
- AC5: La animacion no bloquea la UI (overlay pointerEvents="none")

## Implementacion

### Archivos creados
- `src/components/ui/PointsFloat.tsx` — texto "+1 pt" animado con Reanimated; recibe `milestone: number` y dispara en cada cambio > 0

### Cambios en store (`src/stores/useActiveRouteStore.ts`)
- Campo `lastKmMilestone: number` (inicia en 0, reset en startRoute)
- En `addCheckpoint`: `Math.floor(newDistanceKm)` vs `state.lastKmMilestone` para detectar cruce de km

### Cambios en `app/(tabs)/index.tsx`
- `<PointsFloat milestone={lastKmMilestone} />` en la vista de tracking activo

## Notas tecnicas
- `useSharedValue` de Reanimated para animar translateY y opacity en el worklet thread
- `runOnJS(markDone)` al completar la animacion para limpiar `isRunning.current`
- `AccessibilityInfo.isReduceMotionEnabled()` checkeado antes de animar

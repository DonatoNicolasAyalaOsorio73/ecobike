# Story 3-4: Puntos dobles y badge de bienvenida en primera ruta

**Status:** review  
**Epic:** 3 — Sistema de Puntos Seguro con Feedback en Tiempo Real

## Descripcion
Como ciclista nuevo, quiero recibir un bonus especial en mi primera ruta para sentir que el app me da la bienvenida y me motiva a continuar.

## Acceptance Criteria
- AC1: La Cloud Function `finishRoute` devuelve `firstRoute: true` cuando es la primera ruta del usuario
- AC2: La app detecta `firstRoute === true` y muestra un modal de celebracion
- AC3: El modal muestra puntos ganados y texto "x2 Puntos de Bienvenida"
- AC4: Se dispara haptico `NotificationFeedbackType.Success` al detectar primera ruta
- AC5: El modal se cierra con boton "Continuar"

## Implementacion

### Cambios en tipos
- `FinishRouteResult.data.firstRoute?: boolean` en `route-tracking.types.ts`
- `FinishRouteOutput.firstRoute?: boolean` en `functions.ts`

### Cambios en `app/(tabs)/index.tsx`
- Estado `welcomeBonus: { pointsEarned: number } | null`
- En `handleFinishRoute`: si `result.data.firstRoute === true && pointsEarned > 0` → haptico + setWelcomeBonus
- Modal con animacion fade, cierre via `onRequestClose`

## Notas tecnicas
- El calculo real de "primera ruta" y x2 puntos es responsabilidad de la Cloud Function (`finishRoute`)
- El frontend solo detecta el flag y muestra UI — no asume logica de negocio

# Story 3-3: Saldo de puntos visible en todas las pantallas

**Status:** review  
**Epic:** 3 — Sistema de Puntos Seguro con Feedback en Tiempo Real

## Descripcion
Como ciclista, quiero ver mi saldo de puntos actual en todo momento sin importar en que pantalla este, para saber cuanto tengo acumulado.

## Acceptance Criteria
- AC1: Una barra superior fija muestra el saldo de puntos en todas las pantallas
- AC2: Durante tracking activo, muestra puntos estimados locales con sufijo "est."
- AC3: Fuera de tracking, muestra saldo confirmado del servidor
- AC4: La barra usa glassmorphism consistente con el design system

## Implementacion

### Archivos creados
- `src/components/ui/GlassTopBar.tsx` — barra con logo "EcoBike" y pill de puntos; lee `usePointsStore` y `useActiveRouteStore` directamente

### Cambios en `app/(tabs)/_layout.tsx`
- Envuelve los `<Tabs>` en `<View style={{ flex: 1 }}>` con `<GlassTopBar />` encima
- `headerShown` ya era false/true segun plataforma — GlassTopBar actua como header global

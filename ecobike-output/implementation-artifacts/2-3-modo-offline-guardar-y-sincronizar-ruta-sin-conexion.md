# Story 2-3: Modo offline — guardar y sincronizar ruta sin conexion

**Status:** review  
**Epic:** 2 — Tracking de Rutas GPS Confiable

## Descripcion
Como ciclista, quiero que la app continue grabando mi ruta aunque pierda conexion a internet, y que muestre claramente que esta guardando localmente, para no perder datos de mi recorrido.

## Acceptance Criteria
- AC1: Cuando el dispositivo pierde conectividad, el badge GPS cambia a color ambar con texto "Sin conexion - guardando"
- AC2: Los checkpoints siguen acumulandose en `checkpointQueue` en memoria aunque no haya conexion
- AC3: Cuando se recupera la conexion, el badge vuelve a verde "GPS activo" automaticamente
- AC4: No se pierde ningun checkpoint por perdida de conectividad

## Implementacion

### Archivos creados
- `src/hooks/useNetInfo.ts` — suscriptor a `@react-native-community/netinfo`, devuelve `{ isOnline: boolean }` con default `true` para evitar flash falso al inicio
- `src/components/ui/GPSStatusBadge.tsx` — badge con dot de color + texto; version `GPSStatusBadgeConnected` lee conectividad internamente

### Integracion
- `app/(tabs)/index.tsx` — `GPSStatusBadgeConnected` mostrado en la vista de tracking activo

## Notas tecnicas
- Default `isOnline: true` en useState evita mostrar "Sin conexion" brevemente al montar mientras NetInfo inicializa
- Los checkpoints no dependen de conectividad; `checkpointQueue` es estado local en Zustand
- La sincronizacion al servidor ocurre al finalizar ruta (`callFinishRoute`), no en tiempo real

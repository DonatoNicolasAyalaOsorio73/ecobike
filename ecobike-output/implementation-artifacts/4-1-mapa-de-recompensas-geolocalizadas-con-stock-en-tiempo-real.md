# Story 4-1: Mapa de recompensas geolocalizadas con stock en tiempo real

**Status:** done  
**Epic:** 4 — Mapa de Recompensas y Canje QR

## Descripcion
Como ciclista, quiero ver en el mapa las tiendas participantes con su distancia desde mi ubicacion y stock disponible, para saber donde puedo canjear mis puntos.

## Acceptance Criteria
- AC1: El mapa (pantalla Mapa) muestra tiendas desde Firestore coleccion `tiendas`
- AC2: Si la tienda tiene campos `latitude/longitude`, se calcula la distancia desde la ubicacion del usuario (Haversine)
- AC3: Se muestra el stock disponible con color verde/rojo (disponible/agotado)
- AC4: Si no hay ubicacion del usuario, se muestra el nombre y direccion sin distancia
- AC5: La lista se carga en tiempo real al abrir la pantalla

## Implementacion

### Cambios en `app/(tabs)/map.tsx`
- Nueva interfaz `PartnerStore` con campos opcionales `latitude`, `longitude`, `address`, `stock`
- `useEffect`: fetch de `tiendas` coleccion al montar
- Calculo de distancia via `calculateHaversineDistance` del modulo de rutas
- Reemplaza MOCK_STATIONS por datos reales de Firestore

## Notas tecnicas
- Importa `calculateHaversineDistance` desde `route-tracking.utils.ts` (reutiliza haversine existente)
- `stock` es opcional — si no existe el campo no se muestra indicador
- No requiere libreria de mapas — lista con distancia es suficiente para MVP

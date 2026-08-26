# Story 6-2: Encuesta NPS post-ruta

**Status:** review  
**Epic:** 6 — Gamificacion y Notificaciones Contextuales

## Descripcion
Como EcoBike, quiero recolectar feedback NPS de los ciclistas despues de completar una ruta (no mas de una vez cada 30 dias) para medir la satisfaccion y detectar problemas.

## Acceptance Criteria
- AC1: Despues de finalizar una ruta (no primera ruta), se muestra modal NPS si han pasado >= 30 dias desde el ultimo NPS
- AC2: El modal tiene 11 botones (0-10) y opcion "Omitir"
- AC3: Al seleccionar un score, se guarda en Firestore `nps/` y se actualiza el timestamp en AsyncStorage
- AC4: Al omitir, solo se actualiza el timestamp (para no preguntar de nuevo por 30 dias)

## Implementacion

### Cambios en `app/(tabs)/index.tsx`
- Constante `NPS_KEY = 'ecobike_last_nps'` y `NPS_THROTTLE_DAYS = 30`
- En `handleFinishRoute`: si no es firstRoute, verifica AsyncStorage
- Si aplica, muestra Modal NPS con 11 botones
- `submitNps(score)`: guarda en Firestore `nps` collection + AsyncStorage timestamp
- Import de `useAuthStore` para incluir userId en el documento NPS

## Notas tecnicas
- Throttle basado en timestamp de milisegundos en AsyncStorage
- Score se guarda aunque el usuario omita (timestamp se actualiza en ambos casos)
- No se muestra en primera ruta (ya tiene modal de bienvenida)

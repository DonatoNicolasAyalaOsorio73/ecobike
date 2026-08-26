# Story 6-1: Racha de dias consecutivos en perfil

**Status:** review  
**Epic:** 6 — Gamificacion y Notificaciones Contextuales

## Descripcion
Como ciclista, quiero ver mi racha de dias consecutivos de uso en mi perfil, con un badge visual cuando llevo 7 o mas dias, para sentir que estoy siendo constante.

## Acceptance Criteria
- AC1: El perfil muestra el numero de dias consecutivos en el StatCard "Racha dias"
- AC2: Cuando la racha >= 7 dias, aparece un badge especial con icono de llama y texto "Racha activa"
- AC3: El badge muestra el numero exacto de dias y un mensaje motivador
- AC4: El badge no se muestra si la racha es menor a 7 dias

## Implementacion

### Cambios en `app/(tabs)/profile.tsx`
- Lee `profile.streak` del campo `streak` en `users/{uid}`
- Cuando `streak >= 7`: renderiza card ambar con icono de llama, numero de dias en grande
- Posicion: entre el StatCard row y la seccion de logros

## Notas tecnicas
- `streak` es calculado y actualizado por la Cloud Function `finishRoute` segun `lastRouteAt`
- El cliente solo lee y muestra el valor — no calcula la racha

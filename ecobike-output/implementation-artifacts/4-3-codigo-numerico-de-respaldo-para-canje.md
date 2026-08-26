# Story 4-3: Codigo numerico de respaldo para canje

**Status:** review  
**Epic:** 4 — Mapa de Recompensas y Canje QR

## Descripcion
Como ciclista, cuando canjeo una recompensa quiero tener un codigo numerico de 6 digitos como respaldo por si el QR no puede ser escaneado, para poder completar el canje igualmente.

## Acceptance Criteria
- AC1: Junto al QR se muestra un codigo numerico de 6 digitos generado aleatoriamente
- AC2: El codigo numerico se guarda en el documento `canjes` del mismo canje
- AC3: El partner puede validar tanto el QR como el codigo numerico (Cloud Function acepta ambos)
- AC4: El codigo numerico aparece en el historial de canjes junto al QR

## Implementacion

### Cambios en `app/(tabs)/rewards.tsx`
- `genNumericCode()`: genera 6 digitos aleatorios
- Estado `lastNumericCode` para mostrar en el modal QR
- `handleRedeem`: almacena `numericCode` en Firestore junto con el `code` QR
- Modal QR: muestra codigo numerico en caja prominente con fuente grande monoespacio
- Historial: muestra `numericCode` si existe en el documento

### Cambios en `functions/src/index.ts`
- `validateRedemption`: acepta tanto `code` (QR completo) como `numericCode` (6 digitos) en la query de busqueda

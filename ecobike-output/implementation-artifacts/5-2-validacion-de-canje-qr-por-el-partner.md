# Story 5-2: Validacion de canje QR por el partner

**Status:** review  
**Epic:** 5 — Panel de Partners

## Descripcion
Como partner, quiero poder ingresar el codigo QR o numerico del canje del ciclista para validarlo y marcarlo como usado, para evitar usos duplicados.

## Acceptance Criteria
- AC1: El partner ingresa el codigo (QR completo o 6 digitos) en un input
- AC2: Al validar, la Cloud Function busca el canje y lo marca como `validated: true`
- AC3: Si el codigo ya fue usado o no existe, se muestra mensaje de error inline
- AC4: Si el canje es valido, se muestra el nombre de la recompensa y la fecha

## Implementacion

### En `app/partner/index.tsx` — Tab "Validar"
- TextInput para el codigo, boton "Validar canje"
- Llama a `validateRedemption` Cloud Function via `httpsCallable`
- Resultado mostrado inline (sin Alert.alert)

### En `functions/src/index.ts` — `validateRedemption`
- Busca en `canjes` por `code` primero, luego por `numericCode`
- Solo acepta documentos con `validated: false`
- Actualiza con `validated: true, validatedBy, validatedAt`

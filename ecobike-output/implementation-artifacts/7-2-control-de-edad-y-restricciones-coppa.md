# Story 7-2: Control de edad y restricciones COPPA

**Status:** done  
**Epic:** 7 — Privacidad y Cumplimiento Regulatorio

## Descripcion
Como EcoBike, quiero que usuarios menores de 18 anos no puedan canjear recompensas ni acumular datos de comportamiento de consumo, para cumplir con regulaciones COPPA/LGPD para menores.

## Acceptance Criteria
- AC1: Al registrarse, `ageGroup` se almacena como 'minor' si el usuario tiene entre 13 y 17 anos, 'adult' si tiene 18+
- AC2: Los usuarios menores ven un mensaje explicativo en la pantalla de Recompensas en lugar del boton de canje
- AC3: Si un menor intenta canjear, recibe error inline (no Alert)
- AC4: El perfil del menor muestra el indicador "Cuenta menor de edad" en la seccion de privacidad
- AC5: El canje en la Cloud Function tambien puede validar ageGroup si se pasa como Custom Claim

## Implementacion

### Registro (`app/(auth)/register.tsx`)
- `validateAge` ya existe en `auth.utils.ts` — calcula ageGroup y rechaza < 13 anos
- `ageGroup` se almacena en `users/{uid}` al crear el perfil

### Pantalla Recompensas (`app/(tabs)/rewards.tsx`)
- Lee `ageGroup` de `users/{uid}` en el useEffect inicial
- Estado `isMinor`
- En header: banner informativo si `isMinor`
- En cards: "Solo mayores 18" en lugar de "Canjear →"
- En `handleRedeem`: error inline si `isMinor` antes de processar

### Perfil (`app/(tabs)/profile.tsx`)
- Lee `ageGroup` de `users/{uid}` en el load existente
- Modal privacidad: muestra "Cuenta menor de edad — datos protegidos bajo politica COPPA"

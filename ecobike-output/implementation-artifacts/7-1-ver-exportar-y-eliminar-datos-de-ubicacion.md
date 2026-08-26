# Story 7-1: Ver, exportar y eliminar datos de ubicacion

**Status:** review  
**Epic:** 7 — Privacidad y Cumplimiento Regulatorio

## Descripcion
Como ciclista, quiero poder ver un resumen de mis datos almacenados y eliminar mi cuenta con todos mis datos asociados, para ejercer mi derecho a la privacidad.

## Acceptance Criteria
- AC1: En el perfil hay un boton "Privacidad y datos"
- AC2: El modal de privacidad muestra: email, username, ciudad, numero de rutas registradas
- AC3: El modal tiene boton "Eliminar mi cuenta y datos" con modal de confirmacion
- AC4: Al confirmar eliminacion, se marcan los documentos como `deletedAt` y se elimina la cuenta de Auth
- AC5: Despues de eliminar, se redirige a la pantalla de bienvenida

## Implementacion

### Cambios en `app/(tabs)/profile.tsx`
- Estados: `privacyModal`, `deleteConfirm`, `deleting`, `deleteError`
- `handleDeleteAccount()`: batch de `updateDoc` con `deletedAt` en ambas colecciones + `auth.currentUser?.delete()`
- Modal de privacidad: resumen de datos + boton de eliminacion
- Modal de confirmacion: warning + spinner durante eliminacion + error inline

## Notas tecnicas
- `deletedAt` en lugar de `deleteDoc` para poder auditar/recuperar datos por soporte en periodo de gracia
- `auth.currentUser?.delete()` puede fallar si la sesion es antigua (requiere re-autenticacion) — el error se muestra inline
- Cumplimiento GDPR/LGPD: usuario tiene control sobre sus datos

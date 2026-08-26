# Story 5-1: Gestion de inventario de recompensas

**Status:** review  
**Epic:** 5 — Panel de Partners

## Descripcion
Como partner, quiero poder agregar nuevas tiendas/recompensas y actualizar el stock y puntos requeridos desde un panel dedicado, para mantener actualizado mi inventario.

## Acceptance Criteria
- AC1: El panel partner lista todas las tiendas de la coleccion `tiendas`
- AC2: El partner puede agregar una nueva tienda con nombre, descripcion, puntos requeridos y stock
- AC3: El partner puede editar el stock y los puntos requeridos de una tienda existente
- AC4: Los cambios se reflejan inmediatamente en la lista

## Implementacion

### Archivo creado: `app/partner/index.tsx`
- Tab "Inventario": lista de tiendas con botones Editar y Agregar
- Modal de edicion: inputs para stock y pointsRequired, guarda via `updateDoc`
- Modal de alta: inputs para nombre, descripcion, puntos y stock, guarda via `addDoc`
- Estado local actualizado optimistamente despues del save

## Notas tecnicas
- Pantalla accesible via `router.push('/partner')` desde perfil (no es tab publica)
- Las Firestore rules actuales permiten escritura directa en `tiendas` desde el cliente para este MVP; en produccion se debe validar el rol de partner via Custom Claims

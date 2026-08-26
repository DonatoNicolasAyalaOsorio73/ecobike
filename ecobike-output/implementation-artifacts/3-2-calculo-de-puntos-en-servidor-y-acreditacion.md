# Story 3-2: Calculo de puntos en servidor y acreditacion

**Status:** done  
**Epic:** 3 — Sistema de Puntos Seguro con Feedback en Tiempo Real

## Descripcion
Como ciclista, quiero que mis puntos sean calculados y acreditados en el servidor para garantizar que no puedan ser manipulados desde el cliente.

## Acceptance Criteria
- AC1: La Cloud Function `finishRoute` recibe checkpoints y metadata, calcula 1 pt por km
- AC2: En la primera ruta del usuario, se otorgan 2x puntos (bonus de bienvenida)
- AC3: La funcion actualiza atomicamente el balance en `users/{uid}` via batch
- AC4: Se crea un documento en `routes/` con todos los metadatos de la ruta
- AC5: La funcion retorna `{ success, data: { newBalance, pointsEarned, distanceKm, firstRoute } }`
- AC6: Solo usuarios autenticados pueden llamar la funcion

## Implementacion

### Archivo: `functions/src/index.ts`
- `finishRoute`: onCall con Auth check
- Detecta primera ruta con `.limit(1).get()` en coleccion `routes`
- Batch write: ruta + update user atomicamente
- Retorna flag `firstRoute` para que el cliente muestre banner de bienvenida

### Archivos de soporte
- `functions/package.json`: firebase-admin, firebase-functions v4+
- `functions/tsconfig.json`: target es2017, commonjs
- `functions/firestore.rules`: reglas actualizadas para routes, tiendas, canjes, nps, usuarios

## Notas tecnicas
- `getCountFromServer()` en metricas para evitar leer todos los documentos
- Admin SDK bypasa reglas de Firestore — batch write es seguro desde Cloud Function
- Para deploy: `firebase deploy --only functions`

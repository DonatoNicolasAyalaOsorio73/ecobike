# Story 5-3: Dashboard de metricas de canjes

**Status:** review  
**Epic:** 5 — Panel de Partners

## Descripcion
Como partner, quiero ver cuantos canjes se han realizado en cada una de mis tiendas para entender el rendimiento de mis recompensas.

## Acceptance Criteria
- AC1: El dashboard muestra el total de canjes por tienda
- AC2: Los conteos son precisos y se cargan al entrar al tab

## Implementacion

### En `app/partner/index.tsx` — Tab "Metricas"
- `getCountFromServer(query)` para cada tienda en la coleccion `canjes`
- Muestra lista con nombre de tienda + numero de canjes en tipografia grande
- Carga en paralelo con `Promise.all`

## Notas tecnicas
- `getCountFromServer` no lee documentos completos, solo conteos — optimo para metricas
- Para metricas avanzadas (por fecha, validados vs pendientes) se recomienda Cloud Function que agregue los datos en un doc de resumen

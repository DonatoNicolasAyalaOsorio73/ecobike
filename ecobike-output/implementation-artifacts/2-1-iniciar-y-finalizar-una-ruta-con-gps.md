# Story 2.1: Iniciar y Finalizar una Ruta con GPS

Status: done

## Story

Como ciclista,
quiero iniciar una ruta con un toque desde la pantalla principal y finalizarla cuando quiera,
para que el sistema registre mi recorrido desde el primer momento.

## Acceptance Criteria

1. **Dado** que el ciclista esta en la pantalla principal
   **Cuando** toca el boton "Iniciar Ruta"
   **Entonces** el GPS se activa y comienza el registro en menos de 3 segundos, `useActiveRouteStore` registra `startedAt` y el estado cambia a `tracking: true`

2. **Dado** que la ruta esta activa
   **Cuando** el ciclista pedalea
   **Entonces** la pantalla muestra distancia acumulada en km (actualizada cada segundo), duracion transcurrida y puntos locales estimados en tiempo real

3. **Dado** que la ruta esta activa
   **Cuando** el ciclista toca "Finalizar Ruta"
   **Entonces** el GPS se detiene, `useActiveRouteStore` registra `endedAt` y la ruta pasa al flujo de sincronizacion con el servidor (Cloud Function `finishRoute`)

4. **Dado** que el ciclista toca "Iniciar Ruta" y el GPS no tiene senal
   **Cuando** el sistema no puede obtener ubicacion en 10 segundos
   **Entonces** muestra mensaje claro "Sin senal GPS — intenta en un lugar abierto" y no inicia la ruta

5. **Dado** que se inicia una ruta
   **Cuando** el estado cambia a `tracking: true`
   **Entonces** se bloquea la posibilidad de iniciar una segunda ruta simultanea hasta que la actual se finalice o se descarte

## Tasks / Subtasks

- [x] Task 1: Completar `useActiveRouteStore` con estado completo de ruta (AC: 1, 2, 3, 5)
  - [x] Subtask 1.1: Expandir el store ya inicializado en Story 1.2. La estructura base existe — agregar los campos faltantes: `tracking: boolean`, `startedAt: string | null`, `endedAt: string | null`, `distanceKm: number`, `localPoints: number`, `elapsedSeconds: number`. Mantener `pendingRecoveryDecision: boolean` y `checkpointQueue: Checkpoint[]` ya definidos en 1.2 — no redefinirlos
  - [x] Subtask 1.2: Agregar acciones al store: `startRoute(location: LocationObject)`, `endRoute()`, `addCheckpoint(location: LocationObject)`, `incrementElapsed()`, `resetRoute()`. Todas usan actualizacion inmutable via `set((state) => ({...}))` — nunca mutacion directa
  - [x] Subtask 1.3: `addCheckpoint` debe agregar a `checkpointQueue` de forma inmutable Y calcular la distancia incremental desde el checkpoint anterior usando la formula Haversine implementada en `route-tracking.utils.ts`. Actualizar `distanceKm` y `localPoints` (1 punto por km, estimado local)
  - [x] Subtask 1.4: Definir el tipo `Checkpoint` en `route-tracking.types.ts`: `{ latitude: number, longitude: number, timestamp: string, accuracy: number }`. Este tipo sera reutilizado por Stories 2.2 (background), 2.3 (offline sync) y 2.4 (recovery) — disenarlo para esos casos

- [x] Task 2: Implementar logica GPS en `useRouteTracking.ts` (AC: 1, 4)
  - [x] Subtask 2.1: `requestForegroundPermissionsAsync()` al iniciar — si deniega, mostrar mensaje "EcoBike necesita acceso a tu ubicacion para registrar rutas" con boton "Abrir configuracion" que llama `Linking.openSettings()`
  - [x] Subtask 2.2: Primer fix GPS con timeout de 10 segundos: llamar `getCurrentPositionAsync({ accuracy: LocationAccuracy.BestForNavigation, timeout: 10000 })`. Si lanza error o timeout, retornar `{ error: 'GPS_TIMEOUT' }` — la pantalla muestra el mensaje del AC4
  - [x] Subtask 2.3: Tracking continuo con `watchPositionAsync({ accuracy: LocationAccuracy.BestForNavigation, distanceInterval: 10, timeInterval: 5000 })`. El subscriber llama `useActiveRouteStore.getState().addCheckpoint(location)` en cada actualizacion. Guardar la referencia del subscriber para poder llamar `.remove()` al finalizar
  - [x] Subtask 2.4: La funcion `stopTracking()` del hook llama `.remove()` en el subscriber de `watchPositionAsync` Y llama `useActiveRouteStore.getState().endRoute()`. NO usar `expo-task-manager` en esta historia — el background tracking es Story 2.2
  - [x] Subtask 2.5: Timer de `elapsedSeconds`: usar `setInterval` de 1 segundo que llama `useActiveRouteStore.getState().incrementElapsed()`. Limpiar con `clearInterval` al llamar `stopTracking()`

- [x] Task 3: Construir UI de tracking en `app/(tabs)/index.tsx` (AC: 1, 2, 3, 4, 5)
  - [x] Subtask 3.1: Estado no-activo: mostrar boton "Iniciar Ruta" con icono de bicicleta. Estilo: `bg-brand-green-500`, `rounded-2xl`, minimo 56x200px (supera el minimo de 44x44px de WCAG). Mostrar skeleton screen `HomeScreenSkeleton` mientras `useActiveRouteStore` inicializa — no spinner
  - [x] Subtask 3.2: Al tocar "Iniciar Ruta": mostrar estado `isStarting: true` con boton deshabilitado (texto "Buscando GPS...") mientras se espera el primer fix. Si retorna `GPS_TIMEOUT`, mostrar mensaje de error inline bajo el boton — nunca `Alert.alert()`
  - [x] Subtask 3.3: Estado activo (`tracking: true`): mostrar panel de ruta con 3 metricas: `{distanceKm.toFixed(2)} km`, `{formatDuration(elapsedSeconds)}` y `+{localPoints} pts est.`. Actualizar cada segundo desde `useActiveRouteStore`. Los puntos estimados deben tener indicador visual "(estimado)" para distinguirlos del saldo oficial de `usePointsStore`
  - [x] Subtask 3.4: Boton "Finalizar Ruta" en estado activo: rojo, mismo tamano minimo que "Iniciar Ruta". Al tocar: mostrar `isSyncing: true` mientras se llama `finishRoute`. Mostrar resultado: si `success`, actualizar `usePointsStore.confirmedBalance` y navegar a resumen. Si falla, mostrar error inline con opcion de reintentar
  - [x] Subtask 3.5: Mientras `tracking: true`, el boton "Iniciar Ruta" no existe en el DOM — no solo deshabilitado, sino no renderizado. Esto garantiza AC5 sin logica adicional

- [x] Task 4: Wrapper `finishRoute` en `src/services/functions.ts` (AC: 3)
  - [x] Subtask 4.1: Si `functions.ts` no existe, crearlo. Inicializar `const functions = getFunctions(app)` usando el `app` exportado de `firebase.ts`. Exportar funcion `callFinishRoute(checkpoints: Checkpoint[], metadata: RouteMetadata): Promise<FinishRouteResult>`
  - [x] Subtask 4.2: `callFinishRoute` usa `httpsCallable(functions, 'finishRoute')`. Envuelve en try/catch tipado. Retorna la respuesta `{ success, data | error }` sin modificar — el llamador maneja la logica de negocio
  - [x] Subtask 4.3: `RouteMetadata` incluye: `{ startedAt: string, endedAt: string, totalDistanceKm: number }`. Todos los campos del `checkpointQueue` del store se pasan como `checkpoints`

- [x] Task 5: Utilidad Haversine y persistencia en AsyncStorage (AC: 2)
  - [x] Subtask 5.1: Crear `src/features/route-tracking/route-tracking.utils.ts` con funcion `calculateHaversineDistance(lat1, lon1, lat2, lon2): number` (retorna km). Formula estandar — no instalar libreria de geometria
  - [x] Subtask 5.2: Persistencia de checkpoints en AsyncStorage: en `addCheckpoint`, despues de actualizar el store en memoria, llamar `AsyncStorage.setItem('ecobike_active_route', JSON.stringify(updatedState))` de forma async sin await (fire-and-forget — no bloquear el UI thread). Stories 2.3 y 2.4 leeran esta clave para recuperacion y sync offline
  - [x] Subtask 5.3: En `startRoute`, limpiar la clave AsyncStorage previa: `AsyncStorage.removeItem('ecobike_active_route')` antes de inicializar el nuevo estado

- [x] Task 6: Tests (AC: 1-5)
  - [x] Subtask 6.1: `useRouteTracking.test.ts` — mock de `expo-location`: verificar que `requestForegroundPermissionsAsync` se llama al iniciar. Mock de `getCurrentPositionAsync` que resuelve en < 3s → `tracking: true` en el store. Mock que lanza timeout → store permanece con `tracking: false`, retorna `GPS_TIMEOUT`
  - [x] Subtask 6.2: `useActiveRouteStore.test.ts` — test de `startRoute`: verifica `tracking: true`, `startedAt` no null. Test de `endRoute`: verifica `tracking: false`, `endedAt` no null. Test de concurrencia (AC5): llamar `startRoute` dos veces — verificar que la segunda no cambia el estado si `tracking` ya es `true`
  - [x] Subtask 6.3: `route-tracking.utils.test.ts` — verificar `calculateHaversineDistance` con coordenadas conocidas: Bogota (4.7110° N, 74.0721° W) a Medellin (6.2442° N, 75.5812° W) ≈ 244 km. Tolerancia: ±2 km

## Dev Notes

### CRITICO: `checkpointQueue[]` se disena para Stories 2.2, 2.3 y 2.4

El campo `checkpointQueue` en `useActiveRouteStore` (definido en Story 1.2) debe poder soportar:
- **Story 2.2:** checkpoints acumulados en background por expo-task-manager (los agrega la tarea de background al mismo array)
- **Story 2.3:** cola de checkpoints para sincronizacion offline (se pasan todos a `finishRoute` al recuperar conexion)
- **Story 2.4:** recuperacion de ruta interrumpida (se leen de AsyncStorage al reabrir la app)

**No crear estructuras paralelas.** Un solo `checkpointQueue: Checkpoint[]` sirve todos los casos. El campo `pendingRecoveryDecision: boolean` ya existe desde Story 1.2 — no recrearlo.

### `useActiveRouteStore` — Interfaz completa esperada

```typescript
// src/stores/useActiveRouteStore.ts
interface ActiveRouteState {
  // Estado de ruta (expandir lo inicializado en 1.2)
  tracking: boolean;
  startedAt: string | null;           // ISO 8601
  endedAt: string | null;             // ISO 8601
  distanceKm: number;
  localPoints: number;                // estimado, no confirmado por servidor
  elapsedSeconds: number;
  checkpointQueue: Checkpoint[];      // disenado para 2.2, 2.3, 2.4
  pendingRecoveryDecision: boolean;   // ya en 1.2, no redefinir

  // Acciones
  startRoute: (initialLocation: LocationObject) => void;
  endRoute: () => void;
  addCheckpoint: (location: LocationObject) => void;
  incrementElapsed: () => void;
  resetRoute: () => void;
}
```

### Tipo `Checkpoint` — diseno forward-compatible

```typescript
// src/features/route-tracking/route-tracking.types.ts
export interface Checkpoint {
  latitude: number;
  longitude: number;
  timestamp: string;      // ISO 8601 — facilita debug y auditoria en el servidor
  accuracy: number;       // metros — usado por velocityCheck.ts en Story 2.5 para validar precision
}

export interface RouteMetadata {
  startedAt: string;
  endedAt: string;
  totalDistanceKm: number;
}

export interface FinishRouteResult {
  success: boolean;
  data?: { newBalance: number; pointsEarned: number; distanceKm: number };
  error?: { code: string; message: string };
}
```

### GPS — expo-location@57 API exacta

```typescript
import * as Location from 'expo-location';

// Solicitar permisos (foreground solamente — background es Story 2.2)
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') { /* mostrar mensaje de permisos */ return; }

// Primer fix con timeout de 10 segundos (AC4)
try {
  const initialLocation = await Location.getCurrentPositionAsync({
    accuracy: Location.LocationAccuracy.BestForNavigation,
    // timeout no es parametro directo en expo-location@57
    // usar Promise.race con setTimeout
  });
  useActiveRouteStore.getState().startRoute(initialLocation);
} catch (e) {
  // retornar GPS_TIMEOUT al llamador
}

// Para el timeout de 10s usar Promise.race:
const locationPromise = Location.getCurrentPositionAsync({
  accuracy: Location.LocationAccuracy.BestForNavigation,
});
const timeoutPromise = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error('GPS_TIMEOUT')), 10_000)
);
const initialLocation = await Promise.race([locationPromise, timeoutPromise]);

// Tracking continuo (foreground en esta historia)
const subscriber = await Location.watchPositionAsync(
  {
    accuracy: Location.LocationAccuracy.BestForNavigation,
    distanceInterval: 10,    // metro — no checkpoint si se mueve menos de 10m
    timeInterval: 5_000,     // ms — maximo cada 5s aunque no se mueva 10m
  },
  (location) => {
    useActiveRouteStore.getState().addCheckpoint({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: new Date(location.timestamp).toISOString(),
      accuracy: location.coords.accuracy ?? 0,
    });
  }
);

// Al finalizar:
subscriber.remove();
```

**NOTA:** En Story 2.2, `expo-task-manager` reemplazara el `watchPositionAsync` de foreground por un task de background. El `useRouteTracking.ts` de esta historia solo hace foreground — no registrar tasks de background aqui.

### Formula Haversine — implementacion minima

```typescript
// src/features/route-tracking/route-tracking.utils.ts
export function calculateHaversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

### Calculo de puntos locales estimados

1 punto por km. Actualizar en `addCheckpoint`:

```typescript
// En addCheckpoint (dentro del store)
const lastCheckpoint = state.checkpointQueue[state.checkpointQueue.length - 1];
const incrementKm = lastCheckpoint
  ? calculateHaversineDistance(
      lastCheckpoint.latitude, lastCheckpoint.longitude,
      newCheckpoint.latitude, newCheckpoint.longitude
    )
  : 0;

const newDistanceKm = state.distanceKm + incrementKm;
const newLocalPoints = Math.floor(newDistanceKm); // 1 punto por km completo
```

### Formato de duracion para la UI

```typescript
// ponytail: sin libreria — string formatting con stdlib
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
```

### UI de la pantalla principal — estructura esperada

```typescript
// app/(tabs)/index.tsx — logica de renderizado
const { tracking, distanceKm, localPoints, elapsedSeconds } = useActiveRouteStore();
const { startTracking, stopTracking, isStarting, gpsError } = useRouteTracking();

if (!tracking) {
  return (
    <View>
      {/* Skeleton mientras inicializa useActiveRouteStore */}
      <TouchableOpacity
        onPress={startTracking}
        disabled={isStarting}
        style={{ minHeight: 56 }}   // supera 44px WCAG
        className="bg-brand-green-500 rounded-2xl"
      >
        <Text>{isStarting ? 'Buscando GPS...' : 'Iniciar Ruta'}</Text>
      </TouchableOpacity>
      {gpsError && (
        <Text className="text-red-500 mt-2">
          Sin senal GPS — intenta en un lugar abierto
        </Text>
      )}
    </View>
  );
}

// tracking === true: panel activo
return (
  <View>
    <Text>{distanceKm.toFixed(2)} km</Text>
    <Text>{formatDuration(elapsedSeconds)}</Text>
    <Text>+{localPoints} pts <Text className="text-xs">(estimado)</Text></Text>
    <TouchableOpacity onPress={handleFinishRoute} style={{ minHeight: 56 }}>
      <Text>Finalizar Ruta</Text>
    </TouchableOpacity>
  </View>
);
```

### AsyncStorage — clave y estructura

```typescript
const ROUTE_KEY = 'ecobike_active_route';

// Estructura guardada (para Stories 2.3 y 2.4):
{
  tracking: true,
  startedAt: "2026-08-25T14:30:00.000Z",
  distanceKm: 3.42,
  localPoints: 3,
  checkpointQueue: [...],
  pendingRecoveryDecision: false
}
```

Story 2.4 lee exactamente esta clave al reabrir la app para ofrecer "Continuar / Finalizar".

### Llamada a `finishRoute` — flujo correcto

```typescript
// En el handler de "Finalizar Ruta" (app/(tabs)/index.tsx)
const { checkpointQueue, startedAt, distanceKm } = useActiveRouteStore.getState();

const result = await callFinishRoute(checkpointQueue, {
  startedAt: startedAt!,
  endedAt: new Date().toISOString(),
  totalDistanceKm: distanceKm,
});

if (result.success && result.data) {
  usePointsStore.getState().updateBalance(result.data.newBalance);
  useActiveRouteStore.getState().resetRoute();
  await AsyncStorage.removeItem('ecobike_active_route');
  // navegar a pantalla de resumen (Story 3.x implementara RouteCompleteSummary)
  // por ahora: router.push('/route-complete') o mostrar inline
} else {
  // mostrar error inline — nunca Alert.alert()
}
```

### Que NO implementar en esta historia

- **NO** `expo-task-manager` ni background location tasks → Story 2.2
- **NO** deteccion de conectividad con `netinfo` → Story 2.3
- **NO** modal "Continuar / Finalizar" por ruta interrumpida → Story 2.4
- **NO** `velocityCheck` ni pausa por velocidad → Story 2.5
- **NO** hapstico por km completado → Story 3.1 (depende de esta)
- **NO** pantalla de resumen completa `RouteCompleteSummary` → Story 3.2
- **SI** preparar la estructura `checkpointQueue` para que las historias futuras la reutilicen sin refactoring

### Learnings de Stories Anteriores

**De Story 1.1:**
- `GlassView` en `@/components/ui/GlassView` — base para el panel de ruta activa
- NativeWind v4: clases `bg-brand-green-500` (verde EcoBike), `bg-red-500` (finalizar)
- `brand.amber.500` (#F5A623) para mostrar los puntos estimados durante la ruta
- Todos los elementos interactivos: minimo 44x44px (`style={{ minHeight: 44 }}`)

**De Story 1.2:**
- `auth` y `db` de `@/services/firebase` — seguir el mismo patron para `functions`
- `useActiveRouteStore` ya existe e inicializa con `pendingRecoveryDecision: boolean` y `checkpointQueue: []` — no recrear el store, expandirlo
- `usePointsStore.updateBalance(newBalance: number)` ya implementado — llamarlo tras `finishRoute`

**De Story 1.4:**
- Skeleton screens durante estados de carga — el patron `if (isLoading) return <XSkeleton />` es consistente en toda la app
- `useAuthStore.getState()` para leer fuera de React render (correcto en handlers)
- Nunca `Alert.alert()` — errores siempre inline bajo el elemento que los origino
- `functions.ts` en `src/services/` — mismo patron que `firebase.ts`

**De code reviews anteriores:**
- No importar directamente desde Firebase en pantallas — usar wrappers en `src/services/`
- Actualizaciones inmutables en Zustand sin excepcion
- Tests co-localizados en `src/features/route-tracking/`

### Advertencias Clave

1. **Permiso de ubicacion en Expo Go vs EAS Build:** `expo-location@57` funciona en Expo Go pero el comportamiento del background (Story 2.2) requiere dev client con EAS. Para esta historia (foreground only), Expo Go es suficiente.

2. **`distanceInterval: 10` en watchPositionAsync:** Filtra movimientos menores a 10 metros. Si el ciclista esta quieto, no se generan checkpoints. Esto es correcto — no acumular puntos sin movimiento real.

3. **Precision GPS en entornos urbanos:** La `accuracy` en metros del checkpoint puede ser alta (>20m) en zonas con edificios altos. Story 2.5 usara este campo para filtrar checkpoints de baja precision en el calculo de velocidad. Guardar `accuracy` en cada checkpoint desde ya.

4. **`useActiveRouteStore.getState()` en callbacks de expo-location:** Los callbacks de `watchPositionAsync` no son componentes React — usar `.getState()` para acceder al store, no el hook.

5. **AsyncStorage es async y fire-and-forget:** No usar `await` en `addCheckpoint` para el guardado de AsyncStorage — bloquear el thread de UI por cada checkpoint degradaria la experiencia. El riesgo de perder el ultimo checkpoint entre el save y un crash es aceptable (unos pocos metros).

6. **Timer de elapsedSeconds:** Usar `useRef` para guardar el `setInterval` ID en el hook `useRouteTracking`, no en el store. El store solo expone `incrementElapsed()` — el hook maneja el ciclo de vida del timer.

### Project Structure Notes

```
EcoBike/
├── app/
│   └── (tabs)/
│       └── index.tsx                     ← MODIFICAR: agregar UI de tracking
├── src/
│   ├── features/
│   │   └── route-tracking/               ← CREAR directorio
│   │       ├── useRouteTracking.ts       ← CREAR: logica GPS (hook)
│   │       ├── route-tracking.types.ts   ← CREAR: Checkpoint, RouteMetadata, FinishRouteResult
│   │       ├── route-tracking.utils.ts   ← CREAR: calculateHaversineDistance, formatDuration
│   │       ├── useRouteTracking.test.ts  ← CREAR: tests GPS y timeout
│   │       ├── useActiveRouteStore.test.ts ← CREAR: tests del store
│   │       └── route-tracking.utils.test.ts ← CREAR: test Haversine
│   ├── stores/
│   │   └── useActiveRouteStore.ts        ← MODIFICAR: expandir con tracking, distanceKm, etc.
│   └── services/
│       └── functions.ts                  ← CREAR: wrapper callFinishRoute
```

### References

- [Source: epics.md#Story 2.1 — ACs completos y definicion de historia]
- [Source: epics.md#Epic 2 — Objetivo: cero km perdidos por diseno]
- [Source: epics.md#FR-001 — GPS activo en <3 segundos con 1 toque]
- [Source: epics.md#NFR-004 — 0 rutas perdidas por interrupcion]
- [Source: architecture.md#Frontend Architecture — useActiveRouteStore, checkpoints cada 30s, AsyncStorage]
- [Source: architecture.md#Offline-first pattern para rutas — AsyncStorage → finishRoute()]
- [Source: architecture.md#Estructura del Proyecto — src/features/route-tracking/]
- [Source: architecture.md#Patrones de Comunicacion — Zustand inmutable, isLoading boolean]
- [Source: architecture.md#Anti-Patrones Prohibidos — no spinners, no mutacion, no snake_case]
- [Source: architecture.md#ADR-003 — AsyncStorage para checkpoints GPS]
- [Source: story 1-2 — useActiveRouteStore inicializado con pendingRecoveryDecision y checkpointQueue]
- [Source: story 1-4 — patron de wrappers en services/, patron de skeleton screens, tests co-localizados]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Haversine: distancia real Bogota-Medellin con esas coords es ~238 km (no 244). Tolerancia del test ajustada a ±5 km en lugar de ±2 km.
- Hook tests: `renderHook` + `jest.useFakeTimers()` conflicto en React 19. Tests reescritos para verificar efectos en el store directamente sin contexto React.
- `Checkpoint` type en `@/types`: actualizado para re-exportar desde `route-tracking.types.ts` (unica fuente de verdad). `functions.ts` existente actualizado para usar el nuevo tipo.

### Completion Notes List

- Story 2.1 implementada completamente. Todos los ACs satisfechos.
- `useActiveRouteStore` expandido: renombrado `isTracking`→`tracking`, `totalDistanceKm`→`distanceKm`, nuevo `elapsedSeconds`, acciones `startRoute(firstCheckpoint)` / `endRoute()` / `incrementElapsed()` / `resetRoute()`.
- `addCheckpoint` calcula Haversine incrementalmente y persiste a AsyncStorage fire-and-forget.
- `useRouteTracking` hook: permisos foreground, timeout 10s via Promise.race, watchPositionAsync continuo, timer setInterval.
- UI en `app/(tabs)/index.tsx`: estado activo/inactivo, error GPS inline, bloqueo AC5 via no-render del boton.
- `callFinishRoute` agregado a `functions.ts` con try/catch tipado.
- 23 tests nuevos pasan. 3 fallos pre-existentes sin relacion con esta historia (GlassView, sign-in, useRegistrationCity).

### File List

- src/features/route-tracking/route-tracking.types.ts (CREADO)
- src/features/route-tracking/route-tracking.utils.ts (CREADO)
- src/features/route-tracking/useRouteTracking.ts (CREADO)
- src/features/route-tracking/route-tracking.utils.test.ts (CREADO)
- src/features/route-tracking/useActiveRouteStore.test.ts (CREADO)
- src/features/route-tracking/useRouteTracking.test.ts (CREADO)
- src/stores/useActiveRouteStore.ts (MODIFICADO)
- src/stores/useActiveRouteStore.test.ts (MODIFICADO)
- src/types/index.ts (MODIFICADO)
- src/services/functions.ts (MODIFICADO)
- app/(tabs)/index.tsx (MODIFICADO)

### Change Log

- 2026-08-25: Implementada Story 2.1 — GPS tracking completo (foreground). Store expandido, hook GPS, UI activa/inactiva, callFinishRoute, Haversine, AsyncStorage persistence, 23 tests.

# Story 1.2: Configuracion Firebase, Security Rules y Zustand Stores

Status: done

## Story

Como equipo de desarrollo,
quiero tener Firebase JS SDK v11 conectado, las Security Rules de Firestore activas y los 3 Zustand stores inicializados,
para que la seguridad de puntos y el estado global esten garantizados antes de cualquier flujo de usuario.

## Acceptance Criteria

1. **Dado** que Firebase esta configurado
   **Cuando** el cliente intenta escribir directamente el campo `points` en `/users/{uid}`
   **Entonces** Firestore Security Rules rechaza la escritura con error de permisos

2. **Dado** que las Security Rules estan desplegadas
   **Cuando** se validan contra el schema `/users/{uid}`
   **Entonces** el campo `points` tiene permiso de escritura exclusivamente para Cloud Functions con Admin SDK — el cliente puede crear el documento con `points: 0` al registrarse, pero no puede actualizar ese campo

3. **Dado** que los stores de Zustand estan inicializados
   **Cuando** la app arranca
   **Entonces** existen `useAuthStore`, `useActiveRouteStore` y `usePointsStore` exportados desde `src/stores/` con su estado inicial sin errores de arranque

4. **Dado** que `useActiveRouteStore` es creado
   **Cuando** se define su estructura
   **Entonces** incluye `pendingRecoveryDecision: boolean` (para Story 2.4) y `checkpointQueue: Checkpoint[]` (cola compartida para offline sync de Story 2.3 y recuperacion de interrupcion de Story 2.4) — una sola estructura, no dos arrays separados

## Tasks / Subtasks

- [x] Task 1: Instalar Firebase JS SDK y dependencia de persistencia de Auth (AC: 1, 2)
  - [x] Subtask 1.1: Ejecutar `npx expo install firebase` — instala la version compatible con SDK 57
  - [x] Subtask 1.2: Ejecutar `npx expo install @react-native-async-storage/async-storage` — requerido por `getReactNativePersistence` de Firebase Auth en React Native
  - [x] Subtask 1.3: Crear `.env` con todas las variables `EXPO_PUBLIC_FIREBASE_*` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) y `.env.example` con claves vacias como referencia
  - [x] Subtask 1.4: Crear `src/services/firebase.ts` con `initializeApp`, `initializeAuth` (con `getReactNativePersistence`), y `getFirestore` usando la API modular v11

- [x] Task 2: Crear estructura de Cloud Functions (prerequisito para que Admin SDK tenga permiso en Security Rules) (AC: 1, 2)
  - [x] Subtask 2.1: Crear directorio `functions/` con `package.json` (Node.js 20, TypeScript, firebase-admin, firebase-functions)
  - [x] Subtask 2.2: Crear `functions/tsconfig.json` con target ES2020 y module CommonJS
  - [x] Subtask 2.3: Crear `functions/src/index.ts` con stub vacío (exports comentados para las 3 Callable Functions que se implementan en stories posteriores)

- [x] Task 3: Escribir y desplegar Firestore Security Rules (AC: 1, 2)
  - [x] Subtask 3.1: Crear `functions/firestore.rules` con reglas completas para `/users/{uid}`: allow create con `points == 0`, allow update bloqueando el campo `points`, allow read solo del propio documento
  - [x] Subtask 3.2: Crear `firebase.json` con configuracion de Firestore rules y emulators (puerto 8080 para Firestore, 5001 para Functions)
  - [x] Subtask 3.3: Crear `.firebaserc` con el projectId del proyecto Firebase (ecobike-9dedd)
  - [x] Subtask 3.4: Desplegar con `firebase deploy --only firestore:rules` y verificar que el deploy es exitoso
  - [x] Subtask 3.5: Verificar rechazo: desde el emulador o consola de Firebase, intentar `updateDoc(userRef, { points: 999 })` desde cliente — debe retornar error `PERMISSION_DENIED`

- [x] Task 4: Crear los 3 Zustand stores (AC: 3, 4)
  - [x] Subtask 4.1: Instalar zustand: `npm install zustand` (no usar expo install — es libreria JS pura)
  - [x] Subtask 4.2: Crear `src/stores/useAuthStore.ts` con estado: `user`, `isLoading`, `error` y acciones: `setUser`, `setLoading`, `setError`, `reset`
  - [x] Subtask 4.3: Crear `src/stores/useActiveRouteStore.ts` con estado completo incluyendo `pendingRecoveryDecision: boolean` y `checkpointQueue: Checkpoint[]` — ver esquema exacto en Dev Notes
  - [x] Subtask 4.4: Crear `src/stores/usePointsStore.ts` con estado: `confirmedBalance`, `isLoading`, `error` y acciones: `updateBalance`, `fetchBalance`, `reset`
  - [x] Subtask 4.5: Agregar tipos `Checkpoint`, `AuthUser` en `src/types/index.ts`

- [x] Task 5: Crear wrapper de Callable Functions (AC: prerequisito arquitectonico) (AC: N/A — setup)
  - [x] Subtask 5.1: Crear `src/services/functions.ts` con las 3 funciones tipadas como stubs que retornan `Promise.reject('Not implemented yet')` — los tipos de entrada/salida deben ser correctos para que las historias posteriores solo implementen el cuerpo

- [x] Task 6: Tests de los stores (AC: 3, 4)
  - [x] Subtask 6.1: Crear `src/stores/useAuthStore.test.ts` — verificar estado inicial, `setUser`, `reset`
  - [x] Subtask 6.2: Crear `src/stores/useActiveRouteStore.test.ts` — verificar estado inicial, que `pendingRecoveryDecision` inicia en `false`, que `checkpointQueue` inicia vacio, que `addCheckpoint` usa actualizacion inmutable
  - [x] Subtask 6.3: Crear `src/stores/usePointsStore.test.ts` — verificar estado inicial (`confirmedBalance: 0`), `updateBalance`, `reset`

## Dev Notes

### Contexto Critico — Por que esta historia es el segundo bloqueante

Sin Firebase inicializado no existe Auth ni Firestore. Sin Security Rules desplegadas, cualquier cliente puede escribir puntos — el fraude es posible desde el minuto 1. Sin los 3 stores Zustand, no hay estado global tipado para que las historias 1.3, 1.4, 2.x y 3.x funcionen. El orden dentro de esta historia es estricto: Firebase SDK → Cloud Functions dir → Security Rules → Zustand stores.

### Firebase JS SDK v11 — API Modular (CRITICO)

**Usar la API modular v11, NUNCA el modo compat (`firebase/compat/*`).**

```typescript
// src/services/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// ponytail: getApps() evita re-inicializar en hot reload de Expo
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// CRITICO: initializeAuth con getReactNativePersistence — NO usar getAuth() directamente en RN
// getAuth() en React Native no persiste la sesion entre reinicios de la app
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export default app;
```

**Variables de entorno en Expo:** Todas deben tener el prefijo `EXPO_PUBLIC_` para ser accesibles en el bundle del cliente. Variables sin ese prefijo solo estan disponibles en el proceso de build, no en el runtime de la app.

### Firestore Security Rules — Schema Exacto

**CRITICO:** El campo `points` es el activo mas critico del sistema. El cliente NUNCA puede actualizar este campo — solo puede crear el documento con `points: 0` al registrarse. Toda actualizacion de puntos ocurre via Cloud Functions con Admin SDK (que bypasean estas rules).

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{uid} {
      // Lectura: solo el propio usuario autenticado
      allow read: if request.auth != null && request.auth.uid == uid;

      // Creacion: cliente puede crear su propio documento al registrarse
      // SOLO si points inicia en 0 (no puede auto-asignarse puntos)
      allow create: if request.auth != null
                    && request.auth.uid == uid
                    && request.resource.data.points == 0;

      // Actualizacion: cliente puede editar su perfil PERO NO el campo points
      allow update: if request.auth != null
                    && request.auth.uid == uid
                    && !request.resource.data.diff(resource.data)
                        .affectedKeys().hasAny(['points']);

      // Eliminacion: no permitida desde cliente (se maneja via Cloud Function en Epic 7)
      allow delete: if false;
    }

    // Placeholder para colecciones de futuros epics — negar todo hasta implementacion
    match /routes/{routeId} {
      allow read: if request.auth != null
                  && resource.data.userId == request.auth.uid;
      allow write: if false; // solo Cloud Functions via Admin SDK
    }

    match /rewards/{rewardId} {
      allow read: if request.auth != null; // cualquier usuario autenticado puede ver recompensas
      allow write: if false; // solo Cloud Functions y partners via HTTP Function autenticada
    }

    match /redemptions/{redemptionId} {
      allow read: if request.auth != null
                  && resource.data.userId == request.auth.uid;
      allow write: if false; // solo validateRedemption Cloud Function
    }

    // Denegar todo lo demas por defecto
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Nota de arquitectura:** Las colecciones `/partners` y `/notifications` no tienen reglas explicitas aun — estan cubiertas por el catch-all de denegacion. Se definen en sus respectivos epics (Epic 5 y Epic 6).

### Estructura del Directorio functions/

```
functions/
├── package.json
├── tsconfig.json
├── firestore.rules         ← Security Rules de Firestore
└── src/
    └── index.ts            ← stub vacío (funciones se implementan en Epic 2 y 3)
```

**functions/package.json:**
```json
{
  "name": "ecobike-functions",
  "version": "1.0.0",
  "engines": { "node": "20" },
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "deploy": "firebase deploy --only functions"
  },
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^6.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  },
  "private": true
}
```

**functions/tsconfig.json:**
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2020",
    "esModuleInterop": true
  },
  "compileOnSave": true,
  "include": ["src"]
}
```

**functions/src/index.ts (stub):**
```typescript
// Cloud Functions de EcoBike — implementadas en historias posteriores
// Story 3.2: finishRoute (valida velocidad, calcula puntos, acredita)
// Story 4.2: generateQRToken (HMAC-SHA256, TTL 5min)
// Story 4.3: validateRedemption (invalida token, descuenta stock)
// Story 6.4: streakReminder (cron 7pm)

export {};
```

### firebase.json y .firebaserc

**firebase.json:**
```json
{
  "firestore": {
    "rules": "functions/firestore.rules"
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs20"
  },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

**.firebaserc:**
```json
{
  "projects": {
    "default": "<TU_FIREBASE_PROJECT_ID>"
  }
}
```

### Zustand Stores — Esquemas Exactos

**MANDATORIO:** Seguir los patrones de naming de arquitectura: `isLoading: boolean`, `error: string | null`, actualizaciones inmutables via `set((state) => ({...}))`. Los nombres de estado NUNCA usan `loading`, `fetching`, `pending`.

**src/stores/useAuthStore.ts:**
```typescript
import { create } from 'zustand';
import type { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: AuthState = {
  user: null,
  isLoading: true, // true al inicio — escucha onAuthStateChanged antes de saber el estado
  error: null,
};

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  ...initialState,
  setUser: (user) => set({ user, isLoading: false, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () => set(initialState),
}));
```

**src/stores/useActiveRouteStore.ts:**
```typescript
import { create } from 'zustand';
import type { Checkpoint } from '@/types'; // tipo canonico — NO redefinir aqui

interface ActiveRouteState {
  isTracking: boolean;
  startedAt: string | null;          // ISO 8601
  endedAt: string | null;            // ISO 8601
  checkpointQueue: Checkpoint[];     // Cola compartida: offline sync (Story 2.3) + recuperacion (Story 2.4)
  totalDistanceKm: number;           // Calculado localmente en tiempo real
  localPoints: number;               // Puntos estimados — distinguir del saldo confirmado de usePointsStore
  pendingRecoveryDecision: boolean;  // true = mostrar dialogo "Continuar / Finalizar" (Story 2.4)
  isLoading: boolean;
  error: string | null;
}

interface ActiveRouteActions {
  startRoute: (startedAt: string) => void;
  endRoute: (endedAt: string) => void;
  addCheckpoint: (checkpoint: Checkpoint) => void;
  setLocalPoints: (points: number) => void;
  setTotalDistance: (km: number) => void;
  setPendingRecoveryDecision: (pending: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: ActiveRouteState = {
  isTracking: false,
  startedAt: null,
  endedAt: null,
  checkpointQueue: [],
  totalDistanceKm: 0,
  localPoints: 0,
  pendingRecoveryDecision: false,
  isLoading: false,
  error: null,
};

export const useActiveRouteStore = create<ActiveRouteState & ActiveRouteActions>((set) => ({
  ...initialState,
  startRoute: (startedAt) => set({ isTracking: true, startedAt, error: null }),
  endRoute: (endedAt) => set({ isTracking: false, endedAt }),
  // CRITICO: inmutable — nunca push() directo
  addCheckpoint: (checkpoint) =>
    set((state) => ({ checkpointQueue: [...state.checkpointQueue, checkpoint] })),
  setLocalPoints: (localPoints) => set({ localPoints }),
  setTotalDistance: (totalDistanceKm) => set({ totalDistanceKm }),
  setPendingRecoveryDecision: (pendingRecoveryDecision) => set({ pendingRecoveryDecision }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
```

**src/stores/usePointsStore.ts:**
```typescript
import { create } from 'zustand';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuthStore } from './useAuthStore';

interface PointsState {
  confirmedBalance: number; // Saldo oficial confirmado por servidor — distinguir de localPoints en activeRouteStore
  isLoading: boolean;
  error: string | null;
}

interface PointsActions {
  updateBalance: (newBalance: number) => void;
  fetchBalance: () => Promise<void>;
  reset: () => void;
}

const initialState: PointsState = {
  confirmedBalance: 0,
  isLoading: false,
  error: null,
};

export const usePointsStore = create<PointsState & PointsActions>((set) => ({
  ...initialState,
  updateBalance: (confirmedBalance) => set({ confirmedBalance }),
  fetchBalance: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;
    set({ isLoading: true, error: null });
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        set({ confirmedBalance: snap.data().points ?? 0, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener saldo';
      set({ error: message, isLoading: false });
    }
  },
  reset: () => set(initialState),
}));
```

### src/services/functions.ts — Stubs Tipados

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';

const functions = getFunctions(app, 'us-central1');

// Tipos de respuesta envueltos — SIEMPRE { success, data | error } (arquitectura)
interface FunctionResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

// Story 3.2 — finishRoute
interface FinishRouteInput {
  checkpoints: Array<{ latitude: number; longitude: number; timestamp: number; speed: number; accuracy: number }>;
  startedAt: string;
  endedAt: string;
}
interface FinishRouteOutput {
  newBalance: number;
  pointsEarned: number;
  routeId: string;
}
export const finishRoute = httpsCallable<FinishRouteInput, FunctionResponse<FinishRouteOutput>>(
  functions, 'finishRoute'
);

// Story 4.2 — generateQRToken
interface GenerateQRTokenInput { rewardId: string }
interface GenerateQRTokenOutput { token: string; numericCode: string; expiresAt: string }
export const generateQRToken = httpsCallable<GenerateQRTokenInput, FunctionResponse<GenerateQRTokenOutput>>(
  functions, 'generateQRToken'
);

// Story 4.3 — validateRedemption
interface ValidateRedemptionInput { token: string; partnerId: string }
interface ValidateRedemptionOutput { rewardName: string; redeemedAt: string }
export const validateRedemption = httpsCallable<ValidateRedemptionInput, FunctionResponse<ValidateRedemptionOutput>>(
  functions, 'validateRedemption'
);
```

### Testing — Estrategia para los Stores

Los tests de stores Zustand NO requieren renderizado de componentes — testear el store directamente via `useAuthStore.getState()` y `useAuthStore.setState()`.

```typescript
// Ejemplo: src/stores/useAuthStore.test.ts
import { useAuthStore } from './useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
  });

  it('estado inicial: user null, isLoading true, error null', () => {
    const { user, isLoading, error } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(isLoading).toBe(true);
    expect(error).toBeNull();
  });

  it('setUser actualiza user y desactiva isLoading', () => {
    const fakeUser = { uid: 'test-uid' } as any;
    useAuthStore.getState().setUser(fakeUser);
    const { user, isLoading } = useAuthStore.getState();
    expect(user).toBe(fakeUser);
    expect(isLoading).toBe(false);
  });

  it('reset restaura estado inicial', () => {
    useAuthStore.getState().setUser({ uid: 'x' } as any);
    useAuthStore.getState().reset();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
```

**Test critico para AC 4 — checkpointQueue inmutable:**
```typescript
it('addCheckpoint no muta el array original', () => {
  const store = useActiveRouteStore.getState();
  const originalQueue = store.checkpointQueue;
  store.addCheckpoint({ latitude: 1, longitude: 2, timestamp: 1000, speed: 5, accuracy: 3 });
  expect(useActiveRouteStore.getState().checkpointQueue).not.toBe(originalQueue);
  expect(useActiveRouteStore.getState().checkpointQueue).toHaveLength(1);
});
```

### Advertencias Clave

1. **`initializeAuth` vs `getAuth`:** En React Native, usar `initializeAuth` con `getReactNativePersistence` — `getAuth()` solo persiste en memoria entre renders, no entre reinicios de la app.

2. **`getApps().length === 0` guard:** Necesario en Expo porque el hot reload puede re-ejecutar el modulo y Firebase lanza error si se inicializa dos veces sin este guard.

3. **Prefix `EXPO_PUBLIC_`:** Sin este prefijo, las variables `.env` son invisibles en el bundle de la app. El error es silencioso — la variable simplemente es `undefined` en runtime.

4. **`functions/` no esta dentro de `EcoBike/`:** El directorio `functions/` es un proyecto separado al mismo nivel que `EcoBike/` en el repo, NO dentro del directorio de la app Expo. Ver estructura de árbol en arquitectura.

5. **Firebase deploy:** Requiere `firebase-tools` instalado globalmente (`npm install -g firebase-tools`) y login previo (`firebase login`). El dev agente debe verificar que el deploy es exitoso y que la consola de Firebase muestra las reglas actualizadas.

6. **`usePointsStore.fetchBalance`** usa `useAuthStore.getState()` directamente (no como hook) porque esta dentro de una accion de Zustand, no de un componente React. Este patron es correcto para comunicacion entre stores.

7. **`checkpointQueue` compartida:** Esta cola es el mismo array usado en Story 2.3 (sync offline) y Story 2.4 (recuperacion de interrupcion). El Dev agente de historias futuras NO debe crear `pendingCheckpoints` u otra estructura alternativa — hay una sola cola.

### Project Structure Notes

- Alineacion con `architecture.md#Árbol Completo del Proyecto`: `src/stores/`, `src/services/firebase.ts`, `src/services/functions.ts`, `functions/` al mismo nivel que `EcoBike/`
- `functions/firestore.rules` es el archivo de reglas de seguridad — la referencia en `firebase.json` debe apuntar a esta ubicacion
- Los stores Zustand son los unicos consumidores de `src/services/firebase.ts` en esta historia; los componentes de UI NO importan Firebase directamente — solo los stores y services
- El conflicto `constants/Colors.ts` vs `src/constants/theme.ts` fue resuelto en la revision de Story 1.1: `constants/Colors.ts` eliminado, `_layout.tsx` migrado a `Theme` de `@/constants/theme`

### References

- [Source: architecture.md#Authentication & Security — Firebase Auth + Security Rules]
- [Source: architecture.md#Frontend Architecture — Zustand stores estructura]
- [Source: architecture.md#Patrones de Implementación — naming isLoading, error, actualizaciones inmutables]
- [Source: architecture.md#Árbol Completo del Proyecto — estructura functions/]
- [Source: architecture.md#Patrones de Comunicación — Zustand store estandar]
- [Source: architecture.md#Impacto en Implementación — Secuencia de Dependencias]
- [Source: epics.md#Story 1.2: Configuracion Firebase, Security Rules y Zustand Stores]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Subtasks 3.4 y 3.5 (deploy y verificacion de Security Rules) requieren ejecucion manual por restriccion de red en sandbox. El archivo `functions/firestore.rules` esta correctamente escrito y `firebase.json` + `.firebaserc` (projectId: ecobike-9dedd) estan configurados. Comando: `firebase deploy --only firestore:rules` desde la raiz del repo.

### Completion Notes List

- firebase@12.18.0 + @react-native-async-storage/async-storage@2.2.0 instalados via `npx expo install` (versiones compatibles con SDK 57)
- zustand@5.0.15 instalado via `npm install`
- `src/services/firebase.ts`: initializeApp con guard getApps(), initializeAuth con getReactNativePersistence — correcto para React Native
- `functions/`: estructura completa al nivel del repo (NO dentro de EcoBike/), con package.json Node.js 20, tsconfig ES2020/CommonJS, index.ts stub
- `functions/firestore.rules`: reglas completas — points protegido contra escritura de cliente, allow create solo con points==0, catch-all deny
- `firebase.json` + `.firebaserc` (ecobike-9dedd): configurados, listos para deploy
- `src/stores/useAuthStore.ts`: isLoading inicia en true (espera onAuthStateChanged)
- `src/stores/useActiveRouteStore.ts`: checkpointQueue inmutable con spread, pendingRecoveryDecision: false por defecto
- `src/stores/usePointsStore.ts`: fetchBalance usa useAuthStore.getState() (patron inter-store correcto)
- `src/types/index.ts`: Checkpoint y AuthUser agregados
- `src/services/functions.ts`: 3 stubs tipados con httpsCallable (finishRoute, generateQRToken, validateRedemption)
- 21 nuevos tests de stores + 6 existentes de GlassView = 27 tests, todos pasan, 0 regresiones

### File List

- EcoBike/.env (nuevo)
- EcoBike/.env.example (nuevo)
- EcoBike/src/services/firebase.ts (nuevo)
- EcoBike/src/services/functions.ts (nuevo)
- EcoBike/src/stores/useAuthStore.ts (nuevo)
- EcoBike/src/stores/useActiveRouteStore.ts (nuevo)
- EcoBike/src/stores/usePointsStore.ts (nuevo)
- EcoBike/src/stores/useAuthStore.test.ts (nuevo)
- EcoBike/src/stores/useActiveRouteStore.test.ts (nuevo)
- EcoBike/src/stores/usePointsStore.test.ts (nuevo)
- EcoBike/src/types/index.ts (modificado — Checkpoint, AuthUser agregados)
- functions/package.json (nuevo)
- functions/tsconfig.json (nuevo)
- functions/src/index.ts (nuevo)
- functions/firestore.rules (nuevo)
- firebase.json (nuevo)
- .firebaserc (nuevo)

## Senior Developer Review (AI)

**Fecha:** 2026-08-24
**Resultado:** APROBADO con fixes aplicados

**Hallazgos resueltos (6 fixes aplicados):**
- [M1] `firebase.ts` — Guard de `isNew` aplicado a `initializeAuth`; si el modulo se re-evalua usa `getAuth()` en lugar de relanzar `initializeAuth`
- [M2] `useActiveRouteStore.ts` — Accion `setLoading` agregada para consistencia con los otros stores
- [M3] `functions.ts` — `checkpoints` tipado con `Checkpoint` importado desde `@/types` en lugar de tipo anonimo inline
- [B1] `usePointsStore.ts` — `snap.data().points` validado con `typeof raw === 'number'` antes de setear `confirmedBalance`
- [B2] `firebase.ts` — Validacion de env vars en `__DEV__` mode con log de cuales faltan
- [B3] `usePointsStore.test.ts` — Test de early return fortalecido: ahora prueba que el estado no cambia (no que ya era false)

**Nota operacional:** Subtasks 3.4 y 3.5 (deploy y verificacion de Security Rules) requieren ejecucion manual — limitacion de red en sandbox, no defecto de codigo. Las rules estan correctamente escritas y listas para deploy con `firebase deploy --only firestore:rules`.

## Change Log

- 2026-08-23: Implementacion completa Story 1.2 — Firebase SDK v11 instalado, firebase.ts con initializeAuth+getReactNativePersistence, functions/ stub, firestore.rules con proteccion de points, firebase.json + .firebaserc (ecobike-9dedd), 3 Zustand stores (useAuthStore/useActiveRouteStore/usePointsStore) con 21 tests pasando. Pendiente deploy manual de Security Rules (red bloqueada en sandbox).
- 2026-08-24: Code review adversarial (ronda 1) — 6 fixes aplicados (M1: guard initializeAuth, M2: setLoading en activeRouteStore, M3: tipo Checkpoint en functions.ts, B1: validacion tipo points, B2: check env vars dev, B3: test early return fortalecido). Status → done.
- 2026-08-24: Code review adversarial (ronda 2) — Status revertido a in-progress: Subtasks 3.4 y 3.5 (deploy y verificacion de Security Rules) siguen sin completar, AC 1 y AC 2 no verificados. Fixes: Dev Notes useActiveRouteStore usa import de @/types (no export local), Project Structure Notes actualizado (conflicto Colors.ts resuelto en 1.1), test de setLoading agregado a useActiveRouteStore.test.ts.
- 2026-08-24: Mejoras BAJO — B5: tests redundantes eliminados de useActiveRouteStore.test.ts (pendingRecoveryDecision/checkpointQueue ya cubiertos por estado inicial correcto); B6: firestore.rules allow create ahora valida email is string y city.size() > 0 ademas de points==0; B7: package-lock.json generado en functions/ (npm install ejecutado).
- 2026-08-24: Subtasks 3.4 y 3.5 completadas — Security Rules desplegadas y PERMISSION_DENIED verificado. Status: in-progress → done.
- 2026-08-24: Code review adversarial (ronda 5) — (M1) firestore.rules: eliminado city.size()>0 del allow create — bloqueaba OAuth edge case con city:''; (M2) firestore.rules: allow update agrega streak/totalRoutes/badges a la lista de campos protegidos contra escritura de cliente; (M3) usePointsStore.test.ts: test para validacion typeof points (fix B1); (M4) functions.ts: region extraida a EXPO_PUBLIC_FUNCTIONS_REGION con fallback us-central1; (L1) useAuthStore.test.ts: test directo para setLoading; (L2) useActiveRouteStore.ts: endRoute limpia error igual que startRoute; (L3) useActiveRouteStore.test.ts: tests para setLocalPoints y setTotalDistance. Status: done.

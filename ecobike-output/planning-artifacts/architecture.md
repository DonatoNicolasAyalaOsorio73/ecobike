---
stepsCompleted: ['step-01-init', 'step-02-context', 'step-03-starter', 'step-04-decisions', 'step-05-patterns', 'step-06-structure', 'step-07-validation', 'step-08-complete']
lastStep: 8
status: 'complete'
completedAt: '2026-08-21'
inputDocuments:
  - 'ecobike-output/planning-artifacts/prd.md'
  - 'ecobike-output/planning-artifacts/prd-validation-report.md'
  - 'ecobike-output/brainstorming/brainstorming-session-2026-08-20.md'
workflowType: 'architecture'
project_name: 'EcoBike'
user_name: 'DONA'
date: '2026-08-21'
---

# Architecture Decision Document — EcoBike

_Este documento se construye de forma colaborativa paso a paso. Las secciones se agregan conforme avanzamos en cada decisión arquitectónica juntos._

## Análisis de Contexto del Proyecto

### Resumen de Requisitos

**Requisitos Funcionales (24 FRs en 8 áreas):**

- **Tracking de Rutas (FR-001–004):** GPS background sin pérdida de datos ante cualquier interrupción. Offline completo durante el pedaleo, sincronización diferida. Validación de velocidad anti-trampa (>30 km/h sostenidos).
- **Sistema de Puntos (FR-005–008):** Acumulación local en tiempo real con feedback háptico/visual. Cálculo y escritura exclusiva en servidor al finalizar ruta. Sin expiración — arquitectura append-only en logs de puntos.
- **Recompensas y Canje (FR-009–011):** Tokens QR de un solo uso (5 min) generados por servidor. Mapa geolocalizado con stock en tiempo real. Código numérico de respaldo.
- **Partners (FR-012, FR-013, FR-018):** Panel web para gestión de inventario. Propagación de cambios al mapa de usuarios en ≤30s. Validación de canje en servidor — cliente nunca decide validez.
- **Onboarding y Perfil (FR-014, FR-015, FR-019, FR-020):** Registro mínimo (email + ciudad). Restauración completa de perfil cross-device. Encuesta NPS post-ruta con throttling (1 vez/30 días).
- **Gamificación (FR-021):** Racha de días consecutivos con lógica de días calendario.
- **Notificaciones (FR-022–024):** Tres tipos con reglas de negocio estrictas: max 1/día/usuario, ventana nocturna bloqueada, sin notificaciones durante rutas activas.
- **Privacidad (FR-016–017):** Exportación y eliminación de datos por el usuario. Restricción de edad (COPPA) con bloqueo de funciones sociales <13 años.

**Requisitos No Funcionales (12 NFRs en 5 categorías):**

- **Rendimiento:** App útil en <1s (caché local), puntos acreditados en <3s, mapa de recompensas actualizado en <30s.
- **Confiabilidad:** 0 rutas perdidas por interrupción (protocolo de prueba obligatorio pre-release). Sincronización no silenciosa — usuario notificado si falla en 60s.
- **Seguridad:** Saldo read-only en cliente. QR tokens expiran en 5 min y se invalidan al primer uso. Rate limiting: 5 rutas/usuario/hora.
- **Privacidad:** Sin trazas GPS brutas en servidor (solo métricas derivadas). Datos B2G solo como agregados anónimos por zona.
- **Escalabilidad:** 500 marcadores simultáneos a ≥60fps en dispositivo mínimo. 1,000 usuarios concurrentes sincronizando rutas sin degradar NFR-002.

**Escala y Complejidad:**

- Dominio primario: mobile_app (iOS + Android) + web (panel de partners)
- Nivel de complejidad: low (app de consumo con modelo de datos moderado)
- Componentes arquitectónicos estimados: ~8 (GPS service, sync engine, points engine, rewards map, QR token service, push notification service, partner panel, B2G pipeline)

### Restricciones Técnicas y Dependencias

- **Brownfield:** App React Native + Expo existente con tracking GPS y sistema de puntos básico. Las decisiones arquitectónicas deben evolucionar lo existente, no reemplazarlo.
- **Backend:** Firebase/Firestore como plataforma de persistencia y sincronización en tiempo real (ya en uso).
- **Plataforma:** iOS 14+ (background location confiable), Android 8+ (API 26, notificación persistente para background service en Android 9+).
- **Dispositivo mínimo:** iPhone SE 2020 (375px), 150MB disponibles, GPS hardware requerido.
- **Compliance:** Background location declaration para App Store y Google Play con redacción específica ya definida en PRD.

### Preocupaciones Transversales Identificadas

1. **Gestión de estado online/offline** — toda la app debe funcionar offline y reconciliar estado al reconectar
2. **Autenticación y sesión persistente** — email/Google OAuth con contexto de usuario disponible en todas las superficies
3. **Seguridad de puntos** — separación estricta lectura (cliente) / escritura (servidor) en el sistema de puntos
4. **Sincronización en tiempo real** — recompensas, stock y notificaciones requieren propagación inmediata multi-dispositivo
5. **Privacidad by design** — anonimización de rutas en el punto de captura, no post-hoc
6. **Integridad de tokens** — QR tokens como sistema criptográfico stateful con auditoría

## Evaluación de Stack Base

### Dominio Tecnológico Principal

Mobile universal (iOS + Android + Web) — React Native + Expo con soporte web habilitado.
Arquitectura brownfield: el prototipo React+Vite existente migra su lógica Firebase al nuevo Expo app. El prototipo web puede coexistir como demo/landing.

### Stack Base Seleccionado: Expo SDK 57 + Expo Router

**Justificación:**
- Único stack que cumple GPS background, háptico, App Store/Play Store compliance (requisitos del PRD)
- Expo Router 57 genera rutas nativas y web desde el mismo árbol de archivos — cubre el panel de partners web sin proyecto separado
- Web production-grade desde SDK 54 — Metro como bundler universal
- Firebase JS SDK v11 (ya instalado en el prototipo) es compatible con Expo para Auth + Firestore + Storage

**Comando de inicialización:**

```bash
npx create-expo-app@latest EcoBike --template tabs
```

### Decisiones Arquitectónicas de Sub-Paquetes (ADRs)

**ADR-001: Firebase JS SDK v11** ✅
- Seleccionado sobre react-native-firebase por: zero prebuild config, migración directa desde prototipo, Expo Go funciona en desarrollo sin dev client.
- Reevaluar react-native-firebase si se requiere Crashlytics o Performance Monitoring post-MVP.

**ADR-002: Expo Router 57** ✅
- Seleccionado sobre React Navigation por: rutas web automáticas (panel de partners sin proyecto separado), deep linking automático por estructura de archivos, SSR disponible desde SDK 56+.
- Layouts `(auth)` y `(tabs)` para flujo de autenticación y navegación principal.

**ADR-003: AsyncStorage para checkpoints GPS** ✅
- Seleccionado sobre MMKV por: zero prebuild config, pipeline de EAS más simple, velocidad suficiente para escrituras cada 30s.
- Reevaluar MMKV si profiling muestra bottleneck en escritura de checkpoints GPS.

**ADR-004: react-native-maps (iOS/Android) + react-leaflet (web)** ✅
- Seleccionado sobre Mapbox por: costo cero, react-leaflet ya instalado en prototipo, conditional import por `Platform.OS` es patrón estándar en Expo.
- Reevaluar Mapbox si se necesitan vector tiles o isochronas para el módulo B2G.

**Paquetes requeridos adicionales:**
- `expo-location@57` + `expo-task-manager` — GPS background con servicio persistente
- `expo-haptics` — feedback háptico por km completado
- `expo-notifications` — push notifications con reglas de negocio del PRD
- `expo-secure-store` — almacenamiento seguro de tokens de sesión
- `expo-camera` — escaneo QR en panel de partners

**Nota:** La primera historia de implementación debe ser la inicialización del proyecto Expo con `create-expo-app` y la migración de la lógica Firebase existente del prototipo web.

## Decisiones Arquitectónicas Core

### Análisis de Prioridad

**Decisiones Críticas (bloquean implementación):**
- Lógica de servidor: Firebase Cloud Functions (Callable + HTTP)
- Seguridad de puntos: Firestore Security Rules con restricción de escritura en cliente
- Modelo de datos Firestore: 6 colecciones principales

**Decisiones Importantes (dan forma a la arquitectura):**
- State management: Zustand (authStore, activeRouteStore, pointsStore)
- Real-time rewards: Firestore onSnapshot listener
- Offline persistence: Firestore built-in + AsyncStorage para GPS checkpoints

**Diferidas (post-MVP):**
- react-native-firebase (si se necesita Crashlytics post-launch)
- Módulo B2G de exportación de datos municipales

### Data Architecture

**Firestore Collections:**
- `/users/{uid}` — perfil, saldo de puntos (read-only desde cliente), racha de días consecutivos
- `/routes/{routeId}` — rutas completadas: métricas derivadas únicamente (km, duración, pts). Sin trazas GPS brutas (NFR-009).
- `/rewards/{rewardId}` — catálogo con geolocalización, stock, partnerId, estado activo/pausado
- `/partners/{partnerId}` — perfil de negocio, métricas de canjes, rating
- `/redemptions/{redemptionId}` — log de auditoría: token, userId, partnerId, timestamp, status (para detección de fraude)
- `/notifications/{notifId}` — cola de notificaciones con reglas de throttling (max 1/día/usuario)

**Caching:**
- Firestore offline persistence (automático en SDK mobile) — caché de rewards y perfil entre sesiones
- AsyncStorage — checkpoints GPS cada 30s durante ruta activa (independiente de Firestore)

**Sincronización offline:**
- Ruta activa: AsyncStorage local → Cloud Function al terminar o recuperar conexión
- Puntos locales (estimados) mostrados al usuario durante la ruta → ajustados por valor del servidor al sincronizar

### Authentication & Security

**Auth:** Firebase Auth — email/contraseña + Google OAuth. Sesión persistente automática entre sesiones.

**Seguridad de puntos (Firestore Security Rules):**
El campo `points` en `/users/{uid}` es escribible únicamente por Cloud Functions con privilegios de Admin SDK. El cliente tiene permiso de lectura exclusivamente sobre su propio documento. Cero excepciones.

**QR Tokens:**
Generados por Callable Function en el momento del canje. Token = UUID v4 + HMAC-SHA256 firmado con secret del servidor. Expiración: 5 minutos. Invalidación: escritura en `/redemptions/{token}` al primer uso exitoso — el token no puede ser reutilizado.

**Rate limiting:** Cloud Function `finishRoute` verifica máximo 5 rutas activas/usuario/hora antes de acreditar puntos (NFR-008).

**Validación de velocidad:** `finishRoute` analiza los checkpoints GPS del usuario y rechaza acreditar puntos si la velocidad promedio sostenida supera 30 km/h por más de 60 segundos consecutivos.

### API & Comunicación

**Callable Functions (iniciadas desde mobile):**
- `finishRoute(checkpoints, routeMetadata)` — valida velocidad, calcula puntos, escribe en servidor, retorna saldo actualizado
- `generateQRToken(rewardId)` — verifica saldo suficiente, crea token firmado con expiración 5 min
- `validateRedemption(token, partnerId)` — valida token, verifica no-uso previo, descuenta stock, invalida token

**HTTP Functions (panel web de partners):**
- `GET /rewards/:partnerId` — inventario del partner con stock actual
- `PATCH /rewards/:rewardId/stock` — actualizar unidades disponibles o pausar recompensa
- `GET /partners/:partnerId/metrics` — dashboard: canjes totales, ciclistas únicos, rating

**Real-time:**
Firestore `onSnapshot` en colección `/rewards` mientras la app está en primer plano — latencia ~1-2s, supera el NFR de ≤30s por amplio margen.

### Frontend Architecture

**State Management: Zustand**
- `authStore` — usuario autenticado, cargando, error de auth
- `activeRouteStore` — estado de ruta en curso: km acumulados, puntos locales estimados, checkpoints en memoria, timestamp de inicio
- `pointsStore` — saldo confirmado por servidor, historial reciente

**Offline-first pattern para rutas:**
1. Al iniciar ruta: `activeRouteStore` inicializa + AsyncStorage persiste checkpoint cada 30s
2. Al detectar ruta interrumpida al reabrir app: ofrecer "Continuar" o "Descartar"
3. Al terminar o recuperar conexión: llamar `finishRoute()` Callable Function con todos los checkpoints
4. Servidor retorna puntos definitivos → `pointsStore` se actualiza → UI ajusta desde optimista a confirmado

**Estructura de archivos Expo Router (archivo → ruta):**
```
app/
  (auth)/
    welcome.tsx       → /welcome
    sign-in.tsx       → /sign-in
    register.tsx      → /register
  (tabs)/
    index.tsx         → / (home/puntos)
    map.tsx           → /map
    profile.tsx       → /profile
  partner/
    [id]/
      dashboard.tsx   → /partner/:id/dashboard (web panel)
      rewards.tsx     → /partner/:id/rewards
```

### Infrastructure & Deployment

**Mobile:** EAS Build (eas.json existente) — builds iOS y Android en la nube con certificados gestionados
**Web (panel de partners):** Expo Router web → deploy en Netlify o EAS Hosting
**Cloud Functions:** Firebase Cloud Functions Node.js 20 — mismo proyecto Firebase
**Push Notifications:** Firebase Cloud Messaging (FCM) + expo-notifications — integración directa con Firebase Auth para targeting por UID
**Monitoring:** Firebase Crashlytics (vía Firebase JS SDK en web, react-native-firebase post-MVP en mobile)

### Impacto en Implementación — Secuencia de Dependencias

1. **Firebase Cloud Functions setup** → habilita seguridad de puntos y generación de QR tokens (bloqueante para todo lo demás)
2. **Firestore Security Rules** → protege puntos antes de cualquier UI que los muestre
3. **`activeRouteStore` + AsyncStorage GPS** → tracking offline con checkpoints
4. **Callable Function `finishRoute`** → cierre de ruta y acreditación de puntos en servidor
5. **Callable Function `generateQRToken` + `validateRedemption`** → canje funcional end-to-end
6. **`onSnapshot` rewards listener** → mapa de recompensas en tiempo real
7. **expo-notifications + FCM** → push con reglas de negocio (max 1/día, ventana horaria)

## Patrones de Implementación y Reglas de Consistencia

### Puntos de Conflicto Identificados

8 áreas donde agentes de IA distintos tomarían decisiones incompatibles sin especificación explícita.

### Patrones de Naming

**Firestore — Colecciones (plural, camelCase):**
```
✅  /users  /routes  /rewards  /partners  /redemptions
❌  /Users  /Route   /Reward   /Partner   /Redemption
```

**Firestore — Campos (camelCase):**
```
✅  userId, totalPoints, createdAt, isActive, partnerId
❌  user_id, total_points, created_at, is_active, partner_id
```

**Archivos de componentes/pantallas (PascalCase):**
```
✅  MapScreen.tsx  RewardCard.tsx  ActiveRouteBar.tsx
❌  map-screen.tsx  reward_card.tsx
```

**Archivos de rutas Expo Router (kebab-case — se convierten en URLs):**
```
✅  app/sign-in.tsx       → /sign-in
✅  app/(tabs)/map.tsx    → /map
❌  app/SignIn.tsx        ← no PascalCase en route files
```

**Hooks (camelCase con prefijo `use`):**
```
✅  useRouteTracking.ts  useRewardMap.ts  usePointsSync.ts
❌  RouteTracking.ts     rewardMap.ts
```

**Stores Zustand (hook exportado como `use[Name]Store`):**
```
✅  useAuthStore  useActiveRouteStore  usePointsStore
❌  authStore     activeRoute          PointsStore
```

**Cloud Functions (camelCase):**
```
✅  finishRoute  generateQRToken  validateRedemption
❌  finish_route  GenerateQRToken  validate-redemption
```

**TypeScript interfaces/types (PascalCase, sin prefijo `I`):**
```
✅  User  Route  Reward  Partner  Redemption  QRToken
❌  IUser  iRoute  TReward  UserInterface
```

### Patrones de Estructura

**Organización por feature, no por tipo:**
```
src/
  features/
    route-tracking/
      useRouteTracking.ts
      RouteTracker.tsx
      route-tracking.types.ts
    rewards/
      useRewardMap.ts
      RewardMarker.tsx
      RewardCard.tsx
  stores/
    useAuthStore.ts
    useActiveRouteStore.ts
    usePointsStore.ts
  services/
    firebase.ts          ← inicialización Firebase
    functions.ts         ← wrappers de Callable Functions
  types/
    index.ts             ← re-exporta todos los tipos
  constants/
    index.ts
```

**Tests: co-localizados junto al archivo que prueban:**
```
✅  MapScreen.tsx  +  MapScreen.test.tsx   (mismo directorio)
❌  __tests__/MapScreen.test.tsx           (carpeta separada)
```

**Código platform-specific: sufijos de plataforma:**
```
✅  MapView.tsx          ← shared/default
✅  MapView.native.tsx   ← iOS + Android
✅  MapView.web.tsx      ← Web (react-leaflet)
```

### Patrones de Formato

**Respuesta de Cloud Functions (siempre envuelta):**
```typescript
// ✅ Éxito
{ success: true, data: { points: 120, newBalance: 580 } }

// ✅ Error
{ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Max 5 rutas/hora' } }

// ❌ Nunca respuesta directa sin envoltorio
{ points: 120 }
```

**Fechas: Firestore Timestamp en servidor, ISO 8601 en cliente:**
```typescript
// ✅ En Cloud Functions:
createdAt: admin.firestore.FieldValue.serverTimestamp()

// ✅ En cliente (deserializar):
createdAt: timestamp.toDate().toISOString()  // "2026-08-21T10:30:00.000Z"

// ❌ Nunca timestamps numéricos en la UI
createdAt: 1724236200000
```

**Booleanos: siempre `boolean`, nunca 0/1:**
```typescript
✅  isActive: true   isVerified: false
❌  isActive: 1      isVerified: 0
```

### Patrones de Comunicación

**Zustand stores — estructura estándar obligatoria:**
```typescript
interface PointsStore {
  // State
  balance: number;
  isLoading: boolean;      // no "loading"
  error: string | null;    // no "err", siempre nullable

  // Actions
  fetchBalance: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  reset: () => void;
}
```

**Zustand — actualizaciones inmutables:**
```typescript
// ✅
set((state) => ({ checkpoints: [...state.checkpoints, newCheckpoint] }))

// ❌
state.checkpoints.push(newCheckpoint)
```

**Naming de estados de carga:**
```
✅  isLoading: boolean    (operaciones async principales)
✅  isSyncing: boolean    (sincronización en background)
❌  loading / fetching / load / pending
```

**Puntos optimistas durante ruta:**
```
activeRouteStore.localPoints   → visibles en UI durante ruta activa (estimados)
pointsStore.confirmedBalance   → visibles en todas las demás pantallas (del servidor)
```

### Patrones de Proceso

**Manejo de errores — try/catch con tipo explícito en todas las Callable Functions:**
```typescript
try {
  const result = await finishRoute(data);
  if (!result.success) {
    useActiveRouteStore.getState().setError(result.error.message);
    return;
  }
  usePointsStore.getState().updateBalance(result.data.newBalance);
} catch (err) {
  const message = err instanceof Error ? err.message : 'Error desconocido';
  useActiveRouteStore.getState().setError(message);
}
```

**Offline detection — verificar antes de sincronizar (no antes de iniciar ruta):**
```typescript
const isConnected = await NetInfo.fetch().then(s => s.isConnected);
if (isConnected) await syncRoute();
else scheduleSync();  // AsyncStorage queue
```

**Loading inicial: skeleton, no spinner:**
```typescript
✅  if (isLoading) return <RewardSkeleton />;
❌  if (isLoading) return <ActivityIndicator />;
```

### Todos los Agentes DEBEN

- Usar **camelCase** para campos Firestore y variables TypeScript — sin excepción
- Envolver todas las respuestas de Cloud Functions en `{ success, data | error }`
- Nombrar estados como `isLoading: boolean` y `error: string | null`
- Organizar código **por feature**, no por tipo
- Co-localizar tests junto al archivo que prueban
- Usar sufijos `.native.tsx` / `.web.tsx` para código platform-specific
- Deserializar Firestore Timestamps a ISO 8601 antes de pasarlos a la UI
- Solo actualizaciones inmutables en Zustand vía `set((state) => ({...}))`

### Anti-Patrones Prohibidos

```typescript
❌  { user_id: "abc", total_points: 100 }   // snake_case en Firestore
❌  return { points: 100 };                  // Function sin envoltorio
❌  state.checkpoints.push(item);            // mutación en Zustand
❌  createdAt: 1724236200000                 // timestamp numérico en UI
❌  error: ""                               // string vacío en lugar de null
❌  <ActivityIndicator size="large" />       // spinner en lugar de skeleton
```

## Estructura del Proyecto y Fronteras Arquitectónicas

### Árbol Completo del Proyecto

```
EcoBike/                              ← Expo app (nuevo)
├── app.json
├── eas.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── .env
├── .env.example
├── .gitignore
│
├── app/                              ← Expo Router (archivo = ruta)
│   ├── _layout.tsx                  ← Root layout: detecta auth, ruta interrumpida
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx              ← FR-014: primera pantalla con prueba social
│   │   ├── sign-in.tsx
│   │   ├── register.tsx             ← FR-014, FR-017: validación edad mínima 13
│   │   └── password-reset.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx              ← Tab bar con saldo de puntos siempre visible
│   │   ├── index.tsx                ← Home: puntos, iniciar ruta (FR-001, FR-005, FR-007, FR-021)
│   │   ├── map.tsx                  ← Mapa de recompensas geolocalizadas (FR-011)
│   │   └── profile.tsx              ← Perfil, historial, exportar datos (FR-016, FR-019, FR-020)
│   └── partner/
│       └── [id]/
│           ├── dashboard.tsx        ← FR-013: métricas de canjes (web panel)
│           └── rewards.tsx          ← FR-012, FR-018: inventario + validación QR (web panel)
│
├── src/
│   ├── features/                    ← Organización por feature (no por tipo)
│   │   ├── route-tracking/          ← FR-001 a FR-004
│   │   │   ├── useRouteTracking.ts  ← lógica GPS, checkpoints, interrupción
│   │   │   ├── RouteTracker.tsx     ← componente de tracking activo
│   │   │   ├── ActiveRouteBar.tsx   ← barra persistente durante ruta
│   │   │   ├── InterruptedRoute.tsx ← modal "Continuar o Descartar"
│   │   │   ├── route-tracking.types.ts
│   │   │   └── useRouteTracking.test.ts
│   │   ├── points/                  ← FR-005 a FR-008
│   │   │   ├── usePoints.ts
│   │   │   ├── PointsDisplay.tsx    ← saldo en todas las pantallas
│   │   │   ├── KilometerAnimation.tsx ← "+Xpts" flotante + háptico
│   │   │   └── points.types.ts
│   │   ├── rewards/                 ← FR-009 a FR-011
│   │   │   ├── useRewardMap.ts      ← onSnapshot listener
│   │   │   ├── RewardMarker.tsx     ← marcador en mapa
│   │   │   ├── RewardCard.tsx       ← detalle de recompensa
│   │   │   ├── QRCodeDisplay.tsx    ← FR-009: QR + código numérico respaldo
│   │   │   ├── RedeemFlow.tsx       ← flujo de 2 toques para canje
│   │   │   └── rewards.types.ts
│   │   ├── onboarding/              ← FR-014, FR-015
│   │   │   ├── FirstRouteBonus.tsx  ← puntos dobles + badge bienvenida
│   │   │   └── onboarding.types.ts
│   │   ├── gamification/            ← FR-021
│   │   │   ├── useStreak.ts
│   │   │   ├── StreakDisplay.tsx
│   │   │   └── gamification.types.ts
│   │   ├── partner-panel/           ← FR-012, FR-013, FR-018
│   │   │   ├── usePartnerDashboard.ts
│   │   │   ├── InventoryManager.tsx
│   │   │   ├── MetricsDashboard.tsx
│   │   │   ├── QRScanner.tsx        ← expo-camera para validación
│   │   │   └── partner.types.ts
│   │   ├── profile/                 ← FR-016, FR-017, FR-019, FR-020
│   │   │   ├── useProfile.ts
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── DataExport.tsx       ← FR-016: exportar/eliminar datos
│   │   │   ├── NPSSurvey.tsx        ← FR-020: throttle 1x/30 días
│   │   │   └── profile.types.ts
│   │   └── notifications/           ← FR-022 a FR-024
│   │       ├── useNotifications.ts  ← registro FCM + handlers
│   │       └── notifications.types.ts
│   │
│   ├── stores/
│   │   ├── useAuthStore.ts          ← usuario, isLoading, error
│   │   ├── useActiveRouteStore.ts   ← km, localPoints, checkpoints, isActive
│   │   └── usePointsStore.ts        ← confirmedBalance, historial
│   │
│   ├── services/
│   │   ├── firebase.ts              ← initializeApp, auth, db, storage
│   │   ├── functions.ts             ← wrappers tipados de Callable Functions
│   │   └── notifications.ts         ← expo-notifications setup + FCM token
│   │
│   ├── components/
│   │   ├── shared/
│   │   │   ├── Button.tsx
│   │   │   ├── Skeleton.tsx         ← loading states (no spinners)
│   │   │   └── ErrorBoundary.tsx
│   │   └── map/
│   │       ├── MapView.tsx          ← default (re-export condicional)
│   │       ├── MapView.native.tsx   ← react-native-maps (iOS/Android)
│   │       └── MapView.web.tsx      ← react-leaflet (web panel)
│   │
│   ├── types/
│   │   └── index.ts                 ← re-export de todos los tipos
│   └── constants/
│       └── index.ts
│
├── assets/
│   ├── images/
│   ├── fonts/
│   └── animations/                  ← Lottie para celebraciones
│
└── functions/                       ← Firebase Cloud Functions (Node.js 20)
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts                 ← exports de todas las functions
    │   ├── callable/
    │   │   ├── finishRoute.ts       ← FR-006: valida velocidad, calcula pts, escribe servidor
    │   │   ├── generateQRToken.ts   ← FR-009: HMAC-SHA256, expiración 5min
    │   │   └── validateRedemption.ts ← FR-018: invalida token, descuenta stock
    │   ├── http/
    │   │   ├── partnerRewards.ts    ← FR-012: GET/PATCH inventario
    │   │   └── partnerMetrics.ts    ← FR-013: GET dashboard métricas
    │   ├── scheduled/
    │   │   └── streakReminder.ts    ← FR-023: cron 7pm, push si racha activa y sin ruta hoy
    │   └── utils/
    │       ├── tokenSigning.ts      ← HMAC-SHA256 con Firebase Secret
    │       ├── velocityCheck.ts     ← FR-004: detecta >30km/h sostenidos
    │       └── rateLimiter.ts       ← NFR-008: 5 rutas/usuario/hora
    └── firestore.rules              ← points write-only por Admin SDK
```

### Fronteras Arquitectónicas

**Frontera 1 — Cliente mobile → Servidor (Callable Functions)**
- Entrada: checkpoints GPS, rewardId, token de canje
- Toda la validación ocurre en el servidor — el cliente nunca decide si un canje es válido
- Respuesta: `{ success, data | error }` tipado

**Frontera 2 — Panel web partner → Servidor (HTTP Functions)**
- Auth: Firebase Auth token en header `Authorization: Bearer {token}`
- Scope: partner solo puede leer/escribir sus propias recompensas (verificado por la Function)

**Frontera 3 — Servidor → Firestore (Admin SDK)**
- Único actor con permisos de escritura sobre `/users/{uid}.points`
- Firestore Security Rules niegan escritura de puntos desde cliente

**Frontera 4 — Cliente → Firestore (onSnapshot, lectura)**
- `/rewards` — listener en tiempo real mientras app está en primer plano
- `/users/{uid}` — lectura propia, suscripción para saldo actualizado

### Flujos de Datos — Escenarios Clave

**Ruta completada (FR-001, FR-006, NFR-004):**
```
GPS → AsyncStorage (cada 30s) → [interrupción posible] → recuperar checkpoints
→ finishRoute() Callable → velocityCheck + rateLimiter → escribir /routes + /users.points
→ onSnapshot → usePointsStore.confirmedBalance → UI actualiza
```

**Canje de recompensa (FR-009, FR-018):**
```
Toca recompensa → verificar balance suficiente (local)
→ generateQRToken() → /redemptions (status: pending) → QR con 5min TTL
→ Partner escanea → validateRedemption() → /redemptions (status: used), stock -1
→ onSnapshot rewards → mapa actualizado en todos los clientes en ~1-2s
```

**Push de racha (FR-023):**
```
Cloud Scheduler 7pm → streakReminder() → query /users where streakDays >= 3
→ filtrar quienes no tienen ruta hoy → FCM send via expo-notifications
→ máximo 1 notificación por usuario por día (verificar /notifications log)
```

### Flujo de Trabajo de Desarrollo

**Comandos de desarrollo local:**
```bash
npx expo start                        ← mobile (Expo Go o dev client)
npx expo start --web                  ← panel web de partners
firebase emulators:start              ← Firestore + Functions localmente
```

**Build y deploy:**
```bash
eas build --platform all              ← iOS + Android en la nube
npx expo export --platform web && netlify deploy  ← panel web
firebase deploy --only functions      ← Cloud Functions
firebase deploy --only firestore:rules ← Security Rules
```

## Resultados de Validación de Arquitectura

### Coherencia ✅

Sin decisiones contradictorias. Expo SDK 57, Firebase JS SDK v11, Zustand, Cloud Functions Node.js 20 y los paquetes de mapas operan sin conflictos de versión ni de modelo. Los patrones de naming y estructura son consistentes en todas las capas del stack.

### Cobertura de Requisitos ✅ — 24/24 FRs · 12/12 NFRs

| FR | Componente arquitectónico |
|----|--------------------------|
| FR-001 | `expo-location` + `useRouteTracking.ts` |
| FR-002 | `InterruptedRoute.tsx` + AsyncStorage checkpoints |
| FR-003 | AsyncStorage → `finishRoute()` Callable |
| FR-004 | `velocityCheck.ts` en Cloud Functions |
| FR-005 | `KilometerAnimation.tsx` + `expo-haptics` |
| FR-006 | `finishRoute.ts` Callable Function |
| FR-007 | `usePointsStore` + `PointsDisplay.tsx` |
| FR-008 | Modelo append-only en `/routes` |
| FR-009 | `generateQRToken.ts` + `QRCodeDisplay.tsx` |
| FR-010 | Campo `numericCode` en token, visible en `QRCodeDisplay.tsx` |
| FR-011 | `useRewardMap.ts` + `onSnapshot` + `MapView.native/web.tsx` |
| FR-012 | `InventoryManager.tsx` + `partnerRewards.ts` HTTP |
| FR-013 | `MetricsDashboard.tsx` + `partnerMetrics.ts` HTTP |
| FR-014 | `register.tsx` mínimo (email + ciudad) |
| FR-015 | `FirstRouteBonus.tsx` + lógica en `finishRoute.ts` |
| FR-016 | `DataExport.tsx` + Firestore delete |
| FR-017 | `register.tsx` validación edad + Firestore Rules |
| FR-018 | `validateRedemption.ts` + `QRScanner.tsx` |
| FR-019 | Firebase Auth + documento `/users/{uid}` |
| FR-020 | `NPSSurvey.tsx` + throttle en Firestore |
| FR-021 | `useStreak.ts` + actualización en `finishRoute.ts` |
| FR-022 | `finishRoute.ts` evalúa distancia a recompensa → FCM |
| FR-023 | `streakReminder.ts` Cloud Scheduler 7pm |
| FR-024 | Trigger en reward creation + `finishRoute.ts` |

Todos los NFRs de rendimiento (<1s, <3s, <30s), seguridad (puntos read-only, QR single-use, rate limiting), privacidad (sin trazas GPS brutas) y escalabilidad (500 marcadores, 1000 usuarios concurrentes) tienen soporte arquitectónico explícito.

### Gaps Identificados

**Importante — resolver antes de la primera historia de implementación:**

1. **`@react-native-community/netinfo`** — agregar a la lista de paquetes requeridos para detección de conectividad offline.

2. **Schema de colección `/notifications/{uid}/daily/{YYYY-MM-DD}`** — necesario para el throttling de push (max 1/día/usuario). Campos: `{ sentTypes: string[], count: number }`.

3. **Firestore Security Rules completas** — solo se especificó la regla de puntos. Las colecciones `/redemptions`, `/rewards` y `/partners` necesitan reglas explícitas antes del primer deploy a producción.

**Post-MVP:**
- react-native-firebase para Crashlytics en mobile
- Indexing de Firestore para queries de streak y notification log
- Testing con Firebase Emulators para Cloud Functions

### Checklist de Completitud

**✅ Análisis de Requisitos**
- [x] 24 FRs analizados y mapeados a componentes
- [x] 12 NFRs cubiertos por decisiones arquitectónicas
- [x] Restricciones técnicas identificadas (iOS 14+, Android 8+, GPS hardware)
- [x] 6 preocupaciones transversales mapeadas

**✅ Decisiones Arquitectónicas**
- [x] Stack base: Expo SDK 57 + Expo Router 57
- [x] 4 ADRs documentados con justificación y condiciones de reevaluación
- [x] Firebase Cloud Functions como capa de servidor (Callable + HTTP + Scheduled)
- [x] Firestore con offline persistence + onSnapshot para real-time
- [x] Zustand con 3 stores tipados

**✅ Patrones de Implementación**
- [x] 8 puntos de conflicto identificados y resueltos
- [x] Naming conventions para Firestore, archivos, stores, Functions, TypeScript
- [x] Formato de respuesta de Cloud Functions estandarizado
- [x] Patrones de error handling, loading states, offline detection y puntos optimistas

**✅ Estructura del Proyecto**
- [x] Árbol completo de directorios con todos los archivos
- [x] 24 FRs mapeados a archivos específicos
- [x] 4 fronteras arquitectónicas definidas
- [x] 3 flujos de datos clave documentados (ruta, canje, push)

### Estado de Preparación

**Estado: LISTO PARA IMPLEMENTACIÓN ✅**
**Nivel de confianza: Alto**

**Fortalezas clave:**
1. Seguridad by design — puntos nunca escribibles desde cliente, garantizado por Firestore Rules
2. Offline-first completo — ningún km puede perderse por diseño
3. Stack unificado — mismo codebase para mobile (iOS/Android) y web (panel de partners)
4. Firebase ecosystem cohesivo — Auth + Firestore + Functions + FCM sin fricción

**Primera acción de implementación:**
```bash
npx create-expo-app@latest EcoBike --template tabs
```
Seguido de (en orden): Firestore Security Rules → `finishRoute` Cloud Function → `activeRouteStore` + AsyncStorage GPS.

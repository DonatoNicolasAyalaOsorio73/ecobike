# EcoBike

Aplicacion de movilidad sostenible que recompensa viajes en bicicleta con puntos canjeables en comercios aliados.

**Repositorio:** [DonaGitCode/EcoBike](https://github.com/DonaGitCode/EcoBike)
**Autor:** Donato Nicolas Ayala Osorio

---

## Estado del Proyecto

| Capa | Tecnologia | Estado |
|------|-----------|--------|
| Prototipo web | React + Vite + Firebase | Funcional |
| App movil (rebuild) | Expo SDK 57 + React Native | En desarrollo |
| Backend | Firebase Cloud Functions Node.js 20 | En desarrollo |
| Panel de partners | Expo Router web | Planificado |

El repositorio contiene el **prototipo web original** (`src/`) y los **artefactos de planificacion BMAD** (`ecobike-output/`) del rebuild mobile nativo.

---

## Configuracion Inicial (Requerida)

La app no arranca sin credenciales reales de Firebase. Crear `.env` en la raiz:

```bash
cp .env.example .env
# Completar con credenciales del proyecto Firebase
```

Variables requeridas:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Opcional: emails de administradores separados por coma
VITE_ADMIN_EMAILS=admin@ejemplo.com
```

---

## Arquitectura — Prototipo Web (src/)

### Stack

- **Framework:** React 18 + TypeScript
- **Bundler:** Vite
- **Routing:** React Router v6 (BrowserRouter, rutas declarativas)
- **Backend:** Firebase JS SDK v11 (modular API — nunca el modo compat `firebase/compat/*`)
- **Auth:** Firebase Authentication — email/password
- **Base de datos:** Cloud Firestore
- **Storage:** Firebase Storage

### Decisiones de Implementacion

**Firebase SDK — API modular obligatoria**
Se usa exclusivamente la API modular v11 (`firebase/auth`, `firebase/firestore`, `firebase/storage`). El modo compat esta prohibido por penalizacion de bundle y deprecacion futura.

```typescript
// Correcto
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// Prohibido
import firebase from 'firebase/compat/app';
```

**Inicializacion de Firebase — falla en startup, no en runtime**
`FireDataBase.tsx` lanza error en startup si falta cualquier variable de entorno. No hay fallback a credenciales demo. Un `initializeApp` exitoso con proyecto falso falla silenciosamente en todos los reads/writes — mas dificil de diagnosticar que un error de startup.

**Auth state — `onAuthStateChanged`, nunca `currentUser` directo**
Firebase Auth restaura la sesion de forma asincrona al arrancar. Leer `auth.currentUser` de forma sincrona antes de que `onAuthStateChanged` dispare devuelve `null` aunque el usuario este autenticado.

```typescript
// Correcto — MyNavigation.tsx
useEffect(() => {
  const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
    setUser(user);
    setLoading(false);
  });
  return unsubscribe;
}, []);

// Prohibido — causa que usuarios autenticados vean pantalla de login en cada reload
const user = getAuth().currentUser; // null en cold start
```

**Errores de Firebase — nunca exponer `err.message` al usuario**
Los mensajes internos de Firebase incluyen codigos y rutas internas (`Firebase: Error (auth/email-already-in-use)`). Todos los errores pasan por `firebaseErrorToSpanish()` en `authService.ts` antes de mostrarse al usuario.

**Admin Panel — autorizacion por email allowlist**
`AdminPanel.tsx` verifica que `getAuth().currentUser` exista y que su email este en `VITE_ADMIN_EMAILS`. Los hooks de React van siempre al inicio del componente — los guards de acceso se ejecutan en el `useEffect` y en el render, nunca antes de los hooks.

```typescript
// Patron correcto — hooks primero, guards despues
const AdminPanel = () => {
  const currentUser = getAuth().currentUser;
  const [stores, setStores] = useState([]);     // hook antes del guard
  useEffect(() => {
    if (!currentUser) return;                    // guard dentro del effect
    fetchStores();
  }, [currentUser?.uid]);

  if (!currentUser) return <AccessDenied />;    // guard en render
  ...
};
```

### Estructura de Archivos

```
src/
  auth/
    Welcome.tsx              # Pantalla inicial con opciones de ingreso
    SignIn.tsx               # Login con email/password
    Register.tsx             # Registro de nueva cuenta
    PasswordResetScreen.tsx  # Recuperacion de contrasena
  screens/
    PointsScreen.tsx         # Dashboard: puntos acumulados y viajes
    MapScreen.tsx            # Ubicacion actual via Geolocation API
    FriendsScreen.tsx        # Leaderboard de usuarios por puntos
    UserScreen.tsx           # Perfil, estadisticas, logout
    AdminPanel.tsx           # Gestion de tiendas (solo admins)
  components/
    MyBlur.tsx               # Fondo animado efecto glassmorphism
    shared/
      BottomTabs/            # Navegacion inferior animada (React Native)
  hooks/
    usePath.tsx              # Calcula SVG path de tab bar (d3-shape)
  services/
    authService.ts           # firebaseErrorToSpanish(), getCurrentUser()
  constants/
    Colors.ts                # Tokens de color de la marca
    Screen.ts                # SCREEN_WIDTH para calculos de layout
  FireDataBase.tsx           # Inicializacion Firebase (falla si falta .env)
  MyNavigation.tsx           # Router raiz — onAuthStateChanged como guard
  App.tsx                    # Root: error boundary global
```

### Modelo de Datos Firestore (Prototipo)

**Coleccion `/users/{uid}`**
```typescript
{
  name: string,
  email: string,
  createdAt: Timestamp,
  points: number,      // solo lectura desde cliente
  rides: number,
  kilometers: number,
}
```

**Coleccion `/tiendas/{tiendaId}`** (gestionada por AdminPanel)
```typescript
{
  name: string,
  logo: string,
  pointsRequired: number,   // siempre number, nunca string
  latitude?: number,
  longitude?: number,
  address?: string,
  stock?: number,
}
```

**Reglas de Firestore (requeridas antes de deploy)**
- `/users/{uid}`: lectura solo del propio documento. Campo `points` no escribible desde cliente.
- `/tiendas/{tiendaId}`: lectura publica. Escritura solo con custom claim `isAdmin: true`.

---

## Arquitectura — App Mobile (Rebuild BMAD)

### Stack Objetivo

- **Framework:** Expo SDK 57 + Expo Router 3
- **Lenguaje:** TypeScript estricto
- **Estilos:** NativeWind v4 (Tailwind para React Native)
- **UI:** Sistema Liquid Glass con `expo-blur` como base
- **State:** Zustand (3 stores obligatorios)
- **Backend:** Firebase JS SDK v11 + Cloud Functions Node.js 20
- **Persistencia local:** AsyncStorage (checkpoints GPS), Expo SecureStore (tokens de sesion)
- **GPS:** `expo-location@57` + `expo-task-manager` (background tracking)
- **Notificaciones:** `expo-notifications` + Firebase Cloud Messaging
- **Camara:** `expo-camera` (escaneo QR en panel de partners)
- **Hapticos:** `expo-haptics` (feedback por km completado)
- **Mapas:** `react-native-maps` (iOS/Android) + `react-leaflet` (web)

### ADRs — Architecture Decision Records

**ADR-001: Firebase JS SDK v11 sobre react-native-firebase**
Seleccionado porque: zero prebuild config, Expo Go funciona en desarrollo sin dev client, migracion directa desde el prototipo web. Reevaluar si se requiere Crashlytics o Performance Monitoring post-MVP.

**ADR-002: Expo Router 57 sobre React Navigation**
Seleccionado porque: rutas web automaticas desde el mismo arbol de archivos (cubre panel de partners sin proyecto separado), deep linking automatico por estructura de archivos, SSR disponible desde SDK 56+. Layouts `(auth)` y `(tabs)` para separar flujos.

**ADR-003: AsyncStorage para checkpoints GPS**
Seleccionado sobre MMKV porque: zero prebuild config, pipeline EAS mas simple, suficiente para escrituras cada 30s. Reevaluar MMKV si profiling muestra bottleneck.

**ADR-004: react-native-maps + react-leaflet por plataforma**
Seleccionado sobre Mapbox porque: costo cero, react-leaflet ya instalado en prototipo. Import condicional via `Platform.OS`. Reevaluar Mapbox si se necesitan vector tiles o isochronas para el modulo B2G.

**ADR-005: Zustand sobre Redux/Context**
Tres stores obligatorios con estructura fija. Context no escala para estado de GPS que se actualiza cada segundo. Redux es overhead innecesario para este modelo de datos.

**ADR-006: Cloud Functions para toda escritura de puntos**
El campo `points` en `/users/{uid}` es de solo lectura desde el cliente — ninguna excepcion. Toda modificacion de saldo pasa por la Callable Function `finishRoute` con Admin SDK. Firestore Security Rules lo refuerzan a nivel de base de datos.

### Modelo de Datos Firestore (Mobile)

**`/users/{uid}`**
```typescript
{
  name: string,
  email: string,
  city: string,
  createdAt: Timestamp,
  points: number,           // read-only desde cliente. Admin SDK only.
  streakDays: number,       // racha de dias consecutivos con ruta completada
  ageGroup: 'minor' | 'adult',
  firstRouteCompleted: boolean,
}
```

**`/routes/{routeId}`**
```typescript
{
  userId: string,
  startedAt: Timestamp,
  endedAt: Timestamp,
  distanceKm: number,
  durationSeconds: number,
  pointsEarned: number,
  // SIN trazas GPS brutas (NFR-009 — privacidad)
}
```

**`/rewards/{rewardId}`**
```typescript
{
  partnerId: string,
  name: string,
  description: string,
  pointsRequired: number,
  stock: number,
  isActive: boolean,
  latitude: number,
  longitude: number,
  imageUrl: string,
}
```

**`/partners/{partnerId}`**
```typescript
{
  name: string,
  email: string,
  logoUrl: string,
  address: string,
  totalRedemptions: number,
  uniqueCyclists: number,
  averageRating: number,
}
```

**`/redemptions/{redemptionId}`**
```typescript
{
  token: string,          // UUID v4 + HMAC-SHA256
  userId: string,
  partnerId: string,
  rewardId: string,
  redeemedAt: Timestamp,
  status: 'pending' | 'used' | 'expired',
}
```

**`/notifications/{uid}/daily/{YYYY-MM-DD}`**
```typescript
{
  progressSent: boolean,    // max 1 notificacion de progreso por dia
  achievementSent: boolean, // max 1 notificacion de logro por dia
}
```

### Seguridad

**Puntos — inmutables desde cliente**
Firestore Security Rules bloquean cualquier `update` al campo `points` desde el cliente. El cliente puede crear el documento con `points: 0` al registrarse, pero no puede modificarlo despues. Solo Cloud Functions con Admin SDK pueden escribir ese campo.

**QR Tokens — criptografia server-side**
`generateQRToken` Callable Function genera `UUID v4 + HMAC-SHA256` firmado con secret del servidor. TTL: 5 minutos. Invalidacion: escritura en `/redemptions/{token}` al primer uso — permanente, sin posibilidad de reutilizacion.

**Rate limiting**
`finishRoute` verifica maximo 5 rutas activas por usuario por hora antes de acreditar puntos (NFR-008). El servidor rechaza la solicitud si se supera el limite.

**Validacion de velocidad anti-trampa**
`finishRoute` analiza los checkpoints GPS y rechaza acreditar puntos si velocidad promedio sostenida supera 30 km/h por mas de 60 segundos consecutivos.

**Privacidad GPS**
Las trazas GPS brutas nunca se almacenan en el servidor. Solo metricas derivadas: distancia total, duracion, puntos acreditados. Los datos de movilidad para uso municipal se exportan unicamente como agregados anonimos por zona geografica.

### Cloud Functions

**Callable (iniciadas desde mobile):**

| Funcion | Input | Logica | Output |
|---------|-------|--------|--------|
| `finishRoute` | `checkpoints[]`, `routeMetadata` | Valida velocidad, calcula puntos (1pt/km), detecta primera ruta (2x bonus), batch write atomico | `{ newBalance, pointsEarned, distanceKm, firstRoute }` |
| `generateQRToken` | `rewardId` | Verifica saldo suficiente, genera token HMAC-SHA256, TTL 5 min | `{ token, expiresAt }` |
| `validateRedemption` | `token`, `partnerId` | Verifica token valido y no usado, descuenta stock, invalida token, batch atomico | `{ success, rewardName }` |

**HTTP (panel web de partners):**

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/rewards/:partnerId` | GET | Inventario del partner con stock actual |
| `/rewards/:rewardId/stock` | PATCH | Actualizar unidades o pausar recompensa |
| `/partners/:partnerId/metrics` | GET | Dashboard: canjes, ciclistas unicos, rating |

**Scheduled:**

| Funcion | Cron | Logica |
|---------|------|--------|
| `streakReminder` | 7pm diario | Envia push si el usuario tiene racha activa >= 3 dias y no completo ruta ese dia |

### State Management — Zustand Stores

**`useAuthStore`**
```typescript
{
  user: AuthUser | null,
  isLoading: boolean,
  error: string | null,
  // acciones: setUser, setLoading, setError, reset
}
```

**`useActiveRouteStore`** (estado de ruta en curso)
```typescript
{
  tracking: boolean,
  startedAt: string | null,
  endedAt: string | null,
  distanceKm: number,
  localPoints: number,      // estimado local durante la ruta
  elapsedSeconds: number,
  checkpointQueue: Checkpoint[],         // unico array — sirve para GPS, offline sync y recovery
  pendingRecoveryDecision: boolean,      // ruta interrumpida detectada al reabrir
  // acciones: startRoute, endRoute, addCheckpoint, incrementElapsed, resetRoute
}
```

**`usePointsStore`** (saldo confirmado por servidor)
```typescript
{
  confirmedBalance: number,
  isLoading: boolean,
  error: string | null,
  // acciones: updateBalance, fetchBalance, reset
}
```

**Invariante critico:** `localPoints` en `useActiveRouteStore` es estimado optimista (1pt/km calculado localmente). `confirmedBalance` en `usePointsStore` es el valor oficial del servidor. La UI distingue visualmente entre ambos durante una ruta activa.

### GPS y Offline

**Ciclo de vida de una ruta:**

1. Usuario toca "Iniciar Ruta" → `requestForegroundPermissionsAsync()` → primer fix GPS con timeout 10s
2. `watchPositionAsync` (distanceInterval: 10m, timeInterval: 5s) → cada actualizacion llama `addCheckpoint()`
3. `addCheckpoint` → actualiza `checkpointQueue` en memoria Y persiste en AsyncStorage (`ecobike_active_route`) de forma async sin bloquear UI
4. `expo-task-manager` registra tarea background → continua capturando checkpoints con app minimizada
5. Al terminar: `finishRoute(checkpoints, metadata)` Callable Function → servidor retorna puntos definitivos → `usePointsStore` actualiza
6. Al detectar ruta interrumpida al reabrir: lee AsyncStorage → `pendingRecoveryDecision: true` → modal "Continuar / Descartar"

**Offline completo:** La ruta funciona sin conexion a internet. Los checkpoints se acumulan en AsyncStorage. `finishRoute` se llama al recuperar conexion o al terminar manualmente.

### Patrones de UI

**Sistema Liquid Glass**
Todos los componentes de superficie usan `expo-blur` BlurView como base. Fallback Android API < 31: `backgroundColor: 'rgba(255,255,255,0.92)'` sin blur.

**Componentes obligatorios (P0 — MVP critico):**
`GlassView`, `GPSStatusBadge`, `PointsFloat`, `RewardMarker`, `GlassTopBar`, `GlassBottomSheet`, `QRDisplay`

**Feedback háptico obligatorio:**
- `Impact.Medium` al completar cada kilometro
- `Notification.Success` al canje exitoso
- `Notification.Error` al canje fallido

**Accesibilidad:**
- Toque minimo 44x44px en todos los elementos interactivos (WCAG 2.1 AA)
- `AccessibilityInfo.isReduceMotionEnabled()` respeta preferencias del sistema
- Skeleton screens en lugar de spinners (patron obligatorio por arquitectura)

### Naming Conventions

| Elemento | Convencion | Ejemplo |
|----------|-----------|---------|
| Colecciones Firestore | plural, camelCase | `/users` `/routes` `/rewards` |
| Campos Firestore | camelCase | `userId`, `totalPoints`, `createdAt` |
| Archivos de componentes | PascalCase | `MapScreen.tsx`, `GlassView.tsx` |
| Archivos de rutas Expo Router | kebab-case | `sign-in.tsx`, `reward-map.tsx` |
| Hooks | `use` + PascalCase | `useRouteTracking.ts`, `useRewardMap.ts` |
| Stores Zustand | `use` + Name + `Store` | `useAuthStore`, `useActiveRouteStore` |
| Respuestas Cloud Functions | siempre envueltas | `{ success: boolean, data \| error }` |

### Estructura de Rutas Expo Router

```
app/
  (auth)/
    welcome.tsx          → /welcome
    sign-in.tsx          → /sign-in
    register.tsx         → /register
  (tabs)/
    index.tsx            → / (home — puntos y ruta activa)
    map.tsx              → /map (recompensas geolocalizadas)
    profile.tsx          → /profile
  partner/
    [id]/
      dashboard.tsx      → /partner/:id/dashboard
      rewards.tsx        → /partner/:id/rewards
      scan.tsx           → /partner/:id/scan (validacion QR)
src/
  features/
    route-tracking/      # GPS, checkpoints, Haversine, offline sync
    rewards/             # Mapa, canje QR, codigo numerico
    gamification/        # Racha, NPS, notificaciones
    auth/                # Registro, login, perfil
  stores/                # useAuthStore, useActiveRouteStore, usePointsStore
  services/              # firebase.ts, functions.ts (wrappers tipados)
  components/ui/         # GlassView, GPSStatusBadge, PointsFloat, etc.
  constants/             # glass.ts, theme.ts (tokens para Reanimated)
  types/                 # Checkpoint, AuthUser, etc.
functions/
  src/
    index.ts             # finishRoute, generateQRToken, validateRedemption, streakReminder
  firestore.rules        # Security Rules completas
  firebase.json          # Configuracion emuladores
```

### Secuencia de Dependencias de Implementacion

El orden de implementacion es estricto — cada paso desbloquea el siguiente:

1. **Inicializacion Expo + NativeWind** — entorno de UI listo (Story 1.1)
2. **Firebase + Security Rules + Zustand** — seguridad de puntos garantizada antes de cualquier UI (Story 1.2)
3. **Registro y Login** — flujo de autenticacion completo (Stories 1.3, 1.4)
4. **GPS foreground + `finishRoute`** — ruta basica funcional (Story 2.1)
5. **GPS background + offline + recovery** — confiabilidad de ruta (Stories 2.2, 2.3, 2.4, 2.5)
6. **Sistema de puntos + feedback** — ciclo de valor completo (Epic 3)
7. **Recompensas + QR + mapa** — canje funcional end-to-end (Epic 4)
8. **Panel de partners** — lado B2B de la plataforma (Epic 5)
9. **Gamificacion + Notificaciones** — retencion (Epic 6)
10. **Privacidad + COPPA** — compliance regulatorio (Epic 7)

---

## Setup Local — Prototipo Web

```bash
# Clonar
git clone https://github.com/DonaGitCode/EcoBike.git
cd EcoBike

# Instalar dependencias
npm install

# Configurar Firebase (requerido)
cp .env.example .env
# Editar .env con credenciales reales

# Desarrollo
npm run dev

# Build produccion
npm run build
```

---

## Decisiones de Privacidad y Compliance

| Requisito | Implementacion |
|-----------|---------------|
| COPPA — menores de 13 | Registro rechazado en `validateAge()`. Firestore Security Rules bloquean creacion de cuenta. |
| COPPA — 13-17 anos | `ageGroup: 'minor'` en `/users/{uid}`. Panel de Recompensas muestra banner informativo. Funcion `validateRedemption` puede verificar custom claim. |
| GPS — sin trazas brutas | Solo metricas derivadas en `/routes/`. `checkpointQueue` se elimina de AsyncStorage al sincronizar. |
| Exportacion de datos | Usuario puede exportar y eliminar todos sus datos de ubicacion desde perfil (Story 7.1). |
| Datos municipales | Solo agregados anonimos por zona geografica. Sin trazas individuales identificables. |
| Rate limiting | Max 5 rutas/usuario/hora verificado en Cloud Function `finishRoute`. |

---

## Metricas de Rendimiento Objetivo

| Metrica | Target | Como se cumple |
|---------|--------|----------------|
| Pantalla principal desde background | < 1s | Cache local Firestore + `useActiveRouteStore` persistido |
| Acreditacion de puntos | < 3s | Cloud Function + Firestore batch write |
| Actualizacion mapa de recompensas | < 30s | `onSnapshot` listener en `/rewards` (latencia real ~1-2s) |
| Rutas perdidas por interrupcion | 0 | AsyncStorage cada 30s + recovery al reabrir |
| Marcadores simultaneos en mapa | 500 sin degradacion | `react-native-maps` clustering nativo a >= 60fps |
| Usuarios concurrentes sincronizando | 1,000 | Cloud Functions escalado automatico Firebase |

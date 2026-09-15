# EcoBike

Plataforma de movilidad sostenible que recompensa viajes en bicicleta con puntos canjeables en comercios aliados. Los usuarios acumulan puntos por kilometro recorrido y los canjean en tiendas partner mediante codigos QR generados server-side.

**Repositorio:** [DonatoNicolasAyalaOsorio73/EcoBike](https://github.com/DonatoNicolasAyalaOsorio73/EcoBike)
**Autor:** Donato Nicolas Ayala Osorio

---

## Estado del Proyecto

| Capa | Tecnologia | Estado |
|------|-----------|--------|
| Prototipo web | React 18 + Vite + Firebase JS SDK v11 | Funcional — deployado en GitHub Pages |
| Cloud Functions | Firebase Functions v2 + Node.js 20 | Implementado (5 funciones) |
| App mobile | Expo SDK 57 + React Native (worktree) | En construccion |

El repositorio tiene tres capas activas: `src/` (web), `backend/` (serverless), `mobile/` (native en progreso).

---

## Configuracion Inicial

La app no arranca sin credenciales de Firebase. Sin ellas, `App.tsx` renderiza `SetupScreen` en lugar de montar el router — falla visible en startup, no silenciosa en runtime.

Crear `.env` en la raiz:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Emails de administradores separados por coma
VITE_ADMIN_EMAILS=admin@tudominio.com
```

---

## Setup Local

```bash
git clone https://github.com/DonatoNicolasAyalaOsorio73/EcoBike.git
cd EcoBike
npm install

cp .env.example .env
# Completar con credenciales de Firebase

npm run dev      # http://localhost:3000
npm run build    # dist/
npm run deploy   # GitHub Pages (gh-pages -d dist)
```

**Emuladores Firebase:**

```bash
firebase emulators:start --only firestore,functions,auth
# Auth:      localhost:9099
# Firestore: localhost:8080
# Functions: localhost:5001
# UI:        localhost:4000
```

**Seed de Firestore** (requiere Admin SDK JSON en ~/Downloads):

```bash
node backend/seed.js
# Crea: 7 badges, 4 tiendas en Bogota, 8 rewards
```

**Deploy de Cloud Functions:**

```bash
cd backend && npm run deploy
```

---

## Arquitectura del Sistema

```
┌──────────────────────────────────────────────────┐
│  Browser / Mobile                                  │
│  React 18 + Vite  |  Expo SDK 57 + React Native  │
│  Firebase JS SDK v11 (modular API exclusivamente) │
└────────────────────────┬─────────────────────────┘
                         │ HTTPS / Firebase SDK
┌────────────────────────▼─────────────────────────┐
│  Firebase Platform                                 │
│  ├── Authentication (email/password)               │
│  ├── Cloud Firestore (base de datos principal)    │
│  ├── Cloud Functions v2 (Node.js 20)              │
│  │    ├── onCall:            finishRoute           │
│  │    ├── onCall:            generateQRToken       │
│  │    ├── onCall:            validateRedemption    │
│  │    ├── onDocumentUpdated: onPointsUpdated       │
│  │    ├── onDocumentUpdated: onBadgeEarned         │
│  │    └── onSchedule:       streakReminder         │
│  ├── Firebase Storage                              │
│  └── Firebase Cloud Messaging (FCM)               │
└──────────────────────────────────────────────────┘
```

---

## Arquitectura — Prototipo Web (`src/`)

### Stack

| Capa | Tecnologia | Version |
|------|-----------|---------|
| Framework | React | 18.2 |
| Lenguaje | TypeScript | 5.3 |
| Bundler | Vite | 5.0 |
| Routing | React Router | v6.20 |
| Backend SDK | Firebase JS SDK | v11.0 (modular) |
| Mapas | react-leaflet + leaflet | 4.2 / 1.9 |
| QR | react-qr-code | 2.2 |
| Deploy | gh-pages | GitHub Pages |

### Arbol de Archivos

```
src/
├── FireDataBase.tsx          # Inicializacion Firebase + guard de env vars
├── MyNavigation.tsx          # Router raiz + auth state + bottom tabs (state machine)
├── App.tsx                   # Raiz: SetupScreen si !firebaseReady
├── auth/
│   ├── Welcome.tsx           # Landing con CTA login/registro
│   ├── SignIn.tsx            # Login email/password
│   ├── Register.tsx          # Registro con validacion COPPA (bloquea < 13 anos)
│   └── PasswordResetScreen.tsx # Recuperacion via sendPasswordResetEmail
├── screens/
│   ├── PointsScreen.tsx      # Dashboard + GPS tracking + llamada a finishRoute
│   ├── MapScreen.tsx         # Lista tiendas ordenadas por distancia Haversine
│   ├── FriendsScreen.tsx     # Leaderboard: query orderBy('points', 'desc').limit(20)
│   ├── UserScreen.tsx        # Perfil + edicion nombre/ciudad + logout
│   ├── RewardsScreen.tsx     # Catalogo de recompensas + flujo de canje QR
│   └── AdminPanel.tsx        # CRUD de tiendas (email allowlist)
├── services/
│   ├── authService.ts        # firebaseErrorToSpanish(), getCurrentUser()
│   └── cloudFunctions.ts     # Wrappers tipados para Callable Functions
└── utils/
    └── routeTracking.ts      # haversineKm(), formatDuration(), type Checkpoint

backend/
├── src/index.ts              # 5 Cloud Functions (3 callable + 2 trigger + 1 scheduled)
├── firestore.rules           # Security Rules con helpers funcionales
├── firestore.indexes.json    # 7 indices compuestos pre-definidos
└── seed.js                   # Inicializa colecciones con datos de prueba

vite.config.js                # base: '/EcoBike/' para GitHub Pages
firebase.json                 # Emuladores: auth:9099, firestore:8080, functions:5001
```

---

## Decisiones de Arquitectura

### ADR-01: Inicializacion de Firebase — bandera `firebaseReady`

**Problema:** Vite expone env vars en build time. Si alguna falta, `initializeApp()` puede inicializarse con valores `undefined` — la app arranca sin errores visibles pero todas las operaciones de red fallan silenciosamente.

**Decision:** `FireDataBase.tsx` evalua todas las variables antes de llamar `initializeApp()` y exporta un booleano:

```typescript
const allPresent =
  env.VITE_FIREBASE_API_KEY &&
  env.VITE_FIREBASE_AUTH_DOMAIN &&
  env.VITE_FIREBASE_PROJECT_ID &&
  env.VITE_FIREBASE_STORAGE_BUCKET &&
  env.VITE_FIREBASE_MESSAGING_SENDER_ID &&
  env.VITE_FIREBASE_APP_ID;

export const firebaseReady = !!allPresent;
if (firebaseReady) initializeApp({ ... });

export const auth    = firebaseReady ? getAuth()      : null!;
export const db      = firebaseReady ? getFirestore() : null!;
export const storage = firebaseReady ? getStorage()   : null!;
```

`App.tsx` usa el flag como guard raiz — si `!firebaseReady` renderiza `SetupScreen` con el `.env` exacto que hay que crear, sin montar router ni hacer llamadas a Firebase.

**Alternativa descartada:** Fallback con credenciales demo hardcodeadas. `initializeApp()` exitoso con proyecto falso falla silenciosamente en todos los reads/writes — mas dificil de diagnosticar que un error de startup.

---

### ADR-02: Auth State — `onAuthStateChanged`, nunca `currentUser` sincrono

**Problema:** Firebase Auth restaura la sesion del usuario de forma asincrona al cargar la pagina. `getAuth().currentUser` devuelve `null` de forma sincrona en cold start aunque la sesion persista en localStorage.

**Decision:** `MyNavigation.tsx` suscribe a `onAuthStateChanged` antes de renderizar cualquier ruta:

```typescript
useEffect(() => {
  const unsubscribe = onAuthStateChanged(getAuth(), (firebaseUser) => {
    setUser(firebaseUser);
    setLoading(false);
  });
  return unsubscribe; // limpia la suscripcion al desmontar
}, []);

if (loading) return <Spinner />;
```

Mientras `loading === true` se muestra un spinner. Esto evita el flash donde usuarios autenticados ven la pantalla de login antes de que Firebase restaure la sesion.

**La alternativa descartada** (`getAuth().currentUser` sincrono) hacia que usuarios con sesion activa vieran la pantalla Welcome en cada reload — bug clasico de SPA con Firebase.

---

### ADR-03: Navegacion por tabs — state machine en memoria

**Contexto:** La app tiene 5 tabs (Home, Mapa, Premios, Amigos, Perfil) mas un tab Admin condicional. En el contexto de una SPA mobile-first, las tabs no necesitan URL independientes.

**Decision:** `MyNavigation.tsx` implementa `HomeTabs` como state machine local — un `useState('home')` controla que componente renderizar. El `BrowserRouter` solo define 4 rutas publicas (`/`, `/signin`, `/register`, `/password-reset`).

```typescript
const renderTab = () => {
  switch(currentTab) {
    case 'home':    return <PointsScreen />;
    case 'map':     return <MapScreen />;
    case 'rewards': return <RewardsScreen />;
    case 'friends': return <FriendsScreen />;
    case 'profile': return <UserScreen />;
    case 'admin':   return isAdmin ? <AdminPanel /> : <PointsScreen />;
  }
};
```

**Tradeoff aceptado:** El boton atras del browser no navega entre tabs; los tabs no son bookmarkeables. Aceptable para MVP con patron de uso de app instalada (PWA).

---

### ADR-04: Control de acceso Admin — email allowlist + Firestore roles

**Contexto:** El `AdminPanel` requiere control de acceso. La solucion completa son Firebase Custom Claims verificados server-side.

**Decision:** Doble capa de defensa:

1. **UI:** `VITE_ADMIN_EMAILS` (env var) controla si el tab Admin aparece y si el componente renderiza. Esta variable es publica en el bundle — es UI-gate, no barrera de seguridad.

2. **Base de datos:** Las Firestore Security Rules usan `isAdmin()` que lee `users/{uid}.role == 'admin'` independientemente de la UI. El servidor protege los datos aunque alguien evada la UI.

```typescript
// ponytail: email allowlist — replace with Custom Claims isAdmin when admin roles are defined
const ADMIN_EMAILS = env.VITE_ADMIN_EMAILS?.split(',').map(e => e.trim()) ?? [];
```

**Patron de hooks obligatorio:** `AdminPanel` demuestra el patron correcto — todos los hooks antes de cualquier guard:

```typescript
export default function AdminPanel() {
  const currentUser = getAuth().currentUser; // sincrono — ok, el router ya confirmo auth
  const [stores, setStores] = useState([]);  // hooks SIEMPRE al inicio

  useEffect(() => {
    if (!currentUser) return;                // guard dentro del effect
    if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(currentUser.email)) return;
    fetchStores();
  }, [currentUser?.uid]);

  if (!currentUser) return <AccessDenied />; // guard en render, despues de todos los hooks
  ...
}
```

---

### ADR-05: GPS — `useRef` para estado mutable en callbacks asincronos

**Problema:** `watchPosition` llama a su callback asincronamente. Si el callback captura valores de estado de React via closure, esos valores son stale (del momento en que se creo el callback, no el actual).

**Decision:** `PointsScreen.tsx` usa refs para todo el estado mutable dentro del ciclo GPS:

```typescript
const watchIdRef     = useRef<number | null>(null);
const intervalRef    = useRef<number | null>(null);
const checkpointsRef = useRef<Checkpoint[]>([]);
const lastPosRef     = useRef<{ lat: number; lon: number } | null>(null);
const distanceRef    = useRef(0);
const startedAtRef   = useRef<string | null>(null);
```

Los refs se leen/escriben sin causar re-renders. `setDistanceKm` y `setElapsedSeconds` (state de React) se llaman solo para triggear re-renders de UI. El calculo real vive en los refs.

**Filtro de saltos GPS:**

```typescript
const delta = haversineKm(lastPosRef.current.lat, lastPosRef.current.lon, latitude, longitude);
if (delta < 0.5) { // Ignora jumps > 500m (ruido de sensor)
  distanceRef.current += delta;
  setDistanceKm(distanceRef.current);
}
```

Saltos de mas de 500m entre lecturas consecutivas son ruido (tunel, edificio, GPS multi-path). Se descartan silenciosamente antes de acumular distancia.

---

### ADR-06: Calculo Haversine — cliente y servidor

**Contexto:** La distancia entre checkpoints GPS requiere la formula de Haversine. Puede calcularse en cliente o servidor.

**Decision:** Se calcula en cliente para feedback en tiempo real durante la ruta. El servidor recibe la distancia total del cliente pero puede verificarla a partir de los checkpoints.

```typescript
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

Esta funcion vive en `utils/routeTracking.ts` (web) y en `features/route-tracking/route-tracking.utils.ts` (mobile). El tipo `Checkpoint` es identico en ambas plataformas — es el contrato con el servidor.

---

### ADR-07: Errores de Firebase — mapper a mensajes en espanol

**Problema:** Los errores de Firebase Auth tienen codigos como `auth/email-already-in-use`. Si se muestran directamente, el mensaje incluye codigo tecnico en ingles.

**Decision:** `authService.ts` define un mapa exhaustivo de codigos a mensajes amigables:

```typescript
const FIREBASE_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'Este correo ya está registrado.',
  'auth/invalid-email':        'El correo no es válido.',
  'auth/weak-password':        'La contraseña es muy débil (mínimo 6 caracteres).',
  'auth/user-not-found':       'No existe una cuenta con este correo.',
  'auth/wrong-password':       'Correo o contraseña incorrectos.',
  'auth/invalid-credential':   'Correo o contraseña incorrectos.',
  'auth/too-many-requests':    'Demasiados intentos fallidos. Intenta más tarde.',
  'auth/network-request-failed': 'Error de conexión. Revisa tu internet.',
};
export const firebaseErrorToSpanish = (err: any): string =>
  FIREBASE_ERRORS[err?.code] ?? 'Ocurrió un error. Intenta de nuevo.';
```

`SignIn.tsx` y `Register.tsx` llaman `firebaseErrorToSpanish(err)` en todos sus `catch`. **Deuda conocida:** `PasswordResetScreen.tsx` aun usa `err.message` directamente.

---

### ADR-08: Validacion de edad — COPPA en cliente y Firestore

**Contexto:** La plataforma recolecta datos de ubicacion. Usuarios menores de 13 anos requieren consentimiento parental (COPPA en USA, marco equivalente en Colombia).

**Decision:** `Register.tsx` calcula la edad y rechaza el registro si es menor de 13:

```typescript
function getAgeGroup(birthDate: string): 'adult' | 'minor' | null {
  const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000));
  if (age < 13) return null; // null = bloqueado
  return age >= 18 ? 'adult' : 'minor';
}
```

El campo `ageGroup: 'minor' | 'adult'` se persiste en `/users/{uid}`. Las Firestore Security Rules validan en `create` que `ageGroup in ['minor', 'adult']` — esto bloquea documentos con `ageGroup: null` a nivel de base de datos, independientemente del cliente.

**Limitacion conocida:** `birthDate` es opcional en el formulario. Si el usuario no la ingresa, `ageGroup` cae a `'adult'` por defecto. Para compliance completo, el campo deberia ser obligatorio.

---

### ADR-09: Integridad de puntos — solo Cloud Functions escriben `points`

**Decision critica de seguridad:** El campo `points` en `/users/{uid}` es de solo escritura para Cloud Functions con Admin SDK. El cliente NUNCA puede modificarlo directamente.

**Tres capas de proteccion:**

**Capa 1 — Firestore Security Rules:**

```javascript
function protectedFields() {
  return ['points', 'totalPoints', 'streak', 'lastActivityDate',
          'badges', 'role', 'isActive', 'totalRoutes'];
}
function noProtectedFieldsChanged() {
  return !request.resource.data.diff(resource.data)
            .affectedKeys().hasAny(protectedFields());
}

match /users/{uid} {
  allow update: if isOwner(uid) && noProtectedFieldsChanged();
}
```

**Capa 2 — Restriccion en `create`:**

```javascript
allow create: if isOwner(uid)
  && request.resource.data.points == 0
  && request.resource.data.totalPoints == 0
  && request.resource.data.streak == 0
  && request.resource.data.badges is list
  && request.resource.data.badges.size() == 0
  && request.resource.data.role == 'user';
```

Ningun usuario puede crearse con puntos pre-existentes, badges o rol elevado.

**Capa 3 — Cloud Function `finishRoute` con batch atomico:**

```typescript
const batch = db.batch();
batch.set(db.collection('routes').doc(), { userId, ...metadata, pointsEarned });
batch.set(userRef, { points: newBalance, totalRoutes: ..., badges: [...] }, { merge: true });
await batch.commit();
```

La creacion de la ruta y la actualizacion de puntos son atomicas — no puede quedar una sin la otra.

---

### ADR-10: Tokens QR — generados server-side

**Contexto:** El canje de recompensas requiere un token verificable que el partner valide. Los tokens no pueden generarse en cliente — el cliente no puede conocer ninguna clave de firma.

**Decision:** `generateQRToken` (Cloud Function) genera:
- **Token primario:** 25 caracteres `[A-Z0-9]` — contenido del codigo QR
- **Codigo de respaldo:** 6 digitos numericos — fallback si la camara falla
- **TTL:** 10 minutos (`expiresAt`)
- **Persistido** en `/canjes/{id}` con `validated: false`

`validateRedemption` acepta ambos formatos por query secuencial:

```typescript
let q = await db.collection('canjes').where('code', '==', token).where('validated', '==', false).limit(1).get();
if (q.empty) {
  q = await db.collection('canjes').where('numericCode', '==', token).where('validated', '==', false).limit(1).get();
}
```

La condicion `validated == false` en la query garantiza idempotencia — un token ya usado no puede validarse dos veces.

**Nota:** La implementacion actual usa `Math.random()` para generacion del token. Para produccion, migrar a `crypto.randomUUID()` o `crypto.getRandomValues()` para mayor entropia.

---

## Cloud Functions — Backend (`backend/src/index.ts`)

Usa **Firebase Functions v2** (`firebase-functions/v2`). Las diferencias respecto a v1 que afectan la implementacion:

| Aspecto | v1 | v2 (implementado) |
|---------|----|--------------------|
| Import callable | `functions.https.onCall` | `onCall(async (request) => {...})` |
| Acceso a auth | `context.auth` | `request.auth` |
| Trigger Firestore | `functions.firestore.document().onUpdate` | `onDocumentUpdated('users/{uid}', ...)` |
| Scheduler | `functions.pubsub.schedule(...)` | `onSchedule('cron', ...)` |

### `finishRoute` (Callable)

**Input:** `checkpoints: Checkpoint[]`, `metadata: { startedAt, endedAt, totalDistanceKm }`

**Logica completa:**

1. Verifica autenticacion (`request.auth?.uid`)
2. Detecta primera ruta: `db.collection('routes').where('userId', '==', uid).limit(1).get()` — si `empty`, es primera ruta
3. Calcula puntos: `Math.floor(totalDistanceKm)`, multiplicado por 2 si primera ruta
4. Determina badges nuevos (primera ruta: `['first-route', 'welcome-bonus']`)
5. Batch atomico: crea `/routes/{id}` + actualiza `/users/{uid}` en una sola transaccion

```typescript
const batch = db.batch();
batch.set(db.collection('routes').doc(), {
  userId, startedAt, endedAt, totalDistanceKm,
  checkpointCount: checkpoints.length, // cantidad, no coordenadas (privacidad)
  pointsEarned, createdAt: new Date(),
});
batch.set(userRef, {
  points: newBalance, totalRoutes: ..., badges: [...], lastRouteAt: new Date()
}, { merge: true });
await batch.commit();
```

**Privacidad:** Solo `checkpointCount` se almacena — las coordenadas brutas nunca llegan al servidor de forma persistente.

### `generateQRToken` (Callable)

**Input:** `rewardId` (ID de tienda en `/tiendas`)

Verifica que la tienda exista, genera token 25-char + codigo 6-dig con `Math.random()`, persiste en `/canjes`, retorna ambos al cliente. TTL: 10 minutos.

### `validateRedemption` (Callable)

**Input:** `token` (QR o 6 digitos), `partnerId`

Busca en `/canjes` por `code == token && validated == false`. Si no encuentra, intenta con `numericCode`. Al encontrar, actualiza `validated: true`, `validatedBy`, `validatedAt`.

### `onPointsUpdated` (Trigger Firestore)

Se dispara en cada actualizacion de `/users/{uid}`. Solo actua si `newPoints > oldPoints`.

**Logica de notificacion:** Compara el nuevo saldo contra el umbral del 80% de cada tienda. Si el usuario acaba de cruzar ese umbral (antes estaba por debajo, ahora por arriba pero aun sin alcanzar el total):

```typescript
const threshold = Math.floor(required * 0.8);
if (oldPoints < threshold && newPoints >= threshold && newPoints < required) {
  await messaging.send({ token: pushToken, notification: { title: 'Ya casi llegas', ... } });
  break; // una sola notificacion por actualizacion
}
```

**Escalabilidad:** Esta funcion consulta todas las tiendas en cada actualizacion de puntos. Para volumenes altos, considerar desnormalizar el umbral o usar un indice invertido.

### `streakReminder` (Scheduled)

Cron: `'0 0 * * *'` = medianoche UTC = 7pm hora Bogota (UTC-5).

Consulta todos los usuarios con `streak >= 1`. Para cada uno con `pushToken` y `lastRouteAt < today`, envia notificacion de recordatorio de racha con `Promise.all` para paralelismo.

**Limitacion conocida:** Consulta sin paginacion — no escala a decenas de miles de usuarios con racha activa. Para produccion, paginar con `startAfter` o mantener una subcoleccion de usuarios activos.

### `onBadgeEarned` (Trigger Firestore)

Se dispara en cada actualizacion de `/users/{uid}`. Compara `after.badges` con `before.badges`. Si hay badges nuevos, envia push para el primero de ellos.

---

## Modelo de Datos Firestore

### Colecciones Activas

**`/users/{uid}`**

```typescript
{
  email: string,             // requerido, validado en Security Rules
  displayName: string,
  city: string,              // requerido, validado en Security Rules
  birthDate: string,         // YYYY-MM-DD, opcional
  ageGroup: 'adult' | 'minor',
  points: number,            // SOLO Cloud Functions con Admin SDK
  totalPoints: number,       // SOLO Cloud Functions
  totalRoutes: number,       // SOLO Cloud Functions
  streak: number,            // SOLO Cloud Functions
  lastActivityDate: string,  // SOLO Cloud Functions
  lastRouteAt: Timestamp,    // SOLO Cloud Functions
  badges: string[],          // SOLO Cloud Functions
  role: 'user'|'admin'|'partner', // SOLO Cloud Functions
  isActive: boolean,         // SOLO Cloud Functions (baja logica)
  pushToken: string | null,  // FCM token, cliente puede escribir este campo
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

**`/routes/{routeId}`** — solo Cloud Functions escriben

```typescript
{
  userId: string,
  startedAt: string,         // ISO 8601
  endedAt: string,           // ISO 8601
  totalDistanceKm: number,
  checkpointCount: number,   // cantidad de puntos GPS (no las coordenadas)
  pointsEarned: number,
  createdAt: Timestamp,
}
```

**`/tiendas/{storeId}`**

```typescript
{
  name: string,
  description: string,
  address: string,
  city: string,
  location: GeoPoint,        // para calculo Haversine en cliente
  category: string,
  logoUrl: string | null,
  isActive: boolean,         // false = baja logica, el documento no se borra
  partnerUid: string | null, // ref a users con role='partner'
  pointsRequired: number,
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

**`/rewards/{rewardId}`**

```typescript
{
  tiendaId: string,          // ref a tiendas
  title: string,
  description: string,
  pointsCost: number,        // integer > 0, validado en Security Rules
  imageUrl: string | null,
  isActive: boolean,
  stock: number | null,      // null = ilimitado
  expiresAt: Timestamp | null,
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

**`/redemptions/{redemptionId}`** — solo Cloud Functions

```typescript
{
  userId: string,
  rewardId: string,
  tiendaId: string,
  token: string,
  pointsSpent: number,
  status: 'pending' | 'validated' | 'expired',
  createdAt: Timestamp,
  expiresAt: Timestamp,      // createdAt + 10 min
  validatedAt: Timestamp | null,
  validatedBy: string | null,
}
```

**`/canjes/{canjeId}`** — coleccion legacy usada por `generateQRToken` actual

```typescript
{
  userId: string,
  storeId: string,           // ref a tiendas
  storeName: string,
  code: string,              // token 25 chars alfanumerico
  numericCode: string,       // 6 digitos
  expiresAt: string,         // ISO 8601, TTL 10 min
  validated: boolean,
  validatedBy: string | null,
  validatedAt: Date | null,
  timestamp: Date,
}
```

**`/badges/{badgeId}`** — catalogo, solo admin escribe

| ID | Label | Condicion |
|----|-------|-----------|
| `welcome-bonus` | Bienvenida | Primera ruta completada |
| `first-route` | Primera Ruta | Completa 1 ruta |
| `10-routes` | 10 Viajes | Completa 10 rutas |
| `100km` | 100 km | Acumula 100 km en total |
| `streak-7` | Racha 7 dias | 7 dias consecutivos |
| `streak-30` | Racha 30 dias | 30 dias consecutivos |
| `eco-hero` | Eco Heroe | Acumula 500 km en total |

**`/nps/{npsId}`** — usuarios crean, admin lee/actualiza

```typescript
{
  userId: string,
  score: number,             // 1-10, validado en Security Rules
  comment: string | null,
  appVersion: string | null,
  createdAt: Timestamp,
}
```

**Colecciones legacy activas:**
- `/usuarios/{uid}` — perfil extendido original, mantener mientras alguna pantalla lo referencie
- `/canjes/{id}` — historial de canjes pre-`/redemptions`, usada por `generateQRToken` actual

### Relaciones

```
users (1) ──────── (N) routes        [routes.userId]
users (1) ──────── (N) redemptions   [redemptions.userId]
tiendas (1) ─────── (N) rewards      [rewards.tiendaId]
tiendas (1) ─────── (N) redemptions  [redemptions.tiendaId]
rewards (1) ─────── (N) redemptions  [redemptions.rewardId]
badges (M) ──────── (N) users        [users.badges[] — array de IDs]
```

---

## Firestore Security Rules (`backend/firestore.rules`)

Las reglas usan funciones helper para evitar duplicacion:

```javascript
function isAuth()          { return request.auth != null; }
function isOwner(uid)      { return isAuth() && request.auth.uid == uid; }
function isAdmin()         { return isAuth() && callerDoc().role == 'admin'; }
function isPartnerOrAdmin(){ return isAuth() && callerDoc().role in ['admin', 'partner']; }
```

**`isAdmin()` cuesta 1 lectura adicional** (lee `/users/{uid}`). Aceptable porque operaciones admin son infrecuentes. Para alta frecuencia migrar a Custom Claims (verificacion sin lectura adicional).

### Tabla de Permisos

| Coleccion | Read | Create | Update | Delete |
|-----------|------|--------|--------|--------|
| `/users/{uid}` | owner o admin | owner (constraints estrictos) | owner sin campos protegidos | `false` |
| `/routes/{id}` | owner o admin | `false` (Admin SDK) | `false` | `false` |
| `/tiendas/{id}` | auth (solo isActive) | admin + nonEmpty | admin | `false` |
| `/rewards/{id}` | auth (solo isActive) | admin + pointsCost > 0 | admin | `false` |
| `/redemptions/{id}` | owner o partner/admin | `false` | `false` | `false` |
| `/badges/{id}` | auth | admin | admin | `false` |
| `/nps/{id}` | admin | auth (score 1-10) | admin | admin |
| `/{document=**}` | `false` | `false` | — | — |

**Decisiones de diseno:**

1. **Baja logica en todas partes:** `delete: if false` en tiendas, rewards y users. Los registros se deshabilitan con `isActive: false`, nunca se borran. Preserva integridad referencial sin necesidad de transacciones de limpieza.

2. **Campos protegidos en lista explicitamente:** `protectedFields()` lista cada campo que solo Admin SDK puede tocar (`points`, `streak`, `badges`, `role`, etc.). El cliente puede actualizar `displayName`, `city`, `birthDate`, `pushToken` — nada mas.

3. **Deny-all catch-all final:** La ultima regla `match /{document=**} { allow read, write: if false; }` bloquea cualquier coleccion no listada explicitamente. Proteccion por defecto sobre permiso por defecto.

4. **`nonEmpty(field)`** helper valida que strings requeridos no sean vacios — previene documentos con campos obligatorios como `""`.

---

## Indices Compuestos Firestore (`backend/firestore.indexes.json`)

Cada query con `where` en un campo + `orderBy` en otro campo diferente requiere un indice compuesto pre-definido. Los 7 indices cubren todos los patrones de query del sistema:

| Coleccion | Campos | Query que lo requiere |
|-----------|--------|-----------------------|
| `routes` | `userId ASC, createdAt DESC` | Historial de rutas del usuario |
| `routes` | `userId ASC, distanceKm DESC` | Ruta mas larga del usuario |
| `redemptions` | `userId ASC, createdAt DESC` | Historial de canjes del usuario |
| `redemptions` | `tiendaId ASC, status ASC, createdAt DESC` | Dashboard partner: canjes pendientes |
| `tiendas` | `city ASC, isActive ASC` | Tiendas activas por ciudad |
| `rewards` | `tiendaId ASC, isActive ASC` | Rewards activos de una tienda |
| `users` | `city ASC, points DESC` | Leaderboard por ciudad |

Sin estos indices, queries con multiples condiciones fallarian en produccion con error `FAILED_PRECONDITION`.

---

## Seed de Datos Iniciales (`backend/seed.js`)

Script de Admin SDK que inicializa las colecciones en tres batches separados (limite de 500 operaciones por batch de Firestore):

- **Batch 1:** 7 badges (`welcome-bonus`, `first-route`, `10-routes`, `100km`, `streak-7`, `streak-30`, `eco-hero`)
- **Batch 2:** 4 tiendas en Bogota con GeoPoints reales (Cafe Verde, BikePro Shop, SportFit, EcoMarket)
- **Batch 3:** 8 rewards distribuidos entre las 4 tiendas

El script busca automaticamente el JSON del Admin SDK en `~/Downloads` buscando archivos que empiecen con `ecobike-9dedd-firebase-adminsdk`.

---

## Pantallas — Decisiones de Implementacion

### `PointsScreen.tsx` — Dashboard + GPS Tracking

Pantalla principal. Maneja dos responsabilidades: mostrar estadisticas del usuario y controlar el ciclo de vida de una ruta activa.

**Ciclo de vida completo de una ruta:**

```
startRoute()
  → navigator.geolocation.getCurrentPosition (timeout: 10s)
      → Inicializa refs (checkpointsRef, distanceRef, lastPosRef, startedAtRef)
      → watchPosition (enableHighAccuracy: true, maximumAge: 0)
      → setInterval cada 1000ms (incrementa elapsedSeconds)

handlePosition() [callback de watchPosition, usa refs para evitar stale closures]
  → Crea Checkpoint: { latitude, longitude, timestamp: ISO, accuracy }
  → push a checkpointsRef.current
  → Calcula haversineKm contra lastPosRef
  → Filtro: si delta < 500m, acumula en distanceRef
  → setDistanceKm(distanceRef.current) → trigger re-render

stopRoute()
  → clearWatch(watchIdRef) + clearInterval(intervalRef)
  → Validacion: totalDistanceKm >= 0.01km
  → callFinishRoute(checkpointsRef.current, { startedAt, endedAt, totalDistanceKm })
      → Respuesta: { success, data: { newBalance, pointsEarned, firstRoute } }
  → setPoints(result.data.newBalance)  ← valor oficial del servidor, no estimado
  → setRouteResult → muestra modal con puntos ganados y badge de bienvenida si primera ruta
```

### `MapScreen.tsx` — Directorio de Tiendas

Carga ubicacion con `getCurrentPosition` y tiendas de Firestore en paralelo. Calcula distancia con Haversine y ordena por proximidad. Tiendas sin coordenadas (`lat: 0, lon: 0`) reciben distancia ~6371km (radio terrestre) y quedan al final del sort.

**Nota:** El componente usa `react-leaflet` (instalado en `package.json`) pero actualmente muestra una lista de texto en lugar de un mapa interactivo. La integracion del mapa es deuda de implementacion pendiente.

### `FriendsScreen.tsx` — Leaderboard

```typescript
const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(20));
const snap = await getDocs(q);
setFriends(snap.docs.filter(doc => doc.id !== currentUser.uid).map(doc => ({ id: doc.id, ...doc.data() })));
```

Excluye al usuario actual. Muestra avatar como inicial del nombre. Si se agrega filtro por ciudad, se necesita el indice compuesto `city+points` pre-definido en `firestore.indexes.json`.

### `UserScreen.tsx` — Perfil

Edicion inline de `displayName` y `city` con `updateDoc`. El logout usa el patron correcto:

```typescript
await signOut(getAuth());
navigate('/', { replace: true }); // replace:true elimina la entrada del historial
```

Sin `replace: true`, el boton atras del browser regresaria a la pantalla de perfil aunque el usuario ya cerro sesion.

**Sistema de badges:** Mapea IDs de badges a labels en `BADGE_LABELS`. Esta misma tabla existe en `backend/src/index.ts`. Deuda tecnica: deberia centralizarse en la coleccion `/badges` de Firestore o en un modulo compartido.

### `RewardsScreen.tsx` — Catalogo + Flujo QR

Carga paralela con `Promise.all([getDocs(tiendas), getDoc(user)])`. La logica de "puede canjear" es client-side: `userPoints >= store.pointsRequired && store.stock > 0`. La validacion real ocurre en `generateQRToken` server-side.

**Countdown de expiracion** (`expiresIn`): calcula tiempo restante desde `expiresAt` en cada render. No usa `setInterval` — el contador no es en tiempo real. Deuda menor aceptable para MVP.

### `Register.tsx` — Registro con COPPA

Validaciones client-side en orden:
1. Campos obligatorios completos
2. `password === confirmPassword`
3. `password.length >= 6`
4. Si `birthDate` presente: `getAgeGroup(birthDate) !== null` (rechaza < 13 anos)

Al crear la cuenta, el documento de usuario se inicializa con todos los campos numericos en 0 y arrays vacios — cumpliendo las Firestore Security Rules que validan estos valores en `create`.

---

## Arquitectura — App Mobile (`mobile/`)

Expo SDK 57 + Expo Router. Los componentes clave del worktree activo estan implementados.

### Stack Mobile

| Capa | Tecnologia |
|------|-----------|
| Framework | Expo SDK 57 |
| Router | Expo Router 3 |
| Lenguaje | TypeScript estricto |
| Estilos | NativeWind v4 (Tailwind para RN) |
| State | Zustand |
| Backend SDK | Firebase JS SDK v11 (mismo que web) |
| Persistencia local | AsyncStorage (checkpoints GPS) |
| GPS | expo-location + expo-task-manager (background) |
| Push | expo-notifications + FCM |
| Hapticos | expo-haptics |
| Animaciones | react-native-reanimated |
| Mapas | react-native-maps (iOS/Android) + react-leaflet (web) |

### `useActiveRouteStore.ts` — Zustand Store de GPS

El store central del tracking. Zustand sobre Context porque el estado de GPS se actualiza cada pocos segundos — Context causaria re-renders excesivos en todo el arbol.

```typescript
interface ActiveRouteState {
  tracking: boolean;
  startedAt: string | null;
  distanceKm: number;
  localPoints: number;         // estimado cliente (1pt/km), no confirmado por servidor
  elapsedSeconds: number;
  checkpointQueue: Checkpoint[];
  pendingRecoveryDecision: boolean; // ruta interrumpida detectada al reabrir
  lastKmMilestone: number;     // trigger para animacion PointsFloat
}
```

**Invariante critico de concurrencia:**

```typescript
startRoute: (firstCheckpoint) => {
  if (get().tracking) return; // bloquea segunda ruta simultanea
  ...
}
```

**Persistencia fire-and-forget:**

```typescript
addCheckpoint: (checkpoint) => {
  set((state) => { /* calculo Haversine, update distancia */ });
  // fire-and-forget — no bloquear UI thread por I/O de AsyncStorage
  AsyncStorage.setItem(ROUTE_KEY, JSON.stringify({...})).catch(() => {});
}
```

La escritura a AsyncStorage es asincerona y los errores se descartan. El estado en memoria es la fuente de verdad; AsyncStorage es el backup para recovery si la app se cierra inesperadamente.

### `GlassView.tsx` — Sistema Liquid Glass

Componente de superficie base para toda la UI mobile.

```typescript
const isAndroidLegacy = Platform.OS === 'android' && (Platform.Version as number) < 31;

if (isAndroidLegacy) {
  // ponytail: fallback solido para Android API < 31 sin soporte de backdrop blur
  return <View style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}>{children}</View>;
}

return <BlurView intensity={blurIntensity} tint={...} style={...}>{children}</BlurView>;
```

Android API < 31 (Android 11) no soporta `BlurView` de `expo-blur`. El fallback usa un `View` opaco semitransparente que mantiene la estetica sin crash.

**Variantes:** `light`, `dark`, `reward`, `alert` — configuradas desde `constants/glass.ts`.

### `PointsFloat.tsx` — Animacion de Km Completado

Componente de feedback visual cuando se completa un kilometro. Usa `react-native-reanimated` para ejecutar la animacion en el UI thread (sin pasar por el JS thread):

```typescript
translateY.value = withTiming(-60, { duration: 1200 });
opacity.value = withSequence(
  withTiming(1, { duration: 100 }),
  withTiming(0, { duration: 1100 }, (finished) => {
    if (finished) runOnJS(markDone)();
  }),
);
```

**Accesibilidad:** `AccessibilityInfo.isReduceMotionEnabled()` — si el usuario tiene "reducir movimiento" activo en el sistema, la animacion no se ejecuta pero el haptico si.

**Haptico:** `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` al alcanzar cada km. Los errores se descartan (dispositivos sin motor haptico).

**Anti-debounce:** Guard de 800ms entre animaciones + flag `isRunning` para evitar que multiples checkpoints en rapida sucesion disparen la animacion en cascada.

---

## Flujo de Datos — Ruta Completa End-to-End

```
Usuario presiona "Iniciar Ruta"
  │
  ├─ [web]    getCurrentPosition → watchPosition → setInterval 1s
  ├─ [mobile] requestForegroundPermissionsAsync → watchPositionAsync
  │            expo-task-manager registra tarea background
  │
  ▼ En cada actualizacion GPS:
handlePosition / addCheckpoint
  ├─ Calculo Haversine incremental
  ├─ Filtro de saltos > 500m (ruido de sensor)
  ├─ Actualizacion estado UI (setDistanceKm)
  └─ [mobile] AsyncStorage fire-and-forget (backup recovery)
  │
Usuario presiona "Terminar Ruta"
  ├─ clearWatch + clearInterval
  ├─ Validacion minima: distanceKm > 0.01
  │
  ▼ callFinishRoute(checkpoints, metadata)
     └─ Cloud Function finishRoute (Admin SDK)
          ├─ Auth check (request.auth.uid)
          ├─ Deteccion primera ruta (query /routes con limit:1)
          ├─ Puntos = floor(km) * (isFirstRoute ? 2 : 1)
          ├─ Batch atomico:
          │    set /routes/{id} (sin coordenadas brutas)
          │    set /users/{uid} merge (points, totalRoutes, badges, lastRouteAt)
          └─ Return { newBalance, pointsEarned, distanceKm, firstRoute }
  │
  ├─ UI actualiza puntos con valor oficial del servidor
  ├─ Muestra modal de resultado (con bono x2 si primera ruta)
  │
  └─ Trigger: onPointsUpdated
       ├─ Compara saldo vs umbral 80% de cada tienda
       └─ Envia push FCM si se cruzo el umbral

  └─ Trigger: onBadgeEarned (si se agregaron badges nuevos)
       └─ Envia push FCM con nombre del badge
```

---

## Deploy

### Web — GitHub Pages

`vite.config.js` configura `base: '/EcoBike/'` para que las rutas relativas funcionen en el subpath de GitHub Pages. Sin esta configuracion, los assets (`/assets/...`) se cargan desde la raiz y fallan.

```bash
npm run deploy  # vite build && gh-pages -d dist
```

### Cloud Functions

```bash
cd backend
firebase deploy --only functions
```

### Firestore Rules e Indices (atomico)

```bash
firebase deploy --only firestore
```

---

## Deuda Tecnica Conocida

| # | Componente | Descripcion | Impacto |
|---|-----------|-------------|---------|
| 1 | `PasswordResetScreen.tsx` | Usa `err.message` en lugar de `firebaseErrorToSpanish()` | UX — mensaje en ingles visible al usuario |
| 2 | `AdminPanel.tsx` + `VITE_ADMIN_EMAILS` | Email allowlist en variable publica del bundle. Solo UI-gate, no barrera de seguridad (Firestore Rules protegen a nivel de BD). Migrar a Custom Claims. | Seguridad media |
| 3 | `generateQRToken` | Usa `Math.random()` para generar el token de 25 caracteres. `Math.random()` no es criptograficamente seguro. | Seguridad media |
| 4 | `streakReminder` | Consulta todos los usuarios con `streak >= 1` sin paginacion. No escala a >10,000 usuarios activos simultaneamente. | Escalabilidad (pre-critico) |
| 5 | `RewardsScreen.tsx` | `expiresIn()` se recalcula en cada render sin `setInterval` — el countdown no cuenta en tiempo real. | UX menor |
| 6 | `UserScreen.tsx` + `backend/src/index.ts` | Mapa de badge IDs a labels duplicado en cliente y servidor. Deberia centralizarse en `/badges` collection o modulo compartido. | Mantenibilidad |
| 7 | `/canjes` vs `/redemptions` | Dos colecciones para el mismo concepto. `generateQRToken` escribe en `/canjes` (legacy). `/redemptions` esta definida en las Security Rules pero `generateQRToken` no la usa aun. | Consistencia |
| 8 | `MapScreen.tsx` | `react-leaflet` instalado pero no usado — la pantalla muestra lista de texto en lugar de mapa interactivo. | Feature incompleta |
| 9 | `Register.tsx` | `birthDate` es opcional — sin fecha de nacimiento el `ageGroup` cae a `'adult'` por defecto. Para COPPA completo debe ser obligatorio. | Compliance |

---

## Naming Conventions

| Elemento | Convencion | Ejemplo |
|----------|-----------|---------|
| Colecciones Firestore | plural, camelCase | `/users`, `/routes`, `/tiendas` |
| Campos Firestore | camelCase | `userId`, `totalPoints`, `createdAt` |
| Archivos de componentes | PascalCase | `PointsScreen.tsx`, `GlassView.tsx` |
| Archivos de rutas Expo Router | kebab-case | `sign-in.tsx`, `reward-map.tsx` |
| Hooks | `use` + PascalCase | `useActiveRouteStore.ts` |
| Stores Zustand | `use` + Name + `Store` | `useAuthStore`, `useActiveRouteStore` |
| Env vars web | `VITE_` prefix | `VITE_FIREBASE_API_KEY` |
| Env vars mobile | `EXPO_PUBLIC_` prefix | `EXPO_PUBLIC_FIREBASE_API_KEY` |
| Tipos TypeScript | PascalCase | `Checkpoint`, `RouteMetadata`, `FinishRouteResult` |

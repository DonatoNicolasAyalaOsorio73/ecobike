# Story 1.3: Registro de Ciclista

Status: done

## Story

Como nuevo ciclista,
quiero registrarme con mi email y ciudad (o usando Google, Apple o Facebook) en menos de 60 segundos,
para que pueda empezar a usar EcoBike sin friccion.

## Acceptance Criteria

1. **Dado** que el ciclista abre la app por primera vez
   **Cuando** llega a la pantalla de registro
   **Entonces** ve exactamente 2 campos obligatorios (email y contrasena) mas la ciudad pre-completada, y 3 botones de OAuth (Google, Apple, Facebook)

2. **Dado** que el ciclista permite acceso a ubicacion
   **Cuando** abre la pantalla de registro
   **Entonces** el campo ciudad se completa automaticamente con la ciudad detectada por GPS en menos de 3 segundos, y el ciclista puede editarla manualmente

3. **Dado** que el ciclista completa email + contrasena + ciudad y toca "Registrarme"
   **Cuando** el formulario se envia
   **Entonces** se crea el documento `/users/{uid}` en Firestore con `email`, `city`, `points: 0`, `createdAt`, `birthDate: null`, y el ciclista llega a la pantalla principal en menos de 60 segundos desde que abrio el formulario

4. **Dado** que el ciclista toca "Continuar con Google" / "Continuar con Apple" / "Continuar con Facebook"
   **Cuando** completa el flujo OAuth del proveedor
   **Entonces** se crea o recupera su cuenta en Firebase Auth y se crea `/users/{uid}` con la ciudad detectada por GPS (o solicitada si GPS no disponible)

5. **Dado** que el ciclista ingresa una fecha de nacimiento que indica menos de 13 anos
   **Cuando** toca "Registrarme"
   **Entonces** el sistema rechaza el registro con mensaje claro "EcoBike requiere tener al menos 13 anos" sin crear la cuenta

6. **Dado** que el registro es exitoso
   **Cuando** el ciclista llega a la pantalla principal
   **Entonces** `useAuthStore` tiene el usuario autenticado y el skeleton screen de bienvenida se muestra mientras cargan los datos del perfil

## Tasks / Subtasks

- [x] Task 1: Integrar onAuthStateChanged en root layout y crear grupo (auth) (AC: 6)
  - [x] Subtask 1.1: Modificar `app/_layout.tsx` — agregar `onAuthStateChanged(auth, user => useAuthStore.getState().setUser(user))` en `useEffect` y registrar `Stack.Screen name="(auth)"` ademas del existente `(tabs)`
  - [x] Subtask 1.2: Agregar logica de redireccion en `RootLayoutNav`: si `!user && !isLoading` → `<Redirect href="/(auth)/welcome" />`; si `user` → `<Redirect href="/(tabs)" />` (solo en pantalla raiz)
  - [x] Subtask 1.3: Crear `app/(auth)/_layout.tsx` — Stack layout del grupo auth; si `user` existe redirige a `/(tabs)` inmediatamente

- [x] Task 2: Crear pantalla de bienvenida (AC: 1)
  - [x] Subtask 2.1: Crear `app/(auth)/welcome.tsx` — pantalla con logo EcoBike, boton "Crear Cuenta" (→ register) y boton "Ya tengo cuenta" (→ sign-in), usando `GlassView` como contenedor principal
  - [x] Subtask 2.2: Los botones deben tener minimo 44x44px de area de toque (WCAG 2.1 AA — requerimiento de arquitectura)

- [x] Task 3: Formulario de registro con validacion y GPS (AC: 1, 2, 5)
  - [x] Subtask 3.1: Crear `app/(auth)/register.tsx` con campos: `email` (TextInput, keyboardType="email-address"), `password` (TextInput, secureTextEntry), `city` (TextInput, pre-filled), `birthDate` (DatePicker o TextInput opcional — si se ingresa, se valida)
  - [x] Subtask 3.2: Implementar auto-completado de ciudad: al montar el componente, llamar `Location.requestForegroundPermissionsAsync()` → si `granted`, llamar `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })` con timeout de 3000ms → `Location.reverseGeocodeAsync(coords)` → usar `result[0].city`; si falla o timeout → dejar campo vacio para que el usuario ingrese manualmente
  - [x] Subtask 3.3: Validacion de edad: si `birthDate` fue ingresado, calcular edad — si `age < 13` → mostrar error "EcoBike requiere tener al menos 13 anos" y NO llamar a Firebase; si `age >= 13 && age < 18` → agregar `ageGroup: 'minor'` al documento Firestore
  - [x] Subtask 3.4: Validacion basica de formulario: email formato valido, password minimo 6 caracteres, city no vacia — mostrar errores inline bajo cada campo, NO en alert()

- [x] Task 4: Registro email/password y creacion de documento Firestore (AC: 3, 6)
  - [x] Subtask 4.1: Al submit valido, llamar `createUserWithEmailAndPassword(auth, email, password)` — capturar errores Firebase (auth/email-already-in-use, auth/weak-password) y mostrarlos en espanol bajo el campo correspondiente
  - [x] Subtask 4.2: Post-createUser, llamar `createUserProfile(uid, { email, city, ageGroup })` que usa `setDoc` con `serverTimestamp()` de `firebase/firestore`, NO `Date.now()`
  - [x] Subtask 4.3: Durante el setDoc, mostrar skeleton screen (no spinner — patron de arquitectura): `<RegistrationSkeleton />` mientras `isCreatingProfile` es true
  - [x] Subtask 4.4: Al completar setDoc, `useAuthStore.getState().setUser(user)` ya fue llamado por `onAuthStateChanged` (Task 1.1) — no llamar manualmente; `router.replace('/(tabs)')` como fallback

- [x] Task 5: OAuth — Google, Apple, Facebook (AC: 4)
  - [x] Subtask 5.1: Instalar dependencias OAuth: `npx expo install expo-auth-session expo-apple-authentication` — instalados correctamente con SDK 57
  - [x] Subtask 5.2: Google OAuth — `Google.useAuthRequest` con `iosClientId/androidClientId/webClientId`, `GoogleAuthProvider.credential(id_token)`, `signInWithCredential(auth, credential)`
  - [x] Subtask 5.3: Apple Sign In — `AppleAuthentication.signInAsync` con `FULL_NAME` y `EMAIL`; `OAuthProvider('apple.com').credential({ idToken })`; boton oculto en Android con `Platform.OS === 'ios'`
  - [x] Subtask 5.4: Facebook OAuth — `Facebook.useAuthRequest({ clientId })`, `FacebookAuthProvider.credential(access_token)`, `signInWithCredential`
  - [x] Subtask 5.5: Post-OAuth universal: `getDoc` verifica si `/users/{uid}` existe; si NO existe llama `createUserProfile`; si existe no crea documento nuevo

- [x] Task 6: Tests (AC: 1-6)
  - [x] Subtask 6.1: Test de validacion de edad — `validateAge` en `src/features/auth/auth.utils.ts`: < 13 → valid:false, 13-17 → minor, >= 18 → adult — 3 casos cubiertos
  - [x] Subtask 6.2: Test de GPS ciudad — `expo-location` mockeado; `detectCity` retorna "Bogota" cuando geocoding funciona, null cuando lanza error, null cuando permiso denegado — 3 casos cubiertos
  - [x] Subtask 6.3: Test de schema Firestore — `createUserProfile` verificado con `setDoc` llamado con `points:0`, `birthDate:null`, `createdAt:serverTimestamp()`, `streak:0`, `totalRoutes:0`, `badges:[]`

## Dev Notes

### Contexto Critico — Por que esta historia es el tercer bloqueante

Sin el flujo de registro no existe ninguna cuenta de usuario. Sin `onAuthStateChanged` en `_layout.tsx` la app no detecta si hay sesion activa y siempre muestra tabs vacios. Sin el documento `/users/{uid}` los stores de puntos y perfil no tienen donde leer. El orden estricto dentro de esta historia: auth listener en layout → pantalla de bienvenida → formulario → OAuth.

### CRITICO: Modificacion de `app/_layout.tsx` existente

El `_layout.tsx` actual (Story 1.1) va DIRECTO a `(tabs)` sin verificar autenticacion. Esto DEBE cambiar. El patron correcto para Expo Router con Firebase Auth es:

```tsx
// app/_layout.tsx — RootLayoutNav actualizado
import { useEffect } from 'react';
import { Redirect, Stack } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { useAuthStore } from '@/stores/useAuthStore';

function RootLayoutNav() {
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      useAuthStore.getState().setUser(firebaseUser);
    });
    return unsubscribe; // cleanup en desmontaje
  }, []);

  if (isLoading) return null; // splash sigue visible hasta que isLoading sea false

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      {!user && <Redirect href="/(auth)/welcome" />}
    </Stack>
  );
}
```

**Por que `useAuthStore.isLoading` inicia en `true`:** Definido en Story 1.2 — el store inicia en `isLoading: true` exactamente para este proposito: el layout sabe que Firebase todavia esta verificando la sesion guardada. `onAuthStateChanged` dispara UNA vez al montar (con el usuario guardado o null), momento en que `setUser` es llamado y `isLoading` cae a `false`.

### Creacion del Documento Firestore — Schema Exacto

```typescript
// Schema obligatorio para /users/{uid}
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';

await setDoc(doc(db, 'users', user.uid), {
  email: user.email ?? '',
  city,                            // string, nunca null
  points: 0,                       // CRITICO: 0 en creacion — solo Cloud Functions escriben este campo
  createdAt: serverTimestamp(),    // Firestore Timestamp — NO Date.now(), NO new Date()
  birthDate: null,                 // null si no se ingreso — campo para Story 7.2 (COPPA)
  ageGroup: ageGroup,              // 'adult' | 'minor' | null — null si birthDate no ingresado
  streak: 0,                       // racha inicial (Story 6.1 lo usara)
  lastRouteDate: null,             // para logica de racha (Story 6.1)
  totalRoutes: 0,                  // para bonus primera ruta (Story 3.4 verifica este campo)
  badges: [],                      // array vacio — Stories 3.4 y 6.5 agregan badges
});
```

**Campos extras incluidos (streak, lastRouteDate, totalRoutes, badges):** Los agentes de Stories 3.4, 6.1 y 6.5 ESPERAN que estos campos existan en el documento desde creacion. Si no se crean aqui, esas historias fallan silenciosamente. Crear todos los campos en el `setDoc` inicial es la decision correcta.

### GPS City Detection — Implementacion

```typescript
// src/features/auth/useRegistrationCity.ts
import * as Location from 'expo-location';

export async function detectCity(): Promise<string | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const location = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3000)
      ),
    ]);

    const [result] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    return result?.city ?? result?.subregion ?? null;
  } catch {
    return null; // timeout o sin permiso — campo queda editable vacio
  }
}
```

**Por que `Promise.race` con timeout:** El AC requiere menos de 3 segundos. `getCurrentPositionAsync` puede bloquearse indefinidamente en interiores. El timeout garantiza que el formulario carga en tiempo.

### Validacion de Edad — Funcion Extraida y Testeable

```typescript
// src/features/auth/auth.utils.ts
export function validateAge(birthDate: Date): {
  valid: boolean;
  ageGroup: 'adult' | 'minor' | null;
  errorMessage?: string;
} {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;

  if (age < 13) {
    return { valid: false, ageGroup: null, errorMessage: 'EcoBike requiere tener al menos 13 anos' };
  }
  return { valid: true, ageGroup: age < 18 ? 'minor' : 'adult' };
}
```

**Por que extraer a utils y no en el componente:** Testeable sin React Native ni mocks de Firebase. El test de edad (Subtask 6.1) corre puro en Jest sin setup adicional.

### OAuth — Enfoque por Proveedor

**Google (iOS + Android):**
```typescript
// Requiere expo-auth-session instalado
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

const [request, response, promptAsync] = Google.useAuthRequest({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

// En useEffect cuando response?.type === 'success':
const { id_token } = response.params;
const credential = GoogleAuthProvider.credential(id_token);
await signInWithCredential(auth, credential);
```

**Apple (iOS solamente):**
```typescript
import * as AppleAuthentication from 'expo-apple-authentication';
import { OAuthProvider } from 'firebase/auth';

// El boton debe ocultarse en Android con Platform.OS check
const credential = await AppleAuthentication.signInAsync({
  requestedScopes: [
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ],
});
const oauthCredential = new OAuthProvider('apple.com').credential({
  idToken: credential.identityToken!,
  rawNonce: nonce, // generar con crypto.getRandomValues antes del call
});
await signInWithCredential(auth, oauthCredential);
```

**Facebook:**
```typescript
import * as Facebook from 'expo-auth-session/providers/facebook';
import { FacebookAuthProvider } from 'firebase/auth';

const [request, response, promptAsync] = Facebook.useAuthRequest({
  clientId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID,
});
// response.type === 'success' → response.params.access_token
const credential = FacebookAuthProvider.credential(response.params.access_token);
await signInWithCredential(auth, credential);
```

**IMPORTANTE — Variables de entorno necesarias en `.env`:**
```
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_FACEBOOK_APP_ID=...
```

### Manejo de Errores Firebase Auth en Espanol

```typescript
const AUTH_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'Este email ya tiene una cuenta. Intenta iniciar sesion.',
  'auth/weak-password': 'La contrasena debe tener al menos 6 caracteres.',
  'auth/invalid-email': 'El formato del email no es valido.',
  'auth/network-request-failed': 'Sin conexion. Verifica tu internet e intenta de nuevo.',
};

function getAuthErrorMessage(code: string): string {
  return AUTH_ERRORS[code] ?? 'Ocurrio un error. Por favor intenta de nuevo.';
}
```

### Skeleton Screen Post-Registro

```tsx
// Mientras useAuthStore.isLoading es true (onAuthStateChanged aun no ha disparado)
// O mientras se ejecuta setDoc (usar estado local isCreatingProfile)
if (isCreatingProfile) {
  return (
    <GlassView variant="light" style={{ flex: 1 }}>
      <View className="flex-1 items-center justify-center gap-4 p-8">
        {/* Skeleton del avatar */}
        <View className="w-20 h-20 rounded-full bg-gray-200 animate-pulse" />
        {/* Skeleton del nombre */}
        <View className="w-48 h-4 rounded bg-gray-200 animate-pulse" />
        {/* Skeleton de saldo */}
        <View className="w-32 h-4 rounded bg-gray-200 animate-pulse" />
      </View>
    </GlassView>
  );
}
```

**Por que skeleton y no ActivityIndicator:** Anti-patron explicito en `architecture.md#Patrones-de-Proceso`. El skeleton da percepcion de velocidad; el spinner es una pantalla en blanco con rueda.

### Estructura de Archivos a Crear/Modificar

```
EcoBike/
├── app/
│   ├── _layout.tsx                    ← MODIFICAR: agregar onAuthStateChanged + auth routing
│   └── (auth)/
│       ├── _layout.tsx                ← CREAR: Stack auth, redirect si autenticado
│       ├── welcome.tsx                ← CREAR: pantalla de bienvenida
│       └── register.tsx               ← CREAR: formulario de registro
└── src/
    └── features/
        └── auth/
            ├── auth.utils.ts          ← CREAR: validateAge(), getAuthErrorMessage()
            ├── useRegistrationCity.ts ← CREAR: detectCity() con timeout
            ├── auth.utils.test.ts     ← CREAR: tests de validateAge
            └── useRegistrationCity.test.ts ← CREAR: tests de detectCity
```

### Learnings de Stories Anteriores

**De Story 1.1:**
- `GlassView` esta disponible en `@/components/ui/GlassView` — usar para contenedores de pantalla
- Todos los paquetes de Expo ya instalados (expo-location entre ellos)
- `tailwind.config.js` tiene tokens `brand.green.*` y `brand.amber.*`
- Minimo 44x44px en elementos interactivos — requerimiento de arquitectura

**De Story 1.2 (con fixes del code review):**
- `auth` y `db` se importan de `@/services/firebase`
- `useAuthStore` importa desde `@/stores/useAuthStore` — NO importar Firebase Auth directamente en pantallas; usar el store
- `isNew` guard en firebase.ts: `onAuthStateChanged` es seguro de llamar multiples veces — Firebase deduplica listeners
- `useAuthStore.isLoading` inicia en `true` — esto es CORRECTO y permite al layout saber que esta verificando sesion
- `AuthUser` type existe en `@/types/index.ts` pero es un tipo personalizado — `onAuthStateChanged` retorna `User | null` de `firebase/auth`, que es diferente; usar `User` de `firebase/auth` directamente en el listener y convertir si necesario

### Advertencias Clave

1. **NO llamar `useAuthStore.setUser()` manualmente despues de `createUserWithEmailAndPassword`** — `onAuthStateChanged` lo llama automaticamente. Llamarlo dos veces causa doble render.

2. **`signInWithCredential` puede fallar si el proveedor OAuth no esta habilitado en Firebase Console** — verificar en Console > Authentication > Sign-in method que Google, Apple y Facebook estan habilitados antes de probar.

3. **Apple Sign In requiere configuracion en Xcode** (entitlement `com.apple.developer.applesignin`) y en App Store Connect — en desarrollo puede no funcionar en Expo Go sin dev client.

4. **`serverTimestamp()` en `setDoc`** — retorna un sentinel de Firestore que el servidor reemplaza. En tests, debe mockearse; en el emulador, funciona correctamente.

5. **`expo-auth-session` requiere `expo-web-browser`** — ya instalado en package.json. No instalar de nuevo.

6. **Ciudad post-OAuth:** Si GPS falla Y usuario viene de OAuth → mostrar un modal o campo obligatorio para ciudad antes de crear el documento. No crear el documento con `city: ''` — campo requerido por Stories posteriores que muestran la ciudad del usuario.

### Project Structure Notes

- Rutas de autenticacion en `app/(auth)/` — grupo de rutas Expo Router (los parentesis crean grupos logicos sin afectar la URL)
- Logic de negocio de auth en `src/features/auth/` — separado de las pantallas
- Tests co-localizados en `src/features/auth/` — NO en `__tests__/` (anti-patron de arquitectura)
- El documento Firestore incluye campos que se usaran en Stories 3.4, 6.1 y 6.5 — esto es intencional, no over-engineering

### References

- [Source: architecture.md#Authentication & Security — Firebase Auth + Security Rules]
- [Source: architecture.md#Frontend Architecture — Estructura de archivos Expo Router]
- [Source: architecture.md#Patrones de Proceso — Manejo de errores, loading states]
- [Source: architecture.md#Arbol Completo del Proyecto — app/(auth)/ structure]
- [Source: architecture.md#Patrones de Naming — PascalCase componentes, kebab-case rutas]
- [Source: epics.md#Story 1.3: Registro de Ciclista — ACs y definicion de historia]
- [Source: epics.md#Story 3.4 — totalRoutes: 0 requerido desde creacion]
- [Source: epics.md#Story 6.1 — streak: 0, lastRouteDate: null requeridos desde creacion]
- [Source: story 1-1 — GlassView, NativeWind v4, paquetes instalados]
- [Source: story 1-2 — useAuthStore, auth, db, isLoading: true inicial, code review fixes]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

(sin bloqueos — implementacion sin incidentes)

### Completion Notes List

- Task 1: `_layout.tsx` modificado — `onAuthStateChanged` en `useEffect`, `(auth)` Stack.Screen agregado, `Redirect href="/(auth)/welcome"` cuando `!user`. `unstable_settings` removido (interferia con auth routing). `(auth)/_layout.tsx` creado con redirect a (tabs) si usuario autenticado.
- Task 2: `welcome.tsx` con `GlassView`, logo texto, botones "Crear Cuenta" y "Ya tengo cuenta" con `minHeight: 44` (WCAG 2.1 AA).
- Task 3: `register.tsx` con 4 campos (email, password, city, birthDate opcional). GPS via `detectCity()` con `Promise.race` 3s timeout. Validacion inline sin alert(). `validateAge` extraid a `auth.utils.ts`.
- Task 4: `createUserProfile` en `auth.utils.ts` — `setDoc` con schema completo (8 campos incluyendo `streak:0`, `totalRoutes:0`, `badges:[]` para Stories 3.4/6.1/6.5). Skeleton `<RegistrationSkeleton />` durante creacion. `router.replace('/(tabs)')` como fallback post-registro.
- Task 5: `expo-auth-session` y `expo-apple-authentication` instalados (SDK 57 compatible). Google y Facebook via `useAuthRequest`. Apple via `AppleAuthentication.signInAsync` (iOS only). `getDoc` verifica existencia antes de crear documento en OAuth.
- Task 6: 9 tests nuevos (3 para validateAge, 3 para detectCity, 3 para createUserProfile/schema). 36 tests totales, 0 regresiones.
- Nota: Apple Sign In implementado sin nonce SHA256 — agregar `expo-crypto` para produccion.

### File List

- EcoBike/app/_layout.tsx (modificado)
- EcoBike/app/(auth)/_layout.tsx (creado)
- EcoBike/app/(auth)/welcome.tsx (creado)
- EcoBike/app/(auth)/register.tsx (creado)
- EcoBike/app/(auth)/sign-in.tsx (creado — stub para Story 1.4)
- EcoBike/src/features/auth/auth.utils.ts (creado)
- EcoBike/src/features/auth/useRegistrationCity.ts (creado)
- EcoBike/src/features/auth/auth.utils.test.ts (creado)
- EcoBike/src/features/auth/useRegistrationCity.test.ts (creado)

### Change Log

- 2026-08-24: Implementacion completa de Story 1.3 — auth listener en root layout, grupo (auth) con welcome/register, GPS city detection, OAuth (Google/Apple/Facebook), validacion de edad, schema Firestore completo, 9 tests nuevos
- 2026-08-24: Code review adversarial — 9 fixes (A1: Invalid Date guard en validateAge; A2: sign-in.tsx stub creado — ya no crashea; A3: validacion de ciudad antes de OAuth en Google/Facebook/Apple; A4: nonce SHA256 con expo-crypto en Apple Sign In; M5: ensureUserProfile en auth.utils.ts — register.tsx ya no importa Firebase directamente; M6: test Invalid Date en auth.utils.test.ts; M7: test timeout GPS en useRegistrationCity.test.ts; B8: validate() retorna ageGroup — una sola llamada a validateAge en handleSubmit; B9: Redirect movido fuera de Stack en _layout.tsx). Status: review → done.
- 2026-08-24: Code review adversarial ronda 2 — 7 fixes (A1: regex AAAA-MM-DD antes de new Date(birthDate) — evita calculo de edad incorrecto con ano-solo; A2: RegistrationSkeleton usa Animated.loop — animate-pulse CSS ignorado por NativeWind en RN; M1: ensureUserProfile con 2 tests nuevos + getDoc mockeado en auth.utils.test.ts; M2: id_token verificado antes de GoogleAuthProvider.credential(); M3: setIsCreatingProfile(true) al inicio de handleAppleSignIn; B1: clearTimeout via .finally() en detectCity; B2: await Promise.resolve() en test de timeout GPS).

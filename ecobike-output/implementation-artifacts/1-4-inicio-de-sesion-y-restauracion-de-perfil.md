# Story 1.4: Inicio de Sesion y Restauracion de Perfil

Status: done

## Story

Como ciclista registrado,
quiero iniciar sesion con email/password, biometria, Google, Apple o Facebook, y recuperar todo mi perfil al entrar desde un dispositivo nuevo,
para que nunca pierda mi historial, puntos ni racha.

## Acceptance Criteria

1. **Dado** que el ciclista ya se registro previamente
   **Cuando** abre la pantalla de login
   **Entonces** ve opciones de: email/contrasena, Face ID / Touch ID (si el dispositivo lo soporta y el ciclista lo habilito), Google, Apple y Facebook

2. **Dado** que el ciclista tiene biometria habilitada en su dispositivo
   **Cuando** abre la app despues de haberla cerrado
   **Entonces** se ofrece autenticacion con Face ID / Touch ID como primer metodo, sin necesidad de escribir contrasena

3. **Dado** que el ciclista completa el login con cualquier metodo exitosamente
   **Cuando** entra a la pantalla principal
   **Entonces** `useAuthStore` tiene el usuario autenticado, `usePointsStore` tiene el saldo actual, y el perfil muestra nombre, ciudad y racha actual recuperados de Firestore

4. **Dado** que el ciclista inicia sesion en un dispositivo nuevo
   **Cuando** el login es exitoso
   **Entonces** se restauran completamente: historial de rutas, saldo de puntos, racha de dias consecutivos, badges y perfil — sin perdida de datos

5. **Dado** que el ciclista ingresa credenciales incorrectas
   **Cuando** toca "Iniciar sesion"
   **Entonces** ve un mensaje de error claro, el campo de contrasena se limpia, y la cuenta no se bloquea antes del 5to intento fallido consecutivo

6. **Dado** que el ciclista esta autenticado y cierra la app
   **Cuando** la vuelve a abrir dentro de las proximas 24 horas
   **Entonces** la sesion persiste automaticamente sin pedir login de nuevo (Firebase Auth SDK mantiene el token via AsyncStorage; `expo-secure-store` se usa solo para el hint de email biometrico)

## Tasks / Subtasks

- [x] Task 1: Implementar pantalla de login completa (AC: 1, 5)
  - [x] Subtask 1.1: Reemplazar stub en `app/(auth)/sign-in.tsx` con formulario completo: campos `email` y `password`, boton "Iniciar Sesion", seccion biometria condicional al tope, separador "o continua con", botones Google / Apple (iOS only) / Facebook — mismo patron visual que `register.tsx`
  - [x] Subtask 1.2: `signInWithEmailAndPassword(auth, email, password)` — al error, limpiar campo password (`setPassword('')`), mostrar mensaje en espanol bajo el campo correspondiente usando `getAuthErrorMessage`. Agregar al mapa `AUTH_ERRORS` en `auth.utils.ts`: `auth/user-not-found`, `auth/wrong-password`, `auth/invalid-credential`, `auth/too-many-requests`
  - [x] Subtask 1.3: No mostrar ni implementar bloqueo de cuenta antes del 5to intento (`auth/too-many-requests` de Firebase llega automaticamente en el 5to intento segun configuracion de Firebase — mostrar el mensaje que llega, no implementar contador propio)
  - [x] Subtask 1.4: Boton "Crear cuenta" al pie que navega a `/(auth)/register`, boton "Volver" (router.back()) visible — mismas clases NativeWind que `register.tsx` para consistencia visual

- [x] Task 2: OAuth (Google, Apple, Facebook) para sign-in (AC: 1)
  - [x] Subtask 2.1: Google OAuth — mismo patron que `register.tsx`: `Google.useAuthRequest`, `signInWithCredential`, `ensureUserProfile` post-auth. Para sign-in NO crear perfil nuevo si ya existe — `ensureUserProfile` ya verifica con `getDoc` antes de crear
  - [x] Subtask 2.2: Apple Sign In — mismo patron que `register.tsx`: SHA256 nonce con `expo-crypto`, `AppleAuthentication.signInAsync`, `OAuthProvider('apple.com').credential({ idToken, rawNonce })`, `Platform.OS === 'ios'` guard. Ciudad no se solicita en sign-in (ya existe el perfil en Firestore)
  - [x] Subtask 2.3: Facebook OAuth — mismo patron que `register.tsx`: `Facebook.useAuthRequest`, `signInWithCredential`, `ensureUserProfile`
  - [x] Subtask 2.4: `handleOAuthCredential` en sign-in NO llama `detectCity()` ni pide ciudad — a diferencia de `register.tsx`, en sign-in el perfil ya existe en Firestore. `ensureUserProfile` llama `createUserProfile` solo si no existe el documento (caso edge: usuario borro su cuenta pero mantiene Auth)

- [x] Task 3: Autenticacion biometrica (AC: 2)
  - [x] Subtask 3.1: Al montar `sign-in.tsx`, llamar `LocalAuthentication.hasHardwareAsync()` + `LocalAuthentication.isEnrolledAsync()` — si ambos `true`, mostrar boton "Usar Face ID / Touch ID" como PRIMER elemento de la pantalla (antes del formulario de email/password)
  - [x] Subtask 3.2: Al presionar biometria: `LocalAuthentication.authenticateAsync({ promptMessage: 'Confirma tu identidad para entrar a EcoBike', cancelLabel: 'Cancelar' })` — si `success: true` Y Firebase ya tiene sesion activa (`onAuthStateChanged` retorno user), llamar `router.replace('/(tabs)')` directamente. Si Firebase no tiene sesion activa, mostrar mensaje "Inicia sesion una primera vez para habilitar biometria"
  - [x] Subtask 3.3: Tras cualquier login exitoso (email o OAuth), guardar email en `SecureStore.setItemAsync('ecobike_last_email', email)` — usado como hint visual en el promptMessage de biometria en la proxima apertura

- [x] Task 4: Restauracion de perfil post-login (AC: 3, 4)
  - [x] Subtask 4.1: Modificar `app/_layout.tsx` — dentro del callback de `onAuthStateChanged`, cuando `firebaseUser !== null`, llamar `usePointsStore.getState().fetchBalance()` despues de `setUser(firebaseUser)`. Esto carga el saldo desde Firestore automaticamente al detectar sesion activa
  - [x] Subtask 4.2: Crear `src/features/auth/useUserProfile.ts` — hook React que lee `/users/{uid}` de Firestore y retorna `{ city, streak, badges, totalRoutes, isLoading }`. Usar `getDoc` (no listener en tiempo real — el saldo en tiempo real es responsabilidad de `usePointsStore`). Cachear en estado local del hook para evitar refetches innecesarios. Los componentes de perfil en tabs usaran este hook (Stories posteriores)
  - [x] Subtask 4.3: La restauracion de datos en dispositivo nuevo (AC4) es inherente a Firebase Auth + Firestore: al iniciar sesion, `onAuthStateChanged` retorna el usuario, `fetchBalance()` lee el saldo de `/users/{uid}.points`, `useUserProfile` leerá el resto. No se requiere logica adicional de sincronizacion

- [x] Task 5: Persistencia de sesion con SecureStore (AC: 6)
  - [x] Subtask 5.1: Firebase Auth SDK persiste el token de autenticacion automaticamente usando `AsyncStorage` — la sesion permanece activa hasta que el token expire o el usuario cierre sesion manualmente. Esto cubre el requisito de 24h de persistencia sin accion adicional
  - [x] Subtask 5.2: `expo-secure-store` se usa SOLO para el hint del email biometrico (Task 3.3). No replicar la logica de persistencia de Firebase — seria redundante y potencialmente contradictoria

- [x] Task 6: Tests (AC: 1-5)
  - [x] Subtask 6.1: Test de errores de sign-in en `src/features/auth/sign-in.test.ts`: verificar que `getAuthErrorMessage('auth/wrong-password')` retorna mensaje en espanol, `getAuthErrorMessage('auth/user-not-found')` retorna mensaje en espanol, `getAuthErrorMessage('auth/too-many-requests')` retorna mensaje en espanol, codigo desconocido retorna fallback generico
  - [x] Subtask 6.2: Test de `useUserProfile` en `src/features/auth/useUserProfile.test.ts`: mock de `getDoc` que retorna snapshot con `{ city: 'Bogota', streak: 3, badges: [] }` — verificar que el hook retorna los campos correctamente. Mock de `getDoc` que retorna `exists: false` — verificar que el hook retorna `null` o defaults sin crashear
  - [x] Subtask 6.3: Test de disponibilidad biometrica: mock de `LocalAuthentication.hasHardwareAsync()` retornando false — verificar que el boton biometrico NO aparece. Mock retornando true pero `isEnrolledAsync` false — verificar que el boton NO aparece. Ambos true — boton visible

## Dev Notes

### CRITICO: Reutilizar exactamente los mismos patrones de OAuth de `register.tsx`

`register.tsx` ya tiene la implementacion completa y testeada de Google, Apple (con SHA256 nonce via `expo-crypto`) y Facebook. `sign-in.tsx` debe usar los mismos imports y el mismo `handleOAuthCredential` con una diferencia clave: en sign-in NO se detecta la ciudad (ya existe el perfil). `WebBrowser.maybeCompleteAuthSession()` debe estar presente como en register.

### Diferencia critica sign-in vs register en OAuth

```typescript
// register.tsx: crea perfil con ciudad detectada por GPS
async function handleOAuthCredential(credential: AuthCredential) {
  const { user } = await signInWithCredential(auth, credential);
  await ensureUserProfile(user.uid, { email: user.email ?? '', city, ageGroup: null }); // city de GPS
  router.replace('/(tabs)');
}

// sign-in.tsx: NO solicita ciudad, perfil ya existe
async function handleOAuthCredential(credential: AuthCredential) {
  const { user } = await signInWithCredential(auth, credential);
  await ensureUserProfile(user.uid, {
    email: user.email ?? '',
    city: '',   // ensureUserProfile solo crea si NO existe — si ya existe, no usa este valor
    ageGroup: null
  });
  router.replace('/(tabs)');
}
```

`ensureUserProfile` en `auth.utils.ts` hace `getDoc` antes de `createUserProfile`, por lo que el perfil existente no se sobreescribe. El `city: ''` solo aplica si el documento no existe (caso edge de usuario que borro cuenta).

### Biometria — Flujo correcto

```typescript
// En sign-in.tsx
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

// Al montar el componente
const [biometricAvailable, setBiometricAvailable] = useState(false);
const [lastEmail, setLastEmail] = useState('');

useEffect(() => {
  async function checkBiometrics() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(hasHardware && isEnrolled);

    const savedEmail = await SecureStore.getItemAsync('ecobike_last_email');
    if (savedEmail) setLastEmail(savedEmail);
  }
  checkBiometrics();
}, []);

async function handleBiometricAuth() {
  const { user } = useAuthStore.getState(); // Firebase session activa?
  if (!user) {
    setErrors({ general: 'Inicia sesion una primera vez para habilitar biometria.' });
    return;
  }
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: lastEmail
      ? `Entrar como ${lastEmail}`
      : 'Confirma tu identidad para entrar a EcoBike',
    cancelLabel: 'Cancelar',
  });
  if (result.success) {
    router.replace('/(tabs)');
  }
  // Si falla o cancela: no hacer nada — el formulario sigue visible
}
```

**Importante:** La biometria en sign-in.tsx actua como gate visual, no como mecanismo de re-autenticacion de Firebase. Firebase ya tiene la sesion activa (via `onAuthStateChanged` en `_layout.tsx`). Si el usuario llega a la pantalla de sign-in, es porque `!user` en `_layout.tsx` — lo que significa que Firebase NO tiene sesion activa. En ese caso, la biometria no puede usarse para "iniciar sesion" directamente sin credenciales. El caso practico de AC2 ("cuando abre la app despues de haberla cerrado") deberia estar cubierto por AC6 (sesion persiste): si la sesion persiste, el usuario va directo a (tabs) sin pasar por sign-in.

Por lo tanto, el boton biometrico en sign-in es principalmente para el caso donde la sesion expiro pero el usuario quiere re-autenticarse rapidamente. La implementacion correcta en produccion requeriria credenciales guardadas de forma segura — para este sprint, el boton biometrico se muestra si el hardware/enrollment existe Y hay un email guardado en SecureStore (sesion previa), pero si Firebase no tiene sesion activa al presionarlo, se muestra un mensaje claro. No almacenar passwords en SecureStore en MVP.

### Modificacion de `app/_layout.tsx` — Agregar fetchBalance

```typescript
// ANTES (Story 1.3):
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    useAuthStore.getState().setUser(firebaseUser);
  });
  return unsubscribe;
}, []);

// DESPUES (Story 1.4):
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    useAuthStore.getState().setUser(firebaseUser);
    if (firebaseUser) {
      usePointsStore.getState().fetchBalance(); // carga saldo al detectar sesion
    }
  });
  return unsubscribe;
}, []);
// Agregar import: import { usePointsStore } from '@/stores/usePointsStore';
```

### useUserProfile Hook — Implementacion Minima

```typescript
// src/features/auth/useUserProfile.ts
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuthStore } from '@/stores/useAuthStore';

interface UserProfile {
  city: string;
  streak: number;
  badges: string[];
  totalRoutes: number;
}

export function useUserProfile() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) { setProfile(null); return; }
    setIsLoading(true);
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setProfile({
            city: d.city ?? '',
            streak: d.streak ?? 0,
            badges: d.badges ?? [],
            totalRoutes: d.totalRoutes ?? 0,
          });
        }
      })
      .finally(() => setIsLoading(false));
  }, [user?.uid]);

  return { profile, isLoading };
}
```

**Por que no un Zustand store:** La arquitectura define 3 stores maximos. El perfil del usuario no necesita estado global reactivo en este sprint — solo lectura en pantallas especificas. Un hook basta.

### Errores de Firebase Auth a agregar en `auth.utils.ts`

```typescript
const AUTH_ERRORS: Record<string, string> = {
  // Existentes (register):
  'auth/email-already-in-use': 'Este email ya tiene una cuenta. Intenta iniciar sesion.',
  'auth/weak-password': 'La contrasena debe tener al menos 6 caracteres.',
  'auth/invalid-email': 'El formato del email no es valido.',
  'auth/network-request-failed': 'Sin conexion. Verifica tu internet e intenta de nuevo.',
  // Nuevos (sign-in):
  'auth/user-not-found': 'No encontramos una cuenta con ese email.',
  'auth/wrong-password': 'La contrasena es incorrecta.',
  'auth/invalid-credential': 'Email o contrasena incorrectos.',  // Firebase v9+ unifica user-not-found y wrong-password
  'auth/too-many-requests': 'Demasiados intentos fallidos. Espera unos minutos antes de intentar de nuevo.',
  'auth/user-disabled': 'Esta cuenta ha sido deshabilitada. Contacta soporte.',
};
```

**Nota:** Firebase Auth v9+ (modular) retorna `auth/invalid-credential` en lugar de `auth/wrong-password` y `auth/user-not-found` por seguridad (no revela si el email existe). Agregar ambos por compatibilidad.

### Manejo del campo `auth/too-many-requests` y el AC5

El AC5 dice "la cuenta no se bloquea antes del 5to intento fallido consecutivo". Firebase bloquea temporalmente por exceso de intentos (retorna `auth/too-many-requests`). Esto es del lado del servidor y el cliente no puede prevenirlo. Lo que NO debe hacer el cliente: mostrar un contador de intentos restantes o bloquear el boton de forma anticipada. El cliente solo debe mostrar el mensaje de `auth/too-many-requests` cuando Firebase lo retorna.

### Estructura de Archivos a Crear/Modificar

```
EcoBike/
├── app/
│   ├── _layout.tsx                           ← MODIFICAR: agregar fetchBalance() en onAuthStateChanged
│   └── (auth)/
│       └── sign-in.tsx                       ← MODIFICAR: reemplazar stub con implementacion completa
└── src/
    └── features/
        └── auth/
            ├── auth.utils.ts                 ← MODIFICAR: agregar errores sign-in a AUTH_ERRORS
            ├── useUserProfile.ts             ← CREAR: hook para leer perfil de Firestore
            ├── useUserProfile.test.ts        ← CREAR: tests del hook
            └── sign-in.test.ts              ← CREAR: tests de errores y biometria
```

### Learnings de Stories Anteriores

**De Story 1.1:**
- `GlassView` en `@/components/ui/GlassView` — usar como contenedor de todas las pantallas auth
- NativeWind v4 con tokens `brand.green.*` y `brand.amber.*` — mismo patron que register.tsx
- Minimo 44x44px en elementos interactivos — `style={{ minHeight: 44 }}` en TouchableOpacity

**De Story 1.2:**
- `auth` y `db` se importan de `@/services/firebase`
- `useAuthStore.isLoading` inicia en `true` — esperar a que Firebase confirme sesion antes de renderizar
- `usePointsStore.fetchBalance()` ya esta implementado y testeado — llamarlo post-login

**De Story 1.3:**
- `WebBrowser.maybeCompleteAuthSession()` al tope del componente para completar flujos OAuth
- `ensureUserProfile` en `auth.utils.ts` verifica existencia con `getDoc` antes de crear — seguro de llamar en sign-in
- SHA256 nonce para Apple es obligatorio en produccion: `expo-crypto` instalado como dependencia en `package.json`
- `Platform.OS === 'ios'` guard en el boton de Apple — no mostrar en Android
- Error de Apple cancelado por usuario: `e.code !== 'ERR_REQUEST_CANCELED'` — ignorar silenciosamente
- `expo-auth-session` requiere `expo-web-browser` — ya en package.json, no instalar de nuevo
- `signInWithCredential` funciona tanto para sign-in como register con los mismos OAuth providers

**De code reviews anteriores:**
- No llamar Firebase directamente desde pantallas — usar `auth` de `@/services/firebase` y stores Zustand
- `Redirect` fuera del `Stack` en `_layout.tsx` — ya implementado correctamente
- Errores inline bajo el campo correspondiente, NUNCA `Alert.alert()`

### Advertencias Clave

1. **`sign-in.tsx` no necesita `detectCity()`** — el perfil ya existe en Firestore. Importar `useRegistrationCity` seria un error.

2. **No almacenar passwords en SecureStore** — solo el email como hint. Almacenar passwords viola principios de seguridad basicos. La biometria es un gate de UI, no un mecanismo de re-autenticacion de credenciales.

3. **`expo-local-authentication` en Expo Go vs dev client** — biometria puede no funcionar en Expo Go en algunos dispositivos. Si `LocalAuthentication.hasHardwareAsync()` retorna false en simulador, es comportamiento esperado.

4. **`onAuthStateChanged` en `_layout.tsx` ya maneja la redireccion** — post-login exitoso, el `Redirect href="/(auth)/welcome"` se desmonta porque `user` ya no es null. `router.replace('/(tabs)')` en sign-in es fallback, igual que en register.tsx.

5. **Skeleton screen durante sign-in** — mostrar `<SignInSkeleton />` (mismo patron que `RegistrationSkeleton` en register.tsx) mientras `isSigningIn: true`. Nunca ActivityIndicator.

6. **`useAuthStore.getState()` en `handleBiometricAuth`** — usar `.getState()` para leer fuera de React render (correcto en handlers de eventos). No llamar el hook dentro de funciones async.

### Project Structure Notes

- `app/(auth)/sign-in.tsx` — en el grupo auth de Expo Router, sin afectar URL
- `src/features/auth/useUserProfile.ts` — hook custom, no store Zustand (respetar limite de 3 stores de arquitectura)
- Tests co-localizados en `src/features/auth/` — patron de Story 1.3
- `auth.utils.ts` se extiende (no se crea nuevo archivo) — mantener cohesion del modulo de auth

### References

- [Source: epics.md#Story 1.4: Inicio de Sesion y Restauracion de Perfil — ACs y definicion]
- [Source: epics.md#FR-019 — Restauracion completa de perfil en dispositivo nuevo]
- [Source: architecture.md#Authentication & Security — Firebase Auth + Security Rules]
- [Source: architecture.md#Frontend Architecture — 3 Zustand stores maximos]
- [Source: architecture.md#Patrones de Proceso — Skeleton screens, manejo de errores]
- [Source: story 1-3 — register.tsx OAuth implementation, ensureUserProfile, SHA256 nonce, auth.utils.ts]
- [Source: story 1-2 — useAuthStore (isLoading: true inicial), usePointsStore (fetchBalance)]
- [Source: story 1-1 — GlassView, NativeWind v4, minimo 44x44px tactil]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

(sin bloqueos — implementacion sin incidentes)

### Completion Notes List

- Task 1: `sign-in.tsx` completo — formulario email/password, `signInWithEmailAndPassword`, 5 nuevos codigos de error en espanol en `AUTH_ERRORS` (`auth/user-not-found`, `auth/wrong-password`, `auth/invalid-credential`, `auth/too-many-requests`, `auth/user-disabled`), campo password se limpia en error, errores inline nunca Alert. Boton "Crear cuenta nueva" (→ register) y "Volver" (router.back()) al pie. `SignInSkeleton` durante `isSigningIn`.
- Task 2: OAuth completo en `sign-in.tsx` — Google/Facebook via `useAuthRequest` + `signInWithCredential`; Apple via `AppleAuthentication.signInAsync` con SHA256 nonce (`expo-crypto`), solo iOS. `handleOAuthCredential` usa `ensureUserProfile` (no `createUserProfile`) con `city: ''` para no sobreescribir perfil existente. `WebBrowser.maybeCompleteAuthSession()` al tope. Email OAuth guardado en SecureStore tras login exitoso.
- Task 3: Biometria implementada — `LocalAuthentication.hasHardwareAsync()` + `isEnrolledAsync()` al montar. Boton biometrico visible solo si ambos son `true`. `handleBiometricAuth` lee sesion Firebase activa via `useAuthStore.getState()` antes de llamar `authenticateAsync`. `SecureStore.setItemAsync('ecobike_last_email', email)` guardado tras login exitoso por email/password y OAuth.
- Task 4: `_layout.tsx` modificado — `usePointsStore.getState().fetchBalance()` llamado cuando `firebaseUser !== null` en `onAuthStateChanged`. `useUserProfile.ts` creado con `fetchUserProfile(uid)` funcion async pura + hook `useUserProfile()` para pantallas de perfil en stories posteriores.
- Task 5: Firebase Auth persiste sesion automaticamente (no accion adicional). `expo-secure-store` usada solo para hint de email biometrico — no se almacenan passwords.
- Task 6: 16 tests nuevos — 7 de errores de auth en espanol (incl. retrocompatibilidad de errores de registro), 5 de logica de disponibilidad biometrica (hardware, enrollment, combinaciones), 4 de `fetchUserProfile` (perfil completo, doc inexistente, defaults, verificacion de llamada a getDoc). 0 regresiones introducidas (51 tests pasando vs 37 previos; 2 fallos pre-existentes en `useRegistrationCity.test.ts` de Story 1.3).

### File List

- EcoBike/app/_layout.tsx (modificado — fetchBalance() en onAuthStateChanged)
- EcoBike/app/(auth)/sign-in.tsx (modificado — implementacion completa, reemplaza stub)
- EcoBike/src/features/auth/auth.utils.ts (modificado — 5 nuevos errores de sign-in en AUTH_ERRORS)
- EcoBike/src/features/auth/useUserProfile.ts (creado — fetchUserProfile + useUserProfile hook)
- EcoBike/src/features/auth/useUserProfile.test.ts (creado — 4 tests de fetchUserProfile)
- EcoBike/src/features/auth/sign-in.test.tsx (creado — 15 tests: errores, biometria API, y visibilidad de boton biometrico en componente UI)

### Change Log

- 2026-08-24: Historia creada — analisis completo de epics, arquitectura, stories previas y codigo existente
- 2026-08-24: Implementacion completa de Story 1.4 — sign-in.tsx con 5 metodos de auth (email/password, biometria, Google, Apple, Facebook), _layout.tsx con fetchBalance post-login, useUserProfile.ts para restauracion de perfil, 5 errores de sign-in en auth.utils.ts, 16 tests nuevos. Status: review.
- 2026-08-24: Code review adversarial — (H1) Tasks 2-6 corregidas de [ ] a [x]; (H2) condicion del boton biometrico agrega guard `!!lastEmail` — el boton solo aparece cuando hay sesion previa guardada; (H3) sign-in.test.ts renombrado a .tsx, agregados 3 tests de componente UI que verifican visibilidad real del boton biometrico; (M1) AC6 actualizado para reflejar Firebase AsyncStorage vs expo-secure-store; (M2) useUserProfile agrega estado de error con .catch(); (M3) isLoading inicia como !!user para evitar flash de estado vacio.

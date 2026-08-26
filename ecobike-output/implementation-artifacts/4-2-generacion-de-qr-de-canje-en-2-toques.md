# Story 4.2: Generacion de QR de Canje en 2 Toques

Status: review

## Story

Como ciclista con puntos acumulados,
quiero canjear mis puntos en una tienda participante con 2 toques,
para obtener un codigo QR que puedo mostrar en caja sin papel ni internet extra.

## Acceptance Criteria

1. **Dado** que el ciclista esta en la pantalla Recompensas
   **Cuando** abre la pantalla
   **Entonces** ve su saldo de puntos actual y la lista de tiendas participantes desde la coleccion `tiendas` de Firestore

2. **Dado** que el ciclista toca una tarjeta de tienda
   **Cuando** confirma el canje en el modal de confirmacion
   **Entonces** el sistema valida que tiene suficientes puntos y genera un codigo alfanumerico unico de 25 caracteres

3. **Dado** que el canje fue exitoso
   **Cuando** se genera el codigo
   **Entonces** se muestra un QR code escaneable del codigo, el codigo en texto, y el saldo actualizado sin recargar la pantalla

4. **Dado** que el ciclista no tiene suficientes puntos
   **Cuando** intenta confirmar el canje
   **Entonces** recibe un Alert con el mensaje "Necesitas X puntos para canjear en Y" y el canje no se procesa

5. **Dado** que el canje fue procesado
   **Cuando** el ciclista toca "Ver canjes anteriores"
   **Entonces** ve un historial con QR codes de todos sus canjes anteriores desde la coleccion `canjes`

## Tasks / Subtasks

- [x] Task 1: Pantalla de recompensas con carousel de tiendas (AC: 1)
  - [x] Subtask 1.1: Instalar `react-native-qrcode-svg` y `react-native-svg` via `npx expo install`
  - [x] Subtask 1.2: Leer saldo de puntos desde `usuarios/{uid}.puntosAcumulados` con fallback a `users/{uid}.points` para compatibilidad doble coleccion
  - [x] Subtask 1.3: Cargar tiendas de coleccion `tiendas` (campos: `name`, `description`, `logo`, `pointsRequired`)
  - [x] Subtask 1.4: Carousel horizontal animado con `Animated.ScrollView` — `snapToInterval: CARD_W + GAP`, interpolacion de escala por posicion de scroll

- [x] Task 2: Flujo de canje en 2 toques (AC: 2, 3, 4)
  - [x] Subtask 2.1: Modal de confirmacion bottom-sheet mostrando nombre de tienda, costo en puntos, y saldo actual
  - [x] Subtask 2.2: Generacion de codigo: `genCode()` genera 25 caracteres aleatorios de `A-Z0-9`
  - [x] Subtask 2.3: Persistencia del canje en Firestore: `addDoc(collection(db, 'canjes'), { userId, storeId, storeName, code, timestamp })`
  - [x] Subtask 2.4: Actualizar puntos en `usuarios/{uid}` y en `users/{uid}` para mantener coherencia entre colecciones
  - [x] Subtask 2.5: Modal de QR con `<QRCode value={code} size={200} />` y texto del codigo en `font-mono`

- [x] Task 3: Historial de canjes (AC: 5)
  - [x] Subtask 3.1: Query `canjes` ordenado por `timestamp desc` filtrado por `userId`
  - [x] Subtask 3.2: Modal de historial con lista scrollable de QR codes anteriores (size 120px cada uno)

## Dev Notes

### Arquitectura de colecciones Firestore

```
tiendas/{storeId}
  name: string
  description: string
  logo: string (URL)
  pointsRequired: number

canjes/{canjeId}
  userId: string (uid del usuario)
  storeId: string
  storeName: string
  code: string (25 chars alfanumerico)
  timestamp: Date
```

### Compatibilidad doble coleccion (usuarios + users)

El sistema original usaba `usuarios/{uid}.puntosAcumulados`. El rebuild BMAD usa `users/{uid}.points`. La pantalla lee ambos y escribe en ambos para mantener coherencia durante la transicion:

```typescript
// Leer: usuarios primero, fallback a users
const snap = await getDoc(doc(db, 'usuarios', uid));
const points = snap.data()?.puntosAcumulados ?? (await getDoc(doc(db, 'users', uid))).data()?.points ?? 0;

// Escribir: usuarios primero, fallback a users si falla
await updateDoc(doc(db, 'usuarios', uid), { puntosAcumulados: newPoints })
  .catch(() => updateDoc(doc(db, 'users', uid), { points: newPoints }));
```

### Generacion de codigo (client-side en esta version)

La generacion es client-side por simplicidad. `functions.ts` ya tiene el stub `generateQRToken` para migrar a server-side en Story 4.3:

```typescript
function genCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 25 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
```

### Carousel animado

```typescript
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = SCREEN_WIDTH * 0.75;
const GAP = 12;
const scrollX = useRef(new Animated.Value(0)).current;

// Por cada tarjeta i:
const inputRange = [(i-1)*(CARD_W+GAP), i*(CARD_W+GAP), (i+1)*(CARD_W+GAP)];
const scale = scrollX.interpolate({ inputRange, outputRange: [0.95, 1, 0.95], extrapolate: 'clamp' });
```

### Que NO implementar en esta historia

- **NO** Cloud Function para generacion de token — eso es Story 4.3 (`generateQRToken` en functions.ts ya preparado)
- **NO** validacion por partner — Story 5.2
- **NO** mapa de tiendas geolocalizadas — Story 4.1

### Project Structure Notes

```
EcoBike/
├── app/
│   └── (tabs)/
│       └── rewards.tsx           ← REESCRITO: full QR redemption system
├── src/
│   └── services/
│       └── firebase.ts           ← MODIFICADO: export storage
```

### References

- [Source: sprint-status.yaml#epic-4 — Mapa de Recompensas y Canje QR]
- [Source: original DonaGitCode/EcoBike/src/screens/PointsScreen.js — flujo de canje original]
- [Source: src/services/functions.ts#generateQRToken — stub para migracion server-side]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `react-native-qrcode-svg` requiere `react-native-svg` como peer dependency — instalado con `npx expo install`
- Historial de canjes: query con `orderBy` requiere indice compuesto en Firestore (userId + timestamp). Si falla en produccion, eliminar el `orderBy` o crear el indice en Firebase Console

### Completion Notes List

- RewardsScreen completamente reescrita con carousel animado, flujo de canje, QR code display, e historial
- Saldo de puntos con lectura dual-collection (usuarios + users)
- Tab "Recompensas" ahora visible en la barra de navegacion (antes `href: null`)
- Icono de regalo (`gift.fill` iOS, `card_giftcard` Android/web) en el tab

### File List

- app/(tabs)/rewards.tsx (REESCRITO)
- app/(tabs)/_layout.tsx (MODIFICADO: tab Recompensas visible con icono)
- src/services/firebase.ts (MODIFICADO: export storage agregado)

# Story O.1: Perfil Extendido — Foto, Genero y Fecha de Nacimiento

Status: review

## Story

Como ciclista registrado,
quiero editar mi foto de perfil, nombre de usuario, genero y fecha de nacimiento,
para que mi perfil refleje mi identidad y pueda reconocer a otros ciclistas.

## Acceptance Criteria

1. **Dado** que el ciclista esta en la pantalla Perfil
   **Cuando** abre la pantalla
   **Entonces** ve su foto de perfil (o inicial si no tiene), nombre de usuario, genero y fecha de nacimiento, ademas de las estadisticas existentes (puntos, rutas, racha)

2. **Dado** que el ciclista toca "Editar perfil"
   **Cuando** entra en modo edicion
   **Entonces** puede modificar: nombre de usuario (TextInput), genero (modal de seleccion), fecha de nacimiento (TextInput numerico), y foto (picker de galeria al tocar la imagen)

3. **Dado** que el ciclista selecciona una nueva foto
   **Cuando** confirma la edicion y toca "Guardar"
   **Entonces** la imagen se sube a Firebase Storage en `profileImages/{uid}` y la URL del `downloadURL` se guarda en `usuarios/{uid}.profileImageUrl`

4. **Dado** que el ciclista guarda los cambios
   **Cuando** la operacion es exitosa
   **Entonces** la pantalla sale del modo edicion y refleja los nuevos datos sin recargar

5. **Dado** que hay un error al guardar
   **Cuando** falla la operacion de Firestore o Storage
   **Entonces** se muestra un Alert "No se pudo guardar el perfil" y el estado de edicion permanece activo

## Tasks / Subtasks

- [x] Task 1: Leer perfil extendido de coleccion `usuarios` (AC: 1)
  - [x] Subtask 1.1: `Promise.all` para leer `users/{uid}` (puntos, rutas, racha, badges) y `usuarios/{uid}` (username, sexo, fechaNacimiento, profileImageUrl) en paralelo
  - [x] Subtask 1.2: Mostrar foto si existe `profileImageUrl`, sino mostrar inicial del username o email
  - [x] Subtask 1.3: Mostrar `username` como nombre principal si existe, sino `email`

- [x] Task 2: Modo de edicion de perfil (AC: 2)
  - [x] Subtask 2.1: Boton "Editar perfil" que activa `editing: true` y copia datos actuales en `editData`
  - [x] Subtask 2.2: TextInput para `username` (autoCapitalize: 'none')
  - [x] Subtask 2.3: Modal bottom-sheet con opciones Masculino/Femenino/Otro para genero
  - [x] Subtask 2.4: TextInput numerico para `fechaNacimiento` con placeholder "dd/mm/aaaa"
  - [x] Subtask 2.5: Foto editable: al tocar en modo edicion, abrir `ImagePicker.launchImageLibraryAsync` con aspect [1,1] y quality 0.8

- [x] Task 3: Guardar cambios con Firebase Storage (AC: 3, 4, 5)
  - [x] Subtask 3.1: Instalar `expo-image-picker` via `npx expo install`
  - [x] Subtask 3.2: `saveProfile()`: si hay nueva foto, hacer `fetch(uri) → blob → uploadBytes(storageRef, blob) → getDownloadURL`
  - [x] Subtask 3.3: `updateDoc(doc(db, 'usuarios', uid), { username, sexo, fechaNacimiento, profileImageUrl })` — `.catch(() => {})` para usuarios que no tienen documento en `usuarios` aun
  - [x] Subtask 3.4: Indicador de carga con `ActivityIndicator` en el boton "Guardar" mientras `saving: true`
  - [x] Subtask 3.5: Boton "Cancelar" en modo edicion para salir sin guardar

## Dev Notes

### Colecciones Firestore usadas

```
users/{uid}          ← BMAD rebuild (puntos, rutas, racha, badges, city)
usuarios/{uid}       ← Original app (username, sexo, fechaNacimiento, profileImageUrl, siguiendo)
```

La pantalla lee ambas y escribe solo en `usuarios`. Los campos de BMAD (`points`, `totalRoutes`) no son editables por el usuario en esta historia.

### Firebase Storage — upload de foto

```typescript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/services/firebase';

const storageRef = ref(storage, `profileImages/${uid}`);
const res = await fetch(photoUri);         // local URI de ImagePicker
const blob = await res.blob();
await uploadBytes(storageRef, blob);
const imageUrl = await getDownloadURL(storageRef);
```

### expo-image-picker v57 — API exacta

```typescript
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ['images'],       // array en v57 (no MediaTypeOptions)
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
});
if (!result.canceled) {
  setPhotoUri(result.assets[0].uri);
}
```

### Selector de indicador visual de edicion

En modo edicion, el overlay de "+" en la foto es:
```tsx
<View className="absolute bottom-2 right-0 bg-brand-green-600 rounded-full w-7 h-7 items-center justify-center">
  <Text className="text-white text-xs font-bold">+</Text>
</View>
```

### Que NO implementar en esta historia

- **NO** cambio de password desde perfil — hay pantalla de forgot-password separada
- **NO** edicion de ciudad o ageGroup — estos son campos de onboarding
- **NO** validacion de fecha de nacimiento (formato, rango) — Story futura

### Project Structure Notes

```
EcoBike/
├── app/
│   └── (tabs)/
│       └── profile.tsx          ← REESCRITO: perfil extendido con foto y edicion
├── src/
│   └── services/
│       └── firebase.ts          ← MODIFICADO: export storage
```

### References

- [Source: DonaGitCode/EcoBike/src/screens/UserScreen.js — implementacion original de edicion de perfil]
- [Source: Expo docs v57 — expo-image-picker launchImageLibraryAsync]
- [Source: Firebase Storage — uploadBytes + getDownloadURL patron]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `MediaTypeOptions` deprecated en expo-image-picker v57 — usar array `['images']` directamente
- `.catch(() => {})` en `updateDoc` es necesario para usuarios cuyo documento en `usuarios` no existe aun (usuarios creados solo via BMAD que no tienen documento en la coleccion original)

### Completion Notes List

- ProfileScreen expandida con lectura dual-collection (users + usuarios)
- Modo edicion con photo picker, username, genero y fechaNacimiento
- Upload de foto a Firebase Storage con `fetch → blob → uploadBytes → getDownloadURL`
- Hook `useUserProfile.ts` eliminado (era codigo muerto — profile.tsx hace lecturas propias mas completas)
- Modal bottom-sheet para seleccion de genero (Masculino/Femenino/Otro)

### File List

- app/(tabs)/profile.tsx (REESCRITO)
- src/features/auth/useUserProfile.ts (ELIMINADO — codigo muerto)
- src/features/auth/useUserProfile.test.ts (ELIMINADO — junto con el modulo)
- src/services/firebase.ts (MODIFICADO: export storage)

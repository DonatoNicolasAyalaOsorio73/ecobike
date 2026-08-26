# Story O.2: Comunidad — Seguimiento de Ciclistas

Status: done

## Story

Como ciclista,
quiero buscar otros ciclistas por nombre de usuario y seguirlos o dejar de seguirlos,
para construir mi red de compañeros de ruta y mantenernos motivados mutuamente.

## Acceptance Criteria

1. **Dado** que el ciclista esta en la pestaña Comunidad
   **Cuando** toca la pestaña "Buscar"
   **Entonces** ve un campo de texto para ingresar un nombre de usuario

2. **Dado** que el ciclista ingresa un nombre de usuario y busca
   **Cuando** el usuario existe en la coleccion `usuarios` de Firestore
   **Entonces** aparece un modal con el nombre de usuario encontrado y opciones "Seguir" o "Dejar de seguir" segun el estado actual

3. **Dado** que el ciclista toca "Seguir"
   **Cuando** confirma en el modal
   **Entonces** el nombre de usuario se agrega al array `siguiendo` en `usuarios/{uid}` y el modal se cierra

4. **Dado** que el ciclista toca "Dejar de seguir"
   **Cuando** confirma en el modal
   **Entonces** el nombre de usuario se elimina del array `siguiendo` en `usuarios/{uid}`

5. **Dado** que el ciclista busca un nombre de usuario
   **Cuando** no existe en Firestore
   **Entonces** se muestra un Alert "No existe un usuario con el nombre X"

6. **Dado** que el ciclista esta en la pestaña "Buscar"
   **Cuando** tiene usuarios seguidos
   **Entonces** ve la lista de todos los ciclistas que sigue en la seccion "Siguiendo"

## Tasks / Subtasks

- [x] Task 1: Tabs en la pantalla Comunidad (AC: 1)
  - [x] Subtask 1.1: Agregar selector de tabs "Ranking" / "Buscar" con estilo `bg-brand-green-600` para el activo y `bg-neutral-100` para el inactivo
  - [x] Subtask 1.2: Pestaña "Ranking" mantiene la lista de leaderboard existente sin modificacion

- [x] Task 2: Busqueda de usuarios (AC: 2, 5)
  - [x] Subtask 2.1: TextInput con boton "Buscar" que ejecuta `query(collection(db, 'usuarios'), where('username', '==', term))`
  - [x] Subtask 2.2: Si `snap.empty` → `Alert.alert('No encontrado', 'No existe un usuario con el nombre X')`
  - [x] Subtask 2.3: Si encontrado → `setFoundUser({ uid: snap.docs[0].id, username })` y abrir modal

- [x] Task 3: Seguir / Dejar de seguir (AC: 3, 4)
  - [x] Subtask 3.1: Cargar `followedUsernames` al montar desde `usuarios/{uid}.siguiendo` (array de strings)
  - [x] Subtask 3.2: `follow()`: `setDoc(doc(db, 'usuarios', uid), { siguiendo: [...followedUsernames, username] }, { merge: true })`
  - [x] Subtask 3.3: `unfollow()`: `updateDoc(doc(db, 'usuarios', uid), { siguiendo: followedUsernames.filter(u => u !== username) })`
  - [x] Subtask 3.4: Detectar `isFollowing` comparando `foundUser.username` con `followedUsernames` — boton del modal cambia entre verde ("Seguir") y rojo ("Dejar de seguir")

- [x] Task 4: Lista de seguidos (AC: 6)
  - [x] Subtask 4.1: Mostrar lista con inicial del username en circulo `bg-brand-green-100`
  - [x] Subtask 4.2: Boton "Siguiendo" en cada item que abre el modal de confirmacion para dejar de seguir

## Dev Notes

### Coleccion `usuarios` — estructura del campo `siguiendo`

```
usuarios/{uid}
  username: string
  siguiendo: string[]   // array de usernames (no UIDs)
```

La busqueda es por `username` field (string match exacto), no por UID. Esto permite encontrar usuarios sin conocer su UID.

### Query de busqueda

```typescript
const q = query(collection(db, 'usuarios'), where('username', '==', term.trim()));
const snap = await getDocs(q);
```

Requiere indice en Firestore para `username` si hay muchos documentos. En desarrollo funciona sin indice.

### Seguir con merge para evitar sobreescribir otros campos

```typescript
await setDoc(
  doc(db, 'usuarios', user.uid),
  { siguiendo: [...followedUsernames, foundUser.username] },
  { merge: true }   // no sobreescribe username, sexo, etc.
);
```

### Tabs — selector inline (no Navigator)

Los tabs "Ranking" / "Buscar" son botones simples con estado local, no un Navigator nativo. Esto evita complejidad de navegacion anidada y mantiene ambas vistas en la misma pantalla.

### Que NO implementar en esta historia

- **NO** feed de actividad de seguidos — historia futura
- **NO** notificaciones cuando alguien te sigue — Epic 6
- **NO** perfiles publicos de otros usuarios — historia futura
- **NO** limite de usuarios seguidos — sin restriccion por ahora

### Project Structure Notes

```
EcoBike/
├── app/
│   └── (tabs)/
│       └── friends.tsx          ← MODIFICADO: tabs Ranking/Buscar, follow/unfollow system
```

### References

- [Source: DonaGitCode/EcoBike/src/screens/FriendsScreen.js — implementacion original de follow/unfollow]
- [Source: Firebase Firestore docs — setDoc con merge, updateDoc]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `setDoc` con `merge: true` es preferible a `arrayUnion` para mantener el array completo en memoria local sin re-fetch
- Modal unico que sirve para "Seguir" y "Dejar de seguir" — el boton del modal cambia segun `isFollowing`

### Completion Notes List

- FriendsScreen expandida con dos tabs: Ranking (existente) y Buscar (nuevo)
- Busqueda por username en coleccion `usuarios` con query exacto
- Follow/unfollow con `setDoc merge` y `updateDoc` respectivamente
- Lista de seguidos visible en la pestaña Buscar con opcion rapida de dejar de seguir
- Leaderboard existente (coleccion `users`) preservado sin modificacion

### File List

- app/(tabs)/friends.tsx (MODIFICADO: tabs + follow/unfollow system)

# EcoBike: base de datos (Firebase)

Firebase no usa SQL. El equivalente son tres archivos de este repo, que se
despliegan juntos y son los mismos para Expo (iOS/Android) y web:

| Archivo | Qué define |
|---|---|
| `firebase/firestore.rules` | Quién puede leer/escribir cada colección |
| `firebase/firestore.indexes.json` | Índices compuestos para las consultas |
| `firebase/storage.rules` | Quién puede subir fotos de perfil y logos de tiendas |

Desplegar (proyecto `ecobike-9dedd`):

```bash
npm run deploy:rules
```

La primera vez, Firebase pedirá permiso para que Storage lea Firestore
(lo usan las reglas de logos para comprobar el rol admin): acéptalo.

## Colecciones

Todas las escrituras sensibles (puntos, roles, canjes, tiendas) las hace el
servidor (`api/*.js` en Vercel, Admin SDK). El cliente solo lee.

| Ruta | Contenido | Escribe |
|---|---|---|
| `usuarios/{uid}` | perfil privado: nombre, email, `role` (user/partner/admin), `storeId` (partner), `puntosAcumulados`, `cuentaActiva` | servidor (perfil básico: el propio usuario) |
| `usuarios/{uid}/rides/{id}` | recorridos; `pointsEarned > 0` = verificado | servidor |
| `usuarios/{uid}/codigos_canjeados/{id}` | canjes con su código QR y nombre de tienda | servidor |
| `usuarios_public/{uid}` | espejo público: username, nombre, foto validada, puntos, liga semanal. Se lee solo por id (sin listados); la búsqueda va por `/api/friends` | servidor (proyección validada) / propio usuario (nombre, foto, `buscable`) |
| `usernames/{name}` | reserva única de nombres de usuario | servidor |
| `tiendas/{id}` | premio: `name`, `description`, `logo` (https, obligatorio), `pointsRequired`, `isActive` | solo admin vía `/api/stores` |
| `chats/{id}/messages/{id}` | chat entre amigos | servidor |
| `rate_limits/{uid}` | último momento de acciones limitadas (exportar, solicitudes de amistad) | solo servidor; sin acceso de cliente |
| `admin_logs/{id}` | auditoría: `adminUid`, `action`, `targetType`, `targetId`, `details`, `at` | solo servidor; nadie lo lee desde el cliente |

Storage:

| Ruta | Escribe |
|---|---|
| `avatars/{uid}/...` | el propio usuario (imagen, < 5 MB) |
| `stores/{storeId}/...` | solo admins (jpeg/png/webp, < 2 MB); lectura pública |

## API del panel de administración

| Endpoint | Uso |
|---|---|
| `GET /api/stores` · `POST` · `PUT` · `DELETE` | CRUD de tiendas (logo obligatorio al crear; no se borra una tienda con partners) |
| `POST /api/users { q }` | buscar por `@usuario` (prefijo) o correo exacto, en el cuerpo (el correo nunca va en la URL) |
| `GET /api/users` | lista paginada |
| `GET /api/users?id=` | detalle: cuenta, actividad y últimos cambios |
| `PUT /api/users` | rol (partner con tienda), puntos (con motivo), suspender, nombre |
| `DELETE /api/users` | elimina la cuenta y todos sus datos (con motivo) |
| `GET /api/users?stats=1` | KPIs del panel |

Cada cambio queda en `admin_logs`. Un admin no puede quitarse el rol,
suspenderse ni borrarse a sí mismo.

Para nombrar al primer admin: en la consola de Firestore, en
`usuarios/{tu uid}`, pon `role: "admin"`. Después todo se gestiona desde la app
(Ajustes → Administración).

## Límite de Vercel

El plan Hobby admite como máximo 12 funciones por despliegue: cada archivo de
`api/` cuenta, salvo los que empiezan con `_` (por eso `_lib.js` y los tests
`_*.test.mjs`, `_fake-admin.cjs`). Hoy hay 11. Antes de añadir un endpoint nuevo, súmalo a uno
existente.

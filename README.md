# 🚲 EcoBike

App de ciclismo gamificada: registra tus rutas con GPS, gana puntos y canjéalos
por cupones en tiendas, sigue amigos y sube de nivel EcoRider.

Un **único código** que funciona en dos modos:

| Modo | Qué es | Para qué |
|------|--------|----------|
| 📱 **Móvil** | App nativa Expo (iOS / Android) | La app real |
| 🌐 **Web (clon demo)** | La misma app renderizada dentro de un marco de iPhone con estética iOS / Liquid Glass | Mostrar el funcionamiento sin instalar nada |

La web es una réplica de la app móvil vía `react-native-web`: los archivos `*.web.js`
adaptan cada pantalla al navegador (mapa con Leaflet, carrusel navegable, etc.) sin
cambiar la lógica de negocio.

## ✨ Funcionalidades

- **Mapa** — tracking GPS del recorrido, puntos por distancia y **Planear EcoRuta** (enrutamiento ciclista real vía OSRM).
- **Puntos** — carrusel de tiendas, canje de puntos y generación de cupones **QR**.
- **Amigos** — buscar por usuario, seguir/dejar de seguir, ver stats reales.
- **Perfil** — edición, foto, logros, notificaciones, privacidad, cambio de contraseña.
- **Panel Admin** — edición de tiendas, visible **solo con rol admin**, respaldado por un backend seguro.
- Autenticación, datos y almacenamiento con **Firebase** (Auth · Firestore · Storage).

## 🎨 UI

Sistema de diseño centralizado (`src/theme`) con tokens de color, espaciado, radios,
sombras y superficies *liquid glass*. Alertas y modales unificados en un host glass
dentro del marco.

## 🚀 Ejecutar en local

```bash
npm install

# Móvil (Expo Go / emulador)
npm run start

# Clon web
npx expo start --web        # http://localhost:19006
```

## ☁️ Deploy del clon web (Vercel)

La config ya está lista en `vercel.json`:

- **Build:** `npx expo export --platform web`  → salida `dist/`
- La carpeta `api/` se despliega como función serverless (Firebase Admin SDK).

Variables de entorno en Vercel:

- `FIREBASE_SERVICE_ACCOUNT_KEY` — JSON de la cuenta de servicio (solo si quieres que
  el Panel Admin escriba en producción). El resto de la demo funciona sin ella.

> El Panel Admin requiere que tu usuario tenga rol admin: campo `isAdmin: true` en
> `usuarios/{uid}` o el custom claim `admin`.

## 🧱 Stack

Expo 49 · React Native 0.72 · React Navigation · Firebase · react-native-web ·
Leaflet (web) · Vercel Functions.

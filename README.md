# EcoBike

Aplicación de ciclismo urbano gamificada. El usuario registra sus recorridos por
GPS, acumula puntos según la distancia pedaleada y los canjea por cupones (código
QR) en tiendas aliadas. Incluye red social de amigos, niveles de progreso y un
panel de administración de tiendas protegido por rol.

El proyecto es **una sola base de código** que se ejecuta en dos plataformas:

- **Móvil (nativo):** aplicación Expo / React Native para iOS y Android. Es la app real.
- **Web (clon de demostración):** la misma aplicación renderizada en el navegador
  dentro de un marco de iPhone, con estética iOS / *Liquid Glass*. Sirve para mostrar
  el funcionamiento a cualquiera con un enlace, sin instalar nada.

La web no es un proyecto aparte: se genera con `react-native-web`. Cada pantalla que
necesita comportarse distinto en el navegador tiene un archivo `*.web.js` que el
empaquetador carga automáticamente en lugar de la versión nativa.

---

## Tabla de contenidos

1. [Arquitectura](#arquitectura)
2. [Tecnologías y para qué se usa cada una](#tecnologías-y-para-qué-se-usa-cada-una)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Funcionalidades por pantalla](#funcionalidades-por-pantalla)
5. [Modelo de datos (Firestore)](#modelo-de-datos-firestore)
6. [Requisitos previos](#requisitos-previos)
7. [Instalación](#instalación)
8. [Ejecución en local](#ejecución-en-local)
9. [Variables de entorno](#variables-de-entorno)
10. [Backend serverless (panel admin)](#backend-serverless-panel-admin)
11. [Despliegue del clon web en Vercel](#despliegue-del-clon-web-en-vercel)
12. [Rol de administrador](#rol-de-administrador)
13. [Sistema de diseño](#sistema-de-diseño)
14. [Scripts disponibles](#scripts-disponibles)
15. [Limitaciones conocidas en web](#limitaciones-conocidas-en-web)

---

## Arquitectura

```
                 ┌──────────────────────────┐
                 │      Código compartido     │
                 │  (lógica, Firebase, UI)    │
                 └────────────┬───────────────┘
                              │
          ┌───────────────────┴───────────────────┐
          │                                        │
   App.tsx (nativo)                       App.web.tsx (web)
   Metro → iOS / Android            Metro → react-native-web → navegador
   Pantalla: Screen.js              Pantalla: Screen.web.js (si existe)
   Mapa: react-native-maps          Mapa: Leaflet
   Alertas: diálogo nativo          Alertas: modal glass en el marco
```

El empaquetador resuelve la variante correcta de cada módulo según la plataforma:
en web prioriza `archivo.web.js`; en móvil usa `archivo.js`. Así, la lógica de
negocio (Firebase, cálculo de puntos, navegación) es única y solo cambia la capa de
presentación cuando hace falta.

---

## Tecnologías y para qué se usa cada una

| Tecnología | Uso en el proyecto |
|------------|--------------------|
| **Expo 54** | Framework y tooling de React Native (build, export web, permisos, assets). |
| **React Native 0.81 / React 19** | Base de la interfaz en móvil. |
| **react-native-web** | Renderiza la misma app en el navegador (el clon web). |
| **React Navigation** (native-stack + bottom-tabs) | Navegación: stack de autenticación y barra de pestañas inferior. |
| **Firebase (cliente) 10** | `Auth` (registro/login), `Firestore` (usuarios, tiendas, cupones), `Storage` (foto de perfil). |
| **firebase-admin 12** | Solo en el backend serverless: escrituras privilegiadas de tiendas con verificación de rol. |
| **expo-location** | GPS: ubicación y seguimiento del recorrido en tiempo real. |
| **react-native-maps** (móvil) / **Leaflet** (web) | Mapa. En web se carga Leaflet por CDN para evitar dependencias nativas. |
| **OSRM (API pública)** | Cálculo de la ruta ciclista de "Planear EcoRuta" en la web. |
| **react-native-qrcode-svg + react-native-svg** | Generación de los cupones en código QR. |
| **expo-image-picker** | Selección de la foto de perfil. |
| **@react-native-async-storage/async-storage** | Caché local de los puntos acumulados. |
| **@expo/vector-icons** (Feather, Ionicons) | Iconografía consistente. |
| **react-native-reanimated / redash / skia** | Animaciones (barra de pestañas y transiciones en móvil). |
| **react-native-masked-text / picker / datetimepicker** | Campos de formulario (fecha, selección de género). |
| **TypeScript** | Tipado en el sistema de navegación, tema y componentes compartidos. |
| **Vercel** | Hosting del clon web (estático) y ejecución de la función serverless `api/`. |

---

## Estructura del proyecto

```
EcoBike/
├─ App.tsx                     Punto de entrada móvil (nativo)
├─ App.web.tsx                 Punto de entrada web: marco iPhone, fondo glass,
│                              host de alertas y enrutado de Alert.alert
├─ app.json                    Configuración de Expo (permisos, splash, iconos)
├─ app.config.js              Config dinámica: bundler webpack (local) o metro (CI/Vercel)
├─ vercel.json                Configuración de despliegue en Vercel
├─ api/
│  └─ stores.js               Función serverless: administración de tiendas (Admin SDK)
├─ src/
│  ├─ MyNavigation.tsx        Navegación: AuthStack + Tabs; pestaña Admin según rol
│  ├─ FireDataBase.js         Inicialización de Firebase (cliente)
│  ├─ theme/
│  │  └─ index.ts             Sistema de diseño: colores, espaciado, radios, sombras, glass
│  ├─ auth/
│  │  ├─ Welcome / SignIn / Register / PasswordResetScreen   (+ variantes .web)
│  ├─ screens/
│  │  ├─ MapScreen        + MapScreen.web.js      Mapa y recorrido
│  │  ├─ PointsScreen     + PointsScreen.web.js   Puntos y canje QR
│  │  ├─ FriendsScreen                            Amigos
│  │  ├─ UserScreen       + UserScreen.web.js     Perfil y ajustes
│  │  └─ AdminPanel.js                            Panel de administración
│  ├─ components/
│  │  ├─ AppAlert.web.js      Modal de alerta glass único (solo web)
│  │  ├─ MyBlur               Fondo animado de las pantallas de autenticación
│  │  └─ shared/BottomTabs/   Barra de pestañas (variantes nativa y web)
│  ├─ constants/              Dimensiones y utilidades de plataforma
│  ├─ hooks/                  Hooks reutilizables
│  └─ utils/                  Utilidades (rutas, shims)
├─ assets/                     Imágenes e iconos
└─ .env.example               Plantilla de variables de entorno del servidor
```

---

## Funcionalidades por pantalla

**Autenticación (Welcome, SignIn, Register, PasswordReset)**
Registro y acceso con correo/contraseña (Firebase Auth), validación de campos,
recuperación de contraseña por correo y mensajes de error mapeados a español.

**Mapa**
Ubicación por GPS, seguimiento del recorrido en tiempo real y acumulación de puntos
según la distancia. "Planear EcoRuta" traza una ruta ciclista real hasta un destino
elegido tocando el mapa (servicio OSRM) y muestra distancia y tiempo estimados.

**Puntos**
Carrusel de tiendas con navegación por flechas e indicadores. Canje de puntos por
cupones, que se entregan como código QR; consulta de los cupones ya canjeados.

**Amigos**
Búsqueda de usuarios por nombre, seguir/dejar de seguir y visualización de estadísticas
reales (puntos, número de amigos, nivel).

**Perfil (Usuario)**
Edición de datos y foto, tarjeta de estadísticas, logros calculados a partir de datos
reales, y ajustes funcionales de notificaciones, privacidad (incluye cambio de
contraseña) y ayuda.

**Panel de administración**
Edición de tiendas (nombre, logo, puntos requeridos, descripción). La pestaña solo
aparece si el usuario tiene rol de administrador; en web las escrituras pasan por el
backend serverless seguro.

---

## Modelo de datos (Firestore)

```
usuarios/{uid}
  email, nombres, apellidos, identificacion, fechaNacimiento, sexo, username
  puntosAcumulados: number
  following: string[]           // usernames seguidos
  profileImageUrl: string
  isAdmin: boolean              // opcional, habilita el panel admin
  notificaciones: { push, email, weekly }
  privacidad: { privateProfile }

usuarios/{uid}/codigos_canjeados/{id}
  code, store, userId

tiendas/{id}
  name, logo, pointsRequired: number, description
```

---

## Requisitos previos

- Node.js 20 o superior
- npm (o yarn)
- Para móvil: la app **Expo Go** en el teléfono, o un emulador Android / simulador iOS
- Un proyecto de Firebase con Auth, Firestore y Storage habilitados

---

## Instalación

```bash
git clone https://github.com/DonatoNicolasAyalaOsorio73/EcoBike.git
cd EcoBike
npm install
```

La configuración del cliente de Firebase está en `src/FireDataBase.js`. Sustituye los
valores por los de tu propio proyecto si vas a usar una base de datos distinta.

---

## Ejecución en local

```bash
# Móvil (abre Expo; escanea el QR con Expo Go o lanza un emulador)
npm run start
npm run android      # emulador/dispositivo Android
npm run ios          # simulador iOS (macOS)

# Clon web
npx expo start --web            # http://localhost:19006
```

Para probar en local la función serverless del panel admin se necesita el entorno de
Vercel: `vercel dev` (con `expo start --web` la carpeta `api/` no se ejecuta).

---

## Variables de entorno

| Variable | Dónde | Para qué |
|----------|-------|----------|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Vercel (Environment Variables) | Clave JSON de la cuenta de servicio. La usa la función `api/stores.js`. **Nunca** se incluye en el bundle ni se sube al repo. |
| `GOOGLE_MAPS_API_KEY` | Secreto de EAS (builds móviles) | Mapa nativo en producción. |

Ver `.env.example`. Para `vercel dev` en local, copia ese archivo a `.env` (ignorado por git).

---

## Backend serverless (panel admin)

`api/stores.js` es una función de Vercel que administra las tiendas usando el
**Firebase Admin SDK**. El flujo de seguridad es:

1. El cliente envía su token de Firebase en la cabecera `Authorization: Bearer <token>`.
2. La función verifica el token con el Admin SDK.
3. Comprueba que el usuario es administrador (custom claim `admin` o `usuarios/{uid}.isAdmin`).
4. Solo entonces lee (`GET`) o actualiza (`PUT`) documentos de `tiendas`.

La clave privada vive únicamente en la variable de entorno del servidor. En móvil, al
no existir un origen serverless, el panel usa directamente el SDK cliente de Firestore.

---

## Despliegue del clon web en Vercel

La configuración ya está en `vercel.json`:

```json
{
  "buildCommand": "npx expo export --platform web",
  "outputDirectory": "dist",
  "framework": null,
  "env": { "CI": "1" }
}
```

Pasos:

1. En Vercel, **Import Project** desde el repositorio de GitHub (rama `expo-version`).
2. Vercel detecta `vercel.json`; no hay que cambiar nada del build.
3. (Opcional) En **Settings → Environment Variables** añade `FIREBASE_SERVICE_ACCOUNT_KEY`
   si quieres que el panel admin escriba en producción. El resto de la demo funciona sin ella.
4. **Deploy**. Vercel publica `dist/` como sitio estático y despliega `api/` como función.

`CI=1` hace que Expo use el empaquetador Metro (compatible con Linux). La carpeta
`api/` se despliega como función serverless en paralelo al sitio estático.

---

## Rol de administrador

El panel de administración solo es visible y funcional para administradores. Para
concederte el rol, usa una de estas opciones:

- **Firestore:** en tu documento `usuarios/{uid}` añade el campo `isAdmin: true`.
- **Custom claim:** asigna el claim `admin: true` con el Admin SDK.

---

## Sistema de diseño

Todos los tokens visuales están centralizados en `src/theme/index.ts`:
colores de marca, escala de espaciado, radios, sombras y superficies *liquid glass*.
Las pantallas los consumen en lugar de valores fijos, lo que mantiene la interfaz
coherente. En web, además, todas las alertas y confirmaciones se muestran en un único
modal glass dentro del marco del iPhone (`src/components/AppAlert.web.js`).

---

## Scripts disponibles

| Comando | Acción |
|---------|--------|
| `npm run start` | Inicia Expo (móvil) |
| `npm run android` | Lanza en Android |
| `npm run ios` | Lanza en iOS (macOS) |
| `npm run web` | Inicia la versión web |
| `npx expo export --platform web` | Genera el build web estático en `dist/` |

---

## Limitaciones conocidas en web

- El clon web está pensado para verse dentro del marco de iPhone (demostración); en
  escritorio el carrusel de tiendas se navega con las flechas.
- El mapa web usa Leaflet + OpenStreetMap; el nativo usa react-native-maps.
- El seguimiento GPS depende de los permisos de ubicación del navegador.

---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - 'ecobike-output/planning-artifacts/prd.md'
  - 'ecobike-output/planning-artifacts/architecture.md'
  - 'ecobike-output/planning-artifacts/ux-design-specification.md'
---

# EcoBike - Epic Breakdown

## Overview

Este documento descompone los requisitos del PRD, Arquitectura y UX Design de EcoBike en epics y user stories implementables. El stack objetivo es Expo SDK 57 + Expo Router + Firebase/Firestore + Cloud Functions Node.js 20 + NativeWind v4 + Liquid Glass (expo-blur).

## Requirements Inventory

### Functional Requirements

FR-001: El ciclista puede iniciar una ruta con un toque desde la pantalla principal, con GPS activo en menos de 3 segundos
FR-002: El ciclista puede continuar una ruta interrumpida (llamada entrante, cierre de app, apagado del dispositivo) recuperando todos los kilómetros registrados hasta la interrupción
FR-003: El sistema registra la posición del ciclista sin conexión a internet — sincroniza la ruta completa al recuperar conexión o al terminar manualmente
FR-004: El sistema pausa el registro de la ruta cuando el dispositivo detecta velocidad >30 km/h de manera sostenida por más de 60 segundos consecutivos
FR-005: El ciclista visualiza sus puntos acumulados en tiempo real durante la ruta, con animación flotante y retroalimentación háptica al completar cada kilómetro
FR-006: El sistema calcula y valida los puntos de la ruta en el servidor al finalizarla — el resultado se refleja en el saldo del ciclista en menos de 3 segundos
FR-007: El ciclista puede ver su saldo de puntos actualizado en todas las pantallas de la app
FR-008: Los puntos acumulados no tienen fecha de vencimiento
FR-009: El ciclista puede generar un código QR de canje en 2 toques desde la pantalla de recompensas — el QR es válido por 5 minutos y de un solo uso
FR-010: El ciclista puede usar un código numérico de respaldo si el lector QR del partner no funciona
FR-011: El ciclista puede ver recompensas disponibles geolocalizadas en el mapa, con stock actualizado en tiempo real
FR-012: El partner puede actualizar el inventario de recompensas (agregar unidades, pausar disponibilidad) desde un panel web — los cambios se reflejan en el mapa de usuarios en ≤30 segundos
FR-013: El partner puede consultar métricas básicas de canjes en su dashboard: total canjeados, ciclistas únicos, rating promedio
FR-014: El nuevo usuario puede completar el registro con email y ciudad en menos de 60 segundos, sin campos opcionales en el flujo principal
FR-015: El nuevo usuario recibe puntos dobles y badge de bienvenida al completar su primera ruta
FR-016: El usuario puede ver, exportar y eliminar todos sus datos de ubicación desde su perfil en cualquier momento
FR-017: El sistema rechaza el registro de usuarios menores de 13 años; deshabilita funciones de ranking y social para usuarios de 13-17 años
FR-018: El partner puede escanear o ingresar manualmente el código presentado por un ciclista para validar el canje — el sistema confirma la validez en tiempo real y marca el token como utilizado de forma permanente
FR-019: El historial de rutas, saldo de puntos y perfil del usuario se restauran completamente al iniciar sesión en un nuevo dispositivo
FR-020: El sistema presenta una encuesta de satisfacción de una pregunta (escala 0-10) al finalizar una ruta — con frecuencia máxima de una vez cada 30 días por usuario
FR-021: El sistema registra la racha de días consecutivos del usuario (días calendario con al menos una ruta completada) y muestra el conteo actual en el perfil
FR-022: El sistema envía una notificación push de progreso al terminar una ruta cuando el usuario está a ≤2 rutas de una recompensa específica alcanzable — máximo una notificación de este tipo por día
FR-023: El sistema envía una notificación push de recordatorio de racha a las 7pm si el usuario tiene racha activa de ≥3 días consecutivos y no ha completado ninguna ruta ese día
FR-024: El sistema envía una notificación push al desbloquear un logro (badge, nivel, primera recompensa semanal) o cuando un partner publica una recompensa nueva en radio ≤2km del usuario — máximo una notificación de este tipo por día por usuario

### NonFunctional Requirements

NFR-001: La pantalla principal carga en menos de 1 segundo desde app en segundo plano, usando caché local del último estado conocido
NFR-002: Los puntos de una ruta se acreditan y reflejan en el saldo del usuario en menos de 3 segundos al finalizar
NFR-003: El stock de recompensas en el mapa se actualiza en menos de 30 segundos tras cualquier cambio registrado por el partner
NFR-004: El sistema registra 0 rutas perdidas por interrupción (llamada, bloqueo de pantalla, cierre de app) en producción — validado mediante protocolo de prueba de interrupciones obligatorio antes de cada release
NFR-005: La sincronización de rutas al servidor no falla silenciosamente — el usuario es notificado si la sincronización no completó en 60 segundos post-ruta
NFR-006: El saldo de puntos del usuario es de solo lectura desde el cliente — toda modificación requiere validación del servidor, sin excepción
NFR-007: Los tokens de canje QR expiran en 5 minutos y se invalidan permanentemente tras el primer uso exitoso
NFR-008: El sistema limita el registro a máximo 5 rutas por usuario por hora
NFR-009: Las trazas GPS brutas no se almacenan en el servidor — solo métricas derivadas: distancia total, duración, puntos acreditados
NFR-010: Los datos de movilidad para uso municipal se exportan únicamente como agregados anónimos por zona geográfica — sin trazas individuales identificables en ningún caso
NFR-011: El mapa de recompensas soporta hasta 500 marcadores simultáneos sin degradación de fluidez (≥60fps en el dispositivo mínimo soportado)
NFR-012: El backend procesa la sincronización de rutas de hasta 1,000 usuarios simultáneos sin exceder los tiempos de NFR-002

### Additional Requirements

**De Arquitectura — Configuracion inicial (bloqueante):**
- Starter template obligatorio: `npx create-expo-app@latest EcoBike --template tabs` — primera historia de implementación
- Firebase Cloud Functions setup es el primer bloqueante: habilita seguridad de puntos y generación de QR tokens antes de cualquier UI
- Firestore Security Rules: campo `points` en `/users/{uid}` escribible SOLO por Cloud Functions con Admin SDK — el cliente tiene permiso de lectura exclusivamente
- Paquetes requeridos: `expo-location@57`, `expo-task-manager`, `expo-haptics`, `expo-notifications`, `expo-secure-store`, `expo-camera`, `@react-native-community/netinfo`, `expo-blur`

**De Arquitectura — Modelo de datos:**
- 6 colecciones Firestore: `/users`, `/routes`, `/rewards`, `/partners`, `/redemptions`, `/notifications`
- Schema `/notifications/{uid}/daily/{YYYY-MM-DD}` necesario para throttling de push (max 1/día/usuario)
- Firestore Security Rules completas para `/redemptions`, `/rewards`, `/partners` antes del primer deploy a producción

**De Arquitectura — Capa de servidor:**
- 3 Callable Functions: `finishRoute` (valida velocidad, calcula puntos), `generateQRToken` (HMAC-SHA256, TTL 5min), `validateRedemption` (invalida token, descuenta stock)
- 2 HTTP Functions: `GET/PATCH /rewards/:partnerId` (inventario partner), `GET /partners/:partnerId/metrics` (dashboard)
- 1 Scheduled Function: `streakReminder` (cron 7pm, notificación si racha activa y sin ruta del día)

**De Arquitectura — Estado del cliente:**
- 3 Zustand stores obligatorios: `useAuthStore`, `useActiveRouteStore` (GPS, checkpoints, puntos locales), `usePointsStore` (saldo confirmado por servidor)
- Patrones de naming estrictos: camelCase en Firestore, PascalCase en componentes, kebab-case en rutas Expo Router
- Respuesta Cloud Functions siempre envuelta: `{ success: boolean, data | error }`
- Skeleton screens en lugar de spinners (patrón obligatorio por arquitectura)

**De UX Design — Sistema visual Liquid Glass:**
- Implementación con `expo-blur` BlurView como base de todos los componentes Glass
- Fallback Android API < 31: `backgroundColor: 'rgba(255,255,255,0.92)'` sin blur
- NativeWind v4 como design system — `tailwind.config.js` con tokens de marca EcoBike
- Tokens de color: brand.green.500 (#64cd69) primario, brand.amber.500 (#F5A623) para puntos
- Tipografía: Inter, escala de 12px (label.sm) a 40px (display.xl)
- Espaciado base 4px — todos los valores son múltiplos de 4

**De UX Design — Componentes custom obligatorios (11):**
- P0 (MVP critico): `GlassView`, `GPSStatusBadge`, `PointsFloat`, `RewardMarker`, `GlassTopBar`, `GlassBottomSheet`, `QRDisplay`
- P1 (retención): `RouteCompleteSummary`, `StreakBadge`, `ProgressRing`, `GlassTabBar`

**De UX Design — Patrones de interaccion:**
- Feedback doble obligatorio: animación visual + haptico simultáneos en cada micrologro
- `expo-haptics`: Impact.Medium para km completado, Notification.Success/Error para canje
- `react-native-reanimated`: animaciones de PointsFloat, bottom sheet snap, button press (scale 0.96)
- `AccessibilityInfo.isReduceMotionEnabled()` para respetar preferencias del sistema
- Tamaño mínimo de toque: 44x44px en todos los elementos interactivos (WCAG 2.1 AA)
- Bottom sheet con snap points 30%/60%/90% usando GlassBottomSheet
- Estados GPS obligatorios: activo (verde) / offline-guardando (ambar) / perdido (rojo)

### FR Coverage Map

FR-001: Epic 2 — Iniciar ruta con 1 toque, GPS en <3 segundos
FR-002: Epic 2 — Recuperacion de ruta interrumpida
FR-003: Epic 2 — GPS offline, sync al recuperar conexion
FR-004: Epic 2 — Pausa automatica >30 km/h por 60 segundos sostenidos
FR-005: Epic 3 — Animacion flotante y haptico por km completado
FR-006: Epic 3 — Calculo en servidor, reflejado en saldo en <3s
FR-007: Epic 3 — Saldo de puntos visible en todas las pantallas
FR-008: Epic 3 — Puntos sin fecha de vencimiento
FR-009: Epic 4 — QR de canje en 2 toques, TTL 5min, un solo uso
FR-010: Epic 4 — Codigo numerico de respaldo para canje
FR-011: Epic 4 — Mapa de recompensas geolocalizadas con stock en tiempo real
FR-012: Epic 5 — Inventario partner, cambios reflejados en mapa en ≤30s
FR-013: Epic 5 — Dashboard de metricas de canjes para el partner
FR-014: Epic 1 — Registro minimo email + ciudad en menos de 60 segundos
FR-015: Epic 3 — Puntos dobles y badge de bienvenida en primera ruta
FR-016: Epic 7 — Ver, exportar y eliminar datos de ubicacion
FR-017: Epic 7 — Rechazo de menores de 13; disable social para 13-17 (COPPA)
FR-018: Epic 5 — Validacion de QR de canje por el partner en tiempo real
FR-019: Epic 1 — Restauracion completa de perfil al iniciar sesion en nuevo dispositivo
FR-020: Epic 6 — Encuesta NPS post-ruta, frecuencia maxima 1 vez cada 30 dias
FR-021: Epic 6 — Racha de dias consecutivos visible en perfil
FR-022: Epic 6 — Notificacion push de progreso al terminar ruta (max 1/dia)
FR-023: Epic 6 — Notificacion push de racha a las 7pm (racha ≥3 dias, sin ruta del dia)
FR-024: Epic 6 — Notificacion push de logros y recompensas partner en radio ≤2km

## Epic List

### Epic 1: Fundacion y Autenticacion
El ciclista puede registrarse con email y ciudad en menos de 60 segundos, iniciar sesion, y recuperar su perfil completo al iniciar sesion en un nuevo dispositivo. Incluye la inicializacion del proyecto Expo SDK 57 + Firebase como primera historia tecnica bloqueante (Security Rules, stores, paquetes base).
**FRs covered:** FR-014, FR-019

### Epic 2: Tracking de Rutas GPS Confiable
El ciclista puede iniciar una ruta con un toque, pedalear con pantalla apagada y sin conexion a internet, recuperar automaticamente rutas interrumpidas por llamadas o bateria agotada, y llegar al final con todos sus km registrados. Cero km perdidos por diseno.
**FRs covered:** FR-001, FR-002, FR-003, FR-004

### Epic 3: Sistema de Puntos Seguro con Feedback en Tiempo Real
El ciclista siente cada kilometro con haptico + animacion "+Xpts", ve su saldo actualizado en menos de 3 segundos al terminar la ruta, y confia en que sus puntos son calculados exclusivamente en el servidor. La primera ruta otorga puntos dobles y badge de bienvenida.
**FRs covered:** FR-005, FR-006, FR-007, FR-008, FR-015

### Epic 4: Mapa de Recompensas y Canje QR
El ciclista ve en el mapa recompensas geolocalizadas con stock en tiempo real, elige una y la canjea en el negocio local con un QR de un solo uso generado en 2 toques, con codigo numerico de respaldo si el lector QR falla.
**FRs covered:** FR-009, FR-010, FR-011

### Epic 5: Panel de Partners
El negocio partner puede gestionar su catalogo de recompensas desde un panel web (actualizar stock, pausar disponibilidad con cambios visibles en el mapa en ≤30 segundos), validar el QR presentado por el ciclista y consultar metricas basicas de canjes y ciclistas unicos.
**FRs covered:** FR-012, FR-013, FR-018

### Epic 6: Gamificacion y Notificaciones Contextuales
El ciclista construye una racha de dias ciclistas visible en su perfil, recibe notificaciones push de progreso al terminar rutas, recordatorios de racha a las 7pm y notificaciones de logros — todas con reglas de negocio estrictas: maximo 1 por dia, sin horario nocturno, sin notificaciones durante rutas activas. Encuesta NPS post-ruta con throttle de 30 dias.
**FRs covered:** FR-020, FR-021, FR-022, FR-023, FR-024

### Epic 7: Privacidad y Cumplimiento Regulatorio
El ciclista puede ver, exportar y eliminar todos sus datos de ubicacion desde su perfil. El sistema rechaza el registro de menores de 13 anos y deshabilita funciones de ranking y social para usuarios de 13-17 anos, cumpliendo COPPA, GDPR y los requisitos de App Store y Google Play.
**FRs covered:** FR-016, FR-017

---

## Epic 1: Fundacion y Autenticacion

El ciclista puede registrarse con email y ciudad en menos de 60 segundos usando email/password, Google, Apple o Facebook, con ciudad detectada automaticamente por GPS. Puede iniciar sesion con biometria (Face ID / Touch ID) y recuperar su perfil completo al iniciar sesion en un nuevo dispositivo. Incluye la inicializacion del proyecto Expo SDK 57 + Firebase como primera historia tecnica bloqueante.

### Story 1.1: Inicializacion Expo, NativeWind y Componente Base

Como equipo de desarrollo,
quiero tener el proyecto Expo inicializado con NativeWind, todos los paquetes requeridos y el componente GlassView base,
para que el entorno de UI este listo antes de conectar cualquier servicio externo.

**Acceptance Criteria:**

**Dado** que no existe el proyecto
**Cuando** se ejecuta `npx create-expo-app@latest EcoBike --template tabs`
**Entonces** el proyecto arranca en iOS y Android sin errores

**Dado** que el proyecto esta inicializado
**Cuando** se instalan los paquetes requeridos
**Entonces** estan presentes: `expo-location@57`, `expo-task-manager`, `expo-haptics`, `expo-notifications`, `expo-secure-store`, `expo-camera`, `@react-native-community/netinfo`, `expo-blur`, `expo-local-authentication`

**Dado** que NativeWind v4 esta configurado
**Cuando** se usa cualquier clase de Tailwind en un componente
**Entonces** aplica correctamente con los tokens de marca: `brand.green.500` (#64cd69) y `brand.amber.500` (#F5A623)

**Dado** que se necesita el componente base de pantallas de carga
**Cuando** cualquier pantalla esta cargando datos
**Entonces** existe el componente `GlassView` (basado en `expo-blur` BlurView) con fallback para Android API < 31 (`rgba(255,255,255,0.92)`)

### Story 1.2: Configuracion Firebase, Security Rules y Zustand Stores

Como equipo de desarrollo,
quiero tener Firebase conectado, las Security Rules de Firestore activas y los 3 Zustand stores inicializados,
para que la seguridad de puntos y el estado global esten garantizados antes de cualquier flujo de usuario.

**Acceptance Criteria:**

**Dado** que Firebase esta configurado
**Cuando** el cliente intenta escribir directamente el campo `points` en `/users/{uid}`
**Entonces** Firestore Security Rules rechaza la escritura con error de permisos

**Dado** que las Security Rules estan desplegadas
**Cuando** se validan contra el schema `/users/{uid}`
**Entonces** el campo `points` tiene permiso de escritura exclusivamente para Cloud Functions con Admin SDK — el cliente solo puede leer

**Dado** que los stores de Zustand estan inicializados
**Cuando** la app arranca
**Entonces** existen `useAuthStore`, `useActiveRouteStore` y `usePointsStore` con su estado inicial vacio sin errores

**Dado** que `useActiveRouteStore` es creado
**Cuando** se define su estructura
**Entonces** incluye el campo `pendingRecoveryDecision: boolean` y la cola de checkpoints `checkpointQueue[]` disenada para soportar tanto sync offline como recuperacion de interrupcion

### Story 1.3: Registro de Ciclista

Como nuevo ciclista,
quiero registrarme con mi email y ciudad (o usando Google, Apple o Facebook) en menos de 60 segundos,
para que pueda empezar a usar EcoBike sin friccion.

**Acceptance Criteria:**

**Dado** que el ciclista abre la app por primera vez
**Cuando** llega a la pantalla de registro
**Entonces** ve exactamente 2 campos obligatorios (email y contrasena) mas la ciudad pre-completada, y 3 botones de OAuth (Google, Apple, Facebook)

**Dado** que el ciclista permite acceso a ubicacion
**Cuando** abre la pantalla de registro
**Entonces** el campo ciudad se completa automaticamente con la ciudad detectada por GPS en menos de 3 segundos, y el ciclista puede editarla manualmente

**Dado** que el ciclista completa email + contrasena + ciudad y toca "Registrarme"
**Cuando** el formulario se envia
**Entonces** se crea el documento `/users/{uid}` en Firestore con `email`, `city`, `points: 0`, `createdAt`, `birthDate: null`, y el ciclista llega a la pantalla principal en menos de 60 segundos desde que abrio el formulario

**Dado** que el ciclista toca "Continuar con Google" / "Continuar con Apple" / "Continuar con Facebook"
**Cuando** completa el flujo OAuth del proveedor
**Entonces** se crea o recupera su cuenta en Firebase Auth y se crea `/users/{uid}` con la ciudad detectada por GPS (o solicitada si GPS no disponible)

**Dado** que el ciclista ingresa una fecha de nacimiento que indica menos de 13 anos
**Cuando** toca "Registrarme"
**Entonces** el sistema rechaza el registro con mensaje claro sin crear la cuenta

**Dado** que el registro es exitoso
**Cuando** el ciclista llega a la pantalla principal
**Entonces** `useAuthStore` tiene el usuario autenticado y el skeleton screen de bienvenida se muestra mientras cargan los datos del perfil

### Story 1.4: Inicio de Sesion y Restauracion de Perfil

Como ciclista registrado,
quiero iniciar sesion con email/password, biometria, Google, Apple o Facebook, y recuperar todo mi perfil al entrar desde un dispositivo nuevo,
para que nunca pierda mi historial, puntos ni racha.

**Acceptance Criteria:**

**Dado** que el ciclista ya se registro previamente
**Cuando** abre la pantalla de login
**Entonces** ve opciones de: email/contrasena, Face ID / Touch ID (si el dispositivo lo soporta y el ciclista lo habilito), Google, Apple y Facebook

**Dado** que el ciclista tiene biometria habilitada en su dispositivo
**Cuando** abre la app despues de haberla cerrado
**Entonces** se ofrece autenticacion con Face ID / Touch ID como primer metodo, sin necesidad de escribir contrasena

**Dado** que el ciclista completa el login con cualquier metodo exitosamente
**Cuando** entra a la pantalla principal
**Entonces** `useAuthStore` tiene el usuario autenticado, `usePointsStore` tiene el saldo actual, y el perfil muestra nombre, ciudad y racha actual recuperados de Firestore

**Dado** que el ciclista inicia sesion en un dispositivo nuevo
**Cuando** el login es exitoso
**Entonces** se restauran completamente: historial de rutas, saldo de puntos, racha de dias consecutivos, badges y perfil — sin perdida de datos

**Dado** que el ciclista ingresa credenciales incorrectas
**Cuando** toca "Iniciar sesion"
**Entonces** ve un mensaje de error claro, el campo de contrasena se limpia, y la cuenta no se bloquea antes del 5to intento fallido consecutivo

**Dado** que el ciclista esta autenticado y cierra la app
**Cuando** la vuelve a abrir dentro de las proximas 24 horas
**Entonces** la sesion persiste automaticamente sin pedir login de nuevo (usando `expo-secure-store` para el token)

---

## Epic 2: Tracking de Rutas GPS Confiable

El ciclista puede iniciar una ruta con un toque, pedalear con pantalla apagada y sin conexion a internet, recuperar automaticamente rutas interrumpidas por llamadas o bateria agotada, y llegar al final con todos sus km registrados. Cero km perdidos por diseno.

### Story 2.1: Iniciar y Finalizar una Ruta con GPS

Como ciclista,
quiero iniciar una ruta con un toque desde la pantalla principal y finalizarla cuando quiera,
para que el sistema registre mi recorrido desde el primer momento.

**Acceptance Criteria:**

**Dado** que el ciclista esta en la pantalla principal
**Cuando** toca el boton "Iniciar Ruta"
**Entonces** el GPS se activa y comienza el registro en menos de 3 segundos, `useActiveRouteStore` registra `startedAt` y el estado cambia a `tracking: true`

**Dado** que la ruta esta activa
**Cuando** el ciclista pedalea
**Entonces** la pantalla muestra distancia acumulada en km (actualizada cada segundo), duracion transcurrida y puntos locales estimados en tiempo real

**Dado** que la ruta esta activa
**Cuando** el ciclista toca "Finalizar Ruta"
**Entonces** el GPS se detiene, `useActiveRouteStore` registra `endedAt` y la ruta pasa al flujo de sincronizacion con el servidor (Cloud Function `finishRoute`)

**Dado** que el ciclista toca "Iniciar Ruta" y el GPS no tiene senal
**Cuando** el sistema no puede obtener ubicacion en 10 segundos
**Entonces** muestra mensaje claro "Sin senal GPS — intenta en un lugar abierto" y no inicia la ruta

**Dado** que se inicia una ruta
**Cuando** el estado cambia a `tracking: true`
**Entonces** se bloquea la posibilidad de iniciar una segunda ruta simultanea hasta que la actual se finalice o se descarte

### Story 2.2: Tracking GPS en Background con GPSStatusBadge

Como ciclista,
quiero que el GPS siga registrando mi ruta aunque apague la pantalla o cambie de app,
para que no pierda ni un metro de mi recorrido.

**Acceptance Criteria:**

**Dado** que la ruta esta activa
**Cuando** el ciclista apaga la pantalla o minimiza la app
**Entonces** `expo-task-manager` mantiene el registro GPS en background y los checkpoints siguen acumulandose en `useActiveRouteStore`

**Dado** que la ruta esta activa
**Cuando** el GPS tiene senal fuerte
**Entonces** el componente `GPSStatusBadge` muestra estado activo (verde)

**Dado** que la ruta esta activa y se pierde la senal GPS
**Cuando** el dispositivo no puede obtener ubicacion por mas de 5 segundos
**Entonces** `GPSStatusBadge` cambia a estado perdido (rojo) y el sistema guarda el ultimo checkpoint conocido sin interrumpir la ruta

**Dado** que la ruta esta activa con conexion disponible
**Cuando** el sistema registra cada checkpoint
**Entonces** los checkpoints se persisten localmente en `useActiveRouteStore` como respaldo ante cualquier interrupcion

**Dado** que el dispositivo esta en background con la ruta activa
**Cuando** el sistema operativo intenta terminar el proceso de la app
**Entonces** `expo-task-manager` mantiene viva la tarea de ubicacion y el registro no se interrumpe

### Story 2.3: Modo Offline — Guardar y Sincronizar Ruta Sin Conexion

Como ciclista,
quiero pedalear sin conexion a internet y que mi ruta se sincronice automaticamente al recuperar senal,
para que no dependa del WiFi o datos moviles para registrar mis recorridos.

**Acceptance Criteria:**

**Dado** que la ruta esta activa y el dispositivo pierde conexion a internet
**Cuando** `@react-native-community/netinfo` detecta el cambio
**Entonces** `GPSStatusBadge` cambia a estado offline-guardando (ambar) y el registro GPS continua sin interrupcion almacenando checkpoints localmente

**Dado** que la ruta esta en modo offline
**Cuando** el ciclista sigue pedaleando
**Entonces** la distancia y puntos estimados siguen actualizandose en pantalla usando los checkpoints locales, sin degradacion visible

**Dado** que la ruta estaba en modo offline y el dispositivo recupera conexion
**Cuando** `netinfo` detecta conexion disponible
**Entonces** `GPSStatusBadge` vuelve a estado activo (verde) y los checkpoints acumulados se preparan para sincronizacion al finalizar la ruta

**Dado** que el ciclista finaliza una ruta que estuvo total o parcialmente offline
**Cuando** hay conexion al momento de finalizar
**Entonces** la Cloud Function `finishRoute` recibe la ruta completa con todos los checkpoints y acredita los puntos correctos en menos de 3 segundos

**Dado** que el ciclista finaliza una ruta y aun no hay conexion
**Cuando** toca "Finalizar Ruta"
**Entonces** la ruta queda en cola local y se sincroniza automaticamente en cuanto el dispositivo recupera internet, notificando al ciclista con el resultado

> **Nota tecnica:** La `checkpointQueue[]` en `useActiveRouteStore` debe disenarse para soportar tanto este escenario (offline sync) como el de Story 2.4 (recuperacion de interrupcion). Ambos usan la misma cola — no crear estructuras separadas.

### Story 2.4: Recuperacion de Ruta Interrumpida

Como ciclista,
quiero que si mi ruta se interrumpe por una llamada, la app cerrarse o la bateria agotarse, pueda continuar exactamente donde la deje,
para que nunca pierda los kilometros ya recorridos.

**Acceptance Criteria:**

**Dado** que la ruta esta activa y entra una llamada telefonica
**Cuando** el ciclista atiende la llamada
**Entonces** el GPS sigue registrando en background, la ruta no se interrumpe y `useActiveRouteStore` mantiene todos los checkpoints

**Dado** que la ruta esta activa y el ciclista cierra la app manualmente
**Cuando** vuelve a abrir la app
**Entonces** detecta la ruta activa en `useActiveRouteStore`, muestra el resumen de km recorridos hasta ese momento y ofrece "Continuar Ruta" o "Finalizar Ruta"

**Dado** que la ruta esta activa y el dispositivo se apaga por bateria agotada
**Cuando** el ciclista enciende el dispositivo y abre la app
**Entonces** recupera la ruta con todos los checkpoints guardados hasta el ultimo momento antes del apagado y ofrece "Continuar Ruta" o "Finalizar Ruta"

**Dado** que el ciclista elige "Continuar Ruta" tras una interrupcion
**Cuando** la app retoma el tracking
**Entonces** el contador de distancia parte desde el valor acumulado antes de la interrupcion, sin reinicio

**Dado** que el ciclista elige "Finalizar Ruta" tras una interrupcion
**Cuando** confirma la finalizacion
**Entonces** la Cloud Function `finishRoute` procesa todos los checkpoints pre y post interrupcion como una sola ruta continua

**Dado** que el app se cierra mientras el dialogo "Continuar / Finalizar" esta visible
**Cuando** el ciclista vuelve a abrir la app
**Entonces** `useActiveRouteStore.pendingRecoveryDecision` es `true`, el dialogo de decision vuelve a mostrarse y ningun checkpoint se pierde en el intervalo

### Story 2.5: Pausa Automatica por Velocidad Excesiva

Como ciclista,
quiero que el sistema pause automaticamente el registro si detecto que estoy en un vehiculo motorizado,
para que no acumule kilometros ni puntos de forma fraudulenta.

**Acceptance Criteria:**

**Dado** que la ruta esta activa
**Cuando** el sistema detecta velocidad sostenida mayor a 30 km/h por mas de 60 segundos consecutivos
**Entonces** `useActiveRouteStore` pausa el registro de checkpoints y muestra una notificacion en pantalla: "Ruta pausada — velocidad de vehiculo detectada"

**Dado** que la ruta esta pausada por velocidad excesiva
**Cuando** la velocidad cae por debajo de 30 km/h
**Entonces** el sistema espera 10 segundos de velocidad normal antes de reanudar el registro automaticamente, y notifica al ciclista que la ruta continua

**Dado** que la ruta esta pausada por velocidad excesiva
**Cuando** el ciclista ve la notificacion de pausa
**Entonces** puede tocar "Reanudar manualmente" si considera que el sistema se equivoco, registrando el evento para analisis posterior

**Dado** que el sistema evalua la velocidad para la pausa
**Cuando** hay picos momentaneos de velocidad mayor a 30 km/h de menos de 60 segundos
**Entonces** el registro NO se pausa — solo se pausa ante velocidad sostenida por 60 segundos completos

**Dado** que la ruta finaliza con segmentos pausados por velocidad
**Cuando** la Cloud Function `finishRoute` calcula los puntos
**Entonces** los kilometros durante los periodos de pausa NO se cuentan para el calculo de puntos ni distancia total

**Dado** que el entorno es de desarrollo
**Cuando** se activa la variable de configuracion `DEV_MOCK_GPS_SPEED`
**Entonces** el modulo de velocidad acepta valores inyectados programaticamente en lugar de leer el GPS real, permitiendo testear el umbral de 60 segundos sin necesidad de un vehiculo

---

## Epic 3: Sistema de Puntos Seguro con Feedback en Tiempo Real

El ciclista siente cada kilometro con haptico y animacion "+Xpts", ve su saldo actualizado en menos de 3 segundos al terminar la ruta, y confia en que sus puntos son calculados exclusivamente en el servidor. La primera ruta otorga puntos dobles y badge de bienvenida.

### Story 3.1: Animacion y Haptico por Kilometro Completado

Como ciclista,
quiero sentir y ver una recompensa visual y haptica cada vez que completo un kilometro,
para que pedalear se sienta satisfactorio en tiempo real.

**Acceptance Criteria:**

**Dado** que la ruta esta activa
**Cuando** el ciclista completa exactamente 1 km adicional
**Entonces** el componente `PointsFloat` muestra una animacion flotante "+Xpts" usando `react-native-reanimated` y simultaneamente se dispara `expo-haptics` Impact.Medium

**Dado** que se dispara la animacion de km completado
**Cuando** `AccessibilityInfo.isReduceMotionEnabled()` retorna `true`
**Entonces** la animacion visual se omite pero el feedback haptico se mantiene

**Dado** que la ruta esta activa y el ciclista acumula puntos locales
**Cuando** el `PointsFloat` muestra el incremento
**Entonces** el valor mostrado es el estimado local (no confirmado por servidor), claramente distinguible del saldo oficial en `usePointsStore`

**Dado** que se completa un km y el dispositivo esta en background (pantalla apagada)
**Cuando** ocurre el evento de km completado
**Entonces** se dispara unicamente el haptico Impact.Medium sin animacion visual

**Dado** que el ciclista completa multiples kms rapidamente
**Cuando** los eventos de km se acumulan
**Entonces** cada animacion se encola y reproduce en secuencia sin superponerse, con un intervalo minimo de 800ms entre cada una

### Story 3.2: Calculo de Puntos en Servidor y Acreditacion

Como ciclista,
quiero que mis puntos se calculen en el servidor al finalizar la ruta y se reflejen en mi saldo en menos de 3 segundos,
para que confie en que nadie puede manipular mis puntos desde el cliente.

**Acceptance Criteria:**

**Dado** que el ciclista finaliza una ruta
**Cuando** la Cloud Function `finishRoute` recibe los checkpoints
**Entonces** valida que ningun segmento supere 30 km/h sostenidos, calcula la distancia valida y acredita los puntos escribiendo directamente en `/users/{uid}.points` via Admin SDK

**Dado** que `finishRoute` completa el calculo exitosamente
**Cuando** el resultado llega al cliente
**Entonces** `usePointsStore` actualiza el saldo oficial y el ciclista ve el nuevo total en pantalla en menos de 3 segundos desde que toco "Finalizar Ruta"

**Dado** que el ciclista intenta escribir directamente el campo `points` desde el cliente
**Cuando** Firestore evalua la Security Rule
**Entonces** rechaza la escritura con error de permisos — sin excepcion

**Dado** que `finishRoute` falla por error interno del servidor
**Cuando** el cliente no recibe confirmacion en 60 segundos
**Entonces** muestra mensaje "Tus puntos estan siendo procesados — te avisamos cuando esten listos" y reintenta automaticamente hasta 3 veces

**Dado** que los puntos son acreditados
**Cuando** el ciclista navega a cualquier otra pantalla de la app
**Entonces** el saldo actualizado de `usePointsStore` es visible sin necesidad de recargar la app

**Dado** que los puntos son acreditados
**Cuando** el ciclista revisa su historial en cualquier momento futuro
**Entonces** los puntos no tienen fecha de vencimiento y permanecen en su saldo indefinidamente

### Story 3.3: Saldo de Puntos Visible en Todas las Pantallas

Como ciclista,
quiero ver mi saldo de puntos actualizado en cualquier pantalla de la app,
para que siempre sepa cuanto tengo disponible sin tener que navegar a una seccion especifica.

**Acceptance Criteria:**

**Dado** que el ciclista esta autenticado
**Cuando** navega a cualquier pantalla principal (inicio, mapa, recompensas, perfil)
**Entonces** el saldo de `usePointsStore` es visible en el `GlassTopBar` de cada pantalla sin necesidad de accion adicional

**Dado** que el saldo en `usePointsStore` cambia (por finalizacion de ruta o canje)
**Cuando** ocurre la actualizacion
**Entonces** todas las pantallas que muestran el saldo lo reflejan inmediatamente sin recargar la app, gracias a la reactividad de Zustand

**Dado** que la app esta cargando el saldo por primera vez
**Cuando** `usePointsStore` no tiene datos aun
**Entonces** muestra un skeleton screen en lugar del saldo, nunca un valor vacio o cero incorrecto

**Dado** que el ciclista esta en una ruta activa
**Cuando** el saldo local estimado se actualiza por km completado
**Entonces** el `GlassTopBar` muestra el estimado local con un indicador visual que distingue "puntos en ruta" del saldo oficial confirmado

### Story 3.4: Puntos Dobles y Badge de Bienvenida en Primera Ruta

Como nuevo ciclista,
quiero recibir puntos dobles y un badge especial al completar mi primera ruta,
para que me sienta bienvenido y motivado a seguir pedaleando.

**Acceptance Criteria:**

**Dado** que el ciclista completa su primera ruta (campo `totalRoutes` en `/users/{uid}` era 0)
**Cuando** la Cloud Function `finishRoute` detecta que es la primera ruta
**Entonces** acredita el doble de puntos calculados y escribe el badge `first-route` en `/users/{uid}.badges[]`

**Dado** que `finishRoute` acredita los puntos dobles
**Cuando** el resultado llega al cliente
**Entonces** la pantalla de resumen de ruta muestra claramente "x2 Puntos de Bienvenida" con el total acreditado y el componente `RouteCompleteSummary` incluye el badge animado

**Dado** que el badge de bienvenida es otorgado
**Cuando** el ciclista navega a su perfil
**Entonces** el badge `first-route` es visible en su coleccion de logros permanentemente

**Dado** que el ciclista ya tiene al menos una ruta completada
**Cuando** finaliza cualquier ruta posterior
**Entonces** el multiplicador x2 de bienvenida NO se aplica — los puntos se calculan normalmente

**Dado** que la primera ruta se finaliza
**Cuando** se otorgan los puntos dobles y el badge
**Entonces** se dispara `expo-haptics` Notification.Success y una animacion de celebracion en pantalla

---

## Epic 4: Mapa de Recompensas y Canje QR

El ciclista ve en el mapa recompensas geolocalizadas con stock en tiempo real, elige una y la canjea en el negocio local con un QR de un solo uso generado en 2 toques, con codigo numerico de respaldo si el lector QR falla.

### Story 4.1: Mapa de Recompensas Geolocalizadas con Stock en Tiempo Real

Como ciclista,
quiero ver en un mapa las recompensas disponibles cerca de mi con su stock actualizado,
para que sepa donde puedo canjear mis puntos antes de ir hasta el negocio.

**Acceptance Criteria:**

**Dado** que el ciclista abre la pantalla de recompensas
**Cuando** el mapa carga
**Entonces** muestra los marcadores `RewardMarker` de todos los partners con stock > 0 en un radio relevante, con el mapa centrado en la ubicacion actual del ciclista

**Dado** que hay hasta 500 recompensas activas en el mapa
**Cuando** el ciclista hace zoom, pan o rota el mapa
**Entonces** la animacion se mantiene a 60fps en el dispositivo minimo soportado sin degradacion visible

**Dado** que un partner actualiza su stock en el panel web
**Cuando** el cambio se registra en Firestore `/rewards`
**Entonces** el marcador en el mapa del ciclista refleja el nuevo estado en menos de 30 segundos via listener en tiempo real

**Dado** que una recompensa llega a stock 0
**Cuando** Firestore actualiza el documento
**Entonces** el `RewardMarker` desaparece del mapa o muestra estado "Agotado" sin recargar la pantalla

**Dado** que el ciclista toca un `RewardMarker`
**Cuando** se selecciona la recompensa
**Entonces** el `GlassBottomSheet` sube al snap point 60% mostrando: nombre del partner, descripcion de la recompensa, stock disponible, distancia desde ubicacion actual y costo en puntos

**Dado** que el ciclista no tiene suficientes puntos para una recompensa
**Cuando** ve el detalle en el `GlassBottomSheet`
**Entonces** el boton de canje aparece deshabilitado con el mensaje "Te faltan X puntos"

### Story 4.2: Generacion de QR de Canje en 2 Toques

Como ciclista,
quiero generar un codigo QR para canjear una recompensa con solo 2 toques,
para que el proceso en el negocio sea rapido y sin fricciones.

**Acceptance Criteria:**

**Dado** que el ciclista tiene suficientes puntos y ve el detalle de una recompensa en el `GlassBottomSheet`
**Cuando** toca "Canjear" (1er toque) y luego confirma (2do toque)
**Entonces** la Cloud Function `generateQRToken` genera un token HMAC-SHA256 con TTL de 5 minutos y lo retorna al cliente

**Dado** que el token es generado exitosamente
**Cuando** el cliente recibe la respuesta
**Entonces** el componente `QRDisplay` muestra el codigo QR en pantalla con un contador regresivo visible de 5 minutos

**Dado** que el QR esta visible en pantalla
**Cuando** el contador llega a 0
**Entonces** el QR desaparece y se muestra el mensaje "Codigo vencido — genera uno nuevo" con boton para reintentar

**Dado** que el partner escanea el QR exitosamente
**Cuando** `validateRedemption` procesa el token
**Entonces** el token queda marcado como utilizado permanentemente en `/redemptions`, el stock de la recompensa se descuenta en 1, y el saldo de puntos del ciclista se actualiza via `usePointsStore`

**Dado** que el canje es confirmado
**Cuando** el cliente recibe la confirmacion del servidor
**Entonces** se dispara `expo-haptics` Notification.Success y la pantalla muestra "Canje exitoso" con el resumen de la recompensa obtenida

**Dado** que alguien intenta reutilizar un token ya utilizado
**Cuando** `validateRedemption` evalua el token
**Entonces** rechaza el canje con error "Codigo ya utilizado" sin descontar stock ni puntos adicionales

### Story 4.3: Codigo Numerico de Respaldo para Canje

Como ciclista,
quiero tener un codigo numerico de respaldo si el lector QR del partner no funciona,
para que pueda canjear mi recompensa de todas formas.

**Acceptance Criteria:**

**Dado** que el `QRDisplay` esta mostrando el QR activo
**Cuando** el ciclista toca "Mostrar codigo numerico"
**Entonces** se muestra un codigo numerico de 6 digitos vinculado al mismo token, con el mismo contador regresivo del QR

**Dado** que el partner ingresa manualmente el codigo numerico de 6 digitos en su panel
**Cuando** el sistema lo valida via `validateRedemption`
**Entonces** el resultado es identico al escaneo QR: token invalidado, stock descontado, puntos descontados del ciclista y confirmacion en ambas pantallas

**Dado** que el codigo numerico y el QR comparten el mismo token
**Cuando** uno de los dos es utilizado exitosamente
**Entonces** el otro queda automaticamente invalidado — no es posible canjear dos veces la misma recompensa

**Dado** que el contador regresivo llega a 0
**Cuando** el token vence
**Entonces** tanto el QR como el codigo numerico dejan de funcionar simultaneamente

**Dado** que el canje por codigo numerico es exitoso
**Cuando** el servidor confirma
**Entonces** el ciclista recibe la misma confirmacion visual y haptica que con el QR (Notification.Success)

---

## Epic 5: Panel de Partners

El negocio partner puede gestionar su catalogo de recompensas desde un panel web (actualizar stock, pausar disponibilidad con cambios visibles en el mapa en menos de 30 segundos), validar el QR presentado por el ciclista y consultar metricas basicas de canjes y ciclistas unicos.

### Story 5.1: Gestion de Inventario de Recompensas

Como partner,
quiero agregar unidades a mis recompensas y pausar su disponibilidad desde un panel web,
para que el stock en el mapa de ciclistas refleje siempre la realidad de mi negocio.

**Acceptance Criteria:**

**Dado** que el partner esta autenticado en el panel web
**Cuando** accede a su catalogo de recompensas
**Entonces** ve la lista de recompensas activas con nombre, stock actual y estado (activa / pausada)

**Dado** que el partner modifica el stock de una recompensa via `PATCH /rewards/:partnerId`
**Cuando** el cambio es procesado por la HTTP Function
**Entonces** el documento en `/rewards` se actualiza y el marcador correspondiente en el mapa de ciclistas refleja el nuevo stock en menos de 30 segundos

**Dado** que el partner pausa una recompensa
**Cuando** el estado cambia a `pausada` en Firestore
**Entonces** el `RewardMarker` desaparece del mapa de ciclistas en menos de 30 segundos sin afectar otras recompensas del mismo partner

**Dado** que el partner reactiva una recompensa pausada
**Cuando** el estado cambia a `activa` con stock > 0
**Entonces** el `RewardMarker` vuelve a aparecer en el mapa de ciclistas en menos de 30 segundos

**Dado** que el partner intenta establecer stock negativo
**Cuando** envia el `PATCH`
**Entonces** la HTTP Function rechaza la operacion con error 400 y el stock permanece sin cambios

### Story 5.2: Validacion de Canje QR por el Partner

Como partner,
quiero escanear o ingresar manualmente el codigo presentado por un ciclista para validar el canje en tiempo real,
para que el proceso sea seguro y rapido en mi negocio.

**Acceptance Criteria:**

**Dado** que el partner esta en su panel web en la seccion de validacion
**Cuando** usa la camara para escanear el QR del ciclista
**Entonces** el panel llama a `validateRedemption` con el token leido y muestra el resultado en menos de 3 segundos

**Dado** que el partner no puede usar la camara
**Cuando** ingresa manualmente el codigo numerico de 6 digitos del ciclista
**Entonces** el panel llama a `validateRedemption` con el mismo token y el resultado es identico al escaneo

**Dado** que `validateRedemption` confirma el canje
**Cuando** el resultado llega al panel
**Entonces** muestra confirmacion verde con: nombre del ciclista (anonimizado), recompensa canjeada y timestamp — el token queda invalido de forma permanente

**Dado** que `validateRedemption` rechaza el token (vencido, ya usado, o invalido)
**Cuando** el resultado llega al panel
**Entonces** muestra error rojo con el motivo especifico ("Codigo vencido", "Codigo ya utilizado", "Codigo invalido") sin descontar stock ni puntos

**Dado** que el partner no tiene conexion a internet al intentar validar
**Cuando** el panel intenta llamar a `validateRedemption`
**Entonces** muestra error "Sin conexion — no es posible validar offline" y NO aprueba el canje bajo ninguna circunstancia

### Story 5.3: Dashboard de Metricas de Canjes

Como partner,
quiero consultar metricas basicas de mis canjes desde el panel web,
para que pueda evaluar el impacto de mis recompensas en los ciclistas.

**Acceptance Criteria:**

**Dado** que el partner accede a su dashboard via `GET /partners/:partnerId/metrics`
**Cuando** la pagina carga
**Entonces** muestra: total de canjes realizados, cantidad de ciclistas unicos que canjearon, y rating promedio de satisfaccion

**Dado** que el partner tiene canjes registrados en `/redemptions`
**Cuando** consulta las metricas
**Entonces** los datos reflejan todos los canjes historicos sin limite de fecha, actualizados al momento de la consulta

**Dado** que el partner aun no tiene ningun canje
**Cuando** accede al dashboard
**Entonces** muestra estado vacio con mensaje orientativo "Aun no tienes canjes — comparte tus recompensas con ciclistas cercanos"

**Dado** que el partner consulta las metricas
**Cuando** los datos cargan
**Entonces** ningun dato permite identificar individualmente a un ciclista — solo se muestran totales y promedios anonimos

**Dado** que el partner accede al dashboard sin autenticacion valida
**Cuando** el servidor evalua el request
**Entonces** la HTTP Function retorna 401 sin exponer datos de ningun partner

---

## Epic 6: Gamificacion y Notificaciones Contextuales

El ciclista construye una racha de dias ciclistas visible en su perfil, recibe notificaciones push de progreso al terminar rutas, recordatorios de racha a las 7pm y notificaciones de logros — todas con reglas de negocio estrictas: maximo 1 por dia, sin horario nocturno, sin notificaciones durante rutas activas. Encuesta NPS post-ruta con throttle de 30 dias.

### Story 6.1: Racha de Dias Consecutivos en Perfil

Como ciclista,
quiero ver mi racha de dias consecutivos pedaleando en mi perfil,
para que me motive a mantenerla activa dia a dia.

**Acceptance Criteria:**

**Dado** que el ciclista completa al menos una ruta en un dia calendario
**Cuando** `finishRoute` procesa la ruta exitosamente
**Entonces** el servidor verifica si ya hubo una ruta ese dia y, si no la habia, incrementa `streak` en `/users/{uid}` y actualiza `lastRouteDate`

**Dado** que el ciclista completa multiples rutas en el mismo dia
**Cuando** `finishRoute` procesa la segunda ruta en adelante
**Entonces** el contador de racha NO se incrementa — solo cuenta dias unicos, no rutas

**Dado** que el ciclista no completa ninguna ruta en un dia calendario
**Cuando** pasa la medianoche sin `lastRouteDate` del dia actual
**Entonces** `streak` se reinicia a 0 en el siguiente acceso del usuario o al procesar la siguiente ruta

**Dado** que el ciclista abre su perfil
**Cuando** la pantalla carga
**Entonces** el componente `StreakBadge` muestra el numero actual de dias consecutivos con el estado correcto (activa o rota)

**Dado** que el ciclista tiene una racha de 7 dias o mas
**Cuando** el `StreakBadge` muestra la racha
**Entonces** aplica un estilo visual destacado (color ambar, animacion sutil) para reforzar el logro

### Story 6.2: Encuesta NPS Post-Ruta

Como ciclista,
quiero recibir una encuesta de satisfaccion de una sola pregunta al terminar una ruta,
para que pueda dar mi opinion de forma rapida sin interrumpir mi experiencia.

**Acceptance Criteria:**

**Dado** que el ciclista finaliza una ruta
**Cuando** la pantalla de resumen se muestra
**Entonces** el sistema verifica si han pasado al menos 30 dias desde la ultima encuesta respondida por ese usuario

**Dado** que han pasado mas de 30 dias desde la ultima encuesta (o es la primera)
**Cuando** el resumen de ruta se muestra
**Entonces** aparece la encuesta NPS de una sola pregunta con escala 0-10 en el `GlassBottomSheet` con snap point 30%

**Dado** que la encuesta NPS aparece
**Cuando** el ciclista selecciona un valor entre 0 y 10
**Entonces** la respuesta se guarda en Firestore, se actualiza `lastNpsSurveyAt` en `/users/{uid}` y la encuesta desaparece sin bloquear el flujo

**Dado** que el ciclista descarta la encuesta sin responder
**Cuando** la cierra
**Entonces** el campo `lastNpsSurveyAt` NO se actualiza — la encuesta puede volver a aparecer en la siguiente ruta elegible

**Dado** que han pasado menos de 30 dias desde la ultima encuesta respondida
**Cuando** el ciclista finaliza una ruta
**Entonces** la encuesta NPS NO aparece — el resumen de ruta se muestra sin ella

### Story 6.3: Notificacion de Progreso Hacia Recompensa

Como ciclista,
quiero recibir una notificacion push al terminar una ruta cuando estoy cerca de alcanzar una recompensa especifica,
para que sepa que me falta poco y me motive a seguir.

**Acceptance Criteria:**

**Dado** que el ciclista finaliza una ruta
**Cuando** `finishRoute` acredita los puntos
**Entonces** el servidor evalua si el ciclista esta a 2 rutas o menos de alguna recompensa alcanzable con su saldo proyectado

**Dado** que el ciclista esta a 2 rutas o menos de una recompensa
**Cuando** el servidor evalua el throttle en `/notifications/{uid}/daily/{YYYY-MM-DD}`
**Entonces** envia la notificacion push solo si no se envio ya una notificacion de progreso ese dia calendario

**Dado** que la notificacion de progreso es enviada
**Cuando** el ciclista la recibe
**Entonces** el texto menciona la recompensa especifica y cuantas rutas le faltan ("Te falta 1 ruta para [Recompensa] en [Partner]")

**Dado** que ya se envio una notificacion de progreso al ciclista ese dia
**Cuando** finaliza otra ruta el mismo dia que tambien califica
**Entonces** NO se envia una segunda notificacion — el throttle de 1 por dia se respeta sin excepcion

**Dado** que el ciclista tiene una ruta activa en curso
**Cuando** el sistema evalua notificaciones pendientes
**Entonces** NO se envia ninguna notificacion de progreso hasta que la ruta activa finalice

### Story 6.4: Recordatorio de Racha a las 7pm

Como ciclista con racha activa,
quiero recibir un recordatorio push a las 7pm si no he pedaleado ese dia,
para que no pierda mi racha por olvido.

**Acceptance Criteria:**

**Dado** que son las 7pm hora local del ciclista
**Cuando** la Scheduled Function `streakReminder` ejecuta su cron
**Entonces** evalua para cada usuario con `streak >= 3` si `lastRouteDate` es diferente al dia actual

**Dado** que el ciclista tiene racha >= 3 dias y no ha completado ninguna ruta ese dia
**Cuando** `streakReminder` evalua el throttle en `/notifications/{uid}/daily/{YYYY-MM-DD}`
**Entonces** envia el push "Tu racha de X dias esta en riesgo — pedalea antes de medianoche" solo si no se envio ya un recordatorio de racha ese dia

**Dado** que el ciclista ya completo una ruta ese dia
**Cuando** `streakReminder` evalua su estado
**Entonces** NO envia recordatorio — la racha ya esta asegurada para hoy

**Dado** que el ciclista tiene racha de menos de 3 dias
**Cuando** `streakReminder` evalua su estado
**Entonces** NO envia recordatorio — el umbral minimo es 3 dias consecutivos

**Dado** que el recordatorio de racha es enviado
**Cuando** el ciclista toca la notificacion
**Entonces** la app abre directamente la pantalla principal con el boton "Iniciar Ruta" visible

### Story 6.5: Notificaciones de Logros y Recompensas de Partners

Como ciclista,
quiero recibir una notificacion cuando desbloqueo un logro o cuando un partner publica una recompensa nueva cerca de mi,
para que me entere de oportunidades relevantes sin tener que abrir la app constantemente.

**Acceptance Criteria:**

**Dado** que el ciclista desbloquea un logro (badge, nivel o primera recompensa semanal)
**Cuando** el servidor registra el evento
**Entonces** envia una notificacion push con el nombre del logro desbloqueado, verificando el throttle de 1 notificacion de este tipo por dia en `/notifications/{uid}/daily/{YYYY-MM-DD}`

**Dado** que un partner publica una recompensa nueva en Firestore
**Cuando** el sistema evalua ciclistas en radio de 2km del partner
**Entonces** envia notificacion push a cada ciclista elegible solo si no recibio ya una notificacion de logros/recompensas ese dia

**Dado** que el ciclista tiene una ruta activa en curso
**Cuando** ocurre un evento de logro o recompensa nueva
**Entonces** la notificacion se encola y se envia unicamente cuando la ruta activa finalice

**Dado** que el ciclista ya recibio una notificacion de este tipo ese dia
**Cuando** ocurre un segundo evento de logro o recompensa nueva el mismo dia
**Entonces** la segunda notificacion NO se envia — el throttle de 1 por dia es compartido entre logros y recompensas de partners

**Dado** que el ciclista toca la notificacion de logro
**Cuando** la app abre
**Entonces** navega directamente al perfil mostrando el badge o logro desbloqueado

**Dado** que el ciclista toca la notificacion de recompensa nueva
**Cuando** la app abre
**Entonces** navega directamente al mapa con el `RewardMarker` del partner nuevo resaltado

---

## Epic 7: Privacidad y Cumplimiento Regulatorio

El ciclista puede ver, exportar y eliminar todos sus datos de ubicacion desde su perfil. El sistema rechaza el registro de menores de 13 anos y deshabilita funciones de ranking y social para usuarios de 13-17 anos, cumpliendo COPPA, GDPR y los requisitos de App Store y Google Play.

### Story 7.1: Ver, Exportar y Eliminar Datos de Ubicacion

Como ciclista,
quiero ver, exportar y eliminar todos mis datos de ubicacion desde mi perfil,
para que tenga control total sobre mi informacion personal en cualquier momento.

**Acceptance Criteria:**

**Dado** que el ciclista abre su perfil
**Cuando** navega a la seccion "Mis Datos"
**Entonces** ve un resumen de los datos almacenados: total de rutas, distancia acumulada, ciudad registrada — sin trazas GPS brutas (que nunca se almacenan)

**Dado** que el ciclista toca "Exportar mis datos"
**Cuando** el sistema prepara la exportacion
**Entonces** genera un archivo con las metricas derivadas de sus rutas (distancia, duracion, puntos, fecha) pero sin coordenadas GPS individuales — solo datos que le pertenecen al ciclista

**Dado** que el ciclista toca "Eliminar mis datos de ubicacion"
**Cuando** confirma la accion con un segundo toque
**Entonces** se eliminan de Firestore todas las metricas de rutas en `/routes` asociadas a su `uid`, manteniendo unicamente el perfil basico (email, ciudad, puntos) necesario para la cuenta

**Dado** que el ciclista elimina sus datos de ubicacion
**Cuando** la eliminacion es exitosa
**Entonces** el historial de rutas en la app muestra estado vacio y el saldo de puntos permanece intacto — los puntos ya acreditados no se revierten

**Dado** que el sistema registra datos de movilidad para uso municipal
**Cuando** se exportan datos agregados
**Entonces** solo se exportan agregados anonimos por zona geografica — ningun dato exportado permite identificar individualmente al ciclista

### Story 7.2: Control de Edad y Restricciones COPPA

Como sistema,
quiero verificar la edad del usuario durante el registro y aplicar restricciones apropiadas segun su edad,
para que EcoBike cumpla con COPPA, GDPR y las politicas de App Store y Google Play.

**Acceptance Criteria:**

**Dado** que un usuario intenta registrarse
**Cuando** ingresa su fecha de nacimiento en el formulario de registro
**Entonces** el sistema calcula su edad y si es menor de 13 anos rechaza el registro con mensaje claro "EcoBike requiere tener al menos 13 anos" sin crear ningun dato en Firestore

**Dado** que el usuario tiene entre 13 y 17 anos al registrarse
**Cuando** su cuenta es creada en `/users/{uid}`
**Entonces** se almacena el campo `ageGroup: 'minor'` y las funciones de ranking publico, comparacion social y perfil visible por otros quedan deshabilitadas de forma permanente hasta que actualice su edad

**Dado** que un usuario con `ageGroup: 'minor'` usa la app
**Cuando** navega a secciones de ranking o social
**Entonces** esas secciones no se muestran en su navegacion — no son accesibles ni visibles en ningun punto del flujo

**Dado** que un usuario con `ageGroup: 'minor'` cumple 18 anos
**Cuando** actualiza su fecha de nacimiento en su perfil
**Entonces** el sistema recalcula la edad, actualiza `ageGroup: 'adult'` y habilita todas las funciones previamente restringidas

**Dado** que un usuario omite la fecha de nacimiento durante el registro OAuth (Google, Apple, Facebook)
**Cuando** el flujo OAuth no provee la fecha
**Entonces** se solicita la fecha de nacimiento en un paso obligatorio post-OAuth antes de acceder a la app, sin posibilidad de saltar este paso

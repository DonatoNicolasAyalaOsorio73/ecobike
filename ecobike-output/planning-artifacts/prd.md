---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-e-01-discovery', 'step-e-02-review', 'step-e-03-edit', 'step-e-03-edit-production-review']
classification:
  projectType: mobile_app
  domain: sustainability_gamification
  complexity: low
  projectContext: brownfield
inputDocuments: ['ecobike-output/brainstorming/brainstorming-session-2026-08-20.md']
workflowType: 'prd'
date: '2026-08-20'
lastEdited: '2026-08-21'
editHistory:
  - date: '2026-08-21'
    changes: 'Agregados: Resumen Ejecutivo, Requisitos Funcionales, Requisitos No Funcionales. Corregida fuga de implementación. Completados platform_reqs y push_strategy.'
  - date: '2026-08-21'
    changes: 'Revisión de producción: mapa de recompensas movido a MVP; FRs 018-024 agregados (validación QR partner, migración de perfil, NPS, gamificación, notificaciones); rachas clarificadas en scope; complexity corregido a low.'
brainstormingCount: 1
projectDocsCount: 0
briefCount: 0
researchCount: 0
---

# Product Requirements Document - EcoBike

**Author:** DONA
**Date:** 2026-08-20

## Resumen Ejecutivo

**Visión:** EcoBike convierte cada kilómetro pedaleado en puntos canjeables por recompensas reales en negocios locales — haciendo que la movilidad urbana en bicicleta sea económicamente atractiva para el ciclista y un canal de adquisición de clientes de bajo CAC para el negocio local.

**Usuarios objetivo:**
- **Ciclista urbano** (18-40 años, Latinoamérica) — pedalea por traslado o ejercicio, sin incentivo económico tangible hoy
- **Negocio local partner** — cafeterías, restaurantes, tiendas — busca atraer clientes ciclistas con costo por resultado

**Problema que resuelve:**
- Para el ciclista: la movilidad sostenible no tiene recompensa económica real — el hábito se abandona sin refuerzo tangible
- Para el negocio: no existe canal de adquisición dirigido a ciclistas en el mercado hispano

**Diferenciadores:**
- Primer mapa vivo de recompensas geolocalizadas en movilidad sostenible del mercado hispano — pedalear tiene destinos con valor económico real hoy
- GPS offline-first con recuperación automática de rutas interrumpidas — confiabilidad superior a cualquier competidor directo
- Datos de movilidad urbana anónimos como subproducto vendible a municipios (B2G) — modelo de negocio sin competidor en Latinoamérica

**Estado actual del producto:** App brownfield funcional en React Native + Expo con tracking GPS, sistema de puntos (10pts/km) y recompensas básicas. Esta iteración robustece la confiabilidad técnica y agrega el mapa vivo de recompensas como diferenciador principal.

---

## Criterios de Éxito

### Éxito del Usuario

- El ciclista completa una ruta y ve sus puntos acreditados en menos de 3 segundos al terminar
- Una interrupción (llamada, bloqueo de pantalla) no borra ningún km registrado — nunca
- El usuario canjea una recompensa en el negocio en menos de 30 segundos desde la app
- El perfil refleja correctamente todo el historial del usuario aunque cambie de teléfono
- El onboarding completo toma menos de 60 segundos hasta iniciar la primera ruta

### Éxito del Negocio

**A 3 meses:**
- 40% de usuarios activos semanales (pedalean al menos una vez por semana)
- Tasa de retención día 30: ≥35% de nuevos usuarios siguen usando la app
- Al menos 1 recompensa canjeada por usuario activo al mes

**A 6 meses:**
- 3+ negocios partner con recompensas geolocalizadas activas en el mapa
- Racha promedio de usuarios activos: ≥5 días consecutivos
- NPS (satisfacción) ≥50 en encuesta en-app post-ruta

### Éxito Técnico

- 0 rutas perdidas por interrupción de app en ambiente de producción
- Tiempo de apertura de app: pantalla útil en menos de 1 segundo (caché local)
- GPS funciona completamente sin conexión — sincroniza solo al terminar la ruta
- Puntos calculados en servidor — 0 posibilidades de manipulación desde cliente
- Stock de recompensas en tiempo real — divergencia máxima de 30 segundos entre cambio del partner y visibilidad en el mapa

### Resultados Medibles

| Métrica | Línea base actual | Meta 3 meses | Meta 6 meses |
|---------|------------------|--------------|--------------|
| Usuarios activos semanales | - | 40% | 55% |
| Retención día 30 | - | 35% | 45% |
| Rutas perdidas por interrupción | desconocido | 0 | 0 |
| Recompensas canjeadas/usuario/mes | - | 1+ | 2+ |
| Tiempo apertura app | - | <1s | <1s |
| NPS post-ruta | - | - | ≥50 |

## Alcance del Producto

### MVP — Mínimo Producto Viable

Lo esencial para que EcoBike sea confiable:

- GPS offline-first con checkpoints locales cada 30 segundos
- Puntos acreditados localmente al instante, sincronización con el servidor al terminar ruta
- Feedback háptico + animación flotante "+Xpts" por cada km completado
- Canje express con QR en 2 toques + código numérico de respaldo — con validación del lado del partner
- Mapa de recompensas geolocalizadas con stock en tiempo real
- Racha de días consecutivos: contador visible en perfil con recordatorio push al final del día si no se ha pedaleado
- Encuesta de satisfacción NPS post-ruta (1 pregunta, máximo 1 vez cada 30 días)
- Validación de velocidad: pausa automática sostenida sobre 30 km/h
- Protocolo de prueba de interrupciones obligatorio antes de cada release

### Growth — Características Competitivas (Post-MVP)

Lo que hace a EcoBike competitivo frente a alternativas:

- Perfil con estadísticas ricas (CO₂, km totales, historial de rutas, arquetipo ciclista)
- Sistema de niveles progresivos (Novato → Eco-Guerrero) con animaciones
- Ligas semanales entre ciclistas del mismo nivel
- Escudo de protección de racha (7 días consecutivos = 1 escudo consumible)
- Barra de progreso hacia recompensa específica visible durante la ruta
- Zonas de multiplicador de puntos rotativas en el mapa
- Puntos escalonados por distancia (km 11+ vale más)

## Journeys de Usuario

### Journey 1: Ciclista Activo — Camino Feliz

**Persona:** Mariana, 28 años, diseñadora gráfica. Pedalea al trabajo 3 veces por semana. Usuaria activa hace 2 meses.

**Escena inicial:** 7:10am. Mariana abre EcoBike, ve un cofre de puntos a 600m y zona x2 en su ruta. Saldo: 340 pts — faltan 60 para el café gratis en CaféVerde.

**Acción en ascenso:** Toca "Iniciar Ruta" — confeti, "+5 puntos de arranque". Cada kilómetro: vibración suave + animación "+10pts". Al km 4 pasa por zona x2: "+20pts". Recibe una llamada — la atiende sin tocar la app.

**Clímax:** Al colgar, EcoBike sigue corriendo. Ningún km perdido. 9.2km, 112 puntos acreditados al instante. Notificación: "Saldo: 452 pts. ¡Te faltan 8 pts para tu café!"

**Resolución:** En la vuelta pedalea 800m extra por zona multiplicadora. 462 puntos. QR generado en 1 toque. Café gratis. Comparte badge "Primera Recompensa Semanal" en Instagram.

**Capacidades reveladas:** GPS background, puntos en tiempo real, feedback háptico, mapa de recompensas geolocalizadas, QR express, notificaciones de saldo, insignias compartibles.

---

### Journey 2: Ciclista con Interrupción — Caso Límite

**Persona:** Roberto, 35 años, mensajero independiente. 15-20km diarios. Teléfono con batería irregular, zonas sin señal.

**Escena inicial:** Ruta de 18km en zona industrial. Sin señal 6km. A los 4km el teléfono cae al 5% y se apaga.

**Acción en ascenso:** Roberto conecta powerbank. Enciende el teléfono. EcoBike muestra: *"Detectamos una ruta interrumpida a las 14:23. ¿Continuarla o descartarla?"* — 4.3km guardados antes del apagón.

**Clímax:** Toca "Continuar". Los 6km sin señal se calcularon del GPS local guardado cada 30 segundos. Total: 18km completos, 210 puntos acreditados. Ningún km perdido.

**Resolución:** Roberto nunca llama a soporte. Confía en EcoBike para rutas largas en condiciones reales. Se convierte en el ciclista con más km en su colonia.

**Capacidades reveladas:** Checkpoints locales cada 30s, detección de ruta interrumpida, recuperación automática, GPS offline completo, sincronización diferida con el servidor al recuperar conexión.

---

### Journey 3: Negocio Partner — Gestión de Recompensas

**Persona:** Carmen, 42 años, dueña de CaféVerde. Se unió a EcoBike hace 3 semanas para atraer ciclistas locales.

**Escena inicial:** Panel de partner. Publicó 20 "cafés gratis" — quedan 3. Esta mañana llegaron 8 ciclistas. Necesita actualizar antes de que alguien más pedalee hasta su local para nada.

**Acción en ascenso:** Abre "Mis Recompensas", recarga +20 unidades. El cambio se refleja en el mapa de todos los usuarios en menos de 30 segundos.

**Clímax:** 14 ciclistas ese día. Dashboard muestra consumo promedio +$85 MXN adicional por visita. CAC 3x más bajo que Instagram Ads.

**Resolución:** Carmen renueva. Lanza segunda recompensa. Sistema de rating la posiciona primero en el mapa por alta calidad.

**Capacidades reveladas:** Panel partner con stock en tiempo real, sincronización inmediata con mapa de usuarios, validación de QR, dashboard de métricas, sistema de rating de negocios.

---

### Journey 4: Nuevo Usuario — Onboarding

**Persona:** Diego, 22 años, estudiante universitario. Ve el badge "Eco-Guerrero Nivel 3" de Mariana en Instagram y descarga EcoBike.

**Escena inicial:** Primera pantalla: ruta real de Mariana, 9.2km, 112 puntos, café gratis. Botón: *"Empieza a ganar puntos"*. No un formulario.

**Acción en ascenso:** Solo email y ciudad — 20 segundos. Mapa con recompensas flotantes. Toca "Iniciar Ruta" sin leer ningún tutorial.

**Clímax:** 2.3km completados. Animación de celebración, "+23 puntos de bienvenida (¡doble en tu primera ruta!)", badge "Primera Pedaleada". Notificación: "Te faltan 27 pts para el helado. ¡Mañana lo consigues!"

**Resolución:** En una semana, Diego pedalea 4 veces. En día 7: "Racha de 4 días — sigue mañana para tu primer Escudo." Hábito construido sin saberlo.

**Capacidades reveladas:** Onboarding sin fricción, primera pantalla con prueba social real, primera recompensa garantizada con puntos dobles, badge de bienvenida, notificaciones de progreso contextual, sistema de rachas desde día 1.

---

### Resumen de Capacidades por Journey

| Capacidad | J1 Activo | J2 Interrupción | J3 Partner | J4 Nuevo |
|-----------|-----------|----------------|------------|----------|
| GPS offline + checkpoints | ✓ | ✓ | | |
| Puntos en tiempo real + háptico | ✓ | ✓ | | |
| Mapa de recompensas geolocalizadas | ✓ | | ✓ | ✓ |
| QR express de canje | ✓ | | ✓ | |
| Panel partner con stock en tiempo real | | | ✓ | |
| Onboarding sin fricción | | | | ✓ |
| Primera recompensa garantizada | | | | ✓ |
| Sistema de rachas y badges | ✓ | | | ✓ |
| Recuperación de ruta interrumpida | | ✓ | | |
| Notificaciones de progreso contextual | ✓ | | | ✓ |

## Requisitos de Dominio

### Cumplimiento y Regulatorio

**Privacidad de ubicación (GDPR / CCPA):**
- Consentimiento explícito antes de activar GPS — pantalla con lenguaje humano, no letra pequeña
- El usuario puede ver, exportar y eliminar todos sus datos de ubicación desde el perfil
- Datos de rutas almacenados con identificador anónimo para analytics municipal (B2G)
- Política de privacidad en una página, accesible desde onboarding y perfil

**Cumplimiento App Store / Google Play:**
- Declarar background location con justificación clara: "Registrar tu ruta aunque cambies de app"
- Apple: `NSLocationAlwaysUsageDescription` con redacción precisa para aprobación
- Google Play: formulario de declaración de permisos sensibles para `ACCESS_BACKGROUND_LOCATION`
- Notificaciones push: solicitar consentimiento después del primer valor recibido, no en onboarding

**Protección de datos de menores:**
- Edad mínima 13 años en registro con validación
- Menores de 13: deshabilitar funciones sociales y ranking (COPPA)

### Restricciones Técnicas

**Seguridad del sistema de puntos:**
- Puntos escritos exclusivamente por funciones del servidor — el cliente tiene permiso de solo lectura sobre su saldo
- Validación de velocidad en servidor: rutas con >30 km/h sostenidos marcadas como sospechosas antes de acreditar
- Rate limiting: máximo 5 rutas por usuario por hora

**Privacidad técnica:**
- GPS no almacenado en bruto — solo métricas derivadas (km, puntos, duración)
- Módulo B2G: solo datos agregados anónimos por zona, nunca trazas individuales identificables
- Historial de rutas eliminable por el usuario en cualquier momento

**Seguridad del canje:**
- QR con token de un solo uso + expiración de 5 minutos
- Validación del QR desde el servidor — el cliente nunca decide si el canje es válido
- Logs de auditoría de todos los canjes para detección de fraude

### Requisitos de Plataforma

**iOS:**
- Versión mínima: iOS 14.0 (requerido para background location confiable)
- Dispositivos: iPhone 6s o superior
- Declarar permisos de ubicación con redacción precisa aprobada por App Store Review: siempre activa y solo cuando usa la app

**Android:**
- Versión mínima: Android 8.0 (API Level 26)
- Permiso de localización en segundo plano con formulario de declaración de permisos sensibles de Google Play
- Servicio de localización con notificación persistente requerida en Android 9+

**Dispositivo mínimo:**
- Pantalla: 375px de ancho (equivalente a iPhone SE 2020)
- Almacenamiento disponible: ≥150 MB para app + caché de rutas locales
- GPS hardware integrado: requerido — la app no soporta dispositivos sin receptor GPS

### Estrategia de Notificaciones Push

**Tipos de notificación:**
- **Progreso:** "Te faltan X pts para [recompensa]" — al terminar ruta cuando hay recompensa alcanzable en ≤2 rutas más
- **Racha:** Recordatorio a las 7pm si el usuario no ha pedaleado ese día y tiene racha activa de ≥3 días consecutivos
- **Logro:** Badge desbloqueado, nivel alcanzado, primera recompensa semanal canjeada
- **Partner:** Nueva recompensa disponible en zona ≤2km del usuario (máximo 1 por semana por usuario)

**Reglas de entrega:**
- Máximo 1 notificación diaria por usuario, independientemente del tipo
- Sin notificaciones entre las 10pm y las 7am
- Sin notificaciones durante rutas activas

**Consentimiento:**
- No solicitar permisos de push en onboarding — solicitar después del primer logro recibido
- Opt-out granular por tipo desde Configuración → Notificaciones
- Desactivar todas las notificaciones no requiere más de 2 toques

### Capacidades de Integración

- El sistema soporta autenticación con email/contraseña y cuenta de Google — inicio de sesión persistente entre sesiones
- El backend almacena datos del usuario con reglas de acceso por colección: solo el usuario autenticado lee y modifica sus propios datos
- El cálculo de puntos, validación de rutas y generación de tokens de canje se ejecutan exclusivamente en el servidor — el cliente no puede alterar estos valores
- La app rastrea la ubicación del ciclista en segundo plano sin interrumpir el tracking al cambiar de app o recibir llamadas
- La interfaz provee retroalimentación háptica por cada kilómetro completado durante la ruta activa
- La pantalla principal incluye un mapa interactivo con capas de recompensas geolocalizadas y zonas de puntos multiplicados actualizables en tiempo real
- Los partners acceden a un panel web para ver y actualizar su inventario de recompensas; los cambios se reflejan en el mapa de usuarios en ≤30 segundos

### Mitigación de Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Rechazo App Store por background location | Media | Redacción precisa + onboarding muestra valor antes de pedir permiso |
| Manipulación de puntos desde cliente | Alta sin protección | Puntos calculados 100% en servidor |
| Fuga de datos de ubicación | Media | Almacenar solo métricas derivadas, no trazas GPS brutas |
| QR de canje reutilizado | Media | Token único + expiración 5 minutos |
| Usuarios menores sin protección | Baja | Validación de edad + deshabilitar funciones sociales <13 |

## Innovación y Patrones Novedosos

### Áreas de Innovación Detectadas

**Innovación 1 — Mapa Vivo de Recompensas Geolocalizadas**
Combina tracking GPS + marketplace de negocios locales + gamificación de territorio urbano. El resultado: un mapa donde pedalear tiene destinos concretos con valor económico real hoy. La mecánica más cercana es Pokémon GO aplicado a movilidad sostenible con recompensas tangibles. No existe en el mercado hispano de movilidad.

**Innovación 2 — Inteligencia de Movilidad Urbana como Subproducto (B2G)**
EcoBike genera el mapa de calor de movilidad ciclista más granular de cada ciudad donde opera. Convertirlo en producto vendible a municipios para planificación de ciclovías crea un modelo de negocio sin competidor directo en Latinoamérica.

**Innovación 3 — Inversión del Flujo de Recompensas**
Modelo estándar: acumula → canjea. EcoBike: elige la recompensa primero → pedalea exactamente lo necesario. Variante disruptiva: los negocios ofertan activamente a ciclistas cercanos — las recompensas buscan al ciclista, no al revés.

### Contexto de Mercado y Panorama Competitivo

| Competidor | Fortaleza | Lo que EcoBike hace diferente |
|-----------|----------|------------------------------|
| Strava | Tracking y comunidad ciclista fuerte | Sin recompensas económicas reales ni mapa de negocios |
| Biko (México) | Pionero en puntos por ciclismo | Catálogo estático, sin geolocalización en el mapa |
| Duolingo | Maestro de gamificación de hábitos | Sin aplicación a movilidad urbana ni recompensas físicas |
| Waze | Mapa colaborativo en tiempo real | Sin gamificación ni recompensas para ciclistas |
| Pokémon GO | Geolocalización + recompensas en mapa | Sin valor económico real ni impacto de movilidad sostenible |

### Enfoque de Validación

- **Mapa de recompensas:** >30% de rutas iniciadas desde un marcador en los primeros 60 días. Experimento: 3 negocios partner en zona piloto, 30 días.
- **Datos B2G:** Reunión formal con 1 municipio en 6 meses. Experimento: reporte de muestra gratuito con datos de 1 mes.
- **Inversión del flujo:** >25% más tasa de completación en rutas con recompensa pre-elegida. Experimento: A/B test 50/50.

### Mitigación de Riesgos de Innovación

| Riesgo | Plan de contingencia |
|--------|---------------------|
| Negocios no actualizan stock | Alertas automáticas cuando stock <3 + auto-pausa si no responde en 24h |
| Municipio sin presupuesto para datos B2G | El producto funciona sin este módulo — es upside, no dependencia |
| Usuarios ignoran el mapa de recompensas | Tracking y puntos básicos siguen funcionando — la innovación es una capa opcional |
| Inversión del flujo confunde nuevos usuarios | Introducirlo progresivamente como sugerencia, no como flujo obligatorio |

### Visión — Futuro Deseado

La versión soñada de EcoBike:

- Datos de movilidad anónimos vendidos a municipios (B2G)
- Programa de bienestar corporativo con dashboard de empresa (B2B)
- EcoBike en escuelas como programa educativo
- Red de embajadores ciclistas con beneficios exclusivos
- Resumen anual compartible estilo Spotify Wrapped
- Desafíos patrocinados por marcas con premios reales

## Requisitos Funcionales

### Tracking de Rutas

- **FR-001:** El ciclista puede iniciar una ruta con un toque desde la pantalla principal, con GPS activo en menos de 3 segundos
- **FR-002:** El ciclista puede continuar una ruta interrumpida (llamada entrante, cierre de app, apagado del dispositivo) recuperando todos los kilómetros registrados hasta la interrupción
- **FR-003:** El sistema registra la posición del ciclista sin conexión a internet — sincroniza la ruta completa al recuperar conexión o al terminar manualmente
- **FR-004:** El sistema pausa el registro de la ruta cuando el dispositivo detecta velocidad >30 km/h de manera sostenida por más de 60 segundos consecutivos

### Sistema de Puntos

- **FR-005:** El ciclista visualiza sus puntos acumulados en tiempo real durante la ruta, con animación flotante y retroalimentación háptica al completar cada kilómetro
- **FR-006:** El sistema calcula y valida los puntos de la ruta en el servidor al finalizarla — el resultado se refleja en el saldo del ciclista en menos de 3 segundos
- **FR-007:** El ciclista puede ver su saldo de puntos actualizado en todas las pantallas de la app
- **FR-008:** Los puntos acumulados no tienen fecha de vencimiento

### Recompensas y Canje

- **FR-009:** El ciclista puede generar un código QR de canje en 2 toques desde la pantalla de recompensas — el QR es válido por 5 minutos y de un solo uso
- **FR-010:** El ciclista puede usar un código numérico de respaldo si el lector QR del partner no funciona
- **FR-011:** El ciclista puede ver recompensas disponibles geolocalizadas en el mapa, con stock actualizado en tiempo real

### Partners

- **FR-012:** El partner puede actualizar el inventario de recompensas (agregar unidades, pausar disponibilidad) desde un panel web — los cambios se reflejan en el mapa de usuarios en ≤30 segundos
- **FR-013:** El partner puede consultar métricas básicas de canjes en su dashboard: total canjeados, ciclistas únicos, rating promedio
- **FR-018:** El partner puede escanear o ingresar manualmente el código presentado por un ciclista para validar el canje — el sistema confirma la validez en tiempo real y marca el token como utilizado de forma permanente

### Onboarding y Perfil

- **FR-014:** El nuevo usuario puede completar el registro con email y ciudad en menos de 60 segundos, sin campos opcionales en el flujo principal
- **FR-015:** El nuevo usuario recibe puntos dobles y badge de bienvenida al completar su primera ruta
- **FR-019:** El historial de rutas, saldo de puntos y perfil del usuario se restauran completamente al iniciar sesión en un nuevo dispositivo
- **FR-020:** El sistema presenta una encuesta de satisfacción de una pregunta (escala 0-10) al finalizar una ruta — con frecuencia máxima de una vez cada 30 días por usuario

### Gamificación

- **FR-021:** El sistema registra la racha de días consecutivos del usuario (días calendario con al menos una ruta completada) y muestra el conteo actual en el perfil

### Notificaciones

- **FR-022:** El sistema envía una notificación push de progreso al terminar una ruta cuando el usuario está a ≤2 rutas de una recompensa específica alcanzable — máximo una notificación de este tipo por día
- **FR-023:** El sistema envía una notificación push de recordatorio de racha a las 7pm si el usuario tiene racha activa de ≥3 días consecutivos y no ha completado ninguna ruta ese día
- **FR-024:** El sistema envía una notificación push al desbloquear un logro (badge, nivel, primera recompensa semanal) o cuando un partner publica una recompensa nueva en radio ≤2km del usuario — máximo una notificación de este tipo por día por usuario

### Privacidad y Datos

- **FR-016:** El usuario puede ver, exportar y eliminar todos sus datos de ubicación desde su perfil en cualquier momento
- **FR-017:** El sistema rechaza el registro de usuarios menores de 13 años; deshabilita funciones de ranking y social para usuarios de 13-17 años

## Requisitos No Funcionales

### Rendimiento

- **NFR-001:** La pantalla principal carga en menos de 1 segundo desde app en segundo plano, usando caché local del último estado conocido
- **NFR-002:** Los puntos de una ruta se acreditan y reflejan en el saldo del usuario en menos de 3 segundos al finalizar
- **NFR-003:** El stock de recompensas en el mapa se actualiza en menos de 30 segundos tras cualquier cambio registrado por el partner

### Confiabilidad

- **NFR-004:** El sistema registra 0 rutas perdidas por interrupción (llamada, bloqueo de pantalla, cierre de app) en producción — validado mediante protocolo de prueba de interrupciones obligatorio antes de cada release
- **NFR-005:** La sincronización de rutas al servidor no falla silenciosamente — el usuario es notificado si la sincronización no completó en 60 segundos post-ruta

### Seguridad

- **NFR-006:** El saldo de puntos del usuario es de solo lectura desde el cliente — toda modificación requiere validación del servidor, sin excepción
- **NFR-007:** Los tokens de canje QR expiran en 5 minutos y se invalidan permanentemente tras el primer uso exitoso
- **NFR-008:** El sistema limita el registro a máximo 5 rutas por usuario por hora

### Privacidad

- **NFR-009:** Las trazas GPS brutas no se almacenan en el servidor — solo métricas derivadas: distancia total, duración, puntos acreditados
- **NFR-010:** Los datos de movilidad para uso municipal se exportan únicamente como agregados anónimos por zona geográfica — sin trazas individuales identificables en ningún caso

### Escalabilidad

- **NFR-011:** El mapa de recompensas soporta hasta 500 marcadores simultáneos sin degradación de fluidez (≥60fps en el dispositivo mínimo soportado)
- **NFR-012:** El backend procesa la sincronización de rutas de hasta 1,000 usuarios simultáneos sin exceder los tiempos de NFR-002

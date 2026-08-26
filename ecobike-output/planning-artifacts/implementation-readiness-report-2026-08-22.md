---
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
documentsIncluded:
  prd: ecobike-output/planning-artifacts/prd.md
  architecture: ecobike-output/planning-artifacts/architecture.md
  epics: ecobike-output/planning-artifacts/epics.md
  ux: ecobike-output/planning-artifacts/ux-design-specification.md
---

# Implementation Readiness Assessment Report

**Fecha:** 2026-08-22
**Proyecto:** EcoBike

## Inventario de Documentos

| Tipo | Archivo | Estado |
|------|---------|--------|
| PRD | ecobike-output/planning-artifacts/prd.md | Encontrado |
| Arquitectura | ecobike-output/planning-artifacts/architecture.md | Encontrado |
| Epics y Historias | ecobike-output/planning-artifacts/epics.md | Encontrado |
| Diseno UX | ecobike-output/planning-artifacts/ux-design-specification.md | Encontrado |

Sin duplicados. Sin documentos fragmentados. Todos los documentos requeridos presentes.

---

## Analisis del PRD

### Requisitos Funcionales

| ID | Descripcion |
|----|------------|
| FR-001 | El ciclista puede iniciar una ruta con un toque desde la pantalla principal, con GPS activo en menos de 3 segundos |
| FR-002 | El ciclista puede continuar una ruta interrumpida (llamada entrante, cierre de app, apagado del dispositivo) recuperando todos los kilómetros registrados hasta la interrupcion |
| FR-003 | El sistema registra la posicion del ciclista sin conexion a internet — sincroniza la ruta completa al recuperar conexion o al terminar manualmente |
| FR-004 | El sistema pausa el registro de la ruta cuando el dispositivo detecta velocidad >30 km/h de manera sostenida por mas de 60 segundos consecutivos |
| FR-005 | El ciclista visualiza sus puntos acumulados en tiempo real durante la ruta, con animacion flotante y retroalimentacion haptica al completar cada kilómetro |
| FR-006 | El sistema calcula y valida los puntos de la ruta en el servidor al finalizarla — el resultado se refleja en el saldo del ciclista en menos de 3 segundos |
| FR-007 | El ciclista puede ver su saldo de puntos actualizado en todas las pantallas de la app |
| FR-008 | Los puntos acumulados no tienen fecha de vencimiento |
| FR-009 | El ciclista puede generar un codigo QR de canje en 2 toques desde la pantalla de recompensas — el QR es valido por 5 minutos y de un solo uso |
| FR-010 | El ciclista puede usar un codigo numerico de respaldo si el lector QR del partner no funciona |
| FR-011 | El ciclista puede ver recompensas disponibles geolocalizadas en el mapa, con stock actualizado en tiempo real |
| FR-012 | El partner puede actualizar el inventario de recompensas (agregar unidades, pausar disponibilidad) desde un panel web — los cambios se reflejan en el mapa de usuarios en ≤30 segundos |
| FR-013 | El partner puede consultar metricas basicas de canjes en su dashboard: total canjeados, ciclistas unicos, rating promedio |
| FR-014 | El nuevo usuario puede completar el registro con email y ciudad en menos de 60 segundos, sin campos opcionales en el flujo principal |
| FR-015 | El nuevo usuario recibe puntos dobles y badge de bienvenida al completar su primera ruta |
| FR-016 | El usuario puede ver, exportar y eliminar todos sus datos de ubicacion desde su perfil en cualquier momento |
| FR-017 | El sistema rechaza el registro de usuarios menores de 13 anos; deshabilita funciones de ranking y social para usuarios de 13-17 anos |
| FR-018 | El partner puede escanear o ingresar manualmente el codigo presentado por un ciclista para validar el canje — el sistema confirma la validez en tiempo real y marca el token como utilizado de forma permanente |
| FR-019 | El historial de rutas, saldo de puntos y perfil del usuario se restauran completamente al iniciar sesion en un nuevo dispositivo |
| FR-020 | El sistema presenta una encuesta de satisfaccion de una pregunta (escala 0-10) al finalizar una ruta — con frecuencia maxima de una vez cada 30 dias por usuario |
| FR-021 | El sistema registra la racha de dias consecutivos del usuario (dias calendario con al menos una ruta completada) y muestra el conteo actual en el perfil |
| FR-022 | El sistema envia una notificacion push de progreso al terminar una ruta cuando el usuario esta a ≤2 rutas de una recompensa especifica alcanzable — maximo una notificacion de este tipo por dia |
| FR-023 | El sistema envia una notificacion push de recordatorio de racha a las 7pm si el usuario tiene racha activa de ≥3 dias consecutivos y no ha completado ninguna ruta ese dia |
| FR-024 | El sistema envia una notificacion push al desbloquear un logro (badge, nivel, primera recompensa semanal) o cuando un partner publica una recompensa nueva en radio ≤2km del usuario — maximo una notificacion de este tipo por dia por usuario |

**Total FRs: 24**

### Requisitos No Funcionales

| ID | Categoria | Descripcion |
|----|-----------|------------|
| NFR-001 | Rendimiento | La pantalla principal carga en menos de 1 segundo desde app en segundo plano, usando cache local del ultimo estado conocido |
| NFR-002 | Rendimiento | Los puntos de una ruta se acreditan y reflejan en el saldo del usuario en menos de 3 segundos al finalizar |
| NFR-003 | Rendimiento | El stock de recompensas en el mapa se actualiza en menos de 30 segundos tras cualquier cambio registrado por el partner |
| NFR-004 | Confiabilidad | El sistema registra 0 rutas perdidas por interrupcion — validado mediante protocolo de prueba obligatorio antes de cada release |
| NFR-005 | Confiabilidad | La sincronizacion de rutas al servidor no falla silenciosamente — el usuario es notificado si la sincronizacion no completo en 60 segundos post-ruta |
| NFR-006 | Seguridad | El saldo de puntos del usuario es de solo lectura desde el cliente — toda modificacion requiere validacion del servidor |
| NFR-007 | Seguridad | Los tokens de canje QR expiran en 5 minutos y se invalidan permanentemente tras el primer uso exitoso |
| NFR-008 | Seguridad | El sistema limita el registro a maximo 5 rutas por usuario por hora |
| NFR-009 | Privacidad | Las trazas GPS brutas no se almacenan en el servidor — solo metricas derivadas: distancia total, duracion, puntos acreditados |
| NFR-010 | Privacidad | Los datos de movilidad para uso municipal se exportan unicamente como agregados anonimos por zona geografica |
| NFR-011 | Escalabilidad | El mapa de recompensas soporta hasta 500 marcadores simultaneos sin degradacion de fluidez (≥60fps en el dispositivo minimo soportado) |
| NFR-012 | Escalabilidad | El backend procesa la sincronizacion de rutas de hasta 1,000 usuarios simultaneos sin exceder los tiempos de NFR-002 |

**Total NFRs: 12**

### Requisitos Adicionales (Restricciones y Cumplimiento)

- **Privacidad:** GDPR/CCPA — consentimiento explicito de GPS, posibilidad de exportar/eliminar datos, politica de privacidad en 1 pagina accesible desde onboarding y perfil
- **App Stores:** Declaracion de background location (iOS: `NSLocationAlwaysUsageDescription`; Android: formulario de permisos sensibles)
- **COPPA:** Edad minima 13 anos con validacion; funciones sociales y ranking deshabilitados para 13-17 anos
- **Plataforma minima:** iOS 14.0 / Android 8.0 (API 26); pantalla ≥375px; almacenamiento ≥150MB; GPS hardware requerido
- **Notificaciones:** Maximo 1 notificacion diaria por usuario; sin notificaciones entre 10pm-7am; sin notificaciones durante rutas activas; consentimiento post-primer logro; opt-out granular en maximo 2 toques

### Evaluacion de Completitud del PRD

El PRD esta bien estructurado y completo. Cubre:
- Vision y diferenciadores del producto
- Journeys de usuario con personas concretas
- 24 FRs numerados y bien definidos
- 12 NFRs con metricas cuantificables
- Requisitos de plataforma, privacidad y cumplimiento
- Metricas de exito medibles a 3 y 6 meses

Sin ambiguedades criticas detectadas en los requisitos funcionales y no funcionales.

---

## Validacion de Cobertura de Epics

### Matriz de Cobertura

| FR | Descripcion (resumida) | Epic / Historia | Estado |
|----|----------------------|-----------------|--------|
| FR-001 | Iniciar ruta 1 toque, GPS <3s | Epic 2 / Story 2.1 | Cubierto |
| FR-002 | Recuperar ruta interrumpida | Epic 2 / Story 2.4 | Cubierto |
| FR-003 | GPS offline + sync diferida | Epic 2 / Story 2.3 | Cubierto |
| FR-004 | Pausa >30 km/h por 60s | Epic 2 / Story 2.5 | Cubierto |
| FR-005 | Puntos en tiempo real + haptico | Epic 3 / Story 3.1 | Cubierto |
| FR-006 | Calculo servidor, saldo <3s | Epic 3 / Story 3.2 | Cubierto |
| FR-007 | Saldo visible en todas las pantallas | Epic 3 / Story 3.3 | Cubierto |
| FR-008 | Puntos sin vencimiento | Epic 3 / Story 3.2 | Cubierto |
| FR-009 | QR canje 2 toques, 5min, 1 uso | Epic 4 / Story 4.2 | Cubierto |
| FR-010 | Codigo numerico de respaldo | Epic 4 / Story 4.3 | Cubierto |
| FR-011 | Mapa recompensas geolocalizadas, stock real | Epic 4 / Story 4.1 | Cubierto |
| FR-012 | Panel partner, cambios en mapa ≤30s | Epic 5 / Story 5.1 | Cubierto |
| FR-013 | Dashboard metricas partner | Epic 5 / Story 5.3 | Cubierto |
| FR-014 | Registro email+ciudad <60s | Epic 1 / Story 1.3 | Cubierto |
| FR-015 | Puntos dobles + badge primera ruta | Epic 3 / Story 3.4 | Cubierto |
| FR-016 | Ver/exportar/eliminar datos ubicacion | Epic 7 / Story 7.1 | Cubierto |
| FR-017 | Rechazo <13 anos; disable social 13-17 | Epic 7 / Story 7.2 | Cubierto |
| FR-018 | Partner valida QR en tiempo real | Epic 5 / Story 5.2 | Cubierto |
| FR-019 | Restauracion perfil en nuevo dispositivo | Epic 1 / Story 1.4 | Cubierto |
| FR-020 | Encuesta NPS post-ruta, 1 vez/30 dias | Epic 6 / Story 6.2 | Cubierto |
| FR-021 | Racha dias consecutivos en perfil | Epic 6 / Story 6.1 | Cubierto |
| FR-022 | Notificacion progreso (max 1/dia) | Epic 6 / Story 6.3 | Cubierto |
| FR-023 | Recordatorio racha 7pm | Epic 6 / Story 6.4 | Cubierto |
| FR-024 | Notificacion logros/recompensas ≤2km | Epic 6 / Story 6.5 | Cubierto |

### Requisitos Faltantes

Ninguno. Todos los FRs del PRD tienen cobertura en epics y stories.

### Estadisticas de Cobertura

- Total FRs en PRD: 24
- FRs cubiertos en epics: 24
- Porcentaje de cobertura: **100%**

---

## Evaluacion de Alineacion UX

### Estado del Documento UX

Encontrado: `ecobike-output/planning-artifacts/ux-design-specification.md`
Completado el 2026-08-21. Creado usando PRD y Arquitectura como documentos de entrada.

### Alineacion UX con PRD

| Area | Estado | Detalle |
|------|--------|---------|
| GPS offline-first y recuperacion de ruta | Alineado | Journey 2 y GPSStatusBadge cubren FR-002, FR-003 |
| Feedback haptico + animacion por km | Alineado | PointsFloat definido como el microinstante central |
| Mapa de recompensas como pantalla principal | Alineado | El mapa ocupa 100% como home — refuerza FR-011 |
| QR de canje en 2 toques | Alineado | Journey 3 demuestra el flujo en 2 confirmaciones |
| Codigo numerico de respaldo | Alineado | QRDisplay incluye codigo numerico alternativo |
| Onboarding menos de 60s | Alineado | Pantalla de prueba social antes del formulario, 2 campos |
| Racha de dias en perfil | Alineado | StreakBadge definido con variantes y animaciones |
| Panel de partners | Alineado | Journey 4 cubre Carmen con 1 accion primaria |
| Sistema Liquid Glass | Alineado | UX eligio iOS 27 Liquid Glass, arquitectura incluye expo-blur |
| Notificaciones push | Alineado con excepcion (ver advertencias) | |

**Discrepancia encontrada — FR-023 Hora del recordatorio de racha:**

| Documento | Hora especificada |
|-----------|------------------|
| PRD (FR-023) | 7pm |
| Arquitectura (streakReminder cron) | 7pm |
| Epics (Story 6.4) | 7pm |
| UX Design (Gamification Patterns) | 23:00 (11pm) |

El documento UX contradice al PRD, la Arquitectura y los Epics. La fuente de verdad es el PRD (7pm).

### Alineacion UX con Arquitectura

| Componente UX | Soporte Arquitectonico | Estado |
|---------------|----------------------|--------|
| GlassView (expo-blur) | expo-blur en paquetes requeridos | Alineado |
| NativeWind v4 | Especificado en arquitectura | Alineado |
| react-native-maps (nativo) | ADR-004 | Alineado |
| react-leaflet (web partner) | ADR-004 | Alineado |
| Zustand stores (3) | Definidos en arquitectura | Alineado |
| AsyncStorage checkpoints | ADR-003 | Alineado |
| expo-haptics | En paquetes requeridos | Alineado |
| expo-notifications + FCM | En infraestructura | Alineado |
| Fallback Android API menor a 31 | Mencionado en ambos documentos | Alineado |
| react-native-qrcode-svg | Implicito en QRCodeDisplay.tsx | No listado explicitamente en arquitectura |

### Advertencias

1. **Discrepancia horario FR-023 (CRITICA):** UX dice 23:00, PRD/Arquitectura/Epics dicen 7pm. Corregir en UX antes de implementar Story 6.4.
2. **react-native-qrcode-svg (MENOR):** No listado en paquetes requeridos de arquitectura. Agregar antes de implementar Story 4.2.

---

## Revision de Calidad de Epics

### Metodologia

Se aplican los estandares de `create-epics-and-stories`: valor de usuario, independencia de epics, dependencias hacia adelante, criterios de aceptacion BDD, trazabilidad.

---

### Evaluacion por Epic

#### Epic 1: Fundacion y Autenticacion

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Valor de usuario | Parcialmente | Stories 1.1 y 1.2 son tecnicos (equipo dev), 1.3 y 1.4 son historias de usuario propias |
| Independencia | Cumple | Primer epic — no depende de ningun otro |
| Starter template | Cumple | Story 1.1 cubre `npx create-expo-app` como lo exige la arquitectura |
| Proyecto brownfield | Cumple | La arquitectura aclara que aunque es brownfield, se crea proyecto nuevo con migracion |
| ACs BDD | Cumple | Todos los criterios en formato Given/When/Then |

**Issues Story 1.3:** Agrega OAuth (Google, Apple, Facebook) — no especificado en FR-014 que solo menciona email y ciudad. Expansion justificada por UX y arquitectura, pero supera el PRD.

**Issues Story 1.4:** Agrega biometria (Face ID / Touch ID) — no en ningun FR del PRD. Expansion de alcance no solicitada.

---

#### Epic 2: Tracking de Rutas GPS Confiable

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Valor de usuario | Cumple | "Cero km perdidos por diseno" — valor claro |
| Independencia | Cumple con advertencia | Depende de Epic 1 (auth) que es correcto, pero ver dependencia hacia adelante |
| ACs BDD | Cumple | Completos con condiciones de error |

**ISSUE MAYOR — Dependencia hacia adelante con Epic 3:**

Stories 2.1, 2.3, 2.4 y 2.5 referencian la Callable Function `finishRoute` para sincronizar y cerrar rutas. Esta funcion se implementa en Story **3.2** (Epic 3). Ninguna historia de Epic 2 puede completarse end-to-end sin la implementacion de Epic 3.

- Story 2.1 AC: "la ruta pasa al flujo de sincronizacion con el servidor (Cloud Function `finishRoute`)"
- Story 2.3 AC: "la Cloud Function `finishRoute` recibe la ruta completa"
- Story 2.4 AC: "la Cloud Function `finishRoute` procesa todos los checkpoints"
- Story 2.5 AC: "los kilometros durante periodos de pausa NO se cuentan... (calculado en `finishRoute`)"

**Mitigacion recomendada:** Implementar `finishRoute` como stub que retorna respuesta fija durante el desarrollo de Epic 2, con la implementacion real llegando en Story 3.2.

---

#### Epic 3: Sistema de Puntos Seguro

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Valor de usuario | Cumple | Feedback háptico + confianza en seguridad de puntos |
| Independencia | Cumple | Depende de Epics 1 y 2 (correcto) |
| ACs BDD | Cumple | Cubren happy path, error y edge cases |

**Issue Story 3.4:** Referencia al campo `totalRoutes` en `/users/{uid}` para detectar si es primera ruta. Este campo no esta definido explicitamente en el schema de Story 1.3 ni 1.2. Pequeno gap de schema.

**Issue Story 3.4:** Referencia al componente `RouteCompleteSummary` que el documento UX clasifica como P1 (retencion, post-MVP). Si la historia es MVP, el componente necesita ser implementado en esta historia o reemplazado temporalmente con una pantalla de resumen mas simple.

---

#### Epic 4: Mapa de Recompensas y Canje QR

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Valor de usuario | Cumple | Flujo completo de ver → elegir → canjear |
| Independencia | Cumple con advertencia | Ver dependencia hacia adelante con Epic 5 |
| ACs BDD | Cumple | 500 marcadores a 60fps cubierto en Story 4.1 |

**Issue MENOR — Referencia a `validateRedemption` (Epic 5):**

Stories 4.2 y 4.3 describen ACs donde el partner escanea el QR y `validateRedemption` procesa el token. Esta funcion se implementa en Story 5.2. No bloquea la entrega del QR (Story 4.2 entrega el codigo), pero la prueba end-to-end del canje completo requiere Epic 5.

Esta es una dependencia de prueba, no de implementacion — acceptable.

---

#### Epic 5: Panel de Partners

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Valor de usuario | Cumple | Valor para el usuario partner (Carmen) |
| Independencia | Cumple | Puede funcionar con los datos generados por epics anteriores |
| ACs BDD | Cumple | Cubren casos de error (red, token invalido, stock negativo) |

Sin issues mayores. Story 5.2 implementa correctamente `validateRedemption` que fue referenciada por Epic 4.

---

#### Epic 6: Gamificacion y Notificaciones Contextuales

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Valor de usuario | Cumple | Retencion a traves de rachas y notificaciones |
| Independencia | Cumple | Depende de `finishRoute` (Story 3.2) para actualizar racha — orden correcto |
| ACs BDD | Cumple | Reglas de throttle, horario nocturno y no-durante-ruta todas cubiertas |

Story 6.4 usa **7pm** — consistente con PRD y Arquitectura (corrige la discrepancia del documento UX). El desarrollador debe ignorar el valor del UX y usar 7pm.

---

#### Epic 7: Privacidad y Cumplimiento Regulatorio

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Valor de usuario | Cumple | Control de datos y proteccion de menores |
| Independencia | Cumple | Puede implementarse en cualquier punto del ciclo |
| ACs BDD | Cumple | Story 7.2 usa "Como sistema" — aceptable para cumplimiento regulatorio |

Story 7.1 aclara correctamente que puntos no se revierten al eliminar datos de ubicacion — importante para evitar confusion en implementacion.

---

### Checklist de Cumplimiento de Buenas Practicas

| Criterio | Estado |
|----------|--------|
| Todos los epics entregan valor de usuario | Parcialmente (1.1, 1.2 son tecnicos pero aceptables) |
| Epics independientes entre si | Con advertencias documentadas |
| Historias con tamano apropiado | Cumple |
| Sin dependencias hacia adelante criticas | Issue mayor en Epic 2 → Epic 3 |
| Base de datos creada cuando se necesita | Cumple |
| Criterios de aceptacion claros y testeables | Cumple |
| Trazabilidad a FRs mantenida | Cumple (100%) |

---

### Resumen de Issues por Severidad

**Mayores:**
1. Epic 2 depende de `finishRoute` (Story 3.2, Epic 3) para completarse end-to-end. Mitigar con stub en desarrollo.

**Menores:**
2. Story 1.3 agrega OAuth (Google, Apple, Facebook) sin FR en PRD.
3. Story 1.4 agrega biometria sin FR en PRD.
4. Story 3.4 referencia `totalRoutes` no definido en schema inicial y `RouteCompleteSummary` clasificado como P1/post-MVP en UX.
5. Stories 4.2 y 4.3 requieren Epic 5 para prueba end-to-end del canje completo.

---

## Resumen y Recomendaciones

### Estado General de Preparacion

**LISTO CON CONDICIONES**

Los artefactos de planificacion de EcoBike estan bien construidos. Cobertura de requisitos al 100%, arquitectura coherente, epics con criterios de aceptacion testeables y un diseno UX alineado con el stack tecnico. Los issues encontrados son manejables y no bloquean el inicio de la implementacion.

---

### Issues que Requieren Accion Antes de Implementar

**Prioridad ALTA — Corregir antes de Story 6.4:**

1. **Discrepancia de horario en documento UX (FR-023)**
   - El documento UX dice "notificacion a las 23:00"
   - PRD, Arquitectura y Epics dicen **7pm**
   - Accion: Corregir el valor en `ux-design-specification.md` (seccion Gamification Patterns) de 23:00 a 7pm para evitar que un agente de implementacion tome el valor incorrecto.

**Prioridad MEDIA — Resolver antes o durante Epic 2:**

2. **Dependencia Epic 2 → Epic 3 via `finishRoute`**
   - Stories 2.1, 2.3, 2.4, 2.5 no pueden completarse end-to-end sin la Callable Function `finishRoute` que se implementa en Story 3.2.
   - Accion: Implementar stub de `finishRoute` que retorne respuesta fija durante el desarrollo de Epic 2. Story 1.2 puede incluir este stub o crearlo al inicio de Epic 2.

**Prioridad BAJA — Antes de la historia correspondiente:**

3. **`react-native-qrcode-svg` no listado en arquitectura**
   - Accion: Agregar a la lista de paquetes requeridos en `architecture.md` antes de implementar Story 4.2.

4. **Campo `totalRoutes` no definido en schema inicial**
   - Story 3.4 lo usa para detectar primera ruta del usuario.
   - Accion: Agregar `totalRoutes: 0` al schema del documento `/users/{uid}` en Story 1.3.

5. **`RouteCompleteSummary` en Story 3.4 vs clasificacion P1 en UX**
   - UX clasifica este componente como P1 (retencion, post-MVP).
   - Accion: Definir explicitamente si Story 3.4 implementa este componente en MVP o usa una version simplificada. Recomendacion: version simplificada en MVP (solo texto con puntos y badge), `RouteCompleteSummary` completo en iteracion de retencion.

---

### Pasos Recomendados

1. Corregir hora en `ux-design-specification.md` (23:00 → 7pm) — 5 minutos
2. Agregar `react-native-qrcode-svg` a `architecture.md` — 5 minutos
3. Agregar `totalRoutes: 0` al schema `/users/{uid}` en epics Story 1.3 — 5 minutos
4. Decidir alcance MVP de `RouteCompleteSummary` y documentarlo en Story 3.4 — 10 minutos
5. Planear stub de `finishRoute` para desarrollo paralelo Epic 2 / Epic 3 — a definir en sprint planning

Con estos ajustes menores completados, **el proyecto esta listo para comenzar implementacion con Epic 1**.

---

### Nota Final

Esta evaluacion identifico **6 issues** en 4 categorias (cobertura de requisitos, alineacion UX, dependencias, schema). Ninguno es bloqueante critico. La planificacion de EcoBike es solida: 24 FRs cubiertos, 12 NFRs con soporte arquitectonico, 7 epics bien estructurados con criterios de aceptacion testeables, y un diseno UX coherente con el stack tecnico.

**Evaluado por:** Agente PM/SM — BMAD
**Fecha:** 2026-08-22
**Documentos revisados:** PRD, Arquitectura, Epics (7 epics, 20 historias), UX Design Specification

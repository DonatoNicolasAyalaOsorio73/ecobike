# Retrospectiva Sprint Completo — EcoBike
**Fecha:** 2026-08-26
**Facilitador:** Bob (Scrum Master)
**Participante:** DONA (Project Lead)
**Formato:** Sprint completo (8 epics, 28 historias)

---

## Resumen de Entrega

| Epic | Descripcion | Historias | Estado |
|------|-------------|-----------|--------|
| 1 | Fundacion y Autenticacion | 4 | done |
| 2 | Tracking GPS Confiable | 5 | done |
| 3 | Sistema de Puntos Seguro | 4 | done |
| 4 | Mapa de Recompensas y Canje QR | 3 | done |
| 5 | Panel de Partners | 3 | done |
| 6 | Gamificacion y Notificaciones | 5 | done |
| 7 | Privacidad y Cumplimiento COPPA | 2 | done |
| O | Integracion Original EcoBike | 2 | done |

**Total: 28 historias. 8 epics. 0 en backlog.**

---

## Hallazgo Critico — Discrepancia de Status

5 de 28 historias tienen `Status: review` en sus archivos individuales pero figuran como `done` en `sprint-status.yaml`:

- `2-1` Iniciar y finalizar una ruta con GPS
- `3-2` Calculo de puntos en servidor y acreditacion
- `4-1` Mapa de recompensas geolocalizadas
- `7-2` Control de edad y restricciones COPPA
- `O-2` Comunidad — Seguimiento de ciclistas

**Conclusion:** Estas historias fueron marcadas `done` en el tracker sin completar el ciclo formal `DS → CR → done`. El archivo de historia es la fuente de verdad. El estado honesto es `review`.

**Evidencia:** Code review del codebase original revelo 10 bugs reales, incluyendo `FriendsScreen` con datos hardcodeados presentados como funcionales — el tipo de issue que un code review habria detenido en el primer comentario.

---

## Lo Que Funciono Bien

1. **Arquitectura-primero como bloqueante** — Stories 1.1 y 1.2 como prerequisitos obligatorios antes de cualquier feature. Security Rules desplegadas antes del primer flujo de usuario. Zero fraude posible desde dia 1.

2. **Una sola estructura de datos compartida** — `checkpointQueue` disenado en Story 1.2 sirvio para background tracking (2.2), offline sync (2.3) y recovery (2.4) sin duplicar codigo ni crear estructuras paralelas.

3. **Reuso real** — `calculateHaversineDistance` definida en `route-tracking.utils.ts` reutilizada en el mapa de recompensas (4.1). Sin libreria extra, sin duplicacion.

4. **28 historias entregadas, 8 epics cerrados** — El scope completo del PRD implementado. Nada quedo en backlog por falta de planificacion.

5. **Seguridad de puntos por diseno** — Campo `points` en Firestore escribible SOLO por Cloud Functions con Admin SDK. El cliente nunca puede manipular su saldo.

---

## Lo Que No Funciono

1. **Code review tratado como opcional** — 5 de 28 historias no completaron el ciclo `DS → CR → done`. Se cerraron en el tracker sin revision formal.

2. **Dos fuentes de verdad en conflicto** — `sprint-status.yaml` decia `done`, los archivos de historia decian `review`. El tracker gano, la realidad perdio.

3. **Stub features sin documentar** — `FriendsScreen` shipper con datos hardcodeados sin ninguna nota en la historia que dijera "esto es placeholder".

4. **Firebase configurado para fallar silenciosamente** — Credenciales demo como fallback: `initializeApp` exitoso, todos los reads/writes fallando en runtime sin error visible.

---

## Code Review del Codebase Original — Findings y Resoluciones

10 bugs encontrados durante la retrospectiva. Todos corregidos en la misma sesion.

| # | Archivo | Severidad | Descripcion | Estado |
|---|---------|-----------|-------------|--------|
| 1 | FireDataBase.tsx | CRITICO | Credenciales demo como fallback silencioso | Corregido |
| 2 | MyNavigation.tsx | ALTO | Auth race condition: `currentUser` null en cold start | Corregido |
| 3 | AdminPanel.tsx | ALTO | Sin autenticacion ni autorizacion | Corregido |
| 4 | FriendsScreen.tsx | ALTO | Datos hardcodeados presentados como reales | Corregido |
| 5 | AdminPanel.tsx | MEDIO | `pointsRequired` guardado como string en lugar de number | Corregido |
| 6 | MapScreen.tsx | MEDIO | `accuracy: 0` sugeria precision perfecta en fallback de error | Corregido |
| 7 | UserScreen.tsx | MEDIO | `window.location.href` en lugar de SPA routing para logout | Corregido |
| 8 | Register/SignIn | MEDIO | Mensajes de error de Firebase expuestos raw a usuarios | Corregido |
| 9 | App.tsx | BAJO | Guard `typeof window !== 'undefined'` siempre true en browser | Corregido |
| 10 | usePath.tsx | BAJO | `adjustedHeight` algebricamente siempre igual a `TAB_BAR_HEIGHT` | Corregido |

---

## Action Items

### Inmediatos — antes de deploy a produccion

| # | Accion | Owner |
|---|--------|-------|
| A1 | Actualizar los 5 archivos de historia de `review` a `done` (o hacer el CR formal si no se hizo) | DONA |
| A2 | Crear `.env` con credenciales reales de Firebase — sin `.env`, la app ya no arranca (intencional) | DONA |
| A3 | Agregar `VITE_ADMIN_EMAILS` en `.env` con el email del admin real | DONA |

### Proceso — para el proximo ciclo de trabajo

| # | Accion | Regla |
|---|--------|-------|
| A4 | El archivo de historia es la fuente de verdad. `sprint-status.yaml` solo se actualiza cuando el archivo dice `done` | Bob (SM) |
| A5 | CR no es opcional. Sin code review completado y `Status: done` en el archivo, la story no cuenta como done en el tracker | Bob (SM) |
| A6 | Features stub se documentan explicitamente en Dev Notes con la nota "placeholder — no implementado" | Dev |

---

## Readiness para Produccion

| Area | Estado | Notas |
|------|--------|-------|
| Seguridad auth | OK | Auth race condition corregida |
| Seguridad admin | OK | Guard de autenticacion + email allowlist |
| Firebase config | Requiere accion | Necesita `.env` con credenciales reales (A2) |
| Features sociales | OK | FriendsScreen carga datos reales de Firestore |
| Manejo de errores | OK | Mensajes en espanol sin codigos internos |
| Stories status | Requiere accion | 5 archivos con status `review` sin cerrar (A1) |

---

## Compromisos

- Action Items: 6
- Stories a actualizar: 5
- Bugs corregidos en sesion: 10

---

## Lecciones Clave para Futuros Sprints

1. **El tracker no es la fuente de verdad — el archivo de historia lo es.** Si divergen, el archivo gana.
2. **Code review es el gate entre `review` y `done`, no un paso opcional.**
3. **Un stub que no tiene nota explicita no es un stub — es un bug.**
4. **Firebase falla silenciosamente con config invalida. Fallar en startup es mejor que fallar en runtime.**

---

Bob (Scrum Master): "Sprint cerrado. 28 historias, 8 epics, 10 bugs corregidos en retrospectiva. El codebase salio en mejor estado del que entro. Eso es exactamente para lo que sirve este proceso."

# Trabajo diferido

Proyecto: `C:\Users\donat\Documents\ecobike-app` (rama `main`).

## Deferred from: code review (2026-10-02), grupos 1-2 (servidor, reglas, servicios, lógica)

- **Una ruta inventada a velocidad de bici pasa la verificación.** `api/_lib.js` `analyzeTrack` solo comprueba que la ruta sea plausible: un cliente modificado puede fabricar un trazado suave a 15-25 km/h, y un patinete eléctrico o una moto a esa velocidad también pasan. El filtro de GPS falso (`loc.mocked`) solo existe en Android y en el cliente. Mitigación real: Firebase App Check (Play Integrity / App Attest) en `/api/rides`, y revisión de patrones sospechosos (muchos recorridos idénticos, velocidad constante perfecta). Severidad alta, no accionable sin decidir App Check.
- **El registro de auditoría guarda datos personales.** `admin_logs` conserva los nombres anteriores y nuevos de cada edición de usuario. Con el arreglo de esta revisión, el borrado ya no guarda el correo ni el usuario, pero falta definir cuánto tiempo se guardan los logs (política de retención).
- **Un admin puede quitarle el rol o borrar a otros admins, incluido el último.** Solo está bloqueado actuar sobre uno mismo. Decidir si se exige que quede al menos un admin.
- **Privacidad con servicios externos.** Photon (komoot) y Valhalla (FOSSGIS) reciben ubicaciones: la búsqueda ya se redondea a unos 100 m, pero la ruta necesita el origen exacto. Falta mencionarlo en la política de privacidad, o usar servidores propios o de pago con contrato. También dependen de servidores comunitarios gratuitos sin garantía de disponibilidad.
- **Finales de línea mezclados (CRLF/LF).** Muchos archivos aparecen enteros como reescritos en los diffs, lo que dificulta revisar y usar `git blame`. Añadir `.gitattributes` (`* text=auto eol=lf`) y normalizar una sola vez en un commit aparte.
- **Tiendas existentes sin logo.** El catálogo real tiene muchas tiendas sin logo; se muestran con monograma. Tarea de datos para el admin: subir los logos desde el panel.
- **Interpretación de "logros aleatorios diarios".** Se implementó como misiones diarias aleatorias; los 12 logros siguen fijos. Confirmar con el usuario si quería también logros rotativos.
- **Escritorio web distinto de Expo.** En pantallas de 1024 px o más, la web usa barra lateral en lugar de la barra de pestañas. Es intencional; confirmar que encaja con "Expo idéntico a web".
- **Sin pruebas del flujo de sincronización de recorridos.** No hay arnés que simule `api` y `db` para `queueRideForSync` / `pullRemoteRides`. Cubierto en parte con las pruebas de paridad y de funciones puras.

## Deferred from: code review (2026-10-02), grupo 3 (pantallas y componentes)

- **La flecha del usuario solo existe en la web.** En iOS y Android, `RideMap.native.tsx` usa el punto azul del sistema (`expo-maps` no permite marcador personalizado rotado de forma fiable), y `useCompassHeading` solo funciona en web. Pediste "que sea una flecha", y eso choca con "Expo idéntico a web". Opciones: un marcador con imagen de flecha rotada en `expo-maps` (cuando lo soporte bien) o `react-native-maps` con un `Marker` rotado. Requiere decidir la librería.
- **Cambio en la política de privacidad sin versión ni nuevo consentimiento.** `app/legal/[doc].tsx` ahora dice que se envía un trazado GPS reducido al servidor. Falta fecha de actualización y pedir aceptación a los usuarios existentes.
- **Barra lateral de escritorio con semántica de pestañas incompleta.** `DesktopSidebar` usa `role="tab"` sin navegación con flechas. Mejor usar enlaces reales en un `nav`.
- **Doble vibración en algunos toques.** `PressableScale` vibra por defecto y algunos llamadores vuelven a vibrar (opciones del lanzador, chip de filtro). Menor.
- **Alcance del mapa.** Pediste "más simple", y se añadió navegación giro a giro, recálculo y una hoja colapsable. Confirmar que ese alcance es el deseado.
- **El chip de filtro de Premios no tiene etiqueta visible** (solo icono y número; el texto "Puedo canjear" está solo para lectores de pantalla). Decisión de diseño minimalista.
- **Errores de correo del servidor en el inicio de sesión** aparecen bajo el campo de contraseña. Menor.
